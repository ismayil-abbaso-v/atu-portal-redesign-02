import { useState } from "react";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { BookMarked, BookOpen, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

import type { LibraryBook } from "./BookCard";
import { PdfReader } from "./PdfReader";

export function BookDetailModal({
  kitab,
  açıq,
  onClose,
}: {
  kitab: LibraryBook | null;
  açıq: boolean;
  onClose: () => void;
}) {
  const [oxumaRejimi, setOxumaRejimi] = useState(false);
  const [oxumaUrl, setOxumaUrl] = useState<string | null>(null);
  const [yuklenir, setYuklenir] = useState(false);
  const [endirilir, setEndirilir] = useState(false);

  function bagla() {
    setOxumaRejimi(false);
    setOxumaUrl(null);
    onClose();
  }

  async function handleOxu() {
    if (!kitab) return;
    if (kitab.format === "epub") {
      await handleEndir();
      return;
    }
    setYuklenir(true);
    try {
      const { data, error } = await supabase.storage
        .from("library-books")
        .createSignedUrl(kitab.fayl_url, 60 * 30);
      if (error) throw error;
      setOxumaUrl(data.signedUrl);
      setOxumaRejimi(true);
    } catch {
      toast.error("Kitab açılarkən xəta baş verdi.");
    } finally {
      setYuklenir(false);
    }
  }

  async function handleEndir() {
    if (!kitab) return;
    setEndirilir(true);
    try {
      const { data, error } = await supabase.storage
        .from("library-books")
        .createSignedUrl(kitab.fayl_url, 60, { download: true });
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Fayl endirilərkən xəta baş verdi.");
    } finally {
      setEndirilir(false);
    }
  }

  if (!kitab) return null;

  return (
    <Dialog
      open={açıq}
      onOpenChange={(val) => {
        if (!val) bagla();
      }}
    >
      <DialogContent
        className={
          oxumaRejimi
            ? "flex h-[90vh] max-w-4xl flex-col gap-4 rounded-3xl border-border bg-card p-4 sm:p-6"
            : "w-[calc(100vw-1rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card p-0 sm:w-[calc(100vw-2rem)]"
        }
      >
        {oxumaRejimi ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">{kitab.ad}</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1">
              {oxumaUrl ? <PdfReader faylUrl={oxumaUrl} baslıq={kitab.ad} /> : null}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-5 sm:px-7 sm:pt-7">
              <DialogTitle className="text-lg font-bold text-foreground">Ətraflı</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-6 px-5 pb-5 sm:flex-row sm:gap-8 sm:px-7 sm:pb-7">
              <div className="mx-auto aspect-[3/4] w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl bg-muted shadow sm:mx-0 sm:w-56 sm:max-w-none">
                {kitab.uz_qabigi_url ? (
                  <img
                    src={kitab.uz_qabigi_url}
                    alt={kitab.ad}
                    className="block size-full object-contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <BookMarked className="size-10 stroke-[1.25] text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="break-words text-xl font-bold text-foreground sm:text-2xl">{kitab.ad}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{kitab.muellif}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-lg font-bold">
                    {kitab.kateqoriya}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg">
                    {format(new Date(kitab.elave_olunma_tarixi), "yyyy", { locale: az })}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg uppercase">
                    {kitab.format}
                  </Badge>
                </div>

                {kitab.tesvir ? (
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {kitab.tesvir}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => void handleOxu()}
                    disabled={yuklenir}
                    className="min-h-11 flex-1 gap-2 rounded-xl font-bold"
                  >
                    {yuklenir ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BookOpen className="size-4" />
                    )}
                    Oxu
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleEndir()}
                    disabled={endirilir}
                    className="min-h-11 flex-1 gap-2 rounded-xl font-bold"
                  >
                    {endirilir ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    Yüklə
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
