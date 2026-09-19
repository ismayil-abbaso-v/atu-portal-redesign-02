import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

import { rolEtiketleri, rolRengleri } from "./dashboard-range";

export function RoleDistributionChart({
  fakulte,
  fakulteEtiketi,
}: {
  fakulte: string | null;
  fakulteEtiketi: string;
}) {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-dashboard", "roles", fakulte],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_role_distribution", {
        ...(fakulte ? { p_fakulte: fakulte } : {}),
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cemi = data.reduce((cem, sətir) => cem + sətir.say, 0);

  const chartConfig = data.reduce<ChartConfig>((konfiq, sətir) => {
    konfiq[sətir.role] = {
      label: rolEtiketleri[sətir.role] ?? sətir.role,
      color: rolRengleri[sətir.role] ?? "var(--muted-foreground)",
    };
    return konfiq;
  }, {});

  return (
    <div className="flex w-full flex-col rounded-3xl bg-card p-5 shadow-sm sm:p-6 lg:w-[360px]">
      <div>
        <h2 className="text-base font-bold text-foreground">İstifadəçilər</h2>
        <p className="text-xs text-muted-foreground">{fakulteEtiketi}</p>
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Qrafik yüklənərkən xəta baş verdi.</p>
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
        ) : isLoading ? (
          <Skeleton className="size-[200px] rounded-full" />
        ) : data.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Məlumat yoxdur.</p>
        ) : (
          <div className="relative">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="say"
                  nameKey="role"
                  innerRadius={62}
                  outerRadius={90}
                  strokeWidth={3}
                  stroke="var(--card)"
                >
                  {data.map((sətir) => (
                    <Cell
                      key={sətir.role}
                      fill={rolRengleri[sətir.role] ?? "var(--muted-foreground)"}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Cəmi</span>
              <span className="text-2xl font-extrabold text-foreground">
                {cemi.toLocaleString("az-AZ")}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isLoading && !isError && data.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {data.map((sətir) => (
            <span
              key={sətir.role}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: rolRengleri[sətir.role] ?? "var(--muted-foreground)" }}
              />
              {rolEtiketleri[sətir.role] ?? sətir.role}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
