export type AnnouncementCategory = "general" | "academic" | "opportunity" | "event" | "important";
export type AnnouncementAudience = "all" | "faculty" | "group";
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementMediaLayout = "full" | "wide" | "half-left" | "half-right";

export type AnnouncementMedia = {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
  layout: AnnouncementMediaLayout;
  /** -2 = cover, -1 = mətndən əvvəl, 0+ = uyğun abzasdan sonra, 9999 = sonda */
  position: number;
};

export type Announcement = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  category: AnnouncementCategory;
  image_url: string | null;
  media?: AnnouncementMedia[] | null;
  cta_url: string | null;
  cta_label: string | null;
  is_featured: boolean;
  priority: number;
  audience_type: AnnouncementAudience;
  audience_value: string | null;
  status: AnnouncementStatus;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementRead = {
  announcement_id: string;
  user_id: string;
  first_read_at: string;
  last_read_at: string;
  open_count: number;
};

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  general: "Ümumi",
  academic: "Akademik",
  opportunity: "Fürsət",
  event: "Tədbir",
  important: "Vacib",
};

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Bütün tələbələr",
  faculty: "Fakültə üzrə",
  group: "Qrup üzrə",
};

export const ANNOUNCEMENT_MEDIA_LAYOUT_LABELS: Record<AnnouncementMediaLayout, string> = {
  full: "Tam en",
  wide: "Geniş blok",
  "half-left": "Yarım — sol",
  "half-right": "Yarım — sağ",
};

export function getAnnouncementMedia(item: Pick<Announcement, "media" | "image_url" | "title">): AnnouncementMedia[] {
  const media = Array.isArray(item.media)
    ? item.media.filter((entry): entry is AnnouncementMedia => Boolean(entry && typeof entry.url === "string" && entry.url))
    : [];
  if (media.length) return media;
  if (!item.image_url) return [];
  return [{ id: `legacy-${item.image_url}`, url: item.image_url, caption: "", alt: item.title, layout: "full", position: -2 }];
}

export function getAnnouncementCover(item: Pick<Announcement, "media" | "image_url" | "title">) {
  const media = getAnnouncementMedia(item);
  return media.find((entry) => entry.position === -2) ?? media[0] ?? null;
}

export function announcementParagraphs(body: string) {
  return body
    .split(/\n\s*\n/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function announcementRuntimeStatus(item: Announcement, now = new Date()) {
  if (item.status === "draft") return "draft" as const;
  if (item.status === "archived") return "archived" as const;
  const start = new Date(item.starts_at);
  const end = item.ends_at ? new Date(item.ends_at) : null;
  if (start.getTime() > now.getTime()) return "scheduled" as const;
  if (end && end.getTime() < now.getTime()) return "expired" as const;
  return "active" as const;
}

export const ANNOUNCEMENT_RUNTIME_LABELS = {
  draft: "Qaralama",
  archived: "Arxiv",
  scheduled: "Planlaşdırılıb",
  expired: "Müddəti bitib",
  active: "Aktiv",
} as const;

export function announcementAudienceText(item: Pick<Announcement, "audience_type" | "audience_value">) {
  if (item.audience_type === "all") return ANNOUNCEMENT_AUDIENCE_LABELS.all;
  const prefix = item.audience_type === "faculty" ? "Fakültə" : "Qrup";
  return item.audience_value ? `${prefix}: ${item.audience_value}` : ANNOUNCEMENT_AUDIENCE_LABELS[item.audience_type];
}

export function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function toLocalDateTimeInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function fromLocalDateTimeInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
