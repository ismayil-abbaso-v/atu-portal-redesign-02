import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server misconfigured" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: claims, error: claimsError } = await admin.auth.getClaims(auth.slice(7));
  const adminId = claims?.claims?.sub;
  if (claimsError || !adminId) return json({ error: "Unauthorized" }, 401);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "İcazə yoxdur." }, 403);
  let body: { user_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const userId = body.user_id?.trim();
  if (!userId) return json({ error: "user_id tələb olunur." }, 400);
  if (userId === adminId) return json({ error: "Admin öz hesabını silə bilməz." }, 400);

  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) return json({ error: "İstifadəçi tapılmadı." }, 404);

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (userData?.user) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ugurlu: true });
  }

  // Orphan profile: Auth hesabı artıq silinib, amma profil admin siyahısında qalıb.
  await admin.from("group_members").delete().eq("user_id", userId);
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error: profileDeleteError } = await admin.from("profiles").delete().eq("user_id", userId);
  if (profileDeleteError) return json({ error: profileDeleteError.message }, 500);
  return json({ ugurlu: true, orphan_profile: true });
});
