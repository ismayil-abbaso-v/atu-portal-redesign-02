// Canonical Official Portal -> ATU result receiver.
//
// New sender contract: HMAC-SHA256(timestamp + "." + rawBody) using
// ATU_OFFICIAL_RESULT_SECRET from Supabase Edge Functions Secrets, with local
// official_exam_links validation and an atomic service-role-only DB transaction
// that writes exam_detailed_results + exam_scores.imtahan_bali. The local
// semester score is never overwritten by the Official snapshot.
//
// Transition contract: legacy x-sync-secret / EXAM_SYNC_SECRET callbacks are
// still accepted and keep their historical exam_detailed_results-only behavior.
// A mapping-less legacy callback can never guess a Digital Journal course.

import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const INTEGRATION_VERSION = 1;
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-sync-secret",
    "x-atu-integration-version",
    "x-atu-timestamp",
    "x-atu-idempotency-key",
    "x-atu-signature",
  ].join(", "),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class ReceiverError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("az-AZ");
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}

function isStrictNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isStrictInteger(value: unknown, min = 0) {
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

function parseIsoTimestamp(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ReceiverError("INVALID_PAYLOAD", `${field} is required.`, 400);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ReceiverError("INVALID_PAYLOAD", `${field} is invalid.`, 400);
  }
  return date.toISOString();
}

function decodeAnswers(payload: Record<string, unknown>, strict: boolean): unknown {
  const b64 = payload["answers_data_b64"];
  if (typeof b64 === "string" && b64.length > 0) {
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const text = new TextDecoder("utf-8").decode(bytes);
      const parsed = JSON.parse(text);
      return parsed ?? [];
    } catch {
      if (strict) {
        throw new ReceiverError("INVALID_ANSWERS", "answers_data_b64 is not valid base64 JSON.", 422);
      }
      return [];
    }
  }
  if (strict) {
    throw new ReceiverError("INVALID_ANSWERS", "answers_data_b64 is required.", 422);
  }
  return payload["answers_data"] ?? [];
}

async function hmacHex(secret: string, timestamp: string, rawBody: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function loadOfficialResultSecret() {
  const secret = Deno.env.get("ATU_OFFICIAL_RESULT_SECRET")?.trim();
  if (!secret) {
    throw new ReceiverError(
      "INTEGRATION_NOT_CONFIGURED",
      "ATU_OFFICIAL_RESULT_SECRET is not configured in Supabase Edge Functions Secrets.",
      503,
    );
  }
  return secret;
}

async function verifyHmac(
  req: Request,
  rawBody: string,
) {
  const version = req.headers.get("x-atu-integration-version");
  const timestamp = req.headers.get("x-atu-timestamp")?.trim() ?? "";
  const idempotencyKey = req.headers.get("x-atu-idempotency-key")?.trim() ?? "";
  const signatureHeader = req.headers.get("x-atu-signature")?.trim().toLowerCase() ?? "";
  // New senders use the explicit v1=<hex> scheme. Keep accepting the previous
  // raw-hex representation during transition so existing integrations do not break.
  const suppliedSignature = signatureHeader.startsWith("v1=")
    ? signatureHeader.slice(3)
    : signatureHeader;

  if (version !== String(INTEGRATION_VERSION)) {
    throw new ReceiverError("INVALID_INTEGRATION_VERSION", "Unsupported integration version.", 400);
  }
  if (!/^\d{10,13}$/.test(timestamp)) {
    throw new ReceiverError("EXPIRED_TIMESTAMP", "Missing or invalid request timestamp.", 401);
  }
  const numericTimestamp = Number(timestamp);
  const timestampMs = timestamp.length >= 13 ? numericTimestamp : numericTimestamp * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_SKEW_MS) {
    throw new ReceiverError("EXPIRED_TIMESTAMP", "Request timestamp is outside the accepted window.", 401);
  }
  if (!idempotencyKey) {
    throw new ReceiverError("INVALID_IDEMPOTENCY_KEY", "Idempotency key is required.", 409);
  }
  if (!/^[0-9a-f]{64}$/.test(suppliedSignature)) {
    throw new ReceiverError("INVALID_SIGNATURE", "Invalid request signature.", 401);
  }

  const secret = await loadOfficialResultSecret();
  const expected = await hmacHex(secret, timestamp, rawBody);
  if (!constantTimeEqual(expected, suppliedSignature)) {
    throw new ReceiverError("INVALID_SIGNATURE", "Invalid request signature.", 401);
  }
  return idempotencyKey;
}

