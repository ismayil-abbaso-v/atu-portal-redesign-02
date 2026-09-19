import { useQuery } from "@tanstack/react-query";
import { FileCheck2, FileClock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { examMaterialKeys, fetchExamMaterials } from "@/lib/exam-materials";
import { useExamMaterialI18n } from "@/lib/exam-material-i18n";
import type { TutorCourseLite, TutorPeriod } from "@/lib/tutor-workspace-data";

export function TutorExamMaterialStatus({
  userId,
  groupId,
  courses,
  period,
}: {
  userId: string;
  groupId: string;
  courses: TutorCourseLite[];
  period: TutorPeriod | null | undefined;
}) {
  const { t } = useExamMaterialI18n();
  const courseIds = courses.map((course) => course.id);
  const query = useQuery({
    queryKey: examMaterialKeys.scope(userId, "tyutor", period?.year ?? "", period?.semester ?? null, groupId ? [groupId] : [], courseIds),
    enabled: Boolean(groupId && period?.year && period?.semester && courseIds.length),
    queryFn: () => fetchExamMaterials({
      academicYear: period!.year!,
      semester: period!.semester!,
      groupIds: [groupId],
      courseIds,
    }),
  });

  if (!courses.length) return null;

  return (
    <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("tutor.hint")}</p>
      </div>
      {query.isLoading ? <div className="flex min-h-16 items-center justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div> : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const materials = (query.data ?? []).filter((material) => material.course_id === course.id && material.group_id === groupId);
            return <div key={course.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground" title={course.ad}>{course.ad}</p>{materials.length ? <p className="mt-0.5 text-[11px] text-muted-foreground">{materials.map((material) => t(material.exam_type === "ticket" ? "type.ticket" : "type.test")).join(" · ")}</p> : null}</div>
              <Badge variant={materials.length ? "default" : "secondary"} className="shrink-0 gap-1 rounded-full"><span className="sr-only">{course.ad}: </span>{materials.length ? <FileCheck2 className="size-3.5" /> : <FileClock className="size-3.5" />}{materials.length ? t("tutor.ready") : t("tutor.waiting")}</Badge>
            </div>;
          })}
        </div>
      )}
    </section>
  );
}
