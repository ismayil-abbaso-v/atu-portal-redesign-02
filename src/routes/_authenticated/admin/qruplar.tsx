import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  Search,
  Users2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GroupsFilterPopover } from "@/components/admin/GroupsFilterPopover";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { muellimAdıFormatla } from "@/lib/courses";
import { GROUPS_SEHIFE_OLCULERI } from "@/lib/groups";
import { cn } from "@/lib/utils";

const db = supabase as any;
type Fakultə = { id: string; ad: string; kod: string | null };
type Qrup = { id: string; ad: string; tyutor_id: string | null; faculty_id: string | null };

export const Route = createFileRoute("/_authenticated/admin/qruplar")({
  head: () => ({ meta: [{ title: "Qruplar — ATU Şəxsi Kabinet" }, { name: "description", content: "Qrupların idarə edilməsi." }] }),
  component: QruplarSehifesi,
});

function QruplarSehifesi() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [sehife, setSehife] = useState(0);
  const [sehifeOlcusu, setSehifeOlcusu] = useState<number>(50);
  const [fakultəFilter, setFakultəFilter] = useState("hamisi");
  const [arxivGorunusu, setArxivGorunusu] = useState(false);
  const [seçimRejimi, setSeçimRejimi] = useState(false);
  const [seçilmişler, setSeçilmişler] = useState<Set<string>>(new Set());
  const [yeniDialogAçıq, setYeniDialogAçıq] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniFakultə, setYeniFakultə] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setAxtaris(axtarisXami.trim()); setSehife(0); }, 400);
    return () => clearTimeout(t);
  }, [axtarisXami]);

  useEffect(() => { setSehife(0); setSeçilmişler(new Set()); setSeçimRejimi(false); }, [arxivGorunusu, fakultəFilter, sehifeOlcusu]);

  const { data: fakultələr = [] } = useQuery<Fakultə[]>({
    queryKey: ["admin-faculties"],
    queryFn: async () => {
      const { data, error } = await db.from("faculties").select("id, ad, kod").order("ad");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-groups", "list", axtaris, arxivGorunusu, fakultəFilter, sehife, sehifeOlcusu],
    queryFn: async () => {
      let sorgu = db.from("groups").select("id, ad, tyutor_id, faculty_id", { count: "exact" }).eq("arxivlenib", arxivGorunusu).order("ad").range(sehife * sehifeOlcusu, sehife * sehifeOlcusu + sehifeOlcusu - 1);
      if (axtaris) sorgu = sorgu.ilike("ad", `%${axtaris.replace(/[%,]/g, "")}%`);
      if (fakultəFilter !== "hamisi") sorgu = sorgu.eq("faculty_id", fakultəFilter);
      const { data: rows, error, count } = await sorgu;
      if (error) throw error;
      const qruplar = (rows ?? []) as Qrup[];
      const groupIdler = qruplar.map((q) => q.id);
      const tyutorIdler = [...new Set(qruplar.map((q) => q.tyutor_id).filter(Boolean))] as string[];
      let tyutorLugeti: Record<string, { ad: string | null; soyad: string | null }> = {};
      if (tyutorIdler.length > 0) {
        const { data: profiller } = await supabase.from("profiles").select("user_id, ad, soyad").in("user_id", tyutorIdler);
        tyutorLugeti = (profiller ?? []).reduce<typeof tyutorLugeti>((acc, p) => { acc[p.user_id] = { ad: p.ad, soyad: p.soyad }; return acc; }, {});
      }
      let uzvSayLugeti: Record<string, number> = {};
      if (groupIdler.length > 0) {
        const { data: uzvler } = await supabase.from("group_members").select("group_id").in("group_id", groupIdler);
        uzvSayLugeti = (uzvler ?? []).reduce<Record<string, number>>((acc, u) => { acc[u.group_id] = (acc[u.group_id] ?? 0) + 1; return acc; }, {});
      }
      return { qruplar, umumiSay: count ?? 0, tyutorLugeti, uzvSayLugeti };
    },
  });

  const qruplar = data?.qruplar ?? [];
  const umumiSay = data?.umumiSay ?? 0;
  const başlanğıc = umumiSay === 0 ? 0 : sehife * sehifeOlcusu + 1;
  const son = Math.min((sehife + 1) * sehifeOlcusu, umumiSay);
  const sonSehife = Math.max(0, Math.ceil(umumiSay / sehifeOlcusu) - 1);

  function seçimiDəyiş(groupId: string) {
    setSeçilmişler((cari) => { const yeni = new Set(cari); yeni.has(groupId) ? yeni.delete(groupId) : yeni.add(groupId); return yeni; });
  }

  const yeniMutasiyası = useMutation({
    mutationFn: async () => {
      if (!yeniAd.trim()) throw new Error("Qrup adını daxil edin.");
      if (!yeniFakultə) throw new Error("Qrup üçün fakültə seçin.");
      const { error } = await db.from("groups").insert({ ad: yeniAd.trim(), faculty_id: yeniFakultə });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Qrup yaradıldı."); setYeniDialogAçıq(false); setYeniAd(""); setYeniFakultə(""); void queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] }); },
    onError: (xeta: Error) => toast.error(xeta.message || "Qrup yaradıla bilmədi."),
  });

  const arxivMutasiyası = useMutation({
    mutationFn: async () => { const { error } = await db.from("groups").update({ arxivlenib: !arxivGorunusu }).in("id", Array.from(seçilmişler)); if (error) throw new Error(error.message); },
    onSuccess: () => { toast.success(arxivGorunusu ? "Qruplar arxivdən çıxarıldı." : "Qruplar arxivləşdirildi."); setSeçilmişler(new Set()); setSeçimRejimi(false); void queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] }); },
    onError: (xeta: Error) => toast.error(xeta.message || "Əməliyyat uğursuz oldu."),
  });

  return (
    <>
      <PageHeader baslıq="Qruplar" />
      <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={axtarisXami} onChange={(e) => setAxtarisXami(e.target.value)} placeholder="Qrup axtar..." className="rounded-xl pl-9" /></div>

          <GroupsFilterPopover fakultələr={fakultələr} fakultəFilter={fakultəFilter} onDeyisiklik={setFakultəFilter} />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {seçimRejimi && seçilmişler.size > 0 ? <Button className="gap-2 rounded-xl" disabled={arxivMutasiyası.isPending} onClick={() => arxivMutasiyası.mutate()}>{arxivMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}{arxivGorunusu ? `Arxivdən çıxar (${seçilmişler.size})` : `Arxivləşdir (${seçilmişler.size})`}</Button> : null}
            <Button variant={seçimRejimi ? "secondary" : "default"} className="gap-2 rounded-xl" onClick={() => { setSeçimRejimi((v) => !v); setSeçilmişler(new Set()); }}>{seçimRejimi ? <X className="size-4" /> : <CheckSquare className="size-4" />}Seç</Button>
            <Button variant={arxivGorunusu ? "secondary" : "default"} className="gap-2 rounded-xl" onClick={() => setArxivGorunusu((v) => !v)}><Archive className="size-4" />{arxivGorunusu ? "Aktiv qruplar" : "Arxivə bax"}</Button>
            {!arxivGorunusu ? <Button className="gap-2 rounded-xl" onClick={() => setYeniDialogAçıq(true)}><Plus className="size-4" />Yeni</Button> : null}
          </div>
        </div>

        {isError ? <div className="flex flex-col items-center gap-3 py-16 text-center"><p className="text-sm text-muted-foreground">Qruplar yüklənərkən xəta baş verdi.</p><Button variant="outline" size="sm" className="rounded-xl" onClick={() => void refetch()}>Yenidən cəhd et</Button></div> : isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 18 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div> : qruplar.length === 0 ? <EmptyState icon={Users2} mesaj={arxivGorunusu ? "Arxivlənmiş qrup tapılmadı." : "Heç bir qrup tapılmadı."} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {qruplar.map((qrup) => {
              const tyutor = qrup.tyutor_id ? data?.tyutorLugeti[qrup.tyutor_id] : null;
              const uzvSayı = data?.uzvSayLugeti[qrup.id] ?? 0;
              const seçilib = seçilmişler.has(qrup.id);
              return <button key={qrup.id} type="button" onClick={() => seçimRejimi ? seçimiDəyiş(qrup.id) : void navigate({ to: "/qruplar/$groupId", params: { groupId: qrup.id } })} className={cn("relative flex flex-col items-start gap-2 rounded-2xl bg-muted/40 p-4 pr-10 text-left transition-colors hover:bg-primary/5", seçilib && "bg-primary/5 ring-2 ring-primary")}>
                {seçimRejimi ? <Checkbox checked={seçilib} onCheckedChange={() => seçimiDəyiş(qrup.id)} className="absolute left-3 top-3" /> : null}
                <div className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CalendarDays className="size-3.5" /></div>
                <span className="line-clamp-2 pr-1 text-sm font-semibold text-foreground">{qrup.ad}</span>
                <span className="mt-auto flex w-full items-center justify-between gap-2"><span className={cn("line-clamp-1 text-xs font-medium", tyutor ? "text-foreground" : "text-destructive")}>{tyutor ? muellimAdıFormatla(tyutor) : "Rəhbər tayin edilməyib"}</span><span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Users2 className="size-3.5" />{uzvSayı}</span></span>
              </button>;
            })}
          </div>
        )}

        {!isLoading && !isError && qruplar.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife === 0} onClick={() => setSehife(0)}><ChevronsLeft className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife === 0} onClick={() => setSehife((s) => Math.max(0, s - 1))}><ChevronLeft className="size-4" /></Button>
              <span className="px-2 text-sm text-muted-foreground">{başlanğıc}-{son} / {umumiSay}{isFetching ? <Loader2 className="ml-2 inline size-3 animate-spin" /> : null}</span>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife >= sonSehife} onClick={() => setSehife((s) => Math.min(sonSehife, s + 1))}><ChevronRight className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife >= sonSehife} onClick={() => setSehife(sonSehife)}><ChevronsRight className="size-4" /></Button>
            </div>

            <Select value={sehifeOlcusu.toString()} onValueChange={(deyer) => setSehifeOlcusu(Number(deyer))}>
              <SelectTrigger className="w-20 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{GROUPS_SEHIFE_OLCULERI.map((olcu) => <SelectItem key={olcu} value={olcu.toString()}>{olcu}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Dialog open={yeniDialogAçıq} onOpenChange={setYeniDialogAçıq}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni qrup əlavə et</DialogTitle><DialogDescription>Qrupun hansı fakültəyə aid olduğunu seçin. Bu seçim sonradan filtr və idarəetmədə istifadə olunacaq.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="yeni-qrup-ad">Qrup adı</Label><Input id="yeni-qrup-ad" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder="Məsələn: 2243a1" className="rounded-xl" /></div><div className="space-y-2"><Label>Fakültə</Label><Select value={yeniFakultə} onValueChange={setYeniFakultə}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Fakültə seçin" /></SelectTrigger><SelectContent>{fakultələr.map((f) => <SelectItem key={f.id} value={f.id}>{f.ad}{f.kod ? ` · ${f.kod}` : ""}</SelectItem>)}</SelectContent></Select>{fakultələr.length === 0 ? <p className="text-xs text-destructive">Əvvəlcə Tənzimləmələr bölməsindən fakültə əlavə edin.</p> : null}</div></div>
          <DialogFooter><Button variant="outline" onClick={() => setYeniDialogAçıq(false)} className="rounded-xl">Ləğv et</Button><Button disabled={yeniMutasiyası.isPending || !yeniAd.trim() || !yeniFakultə} onClick={() => yeniMutasiyası.mutate()} className="gap-2 rounded-xl">{yeniMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : null}{yeniMutasiyası.isPending ? "Əlavə edilir..." : "Qrup əlavə et"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