function validateOfficialPayload(payload: Record<string, unknown>, idempotencyKey: string) {
  if (payload["integration_version"] !== 1) {
    throw new ReceiverError("INVALID_INTEGRATION_VERSION", "Invalid integration payload version.", 400);
  }
  if (!["result.created", "result.updated"].includes(String(payload["event_type"] ?? ""))) {
    throw new ReceiverError("INVALID_EVENT_TYPE", "Unsupported result event type.", 400);
  }

  for (const field of [
    "source_result_id",
    "official_exam_id",
    "source_material_id",
    "source_course_id",
    "source_group_id",
  ]) {
    if (!isUuid(payload[field])) {
      throw new ReceiverError("INVALID_PAYLOAD", `${field} must be a UUID.`, 400);
    }
  }

  if (idempotencyKey.toLowerCase() !== String(payload["source_result_id"]).toLowerCase()) {
    throw new ReceiverError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency key must equal source_result_id.",
      409,
    );
  }

  const courseName = payload["course_name"];
  const groupName = payload["group_name"];
  const username = payload["student_username"];
  if (typeof courseName !== "string" || !courseName.trim()) {
    throw new ReceiverError("INVALID_PAYLOAD", "course_name is required.", 400);
  }
  if (typeof groupName !== "string" || !groupName.trim()) {
    throw new ReceiverError("INVALID_PAYLOAD", "group_name is required.", 400);
  }
  if (typeof username !== "string" || !username.trim()) {
    throw new ReceiverError("INVALID_PAYLOAD", "student_username is required.", 400);
  }
  if (!/^\d{4}-\d{4}$/.test(String(payload["academic_year"] ?? ""))) {
    throw new ReceiverError("INVALID_PAYLOAD", "academic_year is invalid.", 400);
  }
  if (![1, 2].includes(payload["semester"] as number)) {
    throw new ReceiverError("INVALID_PAYLOAD", "semester is invalid.", 400);
  }
  if (!["test", "ticket"].includes(String(payload["exam_type"] ?? ""))) {
    throw new ReceiverError("INVALID_PAYLOAD", "exam_type is invalid.", 400);
  }

  const totalQuestions = payload["total_questions"];
  const correctCount = payload["correct_count"];
  const wrongCount = payload["wrong_count"];
  const unansweredCount = payload["unanswered_count"];
  if (!isStrictInteger(totalQuestions, 0) || !isStrictInteger(correctCount, 0) ||
      !isStrictInteger(wrongCount, 0) || !isStrictInteger(unansweredCount, 0)) {
    throw new ReceiverError("INVALID_PAYLOAD", "Question counters must be non-negative integers.", 400);
  }
  if ((correctCount as number) + (wrongCount as number) + (unansweredCount as number) !== totalQuestions) {
    throw new ReceiverError("INVALID_PAYLOAD", "Question counters do not add up to total_questions.", 400);
  }
  if (!isStrictNumber(payload["percentage"], 0, 100)) {
    throw new ReceiverError("INVALID_SCORE", "percentage must be between 0 and 100.", 422);
  }
  if (!isStrictNumber(payload["current_score"], 0, 50) ||
      !isStrictNumber(payload["semester_score_snapshot"], 0, 50) ||
      !isStrictNumber(payload["total_score"], 0, 100)) {
    throw new ReceiverError("INVALID_SCORE", "Score is outside the accepted range.", 422);
  }

  parseIsoTimestamp(payload["exam_started_at"], "exam_started_at");
  parseIsoTimestamp(payload["exam_completed_at"], "exam_completed_at");
  parseIsoTimestamp(payload["result_updated_at"], "result_updated_at");
}

async function handleOfficialHmac(
  req: Request,
  rawBody: string,
  supabase: ReturnType<typeof createClient>,
) {
  const idempotencyKey = await verifyHmac(req, rawBody);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new ReceiverError("INVALID_PAYLOAD", "Request body is not valid JSON.", 400);
  }

  validateOfficialPayload(payload, idempotencyKey);
  const answers = decodeAnswers(payload, true);
  const payloadHash = await sha256Hex(rawBody);

  const normalizedPayload = {
    ...payload,
    student_username: normalizeUsername(payload["student_username"]),
    exam_started_at: parseIsoTimestamp(payload["exam_started_at"], "exam_started_at"),
    exam_completed_at: parseIsoTimestamp(payload["exam_completed_at"], "exam_completed_at"),
    result_updated_at: parseIsoTimestamp(payload["result_updated_at"], "result_updated_at"),
  };

  const { data, error } = await supabase.rpc("apply_official_exam_result", {
    p_payload: normalizedPayload,
    p_answers: answers,
    p_payload_hash: payloadHash,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error("apply_official_exam_result RPC failed", { code: error.code });
    throw new ReceiverError("DATABASE_ERROR", "Official result transaction failed.", 500);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result["success"] !== true) {
    const status = Number(result["http_status"] ?? 500);
    return jsonResponse(
      {
        success: false,
        error_code: String(result["error_code"] ?? "DATABASE_ERROR"),
        message: String(result["message"] ?? "Official result transaction failed."),
      },
      Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500,
    );
  }

  return jsonResponse(result, 200);
}

