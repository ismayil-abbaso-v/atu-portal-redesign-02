import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

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
import { useGroupsI18n } from "@/lib/groups-i18n";

export type FennNeticesi = { id: string; ad: string; kod?: string | null };

/** Fənn adı üzrə axtaran combobox. Tyutor rejimində yalnız serverin təhlükəsiz saydığı unassigned course-lar qaytarılır. */
export function CourseSearchCombobox({
  istisnaIdler = [],
  onSecim,
  placeholder,
  disabled = false,
  tutorGroupId,
}: {
  istisnaIdler?: string[];
  onSecim: (fenn: FennNeticesi) => void;
  placeholder?: string;
  disabled?: boolean;
  tutorGroupId?: string | undefined;
}) {
  const { t } = useGroupsI18n();
  const [açıq, setAçıq] = useState(false);
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const resolvedPlaceholder = placeholder ?? t("dialog.search");

  useEffect(() => {
    const timer = setTimeout(() => setAxtaris(axtarisXami.trim()), 300);
    return () => clearTimeout(timer);
  }, [axtarisXami]);

  const { data: neticeler = [], isLoading } = useQuery({
    queryKey: ["course-search", tutorGroupId ?? "manager", axtaris],
    enabled: açıq && !disabled,
    queryFn: async (): Promise<FennNeticesi[]> => {
      if (tutorGroupId) {
        const { data, error } = await supabase.rpc(
          "list_linkable_courses_for_group" as never,
          {
            p_group_id: tutorGroupId,
            p_query: axtaris || null,
            p_limit: 30,
          } as never,
        );
        if (error) throw error;
        return ((data ?? []) as unknown as FennNeticesi[]).map((row) => ({ id: row.id, ad: row.ad, kod: row.kod ?? null }));
      }

      let sorgu = supabase.from("courses").select("id, ad, kod").order("ad").limit(30);
      if (axtaris) {
        sorgu = sorgu.ilike("ad", `%${axtaris.replace(/[%,_]/g, "")}%`);
      }
      const { data, error } = await sorgu;
      if (error) throw error;
      return (data ?? []) as FennNeticesi[];
    },
  });

  const gorunenler = neticeler.filter((row) => !istisnaIdler.includes(row.id));

  return (
    <Popover open={açıq} onOpenChange={(deyer) => !disabled && setAçıq(deyer)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={açıq}
          disabled={disabled}
          className="min-h-11 w-full justify-between rounded-xl font-normal text-muted-foreground"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0" />
            <span className="truncate">{resolvedPlaceholder}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={resolvedPlaceholder}
            value={axtarisXami}
            onValueChange={setAxtarisXami}
            disabled={disabled}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? t("dialog.loading") : t("dialog.noResult")}</CommandEmpty>
            <CommandGroup>
              {gorunenler.map((fenn) => (
                <CommandItem
                  key={fenn.id}
                  value={fenn.id}
                  disabled={disabled}
                  onSelect={() => {
                    if (disabled) return;
                    onSecim(fenn);
                    setAçıq(false);
                    setAxtarisXami("");
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{fenn.ad}</span>
                  {fenn.kod ? <span className="ml-2 shrink-0 text-xs text-muted-foreground">{fenn.kod}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
