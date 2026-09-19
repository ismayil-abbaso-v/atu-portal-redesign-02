import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpenCheck, Clock3, Hash, Loader2, MapPin, Pencil, Plus, ScrollText, Trash2, UploadCloud, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseBasicsDialog } from "@/components/admin/course/CourseBasicsDialog";
import { CourseRoomsDialog } from "@/components/admin/course/CourseRoomsDialog";
import { CourseStudentStatusSection } from "@/components/admin/course/CourseStudentStatusSection";
import { LessonTypesPanel } from "@/components/admin/course/LessonTypesPanel";
import { QiymetlendirmeNovuPanel } from "@/components/admin/course/QiymetlendirmeNovuPanel";
import { SyllabusUploadDialog } from "@/components/admin/course/SyllabusUploadDialog";
import { TeacherEditDialog } from "@/components/admin/course/TeacherEditDialog";
import { TopicFileCell } from "@/components/admin/course/TopicFileCell";
import { TopicFormDialog } from "@/components/admin/course/TopicFormDialog";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { AKTIV_DARS_NOVU_ACARLARI, DARS_NOVLERI, courseRoomMap, muellimAdıFormatla, type CourseTopic, type DarsNovu } from "@/lib/courses";
import { canAccessCourse } from "@/lib/route-permissions";
import { cn } from "@/lib/utils";

type TabValue = "all" | DarsNovu;
type TeacherRow = {
  id: string;
  muellim_id: string;
  profil: Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "ad" | "soyad" | "istifadeci_adi" | "avatar_url"> | null;
};

export const Route = createFileRoute("/_authenticated/fennler_/$courseId")({
  beforeLoad: ({ params }) => canAccessCourse(params.courseId),
  head: () => ({ meta: [{ title: "ATU Portal" }] }),
  component: CourseManagementPage,
});

