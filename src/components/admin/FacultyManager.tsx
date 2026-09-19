import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

// Yeni migration-dakı cədvəl generated types-a növbəti Supabase type generation zamanı düşəcək.
const db = supabase as any;

type Fakultə = { id: string; ad: string; kod: string | null };

export function FacultyManager() {
  const queryClient = useQueryClient();
  const [dialogAçıq, setDialogAçıq] = useState(false);
  const [silId, setSilId] = useState<string | null>(null);
  const [redaktəEdilən, setRedaktəEdilən] = useState<Fakultə | null>(null);
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");

  const { data: fakultələr = [], isLoading } = useQuery<Fakultə[]>({
    queryKey: ["admin-faculties"],
    queryFn: async () => {
      const { data, error } = await db.from("faculties").select("id, ad, kod").order("ad");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const təmizAd = ad.trim();
      const təmizKod = kod.trim() || null;
      if (!təmizAd) throw new Error("Fakültə adını daxil edin.");
      const query = redaktəEdilən
        ? db.from("faculties").update({ ad: təmizAd, kod: təmizKod }).eq("id", redaktəEdilən.id)
        : db.from("faculties").insert({ ad: təmizAd, kod: təmizKod });
      const { error } = await query;
      if (error) throw new Error(error.code === "23505" ? "Bu fakültə artıq mövcuddur." : error.message);
    },
    onSuccess: () => {
      toast.success(redaktəEdilən ? "Fakültə yeniləndi." : "Fakültə əlavə edildi.");
      setDialogAçıq(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-faculties"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("faculties").delete().eq("id", id);
      if (error) throw new Error(error.code === "23503" ? "Bu fakültəyə bağlı qruplar var. Əvvəlcə qrupları başqa fakültəyə keçirin." : error.message);
    },
    onSuccess: () => {
      toast.success("Fakültə silindi.");
      setSilId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-faculties"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function açYeni() {
    setRedaktəEdilən(null);
    setAd("");
    setKod("");
    setDialogAçıq(true);
  }

  function açRedaktə(fakultə: Fakultə) {
    setRedaktəEdilən(fakultə);
    setAd(fakultə.ad);
    setKod(fakultə.kod ?? "");
    setDialogAçıq(true);
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></div>
          <div>
            <h2 className="font-bold">Fakültələr</h2>
            <p className="text-sm text-muted-foreground">Qrupları fakültələr üzrə təşkil edin və idarə edin.</p>
          </div>
        </div>
        <Button onClick={açYeni} className="gap-2 rounded-xl"><Plus className="size-4" />Fakültə əlavə et</Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />) : fakultələr.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Hələ fakültə əlavə edilməyib.</div>
        ) : fakultələr.map((fakultə) => (
          <div key={fakultə.id} className="group flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/40">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted"><Building2 className="size-5 text-muted-foreground" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{fakultə.ad}</p>{fakultə.kod ? <Badge variant="secondary" className="mt-1 rounded-lg">{fakultə.kod}</Badge> : null}</div>
            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Button variant="ghost" size="icon" className="rounded-xl" onClick={() => açRedaktə(fakultə)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setSilId(fakultə.id)}><Trash2 className="size-4" /></Button></div>
          </div>
        ))}
      </div>

      <Dialog open={dialogAçıq} onOpenChange={setDialogAçıq}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle>{redaktəEdilən ? "Fakültəni redaktə et" : "Yeni fakültə"}</DialogTitle><DialogDescription>Fakültənin adını və istəyə görə qısa kodunu daxil edin.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="fakulte-ad">Fakültə adı</Label><Input id="fakulte-ad" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Mühəndislik fakültəsi" className="rounded-xl" /></div><div className="space-y-2"><Label htmlFor="fakulte-kod">Kod <span className="text-muted-foreground">(istəyə görə)</span></Label><Input id="fakulte-kod" value={kod} onChange={(e) => setKod(e.target.value)} placeholder="MF" className="rounded-xl" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogAçıq(false)} className="rounded-xl">Ləğv et</Button><Button disabled={save.isPending} onClick={() => save.mutate()} className="gap-2 rounded-xl">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}{save.isPending ? "Yadda saxlanılır..." : "Yadda saxla"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!silId} onOpenChange={(open) => !open && setSilId(null)}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Fakültə silinsin?</AlertDialogTitle><AlertDialogDescription>Bu əməliyyat geri qaytarıla bilməz. Fakültəyə bağlı qruplar varsa silinmə rədd ediləcək.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel><AlertDialogAction className="rounded-xl" disabled={remove.isPending} onClick={() => silId && remove.mutate(silId)}>{remove.isPending ? "Silinir..." : "Sil"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}
