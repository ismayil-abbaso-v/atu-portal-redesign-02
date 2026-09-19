// Legacy/server login endpoint. Bütün password login-ləri canlı Supabase Edge Function-a
// proxy edilir ki, DB əsaslı 10-cəhd / 1-saat brute-force guard-dan yan keçmək mümkün olmasın.

import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/auth-username-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, code: "INVALID_REQUEST", error: "Yanlış sorğu." }, 400);
        }

        const rawIdentifier =
          typeof body["identifier"] === "string"
            ? body["identifier"]
            : typeof body["istifadeci_adi"] === "string"
              ? body["istifadeci_adi"]
              : "";
        const identifier = rawIdentifier.trim();
        const password = typeof body["password"] === "string" ? body["password"] : "";

        if (!identifier || identifier.length > 255 || !password || password.length > 1024) {
          return json({ ok: false, code: "INVALID_REQUEST", error: "Yanlış sorğu." }, 400);
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const anonKey =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!supabaseUrl || !anonKey) {
          console.error(
            "[auth-username-login proxy] SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY mühit dəyişəni çatışmır",
          );
          return json(
            { ok: false, code: "SERVER_ERROR", error: "Server konfiqurasiya xətası." },
            500,
          );
        }

        try {
          const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/auth-username-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
            },
            body: JSON.stringify({ identifier, password }),
          });

          const responseBody = await edgeResponse.text();
          return new Response(responseBody, {
            status: edgeResponse.status,
            headers: {
              "Content-Type": edgeResponse.headers.get("Content-Type") ?? "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("[auth-username-login proxy] Edge Function əlçatmazdır:", error);
          return json(
            { ok: false, code: "SERVER_ERROR", error: "Giriş müvəqqəti əlçatan deyil." },
            503,
          );
        }
      },
    },
  },
});
