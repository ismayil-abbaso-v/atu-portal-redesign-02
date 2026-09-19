import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpenCheck,
  BookPlus,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GroupCourseDialog } from "@/components/admin/group/GroupCourseDialog";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchTutorAssignedGroups,
  fetchTutorGroupCourses,
  fetchTutorGroupStudents,
  fetchTutorGroupUpcomingExams,
  fetchTutorMonitoringSummary,
  fetchTutorPeriod,
  type TutorCourseLite,
} from "@/lib/tutor-workspace-data";
import { useTutorPanelI18n } from "@/lib/tutor-panel-i18n";
import "@/role-dashboard.css";

export function TutorOperationsPanel({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { locale, intlLocale, t } = useTutorPanelI18n();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);

  const periodQuery = useQuery({
    queryKey: ["tutor-workspace-period", userId],
    queryFn: fetchTutorPeriod,
    staleTime: 60_000,
  });

  const groupsQuery = useQuery({
    queryKey: ["tutor-workspace-groups", userId],
    queryFn: () => fetchTutorAssignedGroups(userId),
  });

  useEffect(() => {
    const groups = groupsQuery.data ?? [];
    if (!groups.length) {
      setSelectedGroupId("");
      return;
    }
    if (!selectedGroupId || !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]!.id);
    }
  }, [groupsQuery.data, selectedGroupId]);

  const period = periodQuery.data;
  const coursesQuery = useQuery({
    queryKey: ["tutor-workspace-courses", userId, selectedGroupId, period?.year, period?.semester],
    queryFn: () => fetchTutorGroupCourses(selectedGroupId, period!),
    enabled: !!selectedGroupId && !!period,
  });
  const courseIds = useMemo(() => (coursesQuery.data ?? []).map((course) => course.id), [coursesQuery.data]);

  const examsQuery = useQuery({
    queryKey: ["tutor-workspace-exams", userId, selectedGroupId, courseIds],
    queryFn: () => fetchTutorGroupUpcomingExams(selectedGroupId, courseIds, 5),
    enabled: !!selectedGroupId && courseIds.length > 0,
  });

  const monitoringQuery = useQuery({
    queryKey: ["tutor-workspace-monitoring", userId, selectedGroupId, courseIds],
    queryFn: () => fetchTutorMonitoringSummary(selectedGroupId, courseIds),
    enabled: !!selectedGroupId && courseIds.length > 0,
  });

  const studentsQuery = useQuery({
    queryKey: ["tutor-workspace-students", userId, selectedGroupId],
    queryFn: () => fetchTutorGroupStudents(selectedGroupId),
    enabled: !!selectedGroupId,
  });

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

  const selectedGroup = groupsQuery.data?.find((group) => group.id === selectedGroupId) ?? null;
  const isBaseLoading = periodQuery.isLoading || groupsQuery.isLoading;
  const baseError = periodQuery.isError || groupsQuery.isError;
  const sectionError = coursesQuery.isError || examsQuery.isError || monitoringQuery.isError || studentsQuery.isError;
  const periodLabel = period?.year
    ? t("header.period", { year: period.year, semester: period.semesterLabel ?? "—" })
    : t("header.periodUnknown");

  const retry = () => {
    void Promise.all([
      periodQuery.refetch(),
      groupsQuery.refetch(),
      coursesQuery.refetch(),
      examsQuery.refetch(),
      monitoringQuery.refetch(),
      studentsQuery.refetch(),
    ]);
  };

  if (isBaseLoading) return <TutorPanelSkeleton />;

  if (baseError) {
    return (
      <div className="role-panel-enter flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-border/70 bg-card p-6 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><RefreshCw className="size-5" /></span>
        <h1 className="mt-4 text-lg font-bold text-foreground">{t("common.errorTitle")}</h1>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{t("common.errorDescription")}</p>
        <Button className="mt-5 min-h-11 rounded-xl" onClick={retry}><RefreshCw className="size-4" />{t("common.retry")}</Button>
      </div>
    );
  }

  const groups = groupsQuery.data ?? [];
  if (!groups.length) {
    return (
      <div className="role-panel-enter space-y-4 pb-6">
        <TutorPanelHeader periodLabel={periodLabel} groupCount={0} />
        <section className="rounded-[28px] border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <EmptyState icon={UsersRound} mesaj={`${t("group.noneTitle")} ${t("group.noneDescription")}`} />
        </section>
      </div>
    );
  }

  return (
    <div className="role-panel-enter space-y-4 pb-7 sm:space-y-5">
      <TutorPanelHeader periodLabel={periodLabel} groupCount={groups.length} />

      <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="tutor-workspace-group" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {t("group.label")}
            </label>
            <select
              id="tutor-workspace-group"
              aria-label={t("aria.selectGroup")}
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/20 lg:max-w-md"
            >
              {groups.map((group) => <option key={group.id} value={group.id}>{group.ad}</option>)}
            </select>
          </div>
          <Button
            variant="outline"
            className="min-h-11 shrink-0 rounded-xl"
            disabled={!selectedGroupId}
            onClick={() => selectedGroupId && void navigate({ to: "/qruplar/$groupId", params: { groupId: selectedGroupId } })}
          >
            <ExternalLink className="size-4" />{t("group.openDetail")}
          </Button>
        </div>
      </section>

      {sectionError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.035] px-4 py-3 text-sm text-destructive">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("common.errorDescription")}</span>
            <Button variant="outline" size="sm" className="min-h-10 rounded-xl" onClick={retry}><RefreshCw className="size-3.5" />{t("common.retry")}</Button>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1 sm:grid-cols-4">
          <TabsTrigger value="courses" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm"><BookOpenCheck className="mr-1.5 size-4" />{t("tabs.courses")}</TabsTrigger>
          <TabsTrigger value="exams" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm"><CalendarClock className="mr-1.5 size-4" />{t("tabs.exams")}</TabsTrigger>
          <TabsTrigger value="journal" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm"><ClipboardList className="mr-1.5 size-4" />{t("tabs.journal")}</TabsTrigger>
          <TabsTrigger value="students" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm"><UsersRound className="mr-1.5 size-4" />{t("tabs.students")}</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4 focus-visible:outline-none">
          <TutorCoursesSection
            courses={coursesQuery.data ?? []}
            loading={coursesQuery.isLoading}
            onAdd={() => setCourseDialogOpen(true)}
            onOpen={(courseId) => void navigate({ to: "/fennler/$courseId", params: { courseId } })}
          />
        </TabsContent>

        <TabsContent value="exams" className="mt-4 focus-visible:outline-none">
          <TutorExamSummary
            courses={coursesQuery.data ?? []}
            exams={examsQuery.data ?? []}
            loading={coursesQuery.isLoading || examsQuery.isLoading}
            intlLocale={intlLocale}
            onManage={() => void navigate({ to: "/imtahanlar" })}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-4 focus-visible:outline-none">
          <TutorJournalSummary
            summary={monitoringQuery.data ?? null}
            loading={coursesQuery.isLoading || monitoringQuery.isLoading}
            intlLocale={intlLocale}
            onOpen={() => void navigate({ to: "/elektron-jurnal" })}
          />
        </TabsContent>

        <TabsContent value="students" className="mt-4 focus-visible:outline-none">
          <TutorStudentsSection students={studentsQuery.data ?? []} loading={studentsQuery.isLoading} />
        </TabsContent>
      </Tabs>

      <GroupCourseDialog
        açıq={courseDialogOpen}
        onOpenChange={(open) => {
          setCourseDialogOpen(open);
          if (!open) void coursesQuery.refetch();
        }}
        groupId={selectedGroupId}
        mövcudFennIdler={courseIds}
        tutorMode
      />

      {selectedGroup ? <span className="sr-only">{selectedGroup.ad}</span> : null}
    </div>
  );
}

