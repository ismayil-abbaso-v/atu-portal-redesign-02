import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTutorJournalAssessments,
  fetchTutorJournalSessionRecords,
  fetchTutorJournalSessions,
  fetchTutorJournalTeachers,
  fetchTutorJournalTopics,
  type TutorJournalColloquium,
  type TutorJournalCourseWork,
  type TutorJournalIndependent,
  type TutorJournalRecord,
  type TutorJournalSession,
} from "@/lib/tutor-journal-data";
import { useTutorJournalI18n } from "@/lib/tutor-journal-i18n";
import {
  bakuTodayIso,
  fetchTutorAssignedGroups,
  fetchTutorGroupCourses,
  fetchTutorGroupStudents,
  fetchTutorPeriod,
  type TutorStudentLite,
} from "@/lib/tutor-workspace-data";
import "@/role-dashboard.css";

type SessionScope = "all" | "past" | "today" | "future";
type SubmissionRow = TutorJournalIndependent | TutorJournalCourseWork;

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T00:00:00+04:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Baku", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatTime(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("az-AZ");
}

function studentName(student: TutorStudentLite | null | undefined) {
  if (!student) return "—";
  return [student.ad, student.soyad].filter(Boolean).join(" ") || student.istifadeci_adi || "—";
}

function studentInitial(student: TutorStudentLite) {
  return (student.soyad?.[0] ?? student.ad?.[0] ?? student.istifadeci_adi?.[0] ?? "?").toLocaleUpperCase("az-AZ");
}

async function openStudentSubmission(path: string, fallbackMessage: string) {
  try {
    if (/^https?:\/\//i.test(path)) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    const normalized = path.replace(/^\/+/, "");
    const storagePath = normalized.startsWith("student-submissions/") ? normalized.slice("student-submissions/".length) : normalized;
    const { data, error } = await supabase.storage.from("student-submissions").createSignedUrl(storagePath, 120);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : fallbackMessage);
  }
}

