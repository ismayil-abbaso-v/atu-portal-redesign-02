import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { muellimAdıFormatla } from "@/lib/courses";
import { useI18n } from "@/lib/i18n";
import { sortStudentProfilesBySurnameThenName } from "@/lib/student-sort";

type AppRole = Database["public"]["Enums"]["app_role"];

export type ProfilNeticesi = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  istifadeci_adi?: string | null;
  avatar_url?: string | null;
};

export function ProfileSearchCombobox({
  rol,
  istisnaIdler = [],
  onSecim,
  placeholder = "Axtar...",
  disabled = false,
}: {
  rol: AppRole;
  istisnaIdler?: string[];
  onSecim: (profil: ProfilNeticesi) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [açıq, setAçıq] = useState(false);
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setAxtaris(axtarisXami.trim()), 250);
    return () => clearTimeout(timer);
  }, [axtarisXami]);

  const { data: neticeler = [], isLoading } = useQuery({
    queryKey: ["profile-search", rol, axtaris],
    enabled: açıq && !disabled,
    queryFn: async (): Promise<ProfilNeticesi[]> => {
      const { data: rolSetirleri, error: rolXetasi } = await supabase.from("user_roles").select("user_id").eq("role", rol);
      if (rolXetasi) throw rolXetasi;
      const idler = (rolSetirleri ?? []).map((row) => row.user_id);
      if (!idler.length) return [];

      let sorgu = supabase.from("profiles").select("user_id, ad, soyad, istifadeci_adi, avatar_url").in("user_id", idler).order("ad").limit(30);
      if (axtaris) {
        const deyer = axtaris.replace(/[%,]/g, "");
        sorgu = sorgu.or(`ad.ilike.%${deyer}%,soyad.ilike.%${deyer}%,istifadeci_adi.ilike.%${deyer}%`);
      }
      const { data, error } = await sorgu;
      if (error) throw error;
      return sortStudentProfilesBySurnameThenName(data ?? []);
    },
  });

  const gorunenler = neticeler.filter((row) => !istisnaIdler.includes(row.user_id));

  return (
    <Popover open={açıq} onOpenChange={(value) => !disabled && setAçıq(value)}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={açıq} disabled={disabled} className="h-11 w-full justify-between rounded-xl px-3 font-normal text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2"><Search className="size-4 shrink-0" /><span className="truncate">{placeholder}</span></span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-2xl p-0 shadow-xl" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={axtarisXami} onValueChange={setAxtarisXami} disabled={disabled} />
          <CommandList className="max-h-72">
            <CommandEmpty>{isLoading ? t("common.loading") : t("common.noData")}</CommandEmpty>
            <CommandGroup>
              {gorunenler.map((profil) => {
                const ad = muellimAdıFormatla(profil);
                return <CommandItem key={profil.user_id} value={profil.user_id} disabled={disabled} className="gap-3 rounded-xl px-2.5 py-2.5" onSelect={() => { if (disabled) return; onSecim(profil); setAçıq(false); setAxtarisXami(""); }}>
                  <Avatar className="size-9 shrink-0 border border-border/70">{profil.avatar_url ? <SignedAvatarImage src={profil.avatar_url} alt={ad} /> : null}<AvatarFallback className="text-xs font-semibold">{(profil.soyad?.[0] ?? profil.ad?.[0] ?? "?").toLocaleUpperCase("az-AZ")}</AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{ad}</span>{profil.istifadeci_adi ? <span className="block truncate text-xs text-muted-foreground">@{profil.istifadeci_adi}</span> : null}</span>
                </CommandItem>;
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
