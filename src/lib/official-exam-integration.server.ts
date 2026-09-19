import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  OFFICIAL_INTEGRATION_VERSION,
  OfficialIntegrationError,
  assertAcademicPeriod,
  assertSemesterScore,
  normalizeStudentUsername,
  validateOfficialResultAgainstMapping,
  type OfficialExamMapping,
  type OfficialExamMappingLocalTruth,
  type OfficialExamResultPayload,
  type OfficialOutboxEventType,
  type SemesterScoreExportRow,
} from "./official-exam-integration";

const db = supabaseAdmin as unknown as SupabaseClient;
const DEFAULT_HMAC_MAX_SKEW_SECONDS = 300;

export const OFFICIAL_INTEGRATION_HEADERS = {
  version: "x-atu-integration-version",
  timestamp: "x-atu-timestamp",
  idempotencyKey: "x-atu-idempotency-key",
  signature: "x-atu-signature",
} as const;

export type OfficialIntegrationSecretKind = "provision" | "result";

export interface CurrentAcademicPeriod {
  academic_year: string;
  semester: 1 | 2;
}

export interface OfficialIntegrationAuditInput {
  direction: "outbound" | "inbound";
  event_type: string;
  material_id?: string | null;
  official_exam_id?: string | null;
  source_result_id?: string | null;
  course_id?: string | null;
  group_id?: string | null;
  student_id?: string | null;
  status: string;
  error_code?: string | null;
  attempt_number?: number;
}

function databaseError(message: string, cause?: unknown): OfficialIntegrationError {
  const detail = cause instanceof Error ? ` ${cause.message}` : "";
  return new OfficialIntegrationError("DATABASE_ERROR", `${message}${detail}`);
}

function normalizeSemester(value: string | null | undefined): 1 | 2 {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az-AZ");
  if (["1", "i", "payız", "payiz", "fall"].includes(normalized)) return 1;
  if (["2", "ii", "yaz", "spring"].includes(normalized)) return 2;
  throw new OfficialIntegrationError(
    "INVALID_ACADEMIC_PERIOD",
    `Unsupported system semester value: ${value ?? "null"}.`,
  );
}

export function getOfficialIntegrationSecret(kind: OfficialIntegrationSecretKind): string {
  const envName =
    kind === "provision" ? "ATU_OFFICIAL_PROVISION_SECRET" : "ATU_OFFICIAL_RESULT_SECRET";
  const secret = process.env[envName];
  if (!secret) {
    throw new OfficialIntegrationError(
      "INTEGRATION_NOT_CONFIGURED",
      `${envName} is not configured on the server.`,
    );
  }
  return secret;
}

export function createOfficialIntegrationSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

export function verifyOfficialIntegrationSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createOfficialIntegrationSignature(secret, timestamp, rawBody), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertOfficialIntegrationTimestamp(
  timestamp: string,
  nowMs = Date.now(),
  maxSkewSeconds = DEFAULT_HMAC_MAX_SKEW_SECONDS,
): void {
  const unixSeconds = Number(timestamp);
  if (!Number.isFinite(unixSeconds)) {
    throw new OfficialIntegrationError("STALE_TIMESTAMP", "Integration timestamp is invalid.");
  }
  const skewSeconds = Math.abs(Math.floor(nowMs / 1000) - unixSeconds);
  if (skewSeconds > maxSkewSeconds) {
    throw new OfficialIntegrationError("STALE_TIMESTAMP", "Integration timestamp is outside the accepted window.");
  }
}

export function assertOfficialIntegrationRequest(input: {
  version: string | null | undefined;
  timestamp: string | null | undefined;
  signature: string | null | undefined;
  secret: string;
  rawBody: string;
  nowMs?: number;
  maxSkewSeconds?: number;
}): void {
  if (input.version !== String(OFFICIAL_INTEGRATION_VERSION)) {
    throw new OfficialIntegrationError(
      "INVALID_INTEGRATION_VERSION",
      "Unsupported official integration version.",
    );
  }
  if (!input.timestamp || !input.signature) {
    throw new OfficialIntegrationError("INVALID_SIGNATURE", "Missing HMAC integration headers.");
  }
  assertOfficialIntegrationTimestamp(
    input.timestamp,
    input.nowMs,
    input.maxSkewSeconds ?? DEFAULT_HMAC_MAX_SKEW_SECONDS,
  );
  if (
    !verifyOfficialIntegrationSignature(
      input.secret,
      input.timestamp,
      input.rawBody,
      input.signature,
    )
  ) {
    throw new OfficialIntegrationError("INVALID_SIGNATURE", "HMAC signature mismatch.");
  }
}

