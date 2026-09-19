import { format } from "date-fns";

import type { EventWithDetails } from "./DayDetails";
import { usePageI18n } from "@/lib/i18n-extra";

interface CalendarGridProps {
  ay: number;
  il: number;
  events: EventWithDetails[];
  secilmisTarix: Date;
  onTarixSec: (d: Date) => void;
}

export function CalendarGrid({ ay, il, events, secilmisTarix, onTarixSec }: CalendarGridProps) {
  const { locale, t } = usePageI18n();
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const firstDayOfMonth = new Date(il, ay, 1);
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(il, ay + 1, 0).getDate();
  const prevDaysInMonth = new Date(il, ay, 0).getDate();
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({ date: new Date(il, ay - 1, prevDaysInMonth - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(il, ay, i), isCurrentMonth: true });
  }
  for (let i = 1; i <= 42 - cells.length; i++) {
    cells.push({ date: new Date(il, ay + 1, i), isCurrentMonth: false });
  }

  const bugunStr = format(new Date(), "yyyy-MM-dd");
  const secilmisStr = format(secilmisTarix, "yyyy-MM-dd");
  const hefteninGunleri = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(2024, 0, 1 + idx);
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(date).replace(/\.$/, "");
  });

  return (
    <div className="calendar-redesign-grid overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
      <div className="calendar-redesign-grid__weekdays grid grid-cols-7 border-b border-border/70 bg-muted/25 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
        {hefteninGunleri.map((gun) => (
          <div key={gun} className="border-r border-border/60 px-1 py-3 last:border-r-0">{gun}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const cellStr = format(cell.date, "yyyy-MM-dd");
          const isToday = cellStr === bugunStr;
          const isSelected = cellStr === secilmisStr;
          const dayEvents = events
            .filter((event) => event.tarix === cellStr)
            .sort((a, b) => a.baslangic_saat.localeCompare(b.baslangic_saat));
          const visibleLimit = 3;
          const extraCount = dayEvents.length - visibleLimit;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onTarixSec(cell.date)}
              className={`calendar-redesign-grid__cell ${dayEvents.length ? "has-events" : ""} relative flex min-h-[94px] min-w-0 flex-col border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-[116px] sm:p-2 ${
                isSelected
                  ? "z-[1] bg-primary/[0.065] ring-2 ring-inset ring-primary"
                  : cell.isCurrentMonth
                    ? "bg-card hover:bg-muted/35"
                    : "bg-muted/25 text-muted-foreground/55"
              } ${idx % 7 === 6 ? "border-r-0" : ""}`}
            >
              <span
                className={`inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : cell.isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                }`}
              >
                {cell.date.getDate()}
              </span>

              <div className="mt-1.5 flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, visibleLimit).map((event) => {
                  const label = event.isLessonSession ? event.courses?.ad ?? event.baslıq : event.baslıq;
                  const chipClass = event.isExam
                    ? event.examCompleted
                      ? "calendar-redesign-grid__event--result"
                      : "calendar-redesign-grid__event--exam"
                    : event.isLessonSession
                      ? "calendar-redesign-grid__event--lesson"
                      : "calendar-redesign-grid__event--event";
                  return (
                    <div
                      key={event.id}
                      className={`calendar-redesign-grid__event min-w-0 truncate rounded-r-md border-l-[3px] px-1.5 py-0.5 text-[9px] font-semibold leading-4 sm:text-[10px] ${chipClass}`}
                      title={`${event.baslangic_saat.slice(0, 5)} · ${label}`}
                    >
                      <span className="hidden text-muted-foreground lg:inline">{event.baslangic_saat.slice(0, 5)} </span>
                      {label}
                    </div>
                  );
                })}
                {extraCount > 0 ? (
                  <span className="pl-1 text-[9px] font-bold text-muted-foreground">+{extraCount} {t("calendar.more")}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
