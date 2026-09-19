import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";
import { Bell, BellDot, BellOff, CheckCheck, Megaphone, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import {
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementRead,
} from "@/lib/announcements";
import { notificationCategoryKeys, useNotificationHubI18n } from "@/lib/notification-hub-i18n";
import { bildirisKonfiqurasiyasiniAl } from "@/lib/notification-types";
import { cn } from "@/lib/utils";
import "@/announcements-premium.css";
import "@/notifications-premium.css";
import "@/notifications-hub-refinement.css";

type HubTab = "announcements" | "notifications";
type BildirislerSearch = { tab?: HubTab };

export const Route = createFileRoute("/_authenticated/bildirisler")({
  validateSearch: (search: Record<string, unknown>): BildirislerSearch =>
    search.tab === "notifications" || search.tab === "announcements"
      ? { tab: search.tab }
      : {},
  head: () => ({
    meta: [
      { title: "ATU Portal" },
      { name: "description", content: "ATU Portal" },
      { property: "og:title", content: "ATU Portal" },
      { property: "og:description", content: "ATU Portal" },
    ],
  }),
  component: BildirislerSehifesi,
});

function BildirisTarixi({ tarix }: { tarix: string }) {
  const { locale } = useNotificationHubI18n();
  const d = new Date(tarix);
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;
  return <span>{isToday(d) ? formatDistanceToNow(d, { addSuffix: true, locale: dateLocale }) : format(d, "d MMMM, HH:mm", { locale: dateLocale })}</span>;
}

function BildirisSetri({ bildiris, onOxu, index }: { bildiris: Notification; onOxu: (id: string) => void; index: number }) {
  const { icon: Icon, renk, fon } = bildirisKonfiqurasiyasiniAl(bildiris.tip);
  const oxunmamis = !bildiris.oxunub_mu;

  return (
    <li className="notifications-row" style={{ animationDelay: `${70 + index * 55}ms` }}>
      <button
        type="button"
        onClick={() => oxunmamis && onOxu(bildiris.id)}
        className={cn(
          "notifications-row__button",
          oxunmamis ? "notifications-row__button--unread" : "notifications-row__button--read",
        )}
      >
        {oxunmamis ? <span aria-hidden className="notifications-row__edge" /> : null}
        <span className={cn("mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl", fon, renk)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold text-foreground">{bildiris.baslıq}</p>
            {oxunmamis ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
          </div>
          {bildiris.metin ? <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{bildiris.metin}</p> : null}
          <p className="mt-1.5 text-xs text-muted-foreground/80"><BildirisTarixi tarix={bildiris.tarix} /></p>
        </div>
      </button>
    </li>
  );
}

function BildirislerSehifesi() {
  const { locale, t } = useNotificationHubI18n();
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<HubTab>(tab ?? "announcements");

  useEffect(() => {
    document.title = `${t("hub.title")} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = t("hub.subtitle");
  }, [locale, t]);

  useEffect(() => {
    setActiveTab(tab ?? "announcements");
  }, [tab]);

  return (
    <div className="notifications-page">
      <section className="notifications-hero">
        <span aria-hidden className="notifications-hero__pattern" />
        <span aria-hidden className="notifications-hero__glow notifications-hero__glow--one" />
        <span aria-hidden className="notifications-hero__glow notifications-hero__glow--two" />
        <span aria-hidden className="notifications-hero__accent" />
        <span aria-hidden className="notifications-hero__sweep" />

        <div className="notifications-hero__layout">
          <div className="notifications-hero__copy">
            <div className="notifications-hero__eyebrow">
              <span aria-hidden className="notifications-hero__pulse" />
              {t("hub.infoCenter")}
            </div>
            <h1 className="notifications-hero__title">{t("hub.title")}</h1>
            <p className="notifications-hero__subtitle">
              {t("hub.subtitle")}
            </p>
          </div>

          <div className="notifications-hero__visual" aria-hidden>
            <span className="notifications-hub__halo" />
            <span className="notifications-hub__core" />
            <span className="notifications-hub__orbit notifications-hub__orbit--one" />
            <span className="notifications-hub__orbit notifications-hub__orbit--two" />
            <span className="notifications-hub__node notifications-hub__node--one" />
            <span className="notifications-hub__node notifications-hub__node--two" />
            <span className="notifications-hub__node notifications-hub__node--three" />
            <span className="notifications-hero__bell">
              {activeTab === "announcements" ? <Megaphone className="size-8" /> : <Bell className="size-8" />}
            </span>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label={t("hub.sectionsAria")}
        className="mb-5 grid grid-cols-2 gap-1.5 rounded-[22px] border border-border bg-card p-1.5 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "announcements"}
          aria-controls="announcements-panel"
          onClick={() => setActiveTab("announcements")}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-bold transition-[background-color,color,box-shadow] duration-200",
            activeTab === "announcements"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Megaphone className="size-4" />
          <span>{t("hub.announcements")}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "notifications"}
          aria-controls="notifications-panel"
          onClick={() => setActiveTab("notifications")}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-bold transition-[background-color,color,box-shadow] duration-200",
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Bell className="size-4" />
          <span>{t("hub.notifications")}</span>
        </button>
      </div>

      {activeTab === "announcements" ? <AnnouncementsPanel /> : <NotificationsPanel />}
    </div>
  );
}

function AnnouncementsPanel() {
  const { t, locale } = useNotificationHubI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | AnnouncementCategory>("all");

  const userQuery = useQuery({
    queryKey: ["announcement-current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const userId = userQuery.data?.id ?? null;

  const announcementsQuery = useQuery({
    queryKey: ["student-announcements", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcements")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data as Announcement[] : [];
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
  });

  const readsQuery = useQuery({
    queryKey: ["student-announcement-reads", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcement_reads")
        .select("announcement_id,user_id,first_read_at,last_read_at,open_count")
        .eq("user_id", userId);
      if (error) throw error;
      return Array.isArray(data) ? data as AnnouncementRead[] : [];
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`student-announcements-page-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["student-announcements", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reads", filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["student-announcement-reads", userId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, userId]);

  const announcementItems = useMemo(
    () => Array.isArray(announcementsQuery.data) ? announcementsQuery.data : [],
    [announcementsQuery.data],
  );
  const readItems = useMemo(
    () => Array.isArray(readsQuery.data) ? readsQuery.data : [],
    [readsQuery.data],
  );
  const readIds = useMemo(() => new Set(readItems.map((item) => item.announcement_id)), [readItems]);
  const searchLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(searchLocale);
    return announcementItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!term) return true;
      return `${item.title ?? ""} ${item.summary ?? ""} ${item.body ?? ""}`.toLocaleLowerCase(searchLocale).includes(term);
    });
  }, [announcementItems, category, search, searchLocale]);

  const unreadCount = announcementItems.filter((item) => !readIds.has(item.id)).length;
  const featured = filtered.filter((item) => item.is_featured);
  const standard = filtered.filter((item) => !item.is_featured);

  return (
    <section id="announcements-panel" role="tabpanel" className="announcement-shell pb-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="announcement-admin-stat">
          <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{t("announcements.active")}</span>
          <div className="mt-1.5 flex items-end gap-2"><b className="font-data text-2xl text-foreground">{announcementItems.length}</b><Megaphone className="mb-1 size-4 text-primary" /></div>
        </div>
        <div className="announcement-admin-stat">
          <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{t("announcements.unread")}</span>
          <div className="mt-1.5 flex items-end gap-2"><b className="font-data text-2xl text-foreground">{unreadCount}</b><BellDot className="mb-1 size-4 text-primary" /></div>
        </div>
        <div className="announcement-admin-stat">
          <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{t("announcements.featured")}</span>
          <div className="mt-1.5 flex items-end gap-2"><b className="font-data text-2xl text-foreground">{featured.length}</b><SlidersHorizontal className="mb-1 size-4 text-primary" /></div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("announcements.searchPlaceholder")} className="rounded-2xl pl-9" />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value as "all" | AnnouncementCategory)}>
          <SelectTrigger className="w-full rounded-2xl sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("announcements.allCategories")}</SelectItem>
            {(Object.keys(notificationCategoryKeys) as AnnouncementCategory[]).map((value) => <SelectItem key={value} value={value}>{t(notificationCategoryKeys[value])}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {announcementsQuery.isLoading || userQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-3xl bg-muted" /><div className="h-72 animate-pulse rounded-3xl bg-muted" /></div>
      ) : userQuery.isError || announcementsQuery.isError || readsQuery.isError ? (
        <div className="announcement-empty flex min-h-64 items-center justify-center p-8 text-center"><div className="relative z-10"><AnnouncementMessage title={t("announcements.loadErrorTitle")} body={t("announcements.loadErrorBody")} /></div></div>
      ) : filtered.length === 0 ? (
        <div className="announcement-empty flex min-h-72 items-center justify-center p-8 text-center"><div className="relative z-10"><AnnouncementMessage title={t("announcements.emptyTitle")} body={search || category !== "all" ? t("announcements.changeFilters") : t("announcements.noActive")} /></div></div>
      ) : (
        <div className="space-y-6">
          {featured.length ? (
            <section>
              <div className="mb-3 flex items-center gap-2"><span className="text-xs font-extrabold uppercase tracking-[.12em] text-primary">{t("announcements.selected")}</span><span className="h-px flex-1 bg-border" /></div>
              <div className="grid gap-4 xl:grid-cols-2">{featured.map((item) => <AnnouncementCard key={item.id} announcement={item} initiallyRead={readIds.has(item.id)} featured />)}</div>
            </section>
          ) : null}
          {standard.length ? (
            <section>
              <div className="mb-3 flex items-center gap-2"><span className="text-xs font-extrabold uppercase tracking-[.12em] text-muted-foreground">{t("announcements.all")}</span><span className="h-px flex-1 bg-border" /></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{standard.map((item) => <AnnouncementCard key={item.id} announcement={item} initiallyRead={readIds.has(item.id)} compact />)}</div>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

function NotificationsPanel() {
  const { t } = useNotificationHubI18n();
  const notificationState = useNotifications();
  const notifications = Array.isArray(notificationState.notifications) ? notificationState.notifications : [];
  const { isLoading, unreadCount, markAsRead, markAllAsRead } = notificationState;

  return (
    <section id="notifications-panel" role="tabpanel" className="notifications-panel">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/70 px-1 pb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{t("notifications.title")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("notifications.subtitle")}</p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="rounded-full"
          >
            <CheckCheck className="size-3.5" />
            {t("notifications.markAllRead")}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="notifications-loading" aria-label={t("common.loading")}>
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="notifications-loading__item" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="notifications-empty__content">
            <span className="notifications-empty__icon"><BellOff className="size-8" /></span>
            <p className="notifications-empty__title">{t("notifications.empty")}</p>
            <p className="notifications-empty__text">{t("notifications.emptyBody")}</p>
          </div>
        </div>
      ) : (
        <ul className="notifications-list">
          {notifications.map((bildiris, index) => (
            <BildirisSetri
              key={bildiris.id}
              bildiris={bildiris}
              index={index}
              onOxu={(id) => markAsRead.mutate(id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AnnouncementMessage({ title, body }: { title: string; body: string }) {
  return <><span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Megaphone className="size-6" /></span><h2 className="text-base font-bold text-foreground">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{body}</p></>;
}