export function buildOfficialIntegrationHeaders(input: {
  secret: string;
  rawBody: string;
  idempotencyKey: string;
  timestamp?: string;
}): Record<string, string> {
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));
  return {
    [OFFICIAL_INTEGRATION_HEADERS.version]: String(OFFICIAL_INTEGRATION_VERSION),
    [OFFICIAL_INTEGRATION_HEADERS.timestamp]: timestamp,
    [OFFICIAL_INTEGRATION_HEADERS.idempotencyKey]: input.idempotencyKey,
    [OFFICIAL_INTEGRATION_HEADERS.signature]: createOfficialIntegrationSignature(
      input.secret,
      timestamp,
      input.rawBody,
    ),
  };
}

export async function getCurrentOfficialAcademicPeriod(): Promise<CurrentAcademicPeriod> {
  const { data, error } = await db
    .from("system_settings")
    .select("cari_tedris_ili,cari_semestr")
    .eq("singleton", true)
    .limit(1)
    .maybeSingle();
  if (error) throw databaseError("Could not read current academic period.", error);
  if (!data?.cari_tedris_ili) {
    throw new OfficialIntegrationError(
      "INVALID_ACADEMIC_PERIOD",
      "Current academic year is not configured.",
    );
  }
  const semester = normalizeSemester(data.cari_semestr);
  assertAcademicPeriod(data.cari_tedris_ili, semester);
  return { academic_year: data.cari_tedris_ili.trim(), semester };
}

async function readMaterialLocalTruth(materialId: string) {
  const { data: material, error: materialError } = await db
    .from("exam_materials")
    .select("id,course_id,group_id,academic_year,semester,exam_type")
    .eq("id", materialId)
    .maybeSingle();
  if (materialError) throw databaseError("Could not read exam material.", materialError);
  if (!material) {
    throw new OfficialIntegrationError("MAPPING_NOT_FOUND", "Exam material does not exist.");
  }

  const [{ data: course, error: courseError }, { data: group, error: groupError }] =
    await Promise.all([
      db.from("courses").select("id,ad").eq("id", material.course_id).maybeSingle(),
      db.from("groups").select("id,ad").eq("id", material.group_id).maybeSingle(),
    ]);
  if (courseError) throw databaseError("Could not read mapped course.", courseError);
  if (groupError) throw databaseError("Could not read mapped group.", groupError);
  if (!course || !group) {
    throw new OfficialIntegrationError(
      "MAPPING_MISMATCH",
      "Exam material points to a missing local course or group.",
    );
  }

  const { data: courseGroup, error: courseGroupError } = await db
    .from("course_groups")
    .select("id")
    .eq("course_id", material.course_id)
    .eq("group_id", material.group_id)
    .eq("tedris_ili", material.academic_year)
    .eq("semestr", material.semester)
    .maybeSingle();
  if (courseGroupError) throw databaseError("Could not validate course/group scope.", courseGroupError);
  if (!courseGroup) {
    throw new OfficialIntegrationError(
      "COURSE_GROUP_SCOPE_MISMATCH",
      "Exam material is outside the canonical course_groups academic-period scope.",
    );
  }

  return { material, course, group };
}

