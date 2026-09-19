import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  BellDot,
  BellOff,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Megaphone,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import notificationsHero from "@/assets/notifications-hero.svg";
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
import "@/office-notifications-redesign.css";

type HubView = "all" | "announcements" | "system" | "warnings" | "reminders";
type BildirislerSearch = { tab?: "announcements" | "notifications" };

export const Route = createFileRoute("/_authenticated/bildirisler")({
  validateSearch: (search: Record<string, unknown>): BildirislerSearch =>
    search.tab === "notifications" || search.tab === "announcements" ? { tab: search.tab } : {},
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

const HUB_COPY = {
  az: {
    title: "Bildirişlər",
    subtitle: "Vacib yeniliklərdən daim xəbərdar olun və heç bir fürsəti qaçırmayın!",
    quote: "Məlumatlı tələbə daha güclü gələcək qurur.",
    all: "Bütün bildirişlər",
    announcements: "Elanlar",
    system: "Sistem bildirişləri",
    warnings: "Xəbərdarlıqlar",
    reminders: "Xatırlatmalar",
    stats: "Qısa statistika",
    unread: "Oxunmamış",
    systemCount: "Sistem",
    reminderCount: "Xatırlatma",
    settings: "Bildiriş ayarları",
    settingsHint: "Bildiriş seçimlərinizi Menyu bölməsindən idarə edin.",
    category: "Kateqoriya",
  },
  tr: {
    title: "Bildirimler",
    subtitle: "Önemli gelişmeleri takip edin ve hiçbir fırsatı kaçırmayın.",
    quote: "Bilgili öğrenci daha güçlü bir gelecek kurar.",
    all: "Tüm bildirimler",
    announcements: "Duyurular",
    system: "Sistem bildirimleri",
    warnings: "Uyarılar",
    reminders: "Hatırlatmalar",
    stats: "Kısa istatistik",
    unread: "Okunmamış",
    systemCount: "Sistem",
    reminderCount: "Hatırlatma",
    settings: "Bildirim ayarları",
    settingsHint: "Bildirim tercihlerinizi Menü bölümünden yönetin.",
    category: "Kategori",
  },
  en: {
    title: "Notifications",
    subtitle: "Stay informed about important updates and do not miss opportunities.",
    quote: "An informed student builds a stronger future.",
    all: "All notifications",
    announcements: "Announcements",
    system: "System notifications",
    warnings: "Warnings",
    reminders: "Reminders",
    stats: "Quick statistics",
    unread: "Unread",
    systemCount: "System",
    reminderCount: "Reminders",
    settings: "Notification settings",
    settingsHint: "Manage notification preferences from Menu.",
    category: "Category",
  },
  ru: {
    title: "Уведомления",
    subtitle: "Следите за важными обновлениями и не упускайте возможности.",
    quote: "Информированный студент строит более сильное будущее.",
    all: "Все уведомления",
    announcements: "Объявления",
    system: "Системные",
    warnings: "Предупреждения",
    reminders: "Напоминания",
    stats: "Краткая статистика",
    unread: "Непрочитанные",
    systemCount: "Системные",
    reminderCount: "Напоминания",
    settings: "Настройки уведомлений",
    settingsHint: "Управляйте уведомлениями в разделе Меню.",
    category: "Категория",
  },
} as const;

function BildirisTarixi({ tarix }: { tarix: string }) {
  const { locale } = useNotificationHubI18n();
  const date = new Date(tarix);
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;
  return <span>{isToday(date) ? formatDistanceToNow(date, { addSuffix: true, locale: dateLocale }) : format(date, "d MMMM, HH:mm", { locale: dateLocale })}</span>;
}

function BildirisSetri({
  bildiris,
  onOxu,
  index,
  unreadLabel,
}: {
  bildiris: Notification;
  onOxu: (id: string) => void;
  index: number;
  unreadLabel: string;
}) {
  const { icon: Icon, etiket } = bildirisKonfiqurasiyasiniAl(bildiris.tip);
  const unread = !bildiris.oxunub_mu;

  return (
    <li className={cn("notification-reference-row", unread && "is-unread")} style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
      <button type="button" onClick={() => unread && onOxu(bildiris.id)} className="notification-reference-row__button">
        <span className="notification-reference-row__check" aria-hidden />
        <span className="notification-reference-row__icon"><Icon aria-hidden /></span>
        <span className="notification-reference-row__body">
          <span className="notification-reference-row__top">
            <strong>{bildiris.baslıq}</strong>
            <time><BildirisTarixi tarix={bildiris.tarix} /></time>
          </span>
          {bildiris.metin ? <span className="notification-reference-row__preview">{bildiris.metin}</span> : null}
          <span className="notification-reference-row__meta">
            <span>{etiket}</span>
            {unread ? (
              <>
                <i aria-hidden />
                <span className="sr-only">{unreadLabel}</span>
              </>
            ) : null}
          </span>
        </span>
        <ChevronRight aria-hidden className="notification-reference-row__arrow" />
      </button>
    </li>
  );
}

function BildirislerSehifesi() {
  const { locale, t } = useNotificationHubI18n();
  const { tab } = Route.useSearch();
  const copy = HUB_COPY[locale as keyof typeof HUB_COPY] ?? HUB_COPY.az;
  const [activeView, setActiveView] = useState<HubView>(tab === "announcements" ? "announcements" : "all");

  useEffect(() => {
    document.title = `${t("hub.title")} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = t("hub.subtitle");
  }, [copy, t]);

  useEffect(() => {
    setActiveView(tab === "announcements" ? "announcements" : "all");
  }, [tab]);

  const tabs = [
    { id: "all" as const, label: copy.all, icon: Bell },
    { id: "announcements" as const, label: copy.announcements, icon: Megaphone },
    { id: "system" as const, label: copy.system, icon: Settings2 },
    { id: "warnings" as const, label: copy.warnings, icon: AlertTriangle },
    { id: "reminders" as const, label: copy.reminders, icon: CalendarDays },
  ];

  return (
    <div className="notification-redesign-page animate-page-enter">
      <section className="notification-reference-hero" style={{ backgroundImage: `url(${notificationsHero})` }}>
        <div className="notification-reference-hero__shade" aria-hidden />
        <div className="notification-reference-hero__copy">
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <blockquote>“{copy.quote}”</blockquote>
        <span className="notification-reference-hero__mark" aria-hidden><Bell /></span>
      </section>

      <div className="notification-category-tabs" role="tablist" aria-label={t("hub.sectionsAria")}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeView === id} className={activeView === id ? "is-active" : ""} onClick={() => setActiveView(id)}>
            <Icon aria-hidden /><span>{label}</span>
          </button>
        ))}
      </div>

      {activeView === "announcements" ? <AnnouncementsPanel /> : <NotificationsPanel view={activeView} />}
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const announcementItems = useMemo(() => Array.isArray(announcementsQuery.data) ? announcementsQuery.data : [], [announcementsQuery.data]);
  const readItems = useMemo(() => Array.isArray(readsQuery.data) ? readsQuery.data : [], [readsQuery.data]);
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
    <section id="announcements-panel" role="tabpanel" className="announcement-reference-panel">
      <div className="announcement-reference-stats">
        <div><span><Megaphone aria-hidden /></span><p><strong>{announcementItems.length}</strong><small>{t("announcements.active")}</small></p></div>
        <div><span><BellDot aria-hidden /></span><p><strong>{unreadCount}</strong><small>{t("announcements.unread")}</small></p></div>
        <div><span><SlidersHorizontal aria-hidden /></span><p><strong>{featured.length}</strong><small>{t("announcements.featured")}</small></p></div>
      </div>

      <div className="announcement-reference-filters">
        <label><Search aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("announcements.searchPlaceholder")} /></label>
        <Select value={category} onValueChange={(value) => setCategory(value as "all" | AnnouncementCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("announcements.allCategories")}</SelectItem>
            {(Object.keys(notificationCategoryKeys) as AnnouncementCategory[]).map((value) => <SelectItem key={value} value={value}>{t(notificationCategoryKeys[value])}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {announcementsQuery.isLoading || userQuery.isLoading ? (
        <div className="announcement-reference-loading"><div /><div /></div>
      ) : userQuery.isError || announcementsQuery.isError || readsQuery.isError ? (
        <div className="announcement-reference-empty"><AnnouncementMessage title={t("announcements.loadErrorTitle")} body={t("announcements.loadErrorBody")} /></div>
      ) : filtered.length === 0 ? (
        <div className="announcement-reference-empty"><AnnouncementMessage title={t("announcements.emptyTitle")} body={search || category !== "all" ? t("announcements.changeFilters") : t("announcements.noActive")} /></div>
      ) : (
        <div className="announcement-reference-content">
          {featured.length ? <section><div className="announcement-reference-heading"><span>{t("announcements.selected")}</span></div><div className="grid gap-4 xl:grid-cols-2">{featured.map((item) => <AnnouncementCard key={item.id} announcement={item} initiallyRead={readIds.has(item.id)} featured />)}</div></section> : null}
          {standard.length ? <section><div className="announcement-reference-heading"><span>{t("announcements.all")}</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{standard.map((item) => <AnnouncementCard key={item.id} announcement={item} initiallyRead={readIds.has(item.id)} compact />)}</div></section> : null}
        </div>
      )}
    </section>
  );
}

function NotificationsPanel({ view }: { view: Exclude<HubView, "announcements"> }) {
  const { locale, t } = useNotificationHubI18n();
  const copy = HUB_COPY[locale as keyof typeof HUB_COPY] ?? HUB_COPY.az;
  const state = useNotifications();
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const { isLoading, unreadCount, markAsRead, markAllAsRead } = state;

  const filtered = useMemo(() => {
    if (view === "system") return notifications.filter((item) => item.tip === "sistem");
    if (view === "warnings") return notifications.filter((item) => item.tip === "xeberdarliq");
    if (view === "reminders") return notifications.filter((item) => item.tip === "tedbir" || item.tip === "xususi_gun");
    return notifications;
  }, [notifications, view]);

  const systemCount = notifications.filter((item) => item.tip === "sistem").length;
  const reminderCount = notifications.filter((item) => item.tip === "tedbir" || item.tip === "xususi_gun").length;

  return (
    <section id="notifications-panel" role="tabpanel" className="notification-reference-layout">
      <main className="notification-reference-main">
        <div className="notification-list-toolbar">
          <div>
            <h2>{t("notifications.title")}</h2>
            <p>{t("notifications.subtitle")}</p>
          </div>
          {unreadCount > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              <CheckCheck aria-hidden />{t("notifications.markAllRead")}
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="notification-reference-loading" aria-label={t("common.loading")}>{Array.from({ length: 5 }).map((_, index) => <div key={index} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="notification-reference-empty">
            <span><BellOff aria-hidden /></span><h3>{t("notifications.empty")}</h3><p>{t("notifications.emptyBody")}</p>
          </div>
        ) : (
          <ul className="notification-reference-list">
            {filtered.map((notification, index) => (
              <BildirisSetri
                key={notification.id}
                bildiris={notification}
                index={index}
                unreadLabel={copy.unread}
                onOxu={(id) => markAsRead.mutate(id)}
              />
            ))}
          </ul>
        )}
      </main>

      <aside className="notification-reference-side">
        <section>
          <div className="notification-side-heading"><h3>{copy.stats}</h3></div>
          <div className="notification-stat-grid">
            <div><span><BellDot aria-hidden /></span><strong>{unreadCount}</strong><small>{copy.unread}</small></div>
            <div><span><Settings2 aria-hidden /></span><strong>{systemCount}</strong><small>{copy.systemCount}</small></div>
            <div><span><CalendarDays aria-hidden /></span><strong>{reminderCount}</strong><small>{copy.reminderCount}</small></div>
            <div><span><Bell aria-hidden /></span><strong>{notifications.length}</strong><small>{copy.all}</small></div>
          </div>
        </section>

        <section className="notification-settings-card">
          <span><Settings2 aria-hidden /></span>
          <h3>{copy.settings}</h3>
          <p>{copy.settingsHint}</p>
          <a href="/menyu/bildiris">{copy.settings}<ChevronRight aria-hidden /></a>
        </section>
      </aside>
    </section>
  );
}

function AnnouncementMessage({ title, body }: { title: string; body: string }) {
  return (
    <>
      <span><Megaphone aria-hidden /></span>
      <h2>{title}</h2>
      <p>{body}</p>
    </>
  );
}
