import {
  authorizeTeacherMaterialRetry,
  claimMaterialEventForManualRetry,
  createAdminClient,
  integrationErrorResponse,
  processOfficialOutboxEvent,
} from "./official-exam-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error_code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, error_code: "INVALID_BODY" }, 400);
    }
    const keys = Object.keys(body);
    if (
      keys.length !== 1 ||
      keys[0] !== "material_id" ||
      typeof body.material_id !== "string" ||
      !body.material_id.trim()
    ) {
      return json({ success: false, error_code: "MATERIAL_ID_ONLY" }, 400);
    }

    const db = createAdminClient();
    const materialId = body.material_id.trim();
    await authorizeTeacherMaterialRetry(db, request.headers.get("authorization"), materialId);
    const event = await claimMaterialEventForManualRetry(db, materialId);
    const result = await processOfficialOutboxEvent(db, event);
    return json(result, result.success === true ? 200 : result.status === "retry" ? 202 : 409);
  } catch (error) {
    const response = integrationErrorResponse(error);
    return json(response.body, response.status);
  }
});
