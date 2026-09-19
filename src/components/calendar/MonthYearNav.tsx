import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePageI18n } from "@/lib/i18n-extra";

interface MonthYearNavProps {
  ay: number;
  il: number;
  onAySec: (ay: number) => void;
  onIlSec: (il: number) => void;
  axtaris: string;
  onAxtarisDeyis: (val: string) => void;
}

export function MonthYearNav({ ay, il, onAySec, onIlSec, axtaris, onAxtarisDeyis }: MonthYearNavProps) {
  const { locale, t } = usePageI18n();
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const todayLabel = locale === "az" || locale === "tr" ? "Bu ay" : locale === "ru" ? "Этот месяц" : "This month";
  const previousLabel = locale === "az" ? "Əvvəlki ay" : locale === "tr" ? "Önceki ay" : locale === "ru" ? "Предыдущий месяц" : "Previous month";
  const nextLabel = locale === "az" ? "Növbəti ay" : locale === "tr" ? "Sonraki ay" : locale === "ru" ? "Следующий месяц" : "Next month";
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(new Date(il, ay, 1));

  const moveMonth = (delta: number) => {
    const next = ay + delta;
    if (next < 0) { onAySec(11); onIlSec(il - 1); }
    else if (next > 11) { onAySec(0); onIlSec(il + 1); }
    else onAySec(next);
  };
  const goToday = () => { const now = new Date(); onAySec(now.getMonth()); onIlSec(now.getFullYear()); };

  return (
    <div className="calendar-month-nav">
      <div className="calendar-month-nav__controls">
        <button type="button" onClick={() => moveMonth(-1)} aria-label={previousLabel}><ChevronLeft aria-hidden /></button>
        <div><strong>{monthLabel}</strong><small>{il}</small></div>
        <button type="button" onClick={() => moveMonth(1)} aria-label={nextLabel}><ChevronRight aria-hidden /></button>
      </div>
      <div className="calendar-month-nav__tools">
        <button type="button" className="calendar-month-nav__today" onClick={goToday}>{todayLabel}</button>
        <label className="calendar-month-nav__search"><Search aria-hidden /><input value={axtaris} onChange={(event) => onAxtarisDeyis(event.target.value)} placeholder={t("calendar.searchEvent")} maxLength={100} /></label>
      </div>
    </div>
  );
}
