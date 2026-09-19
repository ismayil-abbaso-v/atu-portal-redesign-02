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

const AZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
] as const;

export function MonthYearNav({ ay, il, onAySec, onIlSec, axtaris, onAxtarisDeyis }: MonthYearNavProps) {
  const { locale, t } = usePageI18n();
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const aylar = locale === "az"
    ? [...AZ_MONTHS]
    : Array.from({ length: 12 }, (_, idx) => new Intl.DateTimeFormat(intlLocale, { month: "long" }).format(new Date(2000, idx, 1)));

  return (
    <div className="space-y-4 rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onIlSec(il - 1)} aria-label={t("calendar.previousYear")} className="inline-flex size-11 items-center justify-center rounded-xl bg-muted text-foreground transition-colors hover:bg-accent">
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-base font-bold text-foreground">{il}</span>
        <button type="button" onClick={() => onIlSec(il + 1)} aria-label={t("calendar.nextYear")} className="inline-flex size-11 items-center justify-center rounded-xl bg-muted text-foreground transition-colors hover:bg-accent">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {aylar.map((ayAd, idx) => {
          const aktiv = idx === ay;
          return (
            <button type="button" key={idx} onClick={() => onAySec(idx)} className={`min-h-11 rounded-xl text-xs font-bold capitalize transition-all ${aktiv ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              {ayAd}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={axtaris} onChange={(e) => onAxtarisDeyis(e.target.value)} placeholder={t("calendar.searchEvent")} maxLength={100} className="min-h-11 w-full rounded-xl bg-muted pl-10 pr-4 text-xs text-foreground outline-none ring-ring/40 transition focus:ring-2" />
      </div>
    </div>
  );
}
