import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Calendar, CheckCircle, ChevronRight, Download, FileText, GraduationCap, Loader2, PenLine } from "lucide-react";
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
import { useUpcomingExams, type UpcomingExam } from "@/hooks/use-upcoming-exams";
import { supabase } from "@/integrations/supabase/client";
import { useExamI18n } from "@/lib/exam-i18n";
import { createExamMaterialSignedUrl, formatExamMaterialSize, type ExamMaterial } from "@/lib/exam-materials";
import { useI18n } from "@/lib/i18n";
import { buildExamResultViewModels, type ExamResultViewModel } from "@/lib/exam-result-view-model";

const EXAM_UI = {
  az: { upcomingTab: "Gələcək imtahanlar", resultsTab: "İmtahan nəticələri", materialsTab: "Hazırlıq materialları", materialsTitle: "Hazırlıq materialları", materialsDescription: "Müəllim tərəfindən əlavə edilən real imtahan materialları.", miniCalendar: "İmtahan təqvimi", recentResults: "Son nəticələr", noRecentResults: "Hələ nəticə yoxdur.", noMaterials: "Hazırlıq materialı yoxdur.", noMaterialsDescription: "Material əlavə edildikdə burada görünəcək.", download: "Yüklə", preparing: "Hazırlanır", downloadError: "Fayl yüklənə bilmədi.", test: "Test", ticket: "Bilet", subjects: "Fənn", average: "Orta", preparation: "Hazırlıq" },
  tr: { upcomingTab: "Yaklaşan sınavlar", resultsTab: "Sınav sonuçları", materialsTab: "Hazırlık materyalleri", materialsTitle: "Hazırlık materyalleri", materialsDescription: "Öğretmen tarafından eklenen gerçek sınav materyalleri.", miniCalendar: "Sınav takvimi", recentResults: "Son sonuçlar", noRecentResults: "Henüz sonuç yok.", noMaterials: "Hazırlık materyali yok.", noMaterialsDescription: "Materyal eklendiğinde burada görünecek.", download: "İndir", preparing: "Hazırlanıyor", downloadError: "Dosya indirilemedi.", test: "Test", ticket: "Bilet", subjects: "Ders", average: "Ortalama", preparation: "Hazırlık" },
  en: { upcomingTab: "Upcoming exams", resultsTab: "Exam results", materialsTab: "Preparation materials", materialsTitle: "Preparation materials", materialsDescription: "Real exam materials added by your teacher.", miniCalendar: "Exam calendar", recentResults: "Recent results", noRecentResults: "No results yet.", noMaterials: "No preparation materials.", noMaterialsDescription: "Materials will appear here when they are added.", download: "Download", preparing: "Preparing", downloadError: "The file could not be downloaded.", test: "Test", ticket: "Ticket", subjects: "Subjects", average: "Average", preparation: "Preparation" },
  ru: { upcomingTab: "Предстоящие экзамены", resultsTab: "Результаты экзаменов", materialsTab: "Материалы подготовки", materialsTitle: "Материалы подготовки", materialsDescription: "Реальные материалы, добавленные преподавателем.", miniCalendar: "Календарь экзаменов", recentResults: "Последние результаты", noRecentResults: "Результатов пока нет.", noMaterials: "Материалов для подготовки нет.", noMaterialsDescription: "Материалы появятся здесь после добавления.", download: "Скачать", preparing: "Подготовка", downloadError: "Не удалось скачать файл.", test: "Тест", ticket: "Билет", subjects: "Предметы", average: "Среднее", preparation: "Подготовка" },
} as const;
type ExamUiCopy = (typeof EXAM_UI)[keyof typeof EXAM_UI];

