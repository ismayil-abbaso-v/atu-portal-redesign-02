import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export function TodaySessionsCard() {
  const query = useQuery({
    queryKey: ["admin-dashboard", "today-logs"],
    queryFn: async () => {
      const baslangic = new Date();
      baslangic.setHours(0, 0, 0, 0);
      const son = new Date(baslangic);
      son.setDate(son.getDate() + 1);
      const { count, error } = await (supabase as any)
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", baslangic.toISOString())
        .lt("created_at", son.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  return <div className="flex flex-1 flex-col rounded-3xl bg-card p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between"><h2 className="text-base font-bold text-foreground">Bugünkü loqlar</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{query.data ?? "—"}</span></div>
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center"><Activity className="size-10 stroke-[1.25] text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Bu gün sistemdə qeydə alınan fəaliyyətlərin sayı.</p></div>
  </div>;
}
