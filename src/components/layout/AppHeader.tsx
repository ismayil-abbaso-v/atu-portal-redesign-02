import {
  Bell,
  CheckCheck,
  ChevronRight,
  LogOut,
  Moon,
  Search,
  Sun,
  User,
  UserRound,
  X,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { SignedAvatarImg } from "@/components/common/SignedAvatar";
import { PortalSearch } from "@/components/portal/PortalPrimitives";
import atuLogo from "@/assets/atu-logo-cropped.svg";
import { usePrimaryRole } from "@/hooks/use-user-role";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { roleCabinetLabel } from "@/lib/tutor-panel-i18n";
import "@/notification-panel.css";

export function AppHeader({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { t, intlLocale, locale } = useI18n();
  const { primaryRole } = usePrimaryRole();
  const { mode, setMode } = useTheme();
  const roleLabel = roleCabinetLabel(locale, primaryRole);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const recent = notifications.slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!notificationRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [open]);

  useEffect(() => {
    setMobileSearchOpen(false);
    setOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeHeaderOverlays = () => {
      setMobileSearchOpen(false);
      setOpen(false);
      setProfileOpen(false);
    };

    window.addEventListener("portal:mobile-secondary-menu-open", closeHeaderOverlays);
    return () =>
      window.removeEventListener("portal:mobile-secondary-menu-open", closeHeaderOverlays);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen && !open && !profileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileSearchOpen(false);
      setOpen(false);
      setProfileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileSearchOpen, open, profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [profileOpen]);

  function bildirisAc(notification: (typeof notifications)[number]) {
    if (!notification.oxunub_mu) markAsRead.mutate(notification.id);
    const data = notification.elave_data;
    const metadata = data && typeof data === "object" && !Array.isArray(data) ? data : null;
    const route = metadata && typeof metadata["route"] === "string" ? metadata["route"] : null;
    const chatGroupId =
      metadata && typeof metadata["chat_group_id"] === "string"
        ? metadata["chat_group_id"]
        : metadata && typeof metadata["group_id"] === "string"
          ? metadata["group_id"]
          : null;

    if (route?.startsWith("/")) {
      setOpen(false);
      window.location.assign(route);
      return;
    }

    if (chatGroupId || notification.tip === "sosial") {
      if (chatGroupId) sessionStorage.setItem("atu-portal:notification-chat-group", chatGroupId);
      setOpen(false);
      window.location.assign("/sohbet");
      return;
    }

    setOpen(false);
    window.location.assign("/bildirisler");
  }

  async function cixisEt() {
    setProfileOpen(false);
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="portal-header">
      <div className="portal-header__inner">
        <div className="portal-header__leading flex min-w-0 items-center">
          <Link
            to="/ev"
            aria-label={t("app.name")}
            className="portal-header__mobile-brand flex min-w-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary p-1.5">
              <img src={atuLogo} alt="ATU" className="size-full object-contain" />
            </span>
            <span className="portal-mobile-brand-copy min-w-0">
              <span className="block truncate font-display text-lg font-semibold text-primary">
                {t("app.name")}
              </span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground">
                {roleLabel}
              </span>
            </span>
          </Link>
        </div>

        <PortalSearch
          className="portal-header__search"
          placeholder="Tələbə, fənn, sənəd və ya xidmət axtar..."
          aria-label={t("common.search")}
        />

        <div className="portal-header__actions flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={t("common.search")}
            aria-expanded={mobileSearchOpen}
            aria-controls="portal-mobile-search-panel"
            onClick={() => {
              setOpen(false);
              setProfileOpen(false);
              setMobileSearchOpen((value) => !value);
            }}
            className="portal-header__icon-button portal-mobile-search-toggle md:hidden"
          >
            {mobileSearchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <button
            type="button"
            aria-label={mode === "dark" ? "İşıqlı mövzu" : "Qaranlıq mövzu"}
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="portal-header__icon-button portal-header__desktop-action hidden md:inline-flex"
          >
            {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              aria-label={t("nav.notifications")}
              aria-expanded={open}
              aria-controls="portal-notification-panel"
              onClick={() => {
                setMobileSearchOpen(false);
                setProfileOpen(false);
                setOpen((v) => !v);
              }}
              className="portal-mobile-notification-button portal-header__notification-button relative inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-[background-color,color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-11"
            >
              <Bell className={open ? "size-5 text-primary" : "size-5"} />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-4 text-primary-foreground shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            <div
              id="portal-notification-panel"
              aria-hidden={!open}
              inert={!open}
              className={`${open ? "notification-panel--open pointer-events-auto opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-[0.985] -translate-y-1"} notification-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(24rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 transition-[opacity,transform] duration-200 ease-out`}
            >
              <span aria-hidden className="notification-panel__topline" />

              <div className="notification-panel__header flex items-center justify-between border-b border-border/70 px-4 py-3.5">
                <div className="notification-panel__header-copy">
                  <p className="font-display text-base font-semibold text-foreground">
                    {t("nav.notifications")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} ${t("header.unread")}` : t("header.allRead")}
                  </p>
                </div>

                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => markAllAsRead.mutate()}
                    className="notification-panel__mark-all inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                    title={t("header.markAllRead")}
                  >
                    <CheckCheck className="size-4" />
                    {t("header.markAllRead")}
                  </button>
                ) : null}
              </div>

              <div className="notification-panel__list max-h-[22rem] overflow-y-auto p-2">
                {isLoading ? (
                  <div className="space-y-2 py-1">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="notification-panel__skeleton rounded-xl p-3"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="flex gap-3">
                          <span className="notification-panel__skeleton-line mt-1 size-2.5 shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="notification-panel__skeleton-line h-3 w-2/3" />
                            <div className="notification-panel__skeleton-line h-2.5 w-full" />
                            <div className="notification-panel__skeleton-line h-2.5 w-4/5" />
                            <div className="notification-panel__skeleton-line h-2 w-1/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recent.length > 0 ? (
                  recent.map((notification, index) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => bildirisAc(notification)}
                      style={{ animationDelay: `${90 + index * 65}ms` }}
                      className={`notification-panel__item group flex w-full gap-3 rounded-xl p-3 text-left hover:bg-accent/70 ${notification.oxunub_mu ? "notification-panel__item--read opacity-70" : "bg-primary/[0.045]"}`}
                    >
                      <span className="notification-panel__dot mt-1.5 size-2 shrink-0 rounded-full bg-primary transition-transform group-hover:scale-125" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {notification.baslıq}
                        </span>
                        {notification.metin ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {notification.metin}
                          </span>
                        ) : null}
                        <span className="mt-1.5 block text-[10px] font-medium text-muted-foreground">
                          {notification.tarix
                            ? new Date(notification.tarix).toLocaleString(intlLocale, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : ""}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="notification-panel__empty flex h-40 flex-col items-center justify-center px-6 text-center">
                    <span className="notification-panel__empty-icon mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary/55">
                      <Bell className="size-6" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {t("header.noNotifications")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("header.newNotifications")}
                    </p>
                  </div>
                )}
              </div>

              <div className="notification-panel__footer border-t border-border/70 p-2">
                <Link
                  to="/bildirisler"
                  onClick={() => setOpen(false)}
                  className="notification-panel__footer-link flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {t("header.allNotifications")}
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              aria-label={t("nav.profile")}
              aria-expanded={profileOpen}
              aria-controls="portal-profile-panel"
              onClick={() => {
                setMobileSearchOpen(false);
                setOpen(false);
                setProfileOpen((v) => !v);
              }}
              className={`portal-mobile-profile-button portal-header__profile-button flex min-w-0 items-center gap-2 rounded-xl border bg-card px-2 py-1.5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3 ${profileOpen ? "border-primary/25 bg-accent shadow-[0_8px_24px_rgba(61,15,28,0.10)]" : "border-border"}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-[11px] font-bold text-primary-foreground sm:size-9 sm:text-xs">
                {avatarUrl ? (
                  <SignedAvatarImg
                    src={avatarUrl}
                    alt={name || t("nav.profile")}
                    className="size-full object-cover"
                  />
                ) : (
                  initials || <User className="size-4" />
                )}
              </span>
              <span className="hidden max-w-48 text-left md:block">
                <span className="block truncate text-sm font-semibold">{name}</span>
                <span className="block truncate text-[10px] font-semibold text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
              <ChevronRight
                className={`hidden size-4 text-muted-foreground transition-transform duration-200 sm:block ${profileOpen ? "rotate-90 text-primary" : ""}`}
              />
            </button>

            <div
              id="portal-profile-panel"
              aria-hidden={!profileOpen}
              inert={!profileOpen}
              className={
                profileOpen
                  ? "absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_rgba(61,15,28,0.16)] opacity-100 scale-100 translate-y-0 transition-[opacity,transform] duration-200 ease-out"
                  : "pointer-events-none absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_rgba(61,15,28,0.16)] opacity-0 scale-95 -translate-y-1 transition-[opacity,transform] duration-200 ease-out"
              }
            >
              <Link
                to="/menyu/profil"
                onClick={() => setProfileOpen(false)}
                className="group flex items-center gap-4 border-b border-border/70 px-5 py-4 transition-colors duration-200 hover:bg-accent/70"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <UserRound className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">
                    {t("header.myProfile")}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t("header.viewPersonalData")}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>

              <button
                type="button"
                onClick={() => void cixisEt()}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-500 transition-transform duration-200 group-hover:scale-105 dark:bg-red-950/40 dark:text-red-400">
                  <LogOut className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-red-500 dark:text-red-400">
                    {t("nav.logout")}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t("header.safeLogout")}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        id="portal-mobile-search-panel"
        className={`portal-mobile-search-panel md:hidden ${mobileSearchOpen ? "is-open" : ""}`}
        aria-hidden={!mobileSearchOpen}
        inert={!mobileSearchOpen}
      >
        <PortalSearch
          autoFocus={mobileSearchOpen}
          tabIndex={mobileSearchOpen ? 0 : -1}
          placeholder="Fənn, müəllim, sənəd və ya xidmət axtar..."
          aria-label={t("common.search")}
        />
      </div>
    </header>
  );
}
