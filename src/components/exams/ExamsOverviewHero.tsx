import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { getExamMessages } from "@/lib/exam-i18n";
import examHero from "@/assets/exams-hero.webp";
import "@/calendar-exams-redesign.css";

interface StatItem { icon: ReactNode; value: string | number; label: string; }
interface ExamsOverviewHeroProps { eyebrow?: string; title: string; subtitle: string; rightSlot?: ReactNode; stats?: StatItem[] | undefined; }

const aliases: Record<string, string> = {
  "İmtahanlar": "title",
  "Qarşıdakı imtahanlarınızı, tarix və auditoriya məlumatlarını, həmçinin son nəticələrinizi bir məkanda izləyin.": "subtitle",
  "Fənləriniz üzrə tələbələrin qiymətləndirmə jurnalını buradan idarə edin.": "teacherSubtitle",
  "Qrupunuzun davamiyyət, qeyd və imtahan cədvəlini buradan idarə edin.": "tutorSubtitle",
  "İmtahan hazırlığı": "preparation", "İmtahan cədvəli": "examSchedule", "Qarşıdakı imtahan": "upcomingExam",
  "Bu semestr fənn": "semesterSubject", "Orta nəticə": "average", "Tamamlanan imtahan": "completedExam",
  "Tələbə Paneli": "studentPanel", "Müəllim Paneli": "teacherPanel", "Tyutor Paneli": "tutorPanel",
  "Məlumat yoxdur": "noData", "Yaxşı gedir": "good", "Orta səviyyədə": "averageStatus", "Diqqət tələb edir": "attention",
};

function localizeNode(node: ReactNode, messages: ReturnType<typeof getExamMessages>): ReactNode {
  if (typeof node === "string") {
    const key = aliases[node];
    return key ? (messages as Record<string, string>)[key] ?? node : node;
  }
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "number") return node;
  if (Array.isArray(node)) return node.map((child, index) => <span key={index}>{localizeNode(child, messages)}</span>);
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode } | undefined)?.children;
    if (children === undefined) return node;
    return cloneElement(node, {}, Children.map(children, (child) => localizeNode(child, messages)));
  }
  return node;
}

const HERO_QUOTES = {
  az: "Hazırlıq bugünün zəhməti, sabahın uğurudur.",
  tr: "Hazırlık bugünün emeği, yarının başarısıdır.",
  en: "Preparation is today's effort for tomorrow's success.",
  ru: "Подготовка сегодня — успех завтра.",
} as const;

export function ExamsOverviewHero({ eyebrow, title, subtitle, rightSlot, stats }: ExamsOverviewHeroProps) {
  const { locale } = useI18n();
  const messages = getExamMessages(locale);
  const quote = HERO_QUOTES[locale as keyof typeof HERO_QUOTES] ?? HERO_QUOTES.az;

  return (
    <div className="exam-reference-hero-wrap">
      <section className="exam-reference-hero" style={{ backgroundImage: `url(${examHero})` }}>
        <div className="exam-reference-hero__shade" aria-hidden />
        <div className="exam-reference-hero__copy">
          {eyebrow ? <span className="exam-reference-hero__eyebrow">{localizeNode(eyebrow, messages)}</span> : null}
          <h1>{localizeNode(title, messages)}</h1>
          <p>{localizeNode(subtitle, messages)}</p>
        </div>
        <div className="exam-reference-hero__right">
          <blockquote>“{quote}”</blockquote>
          <div className="exam-reference-hero__words" aria-hidden><span>TƏHSİL</span><span>TEXNOLOGİYA</span><span>İNKİŞAF</span><span>SƏN</span></div>
          {rightSlot ? <div className="exam-reference-hero__status">{rightSlot}</div> : null}
        </div>
      </section>
      {stats && stats.length > 0 ? (
        <div className="exam-reference-stats">
          {stats.map((stat, index) => <div key={index} className="exam-reference-stat" style={{ animationDelay: `${index * 45}ms` }}><span>{stat.icon}</span><div><strong>{stat.value}</strong><small>{localizeNode(stat.label, messages)}</small></div></div>)}
        </div>
      ) : null}
    </div>
  );
}
