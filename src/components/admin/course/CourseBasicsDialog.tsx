import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

export function CourseBasicsDialog({
  açıq,
  onOpenChange,
  course,
}: {
  açıq: boolean;
  onOpenChange: (value: boolean) => void;
  course: CourseRow;
}) {
  const queryClient = useQueryClient();
  const { t } = useCourseManagementI18n();
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const [kurs, setKurs] = useState("");
  const [kredit, setKredit] = useState("");
  const [saat, setSaat] = useState("");

  useEffect(() => {
    if (!açıq) return;
    setAd(course.ad ?? "");
    setKod(course.kod ?? "");
    setKurs(course.kurs != null ? String(course.kurs) : "");
    setKredit(course.kredit != null ? String(course.kredit) : "");
    setSaat(course.saat != null ? String(course.saat) : "");
  }, [açıq, course]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanName = ad.trim();
      if (!cleanName) throw new Error(t("basics.nameError"));

      const year = kurs.trim() ? Number(kurs) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1 || year > 6)) {
        throw new Error(t("basics.yearError"));
      }

      const credit = kredit.trim() ? Number(kredit) : null;
      const hours = saat.trim() ? Number(saat) : null;
      if (
        (credit !== null && (!Number.isInteger(credit) || credit < 0)) ||
        (hours !== null && (!Number.isInteger(hours) || hours < 0))
      ) {
        throw new Error(t("basics.numberError"));
      }

      const patch: CourseUpdate = {
        ad: cleanName,
        kod: kod.trim().toUpperCase() || null,
        kurs: year,
        kredit: credit,
        saat: hours,
      };

      const { error } = await supabase.from("courses").update(patch).eq("id", course.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("basics.success"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course-detail", course.id] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-group-courses"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-groups-course-links"] }),
      ]);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || t("basics.error")),
  });

  return (
    <Dialog open={açıq} onOpenChange={(value) => !saveMutation.isPending && onOpenChange(value)}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("basics.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t("basics.name")}</label>
            <Input
              value={ad}
              onChange={(event) => setAd(event.target.value)}
              placeholder={t("basics.namePlaceholder")}
              disabled={saveMutation.isPending}
              className="min-h-11 rounded-xl"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("basics.code")}</label>
              <Input
                value={kod}
                onChange={(event) => setKod(event.target.value.toUpperCase())}
                placeholder={t("basics.codePlaceholder")}
                disabled={saveMutation.isPending}
                className="min-h-11 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("basics.year")}</label>
              <select
                value={kurs}
                onChange={(event) => setKurs(event.target.value)}
                disabled={saveMutation.isPending}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("basics.credit")}</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={kredit}
                onChange={(event) => setKredit(event.target.value)}
                disabled={saveMutation.isPending}
                className="min-h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("basics.hours")}</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={saat}
                onChange={(event) => setSaat(event.target.value)}
                disabled={saveMutation.isPending}
                className="min-h-11 rounded-xl"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="min-h-11 rounded-xl" disabled={saveMutation.isPending} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button className="min-h-11 rounded-xl" disabled={saveMutation.isPending || !ad.trim()} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
