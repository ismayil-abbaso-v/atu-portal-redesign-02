import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  ProfileSearchCombobox,
  type ProfilNeticesi,
} from "@/components/admin/ProfileSearchCombobox";
import { GroupMultiSelect } from "@/components/admin/course/GroupMultiSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MUELLIM_ICAZELERI, muellimAdıFormatla } from "@/lib/courses";

export function CourseFormDialog({
  açıq,
  onOpenChange,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const [muellim, setMuellim] = useState<ProfilNeticesi | null>(null);
  const [kredit, setKredit] = useState("");
  const [saat, setSaat] = useState("");
  const [qruplar, setQruplar] = useState<string[]>([]);

  function sıfırla() {
    setAd("");
    setKod("");
    setMuellim(null);
    setKredit("");
    setSaat("");
    setQruplar([]);
  }

  const mutasiya = useMutation({
    mutationFn: async () => {
      if (!ad.trim()) throw new Error("Fənn adını daxil edin.");
      if (kredit && (!Number.isFinite(Number(kredit)) || Number(kredit) < 0)) {
        throw new Error("Kredit düzgün rəqəm olmalıdır.");
      }
      if (saat && (!Number.isInteger(Number(saat)) || Number(saat) < 0)) {
        throw new Error("Saat sıfır və ya müsbət tam ədəd olmalıdır.");
      }

      const { data: yeniFenn, error } = await (supabase as any)
        .from("courses")
        .insert({
          ad: ad.trim(),
          kod: kod.trim() || null,
          muellim_id: muellim?.user_id ?? null,
          kredit: kredit ? Number(kredit) : null,
          saat: saat ? Number(saat) : null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (muellim) {
        const { error: müellimXetasi } = await supabase.from("course_teachers").insert({
          course_id: yeniFenn.id,
          muellim_id: muellim.user_id,
          icazeler: DEFAULT_MUELLIM_ICAZELERI,
        });
        if (müellimXetasi) throw new Error(müellimXetasi.message);
      }

      if (qruplar.length > 0) {
        // The DB trigger assigns tedris_ili/semestr from system_settings on insert.
        const { error: qrupXetasi } = await (supabase as any)
          .from("course_groups")
          .insert(qruplar.map((groupId) => ({ course_id: yeniFenn.id, group_id: groupId })));
        if (qrupXetasi) throw new Error(qrupXetasi.message);
      }

      return yeniFenn;
    },
    onSuccess: () => {
      toast.success("Fənn yaradıldı.");
      void queryClient.invalidateQueries({ queryKey: ["admin-courses", "list"] });
      sıfırla();
      onOpenChange(false);
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Fənn yaradıla bilmədi."),
  });

  return (
    <Dialog
      open={açıq}
      onOpenChange={(deyer) => {
        if (mutasiya.isPending) return;
        onOpenChange(deyer);
        if (!deyer) sıfırla();
      }}
    >
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle>Yeni fənn</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Ad</label>
              <Input value={ad} onChange={(e) => setAd(e.target.value)} className="rounded-lg" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Dərs kodu</label>
              <Input
                value={kod}
                onChange={(e) => setKod(e.target.value.toUpperCase())}
                placeholder="MHS 310"
                className="rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Əsas müəllim
            </label>
            {muellim ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                {muellimAdıFormatla(muellim)}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setMuellim(null)}
                >
                  Dəyiş
                </button>
              </div>
            ) : (
              <ProfileSearchCombobox
                rol="muellim"
                placeholder="Müəllim axtar..."
                onSecim={(p) => setMuellim(p)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Kredit</label>
              <Input
                type="number"
                min="0"
                value={kredit}
                onChange={(e) => setKredit(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Saat</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                placeholder="4"
                className="rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Qrup(lar)
            </label>
            <GroupMultiSelect seçilenler={qruplar} onDeyisiklik={setQruplar} />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full rounded-lg"
            disabled={mutasiya.isPending}
            onClick={() => mutasiya.mutate()}
          >
            {mutasiya.isPending ? <Loader2 className="size-4 animate-spin" /> : "Yarat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
