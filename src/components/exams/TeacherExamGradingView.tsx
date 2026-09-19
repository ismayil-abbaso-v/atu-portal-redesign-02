import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Calendar, CheckCircle2, CircleAlert, Clock3, Eye, GraduationCap, Loader2, MapPin, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ExamsOverviewHero } from "@/components/exams/ExamsOverviewHero";
import { TeacherExamMaterialsPanel } from "@/components/exams/TeacherExamMaterialsPanel";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import { useTeacherExamI18n } from "@/lib/teacher-exam-i18n";
import { cn } from "@/lib/utils";

type Course = { id: string; ad: string };
type CourseGroup = { course_id: string; group_id: string; groups: { ad: string } | null };
type Student = { user_id: string; ad: string | null; soyad: string | null; istifadeci_adi: string | null; groupName: string };
type ScoreRow = {
  id: string;
  user_id: string;
  course_id: string | null;
  semestr_qiymeti: number | null;
  imtahan_bali: number | null;
  yekun_qiymet: number | null;
  tedris_ili: string | null;
  semestr: number | null;
};
type ExamSchedule = {
  id: string;
  course_id: string;
  group_id: string;
  imtahan_tarixi: string;
  baslangic_saat: string;
  otaq: string;
  groups: { ad: string } | null;
};
type SaveState = "idle" | "editing" | "pending" | "saved" | "error";

type TeacherExamGradingViewProps = {
  userId: string;
  readOnly?: boolean;
};

function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (["payız", "payiz", "fall", "autumn", "güz"].includes(normalized) || normalized.startsWith("1")) return 1;
  if (["yaz", "spring", "bahar"].includes(normalized) || normalized.startsWith("2")) return 2;
  return null;
}

function studentName(student: Pick<Student, "ad" | "soyad" | "istifadeci_adi">, fallback: string) {
  return [student.ad, student.soyad].filter(Boolean).join(" ") || student.istifadeci_adi || fallback;
}

function formatScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(2);
}

