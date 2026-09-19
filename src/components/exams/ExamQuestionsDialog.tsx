import { CalendarClock, CheckCircle2, ListChecks, MinusCircle, Sparkles, Target, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { ExamMathText } from "@/components/exams/ExamMathText";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useExamI18n } from "@/lib/exam-i18n";
import { useI18n } from "@/lib/i18n";
import { formatPercentage, getScoreToneClasses } from "@/lib/exam-score-utils";
import type { NormalizedTestAnswer, NormalizedTicketAnswer } from "@/lib/exam-answer-utils";
import type { ExamResultDetailStats, ExamResultViewModel } from "@/lib/exam-result-view-model";

function formatDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
  const timePart = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function InfoCard({ icon: Icon, label, value, valueClassName }: { icon: React.ElementType; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
      <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("truncate text-sm font-bold text-foreground", valueClassName)}>{value}</p></div>
    </div>
  );
}

function TestBreakdownStats({ stats }: { stats: ExamResultDetailStats }) {
  const t = useExamI18n();
  const total = stats.totalQuestions || stats.correctCount + stats.wrongCount + stats.unansweredCount || 1;
  const items = [
    { key: "correct", label: t.correct, value: stats.correctCount, icon: CheckCircle2, text: "text-success", bar: "bg-success" },
    { key: "wrong", label: t.wrong, value: stats.wrongCount, icon: XCircle, text: "text-destructive", bar: "bg-destructive" },
    { key: "unanswered", label: t.unanswered, value: stats.unansweredCount, icon: MinusCircle, text: "text-muted-foreground", bar: "bg-muted-foreground/40" },
  ] as const;

  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <div className="grid grid-cols-3 divide-x divide-border">
        {items.map((it) => (
          <div key={it.key} className="flex flex-col items-center gap-1 px-2 text-center">
            <it.icon className={cn("size-4", it.text)} />
            <p className={cn("font-display text-xl font-bold leading-none", it.text)}>{it.value}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{it.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {items.map((it) => <div key={it.key} className={cn("h-full transition-all", it.bar)} style={{ width: `${(it.value / total) * 100}%` }} />)}
      </div>
    </div>
  );
}

function TestQuestionCard({ index, data }: { index: number; data: NormalizedTestAnswer }) {
  const t = useExamI18n();
  const circleTone = !data.isAnswered ? "bg-muted text-muted-foreground" : data.isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  const optionLetters = ["A", "B", "C", "D", "E"];

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", circleTone)}>{index + 1}</span>
        <ExamMathText text={data.question.text} className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground" />
      </div>
      <div className="space-y-2 pl-10">
        {data.options.map((opt, idx) => {
          const isCorrectOpt = idx === data.correctIndex;
          const isSelected = idx === data.selectedIndex;
          const isWrongPick = isSelected && !isCorrectOpt;
          const optionTone = isCorrectOpt ? "border-success/30 bg-success/10 text-success" : isWrongPick ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-card text-foreground";
          const badgeTone = isCorrectOpt ? "border-success/30 bg-success text-white" : isWrongPick ? "border-destructive/30 bg-destructive text-white" : "border-border bg-muted text-muted-foreground";
          return (
            <div key={idx} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors", optionTone)}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", badgeTone)}>{optionLetters[idx] ?? String(idx + 1)}</span>
              <ExamMathText text={opt} className="min-w-0 flex-1 break-words leading-relaxed" />
              {isCorrectOpt ? <CheckCircle2 className="size-4 shrink-0" /> : null}
              {isWrongPick ? <XCircle className="size-4 shrink-0" /> : null}
              {isSelected ? <span className="shrink-0 text-xs font-semibold text-muted-foreground">{t.mySelection}</span> : null}
            </div>
          );
        })}
      </div>
      {!data.isAnswered ? <p className="mt-2 pl-10 text-xs italic text-muted-foreground">{t.unansweredQuestion}</p> : null}
    </div>
  );
}

