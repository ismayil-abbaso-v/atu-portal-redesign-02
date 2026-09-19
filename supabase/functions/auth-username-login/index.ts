import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const GENERIC_ERROR = "İstifadəçi adı və ya şifrə yanlışdır.";

type GuardResult = {
  allowed?: boolean;
  code?: string;
  email?: string | null;
  remaining_attempts?: number;
  locked_until?: string | null;
  processed?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    console.error("[auth-username-login] Supabase server konfiqurasiyası çatışmır");
    return json({ ok: false, code: "SERVER_ERROR", error: "Server konfiqurasiya xətası." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "INVALID_REQUEST", error: "Yanlış sorğu." }, 400);
  }

  const rawIdentifier =
    typeof body.identifier === "string"
      ? body.identifier
      : typeof body.istifadeci_adi === "string"
        ? body.istifadeci_adi
        : "";
  const identifier = rawIdentifier.trim();
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || identifier.length > 255 || !password || password.length > 1024) {
    return json({ ok: false, code: "INVALID_REQUEST", error: "Yanlış sorğu." }, 400);
  }

  // Guard RPC-ləri həmişə service_role səlahiyyəti ilə işləməlidir. Password login
  // uğurlu olduqda supabase-js həmin client instansiyasına istifadəçi sessiyasını
  // yazır. Eyni client istifadə edilərsə sonrakı guard RPC-si authenticated roluna
  // düşür. Buna görə guard və auth üçün iki izolə edilmiş client saxlayırıq.
  const guardAdmin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const authClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const attemptId = crypto.randomUUID();

  const { data: beginData, error: beginError } = await guardAdmin.rpc("login_guard_begin", {
    p_identifier: identifier,
    p_attempt_id: attemptId,
  });
  if (beginError) {
    console.error("[auth-username-login] login_guard_begin:", beginError.message);
    return json({ ok: false, code: "SERVER_ERROR", error: "Giriş müvəqqəti əlçatan deyil." }, 503);
  }

  const begin = (beginData ?? {}) as GuardResult;
  if (!begin.allowed) {
    if (begin.code === "ACCOUNT_LOCKED") {
      return json({
        ok: false,
        code: "ACCOUNT_LOCKED",
        error: "Hesab müvəqqəti kilidləndi.",
        remaining_attempts: 0,
        locked_until: begin.locked_until ?? null,
      });
    }
    if (begin.code === "TRY_AGAIN") {
      return json({
        ok: false,
        code: "TRY_AGAIN",
        error: "Sorğu emal olunur. Bir neçə saniyə sonra yenidən yoxlayın.",
        remaining_attempts: begin.remaining_attempts ?? null,
      });
    }
    return json({ ok: false, code: "INVALID_REQUEST", error: "Yanlış sorğu." }, 400);
  }

  // Naməlum identifier üçün də Auth serverinə sorğu göndərilir ki, cavab vaxtı
  // hesabın mövcudluğu barədə əlavə siqnal verməsin. Brauzerə e-poçt qaytarılmır.
  const authEmail = begin.email || `unknown-${attemptId}@invalid.local`;
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (authError || !authData.session) {
    let finalData: GuardResult | null = null;
    let finalError: { message?: string } | null = null;

    for (let retry = 0; retry < 2; retry += 1) {
      const result = await guardAdmin.rpc("login_guard_failure", { p_attempt_id: attemptId });
      finalData = (result.data ?? null) as GuardResult | null;
      finalError = result.error;
      if (!result.error) break;
    }

    if (finalError) {
      console.error("[auth-username-login] login_guard_failure:", finalError.message);
      return json({ ok: false, code: "SERVER_ERROR", error: "Giriş müvəqqəti əlçatan deyil." }, 503);
    }

    const finalized = finalData ?? {};
    if (finalized.code === "ACCOUNT_LOCKED") {
      return json({
        ok: false,
        code: "ACCOUNT_LOCKED",
        error: "Hesab müvəqqəti kilidləndi.",
        remaining_attempts: 0,
        locked_until: finalized.locked_until ?? null,
      });
    }

    return json({
      ok: false,
      code: "INVALID_CREDENTIALS",
      error: GENERIC_ERROR,
      remaining_attempts:
        typeof finalized.remaining_attempts === "number" ? finalized.remaining_attempts : null,
      locked_until: null,
    });
  }

  let resetError: { message?: string } | null = null;
  for (let retry = 0; retry < 2; retry += 1) {
    const result = await guardAdmin.rpc("login_guard_success", {
      p_attempt_id: attemptId,
      p_identifier: identifier,
    });
    resetError = result.error;
    if (!result.error) break;
  }

  if (resetError) {
    console.error("[auth-username-login] login_guard_success:", resetError.message);
    await authClient.auth.signOut().catch(() => undefined);
    return json({ ok: false, code: "SERVER_ERROR", error: "Giriş müvəqqəti əlçatan deyil." }, 503);
  }

  return json({
    ok: true,
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    remaining_attempts: 10,
  });
});
