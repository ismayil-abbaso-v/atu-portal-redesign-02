import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { AKTIV_DARS_NOVU_ACARLARI, type AktivDarsNovuAcari } from "@/lib/courses";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type Impact = { topics: number; templates: number; sessions: number; permissions: number };

export function LessonTypesPanel({ courseId, aktivDarsNovleri }: { courseId: string; aktivDarsNovleri: Record<string, boolean> }) {
  const queryClient = useQueryClient();
  const { t, lessonTypeLabel } = useCourseManagementI18n();
  const [pendingDisable, setPendingDisable] = useState<AktivDarsNovuAcari | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (next: Record<string, boolean>) => {
      const { error } = await supabase.from("courses").update({ aktiv_dars_novleri: next as Json }).eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ["course-detail", courseId] });
      const previous = queryClient.getQueryData<CourseRow>(["course-detail", courseId]);
      queryClient.setQueryData<CourseRow>(["course-detail", courseId], (current) => current ? { ...current, aktiv_dars_novleri: next as Json } : current);
      return { previous };
    },
    onSuccess: () => toast.success(t("lesson.success")),
    onError: (error: Error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(["course-detail", courseId], context.previous);
      toast.error(error.message || t("lesson.error"));
    },
    onSettled: async () => {
      setPendingDisable(null);
      setImpact(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["course-teachers", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["course-teacher-settings", courseId] }),
      ]);
    },
  });

  async function requestChange(type: AktivDarsNovuAcari, checked: boolean) {
    if (checked || !aktivDarsNovleri[type]) {
      updateMutation.mutate({ ...aktivDarsNovleri, [type]: checked });
      return;
    }

    setPendingDisable(type);
    setImpact(null);
    setImpactLoading(true);
    try {
      const [topics, templates, sessions, teachers] = await Promise.all([
        type === "qrup_dersi"
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from("course_topics").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("dars_novu", type),
        type === "qrup_dersi"
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from("course_schedule_templates").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("dars_novu", type),
        type === "qrup_dersi"
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from("course_lesson_sessions").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("dars_novu", type),
        supabase.from("course_teachers").select("id, icazeler").eq("course_id", courseId),
      ]);
      const error = topics.error || templates.error || sessions.error || teachers.error;
      if (error) throw error;
      const permissionCount = (teachers.data ?? []).filter((teacher) => {
        const permissions = (teacher.icazeler as Record<string, boolean>) ?? {};
        return !!permissions[type];
      }).length;
      setImpact({
        topics: topics.count ?? 0,
        templates: templates.count ?? 0,
        sessions: sessions.count ?? 0,
        permissions: permissionCount,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("lesson.impactError"));
      setPendingDisable(null);
    } finally {
      setImpactLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-4" /></div>
          <div className="min-w-0"><h3 className="text-sm font-semibold tracking-tight">{t("lesson.title")}</h3><p className="mt-0.5 text-xs text-muted-foreground">{t("lesson.description")}</p></div>
        </div>
        <div className="space-y-2">
          {AKTIV_DARS_NOVU_ACARLARI.map((type) => (
            <label key={type} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 text-sm transition-colors hover:border-primary/20 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
              <span className="min-w-0 font-medium text-foreground">{lessonTypeLabel(type)}</span>
              <Switch checked={!!aktivDarsNovleri[type]} disabled={updateMutation.isPending || impactLoading} onCheckedChange={(checked) => void requestChange(type, checked)} />
            </label>
          ))}
        </div>
      </section>

      <AlertDialog open={!!pendingDisable} onOpenChange={(open) => { if (!open && !updateMutation.isPending) { setPendingDisable(null); setImpact(null); } }}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lesson.disableTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {pendingDisable ? t("lesson.disableDescription", { type: lessonTypeLabel(pendingDisable) }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {impactLoading || !impact ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <ImpactBox text={t("lesson.impactTopics", { count: impact.topics })} />
                <ImpactBox text={t("lesson.impactTemplates", { count: impact.templates })} />
                <ImpactBox text={t("lesson.impactSessions", { count: impact.sessions })} />
                <ImpactBox text={t("lesson.impactPermissions", { count: impact.permissions })} />
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-3 text-sm leading-6 text-muted-foreground">{t("lesson.preserved")}</div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl" disabled={updateMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl"
              disabled={!pendingDisable || !impact || impactLoading || updateMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDisable) updateMutation.mutate({ ...aktivDarsNovleri, [pendingDisable]: false });
              }}
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("lesson.disableConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ImpactBox({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-muted/25 px-2.5 py-2 text-center font-semibold text-muted-foreground">{text}</div>;
}