async function handleLegacy(
  req: Request,
  rawBody: string,
  supabase: ReturnType<typeof createClient>,
) {
  const expectedSecret = Deno.env.get("EXAM_SYNC_SECRET");
  const providedSecret = req.headers.get("x-sync-secret") ?? "";
  if (!expectedSecret) {
    console.error("EXAM_SYNC_SECRET is not configured on this project.");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  if (!providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const sourceResultId = payload["source_result_id"] as string | undefined;
  const studentUsernameRaw = payload["student_username"] as string | undefined;
  if (!sourceResultId || !studentUsernameRaw) {
    return jsonResponse({ error: "source_result_id and student_username are required" }, 400);
  }
  const studentUsername = normalizeUsername(studentUsernameRaw);

  const logAttempt = async (success: boolean, errorMessage: string | null) => {
    try {
      const { error } = await supabase.from("exam_sync_attempts").insert({
        source_result_id: sourceResultId,
        student_username_raw: studentUsernameRaw,
        student_username_normalized: studentUsername,
        success,
        error_message: errorMessage,
      });
      if (error) console.error("Failed to write legacy result audit", { code: error.code });
    } catch {
      console.error("Failed to write legacy result audit");
    }
  };

  const { data: userId, error: lookupError } = await supabase.rpc("get_user_id_by_username", {
    p_istifadeci_adi: studentUsername,
  });
  if (lookupError) {
    await logAttempt(false, `lookup_error: ${lookupError.message}`);
    return jsonResponse({ error: "Database error while looking up student" }, 500);
  }
  if (!userId) {
    await logAttempt(false, "profile_not_found");
    return jsonResponse({ error: `Student with username "${studentUsernameRaw}" not found` }, 404);
  }

  // Never let a later legacy callback downgrade an already verified HMAC row.
  const { data: existing } = await supabase
    .from("exam_detailed_results")
    .select("sync_source")
    .eq("source_result_id", sourceResultId)
    .maybeSingle();
  if (existing?.sync_source === "official_hmac") {
    await logAttempt(true, "legacy_ignored_after_verified_hmac");
    return jsonResponse({ success: true, status: "verified_result_already_present" }, 200);
  }

  const toIsoOrNull = (value: unknown) => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  };

  const row = {
    source_result_id: sourceResultId,
    student_id: userId,
    student_username: studentUsername,
    exam_name: (payload["exam_name"] as string) ?? "",
    exam_type: (payload["exam_type"] as string) === "ticket" ? "ticket" : "test",
    total_questions: Number(payload["total_questions"]) || 0,
    correct_count: Number(payload["correct_count"]) || 0,
    wrong_count: Number(payload["wrong_count"]) || 0,
    unanswered_count: Number(payload["unanswered_count"]) || 0,
    percentage: Number(payload["percentage"]) || 0,
    current_score: Number(payload["current_score"]) || 0,
    semester_score_snapshot: Number(payload["semester_score_snapshot"]) || 0,
    total_score: Number(payload["total_score"]) || 0,
    answers_data: decodeAnswers(payload, false) as never,
    exam_started_at: toIsoOrNull(payload["exam_started_at"]),
    exam_completed_at: toIsoOrNull(payload["exam_completed_at"]) ?? new Date().toISOString(),
    synced_at: new Date().toISOString(),
    sync_source: "legacy",
  };

  const { error: upsertError } = await supabase
    .from("exam_detailed_results")
    .upsert(row, { onConflict: "source_result_id" });
  if (upsertError) {
    await logAttempt(false, `upsert_error: ${upsertError.message}`);
    return jsonResponse({ error: "Failed to save exam result" }, 500);
  }

  await logAttempt(true, null);
  return jsonResponse({ success: true, status: "legacy_detailed_result_synced" }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase Edge runtime is incomplete.");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rawBody = await req.text();
  const hasHmacHeaders = Boolean(
    req.headers.get("x-atu-signature") ||
      req.headers.get("x-atu-integration-version") ||
      req.headers.get("x-atu-timestamp") ||
      req.headers.get("x-atu-idempotency-key"),
  );

  try {
    if (hasHmacHeaders) return await handleOfficialHmac(req, rawBody, supabase);
    return await handleLegacy(req, rawBody, supabase);
  } catch (caught) {
    const error = caught instanceof ReceiverError
      ? caught
      : new ReceiverError("INTERNAL_ERROR", "Unexpected result receiver failure.", 500);
    // Never log request bodies, HMAC signatures, signed URLs, answers or secrets.
    console.error("receive-exam-result failed", { code: error.code });
    return jsonResponse(
      { success: false, error_code: error.code, message: error.message },
      error.status,
    );
  }
});