import { useQuery } from "@tanstack/react-query";
import {
  BookMarked,
  GraduationCap,
  PenSquare,
  RefreshCw,
  ScrollText,
  Share2,
  User,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

import type { TarixAraligi } from "./dashboard-range";

type StatKart = {
  deyer: string;
  altMetin: string;
  icon: LucideIcon;
  bgClass: string;
  iconClass: string;
};

export function StatCards({ araliq, fakulte }: { araliq: TarixAraligi; fakulte: string | null }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "admin-dashboard",
      "stats",
      araliq.start.toISOString(),
      araliq.end.toISOString(),
      fakulte,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats", {
        p_start: araliq.start.toISOString(),
        p_end: araliq.end.toISOString(),
        ...(fakulte ? { p_fakulte: fakulte } : {}),
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (isError) {
    return (
      <div className="col-span-full flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Statistika yüklənərkən xəta baş verdi.</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => void refetch()}
        >
          <RefreshCw className="size-4" />
          Yenidən cəhd et
        </Button>
      </div>
    );
  }

  const kartlar: StatKart[] = [
    {
      deyer: formatSay(data?.total_istifadeciler),
      altMetin: "Ümumi istifadəçilər",
      icon: Users2,
      bgClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      deyer: formatSay(data?.telebeler),
      altMetin: "Tələbələr",
      icon: GraduationCap,
      bgClass: "bg-[var(--chart-2)]/15",
      iconClass: "text-[var(--chart-2)]",
    },
    {
      deyer: formatSay(data?.muellimler),
      altMetin: "Müəllimlər",
      icon: User,
      bgClass: "bg-accent",
      iconClass: "text-accent-foreground",
    },
    {
      deyer: formatSay(data?.qruplar),
      altMetin: "Qruplar",
      icon: Users,
      bgClass: "bg-[var(--chart-4)]/15",
      iconClass: "text-[var(--chart-4)]",
    },
    {
      deyer: formatSay(data?.fenler),
      altMetin: "Fənlər",
      icon: Share2,
      bgClass: "bg-[var(--chart-3)]/15",
      iconClass: "text-[var(--chart-3)]",
    },
    {
      deyer: "0",
      altMetin: "Tezliklə",
      icon: PenSquare,
      bgClass: "bg-[var(--chart-4)]/15",
      iconClass: "text-[var(--chart-4)]",
    },
    {
      deyer: formatSay(data?.kitablar),
      altMetin: "Kitablar",
      icon: BookMarked,
      bgClass: "bg-[var(--chart-5)]/15",
      iconClass: "text-[var(--chart-5)]",
    },
    {
      // TODO (FAZA 9.5): activity_logs cədvəli yaradıldıqdan sonra admin_today_logs_count() ilə doldurulacaq.
      deyer: "—",
      altMetin: "Bugünkü loqlar",
      icon: ScrollText,
      bgClass: "bg-destructive/10",
      iconClass: "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {kartlar.map((kart) => (
        <div key={kart.altMetin} className={`rounded-3xl ${kart.bgClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-extrabold text-foreground">{kart.deyer}</p>
            )}
            <kart.icon className={`size-6 shrink-0 ${kart.iconClass}`} />
          </div>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{kart.altMetin}</p>
        </div>
      ))}
    </div>
  );
}

function formatSay(deyer: number | undefined | null): string {
  if (deyer === undefined || deyer === null) return "0";
  return deyer.toLocaleString("az-AZ");
}
