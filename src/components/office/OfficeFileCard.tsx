import { az } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";
import { faylIkonuAl, faylNovunuTeyinEt, faylRengiAl, olcuFormatla } from "@/lib/office-files";
import { cn } from "@/lib/utils";
import { usePageI18n } from "@/lib/i18n-extra";

export type OfisFayli = Database["public"]["Tables"]["office_files"]["Row"];

export function OfficeFileCard({
  fayl,
  silmeIcazesiVar,
  endirilir,
  silinir,
  onEndir,
  onSil,
}: {
  fayl: OfisFayli;
  /** Tyutor kimi başqasının faylına baxan istifadəçi üçün "Sil" düyməsi gizlədilir. */
  silmeIcazesiVar: boolean;
  endirilir: boolean;
  silinir: boolean;
  onEndir: () => void;
  onSil: () => void;
}) {
  const [tesdiqAcıq, setTesdiqAcıq] = useState(false);
  const { locale } = usePageI18n();
  const labels = locale === "tr" ? { download: "İndir", remove: "Sil", confirm: "Dosyayı silmeyi onaylayın", cancel: "İptal", yes: "Evet, sil" } : locale === "en" ? { download: "Download", remove: "Delete", confirm: "Confirm file deletion", cancel: "Cancel", yes: "Yes, delete" } : locale === "ru" ? { download: "Скачать", remove: "Удалить", confirm: "Подтвердите удаление файла", cancel: "Отмена", yes: "Да, удалить" } : { download: "Yüklə", remove: "Sil", confirm: "Faylı silməyi təsdiqləyin", cancel: "İmtina", yes: "Bəli, sil" };
  const nov = faylNovunuTeyinEt(fayl.fayl_novu);
  const Ikon = faylIkonuAl(nov);

  return (
    <div className="office-file-card flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", faylRengiAl(nov))}>
          <Ikon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-bold text-foreground" title={fayl.ad}>
            {fayl.ad}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {olcuFormatla(fayl.olcusu)} ·{" "}
            {formatDistanceToNow(new Date(fayl.tarix), { addSuffix: true, locale: az })}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={endirilir}
          onClick={onEndir}
          className="flex-1 gap-1.5 rounded-xl font-bold"
        >
          {endirilir ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          {labels.download}
        </Button>
        {silmeIcazesiVar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={silinir}
            onClick={() => setTesdiqAcıq(true)}
            className="gap-1.5 rounded-xl font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {silinir ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {labels.remove}
          </Button>
        ) : null}
      </div>

      <AlertDialog open={tesdiqAcıq} onOpenChange={setTesdiqAcıq}>
        <AlertDialogContent className="rounded-3xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-foreground">
              {labels.confirm}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              "{fayl.ad}" faylı həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onSil}
              className="rounded-xl bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
            >
              {labels.yes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
