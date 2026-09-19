import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Layers3,
  MapPin,
  PlayCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useRoleDashboardI18n } from "@/lib/role-dashboard-i18n";
import { useTeacherHomeI18n, type TeacherHomeKey, type TeacherHomeVars } from "@/lib/teacher-home-i18n";
import {
  bakuDayKey,
  fetchTeacherLessonSessions,
  fetchTeacherSessionRoomMaps,
  resolveTeacherSessionRoom,
  teacherSessionPairKey,
  teacherSessionStatus,
  type TeacherLessonSession,
} from "@/lib/teacher-sessions";
import { cn } from "@/lib/utils";
import "@/role-dashboard.css";

type TeacherLink = { course_id: string; icazeler: Record<string, boolean> | null };
type AcademicContext = { cari_tedris_ili: string | null; cari_semestr: string | null };
type ProfileLite = { ad: string | null; soyad: string | null };
type CourseLite = {
  id: string;
  ad: string;
  kod: string | null;
  kurs: number | null;
  kredit: number | null;
  otaq: string | null;
};
type CourseGroupLite = {
  course_id: string;
  group_id: string;
  tedris_ili: string;
  semestr: number;
  groups: { id: string; ad: string } | null;
};
type SessionRow = TeacherLessonSession;

function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (["payız", "payiz", "fall", "autumn", "güz"].includes(normalized) || normalized.startsWith("1")) return 1;
  if (["yaz", "spring", "bahar"].includes(normalized) || normalized.startsWith("2")) return 2;
  return null;
}

function lessonTypeKey(value: string | null): TeacherHomeKey {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (normalized === "muhazire" || normalized === "mühazirə") return "lessonLecture";
  if (normalized === "seminar") return "lessonSeminar";
  if (normalized === "laboratoriya") return "lessonLaboratory";
  if (["tecrube", "təcrübə", "meshgele", "məşğələ"].includes(normalized)) return "lessonPractice";
  if (normalized === "serbest_is" || normalized === "sərbəst iş") return "lessonIndependent";
  if (normalized === "kollokvium") return "lessonColloquium";
  return "lessonGeneric";
}

