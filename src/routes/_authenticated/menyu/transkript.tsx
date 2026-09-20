import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  FileDown,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  Printer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import "@/transcript-premium.css";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStudentExamResults,
  type DetailedExamResult,
  type SemesterExamScore,
} from "@/hooks/use-student-exam-results";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import {
  cumulativeTranscriptSummary,
  downloadTranscriptDocx,
  scoreToLetter,
  transcriptSummary,
  type TranscriptCourseRow,
  type TranscriptSemester,
  type TranscriptStudentInfo,
} from "@/lib/transcript-docx";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/menyu/transkript")({
  head: () => ({
    meta: [
      { title: "Transkript — ATU Şəxsi Kabinet" },
      {
        name: "description",
        content: "Semestrlər üzrə akademik transkript və peşəkar DOCX çıxarışı.",
      },
    ],
  }),
  component: TranskriptSehifesi,
});

function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase("az-AZ")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/\b(imtahani|imtahan|test|bilet|final|yekun|sinaq)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function semesterFromDate(value: string | null | undefined): {
  startYear: number;
  semester: 1 | 2;
} {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 8) return { startYear: year, semester: 1 };
  if (month === 0) return { startYear: year - 1, semester: 1 };
  return { startYear: year - 1, semester: 2 };
}

function closestDetailedResult(
  score: SemesterExamScore,
  detailedResults: DetailedExamResult[],
): DetailedExamResult | null {
  const courseName = score.courses?.ad;
  if (!courseName) return null;
  const normalizedCourse = normalizeName(courseName);
  if (normalizedCourse.length < 4) return null;
  const scoreTime = new Date(score.created_at).getTime();
  const candidates = detailedResults.filter((result) => {
    const exam = normalizeName(result.exam_name ?? "");
    if (exam.length < 4) return false;
    return exam.includes(normalizedCourse) || normalizedCourse.includes(exam);
  });
  if (candidates.length === 0) return null;
  return (
    [...candidates].sort((a, b) => {
      const aTime = new Date(a.exam_completed_at).getTime();
      const bTime = new Date(b.exam_completed_at).getTime();
      return Math.abs(aTime - scoreTime) - Math.abs(bTime - scoreTime);
    })[0] ?? null
  );
}

