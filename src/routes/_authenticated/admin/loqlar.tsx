import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { AlertTriangle, CalendarIcon, Info, RefreshCw, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_OPERATION_OPTIONS, getActivityOperationLabel } from "@/lib/activity-log";
import { ROL_ETIKETLERI, ROL_SIRASI, type AppRole } from "@/lib/admin-users";
import { cn } from "@/lib/utils";

const SEHIFE_OLCUSU = 50;

type LogSetri = {
  id: string;
  user_id: string;
  emeliyyat: string;
  etrafli: Record<string, unknown> | null;
  created_at: string;
  profil: {
    ad: string | null;
    soyad: string | null;
    istifadeci_adi: string | null;
    avatar_url: string | null;
  } | null;
  rol: AppRole | null;
};

export const Route = createFileRoute("/_authenticated/admin/loqlar")({
  head: () => ({ meta: [{ title: "Loqlar — ATU Şəxsi Kabinet" }] }),
  component: Loqlar,
});

function Loqlar() {
  const queryClient = useQueryClient();
  const [axtaris, setAxtaris] = useState("");
  const [rol, setRol] = useState("hamisi");
  const [emeliyyat, setEmeliyyat] = useState("hamisi");
  const [tarix, setTarix] = useState<DateRange | undefined>();
  const [sehife, setSehife] = useState(1);

  const filtrBaslangic = useMemo(() => {
    if (!tarix?.from) return undefined;
    const value = new Date(tarix.from);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [tarix?.from]);

  const filtrSon = useMemo(() => {
    if (!tarix?.to) return undefined;
    const value = new Date(tarix.to);
    value.setHours(23, 59, 59, 999);
    return value;
  }, [tarix?.to]);

  const query = useQuery({
    queryKey: [
      "admin-activity-logs",
      axtaris,
      rol,
      emeliyyat,
      filtrBaslangic?.toISOString(),
      filtrSon?.toISOString(),
      sehife,
    ],
    queryFn: async () => {
      let userIds: string[] | null = null;
      const searchTerms = axtaris
        .trim()
        .replace(/^@/, "")
        .split(/\s+/)
        .map((term) => term.replace(/[(),]/g, "").trim())
        .filter(Boolean)
        .slice(0, 4);

      for (const term of searchTerms) {
        const pattern = `%${term}%`;
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id")
          .or(`istifadeci_adi.ilike.${pattern},ad.ilike.${pattern},soyad.ilike.${pattern}`)
          .limit(5000);
        if (error) throw error;
        const ids = (data ?? []).map((item) => item.user_id);
        userIds = userIds ? userIds.filter((id) => ids.includes(id)) : ids;
        if (!userIds.length) return { setirler: [] as LogSetri[], umumiSay: 0 };
      }

      if (rol !== "hamisi") {
        const { data, error } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", rol as AppRole)
          .limit(5000);
        if (error) throw error;
        const rolUserIds = new Set((data ?? []).map((item) => item.user_id));
        userIds = userIds ? userIds.filter((id) => rolUserIds.has(id)) : [...rolUserIds];
        if (!userIds.length) return { setirler: [] as LogSetri[], umumiSay: 0 };
      }

      let sorgu = (supabase as any)
        .from("activity_logs")
        .select("id,user_id,emeliyyat,etrafli,created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (userIds) sorgu = sorgu.in("user_id", userIds);
      if (emeliyyat !== "hamisi") sorgu = sorgu.eq("emeliyyat", emeliyyat);
      if (filtrBaslangic) sorgu = sorgu.gte("created_at", filtrBaslangic.toISOString());
      if (filtrSon) sorgu = sorgu.lte("created_at", filtrSon.toISOString());

      const baslangic = (sehife - 1) * SEHIFE_OLCUSU;
      const { data: loglar, count, error } = await sorgu.range(
        baslangic,
        baslangic + SEHIFE_OLCUSU - 1,
      );
      if (error) throw error;

      const ids = [...new Set((loglar ?? []).map((item: any) => String(item.user_id)))] as string[];
      if (!ids.length) return { setirler: [] as LogSetri[], umumiSay: count ?? 0 };

      const [{ data: profiller, error: profilXetasi }, { data: rollar, error: rolXetasi }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,ad,soyad,istifadeci_adi,avatar_url")
          .in("user_id", ids),
        supabase.from("user_roles").select("user_id,role").in("user_id", ids),
      ]);
      if (profilXetasi) throw profilXetasi;
      if (rolXetasi) throw rolXetasi;

      const profilMap = new Map((profiller ?? []).map((item) => [item.user_id, item]));
      const rolMap = new Map<string, AppRole>();
      for (const item of rollar ?? []) {
        const yeniRol = item.role as AppRole;
        const movcudRol = rolMap.get(item.user_id);
        if (!movcudRol || ROL_SIRASI.indexOf(yeniRol) < ROL_SIRASI.indexOf(movcudRol)) {
          rolMap.set(item.user_id, yeniRol);
        }
      }

      return {
        setirler: (loglar ?? []).map((item: any) => ({
          ...item,
          profil: profilMap.get(item.user_id) ?? null,
          rol: rolMap.get(item.user_id) ?? null,
        })) as LogSetri[],
        umumiSay: count ?? 0,
      };
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-activity-logs-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
          void queryClient.invalidateQueries({ queryKey: ["admin-dashboard", "recent-activity"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const umumiSehife = Math.max(1, Math.ceil((query.data?.umumiSay ?? 0) / SEHIFE_OLCUSU));

  useEffect(() => {
    if (sehife > umumiSehife) setSehife(umumiSehife);
  }, [sehife, umumiSehife]);

  const araliqMetni = useMemo(() => {
    if (!tarix?.from) return "Tarix aralığı";
    if (!tarix.to) return format(tarix.from, "d MMM yyyy", { locale: az });
    return `${format(tarix.from, "d MMM", { locale: az })} — ${format(tarix.to, "d MMM yyyy", { locale: az })}`;
  }, [tarix]);

  const filtrVar = Boolean(axtaris.trim() || rol !== "hamisi" || emeliyyat !== "hamisi" || tarix?.from);

  const filtrleriTemizle = () => {
    setAxtaris("");
    setRol("hamisi");
    setEmeliyyat("hamisi");
    setTarix(undefined);
    setSehife(1);
  };

  return (
    <>
      <PageHeader baslıq="Loqlar" />
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm xl:flex-row xl:flex-wrap xl:items-center">
          <div className="relative min-w-0 flex-1 xl:min-w-[260px] xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={axtaris}
              onChange={(event) => {
                setAxtaris(event.target.value);
                setSehife(1);
              }}
              placeholder="Ad, soyad və ya istifadəçi adı..."
              className="rounded-2xl pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("justify-start rounded-2xl font-medium", !tarix?.from && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 size-4" />
                {araliqMetni}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={tarix}
                onSelect={(value) => {
                  setTarix(value);
                  setSehife(1);
                }}
                numberOfMonths={2}
                initialFocus
                locale={az}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={rol}
            onValueChange={(value) => {
              setRol(value);
              setSehife(1);
            }}
          >
            <SelectTrigger className="w-full rounded-2xl xl:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hamisi">Bütün rollar</SelectItem>
              {ROL_SIRASI.map((value) => (
                <SelectItem key={value} value={value}>{ROL_ETIKETLERI[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={emeliyyat}
            onValueChange={(value) => {
              setEmeliyyat(value);
              setSehife(1);
            }}
          >
            <SelectTrigger className="w-full rounded-2xl xl:w-56">
              <SelectValue placeholder="Əməliyyat" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="hamisi">Bütün əməliyyatlar</SelectItem>
              {ACTIVITY_OPERATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtrVar ? (
            <Button variant="ghost" className="rounded-2xl" onClick={filtrleriTemizle}>
              <X className="mr-2 size-4" />
              Filtrləri təmizlə
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Yenilə
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl bg-card shadow-sm">
          {query.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Loqlar yüklənmədi</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {query.error instanceof Error ? query.error.message : "Məlumat bazası sorğusu zamanı xəta baş verdi."}
                </p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => void query.refetch()}>
                <RefreshCw className="mr-2 size-4" />
                Təkrar yoxla
              </Button>
            </div>
          ) : query.data?.setirler.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-5 py-4">İstifadəçi</th>
                    <th className="px-5 py-4">Rol</th>
                    <th className="px-5 py-4">Əməliyyat</th>
                    <th className="px-5 py-4">Tarix</th>
                    <th className="w-12 px-3 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {query.data.setirler.map((setri) => <LogSetriView key={setri.id} setri={setri} />)}
                </tbody>
              </table>
            </div>
          ) : query.isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Yüklənir...</div>
          ) : (
            <div className="min-h-80">
              <EmptyState
                icon={UserRound}
                mesaj={filtrVar ? "Bu filtrlərə uyğun fəaliyyət tapılmadı." : "Hələ fəaliyyət qeydə alınmayıb."}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>{query.data?.umumiSay ?? 0} fəaliyyət</span>
              {query.isFetching && !query.isLoading ? <span className="text-xs text-primary">yenilənir...</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={sehife <= 1}
                onClick={() => setSehife((value) => value - 1)}
              >
                Əvvəlki
              </Button>
              <span className="min-w-16 text-center font-medium text-foreground">{sehife} / {umumiSehife}</span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={sehife >= umumiSehife}
                onClick={() => setSehife((value) => value + 1)}
              >
                Növbəti
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LogSetriView({ setri }: { setri: LogSetri }) {
  const ad = [setri.profil?.ad, setri.profil?.soyad].filter(Boolean).join(" ") || "Naməlum istifadəçi";
  const username = setri.profil?.istifadeci_adi ? `@${setri.profil.istifadeci_adi}` : "—";
  const bos = !setri.etrafli || Object.keys(setri.etrafli).length === 0;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <SignedAvatarImage src={setri.profil?.avatar_url} />
            <AvatarFallback>{ad.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{ad}</p>
            <p className="truncate text-xs text-muted-foreground">{username}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {setri.rol ? ROL_ETIKETLERI[setri.rol] : "—"}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className="inline-flex rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
          {getActivityOperationLabel(setri.emeliyyat)}
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
        {format(new Date(setri.created_at), "d MMMM yyyy, HH:mm:ss", { locale: az })}
      </td>
      <td className="px-3 py-3">
        {bos ? (
          <Info className="size-4 text-muted-foreground/30" />
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full">
                <Info className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm">
              <p className="mb-2 font-semibold">Ətraflı məlumat</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">
                {JSON.stringify(setri.etrafli, null, 2)}
              </pre>
            </PopoverContent>
          </Popover>
        )}
      </td>
    </tr>
  );
}
