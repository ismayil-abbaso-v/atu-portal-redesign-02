import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarRange, Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FacultyManager } from "@/components/admin/FacultyManager";
import { CurrentWeekBadge } from "@/components/calendar/CurrentWeekBadge";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { systemSettingsSupabase } from "@/integrations/supabase/system-settings";

export const Route = createFileRoute("/_authenticated/admin/tenzimlemeler")({
  beforeLoad: async () => {
    const { data: userData } = await systemSettingsSupabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/ev" });
    const { data: roleRows } = await systemSettingsSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const adminMi = (roleRows ?? []).some((row) => row.role === "admin");
    if (!adminMi) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Tənzimləmələr — ATU Şəxsi Kabinet" }] }),
  component: TenzimlemelerSehifesi,
});

function TenzimlemelerSehifesi() {
  const queryClient = useQueryClient();
  const [universitetAdi, setUniversitetAdi] = useState("");
  const [elaqeEpoctu, setElaqeEpoctu] = useState("");
  const [cariTedrisIli, setCariTedrisIli] = useState("");
  const [cariSemestr, setCariSemestr] = useState<"Payız" | "Yaz">("Payız");
  const [birinciHefteNovu, setBirinciHefteNovu] = useState<"ust" | "alt" | "">("");
  const [rotasiyaBaslamaTarixi, setRotasiyaBaslamaTarixi] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data: netice, error } = await systemSettingsSupabase
        .from("system_settings")
        .select(
          "id, universitet_adi, elaqe_epoctu, cari_tedris_ili, cari_semestr, birinci_hefte_novu, hefte_rotasiya_baslama_tarixi, tedris_hefte_sayi",
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return netice;
    },
  });

  useEffect(() => {
    if (!data) return;
    setUniversitetAdi(data.universitet_adi);
    setElaqeEpoctu(data.elaqe_epoctu);
    setCariTedrisIli(data.cari_tedris_ili);
    setCariSemestr(data.cari_semestr);
    setBirinciHefteNovu(data.birinci_hefte_novu ?? "");
    setRotasiyaBaslamaTarixi(data.hefte_rotasiya_baslama_tarixi ?? "");
  }, [data]);

  const mutasiya = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error("Sistem tənzimləmələri sətri tapılmadı.");
      if (!universitetAdi.trim() || !cariTedrisIli.trim()) {
        throw new Error("Məcburi sahələri doldurun.");
      }
      if (!birinciHefteNovu || !rotasiyaBaslamaTarixi) {
        throw new Error("İlk tədris həftəsinin növünü və rotasiya başlama tarixini seçin.");
      }
      const parsed = new Date(`${rotasiyaBaslamaTarixi}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
        throw new Error("Rotasiya başlama tarixi Bazar ertəsi olmalıdır.");
      }

      const { error } = await systemSettingsSupabase
        .from("system_settings")
        .update({
          universitet_adi: universitetAdi.trim(),
          elaqe_epoctu: elaqeEpoctu.trim(),
          cari_tedris_ili: cariTedrisIli.trim(),
          cari_semestr: cariSemestr,
          birinci_hefte_novu: birinciHefteNovu,
          hefte_rotasiya_baslama_tarixi: rotasiyaBaslamaTarixi,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;

      const { error: rebuildError } = await (systemSettingsSupabase as any).rpc(
        "rebuild_current_semester_lesson_sessions",
        { p_group_id: null },
      );
      return { rebuildWarning: rebuildError?.message as string | undefined };
    },
    onSuccess: ({ rebuildWarning }) => {
      toast.success("Tənzimləmələr yadda saxlanıldı.");
      if (rebuildWarning) {
        toast.warning(`Həftə ayarı saxlanıldı, sessiyalar yenilənərkən xəbərdarlıq: ${rebuildWarning}`);
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["current-week-parity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-lesson-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["schedule-templates"] }),
      ]);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Tənzimləmələr yadda saxlanılarkən xəta baş verdi."),
  });

  return (
    <>
      <PageHeader baslıq="Tənzimləmələr">
        <CurrentWeekBadge />
      </PageHeader>
      {isLoading ? (
        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="mt-4 h-12 rounded-xl" />
          <Skeleton className="mt-4 h-12 rounded-xl" />
        </div>
      ) : isError ? (
        <EmptyState icon={Settings} mesaj="Sistem tənzimləmələri yüklənmədi." />
      ) : (
        <>
          <div className="max-w-3xl rounded-3xl bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Sistem tənzimləmələri</h2>
                <p className="text-sm text-muted-foreground">Portalın əsas məlumatlarını idarə edin.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="universitet-adi">Universitet adı</Label>
                <Input id="universitet-adi" value={universitetAdi} onChange={(e) => setUniversitetAdi(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="elaqe-epoctu">Əlaqə e-poçtu</Label>
                <Input id="elaqe-epoctu" type="email" value={elaqeEpoctu} onChange={(e) => setElaqeEpoctu(e.target.value)} className="rounded-xl" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cari-tedris-ili">Cari tədris ili</Label>
                  <Input id="cari-tedris-ili" value={cariTedrisIli} onChange={(e) => setCariTedrisIli(e.target.value)} placeholder="2026-2027" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Cari semestr</Label>
                  <Select value={cariSemestr} onValueChange={(deyer) => setCariSemestr(deyer as "Payız" | "Yaz")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Payız">Payız</SelectItem><SelectItem value="Yaz">Yaz</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarRange className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Alt / Üst həftə rotasiyası</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cron istifadə edilmir; cari həftə bu başlanğıc nöqtəsindən riyazi hesablanır.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Semestrin 1-ci tədris həftəsi</Label>
                    <Select value={birinciHefteNovu || undefined} onValueChange={(value) => setBirinciHefteNovu(value as "ust" | "alt")}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent><SelectItem value="ust">ÜST</SelectItem><SelectItem value="alt">ALT</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rotasiya-baslama">Rotasiya başlama tarixi</Label>
                    <Input id="rotasiya-baslama" type="date" value={rotasiyaBaslamaTarixi} onChange={(e) => setRotasiyaBaslamaTarixi(e.target.value)} className="rounded-xl" />
                    <p className="text-[11px] text-muted-foreground">Semestrin ilk tədris həftəsinin Bazar ertəsini seçin.</p>
                  </div>
                </div>
              </div>

              <Button disabled={mutasiya.isPending || !data} onClick={() => mutasiya.mutate()} className="w-full gap-2 rounded-xl font-bold sm:w-auto">
                {mutasiya.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {mutasiya.isPending ? "Yadda saxlanılır..." : "Yadda saxla"}
              </Button>
            </div>
          </div>
          <FacultyManager />
        </>
      )}
    </>
  );
}
