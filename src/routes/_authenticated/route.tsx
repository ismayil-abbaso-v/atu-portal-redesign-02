import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { useActivityLogger } from "@/hooks/use-activity-logger";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useLegacyPageI18nBridge } from "@/lib/legacy-page-i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    if (location.pathname === "/admin/qruplar") {
      throw redirect({ to: "/qruplar" });
    }
    if (location.pathname.startsWith("/admin/qruplar/")) {
      const groupId = location.pathname.slice("/admin/qruplar/".length);
      if (groupId) throw redirect({ to: "/qruplar/$groupId", params: { groupId } });
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function pageKeyForPath(pathname: string) {
  if (pathname === "/ev") return "page.home";
  if (pathname.startsWith("/teqvim")) return "page.calendar";
  if (pathname.startsWith("/imtahanlar")) return "page.exams";
  if (pathname.startsWith("/sohbet")) return "page.chat";
  if (pathname.startsWith("/kitabxana")) return "page.library";
  if (pathname.startsWith("/ofis")) return "page.office";
  if (pathname.startsWith("/bildirisler")) return "page.notifications";
  if (pathname.startsWith("/menyu/profil")) return "page.profileSettings";
  if (pathname.startsWith("/menyu/tehlukesizlik")) return "page.security";
  if (pathname.startsWith("/menyu/bildiris")) return "page.notificationSettings";
  if (pathname.startsWith("/menyu/gorunus")) return "page.appearance";
  if (pathname.startsWith("/menyu/transkript")) return "page.transcript";
  if (pathname.startsWith("/menyu/yardim")) return "page.help";
  if (pathname.startsWith("/menyu")) return "page.menu";
  if (pathname.startsWith("/qruplar")) return "page.groups";
  if (pathname.startsWith("/fakulte-icmali")) return "page.facultyOverview";
  if (pathname.startsWith("/admin")) return "page.admin";
  return null;
}

function AuthenticatedLayout() {
  useActivityLogger();
  const { locale, t } = useI18n();
  const [ad, setAd] = useState(() => t("nav.profile"));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarAcıq, setSidebarAcıq] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useLegacyPageI18nBridge(pathname);

  const genericPageKey = useMemo(() => pageKeyForPath(pathname), [pathname]);

  useEffect(() => {
    if (!genericPageKey) return;
    const pageTitle = t(genericPageKey);
    const appName = t("app.name");
    const description = t("app.subtitle");
    document.title = `${pageTitle} — ${appName}`;

    let descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = description;

    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = `${pageTitle} — ${appName}`;

    let ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      document.head.appendChild(ogDescription);
    }
    ogDescription.content = description;
  }, [genericPageKey, locale, t]);

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const resetScroll = () => {
      const scrollContainer = contentScrollRef.current;

      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        scrollContainer.scrollLeft = 0;
        scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    let aktiv = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("ad, soyad, avatar_url")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!aktiv) return;
      const tam = [data?.ad, data?.soyad].filter(Boolean).join(" ");
      setAd(tam || (userData.user.email ?? t("nav.profile")));
      setAvatarUrl(data?.avatar_url ?? null);
    })();
    return () => {
      aktiv = false;
    };
  }, [locale, t]);

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-clip bg-background md:h-dvh md:min-h-0 md:overflow-hidden">
      <style>{`
        @media (max-width: 767px) {
          header.sticky.top-0 {
            position: fixed !important;
            inset-inline: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 50 !important;
          }

          main {
            padding-top: 5.75rem !important;
            padding-bottom: max(6rem, calc(4.5rem + env(safe-area-inset-bottom))) !important;
            overflow-x: clip !important;
          }

          main input,
          main textarea,
          main select,
          main button {
            scroll-margin-block-end: 9rem;
          }

          main .sticky.bottom-0 {
            padding-bottom: max(.625rem, env(safe-area-inset-bottom)) !important;
          }
        }

        @media (min-width: 640px) and (max-width: 767px) {
          main {
            padding-top: 6.25rem !important;
          }
        }

        @media (min-width: 768px) {
          html,
          body,
          #root {
            height: 100% !important;
            overflow: hidden !important;
          }

          aside.sticky.top-4 {
            position: fixed !important;
            left: 1.25rem !important;
            top: 1rem !important;
            height: calc(100dvh - 2rem) !important;
            margin-left: 0 !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          main *,
          main *::before,
          main *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <Sidebar istifadeciAdi={ad} avatarUrl={avatarUrl} acıq={sidebarAcıq} setAcıq={setSidebarAcıq} />
      <div
        ref={contentScrollRef}
        className={`min-w-0 flex-1 overflow-x-clip transition-[margin-left] duration-300 ease-in-out md:h-dvh md:overflow-y-auto md:overscroll-contain ${sidebarAcıq ? "md:ml-[255px]" : "md:ml-[104px]"}`}
      >
        <AppHeader name={ad} avatarUrl={avatarUrl} mobileMenuOpen={sidebarAcıq} onMenuClick={() => setSidebarAcıq((v) => !v)} />
        <main className="min-w-0 overflow-x-clip px-3 pb-24 pt-4 sm:px-5 sm:pt-5 md:pb-8 lg:px-7">
          <div className="mx-auto min-w-0 w-full max-w-[1600px]"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
