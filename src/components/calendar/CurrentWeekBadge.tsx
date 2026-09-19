import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const WEEK_COPY: Record<Locale, { current: string; unset: string; upper: string; lower: string }> = {
  az: { current: "Cari həftə", unset: "Ayarlanmayıb", upper: "ÜST", lower: "ALT" },
  tr: { current: "Geçerli hafta", unset: "Ayarlanmamış", upper: "ÜST", lower: "ALT" },
  en: { current: "Current week", unset: "Not configured", upper: "UPPER", lower: "LOWER" },
  ru: { current: "Текущая неделя", unset: "Не настроена", upper: "ВЕРХ", lower: "НИЗ" },
};

export function CurrentWeekBadge({ className }: { className?: string }) {
  const { locale } = useI18n();
  const copy = WEEK_COPY[locale];
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: parity, isLoading } = useQuery({
    queryKey: ["current-week-parity", today],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_week_parity", { p_date: today });
      if (error) throw error;
      return data as "ust" | "alt" | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const label = isLoading
    ? `${copy.current}: ...`
    : parity
      ? `${copy.current}: ${parity === "ust" ? copy.upper : copy.lower}`
      : `${copy.current}: ${copy.unset}`;

  return (
    <Badge
      variant={parity ? "secondary" : "outline"}
      className={cn("h-8 rounded-xl px-3 text-[11px] tracking-wide", className)}
    >
      {label}
    </Badge>
  );
}
