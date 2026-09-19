import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { MAX_COURSE_FAYL_OLCUSU, courseFayliEndir, courseFayliSil, courseFayliYukle } from "@/lib/courses";
import { cn } from "@/lib/utils";

export function SyllabusUploadDialog({ açıq, onOpenChange, courseId }: { açıq: boolean; onOpenChange: (deyer: boolean) => void; courseId: string }) {
  const queryClient = useQueryClient();
  const { t } = useCourseManagementI18n();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentSyllabus, isLoading } = useQuery({
    queryKey: ["course-syllabus", courseId],
    enabled: açıq,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("sillabus_url").eq("id", courseId).single();
      if (error) throw error;
      return data.sillabus_url;
    },
  });

  function reset() {
    setSelectedFile(null);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error(t("syllabus.chooseError"));
      if (selectedFile.size > MAX_COURSE_FAYL_OLCUSU) throw new Error(t("syllabus.sizeError"));
      const newPath = await courseFayliYukle(courseId, selectedFile);
      const { error } = await supabase.from("courses").update({ sillabus_url: newPath }).eq("id", courseId);
      if (error) {
        try { await courseFayliSil(newPath); } catch { /* best effort */ }
        throw new Error(error.message);
      }
      if (currentSyllabus && currentSyllabus !== newPath) {
        try { await courseFayliSil(currentSyllabus); } catch { /* best effort */ }
      }
    },
    onSuccess: async () => {
      toast.success(currentSyllabus ? t("syllabus.updateSuccess") : t("syllabus.uploadSuccess"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["course-syllabus", courseId] }),
      ]);
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || t("syllabus.uploadError")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentSyllabus) return;
      const { error } = await supabase.from("courses").update({ sillabus_url: null }).eq("id", courseId);
      if (error) throw new Error(error.message);
      try { await courseFayliSil(currentSyllabus); } catch { /* best effort */ }
    },
    onSuccess: async () => {
      toast.success(t("syllabus.deleteSuccess"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["course-syllabus", courseId] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message || t("syllabus.deleteError")),
  });

  async function download() {
    if (!currentSyllabus) return;
    try { await courseFayliEndir(currentSyllabus); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("syllabus.downloadError")); }
  }

  function acceptFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_COURSE_FAYL_OLCUSU) {
      toast.error(t("syllabus.sizeError"));
      return;
    }
    setSelectedFile(file);
  }

  const busy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={açıq} onOpenChange={(value) => { if (busy) return; onOpenChange(value); if (!value) reset(); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader><DialogTitle>{t("syllabus.title")}</DialogTitle></DialogHeader>

        {isLoading ? <div className="flex justify-center py-5"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> : currentSyllabus ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span>
              <div className="min-w-0"><p className="text-sm font-semibold">{t("syllabus.current")}</p><p className="truncate text-xs text-muted-foreground">{t("syllabus.currentHint")}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" aria-label={t("syllabus.downloadAria")} className="flex size-11 items-center justify-center rounded-xl text-primary hover:bg-primary/10" onClick={() => void download()}><Download className="size-4" /></button>
              <button type="button" aria-label={t("syllabus.deleteAria")} disabled={busy} className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" onClick={() => deleteMutation.mutate()}>{deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>
            </div>
          </div>
        ) : null}

        <div
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); if (busy) return; setDragging(false); acceptFiles(event.dataTransfer.files); }}
          onClick={() => !busy && fileInputRef.current?.click()}
          className={cn("flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:p-6", busy ? "cursor-not-allowed opacity-60" : "cursor-pointer", dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/45")}
        >
          <UploadCloud className={cn("size-9", dragging ? "text-primary" : "text-primary/80")} />
          {selectedFile ? (
            <div className="flex max-w-full items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-sm font-bold shadow-sm">
              <span className="max-w-[230px] truncate sm:max-w-[300px]">{selectedFile.name}</span>
              {!busy ? <button type="button" aria-label={t("syllabus.clearAria")} onClick={(event) => { event.stopPropagation(); reset(); }} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button> : null}
            </div>
          ) : <><p className="max-w-sm text-sm font-bold">{currentSyllabus ? t("syllabus.selectReplace") : t("syllabus.select")}</p><p className="text-xs text-muted-foreground">{t("syllabus.max")}</p></>}
          <input ref={fileInputRef} type="file" className="hidden" disabled={busy} onChange={(event) => acceptFiles(event.target.files)} />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={() => { onOpenChange(false); reset(); }} className="min-h-11 rounded-xl">{t("common.cancel")}</Button>
          <Button type="button" disabled={!selectedFile || busy} onClick={() => uploadMutation.mutate()} className="min-h-11 gap-2 rounded-xl">{uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{currentSyllabus ? t("syllabus.update") : t("syllabus.upload")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
