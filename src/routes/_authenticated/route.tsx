import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { useActivityLogger } from "@/hooks/use-activity-logger";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useLegacyPageI18nBridge } from "@/lib/legacy-page-i18n";
import "@/role-workspace-redesign.css";

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
  const roleWorkspaceClass = useMemo(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return "role-workspace-page role-workspace-admin";
    if (pathname === "/qruplar" || pathname.startsWith("/qruplar/")) return "role-workspace-page role-workspace-groups";
    if (pathname === "/fakulte-icmali") return "role-workspace-page role-workspace-faculty";
    if (pathname.startsWith("/fennler/")) return "role-workspace-page role-workspace-course";
    if (pathname.startsWith("/muellim/")) return "role-workspace-page role-workspace-teacher";
    if (pathname === "/tyutor-paneli" || pathname.startsWith("/tyutor/")) return "role-workspace-page role-workspace-tutor";
    if (pathname === "/elanlar") return "role-workspace-page role-workspace-announcements";
    return "";
  }, [pathname]);

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
    <div className="portal-app-shell">
      <Sidebar
        istifadeciAdi={ad}
        avatarUrl={avatarUrl}
        acıq={sidebarAcıq}
        setAcıq={setSidebarAcıq}
      />
      <div ref={contentScrollRef} className="portal-content-scroll">
        <AppHeader
          name={ad}
          avatarUrl={avatarUrl}
          mobileMenuOpen={sidebarAcıq}
          onMenuClick={() => setSidebarAcıq((v) => !v)}
        />
        <main className="portal-main">
          <div className="portal-main-inner">
            {roleWorkspaceClass ? (
              <div className={roleWorkspaceClass}>
                <Outlet />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