function TutorPanelHeader({ periodLabel, groupCount }: { periodLabel: string; groupCount: number }) {
  const { t } = useTutorPanelI18n();
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary"><GraduationCap className="size-5" /><span className="text-[11px] font-black uppercase tracking-[0.13em]">{periodLabel}</span></div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("header.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t("header.description")}</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1.5 text-xs font-bold">{t("header.groupCount", { count: groupCount })}</Badge>
      </div>
    </header>
  );
}

export function TutorCoursesSection({ courses, loading, onAdd, onOpen }: { courses: TutorCourseLite[]; loading: boolean; onAdd: () => void; onOpen: (courseId: string) => void }) {
  const { t } = useTutorPanelI18n();
  return (
    <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <SectionHeading title={t("courses.title")} description={t("courses.description")} action={<Button className="min-h-11 rounded-xl" onClick={onAdd}><BookPlus className="size-4" />{t("courses.add")}</Button>} />
      {loading ? <RowsSkeleton /> : !courses.length ? (
        <EmptyState icon={BookOpenCheck} mesaj={`${t("courses.emptyTitle")} ${t("courses.emptyDescription")}`} />
      ) : (
        <div className="role-panel-stagger grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <button key={course.id} type="button" aria-label={t("aria.openCourse", { course: course.ad })} onClick={() => onOpen(course.id)} className="role-panel-card group flex min-h-[88px] items-center gap-3 rounded-2xl border border-border/70 bg-background p-3 text-left active:scale-[0.99]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold text-foreground">{course.ad}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{course.kod || t("courses.codeUnknown")}{course.kredit != null ? ` · ${course.kredit}` : ""}</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function TutorExamSummary({ courses, exams, loading, intlLocale, onManage }: { courses: TutorCourseLite[]; exams: Array<{ id: string; course_id: string; imtahan_tarixi: string; baslangic_saat: string; otaq: string }>; loading: boolean; intlLocale: string; onManage: () => void }) {
  const { t } = useTutorPanelI18n();
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Baku" }), [intlLocale]);
  return (
    <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <SectionHeading title={t("exams.title")} description={t("exams.description")} action={<Button className="min-h-11 rounded-xl" onClick={onManage}><CalendarClock className="size-4" />{t("exams.manage")}</Button>} />
      {loading ? <RowsSkeleton /> : !exams.length ? (
        <div className="space-y-4"><EmptyState icon={CalendarClock} mesaj={`${t("exams.emptyTitle")} ${t("exams.emptyDescription")}`} /><Button variant="outline" className="min-h-11 w-full rounded-xl sm:w-auto" onClick={onManage}><BookPlus className="size-4" />{t("exams.new")}</Button></div>
      ) : (
        <div className="space-y-2">
          {exams.map((exam) => {
            const course = courseMap.get(exam.course_id);
            const date = new Date(`${exam.imtahan_tarixi}T12:00:00+04:00`);
            return (
              <button key={exam.id} type="button" onClick={onManage} className="role-panel-card flex min-h-[74px] w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3 text-left sm:px-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{course?.ad ?? t("common.course")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{dateFormatter.format(date)} · {exam.baslangic_saat.slice(0, 5)} · {t("exams.room", { room: exam.otaq })}</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TutorJournalSummary({ summary, loading, intlLocale, onOpen }: { summary: { sessionCount: number; confirmedCount: number; assessmentCount: number; latestConfirmedDate: string | null } | null; loading: boolean; intlLocale: string; onOpen: () => void }) {
  const { t } = useTutorPanelI18n();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Baku" }), [intlLocale]);
  return (
    <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <SectionHeading title={t("journal.title")} description={t("journal.description")} action={<Button variant="outline" className="min-h-11 rounded-xl" onClick={onOpen}><ExternalLink className="size-4" />{t("journal.open")}</Button>} />
      {loading ? <RowsSkeleton /> : !summary || summary.sessionCount === 0 ? (
        <EmptyState icon={ClipboardList} mesaj={`${t("journal.emptyTitle")} ${t("journal.emptyDescription")}`} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={t("journal.sessions")} value={summary.sessionCount} />
          <Metric label={t("journal.confirmed")} value={summary.confirmedCount} />
          <Metric label={t("journal.assessments")} value={summary.assessmentCount} />
          <div className="rounded-2xl border border-border/70 bg-background p-4"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("journal.latest")}</p><p className="mt-2 text-sm font-bold leading-5 text-foreground">{summary.latestConfirmedDate ? dateFormatter.format(new Date(`${summary.latestConfirmedDate}T12:00:00+04:00`)) : t("journal.noLatest")}</p></div>
        </div>
      )}
    </section>
  );
}

export function TutorStudentsSection({ students, loading }: { students: Array<{ user_id: string; ad: string | null; soyad: string | null; avatar_url: string | null; istifadeci_adi: string | null }>; loading: boolean }) {
  const { t } = useTutorPanelI18n();
  return (
    <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <SectionHeading title={t("students.title")} description={t("students.description")} action={<Badge variant="outline" className="rounded-full px-3 py-1.5">{t("students.count", { count: students.length })}</Badge>} />
      {loading ? <RowsSkeleton count={8} /> : !students.length ? (
        <EmptyState icon={UsersRound} mesaj={`${t("students.emptyTitle")} ${t("students.emptyDescription")}`} />
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => {
            const name = [student.soyad, student.ad].filter(Boolean).join(" ") || t("common.unknown");
            return (
              <div key={student.user_id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-transparent px-2.5 py-2 transition-colors hover:border-border/70 hover:bg-muted/35">
                <Avatar className="size-10 shrink-0 border border-border/70">{student.avatar_url ? <SignedAvatarImage src={student.avatar_url} alt={name} /> : null}<AvatarFallback className="text-xs font-bold">{(student.soyad?.[0] ?? student.ad?.[0] ?? "?").toLocaleUpperCase("az-AZ")}</AvatarFallback></Avatar>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{name}</span>{student.istifadeci_adi ? <span className="block truncate text-xs text-muted-foreground">@{student.istifadeci_adi}</span> : null}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p></div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-border/70 bg-background p-4"><p className="font-data text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>;
}

function RowsSkeleton({ count = 4 }: { count?: number }) {
  return <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>;
}

function TutorPanelSkeleton() {
  return <div className="space-y-4 pb-7"><Skeleton className="h-40 rounded-[28px]" /><Skeleton className="h-24 rounded-[28px]" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div><Skeleton className="h-[360px] rounded-[28px]" /></div>;
}
