import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const OFFICIAL_ENDPOINT = "https://njxunkrhpwjssymoctsb.supabase.co/functions/v1/receive-atu-exam";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SIGNED_URL_SECONDS = 300;
export const MAX_ATTEMPTS = 5;
export const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600] as const;

export type OutboxEventType = "exam.provision" | "exam.update" | "semester_scores.updated";
export type ClaimedEvent = { id: string; material_id: string; event_type: OutboxEventType; attempt_count: number };
type Db = SupabaseClient<any, "public", any>;
type IntegrationFailure = Error & { code: string; httpStatus?: number; transient?: boolean };

export function createAdminClient(): Db {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw failure("INTEGRATION_NOT_CONFIGURED", "Supabase server environment is incomplete.");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } }) as Db;
}

function failure(code: string, message: string, options?: { httpStatus?: number; transient?: boolean }): IntegrationFailure {
  const error = new Error(message) as IntegrationFailure;
  error.code = code;
  error.httpStatus = options?.httpStatus;
  error.transient = options?.transient;
  return error;
}

function normalizeSemester(value: unknown): 1 | 2 {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("az-AZ");
  if (["1", "i", "payız", "payiz", "fall"].includes(normalized)) return 1;
  if (["2", "ii", "yaz", "spring"].includes(normalized)) return 2;
  throw failure("PERIOD_MISMATCH", "Current semester is not configured correctly.", { transient: false });
}