function TicketQuestionCard({ index, data }: { index: number; data: NormalizedTicketAnswer }) {
  const t = useExamI18n();
  const circleTone = data.isAccepted === null ? "bg-muted text-muted-foreground" : data.isAccepted ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  const scoreChipTone = data.isAccepted === true ? "bg-success/15 text-success" : data.isAccepted === false ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", circleTone)}>{index + 1}</span>
          <ExamMathText text={data.question.text} className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground" />
        </div>
        {data.score !== null ? <span className={cn("shrink-0 rounded-2xl px-2.5 py-1 text-xs font-extrabold", scoreChipTone)}>{data.score}</span> : null}
      </div>
      <div className="pl-10">
        {data.isAnswered ? (
          <div className="mt-3 rounded-xl bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{t.studentAnswer}</p>
            {data.answerText.trim() ? <ExamMathText text={data.answerText} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground" /> : null}
            {data.images.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{data.images.map((src, idx) => <div key={idx} className="relative"><img src={src} alt={t.studentAnswer} className="h-24 w-24 rounded-lg border border-border object-cover" /><span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground/85 text-[10px] font-bold text-background shadow-sm backdrop-blur">{idx + 1}</span></div>)}</div> : null}
          </div>
        ) : <p className="mt-3 text-xs italic text-muted-foreground">{t.unansweredQuestion}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.isAccepted === true ? <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 className="size-3.5" /> {t.teacherAccepted}</span> : data.isAccepted === false ? <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive"><XCircle className="size-3.5" /> {t.teacherRejected}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{t.notGraded}</span>}
        </div>
        {data.feedback ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" /><p className="text-xs text-foreground"><span className="font-bold text-primary">{t.aiNote} </span>{data.feedback}</p></div> : null}
      </div>
    </div>
  );
}

export function ExamQuestionsDialog({ result, open, onOpenChange }: { result: ExamResultViewModel | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useExamI18n();
  const { intlLocale } = useI18n();
  const tone = getScoreToneClasses(result?.percentage ?? null);
  const targetPct = result?.percentage ?? 0;
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    if (!open) { setAnimatedPct(0); return; }
    const timer = setTimeout(() => setAnimatedPct(targetPct), 80);
    return () => clearTimeout(timer);
  }, [open, targetPct]);

  const dateTimeLabel = formatDateTime(result?.completedAt ?? null, intlLocale);
  const totalQuestions = result?.detailStats?.totalQuestions ?? result?.answers.length ?? 0;
  const answeredCount = result?.answers.filter((a) => a.data.isAnswered).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-y-auto rounded-3xl border-border bg-card p-0 sm:rounded-3xl">
        <div data-dialog-header className="sticky top-0 relative z-10 rounded-t-3xl border-b border-border bg-card px-6 py-5 shadow-[0_4px_10px_-6px_rgba(61,15,28,0.15)]">
          <DialogHeader>
            <div className="flex items-start gap-3 pr-8">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ListChecks className="size-5" /></span>
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.subjectLabel}</p>
                <DialogTitle className="truncate text-lg font-bold text-foreground" title={result?.title}>{result?.title ?? t.questionDetails}</DialogTitle>
              </div>
            </div>
          </DialogHeader>
        </div>

        {result ? (
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoCard icon={CalendarClock} label={t.examDate} value={dateTimeLabel ?? t.unknown} />
              <InfoCard icon={ListChecks} label={t.questionCount} value={String(totalQuestions)} />
              <InfoCard icon={Target} label={t.result} value={formatPercentage(result.percentage)} valueClassName={tone.text} />
            </div>

            <div className="rounded-3xl border border-border bg-background p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className={cn("font-display text-3xl font-semibold leading-none", tone.text)}>
                    {result.currentScore ?? "—"}
                    {result.kind === "test" ? <span className="text-base font-medium text-muted-foreground">/{result.maxScore ?? "—"}</span> : null}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{result.kind === "ticket" ? t.totalScore : t.correctAnswer}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-muted-foreground">{answeredCount}/{totalQuestions} {t.questionsAnswered}</p>
              </div>
              <Progress value={animatedPct} className={cn("mt-4 h-2.5", tone.progressTrack)} indicatorClassName={cn(tone.progressIndicator, "duration-700 ease-out")} />
            </div>

            {result.kind === "test" && result.detailStats ? <TestBreakdownStats stats={result.detailStats} /> : null}
            {result.answers.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t.noQuestionDetails}</p> : <div className="animate-stagger space-y-3">{result.answers.map((a, i) => a.kind === "test" ? <TestQuestionCard key={i} index={i} data={a.data} /> : <TicketQuestionCard key={i} index={i} data={a.data} />)}</div>}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