export function TutorJournalMonitor({ userId }: { userId: string }) {
  const { intlLocale, t } = useTutorJournalI18n();
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionScope, setSessionScope] = useState<SessionScope>("all");
  const [studentSearch, setStudentSearch] = useState("");

  const periodQuery = useQuery({
    queryKey: ["tutor-journal", "period", userId],
    queryFn: fetchTutorPeriod,
    staleTime: 60_000,
  });
  const groupsQuery = useQuery({
    queryKey: ["tutor-journal", "groups", userId],
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
    queryKey: ["tutor-journal", "courses", userId, groupId, period?.year, period?.semester],
    queryFn: () => fetchTutorGroupCourses(groupId, period!),
    enabled: !!groupId && !!period,
  });
  const courses = coursesQuery.data ?? [];

  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      setSessionId("");
      return;
    }
    if (!courseId || !courses.some((course) => course.id === courseId)) {
      setCourseId(courses[0]!.id);
      setSessionId("");
    }
  }, [courseId, courses]);

  const studentsQuery = useQuery({
    queryKey: ["tutor-journal", "students", userId, groupId],
    queryFn: () => fetchTutorGroupStudents(groupId),
    enabled: !!groupId,
  });
  const students = studentsQuery.data ?? [];
  const studentIds = useMemo(() => students.map((student) => student.user_id), [students]);

  const sessionsQuery = useQuery({
    queryKey: ["tutor-journal", "sessions", userId, groupId, courseId],
    queryFn: () => fetchTutorJournalSessions(groupId, courseId),
    enabled: !!groupId && !!courseId,
  });
  const sessions = sessionsQuery.data ?? [];
  const today = bakuTodayIso();
  const filteredSessions = useMemo(() => sessions.filter((session) => {
    if (sessionScope === "all") return true;
    if (sessionScope === "today") return session.lesson_date === today;
    if (sessionScope === "past") return session.lesson_date < today;
    return session.lesson_date > today;
  }), [sessionScope, sessions, today]);

  useEffect(() => {
    if (!filteredSessions.length) {
      setSessionId("");
      return;
    }
    if (!sessionId || !filteredSessions.some((session) => session.id === sessionId)) setSessionId(filteredSessions[0]!.id);
  }, [filteredSessions, sessionId]);

  const selectedSession = sessions.find((session) => session.id === sessionId) ?? null;
  const historicalTeacherIds = useMemo(() => [...new Set(sessions.map((session) => session.teacher_id))], [sessions]);

  const topicsQuery = useQuery({
    queryKey: ["tutor-journal", "topics", userId, courseId],
    queryFn: () => fetchTutorJournalTopics(courseId),
    enabled: !!courseId,
  });
  const teachersQuery = useQuery({
    queryKey: ["tutor-journal", "teachers", userId, courseId, historicalTeacherIds.join(",")],
    queryFn: () => fetchTutorJournalTeachers(courseId, historicalTeacherIds),
    enabled: !!courseId,
  });
  const recordsQuery = useQuery({
    queryKey: ["tutor-journal", "records", userId, groupId, courseId, sessionId],
    queryFn: () => fetchTutorJournalSessionRecords(sessionId),
    enabled: !!sessionId,
  });
  const assessmentsQuery = useQuery({
    queryKey: ["tutor-journal", "assessments", userId, groupId, courseId, studentIds.join(",")],
    queryFn: () => fetchTutorJournalAssessments(courseId, studentIds),
    enabled: !!courseId && studentIds.length > 0,
  });

  const topicMap = useMemo(() => new Map((topicsQuery.data ?? []).map((topic) => [topic.id, topic])), [topicsQuery.data]);
  const teacherMap = useMemo(() => new Map((teachersQuery.data ?? []).map((teacher) => [teacher.muellim_id, teacher.profile])), [teachersQuery.data]);
  const recordMap = useMemo(() => new Map((recordsQuery.data ?? []).map((record) => [record.student_id, record])), [recordsQuery.data]);
  const studentMap = useMemo(() => new Map(students.map((student) => [student.user_id, student])), [students]);

  const search = normalizeSearch(studentSearch);
  const visibleStudents = useMemo(() => {
    if (!search) return students;
    return students.filter((student) => normalizeSearch(`${student.soyad ?? ""} ${student.ad ?? ""} ${student.istifadeci_adi ?? ""}`).includes(search));
  }, [search, students]);

  const filterAssessmentRows = <T extends { student_id: string }>(rows: T[]) => {
    if (!search) return rows;
    return rows.filter((row) => {
      const student = studentMap.get(row.student_id);
      return normalizeSearch(`${student?.soyad ?? ""} ${student?.ad ?? ""} ${student?.istifadeci_adi ?? ""}`).includes(search);
    });
  };

  const confirmedCount = sessions.filter((session) => session.is_confirmed).length;
  const anyError = periodQuery.isError || groupsQuery.isError || coursesQuery.isError || studentsQuery.isError || sessionsQuery.isError || topicsQuery.isError || teachersQuery.isError || recordsQuery.isError || assessmentsQuery.isError;
  const baseLoading = periodQuery.isLoading || groupsQuery.isLoading;

  const retryAll = () => void Promise.all([
    periodQuery.refetch(), groupsQuery.refetch(), coursesQuery.refetch(), studentsQuery.refetch(), sessionsQuery.refetch(), topicsQuery.refetch(), teachersQuery.refetch(), recordsQuery.refetch(), assessmentsQuery.refetch(),
  ]);

  if (baseLoading) return <TutorJournalSkeleton />;

  if (groups.length === 0) {
    return <div className="role-panel-enter space-y-4 pb-6"><JournalHeader /><section className="rounded-[28px] border border-border/70 bg-card p-5 shadow-sm"><EmptyState icon={Users2} mesaj={t("empty.noGroups")} /></section></div>;
  }

  return (
    <div className="role-panel-enter space-y-4 pb-7 sm:space-y-5">
      <JournalHeader />

      <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(420px,1.2fr)] lg:items-end">
          <Selector label={t("selector.group")} value={groupId} onChange={(value) => { setGroupId(value); setCourseId(""); setSessionId(""); setSessionScope("all"); setStudentSearch(""); }}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.ad}</option>)}
          </Selector>
          <Selector label={t("selector.course")} value={courseId} disabled={coursesQuery.isLoading || courses.length === 0} onChange={(value) => { setCourseId(value); setSessionId(""); setSessionScope("all"); setStudentSearch(""); }}>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.kod ? `${course.kod} · ` : ""}{course.ad}</option>)}
          </Selector>
          <div className="grid grid-cols-4 gap-2">
            <Metric value={students.length} label={t("summary.students")} icon={Users2} />
            <Metric value={courses.length} label={t("summary.courses")} icon={BookOpenCheck} />
            <Metric value={sessions.length} label={t("summary.sessions")} icon={CalendarDays} />
            <Metric value={confirmedCount} label={t("summary.confirmed")} icon={CheckCircle2} />
          </div>
        </div>
      </section>

      {anyError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-sm text-destructive">
          <span>{t("error.description")}</span>
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={retryAll}><RefreshCw className="size-4" />{t("common.retry")}</Button>
        </div>
      ) : null}

      {courses.length === 0 && !coursesQuery.isLoading ? (
        <section className="rounded-[28px] border border-border/70 bg-card p-5 shadow-sm"><EmptyState icon={BookOpenCheck} mesaj={t("empty.noCourses")} /></section>
      ) : (
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1 sm:grid-cols-4">
            <TabsTrigger value="daily" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm">{t("tabs.daily")}</TabsTrigger>
            <TabsTrigger value="independent" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm">{t("tabs.independent")}</TabsTrigger>
            <TabsTrigger value="colloquium" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm">{t("tabs.colloquium")}</TabsTrigger>
            <TabsTrigger value="coursework" className="min-h-11 rounded-xl px-2 text-xs font-bold sm:text-sm">{t("tabs.coursework")}</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 focus-visible:outline-none">
            <div className="grid min-w-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
              <SessionList
                sessions={filteredSessions}
                allSessions={sessions}
                selectedId={sessionId}
                scope={sessionScope}
                setScope={setSessionScope}
                setSelectedId={setSessionId}
                teacherMap={teacherMap}
                topicMap={topicMap}
                loading={sessionsQuery.isLoading || teachersQuery.isLoading || topicsQuery.isLoading}
                today={today}
                locale={intlLocale}
              />
              <SessionStudentDetail
                session={selectedSession}
                students={visibleStudents}
                totalStudents={students.length}
                recordMap={recordMap}
                search={studentSearch}
                setSearch={setStudentSearch}
                topic={selectedSession?.topic_id ? topicMap.get(selectedSession.topic_id)?.movzu ?? null : null}
                teacher={selectedSession ? teacherMap.get(selectedSession.teacher_id) ?? null : null}
                loading={studentsQuery.isLoading || recordsQuery.isLoading}
                locale={intlLocale}
              />
            </div>
          </TabsContent>

          <TabsContent value="independent" className="mt-4 focus-visible:outline-none">
            <AssessmentShell search={studentSearch} setSearch={setStudentSearch}>
              <SubmissionAssessmentList rows={filterAssessmentRows(assessmentsQuery.data?.independent ?? [])} students={studentMap} loading={assessmentsQuery.isLoading} emptyText={t("assessment.noneIndependent")} locale={intlLocale} />
            </AssessmentShell>
          </TabsContent>

          <TabsContent value="colloquium" className="mt-4 focus-visible:outline-none">
            <AssessmentShell search={studentSearch} setSearch={setStudentSearch}>
              <ColloquiumList rows={filterAssessmentRows(assessmentsQuery.data?.colloquium ?? [])} students={studentMap} loading={assessmentsQuery.isLoading} locale={intlLocale} />
            </AssessmentShell>
          </TabsContent>

          <TabsContent value="coursework" className="mt-4 focus-visible:outline-none">
            <AssessmentShell search={studentSearch} setSearch={setStudentSearch}>
              <SubmissionAssessmentList rows={filterAssessmentRows(assessmentsQuery.data?.coursework ?? [])} students={studentMap} loading={assessmentsQuery.isLoading} emptyText={t("assessment.noneCoursework")} locale={intlLocale} />
            </AssessmentShell>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function JournalHeader() {
  const { t } = useTutorJournalI18n();
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary"><GraduationCap className="size-5" /><span className="text-[11px] font-black uppercase tracking-[0.13em]">{t("page.readOnly")}</span></div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("page.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("page.description")}</p>
        </div>
        <div className="flex max-w-md items-start gap-2 rounded-2xl border border-primary/15 bg-primary/[0.045] p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>{t("page.readOnlyHint")}</span>
        </div>
      </div>
    </header>
  );
}

