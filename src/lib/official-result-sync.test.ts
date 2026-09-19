import { describe, expect, test } from "bun:test";

async function source(path: string) {
  return Bun.file(path).text();
}

describe("Prompt 3 canonical result receiver", () => {
  test("validates HMAC over the untouched raw body with a five-minute window", async () => {
    const receiver = await source("supabase/functions/receive-exam-result/index.ts");
    expect(receiver).toContain("const rawBody = await req.text()");
    expect(receiver).toContain('encoder.encode(`${timestamp}.${rawBody}`)');
    expect(receiver).toContain("const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000");
    expect(receiver).toContain('Deno.env.get("ATU_OFFICIAL_RESULT_SECRET")');
    expect(receiver).toContain('req.headers.get("x-atu-integration-version")');
    expect(receiver).toContain('req.headers.get("x-atu-timestamp")');
    expect(receiver).toContain('req.headers.get("x-atu-idempotency-key")');
    expect(receiver).toContain('req.headers.get("x-atu-signature")');
    expect(receiver).toContain('signatureHeader.startsWith("v1=")');
    expect(receiver).toContain("constantTimeEqual(expected, suppliedSignature)");
  });

  test("preserves the legacy secret path without granting it journal writes", async () => {
    const receiver = await source("supabase/functions/receive-exam-result/index.ts");
    expect(receiver).toContain('Deno.env.get("EXAM_SYNC_SECRET")');
    expect(receiver).toContain('req.headers.get("x-sync-secret")');
    expect(receiver).toContain('from("exam_detailed_results")');
    expect(receiver).toContain('sync_source: "legacy"');
    expect(receiver).toContain("verified_result_already_present");
    expect(receiver).not.toContain('from("exam_scores")');
  });

  test("strictly validates official score ranges and timestamps", async () => {
    const receiver = await source("supabase/functions/receive-exam-result/index.ts");
    expect(receiver).toContain('isStrictNumber(payload["current_score"], 0, 50)');
    expect(receiver).toContain('isStrictNumber(payload["semester_score_snapshot"], 0, 50)');
    expect(receiver).toContain('isStrictNumber(payload["total_score"], 0, 100)');
    expect(receiver).toContain('parseIsoTimestamp(payload["exam_started_at"], "exam_started_at")');
    expect(receiver).toContain('parseIsoTimestamp(payload["exam_completed_at"], "exam_completed_at")');
  });

  test("uses one server-side atomic transaction for mapped official results", async () => {
    const receiver = await source("supabase/functions/receive-exam-result/index.ts");
    const migration = await source("supabase/migrations/20260831114000_official_result_journal_sync.sql");
    expect(receiver).toContain('rpc("apply_official_exam_result"');
    expect(migration).toContain("create or replace function public.apply_official_exam_result");
    expect(migration).toContain("official_exam_links");
    expect(migration).toContain("STUDENT_GROUP_MISMATCH");
    expect(migration).toContain("MAPPING_MISMATCH");
    expect(migration).toContain("IDEMPOTENCY_CONFLICT");
    expect(migration).toContain("SEMESTER_SNAPSHOT_MISMATCH");
    expect(migration).toContain("imtahan_bali");
    expect(migration).toContain("exam_detailed_results");
    expect(migration).toContain("exam_integration_audit");
  });

  test("keeps the result transaction service-role only", async () => {
    const migration = await source("supabase/migrations/20260831114000_official_result_journal_sync.sql");
    expect(migration).toContain("revoke all on function public.apply_official_exam_result");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.apply_official_exam_result");
    expect(migration).toContain("to service_role");
  });

  test("keeps the local canonical semester source and final-score trigger path", async () => {
    const migration = await source("supabase/migrations/20260831114000_official_result_journal_sync.sql");
    expect(migration).toContain("semester_score_snapshot");
    expect(migration).toContain("v_local_semester");
    expect(migration).toContain("semestr_qiymeti");
    expect(migration).toContain("imtahan_bali");
    expect(migration).not.toContain("set semestr_qiymeti = v_snapshot_score");
  });
});

describe("Prompt 3 server/browser boundaries", () => {
  test("TanStack fallback proxies the exact raw body and both auth contracts", async () => {
    const route = await source("src/routes/api/public/receive-exam-result.ts");
    expect(route).toContain("const rawBody = await request.text()");
    expect(route).toContain("body: rawBody");
    expect(route).toContain('"x-sync-secret"');
    expect(route).toContain('"x-atu-integration-version"');
    expect(route).toContain('"x-atu-timestamp"');
    expect(route).toContain('"x-atu-idempotency-key"');
    expect(route).toContain('"x-atu-signature"');
    expect(route).not.toContain("EXAM_SYNC_SECRET");
    expect(route).not.toContain("ATU_OFFICIAL_RESULT_SECRET");
    expect(route).not.toContain('from("exam_scores")');
  });

  test("teacher exam route stays read-only while admin/dean retain their existing scope", async () => {
    const route = await source("src/routes/_authenticated/imtahanlar.tsx");
    expect(route).toContain('primaryRole === "muellim"');
    expect(route).toContain("<TeacherExamGradingView userId={userId} readOnly />");
    expect(route).toContain('primaryRole === "admin" || primaryRole === "dekan"');
  });

  test("student result and Digital Journal read the two canonical result fields consistently", async () => {
    const resultView = await source("src/lib/exam-result-view-model.ts");
    const journal = await source("src/components/electronic-journal/StudentJournalView.tsx");
    expect(resultView).toContain("result.current_score");
    expect(journal).toContain("examScore?.imtahan_bali ?? null");
  });
});
