import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, RotateCw } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

import {
  presetDefaultQranulyarliq,
  presetEtiketleri,
  presetToRange,
  type Qranulyarlik,
  type TarixAraligi,
  type TarixAraligiPreset,
} from "./dashboard-range";

export function DashboardFilters({
  preset,
  onPresetChange,
  serbestAraligi,
  onSerbestAraligiChange,
  fakulte,
  onFakulteChange,
  onQranulyarliqDefaultChange,
}: {
  preset: TarixAraligiPreset;
  onPresetChange: (preset: TarixAraligiPreset) => void;
  serbestAraligi: TarixAraligi | undefined;
  onSerbestAraligiChange: (araliq: TarixAraligi | undefined) => void;
  fakulte: string | null;
  onFakulteChange: (fakulte: string | null) => void;
  onQranulyarliqDefaultChange: (qranulyarlıq: Qranulyarlik) => void;
}) {
  const queryClient = useQueryClient();
  const [tequimAcıq, setTeqvimAcıq] = useState(false);

  const { data: fakulteler = [], isLoading: fakulteYuklenir } = useQuery({
    queryKey: ["admin-dashboard", "faculties"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_distinct_faculties");
      if (error) throw error;
      return (data ?? []).map((r) => r.fakulte).filter((f): f is string => !!f);
    },
  });

  function handlePresetClick(yeni: TarixAraligiPreset) {
    onPresetChange(yeni);
    onQranulyarliqDefaultChange(presetDefaultQranulyarliq[yeni]);
    if (yeni === "serbest") setTeqvimAcıq(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {presetEtiketleri.map((p) => (
          <button
            key={p.deyer}
            type="button"
            onClick={() => handlePresetClick(p.deyer)}
            className={`whitespace-nowrap rounded-2xl px-3.5 py-2 text-sm font-semibold transition-colors ${
              preset === p.deyer
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.etiket}
          </button>
        ))}

        {preset === "serbest" ? (
          <Popover open={tequimAcıq} onOpenChange={setTeqvimAcıq}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-1 gap-2 rounded-2xl">
                <CalendarIcon className="size-4" />
                {serbestAraligi
                  ? `${format(serbestAraligi.start, "dd.MM.yyyy")} – ${format(serbestAraligi.end, "dd.MM.yyyy")}`
                  : "Tarix seçin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-2xl p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  serbestAraligi
                    ? { from: serbestAraligi.start, to: serbestAraligi.end }
                    : undefined
                }
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onSerbestAraligiChange({ start: range.from, end: range.to });
                  } else if (range?.from) {
                    onSerbestAraligiChange({ start: range.from, end: range.from });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={fakulte ?? "hamisi"}
          onValueChange={(v) => onFakulteChange(v === "hamisi" ? null : v)}
        >
          <SelectTrigger className="w-[200px] rounded-2xl">
            <SelectValue placeholder="Bütün fakültələr" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hamisi">Bütün fakültələr</SelectItem>
            {fakulteYuklenir ? (
              <div className="p-2">
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              fakulteler.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* TODO (FAZA 9.5): activity_logs cədvəli yaradıldıqdan sonra bu badge admin_active_now_count()
            funksiyasından son 5 dəqiqədə fəal istifadəçi sayını göstərəcək. Hazırda cədvəl yoxdur. */}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />— aktiv
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-2xl"
          aria-label="Yenilə"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })}
        >
          <RotateCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