function CourseManagementPage() {
  const { courseId } = Route.useParams();
  const { roles = [] } = useUserRoles();
  const isAdmin = roles.includes("admin");
  const isTutor = roles.includes("tyutor") && !roles.includes("admin") && !roles.includes("dekan");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, intlLocale, lessonTypeLabel } = useCourseManagementI18n();

  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [syllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [basicsDialogOpen, setBasicsDialogOpen] = useState(false);
  const [roomsDialogOpen, setRoomsDialogOpen] = useState(false);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [topicForm, setTopicForm] = useState<{ open: boolean; topic: CourseTopic | null }>({ open: false, topic: null });
  const [topicDelete, setTopicDelete] = useState<CourseTopic | null>(null);

  const courseQuery = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (error) throw error;
      return data;
    },
  });
  const course = courseQuery.data;

  useEffect(() => {
    document.title = course?.ad ? `${course.kod ? `${course.kod} · ` : ""}${course.ad} — ${t("meta.title")} — ATU Portal` : `${t("meta.title")} — ATU Portal`;
  }, [course?.ad, course?.kod, t]);

  const teachersQuery = useQuery({
    queryKey: ["course-teachers", courseId],
    queryFn: async (): Promise<TeacherRow[]> => {
      const { data: rows, error } = await supabase.from("course_teachers").select("id, muellim_id").eq("course_id", courseId).order("created_at");
      if (error) throw error;
      if (!rows?.length) return [];
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("user_id, ad, soyad, istifadeci_adi, avatar_url").in("user_id", rows.map((row) => row.muellim_id));
      if (profileError) throw profileError;
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      return rows.map((row) => ({ ...row, profil: profileMap.get(row.muellim_id) ?? null }));
    },
  });

  const activeLessonTypes = (course?.aktiv_dars_novleri as Record<string, boolean>) ?? {};
  const visibleTabs = DARS_NOVLERI.filter((type) => activeLessonTypes[type]);

  const topicsQuery = useQuery({
    queryKey: ["course-topics", courseId, activeTab],
    queryFn: async () => {
      let query = supabase.from("course_topics").select("*").eq("course_id", courseId).order("sira", { ascending: true }).order("tarix", { ascending: true });
      if (activeTab !== "all") query = query.eq("dars_novu", activeTab);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CourseTopic[];
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topic: CourseTopic) => {
      const { error } = await supabase.from("course_topics").delete().eq("id", topic.id).eq("course_id", courseId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("page.topicDeleted"));
      setTopicDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["course-topics", courseId] });
    },
    onError: (error: Error) => toast.error(error.message || t("page.topicDeleteError")),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin) throw new Error(t("page.adminDeleteOnly"));
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(t("page.courseDeleted"));
      void navigate({ to: "/qruplar" });
    },
    onError: (error: Error) => toast.error(error.message || t("page.courseDeleteError")),
  });

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "short", year: "numeric" }), [intlLocale]);
  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  };
  const formatTime = (value: string | null) => value ? value.slice(0, 5) : null;

  if (courseQuery.isLoading) {
    return <div className="space-y-4"><PageHeader baslıq={t("meta.title")} geri /><div className="grid gap-3 md:grid-cols-3"><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-36 rounded-3xl" /></div><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[460px] rounded-3xl" /><Skeleton className="h-[460px] rounded-3xl" /></div></div>;
  }

  if (courseQuery.isError || !course) {
    return <><PageHeader baslıq={t("meta.title")} geri /><div className="flex min-h-72 items-center justify-center rounded-3xl border border-border/70 bg-card p-6 shadow-sm"><EmptyState icon={ScrollText} mesaj={t("page.notFound")} /></div></>;
  }

  const title = course.kod ? `${course.kod} · ${course.ad}` : course.ad;
  const roomMap = courseRoomMap(course.otaqlar);
  const roomSummary = AKTIV_DARS_NOVU_ACARLARI.flatMap((type) => roomMap[type] ? [`${lessonTypeLabel(type)}: ${roomMap[type]}`] : []).join(" · ") || course.otaq?.trim() || "—";
  const courseMeta = [
    course.kod || null,
    course.kurs ? `${course.kurs}` : null,
    course.kredit != null ? `${t("page.credit")}: ${course.kredit}` : null,
    course.saat != null ? `${t("page.hours")}: ${course.saat}` : null,
  ].filter(Boolean).join(" · ") || "—";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader baslıq={title} geri>
        <Button className="min-h-11 gap-2 rounded-xl" onClick={() => setTopicForm({ open: true, topic: null })}><Plus className="size-4" />{t("page.addTopic")}</Button>
        <Button variant="outline" className="min-h-11 gap-2 rounded-xl" onClick={() => setSyllabusDialogOpen(true)}><UploadCloud className="size-4" />{t("page.syllabus")}</Button>
        {isTutor ? <Button variant="outline" className="min-h-11 gap-2 rounded-xl" onClick={() => void navigate({ to: "/elektron-jurnal" })}><BookOpenCheck className="size-4" />{t("page.monitorJournal")}</Button> : null}
        {isAdmin ? <Button variant="outline" className="min-h-11 gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteCourseOpen(true)}><Trash2 className="size-4" />{t("page.deleteCourse")}</Button> : null}
      </PageHeader>

      {isTutor ? <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] px-4 py-3 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">{t("page.tutorTitle")}:</span> {t("page.tutorDescription")}</div> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryShell icon={UsersRound} label={t("page.teachers")} onEdit={() => setTeacherDialogOpen(true)} editLabel={t("page.editTeachers")}>
          {teachersQuery.isLoading ? <Skeleton className="mt-2 h-10 w-full" /> : teachersQuery.data?.length ? (
            <div className="mt-2 space-y-2">
              {teachersQuery.data.slice(0, 3).map((teacher) => {
                const name = muellimAdıFormatla(teacher.profil);
                const primary = course.muellim_id === teacher.muellim_id;
                return <div key={teacher.id} className="flex min-w-0 items-center gap-2.5"><Avatar className="size-8 shrink-0 border border-border/70">{teacher.profil?.avatar_url ? <SignedAvatarImage src={teacher.profil.avatar_url} alt={name} /> : null}<AvatarFallback className="text-[10px] font-semibold">{(teacher.profil?.soyad?.[0] ?? teacher.profil?.ad?.[0] ?? "?").toLocaleUpperCase("az-AZ")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-sm font-semibold text-foreground">{name}</p>{primary ? <Badge variant="secondary" className="shrink-0 rounded-full px-1.5 py-0 text-[11px]">★</Badge> : null}</div></div></div>;
              })}
              {teachersQuery.data.length > 3 ? <p className="text-xs font-semibold text-muted-foreground">+{teachersQuery.data.length - 3}</p> : null}
            </div>
          ) : <p className="mt-2 text-sm text-muted-foreground">{t("page.noTeacher")}</p>}
        </SummaryShell>

        <SummaryShell icon={Hash} label={t("page.courseInfo")} onEdit={() => setBasicsDialogOpen(true)} editLabel={t("page.manage")}>
          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-foreground">{courseMeta}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("page.courseInfoHint")}</p>
        </SummaryShell>

        <SummaryShell icon={MapPin} label={t("page.room")} onEdit={() => setRoomsDialogOpen(true)} editLabel={t("page.manage")}>
          <p className="mt-2 line-clamp-4 text-sm font-semibold leading-6 text-foreground">{roomSummary}</p>
        </SummaryShell>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="flex items-center gap-2"><ScrollText className="size-4 text-primary" /><h2 className="text-base font-semibold tracking-tight">{t("page.topics")}</h2><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{topicsQuery.data?.length ?? 0}</span></div><p className="mt-1 text-xs text-muted-foreground">{t("page.topicsHint")}</p></div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1"><FilterButton label={t("page.all")} active={activeTab === "all"} onClick={() => setActiveTab("all")} />{visibleTabs.map((type) => <FilterButton key={type} label={lessonTypeLabel(type)} active={activeTab === type} onClick={() => setActiveTab(type)} />)}</div>
          </div>

          {topicsQuery.isLoading ? <div className="space-y-2 py-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}</div> : !topicsQuery.data?.length ? <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-10"><EmptyState icon={ScrollText} mesaj={t("page.noTopics")} /></div> : (
            <>
              <div className="space-y-2 md:hidden">
                {topicsQuery.data.map((topic, index) => <TopicMobileCard key={topic.id} topic={topic} index={index} formatDate={formatDate} formatTime={formatTime} lessonLabel={lessonTypeLabel(topic.dars_novu as DarsNovu)} editLabel={t("page.edit")} deleteLabel={t("page.delete")} onEdit={() => setTopicForm({ open: true, topic })} onDelete={() => setTopicDelete(topic)} />)}
              </div>
              <div className="hidden overflow-x-auto rounded-2xl border border-border/70 md:block">
                <Table><TableHeader><TableRow className="bg-muted/35 hover:bg-muted/35"><TableHead className="w-14">{t("page.tableNo")}</TableHead><TableHead className="w-40">{t("page.tableDate")}</TableHead><TableHead>{t("page.tableTopic")}</TableHead><TableHead className="w-20 text-center">{t("page.tableFile")}</TableHead><TableHead className="w-28 text-right">{t("page.tableActions")}</TableHead></TableRow></TableHeader><TableBody>
                  {topicsQuery.data.map((topic, index) => <TableRow key={topic.id}><TableCell className="font-medium text-muted-foreground">{topic.sira > 0 ? topic.sira : index + 1}</TableCell><TableCell className="whitespace-nowrap text-sm"><div>{formatDate(topic.tarix)}</div>{formatTime(topic.bas_saat) ? <div className="mt-0.5 text-xs text-muted-foreground">{formatTime(topic.bas_saat)}{formatTime(topic.bit_saat) ? `–${formatTime(topic.bit_saat)}` : ""}</div> : null}</TableCell><TableCell className="min-w-[260px]"><p className="font-medium text-foreground">{topic.movzu}</p><p className="mt-1 text-xs text-muted-foreground">{lessonTypeLabel(topic.dars_novu as DarsNovu)}{topic.aciqlama ? ` · ${topic.aciqlama}` : ""}</p></TableCell><TableCell className="text-center"><TopicFileCell topic={topic} /></TableCell><TableCell><div className="flex justify-end gap-1"><IconAction label={t("page.edit")} onClick={() => setTopicForm({ open: true, topic })}><Pencil className="size-3.5" /></IconAction><IconAction label={t("page.delete")} destructive onClick={() => setTopicDelete(topic)}><Trash2 className="size-3.5" /></IconAction></div></TableCell></TableRow>)}
                </TableBody></Table>
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <LessonTypesPanel courseId={courseId} aktivDarsNovleri={activeLessonTypes} />
          <QiymetlendirmeNovuPanel courseId={courseId} qiymetlendirmeNovu={course.qiymetlendirme_novu} kursIsiVar={course.kurs_isi_var} umumiLabSayi={course.umumi_lab_sayi} umumiDersSaati={course.umumi_ders_saati} />
          <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-4" /></span><div><h3 className="text-sm font-semibold">{t("page.courseInfo")}</h3><p className="text-xs text-muted-foreground">{t("page.courseInfoHint")}</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><MetaCell label={t("page.code")} value={course.kod || "—"} /><MetaCell label={t("page.year")} value={course.kurs ? String(course.kurs) : "—"} /><MetaCell label={t("page.credit")} value={course.kredit != null ? String(course.kredit) : "—"} /><MetaCell label={t("page.hours")} value={course.saat != null ? String(course.saat) : "—"} /></div>
          </section>
        </aside>
      </div>

      {!isTutor ? <div className="grid gap-4 lg:grid-cols-2"><CourseStudentStatusSection courseId={courseId} status="elave" başlıq="Alt Qrup" reng="mavi" /><CourseStudentStatusSection courseId={courseId} status="kesilib" başlıq="Kəsilən" reng="qırmızı" /></div> : null}

      <TeacherEditDialog açıq={teacherDialogOpen} onOpenChange={setTeacherDialogOpen} courseId={courseId} />
      <SyllabusUploadDialog açıq={syllabusDialogOpen} onOpenChange={setSyllabusDialogOpen} courseId={courseId} />
      <CourseBasicsDialog açıq={basicsDialogOpen} onOpenChange={setBasicsDialogOpen} course={course} />
      <CourseRoomsDialog açıq={roomsDialogOpen} onOpenChange={setRoomsDialogOpen} courseId={courseId} otaqlar={course.otaqlar} legacyOtaq={course.otaq} aktivDarsNovleri={activeLessonTypes} />
      <TopicFormDialog açıq={topicForm.open} onOpenChange={(open) => setTopicForm((current) => ({ ...current, open }))} courseId={courseId} movzu={topicForm.topic} aktivDarsNovleri={activeLessonTypes} />

      <AlertDialog open={!!topicDelete} onOpenChange={(open) => !open && setTopicDelete(null)}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>{t("page.topicDeleteTitle")}</AlertDialogTitle><AlertDialogDescription>{topicDelete ? t("page.topicDeleteDescription", { topic: topicDelete.movzu }) : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11 rounded-xl">{t("common.cancel")}</AlertDialogCancel><AlertDialogAction className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteTopicMutation.isPending} onClick={(event) => { event.preventDefault(); if (topicDelete) deleteTopicMutation.mutate(topicDelete); }}>{deleteTopicMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{t("page.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={deleteCourseOpen} onOpenChange={setDeleteCourseOpen}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>{t("page.courseDeleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("page.courseDeleteDescription", { course: course.ad })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11 rounded-xl">{t("common.cancel")}</AlertDialogCancel><AlertDialogAction className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteCourseMutation.isPending} onClick={(event) => { event.preventDefault(); deleteCourseMutation.mutate(); }}>{deleteCourseMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{t("page.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function SummaryShell({ icon: Icon, label, editLabel, onEdit, children }: { icon: typeof Hash; label: string; editLabel: string; onEdit: () => void; children: React.ReactNode }) {
  return <div className="relative min-w-0 overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-1 gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>{children}</div></div><button type="button" aria-label={editLabel} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={onEdit}><Pencil className="size-4" /></button></div></div>;
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/35 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate font-semibold">{value}</p></div>;
}

function TopicMobileCard({ topic, index, formatDate, formatTime, lessonLabel, editLabel, deleteLabel, onEdit, onDelete }: { topic: CourseTopic; index: number; formatDate: (value: string) => string; formatTime: (value: string | null) => string | null; lessonLabel: string; editLabel: string; deleteLabel: string; onEdit: () => void; onDelete: () => void }) {
  return <article className="rounded-2xl border border-border/70 bg-background p-3.5"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">{topic.sira > 0 ? topic.sira : index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5 text-foreground">{topic.movzu}</p><div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="secondary" className="rounded-full text-[10px]">{lessonLabel}</Badge><Badge variant="outline" className="rounded-full text-[10px]">{formatDate(topic.tarix)}</Badge>{formatTime(topic.bas_saat) ? <Badge variant="outline" className="rounded-full text-[10px]"><Clock3 className="mr-1 size-3" />{formatTime(topic.bas_saat)}{formatTime(topic.bit_saat) ? `–${formatTime(topic.bit_saat)}` : ""}</Badge> : null}</div>{topic.aciqlama ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{topic.aciqlama}</p> : null}</div></div><div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2"><TopicFileCell topic={topic} /><div className="flex gap-1"><IconAction label={editLabel} onClick={onEdit}><Pencil className="size-4" /></IconAction><IconAction label={deleteLabel} destructive onClick={onDelete}><Trash2 className="size-4" /></IconAction></div></div></article>;
}

function IconAction({ label, destructive = false, onClick, children }: { label: string; destructive?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} className={cn("flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors", destructive ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-muted hover:text-foreground")} onClick={onClick}>{children}</button>;
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition-all", active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>{label}</button>;
}
