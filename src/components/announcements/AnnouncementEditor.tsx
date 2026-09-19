import { Check, ChevronDown, ChevronUp, ImagePlus, Images, Pin, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_MEDIA_LAYOUT_LABELS,
  announcementParagraphs,
  fromLocalDateTimeInput,
  getAnnouncementCover,
  getAnnouncementMedia,
  normalizeExternalUrl,
  toLocalDateTimeInput,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementCategory,
  type AnnouncementMedia,
  type AnnouncementMediaLayout,
  type AnnouncementStatus,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";
import "@/announcements-premium.css";

type Draft = {
  title: string;
  summary: string;
  body: string;
  category: AnnouncementCategory;
  media: AnnouncementMedia[];
  cta_url: string;
  cta_label: string;
  is_featured: boolean;
  priority: number;
  audience_type: AnnouncementAudience;
  audience_value: string;
  status: AnnouncementStatus;
  starts_at: string;
  ends_at: string;
};

function emptyDraft(): Draft {
  return {
    title: "",
    summary: "",
    body: "",
    category: "general",
    media: [],
    cta_url: "",
    cta_label: "",
    is_featured: false,
    priority: 0,
    audience_type: "all",
    audience_value: "",
    status: "draft",
    starts_at: toLocalDateTimeInput(new Date().toISOString()),
    ends_at: "",
  };
}

function draftFromAnnouncement(item: Announcement): Draft {
  return {
    title: item.title,
    summary: item.summary ?? "",
    body: item.body,
    category: item.category,
    media: getAnnouncementMedia(item),
    cta_url: item.cta_url ?? "",
    cta_label: item.cta_label ?? "",
    is_featured: item.is_featured,
    priority: item.priority,
    audience_type: item.audience_type,
    audience_value: item.audience_value ?? "",
    status: item.status,
    starts_at: toLocalDateTimeInput(item.starts_at),
    ends_at: toLocalDateTimeInput(item.ends_at),
  };
}

export function AnnouncementEditor({
  open,
  announcement,
  faculties,
  groups,
  onClose,
  onSaved,
}: {
  open: boolean;
  announcement: Announcement | null;
  faculties: string[];
  groups: string[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(announcement ? draftFromAnnouncement(announcement) : emptyDraft());
    setFeedback(null);
  }, [announcement, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  const paragraphs = useMemo(() => announcementParagraphs(draft.body), [draft.body]);

  function updateMedia(id: string, patch: Partial<AnnouncementMedia>) {
    setDraft((current) => ({
      ...current,
      media: current.media.map((item) => {
        if (item.id !== id && patch.position === -2 && item.position === -2) return { ...item, position: 9999 };
        return item.id === id ? { ...item, ...patch } : item;
      }),
    }));
  }

  function moveMedia(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.media.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.media.length) return current;
      const media = [...current.media];
      [media[index], media[nextIndex]] = [media[nextIndex], media[index]];
      return { ...current, media };
    });
  }

  async function uploadImages(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (draft.media.length + selected.length > 12) {
      setFeedback({ type: "error", text: "Bir elana maksimum 12 şəkil əlavə etmək olar." });
      return;
    }
    const invalid = selected.find((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024);
    if (invalid) {
      setFeedback({ type: "error", text: "Yalnız şəkil faylları qəbul olunur və hər şəkil maksimum 8 MB ola bilər." });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const uploaded: AnnouncementMedia[] = [];
      for (const file of selected) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("announcement-media").upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("announcement-media").getPublicUrl(path);
        uploaded.push({
          id: crypto.randomUUID(),
          url: data.publicUrl,
          caption: "",
          alt: "",
          layout: "full",
          position: draft.media.length === 0 && uploaded.length === 0 ? -2 : 9999,
        });
      }
      setDraft((current) => ({ ...current, media: [...current.media, ...uploaded] }));
      setFeedback({ type: "success", text: `${uploaded.length} şəkil uğurla əlavə edildi.` });
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Şəkillər yüklənmədi." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const title = draft.title.trim();
    const body = draft.body.trim();
    const startsAt = fromLocalDateTimeInput(draft.starts_at);
    const endsAt = fromLocalDateTimeInput(draft.ends_at);
    if (title.length < 3) return setFeedback({ type: "error", text: "Başlıq ən az 3 simvol olmalıdır." });
    if (!body) return setFeedback({ type: "error", text: "Elanın məzmununu daxil edin." });
    if (!startsAt) return setFeedback({ type: "error", text: "Başlanma tarixini düzgün seçin." });
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) return setFeedback({ type: "error", text: "Bitmə tarixi başlanma tarixindən sonra olmalıdır." });
    if (draft.audience_type !== "all" && !draft.audience_value.trim()) return setFeedback({ type: "error", text: "Auditoriya üçün fakültə və ya qrup seçin." });
    const ctaUrl = draft.cta_url.trim() ? normalizeExternalUrl(draft.cta_url) : null;
    if (draft.cta_url.trim() && !ctaUrl) return setFeedback({ type: "error", text: "Keçid yalnız etibarlı http/https ünvanı ola bilər." });

    setSaving(true);
    setFeedback(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("İstifadəçi tapılmadı");
      const cover = getAnnouncementCover({ media: draft.media, image_url: null, title });
      const payload = {
        title,
        summary: draft.summary.trim() || null,
        body,
        category: draft.category,
        image_url: cover?.url ?? null,
        media: draft.media,
        cta_url: ctaUrl,
        cta_label: draft.cta_label.trim() || null,
        is_featured: draft.is_featured,
        priority: Math.max(0, Math.min(100, Number(draft.priority) || 0)),
        audience_type: draft.audience_type,
        audience_value: draft.audience_type === "all" ? null : draft.audience_value.trim(),
        status: draft.status,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_by: authData.user.id,
      };
      const query = announcement
        ? (supabase as any).from("announcements").update(payload).eq("id", announcement.id)
        : (supabase as any).from("announcements").insert({ ...payload, created_by: authData.user.id });
      const { error } = await query;
      if (error) throw error;

      // The database write is already complete at this point. Close the heavy
      // fullscreen editor first, then refresh cached announcement queries.
      // A transient refetch/realtime problem must never turn a successful
      // publish into a full-route crash.
      onClose();
      try {
        await onSaved();
      } catch (refreshError) {
        console.warn("Elan yadda saxlanıldı, amma siyahı dərhal yenilənmədi:", refreshError);
      }
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Elan yadda saxlanmadı." });
    } finally {
      setSaving(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="announcement-modal-backdrop announcement-modal-backdrop--portal" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="announcement-modal announcement-modal--fullscreen" role="dialog" aria-modal="true" aria-label={announcement ? "Elanı redaktə et" : "Yeni elan yarat"}>
        <header className="announcement-editor-header">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-primary">Elan redaktoru</p>
            <h2 className="mt-0.5 truncate font-display text-xl font-semibold text-foreground sm:text-2xl">{announcement ? "Elanı redaktə et" : "Yeni elan yarat"}</h2>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">Məzmun, auditoriya, tarix və media yerləşimini bir ekrandan idarə edin.</p>
          </div>
          <button onClick={onClose} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </header>

        <div className="announcement-modal-body announcement-editor-body">
          {feedback ? <div className={cn("announcement-editor-feedback", feedback.type === "error" ? "is-error" : "is-success")}>{feedback.text}</div> : null}

          <div className="announcement-editor-grid">
            <div className="announcement-editor-main">
              <div className="announcement-editor-section">
                <div className="announcement-editor-section-title"><span>01</span><div><b>Məzmun</b><small>Tələbənin görəcəyi əsas informasiya</small></div></div>
                <div className="grid gap-4">
                  <Field label="Başlıq *"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Məsələn: Beynəlxalq Hackathon qeydiyyatı açıldı" className="rounded-xl" maxLength={180} /></Field>
                  <Field label="Qısa mətn"><Input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Kartda görünəcək qısa izah" className="rounded-xl" maxLength={320} /></Field>
                  <Field label="Elanın məzmunu *"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="announcement-control announcement-body-editor" placeholder="Mətni abzaslara ayırmaq üçün arada boş sətir saxlayın. Şəkilləri daha sonra istədiyiniz abzasın önünə və ya arxasına yerləşdirə bilərsiniz." maxLength={12000} /></Field>
                </div>
              </div>

              <div className="announcement-editor-section">
                <div className="announcement-editor-section-title"><span>02</span><div><b>Media kompozisiyası</b><small>Bir neçə şəkil əlavə edin, sıralayın və mətn daxilində yerləşdirin</small></div></div>
                <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { if (e.target.files?.length) void uploadImages(e.target.files); e.currentTarget.value = ""; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="announcement-multi-upload" disabled={uploading}>
                  <span className="announcement-multi-upload__icon"><ImagePlus className="size-6" /></span>
                  <span><b>{uploading ? "Şəkillər yüklənir..." : "Şəkilləri seç və əlavə et"}</b><small>Bir dəfəyə bir neçə PNG, JPG, WEBP və ya GIF · hər biri max 8 MB · maksimum 12 şəkil</small></span>
                </button>

                {draft.media.length ? (
                  <div className="announcement-media-editor-list">
                    {draft.media.map((media, index) => (
                      <div key={media.id} className="announcement-media-editor-item">
                        <div className="announcement-media-editor-preview"><img src={media.url} alt="" />{media.position === -2 ? <span><Pin className="size-3" /> Cover</span> : null}</div>
                        <div className="announcement-media-editor-controls">
                          <div className="flex items-center justify-between gap-2"><b className="text-xs text-foreground">Şəkil {index + 1}</b><div className="flex items-center gap-1"><button type="button" title="Yuxarı" disabled={index === 0} onClick={() => moveMedia(media.id, -1)} className="announcement-media-icon-button"><ChevronUp className="size-4" /></button><button type="button" title="Aşağı" disabled={index === draft.media.length - 1} onClick={() => moveMedia(media.id, 1)} className="announcement-media-icon-button"><ChevronDown className="size-4" /></button><button type="button" title="Sil" onClick={() => setDraft((current) => ({ ...current, media: current.media.filter((item) => item.id !== media.id) }))} className="announcement-media-icon-button is-danger"><Trash2 className="size-4" /></button></div></div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Mətndə yeri"><Select value={String(media.position)} onValueChange={(value) => updateMedia(media.id, { position: Number(value) })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="-2">Cover / kart şəkli</SelectItem><SelectItem value="-1">Mətndən əvvəl</SelectItem>{paragraphs.map((_, paragraphIndex) => <SelectItem key={paragraphIndex} value={String(paragraphIndex)}>{paragraphIndex + 1}-ci abzasdan sonra</SelectItem>)}<SelectItem value="9999">Mətnin sonunda</SelectItem></SelectContent></Select></Field>
                            <Field label="Görünüş"><Select value={media.layout} disabled={media.position === -2} onValueChange={(value) => updateMedia(media.id, { layout: value as AnnouncementMediaLayout })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{(Object.entries(ANNOUNCEMENT_MEDIA_LAYOUT_LABELS) as [AnnouncementMediaLayout,string][]).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
                          </div>
                          <Input value={media.caption ?? ""} onChange={(e) => updateMedia(media.id, { caption: e.target.value })} placeholder="Şəkil açıqlaması (istəyə görə)" className="rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="announcement-media-editor-empty"><Images className="size-6" /><span>Hələ media əlavə edilməyib. Elan şəkilsiz də yayımlana bilər.</span></div>
                )}
              </div>
            </div>

            <aside className="announcement-editor-side">
              <div className="announcement-editor-section sticky top-0">
                <div className="announcement-editor-section-title"><span>03</span><div><b>Yayım parametrləri</b><small>Kimə, nə vaxt və hansı prioritetlə göstərilsin</small></div></div>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <Field label="Kateqoriya"><Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value as AnnouncementCategory })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{(Object.entries(ANNOUNCEMENT_CATEGORY_LABELS) as [AnnouncementCategory,string][]).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Status"><Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as AnnouncementStatus })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Qaralama</SelectItem><SelectItem value="published">Yayımla / planlaşdır</SelectItem><SelectItem value="archived">Arxiv</SelectItem></SelectContent></Select></Field>
                  </div>
                  <Field label="Auditoriya"><Select value={draft.audience_type} onValueChange={(value) => setDraft({ ...draft, audience_type: value as AnnouncementAudience, audience_value: "" })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{(Object.entries(ANNOUNCEMENT_AUDIENCE_LABELS) as [AnnouncementAudience,string][]).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
                  {draft.audience_type !== "all" ? <Field label={draft.audience_type === "faculty" ? "Fakültə" : "Qrup"}><Select value={draft.audience_value} onValueChange={(value) => setDraft({ ...draft, audience_value: value })}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent>{(draft.audience_type === "faculty" ? faculties : groups).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field> : null}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Field label="Başlanma vaxtı *"><Input type="datetime-local" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} className="rounded-xl" /></Field><Field label="Bitmə vaxtı"><Input type="datetime-local" value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} className="rounded-xl" /></Field></div>
                  <Field label="Prioritet (0–100)"><Input type="number" min={0} max={100} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} className="rounded-xl" /></Field>
                  <button type="button" onClick={() => setDraft({ ...draft, is_featured: !draft.is_featured })} className={cn("announcement-feature-toggle", draft.is_featured && "is-active")}><span><span className="flex items-center gap-2 text-sm font-extrabold text-foreground"><Pin className="size-4 text-[var(--portal-gold)]" /> Önə çıxar</span><small>Tələbə panelində daha nəzərəçarpan göstər.</small></span><span className="announcement-feature-toggle__check"><Check className={cn("size-3.5", !draft.is_featured && "opacity-0")} /></span></button>
                  <div className="grid gap-4"><Field label="Keçid linki"><Input value={draft.cta_url} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} placeholder="https://..." className="rounded-xl" /></Field><Field label="Düymə mətni"><Input value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} placeholder="Qeydiyyatdan keç" className="rounded-xl" /></Field></div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <footer className="announcement-editor-footer">
          <div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-primary/55" /><span>{draft.media.length} şəkil · {paragraphs.length} abzas</span></div>
          <div className="ml-auto flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row"><Button variant="outline" onClick={onClose} className="rounded-xl">Ləğv et</Button><Button onClick={() => void save()} disabled={saving || uploading} className="rounded-xl"><Send className="mr-2 size-4" />{saving ? "Yadda saxlanır..." : announcement ? "Dəyişiklikləri saxla" : draft.status === "draft" ? "Qaralama saxla" : "Elanı yadda saxla"}</Button></div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="announcement-field"><label>{label}</label>{children}</div>;
}