import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  PenLine,
  Shield,
  User,
  Users2,
  X,
} from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";

import atuLogo from "@/assets/atu-logo-cropped.svg";
import { SignedAvatarImg } from "@/components/common/SignedAvatar";
import { useNotifications } from "@/hooks/use-notifications";
import { usePrimaryRole, useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { journalTranslate } from "@/lib/electronic-journal-i18n";
import { useI18n } from "@/lib/i18n";
import { roleCabinetLabel, tutorPanelTranslate } from "@/lib/tutor-panel-i18n";
import { cn } from "@/lib/utils";

const olculer = {
  "--sb-icon": "clamp(2.25rem, 5vh, 3rem)",
  "--sb-icon-svg": "clamp(1.3rem, 2.9vh, 1.65rem)",
  "--sb-logo": "clamp(3rem, 5.8vh, 3.75rem)",
  "--sb-text": "clamp(0.8125rem, 1.8vh, 1rem)",
  "--sb-row-gap": "clamp(0.125rem, 0.9vh, 0.75rem)",
  "--sb-section-gap": "clamp(0.375rem, 1.4vh, 1rem)",
  "--sb-pad-y": "clamp(0.5rem, 1.8vh, 1.5rem)",
  "--sb-header-mb": "clamp(0.5rem, 1.8vh, 2rem)",
  "--sb-menu-mb": "clamp(0.375rem, 1.3vh, 1.25rem)",
  "--sb-avatar": "clamp(1.9rem, 3.8vh, 2.65rem)",
} as CSSProperties;

type NavItem = { to: string; labelKey: string; icon: typeof Home };

const ustBolme: NavItem[] = [
  { to: "/ev", labelKey: "nav.home", icon: Home },
  { to: "/elektron-jurnal", labelKey: "nav.ejournal", icon: BookOpenCheck },
  { to: "/teqvim", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/imtahanlar", labelKey: "nav.exams", icon: PenLine },
];
const ortaBolme: NavItem[] = [
  { to: "/sohbet", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/kitabxana", labelKey: "nav.library", icon: BookMarked },
  { to: "/ofis", labelKey: "nav.office", icon: PanelsTopLeft },
];
const altBolme: NavItem[] = [
  { to: "/bildirisler", labelKey: "nav.notifications", icon: Bell },
  { to: "/menyu", labelKey: "nav.profile", icon: User },
];

function BildirisIkonu({ item, unreadCount }: { item: NavItem; unreadCount: number }) {
  if (item.to !== "/bildirisler" || unreadCount <= 0) return <item.icon className="size-[var(--sb-icon-svg)] shrink-0" />;
  return (
    <span className="relative inline-flex shrink-0">
      <item.icon className="size-[var(--sb-icon-svg)]" />
      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground animate-badge-in">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    </span>
  );
}

function PanelEtiketi({ acıq, children }: { acıq: boolean; children: ReactNode }) {
  return (
    <span className={cn("pointer-events-none absolute left-[var(--sb-label-left)] top-0 flex h-[var(--sb-icon)] min-w-0 items-center overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out", acıq ? "max-w-[170px] opacity-100" : "max-w-0 opacity-0")}>
      <span className="block truncate pl-2 text-[length:var(--sb-text)] font-semibold leading-none">{children}</span>
    </span>
  );
}

function IkonQutusu({ children }: { children: ReactNode }) {
  return <span className="absolute left-[var(--sb-icon-left)] top-0 flex size-[var(--sb-icon)] shrink-0 items-center justify-center">{children}</span>;
}

export function Sidebar({ istifadeciAdi, avatarUrl, acıq, setAcıq }: { istifadeciAdi: string; avatarUrl?: string | null; acıq: boolean; setAcıq: Dispatch<SetStateAction<boolean>> }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { roles } = useUserRoles();
  const { primaryRole } = usePrimaryRole();
  const { unreadCount } = useNotifications();
  const { t, locale } = useI18n();

  const hasAdmin = roles.includes("admin");
  const hasDekan = roles.includes("dekan");
  const primaryTutor = primaryRole === "tyutor";
  const cabinetLabel = roleCabinetLabel(locale, primaryRole);

  const dinamikUstBolme = [...ustBolme];
  if (primaryTutor) dinamikUstBolme.splice(1, 0, { to: "/tyutor-paneli", labelKey: "tutor.panel", icon: LayoutDashboard });

  const dinamikOrtaBolme = [...ortaBolme];
  if (hasDekan) dinamikOrtaBolme.push({ to: "/fakulte-icmali", labelKey: "nav.facultyOverview", icon: BarChart3 });
  if (hasAdmin || hasDekan || primaryTutor) dinamikOrtaBolme.push({ to: "/qruplar", labelKey: "nav.groups", icon: Users2 });

  const dinamikAltBolme = [...altBolme];
  if (hasAdmin) {
    const profileIndex = dinamikAltBolme.findIndex((item) => item.to === "/menyu");
    const adminItem = { to: "/admin", labelKey: "nav.admin", icon: Shield };
    if (profileIndex >= 0) dinamikAltBolme.splice(profileIndex, 0, adminItem);
    else dinamikAltBolme.push(adminItem);
  }

  useEffect(() => {
    if (!acıq || !window.matchMedia("(max-width: 767px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setAcıq(false); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [acıq, setAcıq]);

  async function cıxıs() {
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  const getLabel = (item: NavItem) => {
    if (item.to === "/elektron-jurnal") return journalTranslate(locale, "page.title");
    if (item.to === "/tyutor-paneli") return tutorPanelTranslate(locale, "header.title");
    return t(item.labelKey);
  };

  const link = (item: NavItem) => {
    const aktiv = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const label = getLabel(item);
    return (
      <Link key={item.to} to={item.to} title={label} className={cn("group relative flex h-[var(--sb-icon)] w-full shrink-0 items-center overflow-hidden rounded-full text-muted-foreground transition-[background-color,color,box-shadow] duration-200 ease-out", aktiv ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground")}>
        <IkonQutusu><BildirisIkonu item={item} unreadCount={unreadCount} /></IkonQutusu>
        <PanelEtiketi acıq={acıq}>{label}</PanelEtiketi>
      </Link>
    );
  };

  const drawerLink = (item: NavItem) => {
    const aktiv = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const label = getLabel(item);
    return (
      <Link key={`${item.to}-${label}`} to={item.to} onClick={() => setAcıq(false)} className={cn("group flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold transition-[background-color,color,transform] duration-200 ease-out active:scale-[.985]", aktiv ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent hover:text-accent-foreground")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-current/10"><BildirisIkonu item={item} unreadCount={unreadCount} /></span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className={cn("size-1.5 rounded-full bg-primary transition-all", aktiv ? "scale-100 opacity-100" : "scale-0 opacity-0")} />
      </Link>
    );
  };

  const desktopProfile = (
    <Link to="/menyu" title={istifadeciAdi} className={cn("group relative flex h-[var(--sb-icon)] w-full shrink-0 items-center overflow-hidden rounded-full transition-[background-color,color] duration-200 ease-out", pathname.startsWith("/menyu") ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground")}>
      <IkonQutusu>
        <span className="flex size-[var(--sb-avatar)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {avatarUrl ? <SignedAvatarImg src={avatarUrl} alt={istifadeciAdi || t("nav.profile")} className="size-full object-cover" /> : <User className="size-[var(--sb-icon-svg)]" />}
        </span>
      </IkonQutusu>
      <PanelEtiketi acıq={acıq}>{istifadeciAdi}</PanelEtiketi>
    </Link>
  );

  return (
    <>
      <aside
        style={{ ...olculer, "--sb-icon-left": "10px", "--sb-logo-left": "calc((var(--sb-icon) + 20px - var(--sb-logo)) / 2)", "--sb-label-left": "58px" } as CSSProperties}
        className={cn("sticky top-4 z-20 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-sidebar to-background px-2 py-[var(--sb-pad-y)] shadow-[8px_0_30px_rgb(61_15_28/0.035)] transition-[width] duration-300 ease-in-out md:ml-5 md:flex", acıq ? "w-[235px]" : "w-[calc(var(--sb-icon)+36px)]")}
      >
        <Link to="/ev" aria-label={`${t("app.name")} — ${t("nav.home")}`} className="relative mb-[var(--sb-header-mb)] flex h-[calc(var(--sb-logo)+6px)] w-full shrink-0 items-center overflow-visible border-b border-border/70 pb-[var(--sb-section-gap)]">
          <span className="absolute left-[var(--sb-logo-left)] top-0 -translate-y-1 flex size-[var(--sb-logo)] shrink-0 items-center justify-center rounded-full bg-primary p-2 shadow-sm"><img src={atuLogo} alt="ATU" className="size-full object-contain" /></span>
          <span className={cn("pointer-events-none absolute left-[calc(var(--sb-logo)+0.75rem)] top-0 flex h-[var(--sb-logo)] min-w-0 items-center overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out", acıq ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0")}>
            <span className="flex flex-col leading-[1.05]"><span className="block truncate font-display text-base font-bold tracking-[-0.02em] text-primary">{t("app.name")}</span><span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{cabinetLabel}</span></span>
          </span>
        </Link>

        <button type="button" aria-label={t("nav.menu")} onClick={() => setAcıq((value) => !value)} className="relative mb-[var(--sb-menu-mb)] flex h-[var(--sb-icon)] w-full shrink-0 items-center overflow-hidden rounded-full text-muted-foreground transition-[background-color,color] duration-200 ease-out hover:bg-accent hover:text-accent-foreground active:scale-[.985]">
          <IkonQutusu><Menu className="size-[var(--sb-icon-svg)]" /></IkonQutusu><PanelEtiketi acıq={acıq}>{t("nav.menu")}</PanelEtiketi>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none]">
          <nav className="flex w-full flex-col items-stretch gap-[var(--sb-row-gap)]">{dinamikUstBolme.map(link)}</nav>
          <hr className="my-[var(--sb-section-gap)] w-full border-border/70" />
          <nav className="flex w-full flex-col items-stretch gap-[var(--sb-row-gap)]">{dinamikOrtaBolme.map(link)}</nav>
        </div>

        <div className="shrink-0 pt-[var(--sb-section-gap)]">
          <hr className="mb-[var(--sb-section-gap)] w-full border-border/70" />
          <nav className="flex w-full flex-col items-stretch gap-[var(--sb-row-gap)]">
            {dinamikAltBolme.map((item) => item.to === "/menyu" ? <span key={item.to}>{desktopProfile}</span> : link(item))}
            <button type="button" onClick={cıxıs} title={t("nav.logout")} className="relative flex h-[var(--sb-icon)] w-full shrink-0 items-center overflow-hidden rounded-full text-muted-foreground transition-[background-color,color] duration-200 ease-out hover:bg-destructive/10 hover:text-destructive active:scale-[.985]"><IkonQutusu><LogOut className="size-[var(--sb-icon-svg)]" /></IkonQutusu><PanelEtiketi acıq={acıq}>{t("nav.logout")}</PanelEtiketi></button>
          </nav>
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 hidden text-primary/35"><GraduationCap className="size-12" /></div>
      </aside>

      <div className={cn("fixed inset-0 z-[9998] md:hidden", acıq ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!acıq}>
        <button type="button" aria-label={t("common.back")} onClick={() => setAcıq(false)} className={cn("absolute inset-0 bg-foreground/35 backdrop-blur-[6px] transition-opacity duration-300 ease-out", acıq ? "opacity-100" : "opacity-0")} />
        <aside className={cn("absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-border/80 bg-background shadow-[24px_0_70px_rgb(35_9_18/0.18)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", acıq ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border/70 px-3">
            <Link to="/ev" onClick={() => setAcıq(false)} className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary p-1.5 shadow-sm"><img src={atuLogo} alt="ATU" className="size-full object-contain" /></span>
              <span className="min-w-0"><span className="block truncate font-display text-[15px] font-bold tracking-[-0.02em] text-primary">{t("app.name")}</span><span className="block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{cabinetLabel}</span></span>
            </Link>
            <button type="button" aria-label={t("common.back")} onClick={() => setAcıq(false)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-[background-color,color,transform] duration-200 hover:bg-accent hover:text-primary active:scale-95"><X className="size-[18px]" /></button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <nav className="space-y-1">{dinamikUstBolme.map(drawerLink)}</nav>
            <div className="my-3 h-px bg-border/70" />
            <nav className="space-y-1">{dinamikOrtaBolme.map(drawerLink)}</nav>
            <div className="my-3 h-px bg-border/70" />
            <nav className="space-y-1">{dinamikAltBolme.map(drawerLink)}</nav>
          </div>

          <div className="shrink-0 border-t border-border/70 p-3">
            <Link to="/menyu" onClick={() => setAcıq(false)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-muted/45 px-3 py-2">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">{avatarUrl ? <SignedAvatarImg src={avatarUrl} alt={istifadeciAdi} className="size-full object-cover" /> : <User className="size-5" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{istifadeciAdi}</span><span className="block truncate text-[11px] font-semibold text-muted-foreground">{cabinetLabel}</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <button type="button" onClick={cıxıs} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"><LogOut className="size-4" />{t("nav.logout")}</button>
          </div>
        </aside>
      </div>
    </>
  );
}
