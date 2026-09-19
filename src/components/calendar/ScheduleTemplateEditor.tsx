import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Clock3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  lessonTypeLabel,
  scheduleWeekLabel,
  useCalendarManagementI18n,
} from "@/lib/calendar-management-i18n";
import { DARS_NOVLERI, type DarsNovu } from "@/lib/courses";
import {
  formatScheduleTime,
  HEFTE_GUNLERI,
  scheduleSlotsConflict,
  type ScheduleWeekType,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

type TemplateRow = Database["public"]["Tables"]["course_schedule_templates"]["Row"];
type TemplateInsert = Database["public"]["Tables"]["course_schedule_templates"]["Insert"];
type CourseRow = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "id" | "ad" | "aktiv_dars_novleri"
>;
type TeacherRow = Pick<
  Database["public"]["Tables"]["course_teachers"]["Row"],
  "course_id" | "muellim_id" | "icazeler"
>;
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "ad" | "soyad"
>;

type FormState = {
  courseId: string;
  teacherId: string;
  darsNovu: DarsNovu | "";
  otaq: string;
  baslangicSaat: string;
  bitmeSaat: string;
  hefteNovu: ScheduleWeekType;
};

const EMPTY_FORM: FormState = {
  courseId: "",
  teacherId: "",
  darsNovu: "",
  otaq: "",
  baslangicSaat: "09:00",
  bitmeSaat: "10:20",
  hefteNovu: "her_hefte",
};

function profileName(profile: ProfileRow | undefined, fallback: string) {
  if (!profile) return fallback;
  return [profile.ad, profile.soyad].filter(Boolean).join(" ") || fallback;
}

function jsonFlags(value: Json): Record<string, boolean> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, enabled]) => [key, enabled === true]),
  );
}

function weekdayLabel(day: number, locale: string, format: "short" | "long") {
  const monday = new Date(Date.UTC(2024, 0, day));
  return new Intl.DateTimeFormat(locale, { weekday: format, timeZone: "UTC" }).format(monday).replace(/\.$/, "");
}

