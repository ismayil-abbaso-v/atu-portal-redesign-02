import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";

type GradingType = Database["public"]["Enums"]["course_grading_type"];
type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

type Props = {
  courseId: string;
  qiymetlendirmeNovu: GradingType | null;
  kursIsiVar: boolean;
  umumiLabSayi: number | null;
  umumiDersSaati: number | null;
  cacheQueryKey?: readonly unknown[];
};

function optimisticPatch(current: unknown, courseId: string, patch: CourseUpdate) {
  if (Array.isArray(current)) {
    return current.map((row) => row && typeof row === "object" && "id" in row && row.id === courseId ? { ...row, ...patch } : row);
  }
  if (current && typeof current === "object") return { ...current, ...patch };
  return current;
}

export function QiymetlendirmeNovuPanel({ courseId, qiymetlendirmeNovu, kursIsiVar, umumiLabSayi, umumiDersSaati, cacheQueryKey }: Props) {
  const queryClient = useQueryClient();
  const { t } = useCourseManagementI18n();
  const queryKey = cacheQueryKey ?? ["course-detail", courseId];

  const mutation = useMutation({
    mutationFn: async (patch: CourseUpdate) => {
      const { error } = await supabase.from("courses").update(patch).eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (current: unknown) => optimisticPatch(current, courseId, patch));
      return { previous };
    },
    onSuccess: () => toast.success(t("grading.success")),
    onError: (error: Error, _patch, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(queryKey, context.previous);
      toast.error(error.message || t("grading.error"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      if (cacheQueryKey) void queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    },
  });

  const saveNumber = (field: "umumi_lab_sayi" | "umumi_ders_saati", raw: string, current: number | null) => {
    const clean = raw.trim();
    if (!clean) {
      if (current !== null) mutation.mutate({ [field]: null });
      return;
    }
    const value = Number(clean);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error(t("grading.positive"));
      return;
    }
    if (value !== current) mutation.mutate({ [field]: value });
  };

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Calculator className="size-4" /></div>
        <div className="min-w-0"><h3 className="text-sm font-semibold tracking-tight">{t("grading.title")}</h3><p className="mt-0.5 text-xs text-muted-foreground">{t("grading.description")}</p></div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("grading.type")}</label>
          <Select value={qiymetlendirmeNovu ?? undefined} disabled={mutation.isPending} onValueChange={(value) => {
            const type = value as GradingType;
            mutation.mutate(type === "meshgele" ? { qiymetlendirme_novu: type, umumi_lab_sayi: null } : { qiymetlendirme_novu: type });
          }}>
            <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder={t("grading.choose")} /></SelectTrigger>
            <SelectContent><SelectItem value="meshgele">{t("grading.practice")}</SelectItem><SelectItem value="laboratoriya">{t("grading.lab")}</SelectItem></SelectContent>
          </Select>
        </div>

        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 text-sm transition-colors hover:border-primary/20 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
          <span className="min-w-0"><span className="block font-medium text-foreground">{t("grading.courseWork")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{t("grading.courseWorkDescription")}</span></span>
          <Switch checked={kursIsiVar} disabled={mutation.isPending} onCheckedChange={(checked) => mutation.mutate({ kurs_isi_var: checked })} />
        </label>

        {qiymetlendirmeNovu === "laboratoriya" ? (
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{t("grading.labCount")}</label><Input key={`${courseId}-lab-${umumiLabSayi ?? "empty"}`} type="number" min={1} step={1} defaultValue={umumiLabSayi ?? ""} disabled={mutation.isPending} className="min-h-11 rounded-xl" placeholder="10" onBlur={(event) => saveNumber("umumi_lab_sayi", event.currentTarget.value, umumiLabSayi)} /></div>
        ) : null}

        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{t("grading.totalHours")}</label><Input key={`${courseId}-hours-${umumiDersSaati ?? "empty"}`} type="number" min={1} step={1} defaultValue={umumiDersSaati ?? ""} disabled={mutation.isPending} className="min-h-11 rounded-xl" placeholder={t("grading.auto")} onBlur={(event) => saveNumber("umumi_ders_saati", event.currentTarget.value, umumiDersSaati)} /><p className="text-[11px] leading-relaxed text-muted-foreground">{t("grading.autoHint")}</p></div>
      </div>
    </section>
  );
}
