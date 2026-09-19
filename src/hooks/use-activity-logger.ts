import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

type ActivityDetails = Record<string, unknown>;

function getSessionId() {
  if (typeof window === "undefined") return null;
  const key = "atu-current-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function getCihaz(ua: string) {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android cihazı";
  if (/Windows/i.test(ua)) return "Windows cihazı";
  if (/Mac OS X/i.test(ua)) return "Mac";
  return "Naməlum cihaz";
}

function getBrauzer(ua: string) {
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Chrome\//i.test(ua)) return "Google Chrome";
  if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Naməlum brauzer";
}

/** Cari autentifikasiya kontekstindən fəaliyyət qeydi yaradır. */
export async function logActivity(
  emeliyyat: string,
  etrafli: ActivityDetails | null = null,
  explicitUserId?: string | null,
) {
  let userId = explicitUserId ?? null;
  if (!userId) {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id ?? null;
  }
  if (!userId) return false;

  const sessionId = getSessionId();
  const details: ActivityDetails = { ...(etrafli ?? {}) };
  if (sessionId) details.session_id = sessionId;

  const { error } = await (supabase as any).from("activity_logs").insert({
    user_id: userId,
    emeliyyat,
    etrafli: Object.keys(details).length ? details : null,
  });

  if (error) {
    console.warn("Fəaliyyət jurnala yazılmadı:", error.message);
    return false;
  }
  return true;
}

async function touchSession(userId: string) {
  if (typeof navigator === "undefined") return;
  const sessionId = getSessionId();
  if (!sessionId) return;
  const ua = navigator.userAgent;

  const { error } = await (supabase as any).from("sessions_log").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      cihaz: getCihaz(ua),
      brauzer: getBrauzer(ua),
      ip: null,
      seher: null,
      olke: null,
      son_aktivlik: new Date().toISOString(),
    },
    { onConflict: "user_id,session_id" },
  );

  if (error) console.warn("Sessiya aktivliyi yenilənmədi:", error.message);
}

async function ensureSessionStart(userId: string, route: string) {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const sessionId = getSessionId();
  if (!sessionId) return;

  const key = `atu-activity-session-started:${userId}:${sessionId}`;
  if (!sessionStorage.getItem(key)) {
    // Paralel INITIAL_SESSION / bootstrap callback-larında təkrar yazılmanı dayandırır.
    sessionStorage.setItem(key, "pending");
    const ua = navigator.userAgent;
    const yazildi = await logActivity(
      "giris_edildi",
      { route, cihaz: getCihaz(ua), brauzer: getBrauzer(ua) },
      userId,
    );
    if (yazildi) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  }

  await touchSession(userId);
}

/**
 * Authenticated hissədə real fəaliyyət jurnalını saxlayır:
 * - mövcud sessiyanı mount zamanı dərhal qeyd edir;
 * - hər route keçidini qeyd edir;
 * - sessions_log heartbeat-ni yeniləyir.
 */
export function useActivityLogger() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const userIdRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (disposed || error || !data.session?.user) return;
      const userId = data.session.user.id;
      userIdRef.current = userId;
      const route = window.location.pathname;
      await ensureSessionStart(userId, route);
      if (!disposed && route !== "/") {
        lastPathRef.current = route;
        await logActivity("sehife_acildi", { route }, userId);
      }
    };

    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) {
        userIdRef.current = userId;
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          void ensureSessionStart(userId, window.location.pathname);
        }
        if (event === "TOKEN_REFRESHED") void touchSession(userId);
      }
      if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        lastPathRef.current = null;
      }
    });

    const heartbeat = window.setInterval(() => {
      if (userIdRef.current) void touchSession(userIdRef.current);
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = userIdRef.current;
    if (!userId || pathname === "/" || lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    void Promise.all([
      logActivity("sehife_acildi", { route: pathname }, userId),
      touchSession(userId),
    ]);
  }, [pathname]);
}