export function ScheduleTemplateEditor({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const { intlLocale, t } = useCalendarManagementI18n();
  const [activeDay, setActiveDay] = useState("1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: courseLinks = [], isLoading: courseLinksLoading } = useQuery({
    queryKey: ["schedule-course-links", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("course_id")
        .eq("group_id", groupId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const courseIds = useMemo(
    () => [...new Set(courseLinks.map((link) => link.course_id))],
    [courseLinks],
  );

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseRow[]>({
    queryKey: ["schedule-courses", groupId, courseIds.join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, ad, aktiv_dars_novleri")
        .in("id", courseIds)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  const { data: teachers = [] } = useQuery<TeacherRow[]>({
    queryKey: ["schedule-course-teachers", groupId, courseIds.join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_teachers")
        .select("course_id, muellim_id, icazeler")
        .in("course_id", courseIds);
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
  });

  const teacherIds = useMemo(
    () => [...new Set(teachers.map((teacher) => teacher.muellim_id))],
    [teachers],
  );

  const { data: profiles = [] } = useQuery<ProfileRow[]>({
    queryKey: ["schedule-teacher-profiles", groupId, teacherIds.join(",")],
    enabled: teacherIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad")
        .in("user_id", teacherIds);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateRow[]>({
    queryKey: ["schedule-templates", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_schedule_templates")
        .select("*")
        .eq("group_id", groupId)
        .order("gun_nomresi")
        .order("baslangic_saat");
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const selectedCourse = courses.find((course) => course.id === form.courseId);
  const selectedTeacher = teachers.find(
    (teacher) => teacher.course_id === form.courseId && teacher.muellim_id === form.teacherId,
  );
  const courseTeachers = teachers.filter((teacher) => teacher.course_id === form.courseId);
  const activeLessonTypes = jsonFlags(selectedCourse?.aktiv_dars_novleri ?? {});
  const teacherPermissions = selectedTeacher ? jsonFlags(selectedTeacher.icazeler) : {};
  const availableLessonTypes = DARS_NOVLERI.filter(
    (type) => ["muhazire", "seminar", "laboratoriya", "tecrube"].includes(type) && activeLessonTypes[type] && teacherPermissions[type],
  );

  useEffect(() => {
    if (!dialogOpen || !form.courseId) return;
    if (!courseTeachers.some((teacher) => teacher.muellim_id === form.teacherId)) {
      setForm((current) => ({ ...current, teacherId: courseTeachers[0]?.muellim_id ?? "" }));
    }
  }, [dialogOpen, form.courseId, form.teacherId, courseTeachers]);

  useEffect(() => {
    if (!dialogOpen || !form.teacherId) return;
    if (!form.darsNovu || !availableLessonTypes.includes(form.darsNovu)) {
      setForm((current) => ({ ...current, darsNovu: availableLessonTypes[0] ?? "" }));
    }
  }, [dialogOpen, form.teacherId, form.darsNovu, availableLessonTypes]);

  const rebuildGroupSessions = async () => {
    const { error } = await supabase.rpc("rebuild_current_semester_lesson_sessions", {
      p_group_id: groupId,
    });
    if (error) return error.message;
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.courseId) throw new Error(t("editor.errorCourse"));
      if (!form.teacherId) throw new Error(t("editor.errorTeacher"));
      if (!form.darsNovu) throw new Error(t("editor.errorLessonType"));
      if (!form.baslangicSaat || !form.bitmeSaat || form.baslangicSaat >= form.bitmeSaat) {
        throw new Error(t("editor.errorTime"));
      }

      const candidate = {
        gun_nomresi: Number(activeDay),
        baslangic_saat: form.baslangicSaat,
        bitme_saat: form.bitmeSaat,
        hefte_novu: form.hefteNovu,
      };
      const conflict = templates.find(
        (slot) => slot.id !== editing?.id && scheduleSlotsConflict(candidate, slot),
      );
      if (conflict) {
        const conflictCourse = courses.find((course) => course.id === conflict.course_id)?.ad;
        throw new Error(t("editor.errorConflict", {
          week: scheduleWeekLabel(conflict.hefte_novu, t),
          course: conflictCourse ? ` — ${conflictCourse}` : "",
        }));
      }

      const payload: TemplateInsert = {
        course_id: form.courseId,
        group_id: groupId,
        teacher_id: form.teacherId,
        dars_novu: form.darsNovu,
        gun_nomresi: Number(activeDay),
        baslangic_saat: form.baslangicSaat,
        bitme_saat: form.bitmeSaat,
        otaq: form.otaq.trim() || null,
        hefte_novu: form.hefteNovu,
      };

      const result = editing
        ? await supabase.from("course_schedule_templates").update(payload).eq("id", editing.id)
        : await supabase.from("course_schedule_templates").insert(payload);
      if (result.error) throw new Error(result.error.message);

      return { rebuildWarning: await rebuildGroupSessions() };
    },
    onSuccess: ({ rebuildWarning }) => {
      const wasEditing = Boolean(editing);
      setDialogOpen(false);
      setEditing(null);
      toast.success(t(wasEditing ? "editor.toastUpdated" : "editor.toastAdded"));
      if (rebuildWarning) toast.warning(t("editor.warningSaved"));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-templates", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-lesson-sessions"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_schedule_templates").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { rebuildWarning: await rebuildGroupSessions() };
    },
    onSuccess: ({ rebuildWarning }) => {
      toast.success(t("editor.toastDeleted"));
      if (rebuildWarning) toast.warning(t("editor.warningDeleted"));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-templates", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-lesson-sessions"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = (day: number) => {
    setActiveDay(String(day));
    setEditing(null);
    setForm({ ...EMPTY_FORM, courseId: courses[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (slot: TemplateRow) => {
    setActiveDay(String(slot.gun_nomresi));
    setEditing(slot);
    setForm({
      courseId: slot.course_id,
      teacherId: slot.teacher_id,
      darsNovu: (slot.dars_novu as DarsNovu | null) ?? "",
      otaq: slot.otaq ?? "",
      baslangicSaat: formatScheduleTime(slot.baslangic_saat),
      bitmeSaat: formatScheduleTime(slot.bitme_saat),
      hefteNovu: slot.hefte_novu,
    });
    setDialogOpen(true);
  };

  const loading = courseLinksLoading || coursesLoading || templatesLoading;
  const teacherFallback = t("editor.teacherFallback");

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarRange className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("editor.title")}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("editor.description")}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-44 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
          <p className="text-sm font-semibold">{t("editor.noCourses")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("editor.noCoursesHint")}</p>
        </div>
      ) : (
        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-muted p-1 sm:grid-cols-7">
            {HEFTE_GUNLERI.map((day) => (
              <TabsTrigger key={day.value} value={String(day.value)} className="min-h-11 rounded-xl px-2 py-2 text-xs font-bold">
                <span className="sm:hidden">{weekdayLabel(day.value, intlLocale, "short")}</span>
                <span className="hidden sm:inline">{weekdayLabel(day.value, intlLocale, "short")}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {HEFTE_GUNLERI.map((day) => {
            const daySlots = templates
              .filter((slot) => slot.gun_nomresi === day.value)
              .sort((a, b) => a.baslangic_saat.localeCompare(b.baslangic_saat));
            return (
              <TabsContent key={day.value} value={String(day.value)} className="mt-4 focus-visible:outline-none">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">{weekdayLabel(day.value, intlLocale, "long")}</h4>
                    <p className="text-xs text-muted-foreground">{t("editor.slotCount", { count: daySlots.length })}</p>
                  </div>
                  <Button size="sm" className="min-h-11 gap-2 rounded-xl" onClick={() => openCreate(day.value)}>
                    <Plus className="size-4" /> {t("editor.addSlot")}
                  </Button>
                </div>

                {daySlots.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => openCreate(day.value)}
                    className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/15 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.025]"
                  >
                    <Plus className="mb-2 size-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("editor.emptyDay")}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{t("editor.emptyDayHint")}</span>
                  </button>
                ) : (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {daySlots.map((slot) => {
                      const course = courses.find((item) => item.id === slot.course_id);
                      const profile = profiles.find((item) => item.user_id === slot.teacher_id);
                      const courseName = course?.ad ?? t("editor.unknownCourse");
                      return (
                        <div
                          key={slot.id}
                          className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3.5 transition-colors hover:border-primary/20"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock3 className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold">{courseName}</p>
                              <span
                                className={cn(
                                  "rounded-lg px-2 py-0.5 text-[10px] font-bold",
                                  slot.hefte_novu === "her_hefte"
                                    ? "bg-primary/10 text-primary"
                                    : slot.hefte_novu === "ust"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                      : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                                )}
                              >
                                {scheduleWeekLabel(slot.hefte_novu, t)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatScheduleTime(slot.baslangic_saat)}–{formatScheduleTime(slot.bitme_saat)} · {profileName(profile, teacherFallback)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {slot.dars_novu ? lessonTypeLabel(slot.dars_novu as DarsNovu, t) : t("editor.noLessonType")}
                              {slot.otaq ? ` · ${t("editor.room", { room: slot.otaq })}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                            <Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label={t("editor.editAria", { course: courseName })} onClick={() => openEdit(slot)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-11 rounded-xl text-destructive hover:text-destructive"
                              aria-label={t("editor.deleteAria", { course: courseName })}
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(slot.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saveMutation.isPending && setDialogOpen(open)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t(editing ? "editor.dialogEdit" : "editor.dialogNew")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.course")}</label>
              <Select value={form.courseId || undefined} onValueChange={(value) => setForm((current) => ({ ...current, courseId: value, teacherId: "", darsNovu: "" }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder={t("editor.coursePlaceholder")} /></SelectTrigger>
                <SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.ad}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.teacher")}</label>
              <Select value={form.teacherId || undefined} onValueChange={(value) => setForm((current) => ({ ...current, teacherId: value, darsNovu: "" }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder={t("editor.teacherPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {courseTeachers.map((teacher) => (
                    <SelectItem key={teacher.muellim_id} value={teacher.muellim_id}>
                      {profileName(profiles.find((profile) => profile.user_id === teacher.muellim_id), teacherFallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.lessonType")}</label>
              <Select value={form.darsNovu || undefined} onValueChange={(value) => setForm((current) => ({ ...current, darsNovu: value as DarsNovu }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder={t("editor.lessonTypePlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {availableLessonTypes.map((type) => <SelectItem key={type} value={type}>{lessonTypeLabel(type, t)}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.teacherId && availableLessonTypes.length === 0 ? <p className="text-xs text-destructive">{t("editor.noPermission")}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.start")}</label>
              <Input type="time" value={form.baslangicSaat} onChange={(event) => setForm((current) => ({ ...current, baslangicSaat: event.target.value }))} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.end")}</label>
              <Input type="time" value={form.bitmeSaat} onChange={(event) => setForm((current) => ({ ...current, bitmeSaat: event.target.value }))} className="min-h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.roomLabel")}</label>
              <Input value={form.otaq} onChange={(event) => setForm((current) => ({ ...current, otaq: event.target.value }))} placeholder={t("editor.roomPlaceholder")} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t("editor.weekType")}</label>
              <Select value={form.hefteNovu} onValueChange={(value) => setForm((current) => ({ ...current, hefteNovu: value as ScheduleWeekType }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="her_hefte">{t("week.every")}</SelectItem>
                  <SelectItem value="ust">{t("week.upper")}</SelectItem>
                  <SelectItem value="alt">{t("week.lower")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>{t("editor.cancel")}</Button>
            <Button className="min-h-11 rounded-xl" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.darsNovu}>
              {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("editor.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
