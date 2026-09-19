import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Paperclip, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { DARS_NOVLERI, MAX_COURSE_FAYL_OLCUSU, TOPIC_FAYL_KATEQORIYALARI, courseFayliSil, courseFayliYukle, type CourseTopic, type CourseTopicFile, type DarsNovu, type TopicFaylKateqoriyasi } from "@/lib/courses";
import { cn } from "@/lib/utils";

type PendingFile = { localId: string; category: TopicFaylKateqoriyasi; file: File };
const db = supabase as any;

export function TopicFormDialog({ açıq, onOpenChange, courseId, movzu, defaultDarsNovu, aktivDarsNovleri }: { açıq: boolean; onOpenChange: (value: boolean) => void; courseId: string; movzu: CourseTopic | null; defaultDarsNovu?: DarsNovu; aktivDarsNovleri: Record<string, boolean> }) {
  const queryClient = useQueryClient();
  const { t, lessonTypeLabel, topicFileCategoryLabel } = useCourseManagementI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategoryRef = useRef<TopicFaylKateqoriyasi>("primary");
  const activeTypes = useMemo(() => DARS_NOVLERI.filter((type) => !!aktivDarsNovleri[type]), [aktivDarsNovleri]);
  const typeOptions = useMemo(() => { const current = movzu?.dars_novu as DarsNovu | undefined; return current && !activeTypes.includes(current) ? [current, ...activeTypes] : activeTypes; }, [activeTypes, movzu?.dars_novu]);

  const [lessonType, setLessonType] = useState<DarsNovu>("muhazire");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  useEffect(() => {
    if (!açıq) return;
    if (movzu) {
      setLessonType(movzu.dars_novu as DarsNovu); setTitle(movzu.movzu); setDate(movzu.tarix); setStartTime(movzu.bas_saat ?? ""); setEndTime(movzu.bit_saat ?? ""); setDescription(movzu.aciqlama ?? "");
    } else {
      const preferred = defaultDarsNovu && activeTypes.includes(defaultDarsNovu) ? defaultDarsNovu : activeTypes[0] ?? "muhazire";
      setLessonType(preferred); setTitle(""); setDate(new Date().toISOString().slice(0, 10)); setStartTime(""); setEndTime(""); setDescription("");
    }
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [açıq, activeTypes, defaultDarsNovu, movzu]);

  const { data: topicFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["course-topic-files", movzu?.id], enabled: açıq && !!movzu?.id,
    queryFn: async (): Promise<CourseTopicFile[]> => {
      const { data, error } = await db.from("course_topic_files").select("id, topic_id, course_id, category, file_url, file_name, mime_type, size_bytes, created_at").eq("topic_id", movzu!.id).eq("course_id", courseId).order("created_at");
      if (error) throw error; return (data ?? []) as CourseTopicFile[];
    },
  });

  function chooseFiles(category: TopicFaylKateqoriyasi) { activeCategoryRef.current = category; if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); } }
  function acceptFiles(list: FileList | null) { if (!list?.length) return; const category = activeCategoryRef.current; setPendingFiles((current) => [...current, ...Array.from(list).map((file) => ({ localId: crypto.randomUUID(), category, file }))]); }

  const deleteFileMutation = useMutation({
    mutationFn: async (file: CourseTopicFile) => {
      const { error } = await db.from("course_topic_files").delete().eq("id", file.id).eq("course_id", courseId); if (error) throw new Error(error.message);
      try { await courseFayliSil(file.file_url); } catch { /* best effort */ }
      if (movzu?.fayl_url === file.file_url) { const { error: legacyError } = await supabase.from("course_topics").update({ fayl_url: null, fayl_kateqoriyasi: null }).eq("id", movzu.id).eq("course_id", courseId); if (legacyError) throw new Error(legacyError.message); }
    },
    onSuccess: async () => { toast.success(t("topic.fileDeleteSuccess")); await Promise.all([queryClient.invalidateQueries({ queryKey: ["course-topic-files", movzu?.id] }), queryClient.invalidateQueries({ queryKey: ["course-topic-files-map", courseId] }), queryClient.invalidateQueries({ queryKey: ["course-topics", courseId] })]); },
    onError: (error: Error) => toast.error(error.message || t("topic.fileDeleteError")),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error(t("topic.titleError"));
      if (!date) throw new Error(t("topic.dateError"));
      if (!movzu && (!activeTypes.length || !activeTypes.includes(lessonType))) throw new Error(t("topic.noActiveType"));
      if (startTime && endTime && startTime > endTime) throw new Error(t("topic.timeError"));
      const largeFile = pendingFiles.find((item) => item.file.size > MAX_COURSE_FAYL_OLCUSU); if (largeFile) throw new Error(t("topic.fileSizeError", { file: largeFile.file.name }));
      const row = { course_id: courseId, dars_novu: lessonType, movzu: title.trim(), tarix: date, bas_saat: startTime || null, bit_saat: endTime || null, aciqlama: description.trim() || null, sira: movzu?.sira ?? 0 };
      let topicId = movzu?.id ?? null; let created = false; const uploadedPaths: string[] = []; const writtenFiles: Array<{ category: TopicFaylKateqoriyasi; path: string }> = [];
      try {
        if (movzu) { const { error } = await supabase.from("course_topics").update(row).eq("id", movzu.id).eq("course_id", courseId); if (error) throw new Error(error.message); }
        else { const { data, error } = await supabase.from("course_topics").insert(row).select("id").single(); if (error || !data) throw new Error(error?.message || t("topic.createError")); topicId = data.id; created = true; }
        for (const selection of pendingFiles) {
          const path = await courseFayliYukle(courseId, selection.file); uploadedPaths.push(path);
          const { error } = await db.from("course_topic_files").insert({ topic_id: topicId, course_id: courseId, category: selection.category, file_url: path, file_name: selection.file.name, mime_type: selection.file.type || null, size_bytes: selection.file.size });
          if (error) throw new Error(error.message); writtenFiles.push({ category: selection.category, path });
        }
        if (topicId && writtenFiles.length && !movzu?.fayl_url) { const primary = writtenFiles.find((item) => item.category === "primary") ?? writtenFiles[0]; const { error } = await supabase.from("course_topics").update({ fayl_url: primary.path, fayl_kateqoriyasi: primary.category === "primary" ? null : primary.category }).eq("id", topicId).eq("course_id", courseId); if (error) throw new Error(error.message); }
        return topicId;
      } catch (error) {
        if (uploadedPaths.length) await supabase.storage.from("course-materials").remove(uploadedPaths);
        if (created && topicId) await supabase.from("course_topics").delete().eq("id", topicId).eq("course_id", courseId);
        throw error;
      }
    },
    onSuccess: async (topicId) => { toast.success(movzu ? t("topic.editSuccess") : t("topic.addSuccess")); setPendingFiles([]); await Promise.all([queryClient.invalidateQueries({ queryKey: ["course-topics", courseId] }), queryClient.invalidateQueries({ queryKey: ["course-topic-files", topicId] }), queryClient.invalidateQueries({ queryKey: ["course-topic-files-map", courseId] })]); onOpenChange(false); },
    onError: (error: Error) => toast.error(error.message || t("topic.saveError")),
  });

  const busy = saveMutation.isPending || deleteFileMutation.isPending;
  return (
    <Dialog open={açıq} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-2xl gap-0 overflow-y-auto rounded-[28px] border border-border/70 bg-card p-0 shadow-[0_24px_80px_rgba(31,15,19,0.22)] sm:max-h-[90vh]">
        <DialogHeader data-dialog-header className="shrink-0 border-b border-border/70 bg-card px-4 py-5 pr-14 text-left sm:px-6 sm:pr-20"><DialogTitle className="text-xl leading-tight tracking-[-0.02em]">{movzu ? t("topic.editTitle") : t("topic.addTitle")}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
          <div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.type")}</label><Select value={lessonType} onValueChange={(value) => setLessonType(value as DarsNovu)} disabled={busy || (!movzu && !typeOptions.length)}><SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{typeOptions.map((type) => <SelectItem key={type} value={type}>{lessonTypeLabel(type)}</SelectItem>)}</SelectContent></Select>{!movzu && !typeOptions.length ? <p className="mt-1.5 text-xs text-destructive">{t("topic.noActiveType")}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.title")}</label><Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} className="min-h-11 rounded-xl" /></div>
          <div className="grid gap-2 sm:grid-cols-3"><div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.date")}</label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} className="min-h-11 rounded-xl" /></div><div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.start")}</label><Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={busy} className="min-h-11 rounded-xl" /></div><div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.end")}</label><Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={busy} className="min-h-11 rounded-xl" /></div></div>
          <div><label className="mb-1 block text-sm font-medium text-muted-foreground">{t("topic.description")}</label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} className="rounded-xl" rows={3} placeholder={t("topic.descriptionPlaceholder")} /></div>
          <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{t("topic.files")}</p><p className="mt-0.5 text-xs text-muted-foreground">{t("topic.filesHint")}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{topicFiles.length + pendingFiles.length}</span></div>
            {filesLoading ? <div className="flex justify-center rounded-2xl border border-dashed border-border py-5"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div> : topicFiles.length || pendingFiles.length ? <div className="space-y-2">{topicFiles.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{file.file_name}</p><p className="text-[11px] font-semibold text-muted-foreground">{file.category === "primary" ? lessonTypeLabel(lessonType) : topicFileCategoryLabel(file.category)}</p></div></div><button type="button" aria-label={t("topic.fileDeleteAria")} disabled={busy} onClick={() => deleteFileMutation.mutate(file)} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"><Trash2 className="size-3.5" /></button></div>)}{pendingFiles.map((selection) => <div key={selection.localId} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.025] px-3 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UploadCloud className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{selection.file.name}</p><p className="text-[11px] font-semibold text-primary">{selection.category === "primary" ? lessonTypeLabel(lessonType) : topicFileCategoryLabel(selection.category)} · {t("topic.pending")}</p></div></div><button type="button" aria-label={t("topic.pendingAria")} disabled={busy} onClick={() => setPendingFiles((current) => current.filter((file) => file.localId !== selection.localId))} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><X className="size-3.5" /></button></div>)}</div> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{TOPIC_FAYL_KATEQORIYALARI.map((category) => <button key={category} type="button" disabled={busy} onClick={() => chooseFiles(category)} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed px-2 text-xs font-semibold transition-colors", "border-primary/35 bg-primary/[0.025] text-primary hover:border-primary/60 hover:bg-primary/[0.06] disabled:opacity-50")}><Paperclip className="size-3.5 shrink-0" /><span className="truncate">{category === "primary" ? lessonTypeLabel(lessonType) : topicFileCategoryLabel(category)}</span></button>)}</div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => acceptFiles(event.target.files)} /><p className="text-[11px] text-muted-foreground">{t("topic.max")}</p>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 border-t border-border/70 bg-card/95 px-4 pb-4 pt-3 backdrop-blur sm:px-6 sm:pb-5 sm:pt-4"><Button className="min-h-11 w-full rounded-xl" disabled={busy || !title.trim() || !date || (!movzu && !activeTypes.length)} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{t("topic.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
