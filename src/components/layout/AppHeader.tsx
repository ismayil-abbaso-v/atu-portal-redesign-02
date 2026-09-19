import { Bell, CheckCheck, ChevronRight, LogOut, Menu, User, UserRound, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { SignedAvatarImg } from "@/components/common/SignedAvatar";
import { useI18n } from "@/lib/i18n";
import "@/notification-panel.css";

export function AppHeader({ name, avatarUrl, onMenuClick, mobileMenuOpen = false }: { name: string; avatarUrl?: string | null; onMenuClick?: () => void; mobileMenuOpen?: boolean }) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { t, intlLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
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
    const chatGroupId = metadata && typeof metadata["chat_group_id"] === "string"
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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 px-3 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78 sm:px-6 sm:py-3">
      <div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            aria-label={mobileMenuOpen ? `${t("nav.menu")} — ${t("common.close")}` : t("nav.menu")}
            aria-expanded={mobileMenuOpen}
            onClick={() => onMenuClick?.()}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-[background-color,color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 md:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link to="/ev" aria-label={t("app.name")} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p className="truncate font-display text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">{t("app.name")}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{t("app.subtitle")}</p>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              aria-label={t("nav.notifications")}
              aria-expanded={open}
              onClick={() => {
                setProfileOpen(false);
                setOpen((v) => !v);
              }}
              className="relative inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-[background-color,color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-11"
            >
              <Bell className={open ? "size-5 text-primary" : "size-5"} />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] font-bold leading-4 text-primary-foreground shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            <div
              className={`${open ? "notification-panel--open pointer-events-auto opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-[0.985] -translate-y-1"} notification-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(24rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 transition-[opacity,transform] duration-200 ease-out`}
            >
              <span aria-hidden className="notification-panel__topline" />

              <div className="notification-panel__header flex items-center justify-between border-b border-border/70 px-4 py-3.5">
                <div className="notification-panel__header-copy">
                  <p className="font-display text-base font-semibold text-foreground">{t("nav.notifications")}</p>
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
                      <div key={index} className="notification-panel__skeleton rounded-xl p-3" style={{ animationDelay: `${index * 80}ms` }}>
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
                        <span className="block truncate text-sm font-semibold text-foreground">{notification.baslıq}</span>
                        {notification.metin ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.metin}</span>
                        ) : null}
                        <span className="mt-1.5 block text-[10px] font-medium text-muted-foreground">
                          {notification.tarix ? new Date(notification.tarix).toLocaleString(intlLocale, { dateStyle: "medium", timeStyle: "short" }) : ""}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="notification-panel__empty flex h-40 flex-col items-center justify-center px-6 text-center">
                    <span className="notification-panel__empty-icon mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary/55">
                      <Bell className="size-6" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{t("header.noNotifications")}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("header.newNotifications")}</p>
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
              onClick={() => {
                setOpen(false);
                setProfileOpen((v) => !v);
              }}
              className={`flex min-w-0 items-center gap-2 rounded-xl border bg-card px-2 py-1.5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3 ${profileOpen ? "border-primary/25 bg-accent shadow-[0_8px_24px_rgba(61,15,28,0.10)]" : "border-border"}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-[11px] font-bold text-primary-foreground sm:size-9 sm:text-xs">
                {avatarUrl ? <SignedAvatarImg src={avatarUrl} alt={name || t("nav.profile")} className="size-full object-cover" /> : initials || <User className="size-4" />}
              </span>
              <span className="hidden max-w-48 truncate text-sm font-semibold sm:block">{name}</span>
              <ChevronRight className={`hidden size-4 text-muted-foreground transition-transform duration-200 sm:block ${profileOpen ? "rotate-90 text-primary" : ""}`} />
            </button>

            <div className={profileOpen ? "absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_rgba(61,15,28,0.16)] opacity-100 scale-100 translate-y-0 transition-[opacity,transform] duration-200 ease-out" : "pointer-events-none absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_rgba(61,15,28,0.16)] opacity-0 scale-95 -translate-y-1 transition-[opacity,transform] duration-200 ease-out"}>
              <Link to="/menyu/profil" onClick={() => setProfileOpen(false)} className="group flex items-center gap-4 border-b border-border/70 px-5 py-4 transition-colors duration-200 hover:bg-accent/70">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105"><UserRound className="size-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{t("header.myProfile")}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t("header.viewPersonalData")}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>

              <button type="button" onClick={() => void cixisEt()} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-500 transition-transform duration-200 group-hover:scale-105 dark:bg-red-950/40 dark:text-red-400"><LogOut className="size-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-red-500 dark:text-red-400">{t("nav.logout")}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t("header.safeLogout")}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
