import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ROL_ETIKETLERI, ROL_SIRASI, type AppRole } from "@/lib/admin-users";

export function RoleMultiSelect({
  seçilenler,
  onDeyisiklik,
  placeholder = "Rol seçin",
}: {
  seçilenler: AppRole[];
  onDeyisiklik: (deyer: AppRole[]) => void;
  placeholder?: string;
}) {
  function toggle(rol: AppRole) {
    if (seçilenler.includes(rol)) {
      onDeyisiklik(seçilenler.filter((r) => r !== rol));
    } else {
      onDeyisiklik([...seçilenler, rol]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full justify-between rounded-xl px-3 py-2 font-normal"
        >
          {seçilenler.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {seçilenler.map((rol) => (
                <Badge key={rol} variant="secondary" className="rounded-md">
                  {ROL_ETIKETLERI[rol]}
                </Badge>
              ))}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 rounded-xl p-2" align="start">
        <div className="flex flex-col gap-1">
          {ROL_SIRASI.map((rol) => (
            <label
              key={rol}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={seçilenler.includes(rol)} onCheckedChange={() => toggle(rol)} />
              {ROL_ETIKETLERI[rol]}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
