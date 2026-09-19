import { format, formatDistanceToNow } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Lightbulb,
  Megaphone,
  Pin,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  announcementParagraphs,
  getAnnouncementCover,
  getAnnouncementMedia,
  normalizeExternalUrl,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementMedia,
} from "@/lib/announcements";
import { notificationCategoryKeys, useNotificationHubI18n } from "@/lib/notification-hub-i18n";
import { cn } from "@/lib/utils";
import "@/announcements-premium.css";

const CATEGORY_ICONS = {
  general: Megaphone,
  academic: BookOpenCheck,
  opportunity: Lightbulb,
  event: CalendarDays,
  important: CircleAlert,
} satisfies Record<AnnouncementCategory, typeof Megaphone>;

function MediaBlock({ media, title }: { media: AnnouncementMedia; title: string }) {
  return (
    <figure className={cn("announcement-inline-media", `announcement-inline-media--${media.layout}`)}>
      <img src={media.url} alt={media.alt?.trim() || media.caption?.trim() || title} loading="lazy" />
      {media.caption?.trim() ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}

function RichAnnouncementBody({ announcement }: { announcement: Announcement }) {
  const paragraphs = announcementParagraphs(announcement.body);
  const media = getAnnouncementMedia(announcement).filter((entry) => entry.position !== -2);
  const before = media.filter((entry) => entry.position === -1);
  const atEnd = media.filter((entry) => entry.position === 9999 || entry.position >= paragraphs.length);

  return (
    <div className="announcement-rich-body">
      {before.map((entry) => <MediaBlock key={entry.id} media={entry} title={announcement.title} />)}
      {paragraphs.map((paragraph, index) => (
        <div key={`${index}-${paragraph.slice(0, 16)}`} className="contents">
          <p>{paragraph}</p>
          {media.filter((entry) => entry.position === index).map((entry) => (
            <MediaBlock key={entry.id} media={entry} title={announcement.title} />
          ))}
        </div>
      ))}
      {atEnd.filter((entry) => !paragraphs.some((_, index) => entry.position === index)).map((entry) => (
        <MediaBlock key={entry.id} media={entry} title={announcement.title} />
      ))}
    </div>
  );
}

export function AnnouncementCard({
  announcement,
  initiallyRead = false,
  compact = false,
  featured = false,
  home = false,
}: {
  announcement: Announcement;
  initiallyRead?: boolean;
  compact?: boolean;
  featured?: boolean;
  home?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [read, setRead] = useState(initiallyRead);
  const { locale, t } = useNotificationHubI18n();
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;
  const Icon = CATEGORY_ICONS[announcement.category];
  const safeUrl = normalizeExternalUrl(announcement.cta_url);
  const cover = getAnnouncementCover(announcement);
  const audienceText = announcement.audience_type === "all"
    ? t("audience.all")
    : announcement.audience_value
      ? `${t(announcement.audience_type === "faculty" ? "audience.facultyPrefix" : "audience.groupPrefix")}: ${announcement.audience_value}`
      : t(announcement.audience_type === "faculty" ? "audience.faculty" : "audience.group");

  async function openDetails() {
    const next = !expanded;
    setExpanded(next);
    if (!next) return;
    setRead(true);
    try {
      await (supabase as any).rpc("mark_announcement_read", { p_announcement_id: announcement.id });
    } catch (error) {
      console.warn("Failed to mark announcement as read:", error);
    }
  }

  return (
    <article
      className={cn(
        "announcement-card announcement-enter",
        (featured || announcement.is_featured) && "announcement-featured",
      )}
    >
      {cover ? (
        <div
          className={cn(
            "announcement-media",
            home ? "h-52 sm:h-60" : featured ? "h-52 sm:h-64" : compact ? "h-40" : "h-48 sm:h-56",
          )}
        >
          <img src={cover.url} alt={cover.alt?.trim() || announcement.title} loading="lazy" />
          {announcement.is_featured ? (
            <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.09em] text-white backdrop-blur-md">
              <Pin className="size-3" /> {t("card.featuredBadge")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("relative z-10", compact ? "p-4 sm:p-5" : "p-5 sm:p-6")}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`announcement-chip announcement-chip--${announcement.category}`}>
            <Icon className="size-3" /> {t(notificationCategoryKeys[announcement.category])}
          </span>
          {!read ? (
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-primary">
              <span className="announcement-unread-dot" /> {t("card.new")}
            </span>
          ) : null}
          {announcement.is_featured && !cover ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--portal-gold)]">
              <Sparkles className="size-3.5" /> {t("card.selected")}
            </span>
          ) : null}
        </div>

        <h3 className={cn("font-display font-semibold tracking-[-0.02em] text-foreground", featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg")}>
          {announcement.title}
        </h3>

        {announcement.summary ? (
          <p className={cn("mt-2 leading-6 text-muted-foreground", compact ? "line-clamp-2 text-xs sm:text-sm" : "text-sm")}>
            {announcement.summary}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary/75" />
            {format(new Date(announcement.starts_at), "d MMM yyyy, HH:mm", { locale: dateLocale })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersRound className="size-3.5 text-primary/75" />
            {audienceText}
          </span>
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(announcement.starts_at), { addSuffix: true, locale: dateLocale })}
          </span>
        </div>

        {expanded ? (
          <div className="mt-5 border-t border-border/70 pt-5">
            <RichAnnouncementBody announcement={announcement} />
            {announcement.ends_at ? (
              <p className="mt-4 text-xs font-semibold text-muted-foreground">
                {t("card.displayUntil", { date: format(new Date(announcement.ends_at), "d MMMM yyyy, HH:mm", { locale: dateLocale }) })}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={cn("mt-5 flex flex-col gap-2 sm:flex-row sm:items-center", compact && "mt-4")}>
          <button type="button" onClick={openDetails} className="announcement-action announcement-action--soft">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? t("card.close") : t("card.viewDetails")}
          </button>
          {safeUrl ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setRead(true);
                void (supabase as any).rpc("mark_announcement_read", { p_announcement_id: announcement.id });
              }}
              className="announcement-action announcement-action--primary"
            >
              {announcement.cta_label?.trim() || t("card.openLink")}
              <ArrowUpRight className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
