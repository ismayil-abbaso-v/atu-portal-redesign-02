import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Clock3,
  Edit2,
  GraduationCap,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { TutorExamMaterialStatus } from "@/components/exams/TutorExamMaterialStatus";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  examScheduleErrorCode,
  examScheduleKeys,
  examScheduleTodayIso,
  fetchExamSchedulesForPairs,
  type ExamScheduleLite,
} from "@/lib/exam-schedule-data";
import { useTutorExamI18n, type TutorExamKey } from "@/lib/tutor-exam-i18n";
import {
  fetchTutorAssignedGroups,
  fetchTutorGroupCourses,
  fetchTutorPeriod,
  type TutorCourseLite,
} from "@/lib/tutor-workspace-data";
import "@/role-dashboard.css";

type EditorState = {
  courseId: string;
  date: string;
  time: string;
  room: string;
};

const EMPTY_EDITOR: EditorState = { courseId: "", date: "", time: "", room: "" };

export function TutorExamSchedulerView({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { locale, intlLocale, t } = useTutorExamI18n();
  const [groupId, setGroupId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamScheduleLite | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExamScheduleLite | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const periodQuery = useQuery({
    queryKey: ["tutor-exam-scheduler", "period", userId],
    queryFn: fetchTutorPeriod,
    staleTime: 60_000,
  });
  const groupsQuery = useQuery({
    queryKey: ["tutor-exam-scheduler", "groups", userId],
    queryFn: () => fetchTutorAssignedGroups(userId),
  });
  const groups = groupsQuery.data ?? [];

  useEffect(() => {
    if (!groups.length) {
      setGroupId("");
      return;
    }
    if (!groupId || !groups.some((group) => group.id === groupId)) setGroupId(groups[0]!.id);
  }, [groupId, groups]);

  const period = periodQuery.data;
  const coursesQuery = useQuery({
    queryKey: ["tutor-exam-scheduler", "courses", userId, groupId, period?.year, period?.semester],
    queryFn: () => fetchTutorGroupCourses(groupId, period!),
    enabled: !!groupId && !!period,
  });
  const courses = coursesQuery.data ?? [];
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);
  const pairs = useMemo(() => courses.map((course) => ({ group_id: groupId, course_id: course.id })), [courses, groupId]);

  const examsQuery = useQuery({
    queryKey: examScheduleKeys.tutorGroup(userId, groupId, courseIds),
    queryFn: () => fetchExamSchedulesForPairs(pairs),
    enabled: !!groupId && pairs.length > 0,
  });
  const exams = examsQuery.data ?? [];
  const today = examScheduleTodayIso();
  const upcoming = exams.filter((exam) => exam.imtahan_tarixi >= today);
  const past = exams.filter((exam) => exam.imtahan_tarixi < today).reverse();
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const selectedGroup = groups.find((group) => group.id === groupId) ?? null;

  useEffect(() => {
    document.title = `${t("meta.title")} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = t("meta.description");
  }, [locale, t]);

  const invalidateExamData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tutor-exam-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-workspace-exams"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-home-upcoming-exams"] }),
      queryClient.invalidateQueries({ queryKey: ["student-upcoming-exams"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const courseId = editor.courseId;
      const room = editor.room.trim();
      if (!groupId || !courseId || !editor.date || !editor.time || !room) throw new Error("FORM_REQUIRED");
      if (!courseIds.includes(courseId)) throw new Error("EXAM_COURSE_GROUP_SCOPE");

      const payload = {
        group_id: groupId,
        course_id: courseId,
        imtahan_tarixi: editor.date,
        baslangic_saat: editor.time,
        otaq: room,
      };

      const { error } = editing
        ? await supabase.from("exam_schedule").update(payload).eq("id", editing.id).eq("group_id", groupId)
        : await supabase.from("exam_schedule").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t(editing ? "toast.updated" : "toast.created"));
      setDialogOpen(false);
      setEditing(null);
      setEditor(EMPTY_EDITOR);
      await invalidateExamData();
    },
    onError: (error) => toast.error(localizedError(error, t)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (exam: ExamScheduleLite) => {
      const { error } = await supabase.from("exam_schedule").delete().eq("id", exam.id).eq("group_id", exam.group_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      setPendingDelete(null);
      await invalidateExamData();
    },
    onError: (error) => toast.error(localizedError(error, t)),
  });

  function openCreate() {
    setEditing(null);
    setEditor({ ...EMPTY_EDITOR, courseId: courses[0]?.id ?? "" });
    setDialogOpen(true);
  }

  function openEdit(exam: ExamScheduleLite) {
    setEditing(exam);
    setEditor({
      courseId: exam.course_id,
      date: exam.imtahan_tarixi,
      time: exam.baslangic_saat.slice(0, 5),
      room: exam.otaq,
    });
    setDialogOpen(true);
  }

  const baseLoading = periodQuery.isLoading || groupsQuery.isLoading;
  const anyError = periodQuery.isError || groupsQuery.isError || coursesQuery.isError || examsQuery.isError;

  if (baseLoading) return <TutorExamSchedulerSkeleton />;

  if (!groups.length) {
    return (
      <div className="role-panel-enter space-y-4 pb-7">
        <SchedulerHeader />
        <section className="rounded-[28px] border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <EmptyState icon={GraduationCap} mesaj={t("empty.noGroups")} />
        </section>
      </div>
    );
  }

  return (
    <div className="role-panel-enter space-y-4 pb-7 sm:space-y-5">
      <SchedulerHeader />

      <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(420px,0.9fr)] xl:items-end">
          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("selector.period")}</span>
            <select
              value="current"
              disabled
              aria-label={t("aria.period")}
              className="min-h-11 w-full rounded-xl border border-input bg-muted/45 px-3 text-sm font-semibold text-foreground disabled:cursor-default disabled:opacity-100"
            >
              <option value="current">{period?.year ? `${period.year} · ${period.semesterLabel ?? t("selector.periodPlaceholder")}` : t("selector.periodPlaceholder")}</option>
            </select>
          </label>
          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("selector.group")}</span>
            <select
              value={groupId}
              aria-label={t("aria.group")}
              onChange={(event) => {
                setGroupId(event.target.value);
                setDialogOpen(false);
                setEditing(null);
              }}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
            >
              {groups.map((group) => <option key={group.id} value={group.id}>{group.ad}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Metric label={t("summary.upcoming")} value={upcoming.length} icon={CalendarClock} />
            <Metric label={t("summary.past")} value={past.length} icon={CalendarDays} />
            <Metric label={t("summary.courses")} value={courses.length} icon={BookOpenCheck} />
          </div>
        </div>
      </section>

      <TutorExamMaterialStatus userId={userId} groupId={groupId} courses={courses} period={period} />

      {anyError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-sm text-destructive">
          <span>{t("error.load")}</span>
          <Button
            variant="outline"
            className="min-h-11 rounded-xl"
            onClick={() => void Promise.all([periodQuery.refetch(), groupsQuery.refetch(), coursesQuery.refetch(), examsQuery.refetch()])}
          >
            <RefreshCw className="size-4" />
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {!coursesQuery.isLoading && !courses.length ? (
        <section className="rounded-[28px] border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <EmptyState icon={BookOpenCheck} mesaj={t("empty.noCourses")} />
        </section>
      ) : (
        <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{t("planned.title")}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("planned.description")}</p>
            </div>
            <Button onClick={openCreate} disabled={!courses.length} className="min-h-11 shrink-0 rounded-xl">
              <Plus className="size-4" />{t("action.new")}
            </Button>
          </div>

          {coursesQuery.isLoading || examsQuery.isLoading ? (
            <RowsSkeleton />
          ) : !upcoming.length ? (
            <div className="rounded-2xl border border-dashed border-border/80 px-5 py-10 text-center">
              <CalendarClock className="mx-auto size-9 text-muted-foreground/60" />
              <h3 className="mt-3 font-bold text-foreground">{t("planned.emptyTitle")}</h3>
              <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{t("planned.emptyDescription")}</p>
            </div>
          ) : (
            <ExamRows
              exams={upcoming}
              groupName={selectedGroup?.ad ?? "—"}
              courseMap={courseMap}
              locale={intlLocale}
              past={false}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          )}
        </section>
      )}

      <details className="group rounded-[28px] border border-border/70 bg-card shadow-sm">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div><h2 className="text-sm font-bold text-foreground">{t("past.title")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t("past.count", { count: past.length })}</p></div>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/70 p-4 sm:p-5">
          {!past.length ? <p className="py-6 text-center text-sm text-muted-foreground">{t("past.empty")}</p> : (
            <ExamRows exams={past} groupName={selectedGroup?.ad ?? "—"} courseMap={courseMap} locale={intlLocale} past onEdit={openEdit} onDelete={setPendingDelete} />
          )}
        </div>
      </details>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setEditor(EMPTY_EDITOR);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[24px] border-border bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle>{t(editing ? "form.editTitle" : "form.createTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <Field label={t("form.course")}>
              <select value={editor.courseId} onChange={(event) => setEditor((current) => ({ ...current, courseId: event.target.value }))} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                <option value="" disabled>{t("form.coursePlaceholder")}</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.kod ? `${course.kod} · ` : ""}{course.ad}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("form.date")}><input type="date" value={editor.date} onChange={(event) => setEditor((current) => ({ ...current, date: event.target.value }))} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
              <Field label={t("form.time")}><input type="time" value={editor.time} onChange={(event) => setEditor((current) => ({ ...current, time: event.target.value }))} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
            </div>
            <Field label={t("form.room")}><input value={editor.room} onChange={(event) => setEditor((current) => ({ ...current, room: event.target.value }))} placeholder={t("form.roomPlaceholder")} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
          </div>
          <DialogFooter className="sticky bottom-0 gap-2 border-t border-border/70 bg-card pt-4 sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>{t("action.cancel")}</Button>
            <Button type="button" className="min-h-11 rounded-xl" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}{saveMutation.isPending ? t("action.saving") : t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-[24px] border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete.description", { course: pendingDelete ? courseName(courseMap.get(pendingDelete.course_id)) : "—" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete);
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SchedulerHeader() {
  const { t } = useTutorExamI18n();
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><div className="flex items-center gap-2 text-primary"><GraduationCap className="size-5" /><span className="text-[11px] font-black uppercase tracking-[0.13em]">{t("page.badge")}</span></div><h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("page.title")}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("page.description")}</p></div>
        <div className="flex max-w-md items-start gap-2 rounded-2xl border border-primary/15 bg-primary/[0.045] p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>{t("page.scopeHint")}</span></div>
      </div>
    </header>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarClock }) {
  return <div className="min-w-0 rounded-2xl border border-border/70 bg-background px-2 py-2.5 text-center sm:px-3"><Icon className="mx-auto size-4 text-primary" /><p className="mt-1 font-data text-lg font-black tabular-nums text-foreground sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]">{label}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</span>{children}</label>;
}

function ExamRows({ exams, groupName, courseMap, locale, past, onEdit, onDelete }: { exams: ExamScheduleLite[]; groupName: string; courseMap: Map<string, TutorCourseLite>; locale: string; past: boolean; onEdit: (exam: ExamScheduleLite) => void; onDelete: (exam: ExamScheduleLite) => void }) {
  const { t } = useTutorExamI18n();
  return (
    <>
      <div className="space-y-2 md:hidden">
        {exams.map((exam) => {
          const course = courseMap.get(exam.course_id);
          const name = courseName(course);
          return <article key={exam.id} className="rounded-2xl border border-border/70 bg-background p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Badge variant="outline" className="rounded-full text-[10px]">{past ? t("exam.past") : t("exam.upcoming")}</Badge><h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{name}</h3><p className="mt-1 text-xs text-muted-foreground">{groupName}{course?.kod ? ` · ${course.kod}` : ""}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label={t("aria.edit", { course: name })} onClick={() => onEdit(exam)}><Edit2 className="size-4" /></Button><Button size="icon" variant="ghost" className="size-11 rounded-xl text-destructive hover:text-destructive" aria-label={t("aria.delete", { course: name })} onClick={() => onDelete(exam)}><Trash2 className="size-4" /></Button></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Meta icon={CalendarDays} text={formatDate(exam.imtahan_tarixi, locale)} /><Meta icon={Clock3} text={exam.baslangic_saat.slice(0, 5)} /><Meta icon={MapPin} text={exam.otaq} /></div></article>;
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-border/70 md:block">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-muted/70 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground"><tr><th className="px-4 py-3">{t("exam.course")}</th><th className="px-4 py-3">{t("exam.group")}</th><th className="px-4 py-3">{t("exam.date")}</th><th className="px-4 py-3">{t("exam.time")}</th><th className="px-4 py-3">{t("exam.room")}</th><th className="px-4 py-3 text-right"> </th></tr></thead><tbody className="divide-y divide-border/70">{exams.map((exam) => { const course = courseMap.get(exam.course_id); const name = courseName(course); return <tr key={exam.id} className="hover:bg-muted/25"><td className="px-4 py-3"><p className="font-bold text-foreground">{name}</p>{course?.kod ? <p className="mt-0.5 text-xs text-muted-foreground">{course.kod}</p> : null}</td><td className="px-4 py-3 text-muted-foreground">{groupName}</td><td className="px-4 py-3 text-foreground">{formatDate(exam.imtahan_tarixi, locale)}</td><td className="px-4 py-3 font-data font-semibold text-foreground">{exam.baslangic_saat.slice(0, 5)}</td><td className="px-4 py-3 text-foreground">{exam.otaq}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label={t("aria.edit", { course: name })} onClick={() => onEdit(exam)}><Edit2 className="size-4" /></Button><Button size="icon" variant="ghost" className="size-11 rounded-xl text-destructive hover:text-destructive" aria-label={t("aria.delete", { course: name })} onClick={() => onDelete(exam)}><Trash2 className="size-4" /></Button></div></td></tr>; })}</tbody></table>
      </div>
    </>
  );
}

function Meta({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) {
  return <span className="flex min-w-0 items-center gap-1.5 rounded-xl bg-muted/55 px-2 py-2 text-muted-foreground"><Icon className="size-3.5 shrink-0" /><span className="truncate">{text}</span></span>;
}

function courseName(course: TutorCourseLite | undefined) {
  return course?.ad ?? "—";
}

function formatDate(value: string, locale: string) {
  const date = new Date(`${value}T00:00:00+04:00`);
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Baku", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function localizedError(error: unknown, t: (key: TutorExamKey, vars?: Record<string, string | number>) => string) {
  if (error instanceof Error && error.message === "FORM_REQUIRED") return t("form.required");
  const code = examScheduleErrorCode(error);
  const key: Record<ReturnType<typeof examScheduleErrorCode>, TutorExamKey> = {
    roomRequired: "error.roomRequired",
    courseScope: "error.courseScope",
    duplicateCourse: "error.duplicateCourse",
    groupTimeConflict: "error.groupTimeConflict",
    roomTimeConflict: "error.roomTimeConflict",
    forbidden: "error.forbidden",
    unknown: "error.unknown",
  };
  return t(key[code]);
}

function RowsSkeleton() {
  return <div className="space-y-2"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div>;
}

function TutorExamSchedulerSkeleton() {
  return <div className="role-panel-enter space-y-4 pb-7"><Skeleton className="h-40 rounded-[28px]" /><Skeleton className="h-28 rounded-[28px]" /><Skeleton className="h-[360px] rounded-[28px]" /></div>;
}
