import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Pencil, Plus, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryBook } from "@/components/library/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { kitabxanaKateqoriyaAdlari } from "@/lib/library-categories";

const MAX_FAYL_OLCUSU = 50 * 1024 * 1024;
const COVER_BUCKET = "library-covers";
const BOOK_BUCKET = "library-books";

function coverYolu(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${COVER_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

export function AddBookForm({ kitab }: { kitab?: LibraryBook }) {
  const redakteRejimi = Boolean(kitab);
  const queryClient = useQueryClient();
  const [açıq, setAçıq] = useState(false);
  const [ad, setAd] = useState("");
  const [muellif, setMuellif] = useState("");
  const [kateqoriya, setKateqoriya] = useState("");
  const [tesvir, setTesvir] = useState("");
  const [uzQabigiFayl, setUzQabigiFayl] = useState<File | null>(null);
  const [uzQabigiOnizleme, setUzQabigiOnizleme] = useState<string | null>(null);
  const [kitabFayl, setKitabFayl] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formuSifirla() {
    setAd(""); setMuellif(""); setKateqoriya(""); setTesvir("");
    setUzQabigiFayl(null); setUzQabigiOnizleme(null); setKitabFayl(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (!açıq) return;
    setAd(kitab?.ad ?? "");
    setMuellif(kitab?.muellif ?? "");
    setKateqoriya(kitab?.kateqoriya ?? "");
    setTesvir(kitab?.tesvir ?? "");
    setUzQabigiFayl(null);
    setUzQabigiOnizleme(kitab?.uz_qabigi_url ?? null);
    setKitabFayl(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [açıq, kitab]);

  function uzQabigiSec(fayl: File | null) {
    setUzQabigiFayl(fayl);
    if (uzQabigiOnizleme?.startsWith("blob:")) URL.revokeObjectURL(uzQabigiOnizleme);
    setUzQabigiOnizleme(fayl ? URL.createObjectURL(fayl) : kitab?.uz_qabigi_url ?? null);
  }

  const mutasiya = useMutation({
    mutationFn: async () => {
      if (!ad.trim() || !muellif.trim() || !kateqoriya) throw new Error("Bütün məcburi sahələri doldurun.");
      if (!redakteRejimi && !kitabFayl) throw new Error("Kitab faylı seçin.");
      if (kitabFayl && kitabFayl.size > MAX_FAYL_OLCUSU) throw new Error("Kitab faylı 50MB-dan böyük ola bilməz.");

      let yeniFaylYolu = kitab?.fayl_url ?? "";
      let yeniFormat = kitab?.format ?? "pdf";
      let yeniUzQabigiUrl = kitab?.uz_qabigi_url ?? null;
      let yuklenenKitabYolu: string | null = null;
      let yuklenenQabigYolu: string | null = null;

      if (kitabFayl) {
        const uzanti = (kitabFayl.name.split(".").pop() || "").toLowerCase();
        if (uzanti !== "pdf" && uzanti !== "epub") throw new Error("Yalnız PDF və ya EPUB faylları qəbul olunur.");
        yeniFormat = uzanti;
        yeniFaylYolu = `${crypto.randomUUID()}.${uzanti}`;
        const { error } = await supabase.storage.from(BOOK_BUCKET).upload(yeniFaylYolu, kitabFayl, {
          contentType: kitabFayl.type || (uzanti === "pdf" ? "application/pdf" : "application/epub+zip"),
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        yuklenenKitabYolu = yeniFaylYolu;
      }

      if (uzQabigiFayl) {
        if (!uzQabigiFayl.type.startsWith("image/")) {
          throw new Error("Üz qabığı yalnız şəkil faylı olmalıdır.");
        }
        const uzanti = (uzQabigiFayl.name.split(".").pop() || "jpg").toLowerCase();
        const qabigYolu = `${crypto.randomUUID()}.${uzanti}`;
        const { error } = await supabase.storage.from(COVER_BUCKET).upload(qabigYolu, uzQabigiFayl, {
          contentType: uzQabigiFayl.type,
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from(COVER_BUCKET).getPublicUrl(qabigYolu);
        yeniUzQabigiUrl = publicUrlData.publicUrl;
        yuklenenQabigYolu = qabigYolu;
      }

      if (redakteRejimi && kitab) {
        const { error } = await supabase.from("library_books").update({ ad: ad.trim(), muellif: muellif.trim(), kateqoriya, tesvir: tesvir.trim() || null, uz_qabigi_url: yeniUzQabigiUrl, fayl_url: yeniFaylYolu, format: yeniFormat }).eq("id", kitab.id);
        if (error) {
          if (yuklenenKitabYolu) await supabase.storage.from(BOOK_BUCKET).remove([yuklenenKitabYolu]);
          if (yuklenenQabigYolu) await supabase.storage.from(COVER_BUCKET).remove([yuklenenQabigYolu]);
          throw error;
        }
        if (kitabFayl && kitab.fayl_url !== yeniFaylYolu) await supabase.storage.from(BOOK_BUCKET).remove([kitab.fayl_url]);
        if (uzQabigiFayl) {
          const kohneQabigYolu = coverYolu(kitab.uz_qabigi_url);
          if (kohneQabigYolu) await supabase.storage.from(COVER_BUCKET).remove([kohneQabigYolu]);
        }
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("library_books").insert({ ad: ad.trim(), muellif: muellif.trim(), kateqoriya, tesvir: tesvir.trim() || null, uz_qabigi_url: yeniUzQabigiUrl, fayl_url: yeniFaylYolu, format: yeniFormat, elave_eden_id: userData.user?.id ?? null });
        if (error) {
          if (yuklenenKitabYolu) await supabase.storage.from(BOOK_BUCKET).remove([yuklenenKitabYolu]);
          if (yuklenenQabigYolu) await supabase.storage.from(COVER_BUCKET).remove([yuklenenQabigYolu]);
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(redakteRejimi ? "Kitab uğurla redaktə edildi." : "Kitab uğurla əlavə edildi.");
      void queryClient.invalidateQueries({ queryKey: ["library-books-recent"] });
      void queryClient.invalidateQueries({ queryKey: ["library-books-list"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-library-books"] });
      formuSifirla(); setAçıq(false);
    },
    onError: (err: Error) => toast.error(err.message || "Əməliyyat zamanı xəta baş verdi."),
  });

  return (
    <Dialog open={açıq} onOpenChange={(val) => { setAçıq(val); if (!val) { formuSifirla(); mutasiya.reset(); } }}>
      <DialogTrigger asChild><Button type="button" variant={redakteRejimi ? "outline" : "default"} className="gap-2 rounded-xl font-bold">{redakteRejimi ? <Pencil className="size-4" /> : <Plus className="size-4" />}{redakteRejimi ? "Redaktə" : "Kitab əlavə et"}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl border-border bg-card">
        <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">{redakteRejimi ? "Kitabı redaktə et" : "Yeni kitab əlavə et"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutasiya.mutate(); }} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="kitab-ad">Başlıq</Label><Input id="kitab-ad" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Kitabın adı" required /></div>
          <div className="space-y-1.5"><Label htmlFor="kitab-muellif">Müəllif</Label><Input id="kitab-muellif" value={muellif} onChange={(e) => setMuellif(e.target.value)} placeholder="Müəllifin adı" required /></div>
          <div className="space-y-1.5"><Label>Kateqoriya</Label><Select value={kateqoriya} onValueChange={setKateqoriya}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Kateqoriya seçin" /></SelectTrigger><SelectContent>{kitabxanaKateqoriyaAdlari.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="kitab-tesvir">Təsvir</Label><Textarea id="kitab-tesvir" value={tesvir} onChange={(e) => setTesvir(e.target.value)} placeholder="Qısa təsvir (istəyə bağlı)" rows={3} /></div>
          <div className="space-y-1.5"><Label>Üz qabığı</Label><button type="button" onClick={() => coverInputRef.current?.click()} className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">{uzQabigiOnizleme ? <img src={uzQabigiOnizleme} alt="Üz qabığı önizləmə" className="h-full object-contain" /> : <span className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground"><ImagePlus className="size-6" />Şəkil seçin</span>}</button><input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uzQabigiSec(e.target.files?.[0] ?? null)} /></div>
          <div className="space-y-1.5"><Label>Kitab faylı {redakteRejimi ? "(dəyişmək istəsəniz)" : "(PDF və ya EPUB, maks. 50MB)"}</Label><button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted text-sm font-medium text-muted-foreground"><UploadCloud className="size-5" />{kitabFayl ? kitabFayl.name : redakteRejimi ? "Mövcud fayl saxlanılacaq" : "Fayl seçin"}</button><input ref={fileInputRef} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="hidden" onChange={(e) => setKitabFayl(e.target.files?.[0] ?? null)} /></div>
          <Button type="submit" disabled={mutasiya.isPending} className="w-full gap-2 rounded-xl font-bold">{mutasiya.isPending ? <Loader2 className="size-4 animate-spin" /> : null}{redakteRejimi ? "Yadda saxla" : "Əlavə et"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
