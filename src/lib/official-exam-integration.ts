export const OFFICIAL_INTEGRATION_VERSION = 1 as const;

export type OfficialExamType = "test" | "ticket";

export type OfficialSyncStatus =
  | "pending"
  | "processing"
  | "synced"
  | "partial"
  | "retry"
  | "failed_permanent";

export type OfficialOutboxEventType =
  | "exam.provision"
  | "exam.update"
  | "semester_scores.updated";

export type OfficialIntegrationEventType = OfficialOutboxEventType | "exam.result";

export type OfficialIntegrationErrorCode =
  | "INVALID_INTEGRATION_VERSION"
  | "INVALID_SIGNATURE"
  | "STALE_TIMESTAMP"
  | "INVALID_SCORE"
  | "INVALID_ACADEMIC_PERIOD"
  | "PERIOD_MISMATCH"
  | "MAPPING_NOT_FOUND"
  | "MAPPING_MISMATCH"
  | "STUDENT_NOT_FOUND"
  | "STUDENT_GROUP_MISMATCH"
  | "STUDENT_USERNAME_MISSING"
  | "SEMESTER_SCORE_MISSING"
  | "COURSE_GROUP_SCOPE_MISMATCH"
  | "GROUP_NOT_FOUND"
  | "INVALID_DOCX"
  | "EXAM_ALREADY_STARTED"
  | "INTEGRATION_NOT_CONFIGURED"
  | "DATABASE_ERROR";

export const OFFICIAL_RETRY_DELAYS_SECONDS = [60, 300, 900, 3600] as const;

export function officialRetryDelaySeconds(attemptCount: number): number | null {
  return OFFICIAL_RETRY_DELAYS_SECONDS[attemptCount - 1] ?? null;
}

export function isRetryableOfficialHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export interface SemesterScoreExportRow {
  student_username: string;
  semester_score: number;
}

export interface OfficialExamMaterialPayload {
  file_name: string;
  mime_type: string;
  file_size: number;
  signed_url: string;
}

export interface OfficialExamSchedulePayload {
  exam_date: string | null;
  start_time: string | null;
  room: string | null;
}

export interface OfficialExamProvisionPayload {
  integration_version: typeof OFFICIAL_INTEGRATION_VERSION;
  event_type: OfficialOutboxEventType;
  source_material_id: string;
  source_course_id: string;
  source_group_id: string;
  group_name: string;
  course_name: string;
  academic_year: string;
  semester: 1 | 2;
  exam_type: OfficialExamType;
  material: OfficialExamMaterialPayload;
  schedule: OfficialExamSchedulePayload;
  students: SemesterScoreExportRow[];
}

export interface OfficialExamProvisionResponse {
  success: boolean;
  status: "synced" | "partial";
  official_exam_id: string;
  source_material_id: string;
  matched_students: number;
  unmatched_students: string[];
}

export interface OfficialExamResultPayload {
  integration_version: typeof OFFICIAL_INTEGRATION_VERSION;
  event_type: "exam.result";
  source_result_id: string;
  official_exam_id: string;
  source_material_id: string;
  source_course_id: string;
  source_group_id: string;
  academic_year: string;
  semester: 1 | 2;
  group_name: string;
  course_name: string;
  exam_type: OfficialExamType;
  student_username: string;
  current_score: number;
  semester_score_snapshot?: number | null;
  total_score?: number | null;
  exam_name?: string | null;
  total_questions?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
  unanswered_count?: number | null;
  percentage?: number | null;
  answers_data_b64?: string | null;
  answers_data?: unknown;
  exam_started_at?: string | null;
  exam_completed_at?: string | null;
}

export interface OfficialExamMapping {
  id: string;
  material_id: string;
  course_id: string;
  group_id: string;
  group_name_snapshot: string;
  course_name_snapshot: string;
  academic_year: string;
  semester: 1 | 2;
  exam_type: OfficialExamType;
  official_exam_id: string | null;
  sync_status: OfficialSyncStatus;
  matched_student_count?: number;
  unmatched_student_count?: number;
  last_error_code?: string | null;
  last_error_message?: string | null;
  last_synced_at?: string | null;
}

export interface OfficialExamMappingLocalTruth extends OfficialExamMapping {
  current_group_name: string;
  current_course_name: string;
}

export class OfficialIntegrationError extends Error {
  readonly code: OfficialIntegrationErrorCode;

  constructor(code: OfficialIntegrationErrorCode, message: string) {
    super(message);
    this.name = "OfficialIntegrationError";
    this.code = code;
  }
}

export function normalizeStudentUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAcademicYear(value: string): boolean {
  return /^\d{4}-\d{4}$/.test(value.trim());
}

export function assertAcademicPeriod(
  academicYear: string,
  semester: number,
): asserts semester is 1 | 2 {
  if (!isValidAcademicYear(academicYear) || (semester !== 1 && semester !== 2)) {
    throw new OfficialIntegrationError(
      "INVALID_ACADEMIC_PERIOD",
      "Academic year or semester is invalid.",
    );
  }
}

export function isScoreInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function assertSemesterScore(value: number): void {
  if (!isScoreInRange(value, 0, 50)) {
    throw new OfficialIntegrationError(
      "INVALID_SCORE",
      "Semester score must be between 0 and 50.",
    );
  }
}

export function assertOfficialCurrentScore(value: number): void {
  if (!isScoreInRange(value, 0, 50)) {
    throw new OfficialIntegrationError(
      "INVALID_SCORE",
      "Official exam current_score must be between 0 and 50.",
    );
  }
}

export function assertTotalScore(value: number): void {
  if (!isScoreInRange(value, 0, 100)) {
    throw new OfficialIntegrationError(
      "INVALID_SCORE",
      "Total score must be between 0 and 100.",
    );
  }
}

export function assertStudentGroupMembership(isMember: boolean): void {
  if (!isMember) {
    throw new OfficialIntegrationError(
      "STUDENT_GROUP_MISMATCH",
      "Resolved student is not a member of the locally mapped group.",
    );
  }
}

function sameSnapshotText(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

export function validateOfficialResultAgainstMapping(
  payload: OfficialExamResultPayload,
  mapping: OfficialExamMappingLocalTruth,
): void {
  const mismatches: string[] = [];

  if (payload.official_exam_id !== mapping.official_exam_id) mismatches.push("official_exam_id");
  if (payload.source_material_id !== mapping.material_id) mismatches.push("source_material_id");
  if (payload.source_course_id !== mapping.course_id) mismatches.push("source_course_id");
  if (payload.source_group_id !== mapping.group_id) mismatches.push("source_group_id");
  if (payload.academic_year !== mapping.academic_year) mismatches.push("academic_year");
  if (payload.semester !== mapping.semester) mismatches.push("semester");
  if (payload.exam_type !== mapping.exam_type) mismatches.push("exam_type");
  if (!sameSnapshotText(payload.group_name, mapping.current_group_name)) mismatches.push("group_name");
  if (!sameSnapshotText(payload.course_name, mapping.current_course_name)) mismatches.push("course_name");

  if (mismatches.length > 0) {
    throw new OfficialIntegrationError(
      "MAPPING_MISMATCH",
      `Official result does not match local mapping: ${mismatches.join(", ")}.`,
    );
  }

  assertAcademicPeriod(payload.academic_year, payload.semester);
  assertOfficialCurrentScore(payload.current_score);
  if (payload.semester_score_snapshot != null) assertSemesterScore(payload.semester_score_snapshot);
  if (payload.total_score != null) assertTotalScore(payload.total_score);
}
