// Fallback/alternate public result callback route.
//
// The canonical implementation is the Supabase Edge Function
// `receive-exam-result`. To prevent auth/mapping drift, this server route keeps
// the raw request body byte-for-byte and forwards the legacy/HMAC headers to the
// canonical endpoint instead of reimplementing result sync logic.

import { createFileRoute } from "@tanstack/react-router";

const CANONICAL_RECEIVER =
  "https://tdxrpbrcgricqqfdytyg.supabase.co/functions/v1/receive-exam-result";

const forwardedHeaders = [
  "content-type",
  "x-sync-secret",
  "x-atu-integration-version",
  "x-atu-timestamp",
  "x-atu-idempotency-key",
  "x-atu-signature",
] as const;

export const Route = createFileRoute("/api/public/receive-exam-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const headers = new Headers();
        for (const name of forwardedHeaders) {
          const value = request.headers.get(name);
          if (value) headers.set(name, value);
        }
        if (!headers.has("content-type")) headers.set("content-type", "application/json");

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        try {
          const response = await fetch(CANONICAL_RECEIVER, {
            method: "POST",
            headers,
            body: rawBody,
            signal: controller.signal,
            redirect: "error",
          });
          return new Response(await response.text(), {
            status: response.status,
            headers: {
              "content-type": response.headers.get("content-type") ?? "application/json",
              "cache-control": "no-store",
            },
          });
        } catch {
          return new Response(
            JSON.stringify({ success: false, error_code: "UPSTREAM_UNAVAILABLE" }),
            {
              status: 502,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            },
          );
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