export async function prepareOfficialExamLink(materialId: string): Promise<OfficialExamMapping> {
  const { material, course, group } = await readMaterialLocalTruth(materialId);
  const currentPeriod = await getCurrentOfficialAcademicPeriod();
  if (
    material.academic_year !== currentPeriod.academic_year ||
    Number(material.semester) !== currentPeriod.semester
  ) {
    throw new OfficialIntegrationError(
      "INVALID_ACADEMIC_PERIOD",
      "Only material from the server-side current academic period can be prepared for official provisioning.",
    );
  }

  const { data: existing, error: existingError } = await db
    .from("official_exam_links")
    .select("id,material_id,course_id,group_id,group_name_snapshot,course_name_snapshot,academic_year,semester,exam_type,official_exam_id,sync_status")
    .eq("material_id", materialId)
    .maybeSingle();
  if (existingError) throw databaseError("Could not read existing official exam mapping.", existingError);
  if (existing) return existing as OfficialExamMapping;

  const { data, error } = await db
    .from("official_exam_links")
    .insert({
      material_id: material.id,
      course_id: material.course_id,
      group_id: material.group_id,
      group_name_snapshot: group.ad,
      course_name_snapshot: course.ad,
      academic_year: currentPeriod.academic_year,
      semester: currentPeriod.semester,
      exam_type: material.exam_type,
      sync_status: "pending",
    })
    .select("id,material_id,course_id,group_id,group_name_snapshot,course_name_snapshot,academic_year,semester,exam_type,official_exam_id,sync_status")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new OfficialIntegrationError(
        "MAPPING_MISMATCH",
        "Another active official exam mapping already exists for this course, group and academic period.",
      );
    }
    throw databaseError("Could not create official exam mapping.", error);
  }
  return data as OfficialExamMapping;
}

export async function getOfficialExamMappingLocalTruth(
  officialExamId: string,
): Promise<OfficialExamMappingLocalTruth> {
  const normalizedOfficialExamId = officialExamId.trim();
  if (!normalizedOfficialExamId) {
    throw new OfficialIntegrationError("MAPPING_NOT_FOUND", "official_exam_id is empty.");
  }

  const { data: link, error } = await db
    .from("official_exam_links")
    .select("id,material_id,course_id,group_id,group_name_snapshot,course_name_snapshot,academic_year,semester,exam_type,official_exam_id,sync_status")
    .eq("official_exam_id", normalizedOfficialExamId)
    .maybeSingle();
  if (error) throw databaseError("Could not resolve official exam mapping.", error);
  if (!link) {
    throw new OfficialIntegrationError("MAPPING_NOT_FOUND", "No local mapping exists for official_exam_id.");
  }

  const { material, course, group } = await readMaterialLocalTruth(link.material_id);
  const localFieldsMatch =
    link.course_id === material.course_id &&
    link.group_id === material.group_id &&
    link.academic_year === material.academic_year &&
    Number(link.semester) === Number(material.semester) &&
    link.exam_type === material.exam_type;
  if (!localFieldsMatch) {
    throw new OfficialIntegrationError(
      "MAPPING_MISMATCH",
      "Stored official exam mapping no longer matches the authoritative exam material.",
    );
  }

  return {
    ...(link as OfficialExamMapping),
    semester: Number(link.semester) as 1 | 2,
    current_group_name: group.ad,
    current_course_name: course.ad,
  };
}

export async function validateOfficialResultMapping(
  payload: OfficialExamResultPayload,
): Promise<OfficialExamMappingLocalTruth> {
  const mapping = await getOfficialExamMappingLocalTruth(payload.official_exam_id);
  validateOfficialResultAgainstMapping(payload, mapping);
  return mapping;
}

export async function resolveOfficialResultStudent(
  studentUsername: string,
  groupId: string,
): Promise<string> {
  const normalizedUsername = normalizeStudentUsername(studentUsername);
  if (!normalizedUsername) {
    throw new OfficialIntegrationError("STUDENT_NOT_FOUND", "student_username is empty.");
  }

  const { data: studentId, error: studentError } = await db.rpc("get_user_id_by_username", {
    p_istifadeci_adi: normalizedUsername,
  });
  if (studentError) throw databaseError("Could not resolve student username.", studentError);
  if (!studentId) {
    throw new OfficialIntegrationError("STUDENT_NOT_FOUND", "Student username was not found locally.");
  }

  const { data: membership, error: membershipError } = await db
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", studentId)
    .maybeSingle();
  if (membershipError) throw databaseError("Could not validate student group membership.", membershipError);
  if (!membership) {
    throw new OfficialIntegrationError(
      "STUDENT_GROUP_MISMATCH",
      "Resolved student is not a member of the locally mapped group.",
    );
  }
  return studentId as string;
}

