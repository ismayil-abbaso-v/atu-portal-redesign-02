import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import appCss from "../styles.css?url";
import darkThemeCss from "../dark-theme.css?url";
import academicBlueCss from "../academic-blue.css?url";
import academicBluePolishCss from "../academic-blue-polish.css?url";
import dashboardNetworkTreeCss from "../dashboard-network-tree.css?url";
import profileDataVisibilityCss from "../profile-data-visibility.css?url";
import groupsPremiumCss from "../groups-premium.css?url";
import adminPremiumCss from "../admin-premium.css?url";
import announcementEditorPerformanceCss from "../announcement-editor-performance.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

/*
 * Root-level TanStack Router fallbacks are rendered outside RootComponent.
 * RootComponent owns I18nProvider, so these fallbacks MUST NOT call useI18n().
 * Otherwise the real route/render error gets masked by the secondary
 * "useI18n I18nProvider daxilində istifadə olunmalıdır" exception.
 */
function NotFoundComponent() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Səhifə tapılmadı</h2><p className="mt-2 text-sm text-muted-foreground">Axtardığınız səhifə mövcud deyil və ya başqa ünvana köçürülüb.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Ana səhifəyə keç</Link></div></div></div>;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">Səhifə yüklənmədi</h1><p className="mt-2 text-sm text-muted-foreground">Nəsə səhv oldu. Səhifəni yenidən yükləyə və ya ana səhifəyə qayıda bilərsiniz.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Yenidən cəhd et</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Ana səhifəyə keç</a></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover" },
      { title: "ATU Şəxsi Kabinet" },
      { name: "description", content: "Azərbaycan Texnologiya Universitetinin tələbə və müəllim şəxsi kabineti." },
      { name: "author", content: "Azərbaycan Texnologiya Universiteti" },
      { property: "og:title", content: "ATU Şəxsi Kabinet" },
      { property: "og:description", content: "Qiymətlər, davamiyyət, təqvim, kitabxana və sənədlər bir yerdə." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#990232" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "ATU Kabinet" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: darkThemeCss },
      { rel: "stylesheet", href: academicBlueCss },
      { rel: "stylesheet", href: academicBluePolishCss },
      { rel: "stylesheet", href: dashboardNetworkTreeCss },
      { rel: "stylesheet", href: profileDataVisibilityCss },
      { rel: "stylesheet", href: groupsPremiumCss },
      { rel: "stylesheet", href: adminPremiumCss },
      { rel: "stylesheet", href: announcementEditorPerformanceCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="az"><head><HeadContent /><style>{`
    html, body {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      margin: 0;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    @media (max-width: 767px) {
      aside.absolute.inset-y-0.left-0 { width: min(82vw, 300px) !important; }
      body { min-width: 0 !important; }
      body > * { max-width: 100vw; }
      .relative.col-span-1.whitespace-nowrap { white-space: normal !important; }
    }
  `}</style></head><body>{children}<Scripts /></body></html>;
}

type ATUWidgetApi = { init: () => void };
type WindowWithATUWidget = Window & { ATUWidget?: ATUWidgetApi };

function AtuBotWidget() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (pathname === "/") return;
    const scriptId = "atu-bot-widget-script";
    const existing = document.getElementById(scriptId);
    const init = () => { const widget = (window as WindowWithATUWidget).ATUWidget; if (widget) widget.init(); };
    if (existing) { init(); return; }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://ihp.atu.edu.az/embed/atu-widget.js";
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [pathname]);
  useEffect(() => {
    if (pathname !== "/") return;
    document.querySelectorAll("#atu-widget, .atu-widget, [id^='atu-widget'], [class*='atu-widget']").forEach((element) => element.remove());
  }, [pathname]);
  return null;
}

function QueryCacheAuthGuard({ queryClient }: { queryClient: QueryClient }) {
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      const previous = previousUserId.current;
      if (previous !== undefined && previous !== nextUserId) queryClient.clear();
      previousUserId.current = nextUserId;
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => console.warn("PWA service worker qeydiyyatı alınmadı:", error));
  }, []);
  return <QueryClientProvider client={queryClient}><QueryCacheAuthGuard queryClient={queryClient} /><I18nProvider><ThemeProvider><Outlet /><Toaster position="top-right" /><PwaInstallPrompt /><AtuBotWidget /></ThemeProvider></I18nProvider></QueryClientProvider>;
}
