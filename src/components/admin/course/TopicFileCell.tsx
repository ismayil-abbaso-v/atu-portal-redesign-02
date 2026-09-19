import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

import { TopicFilesDialog } from "@/components/admin/course/TopicFilesDialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import type { CourseTopic } from "@/lib/courses";

const db = supabase as any;

export function TopicFileCell({ topic }: { topic: CourseTopic }) {
  const [open, setOpen] = useState(false);
  const { t } = useCourseManagementI18n();
  const { data: count = topic.fayl_url ? 1 : 0 } = useQuery({
    queryKey: ["course-topic-file-count", topic.id],
    queryFn: async () => {
      const { count: value, error } = await db.from("course_topic_files").select("id", { count: "exact", head: true }).eq("topic_id", topic.id).eq("course_id", topic.course_id);
      if (error) throw error;
      return value ?? (topic.fayl_url ? 1 : 0);
    },
  });

  if (count <= 0 && !topic.fayl_url) return <FileText className="mx-auto size-4 text-muted-foreground/35" />;

  return (
    <>
      <button type="button" aria-label={t("files.showAria", { count: count || 1 })} className="relative inline-flex size-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10" onClick={() => setOpen(true)}>
        <Download className="size-4" />
        {(count || 1) > 1 ? <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">{count}</span> : null}
      </button>
      <TopicFilesDialog açıq={open} onOpenChange={setOpen} topic={topic} />
    </>
  );
}
