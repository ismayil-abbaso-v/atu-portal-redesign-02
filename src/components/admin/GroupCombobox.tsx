import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function GroupCombobox({
  deyer,
  onDeyisiklik,
}: {
  /** Seçilmiş qrupun id-si (groups.id) — profiles.qrup mətn keşi ilə qarışdırma. */
  deyer: string | null;
  onDeyisiklik: (qrupId: string | null, qrupAdi: string | null) => void;
}) {
  const [açıq, setAçıq] = useState(false);

  const { data: qruplar, isLoading } = useQuery({
    queryKey: ["admin-users", "groups-combobox"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, ad").order("ad");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const seçilmiş = qruplar?.find((q) => q.id === deyer);

  return (
    <Popover open={açıq} onOpenChange={setAçıq}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={açıq}
          className="w-full justify-between rounded-xl font-normal"
        >
          <span className={cn(!seçilmiş && "text-muted-foreground")}>{seçilmiş?.ad ?? "Qrup"}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-0" align="start">
        <Command>
          <CommandInput placeholder="Qrup axtar..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Yüklənir..." : "Qrup tapılmadı."}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__hec_biri__"
                onSelect={() => {
                  onDeyisiklik(null, null);
                  setAçıq(false);
                }}
              >
                <Check className={cn("size-4", deyer ? "opacity-0" : "opacity-100")} />
                Heç biri
              </CommandItem>
              {qruplar?.map((qrup) => (
                <CommandItem
                  key={qrup.id}
                  value={qrup.ad}
                  onSelect={() => {
                    onDeyisiklik(qrup.id, qrup.ad);
                    setAçıq(false);
                  }}
                >
                  <Check
                    className={cn("size-4", deyer === qrup.id ? "opacity-100" : "opacity-0")}
                  />
                  {qrup.ad}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
