import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { muellimAdıFormatla } from "@/lib/courses";
import { sortStudentProfilesBySurnameThenName } from "@/lib/student-sort";

export type CourseStudentResult = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  istifadeci_adi: string | null;
  avatar_url: string | null;
};

export function CourseStudentSearchCombobox({
  courseId,
  istisnaIdler = [],
  onSecim,
  placeholder = "Tələbə axtar...",
  disabled = false,
}: {
  courseId: string;
  istisnaIdler?: string[];
  onSecim: (profil: CourseStudentResult) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [açıq, setAçıq] = useState(false);
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setAxtaris(axtarisXami.trim().toLocaleLowerCase("az")), 200);
    return () => window.clearTimeout(t);
  }, [axtarisXami]);

  const { data: neticeler = [], isLoading } = useQuery({
    queryKey: ["course-student-search", courseId],
    enabled: açıq && !disabled,
    queryFn: async (): Promise<CourseStudentResult[]> => {
      const [{ data: links, error: linkError }, { data: course, error: courseError }] = await Promise.all([
        supabase.from("course_groups").select("group_id").eq("course_id", courseId),
        supabase.from("courses").select("group_id").eq("id", courseId).single(),
      ]);
      if (linkError) throw linkError;
      if (courseError) throw courseError;

      const groupIds = new Set<string>();
      for (const row of links ?? []) if (row.group_id) groupIds.add(row.group_id);
      if (course.group_id) groupIds.add(course.group_id);
      if (groupIds.size === 0) return [];

      const { data: memberRows, error: memberError } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", [...groupIds]);
      if (memberError) throw memberError;

      const memberIds = [...new Set((memberRows ?? []).map((row) => row.user_id))];
      if (memberIds.length === 0) return [];

      const { data: studentRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "telebe")
        .in("user_id", memberIds);
      if (roleError) throw roleError;

      const studentIds = [...new Set((studentRoles ?? []).map((row) => row.user_id))];
      if (studentIds.length === 0) return [];

      const { data: profiller, error: profilError } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, istifadeci_adi, avatar_url")
        .in("user_id", studentIds)
        .order("soyad")
        .order("ad");
      if (profilError) throw profilError;

      return sortStudentProfilesBySurnameThenName((profiller ?? []) as CourseStudentResult[]);
    },
  });

  const gorunenler = neticeler.filter((profil) => {
    if (istisnaIdler.includes(profil.user_id)) return false;
    if (!axtaris) return true;
    const haystack = [profil.ad, profil.soyad, profil.istifadeci_adi]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("az");
    return haystack.includes(axtaris);
  });

  return (
    <Popover open={açıq} onOpenChange={(open) => !disabled && setAçıq(open)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={açıq}
          disabled={disabled}
          className="h-11 w-full justify-between rounded-xl px-3 font-normal text-muted-foreground"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0" />
            <span className="truncate">{placeholder}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-2xl p-0 shadow-xl" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ad, soyad və ya istifadəçi adı..."
            value={axtarisXami}
            onValueChange={setAxtarisXami}
            disabled={disabled}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {isLoading ? "Yüklənir..." : "Bu fənnin qruplarında uyğun tələbə tapılmadı."}
            </CommandEmpty>
            <CommandGroup>
              {gorunenler.map((profil) => {
                const ad = muellimAdıFormatla(profil);
                return (
                  <CommandItem
                    key={profil.user_id}
                    value={profil.user_id}
                    disabled={disabled}
                    className="gap-3 rounded-xl px-2.5 py-2.5"
                    onSelect={() => {
                      if (disabled) return;
                      onSecim(profil);
                      setAçıq(false);
                      setAxtarisXami("");
                    }}
                  >
                    <Avatar className="size-9 shrink-0 border border-border/70">
                      {profil.avatar_url ? <SignedAvatarImage src={profil.avatar_url} alt={ad} /> : null}
                      <AvatarFallback className="text-xs font-semibold">
                        {(profil.ad?.[0] ?? profil.soyad?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{ad}</span>
                      {profil.istifadeci_adi ? (
                        <span className="block truncate text-xs text-muted-foreground">@{profil.istifadeci_adi}</span>
                      ) : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
