import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  examScheduleKeys,
  examScheduleTodayIso,
  fetchTutorUpcomingExamSchedules,
} from "@/lib/exam-schedule-data";
import { useTutorHomeI18n } from "@/lib/tutor-home-i18n";
import "@/role-dashboard.css";

type GroupLite = Pick<Database["public"]["Tables"]["groups"]["Row"], "id" | "ad">;
type MemberRow = Pick<Database["public"]["Tables"]["group_members"]["Row"], "group_id" | "user_id">;
type CourseLink = Pick<Database["public"]["Tables"]["course_groups"]["Row"], "group_id" | "course_id">;
type CourseLite = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "ad" | "kod">;
type ProfileLite = Pick<Database["public"]["Tables"]["profiles"]["Row"], "ad" | "soyad">;
type PeriodSettings = Pick<
  Database["public"]["Tables"]["system_settings"]["Row"],
  "cari_tedris_ili" | "cari_semestr"
>;

function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (["payız", "payiz", "fall", "autumn", "1", "i"].includes(normalized)) return 1;
  if (["yaz", "spring", "2", "ii"].includes(normalized)) return 2;
  return null;
}

function plainDateDaysFromToday(date: string, today: string) {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

function shortTime(value: string) {
  return value.slice(0, 5);
}

export function TutorDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { locale, t, formatHeroDate, formatExamDate } = useTutorHomeI18n();
  const todayIso = examScheduleTodayIso();

  useEffect(() => {
    document.title = `${t("meta.title")} — ATU Portal`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("hero.description");
  }, [locale, t]);

  const profileQuery = useQuery<ProfileLite | null>({
    queryKey: ["tutor-home-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("ad, soyad")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileLite | null;
    },
  });

  const periodQuery = useQuery<PeriodSettings | null>({
    queryKey: ["tutor-home-period"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("cari_tedris_ili, cari_semestr")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as PeriodSettings | null;
    },
  });
  const semester = semesterNumber(periodQuery.data?.cari_semestr);

  const groupsQuery = useQuery<GroupLite[]>({
    queryKey: ["tutor-home-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, ad")
        .eq("tyutor_id", userId)
        .eq("arxivlenib", false)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as GroupLite[];
    },
  });

  const groups = groupsQuery.data ?? [];
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  const membersQuery = useQuery<MemberRow[]>({
    queryKey: ["tutor-home-members", userId, groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const courseLinksQuery = useQuery<CourseLink[]>({
    queryKey: [
      "tutor-home-course-links",
      userId,
      groupIds.join(","),
      periodQuery.data?.cari_tedris_ili ?? "",
      semester ?? "",
    ],
    enabled:
      groupIds.length > 0 &&
      Boolean(periodQuery.data?.cari_tedris_ili) &&
      semester != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("group_id, course_id")
        .in("group_id", groupIds)
        .eq("tedris_ili", periodQuery.data!.cari_tedris_ili!)
        .eq("semestr", semester!);
      if (error) throw error;
      return (data ?? []) as CourseLink[];
    },
  });

  const members = membersQuery.data ?? [];
  const courseLinks = courseLinksQuery.data ?? [];
  const examPairs = useMemo(
    () => courseLinks.map((link) => ({ group_id: link.group_id, course_id: link.course_id })),
    [courseLinks],
  );
  const allStudentIds = useMemo(() => [...new Set(members.map((row) => row.user_id))], [members]);
  const allCourseIds = useMemo(() => [...new Set(courseLinks.map((row) => row.course_id))], [courseLinks]);

  const coursesQuery = useQuery<CourseLite[]>({
    queryKey: ["tutor-home-courses", userId, allCourseIds.join(",")],
    enabled: allCourseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, ad, kod")
        .in("id", allCourseIds)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as CourseLite[];
    },
  });

  const examsQuery = useQuery({
    queryKey: examScheduleKeys.tutorUpcoming(userId, examPairs),
    enabled: examPairs.length > 0,
    queryFn: () => fetchTutorUpcomingExamSchedules(examPairs, 500),
  });

  const courses = coursesQuery.data ?? [];
  const exams = examsQuery.data ?? [];
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const groupCards = useMemo(
    () =>
      groups.map((group) => {
        const studentCount = new Set(
          members.filter((member) => member.group_id === group.id).map((member) => member.user_id),
        ).size;
        const courseCount = new Set(
          courseLinks.filter((link) => link.group_id === group.id).map((link) => link.course_id),
        ).size;
        const nextExam = exams.find((exam) => exam.group_id === group.id) ?? null;
        return { ...group, studentCount, courseCount, nextExam };
      }),
    [groups, members, courseLinks, exams],
  );

  const loading =
    profileQuery.isLoading ||
    periodQuery.isLoading ||
    groupsQuery.isLoading ||
    membersQuery.isLoading ||
    courseLinksQuery.isLoading ||
    coursesQuery.isLoading ||
    examsQuery.isLoading;
  const hasError =
    profileQuery.isError ||
    periodQuery.isError ||
    groupsQuery.isError ||
    membersQuery.isError ||
    courseLinksQuery.isError ||
    coursesQuery.isError ||
    examsQuery.isError;

  const retryAll = () => {
    void profileQuery.refetch();
    void periodQuery.refetch();
    void groupsQuery.refetch();
    if (groupIds.length > 0) void membersQuery.refetch();
    if (groupIds.length > 0 && semester != null && periodQuery.data?.cari_tedris_ili) void courseLinksQuery.refetch();
    if (allCourseIds.length > 0) void coursesQuery.refetch();
    if (examPairs.length > 0) void examsQuery.refetch();
  };

  if (loading) return <TutorHomeSkeleton />;

  if (hasError) {
    return (
      <div className="role-panel-enter flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-border/70 bg-card px-6 py-12 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <RefreshCw className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">{t("error.title")}</h1>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{t("error.description")}</p>
        <Button className="mt-5 min-h-11 rounded-xl" onClick={retryAll}>
          <RefreshCw className="size-4" />
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const displayName = profileQuery.data?.ad?.trim() || t("common.user");
  const periodLabel = periodQuery.data?.cari_tedris_ili
    ? t("hero.period", {
        year: periodQuery.data.cari_tedris_ili,
        semester: periodQuery.data.cari_semestr ?? "—",
      })
    : t("hero.periodUnknown");
  const nearestExams = exams.slice(0, 5);

  return (
    <div className="role-panel-enter space-y-4 pb-7 sm:space-y-5">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-border bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-7 lg:px-8">
        <div aria-hidden className="tutor-home-network pointer-events-none absolute inset-0 -z-20" />
        <div aria-hidden className="tutor-home-orb tutor-home-orb-a pointer-events-none absolute -z-10" />
        <div aria-hidden className="tutor-home-orb tutor-home-orb-b pointer-events-none absolute -z-10" />
        <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />

        <div className="grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)] xl:gap-8">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:text-[11px]">
                <GraduationCap className="size-3.5" />
                {t("hero.badge")}
              </span>
              <span className="rounded-full border border-border/80 bg-background/75 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm sm:text-[11px]">
                {t("hero.role")} · {periodLabel}
              </span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              {formatHeroDate(new Date())}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-primary sm:text-3xl lg:text-[2rem]">
              {t("hero.greeting", { name: displayName })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {t("hero.description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <HeroMetric icon={UsersRound} value={groups.length} label={t("metric.groups")} />
            <HeroMetric icon={UsersRound} value={allStudentIds.length} label={t("metric.students")} />
            <HeroMetric icon={BookOpenCheck} value={allCourseIds.length} label={t("metric.courses")} />
            <HeroMetric icon={CalendarClock} value={exams.length} label={t("metric.exams")} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{t("groups.title")}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">{t("groups.description")}</p>
          </div>
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground sm:inline-flex">
            {groups.length}
          </span>
        </div>

        {groupCards.length === 0 ? (
          <EmptyPanel icon={UsersRound} title={t("groups.emptyTitle")} description={t("groups.emptyDescription")} />
        ) : (
          <div className="role-panel-stagger grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {groupCards.map((group) => {
              const examDays = group.nextExam ? plainDateDaysFromToday(group.nextExam.imtahan_tarixi, todayIso) : null;
              const isSoon = examDays != null && examDays >= 0 && examDays <= 7;
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-label={t("groups.open", { group: group.ad })}
                  onClick={() => void navigate({ to: "/qruplar/$groupId", params: { groupId: group.id } })}
                  className="tutor-home-card group relative min-h-[190px] overflow-hidden rounded-2xl border border-border/80 bg-background p-4 text-left sm:p-5"
                >
                  <div aria-hidden className="absolute -right-10 -top-10 size-28 rounded-full border border-primary/10" />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"><span className={`size-1.5 rounded-full ${isSoon ? "bg-[var(--portal-gold)]" : "bg-primary/55"}`} />{isSoon ? t("groups.examSoon") : t("groups.periodActive")}</span>
                  </div>
                  <h3 className="relative mt-4 truncate font-display text-xl font-bold tracking-tight text-foreground">{group.ad}</h3>
                  <div className="relative mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="rounded-full font-semibold">{t("groups.studentCount", { count: group.studentCount })}</Badge><Badge variant="outline" className="rounded-full font-semibold">{t("groups.courseCount", { count: group.courseCount })}</Badge></div>
                  <div className="relative mt-4 flex items-center gap-2 border-t border-border/70 pt-3 text-xs font-semibold text-muted-foreground"><CalendarDays className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{group.nextExam ? t("groups.nextExam", { date: formatExamDate(group.nextExam.imtahan_tarixi) }) : t("groups.noExam")}</span><ArrowRight className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" /></div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.75fr)]">
        <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="mb-4 flex items-start justify-between gap-3 sm:items-end"><div><h2 className="text-lg font-bold tracking-tight text-foreground">{t("exams.title")}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{t("exams.description")}</p></div><button type="button" onClick={() => void navigate({ to: "/imtahanlar" })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/[0.05] sm:px-3">{t("exams.viewAll")}<ChevronRight className="size-4" /></button></div>
          {nearestExams.length === 0 ? (
            <EmptyPanel icon={CalendarClock} title={t("exams.emptyTitle")} description={t("exams.emptyDescription")} compact />
          ) : (
            <div className="space-y-2">
              {nearestExams.map((exam) => {
                const course = courseMap.get(exam.course_id);
                const group = groupMap.get(exam.group_id);
                const days = plainDateDaysFromToday(exam.imtahan_tarixi, todayIso);
                const dayLabel = days === 0 ? t("exams.today") : days === 1 ? t("exams.tomorrow") : t("exams.inDays", { count: days });
                return (
                  <button key={exam.id} type="button" onClick={() => void navigate({ to: "/imtahanlar" })} className="tutor-home-list-row flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3 text-left sm:px-4">
                    <span className="flex min-w-[68px] shrink-0 flex-col items-center justify-center rounded-xl bg-primary/[0.07] px-2 py-2 text-center"><strong className="text-xs font-black text-primary">{formatExamDate(exam.imtahan_tarixi)}</strong><span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{dayLabel}</span></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{course?.ad ?? t("common.courseUnknown")}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{group?.ad ?? t("common.groupUnknown")}{course?.kod ? ` · ${course.kod}` : ""}</span></span>
                    <span className="hidden shrink-0 text-right sm:block"><span className="block font-data text-sm font-bold text-foreground">{shortTime(exam.baslangic_saat)}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{exam.otaq ? t("exams.room", { room: exam.otaq }) : t("exams.roomUnknown")}</span></span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4"><h2 className="text-base font-bold text-foreground">{t("quick.title")}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("quick.description")}</p></div>
          <div className="space-y-2"><QuickLink icon={UsersRound} title={t("quick.groups")} description={t("quick.groupsHint")} onClick={() => void navigate({ to: "/qruplar" })} /><QuickLink icon={ClipboardList} title={t("quick.journal")} description={t("quick.journalHint")} onClick={() => void navigate({ to: "/elektron-jurnal" })} /><QuickLink icon={CalendarClock} title={t("quick.exams")} description={t("quick.examsHint")} onClick={() => void navigate({ to: "/imtahanlar" })} /></div>
        </section>
      </div>
    </div>
  );
}

function HeroMetric({ icon: Icon, value, label }: { icon: typeof UsersRound; value: number; label: string }) {
  return <div className="min-w-0 rounded-2xl border border-border/70 bg-background/80 px-3 py-3.5 backdrop-blur-sm sm:px-3.5"><div className="flex items-center justify-between gap-2"><Icon className="size-4 shrink-0 text-primary" /><span className="font-data text-xl font-black tabular-nums text-foreground sm:text-2xl">{value}</span></div><p className="mt-2 line-clamp-2 text-[10px] font-bold uppercase leading-4 tracking-[0.06em] text-muted-foreground">{label}</p></div>;
}

function QuickLink({ icon: Icon, title, description, onClick }: { icon: typeof UsersRound; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="tutor-home-list-row group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-left"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{description}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" /></button>;
}

function EmptyPanel({ icon: Icon, title, description, compact = false }: { icon: typeof UsersRound; title: string; description: string; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/15 px-5 text-center ${compact ? "py-9" : "py-12"}`}><span className="flex size-11 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm ring-1 ring-border/70"><Icon className="size-5" /></span><h3 className="mt-3 text-sm font-bold text-foreground sm:text-base">{title}</h3><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p></div>;
}

function TutorHomeSkeleton() {
  return <div className="space-y-4 pb-7 sm:space-y-5" aria-hidden><Skeleton className="h-[330px] rounded-[28px] sm:h-[250px]" /><div className="rounded-[28px] border border-border bg-card p-4 sm:p-5 lg:p-6"><Skeleton className="h-6 w-40 rounded-lg" /><Skeleton className="mt-2 h-4 w-full max-w-md rounded-lg" /><div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3"><Skeleton className="h-[190px] rounded-2xl" /><Skeleton className="h-[190px] rounded-2xl" /><Skeleton className="hidden h-[190px] rounded-2xl 2xl:block" /></div></div><div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.75fr)]"><Skeleton className="h-[300px] rounded-[28px]" /><Skeleton className="h-[250px] rounded-[28px]" /></div></div>;
}