export async function getSemesterScoreExport(input: {
  course_id: string;
  group_id: string;
  academic_year: string;
  semester: 1 | 2;
}): Promise<SemesterScoreExportRow[]> {
  assertAcademicPeriod(input.academic_year, input.semester);

  const { data: scope, error: scopeError } = await db
    .from("course_groups")
    .select("id")
    .eq("course_id", input.course_id)
    .eq("group_id", input.group_id)
    .eq("tedris_ili", input.academic_year)
    .eq("semestr", input.semester)
    .maybeSingle();
  if (scopeError) throw databaseError("Could not validate semester-score course/group scope.", scopeError);
  if (!scope) {
    throw new OfficialIntegrationError(
      "COURSE_GROUP_SCOPE_MISMATCH",
      "Course/group does not belong to the requested academic period.",
    );
  }

  const { data: members, error: membersError } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", input.group_id);
  if (membersError) throw databaseError("Could not read group members.", membersError);
  const userIds = (members ?? []).map((row) => row.user_id as string);
  if (userIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, { data: scores, error: scoresError }] =
    await Promise.all([
      db.from("profiles").select("user_id,istifadeci_adi").in("user_id", userIds),
      db
        .from("exam_scores")
        .select("user_id,semestr_qiymeti")
        .eq("course_id", input.course_id)
        .eq("tedris_ili", input.academic_year)
        .eq("semestr", input.semester)
        .in("user_id", userIds),
    ]);
  if (profilesError) throw databaseError("Could not read canonical student usernames.", profilesError);
  if (scoresError) throw databaseError("Could not read canonical semester scores.", scoresError);

  const usernameByUserId = new Map<string, string>();
  for (const profile of profiles ?? []) {
    const username = profile.istifadeci_adi
      ? normalizeStudentUsername(String(profile.istifadeci_adi))
      : "";
    if (!username) {
      throw new OfficialIntegrationError(
        "STUDENT_USERNAME_MISSING",
        `A group member is missing canonical profiles.istifadeci_adi (${profile.user_id}).`,
      );
    }
    usernameByUserId.set(String(profile.user_id), username);
  }

  const scoreByUserId = new Map<string, number>();
  for (const scoreRow of scores ?? []) {
    if (scoreRow.semestr_qiymeti == null) continue;
    const score = Number(scoreRow.semestr_qiymeti);
    assertSemesterScore(score);
    scoreByUserId.set(String(scoreRow.user_id), score);
  }

  return userIds
    .map((userId) => {
      const username = usernameByUserId.get(userId);
      if (!username) {
        throw new OfficialIntegrationError(
          "STUDENT_USERNAME_MISSING",
          `Group member ${userId} has no canonical profile username.`,
        );
      }
      const semesterScore = scoreByUserId.get(userId);
      if (semesterScore == null) {
        throw new OfficialIntegrationError(
          "SEMESTER_SCORE_MISSING",
          `Group member ${username} has no canonical exam_scores.semestr_qiymeti for the requested period.`,
        );
      }
      return { student_username: username, semester_score: semesterScore };
    })
    .sort((left, right) => left.student_username.localeCompare(right.student_username));
}

export async function enqueueOfficialExamSyncEvent(
  materialId: string,
  eventType: OfficialOutboxEventType,
): Promise<string> {
  const { data, error } = await db
    .from("official_exam_sync_outbox")
    .insert({ material_id: materialId, event_type: eventType, status: "pending" })
    .select("id")
    .single();
  if (error) throw databaseError("Could not enqueue official exam sync event.", error);
  return String(data.id);
}

export async function writeOfficialIntegrationAudit(
  input: OfficialIntegrationAuditInput,
): Promise<void> {
  const { error } = await db.from("exam_integration_audit").insert({
    direction: input.direction,
    event_type: input.event_type,
    material_id: input.material_id ?? null,
    official_exam_id: input.official_exam_id ?? null,
    source_result_id: input.source_result_id ?? null,
    course_id: input.course_id ?? null,
    group_id: input.group_id ?? null,
    student_id: input.student_id ?? null,
    status: input.status,
    error_code: input.error_code ?? null,
    attempt_number: input.attempt_number ?? 1,
  });
  if (error) throw databaseError("Could not write integration audit metadata.", error);
}