function Selector({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return <label className="min-w-0 space-y-1.5"><span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">{children}</select></label>;
}

function Metric({ value, label, icon: Icon }: { value: number; label: string; icon: typeof Users2 }) {
  return <div className="min-w-0 rounded-2xl border border-border/70 bg-background px-2 py-2.5 text-center sm:px-3"><Icon className="mx-auto size-4 text-primary" /><p className="mt-1 font-data text-lg font-black tabular-nums text-foreground sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]">{label}</p></div>;
}

function SessionList({ sessions, allSessions, selectedId, scope, setScope, setSelectedId, teacherMap, topicMap, loading, today, locale }: {
  sessions: TutorJournalSession[]; allSessions: TutorJournalSession[]; selectedId: string; scope: SessionScope; setScope: (scope: SessionScope) => void; setSelectedId: (id: string) => void; teacherMap: Map<string, { user_id: string; ad: string | null; soyad: string | null } | null>; topicMap: Map<string, { movzu: string | null }>; loading: boolean; today: string; locale: string;
}) {
  const { t } = useTutorJournalI18n();
  const scopes: SessionScope[] = ["all", "past", "today", "future"];
  return <section className="min-w-0 rounded-[28px] border border-border/70 bg-card p-3 shadow-sm sm:p-4">
    <div className="mb-3 px-1"><h2 className="text-sm font-bold text-foreground">{t("sessions.title")}</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t("sessions.description")}</p></div>
    <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-muted/70 p-1">{scopes.map((item) => <button key={item} type="button" onClick={() => setScope(item)} className={`min-h-10 rounded-lg px-1 text-[10px] font-bold transition-colors sm:text-xs ${scope === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t(`sessions.${item}` as "sessions.all" | "sessions.past" | "sessions.today" | "sessions.future")}</button>)}</div>
    {loading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div> : allSessions.length === 0 ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">{t("sessions.none")}</div> : sessions.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t("common.none")}</div> : <div className="space-y-2 xl:max-h-[690px] xl:overflow-y-auto xl:pr-1">{sessions.map((session) => {
      const teacher = teacherMap.get(session.teacher_id);
      const topic = session.movzu || (session.topic_id ? topicMap.get(session.topic_id)?.movzu : null) || t("sessions.topicMissing");
      const temporal = session.lesson_date === today ? "today" : session.lesson_date < today ? "past" : "future";
      return <button key={session.id} type="button" onClick={() => setSelectedId(session.id)} className={`role-panel-card w-full min-w-0 rounded-2xl border p-3 text-left active:scale-[0.99] ${session.id === selectedId ? "border-primary/40 bg-primary/[0.045]" : "border-border/70 bg-background"}`}>
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-bold text-foreground">{formatDate(session.lesson_date, locale)}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{formatTime(session.starts_at, locale)}–{formatTime(session.ends_at, locale)}</p></div><div className="flex shrink-0 flex-col items-end gap-1"><Badge variant={session.is_confirmed ? "default" : "outline"} className="rounded-full text-[11px]">{session.is_confirmed ? t("sessions.confirmed") : t("sessions.pending")}</Badge><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t(`sessions.${temporal}` as "sessions.past" | "sessions.today" | "sessions.future")}</span></div></div>
        <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground/85">{topic}</p>
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="truncate">{teacher ? [teacher.ad, teacher.soyad].filter(Boolean).join(" ") || t("sessions.teacherMissing") : t("sessions.teacherMissing")}</span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5">{lessonTypeLabel(session.dars_novu, t)}</span></div>
      </button>;
    })}</div>}
  </section>;
}