export function StudentExamsView({ userId }: { userId: string }) {
  const t = useExamI18n();
  const { locale } = useI18n();
  const ui = EXAM_UI[locale as keyof typeof EXAM_UI] ?? EXAM_UI.az;
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; ad: string } | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResultViewModel | null>(null);
  const results = useStudentExamResults();
  const { exams: upcomingExams, isLoading: upcomingLoading, isError: upcomingError } = useUpcomingExams(userId);
  const viewModels = buildExamResultViewModels(results.semesterScores, results.detailedResults);
  const scoreValues = results.semesterScores
    .map((row) => row.yekun_qiymet ?? row.imtahan_bali ?? row.semestr_qiymeti)
    .filter((value): value is number => value !== null && value !== undefined);
  const avgScore = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : null;
  const subjectCount = new Set(results.semesterScores.map((row) => row.course_id).filter(Boolean)).size;
  const prepStatusLabel = avgScore === null ? t.noData : avgScore >= 70 ? t.good : avgScore >= 50 ? t.averageStatus : t.attention;

  return (
    <div className="exam-redesign flex flex-1 flex-col">
      <ExamsOverviewHero title={t.title} subtitle={t.subtitle} rightSlot={<div className="exam-redesign-hero-status"><span><GraduationCap aria-hidden /></span><div><small>{t.preparation}</small><strong>{prepStatusLabel}</strong></div></div>} />
      <Tabs defaultValue="upcoming" className="exam-redesign-tabs">
        <TabsList className="exam-redesign-tabs__list">
          <TabsTrigger value="upcoming"><Calendar aria-hidden />{ui.upcomingTab}</TabsTrigger>
          <TabsTrigger value="results"><CheckCircle aria-hidden />{ui.resultsTab}</TabsTrigger>
          <TabsTrigger value="materials"><BookOpen aria-hidden />{ui.materialsTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="exam-redesign-tab-panel">
          <div className="exam-redesign-main">
            <section className="exam-redesign-primary">
              <div className="exam-redesign-section-heading"><div><h2>{t.upcomingExams}</h2><p>{t.upcomingExamsDescription}</p></div>{!upcomingLoading && !upcomingError ? <span>{upcomingExams.length}</span> : null}</div>
              <UpcomingExamsList userId={userId} />
            </section>
            <ExamSidebar exams={upcomingExams} results={viewModels} avgScore={avgScore} subjectCount={subjectCount} prepStatusLabel={prepStatusLabel} copy={ui} locale={locale} />
          </div>
        </TabsContent>
        <TabsContent value="results" className="exam-redesign-tab-panel">
          <section className="exam-redesign-results">
            <div className="exam-redesign-section-heading"><div><h2>{t.examResults}</h2><p>{t.examResultsDescription}</p></div>{!results.isLoading && !results.isError && !results.isEmpty ? <span>{results.totalCount} {t.examCount}</span> : null}</div>
            {results.isLoading ? <ExamResultsSkeleton /> : results.isError ? <div className="exam-redesign-state"><EmptyState icon={AlertCircle} mesaj={t.examResultsError} /></div> : results.isEmpty ? <div className="exam-redesign-state"><EmptyState icon={PenLine} mesaj={t.noExamResults} /></div> : <div className="exam-redesign-result-grid animate-stagger">{viewModels.map((vm) => <ExamResultCard key={vm.id} result={vm} onViewQuestions={setSelectedResult} onViewAcademicDetails={(result) => result.courseRef && setSelectedCourse(result.courseRef)} />)}</div>}
          </section>
        </TabsContent>
        <TabsContent value="materials" className="exam-redesign-tab-panel">
          <section className="exam-redesign-results">
            <div className="exam-redesign-section-heading"><div><h2>{ui.materialsTitle}</h2><p>{ui.materialsDescription}</p></div></div>
            <ExamPreparationMaterials exams={upcomingExams} isLoading={upcomingLoading} isError={upcomingError} copy={ui} />
          </section>
        </TabsContent>
      </Tabs>
      <ExamQuestionsDialog result={selectedResult} open={selectedResult !== null} onOpenChange={(open) => !open && setSelectedResult(null)} />
      {selectedCourse ? <StudentDetailsModal userId={userId} courseId={selectedCourse.id} courseName={selectedCourse.ad} onClose={() => setSelectedCourse(null)} /> : null}
    </div>
  );
}

