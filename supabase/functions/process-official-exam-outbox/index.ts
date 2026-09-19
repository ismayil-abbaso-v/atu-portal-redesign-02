import { createAdminClient, processOfficialOutboxEvent, verifyWorkerToken, type ClaimedEvent } from "./official-exam-sync.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ success: false, error_code: "METHOD_NOT_ALLOWED" }, 405);
  const db = createAdminClient();
  const validWorker = await verifyWorkerToken(db, request.headers.get("x-atu-worker-token"));
  if (!validWorker) return json({ success: false, error_code: "UNAUTHORIZED" }, 401);
  let limit = 5;
  try {
    const body = await request.json();
    if (body && Number.isFinite(Number(body.limit))) limit = Math.max(1, Math.min(20, Number(body.limit)));
  } catch {}
  const { data, error } = await db.rpc("claim_official_exam_outbox", { p_limit: limit });
  if (error) return json({ success: false, error_code: "DATABASE_ERROR" }, 500);
  const events = (data ?? []) as ClaimedEvent[];
  const results: Record<string, unknown>[] = [];
  for (const event of events) results.push(await processOfficialOutboxEvent(db, event));
  return json({ success: true, claimed: events.length, results });
});