function SessionStudentDetail({ session, students, totalStudents, recordMap, search, setSearch, topic, teacher, loading, locale }: { session: TutorJournalSession | null; students: TutorStudentLite[]; totalStudents: number; recordMap: Map<string, TutorJournalRecord>; search: string; setSearch: (value: string) => void; topic: string | null; teacher: { user_id: string; ad: string | null; soyad: string | null } | null; loading: boolean; locale: string }) {
  const { t } = useTutorJournalI18n();
  if (!session) return <section className="min-w-0 rounded-[28px] border border-border/70 bg-card p-5 shadow-sm"><EmptyState icon={BookOpenCheck} mesaj={t("selector.chooseSession")} /></section>;
  const displayTopic = session.movzu || topic || t("sessions.topicMissing");
  return <section className="min-w-0 rounded-[28px] border border-border/70 bg-card p-3 shadow-sm sm:p-5">
    <div className="mb-4 border-b border-border/70 pb-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("session.detail")}</p><h2 className="mt-1 text-base font-bold text-foreground sm:text-lg">{formatDate(session.lesson_date, locale)} · {displayTopic}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{lessonTypeLabel(session.dars_novu, t)} · {formatTime(session.starts_at, locale)}–{formatTime(session.ends_at, locale)}{teacher ? ` · ${[teacher.ad, teacher.soyad].filter(Boolean).join(" ")}` : ""}</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${session.is_confirmed ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}><CheckCircle2 className="size-4" />{session.is_confirmed ? t("session.confirmedJournal") : t("session.pendingJournal")}</span></div></div>
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("session.studentSearch")} className="min-h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div><Badge variant="outline" className="w-fit rounded-full">{students.length}/{totalStudents}</Badge></div>
    {loading ? <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : totalStudents === 0 ? <EmptyState icon={Users2} mesaj={t("session.noStudents")} /> : students.length === 0 ? <EmptyState icon={Search} mesaj={t("session.noMatches")} /> : <><div className="space-y-2 sm:hidden">{students.map((student) => <StudentRecordCard key={student.user_id} student={student} record={recordMap.get(student.user_id) ?? null} />)}</div><div className="hidden sm:block"><Table><TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>{t("student.student")}</TableHead><TableHead>{t("student.attendance")}</TableHead><TableHead>{t("student.grade")}</TableHead><TableHead>{t("student.lab")}</TableHead><TableHead className="text-right">{t("student.file")}</TableHead></TableRow></TableHeader><TableBody>{students.map((student) => <StudentRecordTableRow key={student.user_id} student={student} record={recordMap.get(student.user_id) ?? null} />)}</TableBody></Table></div></>}
  </section>;
}

