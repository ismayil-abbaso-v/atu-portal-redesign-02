import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { BarChart3, Download, Eye, FileText, Loader2, Search, TrendingUp, Users, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { useUserRoles } from "@/hooks/use-user-role";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";

export const Route = createFileRoute("/_authenticated/fakulte-icmali")({
  head: () => ({ meta: [{ title: "Fakültə İcmalı — ATU Şəxsi Kabinet" }] }),
  component: FakulteIcmali,
});

type Qrup = { group_id: string; group_ad: string; tyutor_id: string | null; fakulte: string; student_count: number; avg_attendance_pct: number; avg_final_grade: number };
type Tyutor = { tutor_id: string; fakulte: string; group_count: number; student_count: number; avg_attendance_pct: number; avg_final_grade: number; group_names: string };
type Profil = { user_id: string; ad: string | null; soyad: string | null; ata_adi: string | null; istifadeci_adi: string | null; e_poct: string | null; telefon: string | null; fakulte: string | null; qrup: string | null; status: string; avatar_url: string | null };
type ProfilRol = Profil & { rol: string };

const rolEtiketləri: Record<string, string> = { telebe: "Tələbə", tyutor: "Tyutor", muellim: "Müəllim", dekan: "Dekan", admin: "Admin" };

function FakulteIcmali() {
  const { roles, userId, isLoading: rolYuklenir } = useUserRoles();
  const queryClient = useQueryClient();
  const [axtaris, setAxtaris] = useState("");
  const [siralama, setSiralama] = useState<"davamiyyət" | "qiymət">("davamiyyət");
  const [secilmisProfil, setSecilmisProfil] = useState<ProfilRol | null>(null);
  const [cədvəlNövü, setCədvəlNövü] = useState<"qrup" | "tyutor">("qrup");

  const isDekan = roles.includes("dekan");

  const profilQuery = useQuery({
    queryKey: ["faculty-summary", "current-profile", userId],
    enabled: !!userId && isDekan,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("fakulte").eq("user_id", userId!).single();
      if (error) throw error;
      return data?.fakulte ?? null;
    },
  });
  const fakulte = profilQuery.data;

  const qruplarQuery = useQuery({
    queryKey: ["faculty-summary", "groups", fakulte],
    enabled: !!fakulte,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("group_performance_view").select("*").eq("fakulte", fakulte).order("avg_final_grade", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Qrup[];
    },
  });

  const tyutorQuery = useQuery({
    queryKey: ["faculty-summary", "tutors", fakulte],
    enabled: !!fakulte,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tutor_performance_view").select("*").eq("fakulte", fakulte).order("avg_final_grade", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tyutor[];
    },
  });

  const trendQuery = useQuery({
    queryKey: ["faculty-summary", "trend", fakulte],
    enabled: !!fakulte,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("faculty_attendance_trend_view").select("ay,avg_attendance_pct").eq("fakulte", fakulte).order("ay");
      if (error) throw error;
      return (data ?? []).map((x: any) => ({ ay: format(new Date(x.ay), "MMM", { locale: az }), davamiyyət: Number(x.avg_attendance_pct ?? 0) }));
    },
  });

  const profillərQuery = useQuery({
    queryKey: ["faculty-summary", "profiles", fakulte],
    enabled: !!fakulte,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id,ad,soyad,ata_adi,istifadeci_adi,e_poct,telefon,fakulte,qrup,status,avatar_url").eq("fakulte", fakulte!).order("ad").limit(500);
      if (error) throw error;
      const profillər = (data ?? []) as Profil[];
      if (!profillər.length) return [] as ProfilRol[];
      const { data: rollar } = await supabase.from("user_roles").select("user_id,role").in("user_id", profillər.map((p) => p.user_id));
      const rolMap = new Map((rollar ?? []).map((r) => [r.user_id, String(r.role)]));
      return profillər.filter((p) => ["telebe", "tyutor"].includes(rolMap.get(p.user_id) ?? "")).map((p) => ({ ...p, rol: rolMap.get(p.user_id) ?? "telebe" })) as ProfilRol[];
    },
  });

  const facultyStatsQuery = useQuery({
    queryKey: ["faculty-summary", "faculty-stats", fakulte],
    enabled: !!fakulte,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("faculty_stats").select("*").eq("fakulte", fakulte).maybeSingle();
      if (error) return null;
      return data as Record<string, unknown> | null;
    },
  });

  const qruplar = qruplarQuery.data ?? [];
  const tyutorlar = tyutorQuery.data ?? [];
  const facultyStats = facultyStatsQuery.data ?? {};
  const umumiTelebe = Number(facultyStats["umumi_telebe_sayi"] ?? facultyStats["student_count"] ?? qruplar.reduce((s, q) => s + Number(q.student_count), 0));
  const aktivQrup = qruplar.length;
  const ortaDavamiyyət = qruplar.length ? qruplar.reduce((s, q) => s + Number(q.avg_attendance_pct), 0) / qruplar.length : 0;
  const ortaQiymet = qruplar.length ? qruplar.reduce((s, q) => s + Number(q.avg_final_grade), 0) / qruplar.length : 0;

  const cədvəl = useMemo(() => {
    const a = axtaris.trim().toLocaleLowerCase("az");
    if (cədvəlNövü === "qrup") return qruplar.filter((q) => q.group_ad.toLocaleLowerCase("az").includes(a)).sort((x, y) => siralama === "davamiyyət" ? y.avg_attendance_pct - x.avg_attendance_pct : y.avg_final_grade - x.avg_final_grade);
    return tyutorlar.filter((t) => (t.group_names ?? "").toLocaleLowerCase("az").includes(a)).sort((x, y) => siralama === "davamiyyət" ? y.avg_attendance_pct - x.avg_attendance_pct : y.avg_final_grade - x.avg_final_grade);
  }, [axtaris, cədvəlNövü, qruplar, siralama, tyutorlar]);

  const profilAdi = (id: string) => { const p = profillərQuery.data?.find((x) => x.user_id === id); return p ? [p.ad, p.soyad].filter(Boolean).join(" ") || "Adsız" : id; };

  const statusMutasiyası = useMutation({
    mutationFn: async ({ user_id, status }: { user_id: string; status: string }) => {
      const { error } = await (supabase as any).rpc("set_profile_status", { _user_id: user_id, _status: status });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status yeniləndi."); void queryClient.invalidateQueries({ queryKey: ["faculty-summary", "profiles"] }); setSecilmisProfil((p) => p ? { ...p, status: p.status === "AKTİV" ? "PASSİV" : "AKTİV" } : null); },
    onError: (e: Error) => toast.error(e.message || "Status dəyişdirilə bilmədi."),
  });

  function csvExport() {
    const sətirlər = cədvəl as any[];
    const rows = cədvəlNövü === "qrup" ? [["Qrup", "Tələbə sayı", "Ortalama davamiyyət %", "Ortalama yekun qiymət"], ...sətirlər.map((q) => [q.group_ad, q.student_count, q.avg_attendance_pct.toFixed(2), q.avg_final_grade.toFixed(2)])] : [["Tyutor", "Qruplar", "Tələbə sayı", "Ortalama davamiyyət %", "Ortalama yekun qiymət"], ...sətirlər.map((t) => [profilAdi(t.tutor_id), t.group_count, t.student_count, t.avg_attendance_pct.toFixed(2), t.avg_final_grade.toFixed(2)])];
    const csv = rows.map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `fakulte-icmali-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (rolYuklenir || profilQuery.isLoading) return <div className="space-y-4"><PageHeader baslıq="Fakültə İcmalı" /><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>;
  if (!isDekan) return <><PageHeader baslıq="Fakültə İcmalı" /><div className="flex flex-1 rounded-3xl bg-card shadow-sm"><EmptyState icon={BarChart3} mesaj="Bu səhifə yalnız dekan üçün əlçatandır." /></div></>;
  if (!fakulte) return <><PageHeader baslıq="Fakültə İcmalı" /><div className="flex flex-1 rounded-3xl bg-card shadow-sm"><EmptyState icon={BarChart3} mesaj="Profilinizdə fakültə məlumatı təyin edilməyib." /></div></>;

  return <>
    <PageHeader baslıq="Fakültə İcmalı"><div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.print()}><FileText className="size-4" />PDF / Çap</Button><Button className="gap-2 rounded-xl" onClick={csvExport}><Download className="size-4" />Hesabat generasiya et</Button></div></PageHeader>
    <main className="space-y-4 print:space-y-3">
      <div className="rounded-2xl border bg-card px-4 py-3 text-sm font-medium text-muted-foreground print:border-0"><span className="text-foreground">{fakulte}</span> üzrə fakültə göstəriciləri</div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Ümumi tələbə sayı", value: umumiTelebe, icon: Users }, { label: "Ortalama davamiyyət", value: `${ortaDavamiyyət.toFixed(1)}%`, icon: TrendingUp }, { label: "Ortalama qiymət", value: ortaQiymet.toFixed(1), icon: BarChart3 }, { label: "Aktiv qrup sayı", value: aktivQrup, icon: UsersRound }].map((x) => <div key={x.label} className="rounded-3xl bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{x.label}</span><x.icon className="size-5 text-muted-foreground" /></div><div className="mt-3 text-2xl font-bold">{x.value}</div></div>)}
      </section>
      <section className="rounded-3xl bg-card p-5 shadow-sm"><div className="mb-4"><h2 className="text-base font-bold text-foreground">Davamiyyət trendi</h2><p className="text-xs text-muted-foreground">Son 6 ay</p></div>{trendQuery.data?.length ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendQuery.data}><XAxis dataKey="ay" /><YAxis domain={[0, 100]} /><Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Davamiyyət"]} /><Line type="monotone" dataKey="davamiyyət" stroke="currentColor" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <EmptyState icon={TrendingUp} mesaj="Davamiyyət trendi üçün məlumat yoxdur." />}</section>
      <section className="rounded-3xl bg-card p-4 shadow-sm"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={axtaris} onChange={(e) => setAxtaris(e.target.value)} placeholder="Qrup və ya tyutor axtar..." className="rounded-xl pl-9" /></div><div className="flex flex-wrap gap-2"><Button variant={cədvəlNövü === "qrup" ? "default" : "outline"} className="rounded-xl" onClick={() => setCədvəlNövü("qrup")}>Qruplar</Button><Button variant={cədvəlNövü === "tyutor" ? "default" : "outline"} className="rounded-xl" onClick={() => setCədvəlNövü("tyutor")}>Tyutorlar</Button><Button variant="outline" className="rounded-xl" onClick={() => setSiralama((s) => s === "davamiyyət" ? "qiymət" : "davamiyyət")}>Sıra: {siralama}</Button></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>{cədvəlNövü === "qrup" ? <><TableHead>Qrup</TableHead><TableHead>Tələbə</TableHead></> : <><TableHead>Tyutor</TableHead><TableHead>Qruplar</TableHead><TableHead>Tələbə</TableHead></>}<TableHead>Davamiyyət %</TableHead><TableHead>Ortalama qiymət</TableHead></TableRow></TableHeader><TableBody>{cədvəl.map((item: any) => <TableRow key={cədvəlNövü === "qrup" ? item.group_id : item.tutor_id}><TableCell className="font-medium">{cədvəlNövü === "qrup" ? item.group_ad : profilAdi(item.tutor_id)}</TableCell>{cədvəlNövü === "qrup" ? <TableCell>{item.student_count}</TableCell> : <><TableCell>{item.group_count}</TableCell><TableCell>{item.student_count}</TableCell></>}<TableCell>{Number(item.avg_attendance_pct).toFixed(1)}%</TableCell><TableCell>{Number(item.avg_final_grade).toFixed(1)}</TableCell></TableRow>)}</TableBody></Table></div>
        {!cədvəl.length && <EmptyState icon={UsersRound} mesaj="Uyğun nəticə tapılmadı." />}
      </section>
      <section className="rounded-3xl bg-card p-4 shadow-sm print:hidden"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-foreground">Tyutor və tələbə hesablarına baxış</h2><span className="text-xs text-muted-foreground">Yalnız oxuma · status istisnadır</span></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>İstifadəçi</TableHead><TableHead>Rol</TableHead><TableHead>Qrup</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(profillərQuery.data ?? []).slice(0, 50).map((p) => <TableRow key={p.user_id}><TableCell><div className="flex items-center gap-2"><Avatar className="size-8"><SignedAvatarImage src={p.avatar_url} /><AvatarFallback>{`${p.ad?.[0] ?? ""}${p.soyad?.[0] ?? ""}`}</AvatarFallback></Avatar><span>{[p.ad, p.soyad].filter(Boolean).join(" ") || "Adsız"}</span></div></TableCell><TableCell><Badge variant="secondary">{rolEtiketləri[p.rol] ?? p.rol}</Badge></TableCell><TableCell>{p.qrup ?? "—"}</TableCell><TableCell><Badge variant={p.status === "AKTİV" ? "default" : "secondary"}>{p.status}</Badge></TableCell><TableCell><Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setSecilmisProfil(p)}><Eye className="size-3.5" />Bax</Button></TableCell></TableRow>)}</TableBody></Table></div></section>
    </main>
    <Dialog open={!!secilmisProfil} onOpenChange={(v) => !v && setSecilmisProfil(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Profil məlumatları</DialogTitle></DialogHeader>{secilmisProfil && <div className="space-y-4"><div className="flex items-center gap-3"><Avatar className="size-14"><SignedAvatarImage src={secilmisProfil.avatar_url} /><AvatarFallback>{`${secilmisProfil.ad?.[0] ?? ""}${secilmisProfil.soyad?.[0] ?? ""}`}</AvatarFallback></Avatar><div><p className="font-semibold">{[secilmisProfil.ad, secilmisProfil.soyad].filter(Boolean).join(" ")}</p><p className="text-sm text-muted-foreground">@{secilmisProfil.istifadeci_adi ?? "—"}</p></div></div><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">E-poçt</p><p>{secilmisProfil.e_poct ?? "—"}</p></div><div><p className="text-muted-foreground">Telefon</p><p>{secilmisProfil.telefon ?? "—"}</p></div><div><p className="text-muted-foreground">Fakültə</p><p>{secilmisProfil.fakulte ?? "—"}</p></div><div><p className="text-muted-foreground">Qrup</p><p>{secilmisProfil.qrup ?? "—"}</p></div></div><Button variant="outline" className="w-full rounded-xl" disabled={statusMutasiyası.isPending} onClick={() => statusMutasiyası.mutate({ user_id: secilmisProfil.user_id, status: secilmisProfil.status === "AKTİV" ? "PASSİV" : "AKTİV" })}>{statusMutasiyası.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Statusu {secilmisProfil.status === "AKTİV" ? "passiv" : "aktiv"} et</Button></div>}</DialogContent></Dialog>
    <style>{`@media print { .print\\:hidden { display:none !important } body { background:white !important } }`}</style>
  </>;
}
