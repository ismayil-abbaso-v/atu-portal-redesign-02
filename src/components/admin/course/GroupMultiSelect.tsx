import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

export function GroupMultiSelect({
  seçilenler,
  onDeyisiklik,
}: {
  seçilenler: string[];
  onDeyisiklik: (deyer: string[]) => void;
}) {
  const { data: qruplar = [] } = useQuery({
    queryKey: ["course-form", "groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, ad").order("ad");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  function toggle(id: string) {
    if (seçilenler.includes(id)) {
      onDeyisiklik(seçilenler.filter((s) => s !== id));
    } else {
      onDeyisiklik([...seçilenler, id]);
    }
  }

  const seçiliAdlar = qruplar.filter((q) => seçilenler.includes(q.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full justify-between rounded-xl px-3 py-2 font-normal"
        >
          {seçiliAdlar.length === 0 ? (
            <span className="text-muted-foreground">Qrup(lar) seçin</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {seçiliAdlar.map((q) => (
                <Badge key={q.id} variant="secondary" className="rounded-md">
                  {q.ad}
                </Badge>
              ))}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-2" align="start">
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {qruplar.map((q) => (
            <label
              key={q.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={seçilenler.includes(q.id)} onCheckedChange={() => toggle(q.id)} />
              {q.ad}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
