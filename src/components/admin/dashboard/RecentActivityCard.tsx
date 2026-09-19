import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { ChevronRight, ScrollText } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { getActivityOperationLabel } from "@/lib/activity-log";

export function RecentActivityCard() {
  const query = useQuery({
    queryKey: ["admin-dashboard", "recent-activity"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_logs")
        .select("id,user_id,emeliyyat,created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((item: any) => String(item.user_id)))] as string[];
      if (!ids.length) return [];

      const { data: profiller, error: profilXetasi } = await supabase
        .from("profiles")
        .select("user_id,ad,soyad")
        .in("user_id", ids);
      if (profilXetasi) throw profilXetasi;

      const profilMap = new Map((profiller ?? []).map((profil) => [profil.user_id, profil]));
      return (data ?? []).map((item: any) => ({ ...item, profil: profilMap.get(item.user_id) }));
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Son fəaliyyət</h2>
        <Link to="/admin/loqlar" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
          Hamısına bax
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {query.data?.length ? (
        <div className="mt-4 space-y-3">
          {query.data.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {[item.profil?.ad, item.profil?.soyad].filter(Boolean).join(" ") || "Naməlum istifadəçi"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{getActivityOperationLabel(item.emeliyyat)}</p>
              </div>
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: az })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={ScrollText} mesaj={query.isError ? "Fəaliyyət məlumatı yüklənmədi." : "Hələ fəaliyyət qeydə alınmayıb."} />
        </div>
      )}
    </div>
  );
}
