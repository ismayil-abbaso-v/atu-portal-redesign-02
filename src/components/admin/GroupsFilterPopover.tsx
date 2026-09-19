import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Fakultə = { id: string; ad: string; kod: string | null };

export function GroupsFilterPopover({
  fakultələr,
  fakultəFilter,
  onDeyisiklik,
}: {
  fakultələr: Fakultə[];
  fakultəFilter: string;
  onDeyisiklik: (deyer: string) => void;
}) {
  const aktivSay = fakultəFilter !== "hamisi" ? 1 : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Filter className="size-4" />
          Süzgəc
          {aktivSay > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {aktivSay}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-xl" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Fakültə</p>
            <Select value={fakultəFilter} onValueChange={onDeyisiklik}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hamisi">Bütün fakültələr</SelectItem>
                {fakultələr.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.ad}
                    {f.kod ? ` · ${f.kod}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {aktivSay > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => onDeyisiklik("hamisi")}
            >
              Süzgəcləri təmizlə
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
