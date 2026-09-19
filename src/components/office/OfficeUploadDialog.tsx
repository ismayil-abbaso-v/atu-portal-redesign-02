import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { MAX_OFIS_FAYL_OLCUSU, OFIS_BUCKET, olcuFormatla, progresLiYukle } from "@/lib/office-files";
import { cn } from "@/lib/utils";

export function OfficeUploadDialog({
  açıq,
  onOpenChange,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [seçilmişFayl, setSeçilmişFayl] = useState<File | null>(null);
  const [surukleyirMi, setSurukleyirMi] = useState(false);
  const [faiz, setFaiz] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function sifirla() {
    setSeçilmişFayl(null);
    setFaiz(0);
    setSurukleyirMi(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const mutasiya = useMutation({
    mutationFn: async () => {
      if (!seçilmişFayl) throw new Error("Zəhmət olmasa bir fayl seçin.");
      if (seçilmişFayl.size > MAX_OFIS_FAYL_OLCUSU) {
        throw new Error("Fayl 100MB-dan böyük ola bilməz.");
      }

      const { data: userData } = await supabase.auth.getUser();
      const istifadeciId = userData.user?.id;
      if (!istifadeciId) throw new Error("Sessiya tapılmadı, yenidən daxil olun.");

      const uzantı = seçilmişFayl.name.includes(".")
        ? seçilmişFayl.name.split(".").pop()
        : "";
      const yol = `${istifadeciId}/${crypto.randomUUID()}${uzantı ? `.${uzantı}` : ""}`;

      setFaiz(0);
      await progresLiYukle(yol, seçilmişFayl, setFaiz);

      const { error } = await supabase.from("office_files").insert({
        ad: seçilmişFayl.name,
        sahib_id: istifadeciId,
        fayl_url: yol,
        olcusu: seçilmişFayl.size,
        fayl_novu: seçilmişFayl.type || null,
      });
      if (error) {
        // Sətir yazıla bilmədisə, yüklənmiş faylı da təmizləyək
        await supabase.storage.from(OFIS_BUCKET).remove([yol]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Fayl yükləndi");
      void queryClient.invalidateQueries({ queryKey: ["ofis-fayllar"] });
      sifirla();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Fayl yüklənərkən xəta baş verdi.");
      setFaiz(0);
    },
  });

  function fayllariGoturr(fayllar: FileList | null) {
    const fayl = fayllar?.[0];
    if (fayl) setSeçilmişFayl(fayl);
  }

  return (
    <Dialog
      open={açıq}
      onOpenChange={(deyer) => {
        if (mutasiya.isPending) return;
        onOpenChange(deyer);
        if (!deyer) sifirla();
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">Fayl yüklə</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSurukleyirMi(true);
          }}
          onDragLeave={() => setSurukleyirMi(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurukleyirMi(false);
            fayllariGoturr(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-muted/40 p-6 text-center transition-colors",
            surukleyirMi ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <UploadCloud className={cn("size-9", surukleyirMi ? "text-primary" : "text-primary/80")} />
          {seçilmişFayl ? (
            <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-sm font-bold text-foreground shadow-sm">
              <span className="max-w-[220px] truncate">{seçilmişFayl.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {olcuFormatla(seçilmişFayl.size)}
              </span>
              {!mutasiya.isPending ? (
                <button
                  type="button"
                  aria-label="Fayl seçimini ləğv et"
                  onClick={(e) => {
                    e.stopPropagation();
                    sifirla();
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground">
                Seçmək üçün klikləyin və ya faylı bura sürüşdürün
              </p>
              <p className="text-xs text-muted-foreground">Fayl seçin (maks. 100MB)</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => fayllariGoturr(e.target.files)}
          />
        </div>

        {mutasiya.isPending ? (
          <div className="space-y-1.5">
            <Progress value={faiz} />
            <p className="text-center text-xs font-medium text-muted-foreground">
              Yüklənir... {faiz}%
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={mutasiya.isPending}
            onClick={() => {
              onOpenChange(false);
              sifirla();
            }}
            className="rounded-xl font-bold"
          >
            Ləğv et
          </Button>
          <Button
            type="button"
            disabled={!seçilmişFayl || mutasiya.isPending}
            onClick={() => mutasiya.mutate()}
            className="gap-2 rounded-xl font-bold"
          >
            {mutasiya.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Yüklə
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