function todayInBaku(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function hmacHex(secret: string, timestamp: string, rawBody: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  return Array.from(new Uint8Array(signed)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function retryDelaySeconds(attemptCount: number): number | null { return RETRY_DELAYS_SECONDS[attemptCount - 1] ?? null; }
function safeMessage(value: unknown): string { return String(value ?? "Official sync failed.").slice(0, 500); }

function classifyRemoteFailure(status: number, body: any): IntegrationFailure {
  const rawCode = body?.error_code ?? body?.code ?? body?.error ?? `HTTP_${status}`;
  const code = String(rawCode).trim().toUpperCase().replace(/[^A-Z0-9_.-]/g, "_").slice(0, 80) || `HTTP_${status}`;
  const message = safeMessage(body?.message ?? body?.error_message ?? body?.error ?? `Official Portal returned HTTP ${status}.`);
  const transient = status === 408 || status === 425 || status === 429 || status >= 500;
  return failure(code, message, { httpStatus: status, transient });
}

async function audit(db: Db, input: { eventType: string; materialId: string; officialExamId?: string | null; courseId?: string | null; groupId?: string | null; status: string; errorCode?: string | null; attempt: number }): Promise<void> {
  const { error } = await db.from("exam_integration_audit").insert({ direction: "outbound", event_type: input.eventType, material_id: input.materialId, official_exam_id: input.officialExamId ?? null, course_id: input.courseId ?? null, group_id: input.groupId ?? null, status: input.status, error_code: input.errorCode ?? null, attempt_number: Math.max(1, input.attempt) });
  if (error) console.error("official sync audit write failed", error.code ?? "DB_ERROR");
}

async function updateEventFailure(db: Db, event: ClaimedEvent, error: IntegrationFailure, mappingId?: string | null): Promise<{ status: "retry" | "failed_permanent"; error_code: string; next_retry_at: string | null }> {
  const permanentBusinessCodes = new Set(["GROUP_NOT_FOUND", "INVALID_DOCX", "EXAM_ALREADY_STARTED", "PERIOD_MISMATCH", "COURSE_GROUP_SCOPE_MISMATCH", "MAPPING_MISMATCH", "STUDENT_USERNAME_MISSING", "SEMESTER_SCORE_MISSING", "INVALID_SCORE", "INTEGRATION_NOT_CONFIGURED", "MATERIAL_NOT_FOUND"]);
  const canRetry = !permanentBusinessCodes.has(error.code) && error.transient !== false && event.attempt_count < MAX_ATTEMPTS;
  const delay = canRetry ? retryDelaySeconds(event.attempt_count) : null;
  const status = delay != null ? "retry" : "failed_permanent";
  const nextRetryAt = delay != null ? new Date(Date.now() + delay * 1000).toISOString() : null;
  await db.from("official_exam_sync_outbox").update({ status, last_error_code: error.code, last_error_message: safeMessage(error.message), next_retry_at: nextRetryAt }).eq("id", event.id);
  if (mappingId) await db.from("official_exam_links").update({ sync_status: status, last_error_code: error.code, last_error_message: safeMessage(error.message) }).eq("id", mappingId);
  await audit(db, { eventType: event.event_type, materialId: event.material_id, status, errorCode: error.code, attempt: event.attempt_count });
  return { status, error_code: error.code, next_retry_at: nextRetryAt };
}

async function ensureMapping(db: Db, material: any, courseName: string, groupName: string): Promise<any> {
  const { data: existing, error: readError } = await db.from("official_exam_links").select("id,material_id,course_id,group_id,academic_year,semester,exam_type,official_exam_id,sync_status").eq("material_id", material.id).maybeSingle();
  if (readError) throw failure("DATABASE_ERROR", readError.message, { transient: true });
  if (existing) {
    const valid = existing.course_id === material.course_id && existing.group_id === material.group_id && existing.academic_year === material.academic_year && Number(existing.semester) === Number(material.semester);
    if (!valid) throw failure("MAPPING_MISMATCH", "Stored official mapping no longer matches the material scope.", { transient: false });
    return existing;
  }
  const { data, error } = await db.from("official_exam_links").insert({ material_id: material.id, course_id: material.course_id, group_id: material.group_id, group_name_snapshot: groupName, course_name_snapshot: courseName, academic_year: material.academic_year, semester: material.semester, exam_type: material.exam_type, sync_status: "processing" }).select("id,material_id,course_id,group_id,academic_year,semester,exam_type,official_exam_id,sync_status").single();
  if (error) {
    if (error.code === "23505") throw failure("MAPPING_MISMATCH", "Another active official exam already exists for this course/group/period.", { transient: false });
    throw failure("DATABASE_ERROR", error.message, { transient: true });
  }
  return data;
}

export async function processOfficialOutboxEvent(db: Db, event: ClaimedEvent): Promise<Record<string, unknown>> {
  let mapping: any = null;
  let material: any = null;
  try {
    const { data: materialRow, error: materialError } = await db.from("exam_materials").select("id,course_id,group_id,academic_year,semester,exam_type,file_path,original_file_name,mime_type,file_size,uploaded_by").eq("id", event.material_id).maybeSingle();
    if (materialError) throw failure("DATABASE_ERROR", materialError.message, { transient: true });
    if (!materialRow) throw failure("MATERIAL_NOT_FOUND", "Exam material no longer exists.", { transient: false });
    material = materialRow;
    if (material.mime_type !== DOCX_MIME || !String(material.original_file_name).toLowerCase().endsWith(".docx")) throw failure("INVALID_DOCX", "Local material is not a valid DOCX record.", { transient: false });

    const { data: settings, error: settingsError } = await db.from("system_settings").select("cari_tedris_ili,cari_semestr").eq("singleton", true).maybeSingle();
    if (settingsError) throw failure("DATABASE_ERROR", settingsError.message, { transient: true });
    const currentYear = String(settings?.cari_tedris_ili ?? "").trim();
    const currentSemester = normalizeSemester(settings?.cari_semestr);
    if (material.academic_year !== currentYear || Number(material.semester) !== currentSemester) throw failure("PERIOD_MISMATCH", "Material period does not match canonical current system period.", { transient: false });

    const [{ data: course, error: courseError }, { data: group, error: groupError }] = await Promise.all([db.from("courses").select("id,ad").eq("id", material.course_id).maybeSingle(), db.from("groups").select("id,ad").eq("id", material.group_id).maybeSingle()]);
    if (courseError || groupError) throw failure("DATABASE_ERROR", courseError?.message ?? groupError?.message ?? "Lookup failed.", { transient: true });
    if (!course || !group) throw failure("COURSE_GROUP_SCOPE_MISMATCH", "Course or group does not exist locally.", { transient: false });
    const { data: scope, error: scopeError } = await db.from("course_groups").select("id").eq("course_id", material.course_id).eq("group_id", material.group_id).eq("tedris_ili", currentYear).eq("semestr", currentSemester).maybeSingle();
    if (scopeError) throw failure("DATABASE_ERROR", scopeError.message, { transient: true });
    if (!scope) throw failure("COURSE_GROUP_SCOPE_MISMATCH", "Material course/group pair is outside the current canonical relation.", { transient: false });

    mapping = await ensureMapping(db, material, String(course.ad).trim(), String(group.ad).trim());
    await db.from("official_exam_links").update({ sync_status: "processing", last_error_code: null, last_error_message: null }).eq("id", mapping.id);

    const { data: scoreRows, error: scoreError } = await db.rpc("official_semester_score_export", { p_course_id: material.course_id, p_group_id: material.group_id, p_academic_year: currentYear, p_semester: currentSemester });
    if (scoreError) {
      const code = /SEMESTER_SCORE_MISSING|STUDENT_USERNAME_MISSING|INVALID_SCORE/.exec(scoreError.message)?.[0] ?? "DATABASE_ERROR";
      throw failure(code, scoreError.message, { transient: code === "DATABASE_ERROR" });
    }

    const { data: signed, error: signedError } = await db.storage.from("exam-materials").createSignedUrl(material.file_path, SIGNED_URL_SECONDS);
    if (signedError || !signed?.signedUrl) throw failure("SIGNED_URL_ERROR", signedError?.message ?? "Could not create signed URL.", { transient: true });

    const { data: schedules, error: scheduleError } = await db.from("exam_schedule").select("imtahan_tarixi,baslangic_saat,otaq").eq("course_id", material.course_id).eq("group_id", material.group_id).gte("imtahan_tarixi", todayInBaku()).order("imtahan_tarixi", { ascending: true }).order("baslangic_saat", { ascending: true }).limit(1);
    if (scheduleError) throw failure("DATABASE_ERROR", scheduleError.message, { transient: true });
    const schedule = schedules?.[0] ?? null;
    const students = (scoreRows ?? []).map((row: any) => ({ student_username: String(row.student_username).trim().toLowerCase(), semester_score: Number(row.semester_score) }));
    const payload = { integration_version: 1, event_type: event.event_type, source_material_id: material.id, source_course_id: material.course_id, source_group_id: material.group_id, course_name: String(course.ad).trim(), group_name: String(group.ad).trim(), academic_year: currentYear, semester: currentSemester, exam_type: material.exam_type, material: { file_name: material.original_file_name, mime_type: material.mime_type, file_size: Number(material.file_size), signed_url: signed.signedUrl }, schedule: { exam_date: schedule?.imtahan_tarixi ?? null, start_time: schedule?.baslangic_saat ?? null, room: schedule?.otaq ?? null }, students };

    const rawBody = JSON.stringify(payload);
    const secret = Deno.env.get("ATU_OFFICIAL_PROVISION_SECRET");
    if (!secret) throw failure("INTEGRATION_NOT_CONFIGURED", "ATU_OFFICIAL_PROVISION_SECRET is not configured.", { transient: false });
    const timestamp = Date.now().toString();
    const signature = await hmacHex(secret, timestamp, rawBody);
    let response: Response;
    try {
      response = await fetch(OFFICIAL_ENDPOINT, { method: "POST", headers: { "content-type": "application/json", "x-atu-integration-version": "1", "x-atu-timestamp": timestamp, "x-atu-idempotency-key": material.id, "x-atu-signature": `v1=${signature}` }, body: rawBody });
    } catch (networkError) {
      throw failure("NETWORK_ERROR", networkError instanceof Error ? networkError.message : "Network error.", { transient: true });
    }
    let responseBody: any = {};
    try { responseBody = await response.json(); } catch { responseBody = {}; }
    if (!response.ok || responseBody?.success === false) throw classifyRemoteFailure(response.status, responseBody);
    if (responseBody?.source_material_id && responseBody.source_material_id !== material.id) throw failure("MAPPING_MISMATCH", "Official response source_material_id does not match local material.", { transient: false });
    const officialExamId = String(responseBody?.official_exam_id ?? mapping.official_exam_id ?? "").trim();
    if (!officialExamId) throw failure("MAPPING_MISMATCH", "Official response did not return official_exam_id.", { transient: false });
    const unmatched = Array.isArray(responseBody?.unmatched_students) ? responseBody.unmatched_students : [];
    const matchedCount = Number.isFinite(Number(responseBody?.matched_students)) ? Math.max(0, Number(responseBody.matched_students)) : Math.max(0, students.length - unmatched.length);
    const linkStatus = responseBody?.status === "partial" || unmatched.length > 0 ? "partial" : "synced";
    const { error: mappingUpdateError } = await db.from("official_exam_links").update({ official_exam_id: officialExamId, exam_type: material.exam_type, course_name_snapshot: String(course.ad).trim(), group_name_snapshot: String(group.ad).trim(), sync_status: linkStatus, matched_student_count: matchedCount, unmatched_student_count: unmatched.length, last_error_code: null, last_error_message: null, last_synced_at: new Date().toISOString() }).eq("id", mapping.id);
    if (mappingUpdateError) throw failure("DATABASE_ERROR", mappingUpdateError.message, { transient: true });
    await db.from("official_exam_sync_outbox").update({ status: "synced", last_error_code: null, last_error_message: null, next_retry_at: null }).eq("id", event.id);
    await audit(db, { eventType: event.event_type, materialId: material.id, officialExamId, courseId: material.course_id, groupId: material.group_id, status: linkStatus, attempt: event.attempt_count });
    return { success: true, status: linkStatus, official_exam_id: officialExamId, source_material_id: material.id, matched_students: matchedCount, unmatched_students: unmatched };
  } catch (caught) {
    const err = (caught instanceof Error ? caught : failure("UNKNOWN_ERROR", String(caught))) as IntegrationFailure;
    if (!err.code) err.code = "UNKNOWN_ERROR";
    if (err.transient == null) err.transient = err.code === "DATABASE_ERROR" || err.code === "NETWORK_ERROR" || err.code === "SIGNED_URL_ERROR";
    const result = await updateEventFailure(db, event, err, mapping?.id ?? null);
    console.error("official exam sync failed", { code: err.code, material_id: event.material_id, attempt: event.attempt_count });
    return { success: false, ...result };
  }
}

export async function authorizeTeacherMaterialRetry(db: Db, authorization: string | null, materialId: string): Promise<string> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw failure("UNAUTHORIZED", "Missing bearer token.", { httpStatus: 401, transient: false });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) throw failure("UNAUTHORIZED", "Invalid user token.", { httpStatus: 401, transient: false });
  const { data: material, error: materialError } = await db.from("exam_materials").select("id,course_id,uploaded_by").eq("id", materialId).maybeSingle();
  if (materialError) throw failure("DATABASE_ERROR", materialError.message, { httpStatus: 500, transient: true });
  if (!material) throw failure("MATERIAL_NOT_FOUND", "Material not found.", { httpStatus: 404, transient: false });
  if (material.uploaded_by !== authData.user.id) throw failure("FORBIDDEN", "Teacher is not the material uploader.", { httpStatus: 403, transient: false });
  const { data: assignment, error: assignmentError } = await db.from("course_teachers").select("id").eq("course_id", material.course_id).eq("muellim_id", authData.user.id).limit(1).maybeSingle();
  if (assignmentError) throw failure("DATABASE_ERROR", assignmentError.message, { httpStatus: 500, transient: true });
  if (!assignment) throw failure("FORBIDDEN", "Teacher is not assigned to the material course.", { httpStatus: 403, transient: false });
  return authData.user.id;
}

export async function claimMaterialEventForManualRetry(db: Db, materialId: string): Promise<ClaimedEvent> {
  const { data: openEvents, error: openError } = await db.from("official_exam_sync_outbox").select("id,material_id,event_type,status,attempt_count,created_at").eq("material_id", materialId).in("status", ["pending", "retry", "failed_permanent"]).order("created_at", { ascending: false }).limit(1);
  if (openError) throw failure("DATABASE_ERROR", openError.message, { transient: true });
  let event = openEvents?.[0] ?? null;
  if (!event || event.status === "failed_permanent") {
    const { data: mapping } = await db.from("official_exam_links").select("official_exam_id").eq("material_id", materialId).maybeSingle();
    const eventType: OutboxEventType = mapping?.official_exam_id ? "exam.update" : "exam.provision";
    const { data: inserted, error: insertError } = await db.from("official_exam_sync_outbox").insert({ material_id: materialId, event_type: eventType, status: "pending" }).select("id,material_id,event_type,status,attempt_count,created_at").single();
    if (insertError) {
      const { data: raced } = await db.from("official_exam_sync_outbox").select("id,material_id,event_type,status,attempt_count,created_at").eq("material_id", materialId).in("status", ["pending", "retry"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!raced) throw failure("DATABASE_ERROR", insertError.message, { transient: true });
      event = raced;
    } else event = inserted;
  }
  const nextAttempt = Number(event.attempt_count ?? 0) + 1;
  const { data: claimed, error: claimError } = await db.from("official_exam_sync_outbox").update({ status: "processing", attempt_count: nextAttempt, next_retry_at: null }).eq("id", event.id).select("id,material_id,event_type,attempt_count").single();
  if (claimError) throw failure("DATABASE_ERROR", claimError.message, { transient: true });
  return claimed as ClaimedEvent;
}

export async function verifyWorkerToken(db: Db, token: string | null): Promise<boolean> {
  if (!token) return false;
  const { data, error } = await db.rpc("verify_official_exam_worker_token", { p_token: token });
  return !error && data === true;
}

export function integrationErrorResponse(error: unknown): { status: number; body: Record<string, unknown> } {
  const err = error as IntegrationFailure;
  const code = err?.code ?? "INTERNAL_ERROR";
  const status = err?.httpStatus ?? (code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500);
  return { status, body: { success: false, error_code: code, message: safeMessage(err?.message) } };
}