import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BookMarked, ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AddBookForm } from "@/components/library/AddBookForm";
import type { LibraryBook } from "@/components/library/BookCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { kitabxanaKateqoriyaAdlari } from "@/lib/library-categories";

const SEHIFE_OLCUSU = 15;

export const Route = createFileRoute("/_authenticated/admin/kitabxana")({
  head: () => ({ meta: [{ title: "Kitabxana İdarəetmə — ATU Şəxsi Kabinet" }, { name: "description", content: "Kitabxana kitablarının idarə edilməsi." }] }),
  component: AdminKitabxana,
});

function AdminKitabxana() {
  const queryClient = useQueryClient();
  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [kateqoriya, setKateqoriya] = useState("hamisi");
  const [sehife, setSehife] = useState(0);
  const [seçilmişKitab, setSeçilmişKitab] = useState<LibraryBook | null>(null);
  const [silmeAçıq, setSilmeAçıq] = useState(false);

  useEffect(() => {
    const taymer = setTimeout(() => { setAxtaris(axtarisXami.trim()); setSehife(0); }, 350);
    return () => clearTimeout(taymer);
  }, [axtarisXami]);

  useEffect(() => { setSehife(0); }, [kateqoriya]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-library-books", axtaris, kateqoriya, sehife],
    queryFn: async () => {
      const basdan = sehife * SEHIFE_OLCUSU;
      let sorgu = supabase.from("library_books").select("*", { count: "exact" }).order("elave_olunma_tarixi", { ascending: false }).range(basdan, basdan + SEHIFE_OLCUSU - 1);
      if (axtaris) {
        const deyer = axtaris.replace(/[%,]/g, "");
        sorgu = sorgu.or(`ad.ilike.%${deyer}%,muellif.ilike.%${deyer}%`);
      }
      if (kateqoriya !== "hamisi") sorgu = sorgu.eq("kateqoriya", kateqoriya);
      const { data: kitablar, error, count } = await sorgu;
      if (error) throw error;
      return { kitablar: (kitablar ?? []) as LibraryBook[], sayi: count ?? 0 };
    },
  });

  const silMutation = useMutation({
    mutationFn: async (kitab: LibraryBook) => {
      const { error: dbXetasi } = await supabase.from("library_books").delete().eq("id", kitab.id);
      if (dbXetasi) throw dbXetasi;
      await supabase.storage.from("library-books").remove([kitab.fayl_url]);
      if (kitab.uz_qabigi_url) {
        const marker = "/storage/v1/object/public/library-covers/";
        const index = kitab.uz_qabigi_url.indexOf(marker);
        if (index !== -1) await supabase.storage.from("library-covers").remove([decodeURIComponent(kitab.uz_qabigi_url.slice(index + marker.length))]);
      }
    },
    onSuccess: () => {
      toast.success("Kitab uğurla silindi.");
      void queryClient.invalidateQueries({ queryKey: ["admin-library-books"] });
      void queryClient.invalidateQueries({ queryKey: ["library-books-recent"] });
      void queryClient.invalidateQueries({ queryKey: ["library-books-list"] });
      setSilmeAçıq(false); setSeçilmişKitab(null);
    },
    onError: (err: Error) => toast.error(err.message || "Kitab silinərkən xəta baş verdi."),
  });

  const kitablar = data?.kitablar ?? [];
  const umumiSay = data?.sayi ?? 0;
  const sonSehife = Math.max(0, Math.ceil(umumiSay / SEHIFE_OLCUSU) - 1);

  return (
    <>
      <PageHeader baslıq="Kitabxana İdarəetmə"><AddBookForm /></PageHeader>
      <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={axtarisXami} onChange={(e) => setAxtarisXami(e.target.value)} placeholder="Ad və ya müəllif üzrə axtar..." className="rounded-xl pl-9" /></div>
          <Select value={kateqoriya} onValueChange={setKateqoriya}><SelectTrigger className="w-full rounded-xl sm:w-[230px]"><SelectValue placeholder="Kateqoriya" /></SelectTrigger><SelectContent><SelectItem value="hamisi">Bütün kateqoriyalar</SelectItem>{kitabxanaKateqoriyaAdlari.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center"><AlertTriangle className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Kitablar yüklənərkən xəta baş verdi.</p><Button variant="outline" size="sm" className="rounded-xl" onClick={() => void refetch()}>Yenidən cəhd et</Button></div>
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : kitablar.length === 0 ? (
          <EmptyState icon={BookMarked} mesaj={axtaris || kateqoriya !== "hamisi" ? "Axtarışa uyğun kitab tapılmadı." : "Kitabxanada hələ kitab yoxdur."} />
        ) : (
          <>
            <div className="rounded-2xl border"><Table><TableHeader><TableRow><TableHead className="w-20">Üz qabığı</TableHead><TableHead>Ad</TableHead><TableHead>Müəllif</TableHead><TableHead>Kateqoriya</TableHead><TableHead>Format</TableHead><TableHead>Əlavə olunma tarixi</TableHead><TableHead className="text-right">Əməliyyatlar</TableHead></TableRow></TableHeader><TableBody>
              {kitablar.map((kitab) => <TableRow key={kitab.id}>
                <TableCell><div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-muted">{kitab.uz_qabigi_url ? <img src={kitab.uz_qabigi_url} alt="" className="size-full object-cover" /> : <BookMarked className="size-5 text-muted-foreground" />}</div></TableCell>
                <TableCell className="max-w-[240px] font-semibold"><span className="line-clamp-2">{kitab.ad}</span></TableCell>
                <TableCell className="max-w-[180px]"><span className="line-clamp-2 text-muted-foreground">{kitab.muellif}</span></TableCell>
                <TableCell><Badge variant="secondary">{kitab.kateqoriya}</Badge></TableCell>
                <TableCell><Badge variant="outline">{kitab.format.toUpperCase()}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(kitab.elave_olunma_tarixi))}</TableCell>
                <TableCell><div className="flex justify-end gap-1"><AddBookForm kitab={kitab} /><Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:text-destructive" title="Sil" onClick={() => { setSeçilmişKitab(kitab); setSilmeAçıq(true); }}><Trash2 className="size-4" /></Button></div></TableCell>
              </TableRow>)}
            </TableBody></Table></div>
            {umumiSay > SEHIFE_OLCUSU ? <div className="flex items-center justify-between gap-3 pt-1"><span className="text-sm text-muted-foreground">{sehife * SEHIFE_OLCUSU + 1}-{Math.min((sehife + 1) * SEHIFE_OLCUSU, umumiSay)} / {umumiSay}</span><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife === 0} onClick={() => setSehife((s) => Math.max(0, s - 1))}><ChevronLeft className="size-4" /></Button><Button variant="ghost" size="icon" className="rounded-xl" disabled={sehife >= sonSehife} onClick={() => setSehife((s) => Math.min(sonSehife, s + 1))}><ChevronRight className="size-4" /></Button></div></div> : null}
          </>
        )}
      </div>

      <AlertDialog open={silmeAçıq} onOpenChange={setSilmeAçıq}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Kitabı silmək istəyirsiniz?</AlertDialogTitle><AlertDialogDescription>{seçilmişKitab ? `“${seçilmişKitab.ad}” kitabı və ona aid fayllar Storage-dan silinəcək. Bu əməliyyat geri qaytarıla bilməz.` : "Bu əməliyyat geri qaytarıla bilməz."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel><AlertDialogAction className="rounded-xl" disabled={silMutation.isPending} onClick={(e) => { e.preventDefault(); if (seçilmişKitab) silMutation.mutate(seçilmişKitab); }}>{silMutation.isPending ? "Silinir..." : "Sil"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