function StudentIdentity({ student }: { student: TutorStudentLite }) {
  return <div className="flex min-w-0 items-center gap-2.5"><Avatar className="size-9"><SignedAvatarImage src={student.avatar_url} alt={studentName(student)} /><AvatarFallback className="text-[11px] font-bold">{studentInitial(student)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{studentName(student)}</p>{student.istifadeci_adi ? <p className="truncate text-[11px] text-muted-foreground">{student.istifadeci_adi}</p> : null}</div></div>;
}

function StudentRecordCard({ student, record }: { student: TutorStudentLite; record: TutorJournalRecord | null }) {
  const { t } = useTutorJournalI18n();
  return <div className="rounded-2xl border border-border/70 bg-background p-3"><StudentIdentity student={student} /><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><DataCell label={t("student.attendance")} value={<AttendanceLabel status={record?.attendance_status ?? null} />} /><DataCell label={t("student.grade")} value={record?.grade ?? t("common.none")} /><DataCell label={t("student.lab")} value={record?.lab_submitted == null ? t("student.notMarked") : record.lab_submitted ? t("student.labSubmitted") : t("student.labNotSubmitted")} /><DataCell label={t("student.file")} value={<FileLink path={record?.file_url ?? null} />} /></div></div>;
}

function StudentRecordTableRow({ student, record }: { student: TutorStudentLite; record: TutorJournalRecord | null }) {
  const { t } = useTutorJournalI18n();
  return <TableRow><TableCell><StudentIdentity student={student} /></TableCell><TableCell><AttendanceLabel status={record?.attendance_status ?? null} /></TableCell><TableCell className="font-data font-bold">{record?.grade ?? t("common.none")}</TableCell><TableCell>{record?.lab_submitted == null ? t("student.notMarked") : record.lab_submitted ? t("student.labSubmitted") : t("student.labNotSubmitted")}</TableCell><TableCell className="text-right"><FileLink path={record?.file_url ?? null} /></TableCell></TableRow>;
}

function AttendanceLabel({ status }: { status: TutorJournalRecord["attendance_status"] | null }) {
  const { t } = useTutorJournalI18n();
  if (!status) return <span className="text-xs text-muted-foreground">{t("student.notMarked")}</span>;
  const present = status === "iştirak edib";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${present ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}><span className={`size-1.5 rounded-full ${present ? "bg-emerald-500" : "bg-destructive"}`} />{present ? t("student.present") : t("student.absent")}</span>;
}

function FileLink({ path }: { path: string | null }) {
  const { t } = useTutorJournalI18n();
  if (!path) return <span className="text-xs text-muted-foreground">{t("common.none")}</span>;
  return <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-xl px-2.5 text-xs" onClick={() => void openStudentSubmission(path, t("student.fileError"))}><ExternalLink className="size-3.5" />{t("student.openFile")}</Button>;
}

function DataCell({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0 rounded-xl bg-muted/40 p-2"><p className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted-foreground">{label}</p><div className="mt-1 min-w-0 font-medium text-foreground">{value}</div></div>;
}

function AssessmentShell({ search, setSearch, children }: { search: string; setSearch: (value: string) => void; children: React.ReactNode }) {
  const { t } = useTutorJournalI18n();
  return <section className="rounded-[28px] border border-border/70 bg-card p-3 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" />{t("page.readOnlyHint")}</div><div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("session.studentSearch")} className="min-h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div></div>{children}</section>;
}

function SubmissionAssessmentList({ rows, students, loading, emptyText, locale }: { rows: SubmissionRow[]; students: Map<string, TutorStudentLite>; loading: boolean; emptyText: string; locale: string }) {
  const { t } = useTutorJournalI18n();
  if (loading) return <AssessmentSkeleton />;
  if (!rows.length) return <EmptyState icon={FileCheck2} mesaj={emptyText} />;
  return <><div className="space-y-2 sm:hidden">{rows.map((row) => { const student = students.get(row.student_id); return <div key={row.id} className="rounded-2xl border border-border/70 bg-background p-3">{student ? <StudentIdentity student={student} /> : <p className="text-sm font-semibold">{t("common.unknown")}</p>}<div className="mt-3 grid grid-cols-2 gap-2 text-xs"><DataCell label={t("assessment.ordinal")} value={row.sira} /><DataCell label={t("assessment.grade")} value={row.grade ?? t("common.none")} /><DataCell label={t("assessment.status")} value={assessmentStatus(row.status, t)} /><DataCell label={t("assessment.date")} value={formatDate(row.submitted_at, locale)} /><div className="col-span-2"><DataCell label={t("assessment.topic")} value={row.topic || t("common.none")} /></div><div className="col-span-2"><DataCell label={t("assessment.file")} value={<FileLink path={row.file_url} />} /></div></div></div>; })}</div><div className="hidden sm:block"><Table><TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>{t("assessment.student")}</TableHead><TableHead>{t("assessment.ordinal")}</TableHead><TableHead>{t("assessment.topic")}</TableHead><TableHead>{t("assessment.status")}</TableHead><TableHead>{t("assessment.grade")}</TableHead><TableHead>{t("assessment.date")}</TableHead><TableHead className="text-right">{t("assessment.file")}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => { const student = students.get(row.student_id); return <TableRow key={row.id}><TableCell>{student ? <StudentIdentity student={student} /> : t("common.unknown")}</TableCell><TableCell>{row.sira}</TableCell><TableCell className="max-w-[240px] truncate">{row.topic || t("common.none")}</TableCell><TableCell>{assessmentStatus(row.status, t)}</TableCell><TableCell className="font-data font-bold">{row.grade ?? t("common.none")}</TableCell><TableCell>{formatDate(row.submitted_at, locale)}</TableCell><TableCell className="text-right"><FileLink path={row.file_url} /></TableCell></TableRow>; })}</TableBody></Table></div></>;
}

