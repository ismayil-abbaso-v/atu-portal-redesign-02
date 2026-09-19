import { describe, expect, test } from "bun:test";
import {
  OFFICIAL_INTEGRATION_VERSION,
  OFFICIAL_RETRY_DELAYS_SECONDS,
  OfficialIntegrationError,
  assertOfficialCurrentScore,
  assertSemesterScore,
  assertStudentGroupMembership,
  assertTotalScore,
  isRetryableOfficialHttpStatus,
  officialRetryDelaySeconds,
  validateOfficialResultAgainstMapping,
  type OfficialExamMappingLocalTruth,
  type OfficialExamProvisionPayload,
  type OfficialExamResultPayload,
} from "./official-exam-integration";
import {
  createOfficialIntegrationSignature,
  verifyOfficialIntegrationSignature,
} from "./official-exam-integration.server";

const mapping: OfficialExamMappingLocalTruth = {
  id: "link-1",
  material_id: "material-1",
  course_id: "course-1",
  group_id: "group-1",
  group_name_snapshot: "4134a",
  course_name_snapshot: "Veb təhlükəsizliyi",
  academic_year: "2026-2027",
  semester: 1,
  exam_type: "test",
  official_exam_id: "official-1",
  sync_status: "synced",
  current_group_name: "4134a",
  current_course_name: "Veb təhlükəsizliyi",
};

const validResult: OfficialExamResultPayload = {
  integration_version: OFFICIAL_INTEGRATION_VERSION,
  event_type: "exam.result",
  source_result_id: "result-1",
  official_exam_id: "official-1",
  source_material_id: "material-1",
  source_course_id: "course-1",
  source_group_id: "group-1",
  academic_year: "2026-2027",
  semester: 1,
  group_name: "4134a",
  course_name: "Veb təhlükəsizliyi",
  exam_type: "test",
  student_username: "174143",
  current_score: 50,
  semester_score_snapshot: 42,
  total_score: 92,
};

const provisionPayload: OfficialExamProvisionPayload = {
  integration_version: OFFICIAL_INTEGRATION_VERSION,
  event_type: "exam.provision",
  source_material_id: "11111111-1111-4111-8111-111111111111",
  source_course_id: "22222222-2222-4222-8222-222222222222",
  source_group_id: "33333333-3333-4333-8333-333333333333",
  course_name: "Veb təhlükəsizliyi",
  group_name: "4134a",
  academic_year: "2026-2027",
  semester: 1,
  exam_type: "test",
  material: {
    file_name: "veb-tehlukesizliyi.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_size: 123456,
    signed_url: "https://example.invalid/private.docx?token=fresh",
  },
  schedule: { exam_date: null, start_time: null, room: null },
  students: [{ student_username: "174143", semester_score: 42 }],
};