function buildSemesters(
  semesterScores: SemesterExamScore[],
  detailedResults: DetailedExamResult[],
  admissionYear: number | null | undefined,
): TranscriptSemester[] {
  const groups = new Map<string, TranscriptSemester>();

  for (const score of semesterScores) {
    const course = score.courses;
    const detailed = closestDetailedResult(score, detailedResults);
    const periodDate = detailed?.exam_completed_at ?? score.created_at;
    const fromDate = semesterFromDate(periodDate);
    const courseYear =
      typeof course?.kurs === "number" && course.kurs >= 1 && course.kurs <= 8 ? course.kurs : null;
    const startYear =
      !detailed && admissionYear && courseYear
        ? admissionYear + courseYear - 1
        : fromDate.startYear;
    const semester = fromDate.semester;
    const key = `${startYear}-${startYear + 1}-${semester}`;
    const academicYear = `${startYear}–${startYear + 1}`;

    const examScore =
      typeof detailed?.current_score === "number"
        ? detailed.current_score
        : typeof score.imtahan_bali === "number"
          ? score.imtahan_bali
          : null;
    const semesterScore =
      typeof score.semestr_qiymeti === "number"
        ? score.semestr_qiymeti
        : typeof detailed?.semester_score_snapshot === "number"
          ? detailed.semester_score_snapshot
          : null;
    const hasComponents = semesterScore !== null || examScore !== null;
    const calculated = hasComponents ? (semesterScore ?? 0) + (examScore ?? 0) : score.yekun_qiymet;
    const finalScore =
      typeof calculated === "number" && Number.isFinite(calculated)
        ? Math.max(0, Math.min(100, calculated))
        : null;
    const courseCode =
      typeof course?.kod === "string" && course.kod.trim() ? course.kod.trim().toUpperCase() : "—";

    const row: TranscriptCourseRow = {
      id: score.id,
      courseCode,
      courseName: course?.ad ?? detailed?.exam_name ?? "Fənn",
      credit: typeof course?.kredit === "number" ? course.kredit : null,
      semesterScore,
      examScore,
      finalScore,
      letter: scoreToLetter(finalScore),
      repeat: false,
    };

    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else
      groups.set(key, {
        key,
        academicYear,
        semester,
        sortKey: startYear * 10 + semester,
        rows: [row],
      });
  }

  const semesters = Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
  for (const semester of semesters) {
    semester.rows.sort((a, b) => a.courseName.localeCompare(b.courseName, "az"));
  }

  const occurrences = new Map<string, TranscriptCourseRow[]>();
  for (const semester of semesters) {
    for (const row of semester.rows) {
      const key = normalizeName(row.courseName);
      if (!key) continue;
      const list = occurrences.get(key) ?? [];
      list.push(row);
      occurrences.set(key, list);
    }
  }
  for (const rows of occurrences.values()) {
    if (rows.length <= 1) continue;
    rows.slice(0, -1).forEach((row) => {
      row.repeat = true;
    });
  }

  return semesters;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/\.00$/, "");
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,0.42fr)_1fr] gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className="text-sm font-bold text-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-muted-foreground">{value || "—"}</dd>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-primary/45 pl-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function TranskriptSehifesi() {
  const { userId } = useUserRoles();
  const {
    semesterScores,
    detailedResults,
    isLoading: resultsLoading,
    isError: resultsError,
  } = useStudentExamResults();
  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"all" | "single">("all");
  const [selectedSemesterKey, setSelectedSemesterKey] = useState("");
  const [activeSemesterKey, setActiveSemesterKey] = useState("");
  const [exporting, setExporting] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["transcript-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "ad,soyad,istifadeci_adi,fin_kodu,fakulte,ixtisas,qebul_ili,bitirme_ili,qrup,tedris_ili,status",
        )
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["transcript-system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("universitet_adi")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const profile = profileQuery.data;
  const semesters = useMemo(
    () => buildSemesters(semesterScores, detailedResults, profile?.qebul_ili),
    [semesterScores, detailedResults, profile?.qebul_ili],
  );
  const overall = useMemo(() => cumulativeTranscriptSummary(semesters), [semesters]);
  const universityName =
    settingsQuery.data?.universitet_adi || "Azərbaycan Texnologiya Universiteti";
  const studentInfo: TranscriptStudentInfo = useMemo(
    () => ({
      fullName: [profile?.ad, profile?.soyad].filter(Boolean).join(" ") || "—",
      studentNumber: profile?.istifadeci_adi || profile?.fin_kodu || "—",
      level: "B (BAKALAVRİAT)",
      faculty: profile?.fakulte || "—",
      specialty: profile?.ixtisas || "—",
      admissionYear: profile?.qebul_ili ? String(profile.qebul_ili) : "—",
      graduationYear: profile?.bitirme_ili ? String(profile.bitirme_ili) : "—",
      group: profile?.qrup || "—",
    }),
    [profile],
  );

  const isLoading = resultsLoading || profileQuery.isLoading;
  const isError = resultsError || profileQuery.isError;

  useEffect(() => {
    if (activeSemesterKey && semesters.some((semester) => semester.key === activeSemesterKey))
      return;
    setActiveSemesterKey(semesters.at(-1)?.key ?? "");
  }, [activeSemesterKey, semesters]);

  function openPrintDialog() {
    setPrintMode("all");
    setSelectedSemesterKey(semesters.at(-1)?.key ?? "");
    setPrintOpen(true);
  }

  function exportDocx() {
    const selected =
      printMode === "all"
        ? semesters
        : semesters.filter((semester) => semester.key === selectedSemesterKey);
    if (selected.length === 0) {
      toast.error("Çap üçün semestr seçilməyib.");
      return;
    }
    setExporting(true);
    try {
      const safeStudent = studentInfo.studentNumber.replace(/[^a-zA-Z0-9_-]+/g, "_") || "telebe";
      const periodName = printMode === "all" ? "butun_semestrler" : selected[0]!.key;
      downloadTranscriptDocx(
        {
          universityName,
          cityLine: "Gəncə / Azərbaycan",
          student: studentInfo,
          semesters: selected,
        },
        `ATU_Transkript_${safeStudent}_${periodName}.docx`,
      );
      toast.success("Transkript DOCX formatında hazırlandı.");
      setPrintOpen(false);
    } catch (error) {
      console.error("[transcript-docx]", error);
      toast.error("DOCX faylı hazırlanarkən xəta baş verdi.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader baslıq="Transkript" geri>
        <Button
          onClick={openPrintDialog}
          disabled={semesters.length === 0 || isLoading}
          className="gap-2 font-bold"
        >
          <Printer className="size-4" />
          Çap et
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="surface-card flex min-h-72 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto size-7 animate-spin text-primary" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              Transkript hazırlanır...
            </p>
          </div>
        </div>
      ) : isError ? (
        <div className="surface-card p-8">
          <EmptyState
            icon={AlertCircle}
            mesaj="Transkript məlumatları yüklənərkən xəta baş verdi."
          />
        </div>
      ) : semesters.length === 0 ? (
        <div className="surface-card p-8">
          <EmptyState icon={FileText} mesaj="Transkript üçün qiymət məlumatı hələ yoxdur." />
        </div>
      ) : (
        <div className="space-y-5">
          <section className="surface-card overflow-hidden">
            <div className="border-b border-border bg-gradient-to-b from-primary/[0.055] to-transparent px-5 py-7 text-center sm:px-8">
              <div className="mx-auto mb-4 h-1 w-14 bg-primary" />
              <p className="font-display text-xl font-bold uppercase tracking-[0.02em] text-primary sm:text-2xl">
                {universityName}
              </p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Gəncə / Azərbaycan
              </p>
              <h2 className="mt-2 text-sm font-black uppercase tracking-[0.06em] text-foreground sm:text-base">
                Bakalavriat tələbə transkripti
              </h2>
            </div>
            <div className="grid gap-x-8 px-5 py-5 md:grid-cols-2 sm:px-8">
              <dl>
                <InfoLine label="Ad Soyad" value={studentInfo.fullName} />
                <InfoLine label="Tələbə №" value={studentInfo.studentNumber} />
                <InfoLine label="Səviyyə" value={studentInfo.level} />
                <InfoLine label="Qrup" value={studentInfo.group} />
              </dl>
              <dl>
                <InfoLine label="Fakültə" value={studentInfo.faculty} />
                <InfoLine label="İxtisas" value={studentInfo.specialty} />
                <InfoLine label="Qəbul ili" value={studentInfo.admissionYear} />
                <InfoLine label="Məzuniyyət ili" value={studentInfo.graduationYear} />
              </dl>
            </div>
            <div className="grid border-t border-border bg-muted/35 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
                <span className="flex size-9 items-center justify-center bg-primary/10 text-primary">
                  <CalendarRange className="size-4" />
                </span>
                <div>
                  <p className="text-lg font-black text-foreground">{semesters.length}</p>
                  <p className="text-xs text-muted-foreground">Semestr</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
                <span className="flex size-9 items-center justify-center bg-primary/10 text-primary">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <p className="text-lg font-black text-foreground">
                    {formatNumber(overall.earnedCredits, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Qazanılmış kredit</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
                <span className="flex size-9 items-center justify-center bg-primary/10 text-primary">
                  <GraduationCap className="size-4" />
                </span>
                <div>
                  <p className="text-lg font-black text-foreground">
                    {formatNumber(overall.average)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ümumi orta göstərici</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="flex size-9 items-center justify-center bg-primary/10 text-primary">
                  <CheckCircle2 className="size-4" />
                </span>
                <div>
                  <p className="text-lg font-black text-foreground">{profile?.status || "—"}</p>
                  <p className="text-xs text-muted-foreground">Təhsil statusu</p>
                </div>
              </div>
            </div>
          </section>

          <nav className="transcript-semester-tabs" aria-label="Semestrlər">
            {semesters.map((semester) => (
              <button
                key={semester.key}
                type="button"
                aria-pressed={activeSemesterKey === semester.key}
                onClick={() => setActiveSemesterKey(semester.key)}
              >
                {semester.academicYear} · {semester.semester === 1 ? "I" : "II"} semestr
              </button>
            ))}
          </nav>

          <div className="transcript-dashboard-grid">
            <div className="transcript-dashboard-main">
              {semesters
                .filter((semester) => semester.key === activeSemesterKey)
                .map((semester) => {
                  const index = semesters.findIndex((item) => item.key === semester.key);
                  const summary = transcriptSummary(semester.rows);
                  const cumulative = cumulativeTranscriptSummary(semesters.slice(0, index + 1));
                  return (
                    <section key={semester.key} className="surface-card overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/[0.035] px-5 py-4 sm:px-6">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">
                            Akademik dövr
                          </p>
                          <h3 className="mt-0.5 font-display text-xl font-bold text-foreground">
                            {semester.academicYear} · {semester.semester === 1 ? "I" : "II"} semestr
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-primary" />
                          {semester.rows.length} fənn
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[880px] rounded-none border-0 text-sm">
                          <thead>
                            <tr>
                              <th className="w-28">Dərs kodu</th>
                              <th className="min-w-80 text-left">Dərsin adı</th>
                              <th className="w-24">Kredit</th>
                              <th className="w-28">Qiymət</th>
                              <th className="w-28">Hərflə</th>
                              <th className="w-28">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {semester.rows.map((row) => (
                              <tr key={row.id}>
                                <td className="text-center font-data text-xs font-semibold text-muted-foreground">
                                  {row.courseCode}
                                </td>
                                <td>
                                  <p className="font-semibold text-foreground">{row.courseName}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Semestr balı:{" "}
                                    <span className="font-bold text-foreground">
                                      {formatNumber(row.semesterScore)}
                                    </span>{" "}
                                    · İmtahan balı:{" "}
                                    <span className="font-bold text-primary">
                                      {formatNumber(row.examScore)}
                                    </span>
                                  </p>
                                </td>
                                <td className="text-center font-bold text-foreground">
                                  {row.credit ?? "—"}
                                </td>
                                <td className="text-center">
                                  <span className="font-data text-base font-extrabold text-foreground">
                                    {formatNumber(row.finalScore)}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`inline-flex min-w-8 items-center justify-center border px-2 py-1 text-xs font-black ${row.letter === "F" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/[0.06] text-primary"}`}
                                  >
                                    {row.letter}
                                  </span>
                                </td>
                                <td className="text-center font-bold text-primary">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                      row.letter === "F"
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                    )}
                                  >
                                    {row.letter === "F" ? "Uğursuz" : "Tamamlanıb"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid gap-4 border-t border-border bg-muted/25 px-5 py-4 sm:grid-cols-5 sm:px-6">
                        <SummaryItem label="SQK" value={formatNumber(summary.earnedCredits, 1)} />
                        <SummaryItem
                          label="TAK"
                          value={formatNumber(cumulative.attemptedCredits, 1)}
                        />
                        <SummaryItem
                          label="TQK"
                          value={formatNumber(cumulative.earnedCredits, 1)}
                        />
                        <SummaryItem label="S-ÜOMG" value={formatNumber(summary.average)} />
                        <SummaryItem label="ÜOMG" value={formatNumber(cumulative.average)} />
                      </div>
                    </section>
                  );
                })}
            </div>

            <aside className="transcript-dashboard-aside">
              <section className="surface-card transcript-official-card">
                <FileText className="size-6 text-primary" />
                <h3>Rəsmi transkript</h3>
                <p>Akademik nəticələrinizi rəsmi DOCX sənədi kimi hazırlayın.</p>
                <Button
                  onClick={openPrintDialog}
                  disabled={semesters.length === 0 || isLoading}
                  className="w-full gap-2 font-bold"
                >
                  <FileDown className="size-4" />
                  DOCX hazırla
                </Button>
              </section>
              <section className="surface-card transcript-student-card">
                <h3>Tələbə məlumatları</h3>
                <dl>
                  <InfoLine label="Ad Soyad" value={studentInfo.fullName} />
                  <InfoLine label="Tələbə №" value={studentInfo.studentNumber} />
                  <InfoLine label="Qrup" value={studentInfo.group} />
                  <InfoLine label="İxtisas" value={studentInfo.specialty} />
                </dl>
              </section>
              <section className="surface-card transcript-scale-card">
                <h3>Qiymət şkalası</h3>
                <div>
                  <span>A</span>
                  <p>91–100</p>
                  <span>B</span>
                  <p>81–90</p>
                  <span>C</span>
                  <p>71–80</p>
                  <span>D</span>
                  <p>61–70</p>
                  <span>E</span>
                  <p>51–60</p>
                  <span>F</span>
                  <p>0–50</p>
                </div>
              </section>
            </aside>
          </div>

          <section className="surface-card border-l-4 border-l-primary p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">
                  Akademik yekun
                </p>
                <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                  Ümumi transkript göstəriciləri
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Orta göstəricilər kredit çəkisinə əsasən hesablanır. İmtahan balı İmtahanlar
                  bölməsindəki nəticələrdən götürülür; detallı nəticə mövcud olduqda həmin bal üstün
                  tutulur.
                </p>
              </div>
              <div className="grid min-w-[260px] grid-cols-3 border border-border bg-muted/25">
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">TAK</p>
                  <p className="mt-1 font-data font-black">
                    {formatNumber(overall.attemptedCredits, 1)}
                  </p>
                </div>
                <div className="border-x border-border px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">TQK</p>
                  <p className="mt-1 font-data font-black">
                    {formatNumber(overall.earnedCredits, 1)}
                  </p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">ÜOMG</p>
                  <p className="mt-1 font-data font-black text-primary">
                    {formatNumber(overall.average)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              <p>
                <b className="text-foreground">S-ÜOMG</b> — Semestrlik ümumi orta müvəffəqiyyət
                göstəricisi · <b className="text-foreground">ÜOMG</b> — Ümumi orta müvəffəqiyyət
                göstəricisi
              </p>
              <p>
                <b className="text-foreground">SQK</b> — Semestr ərzində qazanılan kredit ·{" "}
                <b className="text-foreground">TAK</b> — Toplam alınan kredit ·{" "}
                <b className="text-foreground">TQK</b> — Toplam qazanılan kredit
              </p>
            </div>
          </section>
        </div>
      )}

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transkripti çap et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm leading-6 text-muted-foreground">
              DOCX faylı üçün hansı akademik dövrlərin daxil ediləcəyini seçin.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPrintMode("all")}
                className={`border p-4 text-left transition ${printMode === "all" ? "border-primary bg-primary/[0.06] ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/35"}`}
              >
                <Layers3 className="size-5 text-primary" />
                <p className="mt-3 text-sm font-extrabold text-foreground">Bütün semestrlər</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Transkriptin bütün akademik tarixçəsi
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("single")}
                className={`border p-4 text-left transition ${printMode === "single" ? "border-primary bg-primary/[0.06] ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/35"}`}
              >
                <CalendarRange className="size-5 text-primary" />
                <p className="mt-3 text-sm font-extrabold text-foreground">Xüsusi semestr</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Yalnız seçilmiş akademik dövr
                </p>
              </button>
            </div>
            {printMode === "single" ? (
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Semestr</label>
                <Select value={selectedSemesterKey} onValueChange={setSelectedSemesterKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semestr seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.key} value={semester.key}>
                        {semester.academicYear} · {semester.semester === 1 ? "I" : "II"} semestr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex gap-3 border border-border bg-muted/30 p-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                Fayl Microsoft Word və digər DOCX uyğun proqramlarda açılan, rəsmi transkript
                quruluşunda hazırlanacaq.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintOpen(false)} disabled={exporting}>
              Ləğv et
            </Button>
            <Button
              onClick={exportDocx}
              disabled={exporting || (printMode === "single" && !selectedSemesterKey)}
              className="gap-2 font-bold"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              DOCX hazırla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
