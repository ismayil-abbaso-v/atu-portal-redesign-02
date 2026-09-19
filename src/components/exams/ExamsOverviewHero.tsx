import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { getExamMessages } from "@/lib/exam-i18n";
import "@/exams-horizon.css";
import "@/exams-horizon-mobile.css";

interface StatItem { icon: ReactNode; value: string | number; label: string; }
interface ExamsOverviewHeroProps { eyebrow?: string; title: string; subtitle: string; rightSlot?: ReactNode; stats?: StatItem[] | undefined; }

const aliases: Record<string, string> = {
  "İmtahanlar": "title", "Qarşıdakı imtahanlarınızı, tarix və auditoriya məlumatlarını, həmçinin son nəticələrinizi bir məkanda izləyin.": "subtitle",
  "Fənləriniz üzrə tələbələrin qiymətləndirmə jurnalını buradan idarə edin.": "teacherSubtitle", "Qrupunuzun davamiyyət, qeyd və imtahan cədvəlini buradan idarə edin.": "tutorSubtitle",
  "İmtahan hazırlığı": "preparation", "İmtahan cədvəli": "examSchedule", "Qarşıdakı imtahan": "upcomingExam", "Bu semestr fənn": "semesterSubject",
  "Orta nəticə": "average", "Tamamlanan imtahan": "completedExam", "Tələbə Paneli": "studentPanel", "Müəllim Paneli": "teacherPanel", "Tyutor Paneli": "tutorPanel",
  "Məlumat yoxdur": "noData", "Yaxşı gedir": "good", "Orta səviyyədə": "averageStatus", "Diqqət tələb edir": "attention",
};

function localizeNode(node: ReactNode, messages: ReturnType<typeof getExamMessages>): ReactNode {
  if (typeof node === "string") { const key = aliases[node]; return key ? (messages as Record<string, string>)[key] ?? node : node; }
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "number") return node;
  if (Array.isArray(node)) return node.map((child, index) => <span key={index}>{localizeNode(child, messages)}</span>);
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode } | undefined)?.children;
    if (children === undefined) return node;
    return cloneElement(node, {}, Children.map(children, (child) => localizeNode(child, messages)));
  }
  return node;
}

export function ExamsOverviewHero({ title, subtitle, rightSlot, stats }: ExamsOverviewHeroProps) {
  const { locale } = useI18n();
  const messages = getExamMessages(locale);

  return <div className="space-y-4">
    <section className="exam-horizon-hero relative isolate overflow-hidden rounded-[28px] bg-primary px-5 py-6 text-primary-foreground shadow-sm sm:px-8 sm:py-8">
      <span aria-hidden className="exam-horizon-hero__left-accent" />
      <span aria-hidden className="exam-horizon-hero__mesh" />
      <span aria-hidden className="exam-horizon-hero__glow exam-horizon-hero__glow--one" />
      <span aria-hidden className="exam-horizon-hero__glow exam-horizon-hero__glow--two" />
      <span aria-hidden className="exam-horizon-hero__sweep" />

      <svg aria-hidden="true" className="exam-horizon-hero__art pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 240" preserveAspectRatio="none" fill="none">
        <path className="exam-horizon-hero__curve exam-horizon-hero__curve--one" d="M-40 196 C130 112 248 206 390 120 C528 36 654 120 810 62 C947 12 1085 72 1240 24" />
        <path className="exam-horizon-hero__curve exam-horizon-hero__curve--two" d="M-60 68 C92 134 202 44 356 92 C512 141 612 192 784 140 C946 91 1072 160 1250 105" />
        <path className="exam-horizon-hero__curve exam-horizon-hero__curve--three" d="M74 252 C188 145 322 156 462 201 C612 250 734 148 876 178 C1022 208 1110 126 1216 92" />

        <g className="exam-horizon-hero__nodes">
          <circle cx="150" cy="150" r="4" />
          <circle cx="390" cy="120" r="4" />
          <circle cx="612" cy="168" r="3.5" />
          <circle cx="810" cy="62" r="4" />
          <circle cx="1018" cy="120" r="3.5" />
        </g>

        <g className="exam-horizon-hero__ticks">
          <path d="M120 30 V54" />
          <path d="M120 30 H144" />
          <path d="M1080 186 V210" />
          <path d="M1056 210 H1080" />
        </g>
      </svg>

      <div className="relative z-10 flex min-h-[150px] flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="exam-horizon-hero__copy min-w-0 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/70 sm:text-[11px]">
            <span className="exam-horizon-hero__pulse-dot" aria-hidden />
            Akademik imtahan mərkəzi
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {localizeNode(title, messages)}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-normal leading-relaxed text-primary-foreground/76 sm:text-base">
            {localizeNode(subtitle, messages)}
          </p>

          <div className="exam-horizon-hero__labels mt-5 flex flex-wrap gap-2" aria-hidden>
            <span>Cədvəl</span>
            <span>Nəticələr</span>
            <span>Hazırlıq</span>
          </div>
        </div>

        {rightSlot ? (
          <div className="exam-horizon-hero__status hidden shrink-0 sm:block">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </section>

    {stats && stats.length > 0 ? (
      <div className="exam-horizon-stats grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="exam-horizon-stat relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            style={{ animationDelay: `${90 + index * 85}ms` }}
          >
            <span aria-hidden className="exam-horizon-stat__edge" style={{ animationDelay: `${220 + index * 110}ms` }} />
            <div className="relative z-10 flex items-center gap-3">
              <span className="exam-horizon-stat__icon flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {stat.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none text-foreground">{stat.value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{localizeNode(stat.label, messages)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : null}
  </div>;
}