function expectIntegrationError(
  fn: () => unknown,
  code: OfficialIntegrationError["code"],
): void {
  try {
    fn();
    throw new Error(`Expected ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(OfficialIntegrationError);
    expect((error as OfficialIntegrationError).code).toBe(code);
  }
}

describe("official integration score validation", () => {
  test("accepts semester/current score boundary 0", () => {
    expect(() => assertSemesterScore(0)).not.toThrow();
    expect(() => assertOfficialCurrentScore(0)).not.toThrow();
  });

  test("accepts semester/current score boundary 50", () => {
    expect(() => assertSemesterScore(50)).not.toThrow();
    expect(() => assertOfficialCurrentScore(50)).not.toThrow();
  });

  test("rejects -1", () => {
    expectIntegrationError(() => assertSemesterScore(-1), "INVALID_SCORE");
    expectIntegrationError(() => assertOfficialCurrentScore(-1), "INVALID_SCORE");
  });

  test("rejects 51", () => {
    expectIntegrationError(() => assertSemesterScore(51), "INVALID_SCORE");
    expectIntegrationError(() => assertOfficialCurrentScore(51), "INVALID_SCORE");
  });

  test("accepts total score 0..100 and rejects 101", () => {
    expect(() => assertTotalScore(0)).not.toThrow();
    expect(() => assertTotalScore(100)).not.toThrow();
    expectIntegrationError(() => assertTotalScore(101), "INVALID_SCORE");
  });
});

describe("official result mapping validation", () => {
  test("accepts an exact local mapping", () => {
    expect(() => validateOfficialResultAgainstMapping(validResult, mapping)).not.toThrow();
  });

  test("rejects a forged source_course_id", () => {
    expectIntegrationError(
      () => validateOfficialResultAgainstMapping({ ...validResult, source_course_id: "other-course" }, mapping),
      "MAPPING_MISMATCH",
    );
  });

  test("rejects a student outside the mapped group", () => {
    expect(() => assertStudentGroupMembership(true)).not.toThrow();
    expectIntegrationError(() => assertStudentGroupMembership(false), "STUDENT_GROUP_MISMATCH");
  });
});

describe("Prompt 2 provisioning contract", () => {
  test("supports both Test and Ticket payloads", () => {
    expect(provisionPayload.exam_type).toBe("test");
    const ticket: OfficialExamProvisionPayload = { ...provisionPayload, exam_type: "ticket", event_type: "exam.update" };
    expect(ticket.exam_type).toBe("ticket");
  });

  test("keeps schedule nullable instead of inventing an exam time", () => {
    expect(provisionPayload.schedule).toEqual({ exam_date: null, start_time: null, room: null });
  });

  test("exports canonical username and 0..50 semester score rows", () => {
    expect(provisionPayload.students).toEqual([{ student_username: "174143", semester_score: 42 }]);
    for (const row of provisionPayload.students) expect(() => assertSemesterScore(row.semester_score)).not.toThrow();
  });

  test("uses the exact five-stage retry policy", () => {
    expect(OFFICIAL_RETRY_DELAYS_SECONDS).toEqual([60, 300, 900, 3600]);
    expect(officialRetryDelaySeconds(1)).toBe(60);
    expect(officialRetryDelaySeconds(2)).toBe(300);
    expect(officialRetryDelaySeconds(3)).toBe(900);
    expect(officialRetryDelaySeconds(4)).toBe(3600);
    expect(officialRetryDelaySeconds(5)).toBeNull();
  });

  test("retries network-like HTTP failures and not permanent 4xx", () => {
    for (const status of [408, 425, 429, 500, 502, 503]) expect(isRetryableOfficialHttpStatus(status)).toBe(true);
    for (const status of [400, 401, 403, 404, 409, 422]) expect(isRetryableOfficialHttpStatus(status)).toBe(false);
  });
});

describe("official integration HMAC", () => {
  const secret = "test-secret";
  const timestamp = "1700000000";
  const rawBody = '{"integration_version":1,"event_type":"exam.result"}';
  const knownSignature = "c72b1fdc15b74e40e5a2a362352fdc03c41e4d42e88c9bff61187f4b58870ac0";

  test("is deterministic for timestamp.rawBody", () => {
    expect(createOfficialIntegrationSignature(secret, timestamp, rawBody)).toBe(knownSignature);
    expect(verifyOfficialIntegrationSignature(secret, timestamp, rawBody, knownSignature)).toBe(true);
  });

  test("rejects a tampered body", () => {
    expect(verifyOfficialIntegrationSignature(secret, timestamp, `${rawBody} `, knownSignature)).toBe(false);
  });
});

describe("Prompt 2 implementation boundaries", () => {
  test("worker builds the integration payload server-side and signs a 300-second URL", async () => {
    const source = await Bun.file("supabase/functions/process-official-exam-outbox/official-exam-sync.ts").text();
    expect(source).toContain('SIGNED_URL_SECONDS = 300');
    expect(source).toContain('from("system_settings")');
    expect(source).toContain('from("course_groups")');
    expect(source).toContain('rpc("official_semester_score_export"');
    expect(source).toContain('from("exam_schedule")');
    expect(source).toContain('x-atu-idempotency-key');
    expect(source).toContain('x-atu-signature');
    expect(source).toContain('ATU_OFFICIAL_PROVISION_SECRET');
  });

  test("manual retry accepts only material_id and verifies teacher ownership plus assignment", async () => {
    const retrySource = await Bun.file("supabase/functions/sync-exam-material-to-official/index.ts").text();
    const shared = await Bun.file("supabase/functions/sync-exam-material-to-official/official-exam-sync.ts").text();
    expect(retrySource).toContain('keys.length !== 1');
    expect(retrySource).toContain('keys[0] !== "material_id"');
    expect(shared).toContain('material.uploaded_by !== authData.user.id');
    expect(shared).toContain('from("course_teachers")');
    expect(shared).toContain('eq("muellim_id", authData.user.id)');
  });

  test("browser code never contains the Official Supabase endpoint or provisioning secret", async () => {
    const client = await Bun.file("src/lib/official-exam-client.ts").text();
    const panel = await Bun.file("src/components/exams/TeacherExamMaterialsPanel.tsx").text();
    const browserSource = `${client}\n${panel}`;
    expect(browserSource).not.toContain("njxunkrhpwjssymoctsb");
    expect(browserSource).not.toContain("ATU_OFFICIAL_PROVISION_SECRET");
    expect(browserSource).not.toContain("receive-atu-exam");
  });

  test("teacher panel exposes status and manual retry without adding result score editing", async () => {
    const panel = await Bun.file("src/components/exams/TeacherExamMaterialsPanel.tsx").text();
    expect(panel).toContain("officialSyncPartial");
    expect(panel).toContain("retryOfficialExamSync");
    expect(panel).toContain("min-h-11");
    expect(panel).not.toContain("exam_scores");
    expect(panel).not.toContain("imtahan_bali");
  });

  test("legacy branch stays detailed-result only while HMAC uses the atomic RPC", async () => {
    const source = await Bun.file("supabase/functions/receive-exam-result/index.ts").text();
    expect(source).toContain("x-sync-secret");
    expect(source).toContain("EXAM_SYNC_SECRET");
    expect(source).toContain('from("exam_detailed_results")');
    expect(source).toContain('rpc("apply_official_exam_result"');
    expect(source).not.toContain('from("exam_scores")');
  });

  test("TanStack result route is a raw-body proxy to the canonical receiver", async () => {
    const source = await Bun.file("src/routes/api/public/receive-exam-result.ts").text();
    expect(source).toContain("CANONICAL_RECEIVER");
    expect(source).toContain("const rawBody = await request.text()");
    expect(source).toContain("body: rawBody");
    expect(source).toContain('"x-sync-secret"');
    expect(source).toContain('"x-atu-signature"');
    expect(source).not.toContain("EXAM_SYNC_SECRET");
    expect(source).not.toContain('from("exam_detailed_results")');
    expect(source).not.toContain('from("exam_scores")');
  });
});
