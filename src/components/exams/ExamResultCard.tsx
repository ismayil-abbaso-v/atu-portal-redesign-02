import { ArrowRight, CalendarDays, Clock, ClipboardList, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useExamI18n } from "@/lib/exam-i18n";
import { useI18n } from "@/lib/i18n";
import { formatPercentage, getScoreToneClasses } from "@/lib/exam-score-utils";
import type { ExamResultViewModel } from "@/lib/exam-result-view-model";

const KIND_BADGE_CLASSES: Record<ExamResultViewModel["kind"], string> = {
  semester: "bg-secondary text-secondary-foreground",
  test: "bg-primary/10 text-primary",
  ticket: "bg-accent text-accent-foreground",
};

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startedAt: string | null, completedAt: string | null, t: ReturnType<typeof useExamI18n>): string | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  const totalMinutes = Math.round((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours} ${t.hours} ${minutes} ${t.minutes}`;
  if (hours > 0) return `${hours} ${t.hours}`;
  return `${minutes} ${t.minutes}`;
}

export function ExamResultCard({
  result,
  onViewQuestions,
  onViewAcademicDetails,
}: {
  result: ExamResultViewModel;
  onViewQuestions?: (result: ExamResultViewModel) => void;
  onViewAcademicDetails?: (result: ExamResultViewModel) => void;
}) {
  const t = useExamI18n();
  const { intlLocale } = useI18n();
  const tone = getScoreToneClasses(result.percentage);
  const dateLabel = formatDate(result.completedAt, intlLocale);
  const startTimeLabel = formatTime(result.startedAt, intlLocale);
  const endTimeLabel = formatTime(result.completedAt, intlLocale);
  const durationLabel = formatDuration(result.startedAt, result.completedAt, t);
  const targetPct = result.percentage ?? 0;
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(targetPct), 50);
    return () => clearTimeout(timer);
  }, [targetPct]);

  const kindLabel = result.kind === "semester" ? t.semester : result.kind === "test" ? t.test : t.ticket;
  const detailLabel = result.hasQuestionDetail ? t.viewQuestions : result.courseRef ? t.academicDetails : null;

  return (
    <article className="group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", KIND_BADGE_CLASSES[result.kind])}>
          {kindLabel}
        </span>
        <span className={cn("rounded-full px-3 py-1 font-mono text-lg font-bold tabular-nums", tone.text, tone.bg)}>
          {result.currentScore ?? "—"}/{result.maxScore ?? "—"}
        </span>
      </div>

      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground" title={result.title}>
        {result.title}
      </h3>

      {result.kind === "semester" && result.semesterBreakdown &&
      (result.semesterBreakdown.semesterScore !== null || result.semesterBreakdown.examScore !== null) ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-xl bg-muted/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {t.semester}
            <span className="font-bold text-foreground">{result.semesterBreakdown.semesterScore ?? "—"}</span>
          </span>
          <Plus className="size-3 shrink-0 text-muted-foreground/50" />
          <span className="inline-flex items-center gap-1 rounded-xl bg-muted/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {t.exam}
            <span className="font-bold text-foreground">{result.semesterBreakdown.examScore ?? "—"}</span>
          </span>
        </div>
      ) : null}

      <div>
        <Progress value={animatedPct} className={cn("h-1.5", tone.progressTrack)} indicatorClassName={cn(tone.progressIndicator, "duration-700 ease-out")} />
        <p className={cn("mt-1.5 text-right text-xs font-bold", tone.text)}>{formatPercentage(result.percentage)}</p>
      </div>

      <div className="mt-auto space-y-1 pt-0.5">
        {dateLabel ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>{dateLabel}{startTimeLabel && endTimeLabel ? ` · ${startTimeLabel}–${endTimeLabel}` : null}</span>
          </div>
        ) : null}

        {durationLabel ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span>{t.duration}: {durationLabel}</span>
          </div>
        ) : null}

        <div className="pt-1.5">
          {result.hasQuestionDetail ? (
            <button type="button" onClick={() => onViewQuestions?.(result)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-bold text-foreground shadow-none transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.99]">
              <span>{detailLabel}</span><ArrowRight className="size-4 shrink-0" />
            </button>
          ) : result.courseRef ? (
            <button type="button" onClick={() => onViewAcademicDetails?.(result)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-bold text-foreground shadow-none transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.99]">
              <span>{detailLabel}</span><ArrowRight className="size-4 shrink-0" />
            </button>
          ) : (
            <div className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-4 text-sm font-semibold text-muted-foreground">
              <ClipboardList className="size-4" />{t.noDetails}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
