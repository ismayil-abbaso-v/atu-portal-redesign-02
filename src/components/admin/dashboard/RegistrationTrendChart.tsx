import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

import { qranulyarlıqEtiketleri, type Qranulyarlik, type TarixAraligi } from "./dashboard-range";

const chartConfig = {
  say: {
    label: "Qeydiyyatlar",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function RegistrationTrendChart({
  araliq,
  fakulte,
  qranulyarlıq,
  onQranulyarliqChange,
  dovrEtiketi,
}: {
  araliq: TarixAraligi;
  fakulte: string | null;
  qranulyarlıq: Qranulyarlik;
  onQranulyarliqChange: (deyer: Qranulyarlik) => void;
  dovrEtiketi: string;
}) {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-dashboard",
      "trend",
      araliq.start.toISOString(),
      araliq.end.toISOString(),
      fakulte,
      qranulyarlıq,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_registration_trend", {
        p_start: araliq.start.toISOString(),
        p_end: araliq.end.toISOString(),
        ...(fakulte ? { p_fakulte: fakulte } : {}),
        p_granularity: qranulyarlıq,
      });
      if (error) throw error;
      return (data ?? []).map((sətir) => ({
        tarix: new Date(sətir.bucket),
        say: sətir.say,
      }));
    },
  });

  const qrafikData = data.map((d) => ({
    label: format(d.tarix, qranulyarlıq === "month" ? "MM/yy" : "dd/MM"),
    say: d.say,
  }));

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">İstifadəçi qeydiyyatları</h2>
          <p className="text-xs text-muted-foreground">{dovrEtiketi}</p>
        </div>
        <Select value={qranulyarlıq} onValueChange={(v) => onQranulyarliqChange(v as Qranulyarlik)}>
          <SelectTrigger className="w-[150px] rounded-xl bg-muted text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {qranulyarlıqEtiketleri.map((q) => (
              <SelectItem key={q.deyer} value={q.deyer}>
                {q.etiket}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex-1">
        {isError ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
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
          <Skeleton className="h-[220px] w-full rounded-2xl" />
        ) : qrafikData.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Seçilmiş dövrdə qeydiyyat qeydə alınmayıb.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart data={qrafikData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
              <Line
                dataKey="say"
                type="monotone"
                stroke="var(--color-say)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