export function TeacherDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale, t, formatTime } = useRoleDashboardI18n();
  const { t: homeT, formatLongDate, formatShortDate, appName } = useTeacherHomeI18n();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = `${t("teacher.homeTitle")} — ${appName}`;
  }, [appName, locale, t]);

  const contextQuery = useQuery<{ profile: ProfileLite | null; academic: AcademicContext | null }>({
    queryKey: ["teacher-home", "context", userId],
    queryFn: async () => {
      const [profileResult, academicResult] = await Promise.all([
        supabase.from("profiles").select("ad, soyad").eq("user_id", userId).maybeSingle(),
        supabase.from("system_settings").select("cari_tedris_ili, cari_semestr").eq("singleton", true).maybeSingle(),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (academicResult.error) throw academicResult.error;
      return {
        profile: profileResult.data as ProfileLite | null,
        academic: academicResult.data as AcademicContext | null,
      };
    },
    staleTime: 60_000,
  });

  const linksQuery = useQuery<TeacherLink[]>({
    queryKey: ["teacher-home", "links", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_teachers")
        .select("course_id, icazeler")
        .eq("muellim_id", userId);
      if (error) throw error;
      return (data ?? []) as unknown as TeacherLink[];
    },
    staleTime: 60_000,
  });

  const teacherCourseIds = useMemo(
    () => [...new Set((linksQuery.data ?? []).map((row) => row.course_id))],
    [linksQuery.data],
  );
  const academicYear = contextQuery.data?.academic?.cari_tedris_ili?.trim() ?? "";
  const semester = semesterNumber(contextQuery.data?.academic?.cari_semestr);

  const courseGroupsQuery = useQuery<CourseGroupLite[]>({
    queryKey: ["teacher-home", "course-groups", userId, academicYear, semester, teacherCourseIds.join(",")],
    enabled: teacherCourseIds.length > 0 && academicYear.length > 0 && semester !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("course_id, group_id, tedris_ili, semestr, groups(id, ad)")
        .in("course_id", teacherCourseIds)
        .eq("tedris_ili", academicYear)
        .eq("semestr", semester!)
        .order("group_id");
      if (error) throw error;
      return (data ?? []) as unknown as CourseGroupLite[];
    },
    staleTime: 60_000,
  });

  const courseGroups = courseGroupsQuery.data ?? [];
  const currentCourseIds = useMemo(() => [...new Set(courseGroups.map((row) => row.course_id))], [courseGroups]);
  const groupIds = useMemo(() => [...new Set(courseGroups.map((row) => row.group_id))], [courseGroups]);
  const currentPairKeys = useMemo(
    () => new Set(courseGroups.map((row) => teacherSessionPairKey(row.course_id, row.group_id))),
    [courseGroups],
  );

  const coursesQuery = useQuery<CourseLite[]>({
    queryKey: ["teacher-home", "courses", userId, currentCourseIds.join(",")],
    enabled: currentCourseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, ad, kod, kurs, kredit, otaq")
        .in("id", currentCourseIds)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as CourseLite[];
    },
    staleTime: 60_000,
  });

  const membersQuery = useQuery<{ group_id: string }[]>({
    queryKey: ["teacher-home", "group-member-counts", userId, groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_members").select("group_id").in("group_id", groupIds);
      if (error) throw error;
      return (data ?? []) as { group_id: string }[];
    },
    staleTime: 60_000,
  });

  const todayKey = bakuDayKey(new Date(nowMs));

  const todaySessionsQuery = useQuery<SessionRow[]>({
    queryKey: ["teacher-home", "today-sessions", userId, todayKey, currentCourseIds.join(","), groupIds.join(",")],
    enabled: currentCourseIds.length > 0 && groupIds.length > 0,
    queryFn: () => fetchTeacherLessonSessions({
      userId,
      courseIds: currentCourseIds,
      groupIds,
      allowedPairs: currentPairKeys,
      startDate: todayKey,
      endDate: todayKey,
      limit: 80,
    }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const upcomingSessionsQuery = useQuery<SessionRow[]>({
    queryKey: ["teacher-home", "upcoming-sessions", userId, currentCourseIds.join(","), groupIds.join(",")],
    enabled: currentCourseIds.length > 0 && groupIds.length > 0,
    queryFn: () => fetchTeacherLessonSessions({
      userId,
      courseIds: currentCourseIds,
      groupIds,
      allowedPairs: currentPairKeys,
      endsAfter: new Date().toISOString(),
      limit: 80,
    }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const todaySessions = todaySessionsQuery.data ?? [];
  const upcomingSessions = upcomingSessionsQuery.data ?? [];
  const roomSourceSessions = useMemo(() => [...todaySessions, ...upcomingSessions], [todaySessions, upcomingSessions]);
  const sessionRoomMapsQuery = useQuery({
    queryKey: ["teacher-home", "session-room-maps", userId, roomSourceSessions.map((session) => session.id).join(",")],
    enabled: roomSourceSessions.length > 0,
    queryFn: () => fetchTeacherSessionRoomMaps(roomSourceSessions),
    staleTime: 60_000,
  });

  const courses = coursesQuery.data ?? [];
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const groupMap = useMemo(() => {
    const map = new Map<string, { id: string; ad: string }>();
    courseGroups.forEach((row) => {
      if (row.groups) map.set(row.group_id, row.groups);
    });
    return map;
  }, [courseGroups]);

  const memberCounts = useMemo(() => {
    const map = new Map<string, number>();
    (membersQuery.data ?? []).forEach((row) => map.set(row.group_id, (map.get(row.group_id) ?? 0) + 1));
    return map;
  }, [membersQuery.data]);

  const nextLesson = useMemo(
    () => upcomingSessions.find((row) => new Date(row.starts_at).getTime() > nowMs) ?? null,
    [upcomingSessions, nowMs],
  );

  const groupCards = useMemo(() => {
    const map = new Map<string, {
      id: string;
      ad: string;
      courses: CourseLite[];
      studentCount: number;
      todaySessions: SessionRow[];
      nextSession: SessionRow | null;
    }>();

    courseGroups.forEach((link) => {
      const group = groupMap.get(link.group_id);
      const course = courseMap.get(link.course_id);
      if (!group || !course) return;
      const current = map.get(link.group_id) ?? {
        id: link.group_id,
        ad: group.ad,
        courses: [],
        studentCount: memberCounts.get(link.group_id) ?? 0,
        todaySessions: [],
        nextSession: null,
      };
      if (!current.courses.some((item) => item.id === course.id)) current.courses.push(course);
      map.set(link.group_id, current);
    });

    map.forEach((group) => {
      group.courses.sort((a, b) => a.ad.localeCompare(b.ad, locale));
      group.todaySessions = todaySessions.filter((session) => session.group_id === group.id);
      group.nextSession = upcomingSessions.find(
        (session) => session.group_id === group.id && new Date(session.starts_at).getTime() > nowMs,
      ) ?? null;
    });

    return [...map.values()].sort((a, b) => a.ad.localeCompare(b.ad, locale, { numeric: true }));
  }, [courseGroups, groupMap, courseMap, memberCounts, todaySessions, upcomingSessions, nowMs, locale]);

  useEffect(() => {
    if (selectedGroupId && groupCards.some((group) => group.id === selectedGroupId)) return;
    setSelectedGroupId(groupCards[0]?.id ?? "");
  }, [groupCards, selectedGroupId]);

  const selectedGroup = groupCards.find((group) => group.id === selectedGroupId) ?? null;
  const profileName = contextQuery.data?.profile?.ad?.trim() || homeT("teacherFallback");
  const semesterLabel = semester === 1 ? homeT("semesterFall") : semester === 2 ? homeT("semesterSpring") : contextQuery.data?.academic?.cari_semestr ?? "";
  const longDate = formatLongDate(nowMs);

  const foundationalLoading = contextQuery.isLoading || linksQuery.isLoading || courseGroupsQuery.isLoading || coursesQuery.isLoading;
  const hasError = contextQuery.isError || linksQuery.isError || courseGroupsQuery.isError || coursesQuery.isError || membersQuery.isError || todaySessionsQuery.isError || upcomingSessionsQuery.isError || sessionRoomMapsQuery.isError;

  if (foundationalLoading) return <TeacherHomeSkeleton label={t("common.loading")} />;

  if (hasError) {
    return (
      <section className="role-panel-enter mx-auto mt-6 max-w-2xl rounded-[28px] border border-destructive/20 bg-card px-6 py-12 text-center shadow-sm" role="alert">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-foreground">{homeT("loadErrorTitle")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{homeT("loadErrorDescription")}</p>
        <button
          type="button"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ["teacher-home"] })}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> {homeT("retry")}
        </button>
      </section>
    );
  }

  const openSession = (session: SessionRow) => {
    const group = groupMap.get(session.group_id);
    const course = courseMap.get(session.course_id);
    if (!group || !course) return;
    void navigate({
      to: "/muellim/$groupId/$courseId",
      params: { groupId: group.id, courseId: course.id },
      search: { session: session.id },
    });
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="role-workspace-page role-workspace-home role-workspace-teacher-home role-panel-enter min-w-0 space-y-5 pb-8">
        <section className="relative isolate overflow-hidden rounded-[30px] border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-7 sm:py-7">
          <div className="tutor-home-network pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
          <div className="tutor-home-orb tutor-home-orb-a pointer-events-none absolute -z-10" aria-hidden="true" />
          <div className="tutor-home-orb tutor-home-orb-b pointer-events-none absolute -z-10" aria-hidden="true" />

          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] xl:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary backdrop-blur-sm">
                  <GraduationCap className="size-3.5" aria-hidden="true" /> {t("teacher.heroBadge")}
                </span>
                {academicYear ? (
                  <span className="rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                    {academicYear}{semesterLabel ? ` · ${semesterLabel}` : ""}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 font-display text-[clamp(1.7rem,4vw,2.6rem)] font-bold tracking-tight text-foreground">
                {homeT("greeting", { name: profileName })}
              </h1>
              <p className="mt-1.5 text-sm font-semibold capitalize text-muted-foreground">{longDate}</p>
              <div className="mt-4 max-w-2xl rounded-2xl border border-border/60 bg-background/72 px-4 py-3 text-sm leading-6 text-foreground backdrop-blur-sm">
                <span className="font-bold">{todaySessions.length > 0 ? homeT("todayCount", { count: todaySessions.length }) : homeT("todayNone")}</span>{" "}
                <span className="text-muted-foreground">{nextLesson ? homeT("nextLessonAt", { time: formatTime(nextLesson.starts_at) }) : homeT("noUpcomingLesson")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              <HeroMetric icon={<UsersRound className="size-4" />} value={groupCards.length} label={homeT("activeGroups")} />
              <HeroMetric icon={<BookOpenCheck className="size-4" />} value={currentCourseIds.length} label={homeT("currentCourses")} />
              <HeroMetric icon={<CalendarDays className="size-4" />} value={todaySessions.length} label={homeT("todayLessons")} />
              <HeroMetric icon={<Clock3 className="size-4" />} value={nextLesson ? formatTime(nextLesson.starts_at) : "—"} label={homeT("nextLesson")} />
            </div>
          </div>
        </section>

        {groupCards.length === 0 ? (
          <section className="role-panel-card rounded-[28px] border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
            <BookOpenCheck className="mx-auto size-11 text-muted-foreground/70" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold">{t("teacher.noGroupsTitle")}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{t("teacher.noGroupsDescription")}</p>
          </section>
        ) : (
          <>
            <section className="min-w-0 rounded-[28px] border border-border/60 bg-card p-3 shadow-sm sm:p-5">
              <div className="mb-4 px-1">
                <div className="flex items-center gap-2 text-primary"><Layers3 className="size-4" aria-hidden="true" /><h2 className="text-base font-bold text-foreground">{homeT("groupsTitle")}</h2></div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{homeT("groupsHint")}</p>
              </div>

              <div className="role-panel-stagger grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {groupCards.map((group) => {
                  const selected = group.id === selectedGroupId;
                  const firstToday = group.todaySessions[0] ?? null;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={cn(
                        "role-panel-card group min-h-[156px] w-full rounded-2xl border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        selected ? "border-primary/35 bg-primary/[0.055] shadow-sm" : "border-border/70 bg-background hover:border-primary/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                          <UsersRound className="size-4.5" aria-hidden="true" />
                        </span>
                        <ChevronRight className={cn("mt-1 size-4 transition-transform group-hover:translate-x-0.5", selected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                      </div>
                      <h3 className="mt-3 truncate text-base font-black text-foreground">{group.ad}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                        <span>{t("teacher.courseCount", { count: group.courses.length })}</span>
                        <span>{t("teacher.studentCount", { count: group.studentCount })}</span>
                      </div>
                      <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2 text-foreground"><CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{firstToday ? homeT("groupToday", { time: formatTime(firstToday.starts_at) }) : homeT("groupNoToday")}</span></div>
                        <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><Clock3 className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{group.nextSession ? homeT("groupNext", { date: formatShortDate(group.nextSession.starts_at), time: formatTime(group.nextSession.starts_at) }) : homeT("groupNoNext")}</span></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedGroup ? (
              <section key={selectedGroup.id} className="role-panel-enter min-w-0 rounded-[28px] border border-border/60 bg-card p-3 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-1 pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary"><BookOpenCheck className="size-3.5" aria-hidden="true" /> {t("teacher.selectedGroupBadge")}</div>
                    <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">{homeT("selectedGroup", { group: selectedGroup.ad })}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{homeT("selectedGroupHint")}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1.5">{t("teacher.courseCount", { count: selectedGroup.courses.length })}</Badge>
                </div>

                <div className="role-panel-stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {selectedGroup.courses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => void navigate({ to: `/muellim/${selectedGroup.id}/${course.id}` })}
                      className="role-panel-card group min-h-[150px] rounded-2xl border border-border/70 bg-background p-4 text-left outline-none hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-4" aria-hidden="true" /></span>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><ArrowRight className="size-4" aria-hidden="true" /></span>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-foreground">{course.ad}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        {course.kod ? <span className="rounded-full bg-muted px-2 py-1">{course.kod}</span> : null}
                        {course.kurs ? <span className="rounded-full bg-muted px-2 py-1">{course.kurs}</span> : null}
                        {course.kredit != null ? <span className="rounded-full bg-muted px-2 py-1">{course.kredit} {t("common.credit").toLowerCase()}</span> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <section className="min-w-0 rounded-[28px] border border-border/60 bg-card p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" aria-hidden="true" /><h2 className="text-base font-bold text-foreground">{homeT("todayScheduleTitle")}</h2></div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{homeT("todayScheduleHint")}</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1.5">{todaySessions.length}</Badge>
          </div>

          {todaySessionsQuery.isLoading || (todaySessions.length > 0 && sessionRoomMapsQuery.isLoading) ? (
            <div className="grid gap-3 lg:grid-cols-2" role="status" aria-label={t("common.loading")}><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
          ) : todaySessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-12 text-center">
              <CalendarDays className="mx-auto size-10 text-muted-foreground/65" aria-hidden="true" />
              <h3 className="mt-4 text-base font-bold text-foreground">{homeT("noTodayTitle")}</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{homeT("noTodayDescription")}</p>
            </div>
          ) : (
            <div className="role-panel-stagger grid gap-3 lg:grid-cols-2">
              {todaySessions.map((session) => {
                const course = courseMap.get(session.course_id);
                const group = groupMap.get(session.group_id);
                if (!course || !group) return null;
                const status = teacherSessionStatus(session, nowMs);
                const room = sessionRoomMapsQuery.data ? resolveTeacherSessionRoom(session, sessionRoomMapsQuery.data) : course.otaq;
                return (
                  <article key={session.id} className="role-panel-card min-w-0 rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">{group.ad}</Badge>
                          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{homeT(lessonTypeKey(session.dars_novu))}</span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-base font-black leading-6 text-foreground">{course.ad}</h3>
                      </div>
                      <StatusBadge status={status} t={homeT} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5"><div className="flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{formatTime(session.starts_at)}–{formatTime(session.ends_at)}</div></div>
                      <div className="min-w-0 rounded-xl border border-border/60 bg-card px-3 py-2.5"><div className="flex min-w-0 items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{room || homeT("roomUnknown")}</span></div></div>
                    </div>

                    <div className="mt-4 flex min-h-11 items-center justify-between gap-3 border-t border-border/60 pt-3">
                      {status === "active" ? (
                        <button
                          type="button"
                          onClick={() => openSession(session)}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <PlayCircle className="size-4" aria-hidden="true" /> {homeT("openJournal")}
                        </button>
                      ) : status === "future" ? (
                        <div className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-bold text-primary"><Clock3 className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{homeT("startsAt", { time: formatTime(session.starts_at) })}</span></div>
                      ) : (
                        <div className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"><CheckCircle2 className="size-4" aria-hidden="true" /> {homeT("completed")}</div>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={homeT("openJournal")}
                            onClick={() => openSession(session)}
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          >
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{homeT("openJournal")}</TooltipContent>
                      </Tooltip>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </TooltipProvider>
  );
}

function HeroMetric({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/78 px-3 py-3.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 text-primary"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">{icon}</span><span className="text-xl font-black tabular-nums text-foreground">{value}</span></div>
      <div className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: "active" | "future" | "completed"; t: (key: TeacherHomeKey, vars?: TeacherHomeVars) => string }) {
  if (status === "active") {
    return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground"><span className="teacher-status-pulse size-1.5 rounded-full bg-current" />{t("activeNow")}</span>;
  }
  if (status === "future") {
    return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-bold text-primary"><Clock3 className="size-3" aria-hidden="true" />{t("lessonGeneric")}</span>;
  }
  return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground"><CheckCircle2 className="size-3" aria-hidden="true" />{t("completed")}</span>;
}

function TeacherHomeSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-5 pb-8" role="status" aria-label={label}>
      <Skeleton className="h-[300px] rounded-[30px] sm:h-[250px]" />
      <div className="rounded-[28px] border border-border/60 bg-card p-4"><Skeleton className="h-5 w-36 rounded-lg" /><Skeleton className="mt-2 h-4 w-72 max-w-full rounded-lg" /><div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div></div>
      <div className="rounded-[28px] border border-border/60 bg-card p-4"><Skeleton className="h-5 w-40 rounded-lg" /><div className="mt-4 grid gap-3 lg:grid-cols-2"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div></div>
    </div>
  );
}