function ColloquiumList({ rows, students, loading, locale }: { rows: TutorJournalColloquium[]; students: Map<string, TutorStudentLite>; loading: boolean; locale: string }) {
  const { t } = useTutorJournalI18n();
  if (loading) return <AssessmentSkeleton />;
  if (!rows.length) return <EmptyState icon={GraduationCap} mesaj={t("assessment.noneColloquium")} />;
  return <><div className="space-y-2 sm:hidden">{rows.map((row) => { const student = students.get(row.student_id); return <div key={row.id} className="rounded-2xl border border-border/70 bg-background p-3">{student ? <StudentIdentity student={student} /> : <p className="text-sm font-semibold">{t("common.unknown")}</p>}<div className="mt-3 grid grid-cols-3 gap-2 text-xs"><DataCell label={t("assessment.ordinal")} value={row.sira} /><DataCell label={t("assessment.grade")} value={row.grade ?? t("common.none")} /><DataCell label={t("assessment.date")} value={formatDate(row.tarix, locale)} /></div></div>; })}</div><div className="hidden sm:block"><Table><TableHeader><TableRow><TableHead>{t("assessment.student")}</TableHead><TableHead>{t("assessment.ordinal")}</TableHead><TableHead>{t("assessment.date")}</TableHead><TableHead>{t("assessment.grade")}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => { const student = students.get(row.student_id); return <TableRow key={row.id}><TableCell>{student ? <StudentIdentity student={student} /> : t("common.unknown")}</TableCell><TableCell>{row.sira}</TableCell><TableCell>{formatDate(row.tarix, locale)}</TableCell><TableCell className="font-data font-bold">{row.grade ?? t("common.none")}</TableCell></TableRow>; })}</TableBody></Table></div></>;
}

function AssessmentSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>;
}

function TutorJournalSkeleton() {
  const { t } = useTutorJournalI18n();
  return <div className="role-panel-enter space-y-4" aria-label={t("common.loading")}><Skeleton className="h-36 rounded-[28px]" /><Skeleton className="h-32 rounded-[28px]" /><div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]"><Skeleton className="h-[560px] rounded-[28px]" /><Skeleton className="h-[560px] rounded-[28px]" /></div></div>;
}

function lessonTypeLabel(value: string | null, t: ReturnType<typeof useTutorJournalI18n>["t"]) {
  const keyMap: Record<string, "lesson.muhazire" | "lesson.seminar" | "lesson.laboratoriya" | "lesson.serbest_is" | "lesson.kollokvium" | "lesson.tecrube" | "lesson.qrup_dersi"> = {
    muhazire: "lesson.muhazire", seminar: "lesson.seminar", laboratoriya: "lesson.laboratoriya", serbest_is: "lesson.serbest_is", kollokvium: "lesson.kollokvium", tecrube: "lesson.tecrube", qrup_dersi: "lesson.qrup_dersi",
  };
  return value && keyMap[value] ? t(keyMap[value]) : t("common.unknown");
}

function assessmentStatus(value: SubmissionRow["status"], t: ReturnType<typeof useTutorJournalI18n>["t"]) {
  if (value === "teqdim_edilib") return t("assessment.submitted");
  if (value === "qiymetlendirilib") return t("assessment.graded");
  return t("assessment.waiting");
}
