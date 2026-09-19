import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Calendar, CheckCircle, Clock3, Download, GraduationCap, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ExamQuestionsDialog } from "@/components/exams/ExamQuestionsDialog";
import { ExamResultCard } from "@/components/exams/ExamResultCard";
import { ExamResultsSkeleton } from "@/components/exams/ExamResultsSkeleton";
import { ExamsOverviewHero } from "@/components/exams/ExamsOverviewHero";
import { UpcomingExamsList } from "@/components/exams/UpcomingExamsList";
import { EmptyState } from "@/components/layout/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudentExamResults } from "@/hooks/use-student-exam-results";
import { useUpcomingExams } from "@/hooks/use-upcoming-exams";
import { supabase } from "@/integrations/supabase/client";
import { useExamI18n } from "@/lib/exam-i18n";
import { buildExamResultViewModels, type ExamResultViewModel } from "@/lib/exam-result-view-model";

export function StudentExamsView({ userId }: { userId: string }) {
  const t = useExamI18n();
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; ad: string } | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResultViewModel | null>(null);
  const results = useStudentExamResults();
  const { exams: upcomingExams } = useUpcomingExams(userId);
  const viewModels = buildExamResultViewModels(results.semesterScores, results.detailedResults);
  const scoreValues = results.semesterScores
    .map((row) => row.yekun_qiymet ?? row.imtahan_bali ?? row.semestr_qiymeti)
    .filter((value): value is number => value !== null && value !== undefined);
  const avgScore = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : null;
  const subjectCount = new Set(results.semesterScores.map((row) => row.course_id).filter(Boolean)).size;
  const prepStatusLabel = avgScore === null ? t.noData : avgScore >= 70 ? t.good : avgScore >= 50 ? t.averageStatus : t.attention;

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <ExamsOverviewHero
        title={t.title}
        subtitle={t.subtitle}
        rightSlot={<div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-primary-foreground"><GraduationCap className="size-5" /></span><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/70">{t.preparation}</p><p className="text-sm font-bold leading-tight text-primary-foreground">{prepStatusLabel}</p></div></div>}
        stats={[
          { icon: <Calendar className="size-5" />, value: upcomingExams.length, label: t.upcomingExam },
          { icon: <BookOpen className="size-5" />, value: subjectCount, label: t.semesterSubject },
          { icon: <CheckCircle className="size-5" />, value: avgScore ?? "—", label: t.average },
          { icon: <Clock3 className="size-5" />, value: results.totalCount, label: t.completedExam },
        ]}
      />

      <div className="space-y-8">
        <section className="space-y-4">
          <div><h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">{t.upcomingExams}</h2><p className="mt-1 text-sm text-muted-foreground">{t.upcomingExamsDescription}</p></div>
          <UpcomingExamsList userId={userId} />
        </section>
        <div className="h-px w-full bg-border" />
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">{t.examResults}</h2><p className="mt-1 text-sm text-muted-foreground">{t.examResultsDescription}</p></div>{!results.isLoading && !results.isError && !results.isEmpty ? <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-bold text-foreground">{results.totalCount} <span className="font-normal text-muted-foreground">{t.examCount}</span></span> : null}</div>
          {results.isLoading ? <ExamResultsSkeleton /> : results.isError ? <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><EmptyState icon={AlertCircle} mesaj={t.examResultsError} /></div> : results.isEmpty ? <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><EmptyState icon={PenLine} mesaj={t.noExamResults} /></div> : <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{viewModels.map((vm) => <ExamResultCard key={vm.id} result={vm} onViewQuestions={setSelectedResult} onViewAcademicDetails={(result) => result.courseRef && setSelectedCourse(result.courseRef)} />)}</div>}
        </section>
      </div>

      <ExamQuestionsDialog result={selectedResult} open={selectedResult !== null} onOpenChange={(open) => !open && setSelectedResult(null)} />
      {selectedCourse ? <StudentDetailsModal userId={userId} courseId={selectedCourse.id} courseName={selectedCourse.ad} onClose={() => setSelectedCourse(null)} /> : null}
    </div>
  );
}

function StudentDetailsModal({ userId, courseId, courseName, onClose }: { userId: string; courseId: string; courseName: string; onClose: () => void }) {
  const t = useExamI18n();
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["student-att-history", userId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("user_id", userId).eq("course_id", courseId).order("tarix", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["student-notes-history", userId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("user_id", userId).eq("course_id", courseId).order("tarix", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleDownload(fileUrl: string) {
    try {
      const { data, error } = await supabase.storage.from("note-files").createSignedUrl(fileUrl, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t.errorFileDownload);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-3xl">
        <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">{t.academicDetailsTitle} — {courseName}</DialogTitle></DialogHeader>
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="mb-4 grid max-w-xs grid-cols-2 rounded-xl bg-muted p-1"><TabsTrigger value="attendance" className="rounded-lg font-bold">{t.attendance}</TabsTrigger><TabsTrigger value="notes" className="rounded-lg font-bold">{t.notesJournal}</TabsTrigger></TabsList>
          <TabsContent value="attendance" className="max-h-[350px] space-y-3 overflow-y-auto pr-1 focus-visible:outline-none">
            {attendanceLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div> : !attendance.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t.noAttendance}</p> : <table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="pb-2 font-semibold">{t.date}</th><th className="pb-2 font-semibold">{t.status}</th></tr></thead><tbody>{attendance.map((row) => <tr key={row.id} className="border-b border-border/50"><td className="py-2.5 text-foreground">{row.tarix}</td><td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${row.statusu === "var" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{row.statusu === "var" ? t.attended : t.absent}</span></td></tr>)}</tbody></table>}
          </TabsContent>
          <TabsContent value="notes" className="max-h-[350px] space-y-3 overflow-y-auto pr-1 focus-visible:outline-none">
            {notesLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div> : !notes.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t.noNotes}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="pb-2 font-semibold">#</th><th className="pb-2 font-semibold">{t.date}</th><th className="pb-2 font-semibold">{t.subject}</th><th className="pb-2 font-semibold">{t.continuity}</th><th className="pb-2 font-semibold">{t.file}</th><th className="pb-2 font-semibold">{t.note}</th></tr></thead><tbody>{notes.map((row) => <tr key={row.id} className="border-b border-border/50"><td className="py-2.5 text-muted-foreground">{row.xeyr}</td><td className="py-2.5 text-muted-foreground">{row.tarix}</td><td className="py-2.5 font-medium text-foreground">{row.movzu}</td><td className="py-2.5 text-foreground">{row.kesilmezlik || "—"}</td><td className="py-2.5">{row.fayl_url ? <button type="button" onClick={() => void handleDownload(row.fayl_url!)} className="inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline"><Download className="size-3" />{t.download}</button> : "—"}</td><td className="max-w-[150px] truncate py-2.5 text-muted-foreground" title={row.qeyd || ""}>{row.qeyd || "—"}</td></tr>)}</tbody></table></div>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
