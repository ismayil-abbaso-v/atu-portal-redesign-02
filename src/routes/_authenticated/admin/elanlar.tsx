import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  Copy,
  Eye,
  FilePenLine,
  Megaphone,
  Pencil,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { AnnouncementEditor } from "@/components/announcements/AnnouncementEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_RUNTIME_LABELS,
  announcementAudienceText,
  announcementRuntimeStatus,
  getAnnouncementCover,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementStatus,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";
import "@/announcements-premium.css";

export const Route = createFileRoute("/_authenticated/admin/elanlar")({
  head: () => ({ meta: [{ title: "Elanlar — Admin — ATU Şəxsi Kabinet" }] }),
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcements")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    staleTime: 10_000,
  });

  const readStatsQuery = useQuery({
    queryKey: ["admin-announcement-read-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("announcement_reads").select("announcement_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = typeof row?.announcement_id === "string" ? row.announcement_id : "";
        if (!id) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 10_000,
  });

  const audienceOptionsQuery = useQuery({
    queryKey: ["announcement-audience-options"],
    queryFn: async () => {
      const [{ data: faculties }, { data: groups }] = await Promise.all([
        (supabase as any).from("faculties").select("ad").order("ad"),
        (supabase as any).from("groups").select("ad").eq("arxivlenib", false).order("ad"),
      ]);
      return {
        faculties: [...new Set((faculties ?? []).map((item: any) => String(item.ad)).filter(Boolean))] as string[],
        groups: [...new Set((groups ?? []).map((item: any) => String(item.ad)).filter(Boolean))] as string[],
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-announcements-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reads" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-announcement-read-stats"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    if (!deleteTarget) return;
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setDeleteTarget(null); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteTarget]);

  const items = Array.isArray(announcementsQuery.data)
    ? announcementsQuery.data.filter((item): item is Announcement => Boolean(item && typeof item.id === "string" && typeof item.title === "string"))
    : [];

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("az-AZ");
    return items.filter((item) => {
      const runtime = announcementRuntimeStatus(item);
      if (statusFilter !== "all" && runtime !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!term) return true;
      return `${item.title} ${item.summary ?? ""} ${item.body ?? ""} ${item.audience_value ?? ""}`.toLocaleLowerCase("az-AZ").includes(term);
    });
  }, [categoryFilter, items, search, statusFilter]);

  const stats = useMemo(() => {
    const runtime = items.map((item) => announcementRuntimeStatus(item));
    return {
      active: runtime.filter((value) => value === "active").length,
      scheduled: runtime.filter((value) => value === "scheduled").length,
      drafts: runtime.filter((value) => value === "draft").length,
      reads: Object.values(readStatsQuery.data ?? {}).reduce((sum, value) => sum + Number(value || 0), 0),
    };
  }, [items, readStatsQuery.data]);

  function openCreate() {
    setEditing(null);
    setFeedback(null);
    setEditorOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setFeedback(null);
    setEditorOpen(true);
  }

  async function refreshAnnouncements() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-announcement-read-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["student-announcements"] }),
      queryClient.invalidateQueries({ queryKey: ["student-announcements-home"] }),
    ]);
  }

  async function setStatus(item: Announcement, status: AnnouncementStatus) {
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("announcements")
      .update({ status, updated_by: authData.user?.id ?? null })
      .eq("id", item.id);
    if (error) setFeedback({ type: "error", text: error.message });
    else await refreshAnnouncements();
  }

  async function duplicate(item: Announcement) {
    const { data: authData } = await supabase.auth.getUser();
    const { id: _id, created_at: _created, updated_at: _updated, ...copy } = item;
    const { error } = await (supabase as any).from("announcements").insert({
      ...copy,
      title: `${item.title} — surət`,
      status: "draft",
      is_featured: false,
      created_by: authData.user?.id ?? null,
      updated_by: authData.user?.id ?? null,
    });
    if (error) setFeedback({ type: "error", text: error.message });
    else await refreshAnnouncements();
  }

  async function removeAnnouncement() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("announcements").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) return setFeedback({ type: "error", text: error.message });
    setDeleteTarget(null);
    await refreshAnnouncements();
  }

  return (
    <div className="announcement-shell pb-8">
      <PageHeader baslıq="Elanlar">
        <Button onClick={openCreate} className="rounded-xl"><Plus className="mr-2 size-4" /> Yeni elan</Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Aktiv elan" value={stats.active} icon={Megaphone} />
        <AdminStat label="Planlaşdırılıb" value={stats.scheduled} icon={CalendarClock} />
        <AdminStat label="Qaralama" value={stats.drafts} icon={FilePenLine} />
        <AdminStat label="Unikal oxunma" value={stats.reads} icon={Eye} />
      </div>

      {feedback ? (
        <div className={cn("mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold", feedback.type === "error" ? "border-destructive/20 bg-destructive/8 text-destructive" : "border-primary/20 bg-primary/8 text-primary")}>
          <span>{feedback.text}</span><button onClick={() => setFeedback(null)}><X className="size-4" /></button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Başlıq, mətn və auditoriyada axtar..." className="rounded-2xl pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full rounded-2xl lg:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            {Object.entries(ANNOUNCEMENT_RUNTIME_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full rounded-2xl lg:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
            {(Object.entries(ANNOUNCEMENT_CATEGORY_LABELS) as [AnnouncementCategory, string][]).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(130px,.65fr)_minmax(120px,.55fr)_minmax(105px,.48fr)_auto] gap-4 border-b border-border bg-muted/30 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-muted-foreground lg:grid">
          <span>Elan</span><span>Auditoriya</span><span>Status</span><span>Oxunma</span><span className="text-right">Əməliyyat</span>
        </div>
        {announcementsQuery.isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : filtered.length ? (
          filtered.map((item) => {
            const runtime = announcementRuntimeStatus(item);
            const reads = Number(readStatsQuery.data?.[item.id] ?? 0);
            const cover = getAnnouncementCover(item);
            const mediaCount = Array.isArray(item.media) ? item.media.length : item.image_url ? 1 : 0;
            return (
              <div key={item.id} className="announcement-admin-row">
                <div className="flex min-w-0 items-center gap-3">
                  {cover ? <img src={cover.url} alt="" className="size-14 shrink-0 rounded-2xl border border-border object-cover" /> : <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary"><Megaphone className="size-5" /></span>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="truncate text-sm font-extrabold text-foreground">{item.title}</p>{item.is_featured ? <Pin className="size-3.5 shrink-0 text-[var(--portal-gold)]" /> : null}</div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary || item.body}</p>
                    <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{mediaCount ? `${mediaCount} şəkil · ` : ""}<span className="lg:hidden">{announcementAudienceText(item)} · {ANNOUNCEMENT_RUNTIME_LABELS[runtime]} · {reads} oxunma</span></p>
                  </div>
                </div>
                <div className="announcement-admin-hide-tablet text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><UsersRound className="size-3.5" />{announcementAudienceText(item)}</span></div>
                <div className="announcement-admin-hide-tablet"><StatusBadge status={runtime} /></div>
                <div className="announcement-admin-hide-tablet"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground"><Eye className="size-3.5 text-muted-foreground" /> {reads}</span></div>
                <div className="flex items-center justify-end gap-1">
                  {item.status === "draft" ? <button title="Yayımla" onClick={() => void setStatus(item, "published")} className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"><Send className="size-4" /></button> : null}
                  <button title="Redaktə et" onClick={() => openEdit(item)} className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                  <button title="Surətini yarat" onClick={() => void duplicate(item)} className="hidden size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"><Copy className="size-4" /></button>
                  {item.status !== "archived" ? <button title="Arxivlə" onClick={() => void setStatus(item, "archived")} className="hidden size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"><Archive className="size-4" /></button> : null}
                  <button title="Sil" onClick={() => setDeleteTarget(item)} className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="announcement-empty m-4 flex min-h-64 items-center justify-center p-8 text-center"><div className="relative z-10"><Megaphone className="mx-auto mb-3 size-9 text-muted-foreground/45" /><h2 className="text-sm font-bold text-foreground">Elan tapılmadı</h2><p className="mt-1 text-xs text-muted-foreground">Filtrləri dəyişin və ya yeni elan yaradın.</p></div></div>
        )}
      </div>

      <AnnouncementEditor
        open={editorOpen}
        announcement={editing}
        faculties={audienceOptionsQuery.data?.faculties ?? []}
        groups={audienceOptionsQuery.data?.groups ?? []}
        onClose={() => setEditorOpen(false)}
        onSaved={refreshAnnouncements}
      />

      {deleteTarget && typeof document !== "undefined" ? createPortal(
        <div className="announcement-modal-backdrop announcement-modal-backdrop--portal" onMouseDown={(event) => { if (event.currentTarget === event.target) setDeleteTarget(null); }}>
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 className="size-5" /></span>
            <h2 className="font-display text-xl font-semibold text-foreground">Elanı silmək istəyirsiniz?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground"><b className="text-foreground">{deleteTarget.title}</b> və onun bütün oxunma statistikası silinəcək. Bu əməliyyat geri qaytarılmır.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">Ləğv et</Button><Button variant="destructive" disabled={deleting} onClick={() => void removeAnnouncement()} className="rounded-xl"><Trash2 className="mr-2 size-4" />{deleting ? "Silinir..." : "Bəli, sil"}</Button></div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function AdminStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Megaphone }) {
  return <div className="announcement-admin-stat"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{label}</span><div className="relative z-10 mt-1.5 flex items-end gap-2"><b className="font-data text-2xl text-foreground">{value}</b><Icon className="mb-1 size-4 text-primary" /></div></div>;
}

function StatusBadge({ status }: { status: ReturnType<typeof announcementRuntimeStatus> }) {
  const styles = { active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300", draft: "bg-muted text-muted-foreground", archived: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300", expired: "bg-amber-500/10 text-amber-700 dark:text-amber-300" } as const;
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold", styles[status])}>{ANNOUNCEMENT_RUNTIME_LABELS[status]}</span>;
}