export function TeacherExamGradingView({ userId, readOnly = false }: TeacherExamGradingViewProps) {
  const { t } = useTeacherExamI18n();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [examEdits, setExamEdits] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const periodQuery = useQuery({
    queryKey: ["teacher-exams", "period", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("cari_tedris_ili, cari_semestr")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const academicYear = periodQuery.data?.cari_tedris_ili?.trim() ?? "";
  const semesterNo = semesterNumber(periodQuery.data?.cari_semestr);

  const assignmentQuery = useQuery<{ courses: Course[]; links: CourseGroup[] }>({
    queryKey: ["teacher-exams", "assignments", userId, academicYear, semesterNo],
    enabled: Boolean(academicYear && semesterNo),
    queryFn: async () => {
      const { data: teacherLinks, error: teacherError } = await supabase
        .from("course_teachers")
        .select("course_id")
        .eq("muellim_id", userId);
      if (teacherError) throw teacherError;
      const assignedIds = [...new Set((teacherLinks ?? []).map((row) => row.course_id))];
      if (!assignedIds.length) return { courses: [], links: [] };

      const { data: links, error: linksError } = await supabase
        .from("course_groups")
        .select("course_id, group_id, groups(ad)")
        .in("course_id", assignedIds)
        .eq("tedris_ili", academicYear)
        .eq("semestr", semesterNo!);
      if (linksError) throw linksError;
      const currentLinks = (links ?? []) as unknown as CourseGroup[];
      const currentCourseIds = [...new Set(currentLinks.map((row) => row.course_id))];
      if (!currentCourseIds.length) return { courses: [], links: currentLinks };

      const { data: courses, error: courseError } = await supabase
        .from("courses")
        .select("id, ad")
        .in("id", currentCourseIds)
        .order("ad");
      if (courseError) throw courseError;
      return { courses: (courses ?? []) as Course[], links: currentLinks };
    },
  });

  const courses = assignmentQuery.data?.courses ?? [];
  const allLinks = assignmentQuery.data?.links ?? [];

  useEffect(() => {
    if (courses.length && !courses.some((course) => course.id === selectedCourseId)) setSelectedCourseId(courses[0]!.id);
    if (!courses.length && selectedCourseId) setSelectedCourseId("");
  }, [courses, selectedCourseId]);

  const selectedLinks = useMemo(() => allLinks.filter((row) => row.course_id === selectedCourseId), [allLinks, selectedCourseId]);

  const studentsQuery = useQuery<Student[]>({
    queryKey: ["teacher-exams", "roster", userId, selectedCourseId, selectedLinks.map((row) => row.group_id).sort().join(",")],
    enabled: Boolean(selectedCourseId && selectedLinks.length),
    queryFn: async () => {
      const rows = await Promise.all(selectedLinks.map(async (link) => {
        const { data, error } = await supabase.rpc("teacher_assessment_roster", {
          p_course_id: selectedCourseId,
          p_group_id: link.group_id,
        });
        if (error) throw error;
        return ((data ?? []) as Array<{ user_id: string; ad: string | null; soyad: string | null; istifadeci_adi: string | null }>).map((student) => ({
          ...student,
          groupName: link.groups?.ad ?? "—",
        }));
      }));
      const map = new Map<string, Student>();
      rows.flat().forEach((student) => { if (!map.has(student.user_id)) map.set(student.user_id, student); });
      return [...map.values()].sort((a, b) => compareStudentProfilesBySurnameThenName(a, b));
    },
  });

  const students = studentsQuery.data ?? [];

  const scoresQuery = useQuery<ScoreRow[]>({
    queryKey: ["teacher-exams", "scores", userId, selectedCourseId, academicYear, semesterNo],
    enabled: Boolean(selectedCourseId && academicYear && semesterNo),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_scores")
        .select("id, user_id, course_id, semestr_qiymeti, imtahan_bali, yekun_qiymet, tedris_ili, semestr")
        .eq("course_id", selectedCourseId)
        .eq("tedris_ili", academicYear)
        .eq("semestr", semesterNo!);
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });

  // Administrators may use the live formula as a fallback while editing. In teacher
  // monitoring mode we deliberately avoid this RPC because monitoring must have no
  // write-capable side effects whatsoever.
  const formulaQuery = useQuery<Record<string, number>>({
    queryKey: ["teacher-exams", "formula", userId, selectedCourseId, students.map((student) => student.user_id).join(",")],
    enabled: Boolean(!readOnly && selectedCourseId && students.length),
    queryFn: async () => {
      const entries = await Promise.all(students.map(async (student) => {
        const { data, error } = await supabase.rpc("calculate_semester_score", {
          p_course_id: selectedCourseId,
          p_student_id: student.user_id,
        });
        if (error) throw error;
        return [student.user_id, Number(data ?? 0)] as const;
      }));
      return Object.fromEntries(entries);
    },
    staleTime: 30_000,
  });

  const scheduleQuery = useQuery<ExamSchedule[]>({
    queryKey: ["teacher-exams", "schedule", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("id, course_id, group_id, imtahan_tarixi, baslangic_saat, otaq, groups(ad)")
        .eq("course_id", selectedCourseId)
        .order("imtahan_tarixi")
        .order("baslangic_saat");
      if (error) throw error;
      return (data ?? []) as unknown as ExamSchedule[];
    },
  });

  const scoreMap = useMemo(() => new Map((scoresQuery.data ?? []).map((row) => [row.user_id, row])), [scoresQuery.data]);

  useEffect(() => {
    const next: Record<string, string> = {};
    students.forEach((student) => {
      const score = scoreMap.get(student.user_id)?.imtahan_bali;
      next[student.user_id] = score == null ? "" : String(score);
    });
    setExamEdits(next);
    setSaveState("idle");
  }, [students, scoreMap, selectedCourseId]);

  const dirtyIds = useMemo(() => {
    if (readOnly) return [];
    return students.filter((student) => {
      const original = scoreMap.get(student.user_id)?.imtahan_bali;
      const originalText = original == null ? "" : String(Number(original));
      const nextText = examEdits[student.user_id]?.trim() ?? "";
      if (!nextText && !originalText) return false;
      if (!nextText || !originalText) return nextText !== originalText;
      return Number(nextText) !== Number(originalText);
    }).map((student) => student.user_id);
  }, [readOnly, students, scoreMap, examEdits]);

  const saveScores = useMutation({
    mutationFn: async () => {
      if (readOnly) throw new Error(t("readOnlyError"));
      if (!selectedCourseId || !academicYear || semesterNo == null || !dirtyIds.length) return;
      const payload = dirtyIds.map((studentId) => {
        const raw = examEdits[studentId]?.trim() ?? "";
        const examScore = raw === "" ? null : Number(raw);
        const student = students.find((row) => row.user_id === studentId)!;
        if (examScore !== null && (!Number.isFinite(examScore) || examScore < 0 || examScore > 50)) {
          throw new Error(t("rangeError", { student: studentName(student, t("student")) }));
        }
        return {
          user_id: studentId,
          course_id: selectedCourseId,
          imtahan_bali: examScore,
          tedris_ili: academicYear,
          semestr: semesterNo,
        };
      });
      const { error } = await supabase
        .from("exam_scores")
        .upsert(payload, { onConflict: "course_id,user_id,tedris_ili,semestr" });
      if (error) throw error;
    },
    onMutate: () => setSaveState("pending"),
    onSuccess: async () => {
      setSaveState("saved");
      toast.success(t("saved"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teacher-exams", "scores", userId, selectedCourseId] }),
        queryClient.invalidateQueries({ queryKey: ["student-exam-results"] }),
      ]);
    },
    onError: (error) => {
      setSaveState("error");
      toast.error(error instanceof Error ? error.message : t("saveError"));
    },
  });

  const loading = periodQuery.isLoading || assignmentQuery.isLoading || studentsQuery.isLoading || scoresQuery.isLoading || (!readOnly && formulaQuery.isLoading);
  const periodLabel = academicYear && semesterNo ? t("academicPeriod", { year: academicYear, semester: semesterNo === 1 ? t("fall") : t("spring") }) : "";

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-4 pb-6">
      <ExamsOverviewHero
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<Button asChild className="min-h-11 shrink-0 rounded-xl font-bold"><Link to="/teqvim"><Calendar className="mr-2 size-4" />{t("calendar")}</Link></Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        {periodLabel ? <Badge variant="outline" className="w-fit rounded-full px-3 py-1.5">{periodLabel}</Badge> : null}
        {readOnly ? <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1.5"><Eye className="size-3.5" />{t("readOnly")}</Badge> : null}
      </div>

      {periodQuery.isLoading || assignmentQuery.isLoading ? (
        <div className="space-y-3 animate-pulse"><div className="h-12 rounded-2xl bg-muted" /><div className="h-72 rounded-3xl bg-muted" /></div>
      ) : !courses.length ? (
        <div className="rounded-3xl border border-border bg-card p-6"><EmptyState icon={BookOpen} mesaj={t("noCourses")} /></div>
      ) : (
        <>
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-foreground">{readOnly ? t("monitoringTitle") : t("gradingTitle")}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{readOnly ? t("monitoringHint") : t("gradingHint")}</p>
              </div>
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                aria-label={t("course")}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto sm:min-w-[260px]"
              >
                {courses.map((course) => <option key={course.id} value={course.id}>{course.ad}</option>)}
              </select>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2"><Calendar className="size-4 text-primary" /><h2 className="font-bold text-foreground">{t("schedule")}</h2></div>
            {scheduleQuery.isLoading ? <div className="h-20 animate-pulse rounded-2xl bg-muted" /> : (scheduleQuery.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">{t("scheduleEmpty")}</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {(scheduleQuery.data ?? []).map((exam) => (
                  <article key={exam.id} className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="font-bold text-foreground">{exam.groups?.ad ?? "—"}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-primary" />{exam.imtahan_tarixi}</span>
                      <span className="flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{exam.baslangic_saat.slice(0, 5)}</span>
                      <span className="col-span-2 flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" />{t("room")}: {exam.otaq}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {readOnly ? <TeacherExamMaterialsPanel userId={userId} courses={courses} links={allLinks} academicYear={academicYear} semester={semesterNo} /> : null}

          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            {loading ? (
              <div className="space-y-3 p-5 animate-pulse"><div className="h-24 rounded-xl bg-muted" /><div className="h-24 rounded-xl bg-muted" /></div>
            ) : !students.length ? (
              <div className="p-6"><EmptyState icon={GraduationCap} mesaj={t("noStudents")} /></div>
            ) : (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {students.map((student) => {
                    const existing = scoreMap.get(student.user_id);
                    const semesterScore = existing?.semestr_qiymeti ?? (!readOnly ? formulaQuery.data?.[student.user_id] : null) ?? null;
                    const raw = examEdits[student.user_id] ?? "";
                    const editableExamScore = raw.trim() === "" ? null : Number(raw);
                    const examScore = readOnly ? existing?.imtahan_bali ?? null : editableExamScore;
                    const finalScore = readOnly
                      ? existing?.yekun_qiymet ?? null
                      : examScore === null || !Number.isFinite(examScore) || semesterScore == null
                        ? null
                        : Math.min(100, Number(semesterScore) + examScore);

                    return (
                      <article key={student.user_id} className="rounded-2xl border border-border/70 bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><div className="truncate text-sm font-black text-foreground">{studentName(student, t("student"))}</div><div className="mt-0.5 text-xs text-muted-foreground">{student.groupName}</div></div>
                          {readOnly ? <Badge variant="outline" className="shrink-0 rounded-full">{t("readOnly")}</Badge> : <Badge variant="outline" className="rounded-full">{formatScore(semesterScore)}/50</Badge>}
                        </div>

                        {readOnly ? (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-muted/50 px-2 py-3 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{t("semesterScore")}</div><div className="mt-1 font-black text-foreground">{formatScore(semesterScore)}</div></div>
                            <div className="rounded-xl bg-muted/50 px-2 py-3 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{t("examScore")}</div><div className="mt-1 font-black text-foreground">{formatScore(examScore)}</div></div>
                            <div className="rounded-xl bg-muted/50 px-2 py-3 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{t("finalScore")}</div><div className="mt-1 font-black text-foreground">{formatScore(finalScore)}</div></div>
                          </div>
                        ) : (
                          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                            <div><label className="text-xs font-bold text-muted-foreground">{t("examScore")}</label><Input type="number" inputMode="decimal" min={0} max={50} step="0.01" value={raw} onChange={(event) => { setExamEdits((current) => ({ ...current, [student.user_id]: event.target.value })); setSaveState("editing"); }} className="mt-1.5 min-h-11 rounded-xl text-base" placeholder="0–50" /></div>
                            <div className="min-w-20 rounded-xl bg-muted/50 px-3 py-2 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{t("finalScore")}</div><div className="mt-1 font-black text-foreground">{formatScore(finalScore)}</div></div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr><th className="px-5 py-3 font-semibold">{t("student")}</th><th className="px-4 py-3 font-semibold">{t("group")}</th><th className="px-4 py-3 text-center font-semibold">{t("semesterScore")}</th><th className="px-4 py-3 text-center font-semibold">{t("examScore")}</th><th className="px-4 py-3 text-center font-semibold">{t("finalScore")}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {students.map((student) => {
                        const existing = scoreMap.get(student.user_id);
                        const semesterScore = existing?.semestr_qiymeti ?? (!readOnly ? formulaQuery.data?.[student.user_id] : null) ?? null;
                        const raw = examEdits[student.user_id] ?? "";
                        const editableExamScore = raw.trim() === "" ? null : Number(raw);
                        const examScore = readOnly ? existing?.imtahan_bali ?? null : editableExamScore;
                        const finalScore = readOnly
                          ? existing?.yekun_qiymet ?? null
                          : examScore === null || !Number.isFinite(examScore) || semesterScore == null
                            ? null
                            : Math.min(100, Number(semesterScore) + examScore);

                        return (
                          <tr key={student.user_id} className="transition-colors hover:bg-muted/30">
                            <td className="px-5 py-4 font-semibold text-foreground">{studentName(student, t("student"))}</td>
                            <td className="px-4 py-4 text-muted-foreground">{student.groupName}</td>
                            <td className="px-4 py-4 text-center"><span className="inline-flex min-w-16 items-center justify-center rounded-xl bg-primary/10 px-3 py-2 font-bold text-primary">{formatScore(semesterScore)}</span></td>
                            <td className="px-4 py-4 text-center">{readOnly ? <span className="font-bold text-foreground">{formatScore(examScore)}</span> : <Input type="number" min={0} max={50} step="0.01" value={raw} onChange={(event) => { setExamEdits((current) => ({ ...current, [student.user_id]: event.target.value })); setSaveState("editing"); }} className="mx-auto h-10 w-24 rounded-xl text-center font-semibold" placeholder="—" />}</td>
                            <td className="px-4 py-4 text-center font-bold text-foreground">{formatScore(finalScore)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {!readOnly && students.length ? (
            <div className="sticky bottom-0 z-20 flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-[0_-10px_30px_-24px_rgba(0,0,0,.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between md:static md:bg-transparent md:shadow-none md:backdrop-blur-none">
              <div className={cn("flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold", saveState === "error" ? "bg-destructive/10 text-destructive" : saveState === "saved" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted/50 text-muted-foreground")}>{saveState === "pending" ? <Loader2 className="size-4 animate-spin" /> : saveState === "saved" ? <CheckCircle2 className="size-4" /> : saveState === "error" ? <CircleAlert className="size-4" /> : <Save className="size-4" />}<span>{saveState === "pending" ? t("saving") : saveState === "saved" ? t("saved") : saveState === "error" ? t("saveError") : dirtyIds.length ? t("pending") : t("saved")}</span></div>
              <Button onClick={() => { if (!dirtyIds.length) { toast.info(t("noChanges")); return; } saveScores.mutate(); }} disabled={saveScores.isPending || !dirtyIds.length} className="min-h-11 w-full rounded-xl font-bold sm:w-auto sm:min-w-56">{saveScores.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{saveScores.isPending ? t("saving") : t("saveAll")}</Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
