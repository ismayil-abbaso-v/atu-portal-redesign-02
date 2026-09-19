import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { UserFormDialog } from "@/components/admin/UserFormDialog";
import {
  UsersFilterPopover,
  type IstifadeciSuzgecleri,
} from "@/components/admin/UsersFilterPopover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  ROL_ETIKETLERI,
  SEHIFE_OLCULERI,
  avatarYukle,
  tamAdFormatla,
  type IstifadeciSetri,
} from "@/lib/admin-users";
import { adminDeleteUser, adminResetPassword } from "@/server-functions/admin-users";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";

export const Route = createFileRoute("/_authenticated/admin/istifadeciler")({
  head: () => ({
    meta: [
      { title: "İstifadəçilər — ATU Şəxsi Kabinet" },
      { name: "description", content: "İstifadəçilərin idarə edilməsi." },
      { property: "og:title", content: "İstifadəçilər — ATU Şəxsi Kabinet" },
      { property: "og:description", content: "İstifadəçilərin idarə edilməsi." },
    ],
  }),
  component: IstifadecilerSehifesi,
});

type SortSutunu = "created_at" | "ad" | "soyad" | "qebul_ili";

function IstifadecilerSehifesi() {
  const queryClient = useQueryClient();
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [suzgecler, setSuzgecler] = useState<IstifadeciSuzgecleri>({ rollar: [], status: null, fakulte: null });
  const [sehife, setSehife] = useState(0);
  const [sehifeOlcusu, setSehifeOlcusu] = useState<number>(20);
  const [sort, setSort] = useState<{ sutun: SortSutunu; istiqamet: "asc" | "desc" }>({ sutun: "created_at", istiqamet: "desc" });
  const [seçimRejimi, setSeçimRejimi] = useState(false);
  const [seçilmişler, setSeçilmişler] = useState<Set<string>>(new Set());
  const [formVeziyyeti, setFormVeziyyeti] = useState<{ açıq: boolean; rejim: "yeni" | "redakte"; istifadeci: IstifadeciSetri | null }>({ açıq: false, rejim: "yeni", istifadeci: null });
  const [sifreDialogu, setSifreDialogu] = useState<{ açıq: boolean; userId: string | null }>({ açıq: false, userId: null });
  const [yeniSifre, setYeniSifre] = useState("");
  const [silmeDialogu, setSilmeDialogu] = useState<{ açıq: boolean; istifadeci: IstifadeciSetri | null }>({ açıq: false, istifadeci: null });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarHedefi, setAvatarHedefi] = useState<string | null>(null);
  const [avatarYuklenir, setAvatarYuklenir] = useState<string | null>(null);

  useEffect(() => {
    const zamanlayici = setTimeout(() => { setAxtaris(axtarisXami); setSehife(0); }, 400);
    return () => clearTimeout(zamanlayici);
  }, [axtarisXami]);
  useEffect(() => { setSehife(0); }, [suzgecler, sehifeOlcusu]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-users", "list", axtaris, suzgecler, sort, sehife, sehifeOlcusu],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        ...(axtaris ? { p_axtaris: axtaris } : {}),
        ...(suzgecler.rollar.length > 0 ? { p_rollar: suzgecler.rollar } : {}),
        ...(suzgecler.status ? { p_status: suzgecler.status } : {}),
        ...(suzgecler.fakulte ? { p_fakulte: suzgecler.fakulte } : {}),
        p_sort_sutun: sort.sutun,
        p_sort_istiqamet: sort.istiqamet,
        p_limit: sehifeOlcusu,
        p_offset: sehife * sehifeOlcusu,
      });
      if (error) throw error;
      return { setirler: (data ?? []) as IstifadeciSetri[], umumiSay: data?.[0]?.umumi_say ?? 0 };
    },
  });

  const setirler = data?.setirler ?? [];
  const umumiSay = data?.umumiSay ?? 0;
  const başlanğıc = umumiSay === 0 ? 0 : sehife * sehifeOlcusu + 1;
  const son = Math.min((sehife + 1) * sehifeOlcusu, umumiSay);

  function siraliBaslıq(etiket: string, sutun: SortSutunu) {
    const aktivdir = sort.sutun === sutun;
    return <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:text-foreground" onClick={() => setSort((cari) => ({ sutun, istiqamet: cari.sutun === sutun && cari.istiqamet === "asc" ? "desc" : "asc" }))}>{etiket}{aktivdir ? (sort.istiqamet === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}</button>;
  }
  function seçimiDəyiş(userId: string) {
    setSeçilmişler((cari) => { const yeni = new Set(cari); if (yeni.has(userId)) yeni.delete(userId); else yeni.add(userId); return yeni; });
  }

  const topluArxivMutasiyası = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ status: "PASSİV" }).in("user_id", Array.from(seçilmişler));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Seçilmiş istifadəçilər arxivləşdirildi."); setSeçilmişler(new Set()); setSeçimRejimi(false); void queryClient.invalidateQueries({ queryKey: ["admin-users", "list"] }); },
    onError: (xeta: Error) => toast.error(xeta.message || "Arxivləşdirmə uğursuz oldu."),
  });

  const statusMutasiyası = useMutation({
    mutationFn: async ({ userId, yeniStatus }: { userId: string; yeniStatus: string }) => {
      const { error } = await supabase.from("profiles").update({ status: yeniStatus }).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ userId, yeniStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users", "list"] });
      const queryKey = ["admin-users", "list", axtaris, suzgecler, sort, sehife, sehifeOlcusu];
      const evvelki = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (cari: { setirler: IstifadeciSetri[]; umumiSay: number } | undefined) => !cari ? cari : { ...cari, setirler: cari.setirler.map((s) => s.user_id === userId ? { ...s, status: yeniStatus } : s) });
      return { evvelki, queryKey };
    },
    onError: (xeta: Error, _deyisken, context) => { if (context?.evvelki) queryClient.setQueryData(context.queryKey, context.evvelki); toast.error(xeta.message || "Status dəyişdirilə bilmədi."); },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["admin-users", "list"] }),
  });

  const sifreMutasiyası = useMutation({
    mutationFn: async () => {
      if (!sifreDialogu.userId) return;
      if (yeniSifre.length < 6) throw new Error("Şifrə ən azı 6 simvol olmalıdır.");
      await adminResetPassword({ data: { user_id: sifreDialogu.userId, yeni_sifre: yeniSifre } });
    },
    onSuccess: () => { toast.success("Şifrə uğurla dəyişdirildi."); setSifreDialogu({ açıq: false, userId: null }); setYeniSifre(""); },
    onError: (xeta: Error) => toast.error(xeta.message || "Şifrə dəyişdirilə bilmədi."),
  });

  const silmeMutasiyası = useMutation({
    mutationFn: async () => { if (!silmeDialogu.istifadeci) return; await adminDeleteUser({ data: { user_id: silmeDialogu.istifadeci.user_id } }); },
    onSuccess: () => { toast.success("İstifadəçi silindi."); setSilmeDialogu({ açıq: false, istifadeci: null }); void queryClient.invalidateQueries({ queryKey: ["admin-users", "list"] }); },
    onError: (xeta: Error) => toast.error(xeta.message || "İstifadəçi silinə bilmədi."),
  });

  async function avatarSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const fayl = e.target.files?.[0]; const userId = avatarHedefi; e.target.value = ""; if (!fayl || !userId) return;
    setAvatarYuklenir(userId);
    try {
      const url = await avatarYukle(userId, fayl);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
      if (error) throw new Error(error.message);
      toast.success("Profil şəkli yeniləndi."); void queryClient.invalidateQueries({ queryKey: ["admin-users", "list"] });
    } catch (xeta) { toast.error(xeta instanceof Error ? xeta.message : "Şəkil yüklənə bilmədi."); }
    finally { setAvatarYuklenir(null); setAvatarHedefi(null); }
  }

  function tehsilHaqqiGoster(istifadeci: IstifadeciSetri) {
    if (istifadeci.tehsil_haqqi_statusu) return istifadeci.tehsil_haqqi_statusu;
    if (istifadeci.tehsil_haqqi !== null && istifadeci.tehsil_haqqi !== undefined) return String(istifadeci.tehsil_haqqi);
    return "—";
  }

  return (
    <>
      <PageHeader baslıq="İstifadəçilər" />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={avatarSecildi} />
      <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={axtarisXami} onChange={(e) => setAxtarisXami(e.target.value)} placeholder="Axtar..." className="rounded-xl pl-9" /></div>
          <UsersFilterPopover suzgecler={suzgecler} onDeyisiklik={setSuzgecler} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant={seçimRejimi ? "secondary" : "outline"} className="rounded-xl" onClick={() => { setSeçimRejimi((cari) => !cari); setSeçilmişler(new Set()); }}>Seçim</Button>
            {seçimRejimi ? <Button variant="outline" className="gap-2 rounded-xl" disabled={seçilmişler.size === 0 || topluArxivMutasiyası.isPending} onClick={() => topluArxivMutasiyası.mutate()}>{topluArxivMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}Arxivlə</Button> : null}
            <Button className="gap-2 rounded-xl" onClick={() => setFormVeziyyeti({ açıq: true, rejim: "yeni", istifadeci: null })}><Plus className="size-4" />Yeni</Button>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center"><p className="text-sm text-muted-foreground">İstifadəçilər yüklənərkən xəta baş verdi.</p><Button variant="outline" size="sm" className="rounded-xl" onClick={() => void refetch()}>Yenidən cəhd et</Button></div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 py-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
        ) : setirler.length === 0 ? (
          <EmptyState icon={Users as LucideIcon} mesaj="Heç bir istifadəçi tapılmadı." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  {seçimRejimi ? <TableHead className="w-10" /> : null}
                  <TableHead className="w-10" />
                  <TableHead>No</TableHead>
                  <TableHead>{siraliBaslıq("Ad", "ad")}</TableHead>
                  <TableHead>{siraliBaslıq("Soyad", "soyad")}</TableHead>
                  <TableHead>Ata adı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>İstifadəçi adı</TableHead>
                  <TableHead>Şifrə</TableHead>
                  <TableHead>Profil Şəkli</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-poçt</TableHead>
                  <TableHead>Cins</TableHead>
                  <TableHead>FİN Kodu</TableHead>
                  <TableHead>Doğum tarixi</TableHead>
                  <TableHead>{siraliBaslıq("Qəbul ili", "qebul_ili")}</TableHead>
                  <TableHead>Bitirmə ili</TableHead>
                  <TableHead>İxtisas</TableHead>
                  <TableHead>Fakültə</TableHead>
                  <TableHead>Qrup</TableHead>
                  <TableHead>Şəhər</TableHead>
                  <TableHead>DİM Balı</TableHead>
                  <TableHead>Təhsil növü</TableHead>
                  <TableHead>Sosial vəziyyət</TableHead>
                  <TableHead>Təhsil haqqı</TableHead>
                  <TableHead>ESD istifadəçisi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setirler.map((istifadeci, index) => (
                  <TableRow key={istifadeci.user_id}>
                    {seçimRejimi ? <TableCell><Checkbox checked={seçilmişler.has(istifadeci.user_id)} onCheckedChange={() => seçimiDəyiş(istifadeci.user_id)} /></TableCell> : null}
                    <TableCell><button type="button" aria-label="Redaktə et" className="text-muted-foreground hover:text-foreground" onClick={() => setFormVeziyyeti({ açıq: true, rejim: "redakte", istifadeci })}><Pencil className="size-4" /></button></TableCell>
                    <TableCell className="text-muted-foreground">{sehife * sehifeOlcusu + index + 1}</TableCell>
                    <TableCell className="font-medium">{istifadeci.ad ?? "—"}</TableCell>
                    <TableCell className="font-medium">{istifadeci.soyad ?? "—"}</TableCell>
                    <TableCell>{istifadeci.ata_adi ?? "—"}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{istifadeci.rollar.length === 0 ? <span className="text-muted-foreground">—</span> : istifadeci.rollar.map((rol) => <Badge key={rol} variant="secondary" className="whitespace-nowrap rounded-md">{ROL_ETIKETLERI[rol]}</Badge>)}</div></TableCell>
                    <TableCell>{istifadeci.istifadeci_adi ?? "—"}</TableCell>
                    <TableCell><button type="button" className="whitespace-nowrap text-primary hover:underline" onClick={() => setSifreDialogu({ açıq: true, userId: istifadeci.user_id })}>Şifrəni dəyiş</button></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="size-7"><SignedAvatarImage src={istifadeci.avatar_url} /><AvatarFallback>{(istifadeci.ad?.[0] ?? "?").toUpperCase()}</AvatarFallback></Avatar><button type="button" className="whitespace-nowrap text-primary hover:underline disabled:opacity-50" disabled={avatarYuklenir === istifadeci.user_id} onClick={() => { setAvatarHedefi(istifadeci.user_id); avatarInputRef.current?.click(); }}>{avatarYuklenir === istifadeci.user_id ? "Yüklənir..." : "Şəkli dəyiş"}</button></div></TableCell>
                    <TableCell className="whitespace-nowrap">{istifadeci.telefon ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{istifadeci.e_poct ?? "—"}</TableCell>
                    <TableCell>{istifadeci.cins ?? "—"}</TableCell>
                    <TableCell>{istifadeci.fin_kodu ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{tarixFormatla(istifadeci.dogum_tarixi)}</TableCell>
                    <TableCell>{istifadeci.qebul_ili ?? "—"}</TableCell>
                    <TableCell>{istifadeci.bitirme_ili ?? "—"}</TableCell>
                    <TableCell>{istifadeci.ixtisas ?? "—"}</TableCell>
                    <TableCell>{istifadeci.fakulte ?? "—"}</TableCell>
                    <TableCell>{istifadeci.qrup ?? "—"}</TableCell>
                    <TableCell>{istifadeci.sheher ?? "—"}</TableCell>
                    <TableCell>{istifadeci.dim_bali ?? "—"}</TableCell>
                    <TableCell>{istifadeci.tehsil_novu ?? "—"}</TableCell>
                    <TableCell>{istifadeci.sosial_veziyyet ?? "—"}</TableCell>
                    <TableCell>{tehsilHaqqiGoster(istifadeci)}</TableCell>
                    <TableCell>{istifadeci.esd_istifadeci === null || istifadeci.esd_istifadeci === undefined ? "—" : istifadeci.esd_istifadeci ? "bəli" : "xeyr"}</TableCell>
                    <TableCell><div className="flex items-center gap-2 whitespace-nowrap"><button type="button" onClick={() => statusMutasiyası.mutate({ userId: istifadeci.user_id, yeniStatus: istifadeci.status === "AKTİV" ? "PASSİV" : "AKTİV" })}><Badge variant={istifadeci.status === "AKTİV" ? "default" : "secondary"} className="cursor-pointer rounded-md">{istifadeci.status}</Badge></button><button type="button" aria-label="Sil" className="text-muted-foreground hover:text-destructive" onClick={() => setSilmeDialogu({ açıq: true, istifadeci })}><Trash2 className="size-4" /></button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && !isError && setirler.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife === 0} onClick={() => setSehife(0)}><ChevronsLeft className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife === 0} onClick={() => setSehife((s) => Math.max(0, s - 1))}><ChevronLeft className="size-4" /></Button>
              <span className="px-2 text-sm text-muted-foreground">{başlanğıc}-{son} / {umumiSay}{isFetching ? <Loader2 className="ml-2 inline size-3 animate-spin" /> : null}</span>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={son >= umumiSay} onClick={() => setSehife((s) => s + 1)}><ChevronRight className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl" disabled={son >= umumiSay} onClick={() => setSehife(Math.max(0, Math.ceil(umumiSay / sehifeOlcusu) - 1))}><ChevronsRight className="size-4" /></Button>
            </div>
            <Select value={sehifeOlcusu.toString()} onValueChange={(deyer) => setSehifeOlcusu(Number(deyer))}><SelectTrigger className="w-20 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{SEHIFE_OLCULERI.map((olcu) => <SelectItem key={olcu} value={olcu.toString()}>{olcu}</SelectItem>)}</SelectContent></Select>
          </div>
        ) : null}
      </div>

      <UserFormDialog açıq={formVeziyyeti.açıq} rejim={formVeziyyeti.rejim} istifadeci={formVeziyyeti.istifadeci} onOpenChange={(açıq) => setFormVeziyyeti((cari) => ({ ...cari, açıq }))} />
      <Dialog open={sifreDialogu.açıq} onOpenChange={(açıq) => { setSifreDialogu({ açıq, userId: açıq ? sifreDialogu.userId : null }); if (!açıq) setYeniSifre(""); }}>
        <DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Şifrəni dəyiş</DialogTitle></DialogHeader><Input type="text" placeholder="Yeni şifrə" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} className="rounded-xl" /><DialogFooter><Button className="w-full rounded-xl" disabled={sifreMutasiyası.isPending} onClick={() => sifreMutasiyası.mutate()}>{sifreMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : "Yadda saxla"}</Button></DialogFooter></DialogContent>
      </Dialog>
      <AlertDialog open={silmeDialogu.açıq} onOpenChange={(açıq) => setSilmeDialogu({ açıq, istifadeci: açıq ? silmeDialogu.istifadeci : null })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>İstifadəçini silmək istəyirsiniz?</AlertDialogTitle><AlertDialogDescription>{silmeDialogu.istifadeci ? `"${tamAdFormatla(silmeDialogu.istifadeci.ad, silmeDialogu.istifadeci.soyad)}" ` : ""}istifadəçisi və bütün əlaqəli məlumatları HƏMİŞƏLİK silinəcək. Bu əməliyyat GERİ QAYTARILA BİLMƏZ.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel><AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={silmeMutasiyası.isPending} onClick={(e) => { e.preventDefault(); silmeMutasiyası.mutate(); }}>{silmeMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sil"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function tarixFormatla(iso: string | null): string {
  if (!iso) return "—";
  const tarix = new Date(iso);
  if (Number.isNaN(tarix.getTime())) return "—";
  const gun = tarix.getDate().toString().padStart(2, "0");
  const ay = (tarix.getMonth() + 1).toString().padStart(2, "0");
  return `${gun}.${ay}.${tarix.getFullYear()}`;
}
