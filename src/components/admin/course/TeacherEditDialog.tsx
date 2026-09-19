import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Star, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProfileSearchCombobox } from "@/components/admin/ProfileSearchCombobox";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import {
  DARS_NOVLERI,
  DEFAULT_MUELLIM_ICAZELERI,
  muellimAdıFormatla,
  type CourseTeacher,
} from "@/lib/courses";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import { cn } from "@/lib/utils";

type ProfileLite = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "ad" | "soyad" | "istifadeci_adi" | "avatar_url">;
type MuellimSetri = CourseTeacher & { profil: ProfileLite | null };
type DetachImpact = {
  exists?: boolean;
  schedule_templates?: number;
  future_unconfirmed_sessions?: number;
  active_sessions?: number;
  confirmed_history_sessions?: number;
  past_unconfirmed_sessions?: number;
  is_primary?: boolean;
  requires_reassignment?: boolean;
  blocked_by_active_session?: boolean;
};

type RemoveTarget = { teacherId: string; name: string } | null;

export function TeacherEditDialog({
  açıq,
  onOpenChange,
  courseId,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  courseId: string;
}) {
  const queryClient = useQueryClient();
  const { t, lessonTypeLabel } = useCourseManagementI18n();
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null);
  const [impact, setImpact] = useState<DetachImpact | null>(null);
  const [replacementTeacherId, setReplacementTeacherId] = useState<string>("");

  const { data: courseInfo, isLoading: courseLoading } = useQuery({
    queryKey: ["course-teacher-settings", courseId],
    enabled: açıq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("muellim_id, aktiv_dars_novleri")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const aktivDarsNovleri = (courseInfo?.aktiv_dars_novleri as Record<string, boolean>) ?? {};

  const { data: muellimler = [], isLoading } = useQuery({
    queryKey: ["course-teachers", courseId],
    enabled: açıq,
    queryFn: async (): Promise<MuellimSetri[]> => {
      const { data, error } = await supabase
        .from("course_teachers")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at");
      if (error) throw error;
      const rows = (data ?? []) as CourseTeacher[];
      if (!rows.length) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, istifadeci_adi, avatar_url")
        .in("user_id", rows.map((row) => row.muellim_id));
      if (profileError) throw profileError;
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile as ProfileLite]));
      return rows
        .map((row) => ({ ...row, profil: profileMap.get(row.muellim_id) ?? null }))
        .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profil, b.profil));
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["course-teachers", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["course-teacher-settings", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["course-schedule-templates", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule-templates"] }),
    ]);
  };

  const addTeacher = useMutation({
    mutationFn: async (teacherId: string) => {
      const permissions = Object.fromEntries(
        DARS_NOVLERI.map((type) => [type, !!aktivDarsNovleri[type] && !!DEFAULT_MUELLIM_ICAZELERI[type]]),
      );
      const { error } = await supabase.from("course_teachers").insert({
        course_id: courseId,
        muellim_id: teacherId,
        icazeler: permissions,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("teacher.addSuccess"));
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message || t("teacher.addError")),
  });

  const changePermission = useMutation({
    mutationFn: async ({ id, type, checked, current }: { id: string; type: (typeof DARS_NOVLERI)[number]; checked: boolean; current: Record<string, boolean> }) => {
      if (!aktivDarsNovleri[type] && checked) throw new Error(t("teacher.inactiveType"));
      const { error } = await supabase.from("course_teachers").update({ icazeler: { ...current, [type]: checked } }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message || t("teacher.permissionError")),
  });

  const setPrimary = useMutation({
    mutationFn: async (teacherId: string) => {
      const { error } = await supabase.rpc("set_course_primary_teacher" as never, {
        p_course_id: courseId,
        p_teacher_id: teacherId,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("teacher.primarySuccess"));
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message || t("teacher.primaryError")),
  });

  const auditDetach = useMutation({
    mutationFn: async (target: NonNullable<RemoveTarget>) => {
      const { data, error } = await supabase.rpc("course_teacher_detach_impact" as never, {
        p_course_id: courseId,
        p_teacher_id: target.teacherId,
      } as never);
      if (error) throw new Error(error.message);
      return (data ?? {}) as unknown as DetachImpact;
    },
    onSuccess: (data) => setImpact(data),
    onError: (error: Error) => {
      toast.error(error.message || t("teacher.removeError"));
      closeRemoveDialog();
    },
  });

  const removeTeacher = useMutation({
    mutationFn: async () => {
      if (!removeTarget) return;
      const needsReassignment = !!impact?.requires_reassignment;
      const rpc = needsReassignment ? "reassign_and_remove_course_teacher" : "remove_course_teacher";
      const args = needsReassignment
        ? { p_course_id: courseId, p_teacher_id: removeTarget.teacherId, p_replacement_teacher_id: replacementTeacherId }
        : { p_course_id: courseId, p_teacher_id: removeTarget.teacherId };
      if (needsReassignment && !replacementTeacherId) throw new Error(t("teacher.replacementNeeded"));
      const { error } = await supabase.rpc(rpc as never, args as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("teacher.removeSuccess"));
      closeRemoveDialog();
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message || t("teacher.removeError")),
  });

  const busy = addTeacher.isPending || changePermission.isPending || setPrimary.isPending || auditDetach.isPending || removeTeacher.isPending;
  const loading = isLoading || courseLoading;
  const replacementOptions = muellimler.filter((teacher) => teacher.muellim_id !== removeTarget?.teacherId);

  function openRemoveDialog(teacher: MuellimSetri) {
    const target = { teacherId: teacher.muellim_id, name: muellimAdıFormatla(teacher.profil) };
    setRemoveTarget(target);
    setImpact(null);
    setReplacementTeacherId("");
    auditDetach.mutate(target);
  }

  function closeRemoveDialog() {
    if (removeTeacher.isPending) return;
    setRemoveTarget(null);
    setImpact(null);
    setReplacementTeacherId("");
  }

  return (
    <>
      <Dialog open={açıq} onOpenChange={(value) => !busy && onOpenChange(value)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-2xl overflow-y-auto rounded-3xl p-0 sm:max-h-[90vh]">
          <DialogHeader className="border-b border-border/70 px-4 pb-4 pt-5 sm:px-6">
            <div className="flex items-start gap-3 pr-10">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span>
              <div className="min-w-0">
                <DialogTitle>{t("teacher.title")}</DialogTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("teacher.description")}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-4 py-5 sm:px-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : !muellimler.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <UsersRound className="mx-auto mb-2 size-7 text-muted-foreground/70" />
                <p className="text-sm font-semibold">{t("teacher.none")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("teacher.noneHint")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {muellimler.map((teacher) => {
                  const permissions = (teacher.icazeler as Record<string, boolean>) ?? {};
                  const name = muellimAdıFormatla(teacher.profil);
                  const primary = courseInfo?.muellim_id === teacher.muellim_id;
                  return (
                    <article key={teacher.id} className="overflow-hidden rounded-2xl border border-border/75 bg-card shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-border/60 px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-10 shrink-0 border border-border/70">
                            {teacher.profil?.avatar_url ? <SignedAvatarImage src={teacher.profil.avatar_url} alt={name} /> : null}
                            <AvatarFallback className="text-xs font-semibold">{(teacher.profil?.soyad?.[0] ?? teacher.profil?.ad?.[0] ?? "?").toLocaleUpperCase("az-AZ")}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                              {primary ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{t("teacher.primary")}</span> : null}
                            </div>
                            {teacher.profil?.istifadeci_adi ? <p className="truncate text-xs text-muted-foreground">@{teacher.profil.istifadeci_adi}</p> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          {!primary ? (
                            <Button type="button" variant="ghost" size="sm" className="min-h-10 rounded-xl px-3" disabled={busy} onClick={() => setPrimary.mutate(teacher.muellim_id)}>
                              <Star className="mr-1.5 size-3.5" /> {t("teacher.makePrimary")}
                            </Button>
                          ) : null}
                          <button
                            type="button"
                            aria-label={t("teacher.removeAria", { teacher: name })}
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                            disabled={busy}
                            onClick={() => openRemoveDialog(teacher)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {DARS_NOVLERI.map((type) => {
                          const active = !!aktivDarsNovleri[type];
                          return (
                            <label key={type} className={cn(
                              "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                              active ? "cursor-pointer border-border/70 bg-muted/20 hover:border-primary/20 hover:bg-muted/45" : "cursor-not-allowed border-border/45 bg-muted/10 text-muted-foreground/60",
                            )}>
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{lessonTypeLabel(type)}</span>
                                {!active ? <span className="text-[10px] uppercase tracking-wide">{t("teacher.deactivated")}</span> : null}
                              </span>
                              <Switch checked={active && !!permissions[type]} disabled={!active || busy} onCheckedChange={(checked) => changePermission.mutate({ id: teacher.id, type, checked, current: permissions })} />
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.025] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("teacher.add")}</p>
              <ProfileSearchCombobox
                rol="muellim"
                istisnaIdler={muellimler.map((teacher) => teacher.muellim_id)}
                placeholder={t("teacher.addPlaceholder")}
                disabled={busy}
                onSecim={(profile) => addTeacher.mutate(profile.user_id)}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border/70 bg-card/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-muted-foreground">{t("teacher.autoSave")}</p>
            <Button className="min-h-11 rounded-xl" disabled={busy} onClick={() => onOpenChange(false)}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && closeRemoveDialog()}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto rounded-3xl">
          <AlertDialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
            <AlertDialogTitle>{t("teacher.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {removeTarget ? <><span className="font-semibold text-foreground">{removeTarget.name}</span> · {impact?.requires_reassignment ? t("teacher.removeReassign") : t("teacher.removePlain")}</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {auditDetach.isPending || !impact ? (
            <div className="flex justify-center py-7"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <ImpactBadge text={t("teacher.impactTemplates", { count: impact.schedule_templates ?? 0 })} />
                <ImpactBadge text={t("teacher.impactFuture", { count: impact.future_unconfirmed_sessions ?? 0 })} />
                <ImpactBadge text={t("teacher.impactHistory", { count: (impact.confirmed_history_sessions ?? 0) + (impact.past_unconfirmed_sessions ?? 0) })} />
                <ImpactBadge text={t("teacher.impactActive", { count: impact.active_sessions ?? 0 })} />
              </div>

              {impact.blocked_by_active_session ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{t("teacher.activeBlocked")}</div>
              ) : impact.requires_reassignment ? (
                replacementOptions.length ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t("teacher.replacement")}</label>
                    <Select value={replacementTeacherId} onValueChange={setReplacementTeacherId}>
                      <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder={t("teacher.replacementPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {replacementOptions.map((teacher) => <SelectItem key={teacher.muellim_id} value={teacher.muellim_id}>{muellimAdıFormatla(teacher.profil)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-muted-foreground">{t("teacher.replacementNeeded")}</div>
                )
              ) : null}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl" disabled={removeTeacher.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!impact || auditDetach.isPending || removeTeacher.isPending || !!impact.blocked_by_active_session || (!!impact.requires_reassignment && !replacementTeacherId)}
              onClick={(event) => { event.preventDefault(); removeTeacher.mutate(); }}
            >
              {removeTeacher.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {impact?.requires_reassignment ? t("teacher.confirmReassign") : t("teacher.confirmRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ImpactBadge({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-muted/25 px-2.5 py-2 text-center font-semibold text-muted-foreground">{text}</div>;
}
