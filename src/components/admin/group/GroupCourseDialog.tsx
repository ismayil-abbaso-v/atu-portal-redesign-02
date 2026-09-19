import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Link2, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  ProfileSearchCombobox,
  type ProfilNeticesi,
} from "@/components/admin/ProfileSearchCombobox";
import { CourseSearchCombobox } from "@/components/admin/group/CourseSearchCombobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MUELLIM_ICAZELERI, muellimAdıFormatla } from "@/lib/courses";
import { useGroupsI18n } from "@/lib/groups-i18n";
import { cn } from "@/lib/utils";

type Rejim = "existing" | "new";

export function GroupCourseDialog({
  açıq,
  onOpenChange,
  groupId,
  mövcudFennIdler,
  tutorMode = false,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  groupId: string;
  mövcudFennIdler: string[];
  tutorMode?: boolean;
}) {
  const queryClient = useQueryClient();
  const { t } = useGroupsI18n();
  const [rejim, setRejim] = useState<Rejim>("existing");
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const [kurs, setKurs] = useState("");
  const [muellim, setMuellim] = useState<ProfilNeticesi | null>(null);
  const [kredit, setKredit] = useState("");
  const [saat, setSaat] = useState("");

  function formuSifirla() {
    setAd("");
    setKod("");
    setKurs("");
    setMuellim(null);
    setKredit("");
    setSaat("");
  }

  async function sorğularıYenilə() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["group-courses", groupId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-courses", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["course-search"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-group-courses"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-groups-course-links"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-home-course-links"] }),
    ]);
  }

  const mövcudFennMutasiyasi = useMutation({
    mutationFn: async (courseId: string) => {
      if (tutorMode) {
        const { error } = await supabase.rpc(
          "link_unassigned_course_to_group" as never,
          { p_group_id: groupId, p_course_id: courseId } as never,
        );
        if (error) throw new Error(error.message);
        return;
      }

      // The DB trigger assigns tedris_ili/semestr from system_settings on insert.
      const { error } = await (supabase as any)
        .from("course_groups")
        .insert({ course_id: courseId, group_id: groupId });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("dialog.successLinked"));
      await sorğularıYenilə();
      onOpenChange(false);
    },
    onError: (xeta: Error) => toast.error(xeta.message || t("dialog.errorAdd")),
  });

  const yeniFennMutasiyasi = useMutation({
    mutationFn: async () => {
      if (!ad.trim()) throw new Error(t("dialog.errorName"));
      if (kredit && (!Number.isInteger(Number(kredit)) || Number(kredit) < 0)) {
        throw new Error(t("dialog.errorCredit"));
      }
      if (saat && (!Number.isInteger(Number(saat)) || Number(saat) < 0)) {
        throw new Error(t("dialog.errorHours"));
      }
      if (kurs && ![1, 2, 3, 4].includes(Number(kurs))) {
        throw new Error(t("dialog.errorYear"));
      }

      const { data: rpcData, error: fennXetasi } = await supabase.rpc(
        "create_course_for_group" as never,
        {
          p_group_id: groupId,
          p_ad: ad.trim(),
          p_kod: kod.trim().toUpperCase() || null,
          p_kurs: kurs ? Number(kurs) : null,
          p_muellim_id: muellim?.user_id ?? null,
          p_kredit: kredit ? Number(kredit) : null,
          p_saat: saat ? Number(saat) : null,
          p_muellim_icazeler: muellim ? DEFAULT_MUELLIM_ICAZELERI : {},
        } as never,
      );
      if (fennXetasi) throw new Error(fennXetasi.message || t("dialog.errorCreate"));

      const yeniFennId = rpcData as unknown as string | null;
      if (!yeniFennId) throw new Error(t("dialog.errorCreate"));
      return yeniFennId;
    },
    onSuccess: async () => {
      toast.success(t("dialog.successCreated"));
      await sorğularıYenilə();
      formuSifirla();
      onOpenChange(false);
    },
    onError: (xeta: Error) => toast.error(xeta.message || t("dialog.errorCreate")),
  });

  const gozleyir = mövcudFennMutasiyasi.isPending || yeniFennMutasiyasi.isPending;

  return (
    <Dialog
      open={açıq}
      onOpenChange={(deyer) => {
        if (gozleyir) return;
        onOpenChange(deyer);
        if (!deyer) {
          setRejim("existing");
          formuSifirla();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          <button
            type="button"
            disabled={gozleyir}
            onClick={() => setRejim("existing")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
              rejim === "existing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Link2 className="size-4 shrink-0" />
            <span className="truncate">{t("dialog.existing")}</span>
          </button>
          <button
            type="button"
            disabled={gozleyir}
            onClick={() => setRejim("new")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
              rejim === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Plus className="size-4 shrink-0" />
            <span className="truncate">{t("dialog.new")}</span>
          </button>
        </div>

        {rejim === "existing" ? (
          <div className="space-y-3 py-1">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
              {t(tutorMode ? "dialog.existingTutorHint" : "dialog.existingHint")}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">{t("dialog.course")}</label>
              <CourseSearchCombobox
                istisnaIdler={mövcudFennIdler}
                placeholder={t("dialog.search")}
                disabled={gozleyir}
                tutorGroupId={tutorMode ? groupId : undefined}
                onSecim={(fenn) => mövcudFennMutasiyasi.mutate(fenn.id)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-3 text-sm leading-6 text-muted-foreground">
              {t("dialog.newHint")}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.name")}</label>
                <Input
                  value={ad}
                  onChange={(e) => setAd(e.target.value)}
                  placeholder={t("dialog.namePlaceholder")}
                  disabled={gozleyir}
                  className="min-h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.code")}</label>
                <Input
                  value={kod}
                  onChange={(e) => setKod(e.target.value.toUpperCase())}
                  placeholder={t("dialog.codePlaceholder")}
                  disabled={gozleyir}
                  className="min-h-11 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.primaryTeacher")}</label>
              {muellim ? (
                <div className="flex min-h-11 items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
                  <span className="truncate font-medium">{muellimAdıFormatla(muellim)}</span>
                  <button
                    type="button"
                    disabled={gozleyir}
                    className="ml-3 min-h-9 shrink-0 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                    onClick={() => setMuellim(null)}
                  >
                    {t("dialog.change")}
                  </button>
                </div>
              ) : (
                <ProfileSearchCombobox rol="muellim" placeholder={t("dialog.teacherSearch")} onSecim={setMuellim} />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.year")}</label>
                <select
                  value={kurs}
                  onChange={(e) => setKurs(e.target.value)}
                  disabled={gozleyir}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.credit")}</label>
                <Input type="number" min="0" step="1" value={kredit} onChange={(e) => setKredit(e.target.value)} disabled={gozleyir} className="min-h-11 rounded-xl" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("dialog.hours")}</label>
                <Input type="number" min="0" step="1" value={saat} onChange={(e) => setSaat(e.target.value)} disabled={gozleyir} className="min-h-11 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={gozleyir} onClick={() => onOpenChange(false)} className="min-h-11 rounded-xl">
            {t("dialog.cancel")}
          </Button>
          {rejim === "new" ? (
            <Button disabled={gozleyir || !ad.trim()} onClick={() => yeniFennMutasiyasi.mutate()} className="min-h-11 gap-2 rounded-xl">
              {yeniFennMutasiyasi.isPending ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
              {t("dialog.createAndLink")}
            </Button>
          ) : mövcudFennMutasiyasi.isPending ? (
            <div className="flex min-h-11 items-center gap-2 px-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("dialog.linking")}
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
