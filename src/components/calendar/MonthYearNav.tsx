import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePageI18n } from "@/lib/i18n-extra";

const MONTH_NAMES = {
  az: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"],
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
} as const;

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
  const todayLabel = locale === "az" || locale === "tr" ? "Bu ay" : locale === "ru" ? "Этот месяц" : "This month";
  const previousLabel = locale === "az" ? "Əvvəlki ay" : locale === "tr" ? "Önceki ay" : locale === "ru" ? "Предыдущий месяц" : "Previous month";
  const nextLabel = locale === "az" ? "Növbəti ay" : locale === "tr" ? "Sonraki ay" : locale === "ru" ? "Следующий месяц" : "Next month";
  const monthLabel = `${MONTH_NAMES[locale][ay]} ${il}`;

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