function ExamSidebar({ exams, results, avgScore, subjectCount, prepStatusLabel, copy, locale }: {
  exams: UpcomingExam[]; results: ExamResultViewModel[]; avgScore: number | null; subjectCount: number; prepStatusLabel: string; copy: ExamUiCopy; locale: string;
}) {
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const firstDatedExam = exams.find((exam) => exam.imtahan_tarixi);
  const focusDate = firstDatedExam?.imtahan_tarixi ? new Date(`${firstDatedExam.imtahan_tarixi}T12:00:00`) : new Date();
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const examDays = new Set(exams.filter((exam) => exam.imtahan_tarixi && Number(exam.imtahan_tarixi.slice(5, 7)) === month + 1).map((exam) => Number(exam.imtahan_tarixi!.slice(8, 10))));
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(focusDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(intlLocale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + index)));

  return (
    <aside className="exam-redesign-side">
      <section className="exam-mini-calendar">
        <div className="exam-side-heading"><h3>{copy.miniCalendar}</h3><span>{monthLabel}</span></div>
        <div className="exam-mini-calendar__week">{weekDays.map((dayLabel, index) => <span key={`${dayLabel}-${index}`}>{dayLabel}</span>)}</div>
        <div className="exam-mini-calendar__days">{cells.map((dayNumber, index) => dayNumber === null ? <span key={`empty-${index}`} /> : <span key={dayNumber} className={examDays.has(dayNumber) ? "is-exam" : ""}>{dayNumber}</span>)}</div>
      </section>
      <section className="exam-side-results">
        <div className="exam-side-heading"><h3>{copy.recentResults}</h3><span>{results.length}</span></div>
        {results.length ? <div className="exam-side-results__list">{results.slice(0,4).map((result) => <div key={result.id}><span>{result.initials}</span><p><strong>{result.title}</strong><small>{result.currentScore ?? "—"}{result.maxScore ? ` / ${result.maxScore}` : ""}</small></p><ChevronRight aria-hidden /></div>)}</div> : <p className="exam-side-empty">{copy.noRecentResults}</p>}
      </section>
      <section className="exam-side-summary">
        <div><span><BookOpen aria-hidden /></span><p><small>{copy.subjects}</small><strong>{subjectCount}</strong></p></div>
        <div><span><CheckCircle aria-hidden /></span><p><small>{copy.average}</small><strong>{avgScore ?? "—"}</strong></p></div>
        <div><span><GraduationCap aria-hidden /></span><p><small>{copy.preparation}</small><strong>{prepStatusLabel}</strong></p></div>
      </section>
    </aside>
  );
}

function ExamPreparationMaterials({ exams, isLoading, isError, copy }: { exams: UpcomingExam[]; isLoading: boolean; isError: boolean; copy: ExamUiCopy }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const items = exams.flatMap((exam) => exam.materials.map((material) => ({ exam, material })));

  async function download(material: ExamMaterial) {
    setDownloadingId(material.id);
    try {
      const signedUrl = await createExamMaterialSignedUrl(material);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(copy.downloadError);
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading) return <div className="exam-redesign-state"><Loader2 className="animate-spin" /></div>;
  if (isError) return <div className="exam-redesign-state"><EmptyState icon={AlertCircle} mesaj={copy.downloadError} /></div>;
  if (!items.length) return <div className="exam-redesign-state"><EmptyState icon={BookOpen} mesaj={copy.noMaterials} /><p>{copy.noMaterialsDescription}</p></div>;

  return <div className="exam-material-grid animate-stagger">{items.map(({ exam, material }) => (
    <article key={material.id} className="exam-material-card">
      <span className="exam-material-card__icon"><FileText aria-hidden /></span>
      <div className="exam-material-card__copy"><small>{exam.courses?.ad || copy.materialsTitle}</small><strong title={material.original_file_name}>{material.original_file_name}</strong><p>{material.exam_type === "ticket" ? copy.ticket : copy.test} · {formatExamMaterialSize(material.file_size ?? 0)}</p></div>
      <button type="button" disabled={downloadingId === material.id} onClick={() => void download(material)}>{downloadingId === material.id ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}{downloadingId === material.id ? copy.preparing : copy.download}</button>
    </article>
  ))}</div>;
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
