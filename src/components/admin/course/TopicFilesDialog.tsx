import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { courseFayliEndir, type CourseTopic, type CourseTopicFile, type DarsNovu } from "@/lib/courses";

const db = supabase as any;

export function TopicFilesDialog({ açıq, onOpenChange, topic }: { açıq: boolean; onOpenChange: (value: boolean) => void; topic: CourseTopic | null }) {
  const { t, lessonTypeLabel, topicFileCategoryLabel } = useCourseManagementI18n();
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["course-topic-files", topic?.id],
    enabled: açıq && !!topic?.id,
    queryFn: async (): Promise<CourseTopicFile[]> => {
      const { data, error } = await db.from("course_topic_files").select("id, topic_id, course_id, category, file_url, file_name, mime_type, size_bytes, created_at").eq("topic_id", topic!.id).eq("course_id", topic!.course_id).order("created_at");
      if (error) throw error;
      const rows = (data ?? []) as CourseTopicFile[];
      if (rows.length) return rows;
      if (topic?.fayl_url) {
        return [{ id: `legacy-${topic.id}`, topic_id: topic.id, course_id: topic.course_id, category: "primary", file_url: topic.fayl_url, file_name: topic.fayl_url.split("/").pop() || t("files.legacyName"), mime_type: null, size_bytes: null, created_at: topic.created_at }];
      }
      return [];
    },
  });

  async function download(path: string) {
    try { await courseFayliEndir(path); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("files.downloadError")); }
  }

  return (
    <Dialog open={açıq} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Paperclip className="size-5 text-primary" />{t("files.title")}</DialogTitle></DialogHeader>
        {topic ? <div className="mb-1 rounded-2xl bg-muted/35 px-3 py-2.5"><p className="line-clamp-2 text-sm font-medium text-foreground">{topic.movzu}</p></div> : null}
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> : !files.length ? <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center"><FileText className="mx-auto mb-2 size-7 text-muted-foreground/60" /><p className="text-sm font-medium">{t("files.empty")}</p></div> : <div className="space-y-2">{files.map((file) => {
          const category = file.category === "primary" ? lessonTypeLabel(topic!.dars_novu as DarsNovu) : topicFileCategoryLabel(file.category);
          return <button key={file.id} type="button" onClick={() => void download(file.file_url)} className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.035] active:scale-[0.99]"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Download className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{category}</span><span className="block truncate text-xs text-muted-foreground">{file.file_name}</span></span></button>;
        })}</div>}
      </DialogContent>
    </Dialog>
  );
}
