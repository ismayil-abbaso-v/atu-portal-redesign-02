import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import type { TarixAraligi } from "@/components/admin/dashboard/dashboard-range";
import { supabase } from "@/integrations/supabase/client";

export function TopActiveUsersCard({ dovrEtiketi, araliq }: { dovrEtiketi: string; araliq: TarixAraligi }) {
  const query = useQuery({
    queryKey: ["admin-dashboard", "top-active-users", araliq.start.toISOString(), araliq.end.toISOString()],
    queryFn: async () => {
      const { data: loglar, error } = await (supabase as any).from("activity_logs").select("user_id").gte("created_at", araliq.start.toISOString()).lt("created_at", araliq.end.toISOString()).limit(5000);
      if (error) throw error;
      const saylar = new Map<string, number>();
      for (const log of loglar ?? []) saylar.set(log.user_id, (saylar.get(log.user_id) ?? 0) + 1);
      const top = [...saylar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [];
      const { data: profiller, error: profilXetasi } = await supabase.from("profiles").select("user_id,ad,soyad,avatar_url").in("user_id", top.map(([id]) => id));
      if (profilXetasi) throw profilXetasi;
      const map = new Map((profiller ?? []).map((p) => [p.user_id, p]));
      return top.map(([userId, say]) => ({ ...map.get(userId), userId, say }));
    },
    staleTime: 30_000,
  });

  return <div className="flex flex-1 flex-col rounded-3xl bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-foreground">Ən aktiv istifadəçilər</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{dovrEtiketi}</span></div>{query.data?.length ? <div className="mt-4 space-y-3">{query.data.map((user) => <div key={user.userId} className="flex items-center justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold">{[user.ad, user.soyad].filter(Boolean).join(" ") || "Naməlum"}</p><p className="text-xs text-muted-foreground">{user.say} fəaliyyət</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{user.say}</span></div>)}</div> : <div className="flex flex-1 items-center justify-center"><EmptyState icon={Activity} mesaj="Hələ fəaliyyət qeydə alınmayıb." /></div>}</div>;
}
