import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { QiymetlendirmeNovuPanel } from "@/components/admin/course/QiymetlendirmeNovuPanel";
import { RiskStudentsPanel } from "@/components/admin/group/RiskStudentsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type TutorCourse = Pick<
  CourseRow,
  | "id"
  | "ad"
  | "qiymetlendirme_novu"
  | "kurs_isi_var"
  | "umumi_lab_sayi"
  | "umumi_ders_saati"
>;

const COURSE_SELECT =
  "id, ad, qiymetlendirme_novu, kurs_isi_var, umumi_lab_sayi, umumi_ders_saati" as const;

export function TutorJournalManagement({ groupId }: { groupId: string }) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const courseQueryKey = ["tutor-journal-courses", groupId] as const;

  const { data: courses = [], isLoading } = useQuery<TutorCourse[]>({
    queryKey: courseQueryKey,
    enabled: !!groupId,
    queryFn: async () => {
      const [{ data: directCourses, error: directError }, { data: links, error: linkError }] =
        await Promise.all([
          supabase.from("courses").select(COURSE_SELECT).eq("group_id", groupId).order("ad"),
          supabase.from("course_groups").select("course_id").eq("group_id", groupId),
        ]);

      if (directError) throw directError;
      if (linkError) throw linkError;

      const linkedIds = [...new Set((links ?? []).map((link) => link.course_id))];
      let linkedCourses: TutorCourse[] = [];
      if (linkedIds.length > 0) {
        const { data, error } = await supabase
          .from("courses")
          .select(COURSE_SELECT)
          .in("id", linkedIds)
          .order("ad");
        if (error) throw error;
        linkedCourses = (data ?? []) as TutorCourse[];
      }

      const unique = new Map<string, TutorCourse>();
      for (const course of [...((directCourses ?? []) as TutorCourse[]), ...linkedCourses]) {
        unique.set(course.id, course);
      }
      return [...unique.values()].sort((a, b) => a.ad.localeCompare(b.ad));
    },
  });

  useEffect(() => {
    if (courses.length === 0) {
      setSelectedCourseId("");
      return;
    }
    if (!courses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(courses[0]!.id);
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpenCheck className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Elektron Jurnal nəzarəti</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Öz qrupunuzun fənn qiymətləndirməsini və risk siyahısını idarə edin.
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-muted p-1">
          <TabsTrigger value="settings" className="rounded-lg font-bold">
            Fənn tənzimləmələri
          </TabsTrigger>
          <TabsTrigger value="risk" className="rounded-lg font-bold">
            Risk siyahısı
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 focus-visible:outline-none">
          {isLoading ? (
            <div className="flex min-h-36 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
              <p className="text-sm font-medium">Bu qrupa bağlı fənn tapılmadı.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fənn qrupa təyin edildikdən sonra qiymətləndirmə tənzimləmələri burada görünəcək.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Fənn
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.ad}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse ? (
                <QiymetlendirmeNovuPanel
                  courseId={selectedCourse.id}
                  qiymetlendirmeNovu={selectedCourse.qiymetlendirme_novu}
                  kursIsiVar={selectedCourse.kurs_isi_var}
                  umumiLabSayi={selectedCourse.umumi_lab_sayi}
                  umumiDersSaati={selectedCourse.umumi_ders_saati}
                  cacheQueryKey={courseQueryKey}
                />
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risk" className="mt-4 focus-visible:outline-none">
          <RiskStudentsPanel groupId={groupId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
