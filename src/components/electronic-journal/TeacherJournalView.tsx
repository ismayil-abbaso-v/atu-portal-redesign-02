import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  LockKeyhole,
  Save,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCanGradeNow } from "@/hooks/use-can-grade-now";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { canGradeNowClient } from "@/lib/electronic-journal";
import { confirmLessonGrading } from "@/server-functions/electronic-journal";
import { useJournalI18n } from "@/lib/electronic-journal-i18n";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";

type CourseRow = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "id" | "ad" | "qiymetlendirme_novu" | "kurs_isi_var"
>;
type TeacherLink = Pick<
  Database["public"]["Tables"]["course_teachers"]["Row"],
  "course_id" | "muellim_id" | "icazeler"
>;
type SessionRow = Database["public"]["Tables"]["course_lesson_sessions"]["Row"];
type LessonRecordRow = Database["public"]["Tables"]["lesson_student_records"]["Row"];
type IndependentRow = Database["public"]["Tables"]["independent_work_assessments"]["Row"];
type CourseWorkRow = Database["public"]["Tables"]["course_work_assessments"]["Row"];
type ColloquiumRow = Database["public"]["Tables"]["colloquium_assessments"]["Row"];
type ProfileLite = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "ad" | "soyad" | "istifadeci_adi">;

type AttendanceStatus = Database["public"]["Enums"]["lesson_attendance_status"];

type DailyDraft = {
  attendanceStatus: AttendanceStatus | null;
  grade: string;
  labSubmitted: boolean;
};

type AssessmentItem =
  | { kind: "independent"; row: IndependentRow; maxGrade: 5; label: string }
  | { kind: "coursework"; row: CourseWorkRow; maxGrade: 10; label: string };

function jsonFlags(value: Json | null | undefined): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, flag]) => [key, flag === true]),
  );
}

function profileName(profile: ProfileLite | undefined, fallback = "—") {
  if (!profile) return fallback;
  return [profile.ad, profile.soyad].filter(Boolean).join(" ") || profile.istifadeci_adi || fallback;
}

function formatLessonTime(timestamp: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatLessonDate(timestamp: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

async function openSignedSubmission(fileUrl: string, fallbackMessage: string) {
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const normalized = fileUrl.replace(/^\/+/, "");
    const bucket = normalized.startsWith("course-materials/") ? "course-materials" : "note-files";
    const path = normalized.startsWith(`${bucket}/`) ? normalized.slice(bucket.length + 1) : normalized;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : fallbackMessage);
  }
}

export function TeacherJournalView({ userId }: { userId: string }) {
  const { t: jt, formatDate: formatLessonDate, formatTime: formatLessonTime } = useJournalI18n();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const { data: teacherLinks = [], isLoading: teacherLinksLoading } = useQuery<TeacherLink[]>({
    queryKey: ["ejournal-teacher-links", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_teachers")
        .select("course_id, muellim_id, icazeler")
        .eq("muellim_id", userId);
      if (error) throw error;
      return (data ?? []) as TeacherLink[];
    },
  });

  const courseIds = useMemo(() => [...new Set(teacherLinks.map((link) => link.course_id))], [teacherLinks]);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseRow[]>({
    queryKey: ["ejournal-teacher-courses", courseIds.join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, ad, qiymetlendirme_novu, kurs_isi_var")
        .in("id", courseIds)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<SessionRow[]>({
    queryKey: ["ejournal-teacher-sessions", userId, courseIds.join(",")],
    enabled: courseIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lesson_sessions")
        .select("*")
        .eq("teacher_id", userId)
        .in("course_id", courseIds)
        .order("starts_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });

  const groupIds = useMemo(() => [...new Set(sessions.map((session) => session.group_id))], [sessions]);
  const { data: groups = [] } = useQuery({
    queryKey: ["ejournal-session-groups", groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, ad").in("id", groupIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const permissionMap = useMemo(
    () => new Map(teacherLinks.map((link) => [link.course_id, jsonFlags(link.icazeler)])),
    [teacherLinks],
  );

  const activeSession = useMemo(
    () =>
      sessions.find(
        (session) =>
          !session.is_confirmed &&
          canGradeNowClient({
            startsAt: session.starts_at,
            endsAt: session.ends_at,
            assignedTeacher: session.teacher_id === userId,
            permissions: permissionMap.get(session.course_id),
            lessonType: session.dars_novu,
          }),
      ) ?? null,
    [sessions, userId, permissionMap],
  );

  useEffect(() => {
    if (selectedCourseId) return;
    const firstCourseId = activeSession?.course_id ?? courses[0]?.id;
    if (firstCourseId) setSelectedCourseId(firstCourseId);
  }, [selectedCourseId, activeSession, courses]);

  const courseSessions = useMemo(
    () => sessions.filter((session) => session.course_id === selectedCourseId),
    [sessions, selectedCourseId],
  );

  useEffect(() => {
    if (!selectedCourseId) return;
    const currentBelongs = courseSessions.some((session) => session.id === selectedSessionId);
    if (currentBelongs) return;
    const activeForCourse = activeSession?.course_id === selectedCourseId ? activeSession : null;
    const preferred = activeForCourse ?? courseSessions.find((session) => !session.is_confirmed) ?? courseSessions[0];
    setSelectedSessionId(preferred?.id ?? "");
  }, [selectedCourseId, selectedSessionId, courseSessions, activeSession]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedPermissions = permissionMap.get(selectedCourseId) ?? {};

  const gradeGate = useCanGradeNow({
    lessonId: selectedSession?.id ?? "",
    teacherId: userId,
    sessionTeacherId: selectedSession?.teacher_id ?? "",
    startsAt: selectedSession?.starts_at ?? "",
    endsAt: selectedSession?.ends_at ?? "",
    lessonType: selectedSession?.dars_novu ?? null,
    permissions: selectedPermissions,
    enabled: Boolean(selectedSession && !selectedSession.is_confirmed),
  });

  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group.ad])), [groups]);
  const loading = teacherLinksLoading || coursesLoading || sessionsLoading;

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-card"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (courses.length === 0) {
    return <div className="rounded-3xl bg-card p-6 shadow-sm"><EmptyState icon={BookOpenCheck} mesaj={jt("teacher.noCourses")} /></div>;
  }

  const changeCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSessionId("");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">{jt("teacher.courseLessonSelection")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{jt("teacher.activeWindowHint")}</p>
          </div>
          {activeSession ? <Badge className="gap-1.5 rounded-full px-3 py-1"><span className="size-1.5 animate-pulse rounded-full bg-current" /> {jt("teacher.activeLessonNow")}</Badge> : <Badge variant="outline" className="rounded-full px-3 py-1">{jt("teacher.noActiveLesson")}</Badge>}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const courseActive = activeSession?.course_id === course.id;
            const selected = course.id === selectedCourseId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => changeCourse(course.id)}
                className={`rounded-2xl border p-3 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 bg-background hover:border-primary/35"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground">{course.ad}</span>
                  {courseActive ? <Badge className="shrink-0 rounded-full px-2 py-0.5">{jt("common.active")}</Badge> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span>{course.qiymetlendirme_novu === "laboratoriya" ? jt("common.laboratory") : course.qiymetlendirme_novu === "meshgele" ? jt("common.practice") : jt("teacher.gradingTypeMissing")}</span>
                  {course.kurs_isi_var ? <span>• {jt("common.courseWork")}</span> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label>{jt("teacher.session")}</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={jt("teacher.chooseSession")} /></SelectTrigger>
              <SelectContent>
                {courseSessions.map((session) => {
                  const locallyActive = !session.is_confirmed && canGradeNowClient({
                    startsAt: session.starts_at,
                    endsAt: session.ends_at,
                    assignedTeacher: session.teacher_id === userId,
                    permissions: selectedPermissions,
                    lessonType: session.dars_novu,
                  });
                  return <SelectItem key={session.id} value={session.id}>{formatLessonDate(session.starts_at)} • {formatLessonTime(session.starts_at)}–{formatLessonTime(session.ends_at)} • {groupMap.get(session.group_id) ?? jt("common.group")}{locallyActive ? ` • ${jt("common.active").toUpperCase()}` : session.is_confirmed ? ` • ${jt("common.confirmed")}` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          {selectedSession ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 rounded-full"><UsersRound className="size-3.5" /> {groupMap.get(selectedSession.group_id) ?? jt("common.group")}</Badge>
              {selectedSession.is_confirmed ? <Badge variant="secondary" className="gap-1 rounded-full"><LockKeyhole className="size-3.5" /> {jt("common.locked")}</Badge> : gradeGate.canGrade ? <Badge className="gap-1 rounded-full"><Clock3 className="size-3.5" /> {jt("teacher.gradingOpen")}</Badge> : <Badge variant="outline" className="gap-1 rounded-full"><Clock3 className="size-3.5" /> {jt("teacher.gradingClosed")}</Badge>}
            </div>
          ) : null}
        </div>
      </section>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted p-1">
          <TabsTrigger value="daily" className="rounded-xl py-2 font-bold">{jt("teacher.dailyTab")}</TabsTrigger>
          <TabsTrigger value="works" className="rounded-xl py-2 font-bold">{jt("teacher.worksTab")}</TabsTrigger>
          <TabsTrigger value="colloquium" className="rounded-xl py-2 font-bold">{jt("common.colloquium")}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 focus-visible:outline-none">
          {selectedCourse && selectedSession ? (
            <DailyGradingPanel
              userId={userId}
              course={selectedCourse}
              session={selectedSession}
              canGrade={gradeGate.canGrade}
              isChecking={gradeGate.isChecking}
            />
          ) : <div className="rounded-3xl bg-card p-6 shadow-sm"><EmptyState icon={Clock3} mesaj={jt("teacher.noSessions")} /></div>}
        </TabsContent>

        <TabsContent value="works" className="mt-4 focus-visible:outline-none">
          {selectedCourse ? <AssessmentPanel course={selectedCourse} /> : null}
        </TabsContent>

        <TabsContent value="colloquium" className="mt-4 focus-visible:outline-none">
          {selectedCourse ? <ColloquiumPanel courseId={selectedCourse.id} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DailyGradingPanel({
  userId,
  course,
  session,
  canGrade,
  isChecking,
}: {
  userId: string;
  course: CourseRow;
  session: SessionRow;
  canGrade: boolean;
  isChecking: boolean;
}) {
  const queryClient = useQueryClient();
  const { t: jt, formatDate: formatLessonDate, formatTime: formatLessonTime } = useJournalI18n();
  const [topic, setTopic] = useState(session.movzu ?? "");
  const [drafts, setDrafts] = useState<Record<string, DailyDraft>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery<LessonRecordRow[]>({
    queryKey: ["ejournal-lesson-records", session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_student_records")
        .select("*")
        .eq("lesson_session_id", session.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as LessonRecordRow[];
    },
  });

  const studentIds = useMemo(() => records.map((record) => record.student_id), [records]);
  const { data: profiles = [] } = useQuery<ProfileLite[]>({
    queryKey: ["ejournal-daily-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, istifadeci_adi")
        .in("user_id", studentIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.user_id, profile])), [profiles]);
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) =>
      compareStudentProfilesBySurnameThenName(profileMap.get(a.student_id), profileMap.get(b.student_id)),
    ),
    [records, profileMap],
  );

  useEffect(() => {
    setTopic(session.movzu ?? "");
  }, [session.id, session.movzu]);

  useEffect(() => {
    const next: Record<string, DailyDraft> = {};
    records.forEach((record) => {
      next[record.student_id] = {
        attendanceStatus: record.attendance_status,
        grade: record.grade === null ? "" : String(record.grade),
        labSubmitted: Boolean(record.lab_submitted),
      };
    });
    setDrafts(next);
  }, [session.id, records]);

  const locked = session.is_confirmed;
  const disabled = locked || !canGrade || isChecking;
  const allAttendanceSelected = records.length > 0 && records.every((record) => drafts[record.student_id]?.attendanceStatus);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!topic.trim()) throw new Error(jt("teacher.topicRequired"));
      if (!allAttendanceSelected) throw new Error(jt("teacher.attendanceRequired"));
      const payload = records.map((record) => {
        const draft = drafts[record.student_id];
        const parsed = draft?.grade === "" || draft?.grade === undefined ? null : Number(draft.grade);
        if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 10)) {
          throw new Error(jt("teacher.studentGradeRange", { student: profileName(profileMap.get(record.student_id), jt("common.student")) }));
        }
        return {
          studentId: record.student_id,
          attendanceStatus: draft!.attendanceStatus!,
          grade: draft?.attendanceStatus === "qayıb" ? null : parsed,
          labSubmitted: draft?.attendanceStatus === "qayıb" ? false : Boolean(draft?.labSubmitted),
        };
      });

      const result = await confirmLessonGrading({
        data: { lessonId: session.id, topic: topic.trim(), records: payload },
      });
      if (!result.confirmed) throw new Error(jt("teacher.confirmFailed"));
    },
    onSuccess: () => {
      toast.success(jt("teacher.confirmSuccess"));
      setConfirmOpen(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ejournal-teacher-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["ejournal-lesson-records", session.id] }),
        queryClient.invalidateQueries({ queryKey: ["student-ejournal"] }),
        queryClient.invalidateQueries({ queryKey: ["can-grade-now", session.id, userId] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateDraft = (studentId: string, patch: Partial<DailyDraft>) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { attendanceStatus: null, grade: "", labSubmitted: false }), ...patch },
    }));
  };

  if (isLoading) {
    return <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{jt("teacher.dailyTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatLessonDate(session.starts_at)} • {formatLessonTime(session.starts_at)}–{formatLessonTime(session.ends_at)}</p>
        </div>
        {locked ? <Badge variant="secondary" className="gap-1.5 rounded-full"><LockKeyhole className="size-3.5" /> {jt("common.confirmed")}</Badge> : canGrade ? <Badge className="gap-1.5 rounded-full"><CheckCircle2 className="size-3.5" /> {jt("teacher.activeLesson")}</Badge> : null}
      </div>

      {locked ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" />
          <p>{jt("teacher.lockedHint")}</p>
        </div>
      ) : !canGrade ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-foreground">
          {isChecking ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />}
          <p>{jt("teacher.windowClosedHint")}</p>
        </div>
      ) : null}

      {course.qiymetlendirme_novu === null ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{jt("teacher.courseConfigHint")}</p>
        </div>
      ) : null}

      <div className="mb-4 space-y-2">
        <Label htmlFor={`lesson-topic-${session.id}`}>{jt("common.topic")}</Label>
        <Textarea
          id={`lesson-topic-${session.id}`}
          value={topic}
          disabled={disabled || course.qiymetlendirme_novu === null}
          onChange={(event) => setTopic(event.target.value)}
          placeholder={jt("teacher.topicPlaceholder")}
          className="min-h-20 rounded-xl"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-14 text-center">№</TableHead>
              <TableHead>{jt("common.student")}</TableHead>
              <TableHead className="min-w-[220px]">{jt("common.attendance")}</TableHead>
              <TableHead className="min-w-[170px]">{course.qiymetlendirme_novu === "laboratoriya" ? jt("common.laboratory") : jt("common.grade")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">{jt("teacher.noStudentRecords")}</TableCell></TableRow>
            ) : sortedRecords.map((record, index) => {
              const draft = drafts[record.student_id] ?? { attendanceStatus: null, grade: "", labSubmitted: false };
              const absent = draft.attendanceStatus === "qayıb";
              return (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">{profileName(profileMap.get(record.student_id), `${jt("common.student")} ${index + 1}`)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{profileMap.get(record.student_id)?.istifadeci_adi ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={draft.attendanceStatus === "iştirak edib" ? "default" : "outline"}
                        disabled={disabled || course.qiymetlendirme_novu === null}
                        className="rounded-xl"
                        onClick={() => updateDraft(record.student_id, { attendanceStatus: "iştirak edib" })}
                      >{jt("common.present")}</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={absent ? "destructive" : "outline"}
                        disabled={disabled || course.qiymetlendirme_novu === null}
                        className="rounded-xl"
                        onClick={() => updateDraft(record.student_id, { attendanceStatus: "qayıb", grade: "", labSubmitted: false })}
                      >{jt("common.absent")}</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.qiymetlendirme_novu === "laboratoriya" ? (
                      <label className={`inline-flex items-center gap-2 text-sm font-medium ${absent ? "text-muted-foreground" : "text-foreground"}`}>
                        <Checkbox
                          checked={draft.labSubmitted}
                          disabled={disabled || absent}
                          onCheckedChange={(checked) => updateDraft(record.student_id, { labSubmitted: checked === true })}
                        />
                        {jt("teacher.labSubmitted")}
                      </label>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step="0.1"
                        value={draft.grade}
                        disabled={disabled || absent || course.qiymetlendirme_novu === null}
                        onChange={(event) => updateDraft(record.student_id, { grade: event.target.value })}
                        placeholder="0–10"
                        className="w-28 rounded-xl"
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          className="rounded-xl font-bold"
          disabled={disabled || course.qiymetlendirme_novu === null || records.length === 0 || !allAttendanceSelected || !topic.trim()}
          onClick={() => setConfirmOpen(true)}
        >
          {confirmMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LockKeyhole className="mr-2 size-4" />}
          {jt("teacher.confirmAll")}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{jt("teacher.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {jt("teacher.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{jt("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              disabled={confirmMutation.isPending}
              onClick={(event) => { event.preventDefault(); confirmMutation.mutate(); }}
            >
              {confirmMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              {jt("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function AssessmentPanel({ course }: { course: CourseRow }) {
  const queryClient = useQueryClient();
  const { t: jt } = useJournalI18n();
  const [gradeEdits, setGradeEdits] = useState<Record<string, string>>({});

  const { data: independent = [], isLoading: independentLoading } = useQuery<IndependentRow[]>({
    queryKey: ["ejournal-independent-assessments", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("independent_work_assessments")
        .select("*")
        .eq("course_id", course.id)
        .order("student_id")
        .order("sira");
      if (error) throw error;
      return (data ?? []) as IndependentRow[];
    },
  });

  const { data: courseWorks = [], isLoading: courseWorkLoading } = useQuery<CourseWorkRow[]>({
    queryKey: ["ejournal-coursework-assessments", course.id],
    enabled: course.kurs_isi_var,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_work_assessments")
        .select("*")
        .eq("course_id", course.id)
        .order("student_id");
      if (error) throw error;
      return (data ?? []) as CourseWorkRow[];
    },
  });

  const items = useMemo<AssessmentItem[]>(() => {
    const independentItems: AssessmentItem[] = independent.map((row) => ({ kind: "independent", row, maxGrade: 5, label: jt("teacher.independentLabel", { n: row.sira }) }));
    const courseItems: AssessmentItem[] = course.kurs_isi_var ? courseWorks.map((row) => ({ kind: "coursework", row, maxGrade: 10, label: jt("common.courseWork") })) : [];
    return [...independentItems, ...courseItems].filter((item) => item.row.file_url || item.row.submitted_at || item.row.status !== "gozleyir");
  }, [independent, courseWorks, course.kurs_isi_var, jt]);

  const studentIds = useMemo(() => [...new Set(items.map((item) => item.row.student_id))], [items]);
  const { data: profiles = [] } = useQuery<ProfileLite[]>({
    queryKey: ["ejournal-assessment-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, ad, soyad, istifadeci_adi").in("user_id", studentIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.user_id, profile])), [profiles]);
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => {
      const byStudent = compareStudentProfilesBySurnameThenName(
        profileMap.get(a.row.student_id),
        profileMap.get(b.row.student_id),
      );
      return byStudent || a.row.sira - b.row.sira;
    }),
    [items, profileMap],
  );

  useEffect(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => { next[item.row.id] = item.row.grade === null ? "" : String(item.row.grade); });
    setGradeEdits(next);
  }, [items]);

  const saveMutation = useMutation({
    mutationFn: async (item: AssessmentItem) => {
      const raw = gradeEdits[item.row.id];
      if (raw === undefined || raw === "") throw new Error(jt("teacher.gradeRequired"));
      const grade = Number(raw);
      if (!Number.isFinite(grade) || grade < 0 || grade > item.maxGrade) {
        throw new Error(jt("teacher.gradeRange", { max: item.maxGrade }));
      }
      const table = item.kind === "independent" ? "independent_work_assessments" : "course_work_assessments";
      const { error } = await supabase
        .from(table)
        .update({ grade, status: "qiymetlendirilib" })
        .eq("id", item.row.id);
      if (error) throw error;
    },
    onSuccess: (_data, item) => {
      toast.success(jt("teacher.workGraded", { work: item.label }));
      void queryClient.invalidateQueries({ queryKey: [item.kind === "independent" ? "ejournal-independent-assessments" : "ejournal-coursework-assessments", course.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (independentLoading || courseWorkLoading) {
    return <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold">{jt("teacher.worksTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{jt("teacher.worksHint")}</p>
      </div>
      {items.length === 0 ? <EmptyState icon={FileText} mesaj={jt("teacher.noSubmittedWork")} /> : (
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>{jt("common.student")}</TableHead><TableHead>{jt("teacher.work")}</TableHead><TableHead>{jt("common.topic")}</TableHead><TableHead>{jt("common.file")}</TableHead><TableHead className="w-36">{jt("common.grade")}</TableHead><TableHead className="w-32" /></TableRow></TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={`${item.kind}-${item.row.id}`}>
                  <TableCell className="font-semibold">{profileName(profileMap.get(item.row.student_id))}</TableCell>
                  <TableCell><Badge variant="outline" className="rounded-full">{item.label}</Badge></TableCell>
                  <TableCell className="max-w-[260px] truncate" title={item.row.topic ?? ""}>{item.row.topic || "—"}</TableCell>
                  <TableCell>{item.row.file_url ? <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => void openSignedSubmission(item.row.file_url!, jt("common.fileOpenError"))}><ExternalLink className="mr-1.5 size-3.5" /> {jt("common.view")}</Button> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Input type="number" min={0} max={item.maxGrade} step="0.1" value={gradeEdits[item.row.id] ?? ""} onChange={(event) => setGradeEdits((current) => ({ ...current, [item.row.id]: event.target.value }))} placeholder={`0–${item.maxGrade}`} className="rounded-xl" /></TableCell>
                  <TableCell className="text-right"><Button type="button" size="sm" className="rounded-xl" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(item)}>{saveMutation.isPending && saveMutation.variables?.row.id === item.row.id ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />} {jt("common.save")}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function ColloquiumPanel({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const { t: jt } = useJournalI18n();
  const [edits, setEdits] = useState<Record<string, { date: string; grade: string }>>({});

  const { data: rows = [], isLoading } = useQuery<ColloquiumRow[]>({
    queryKey: ["ejournal-colloquiums", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colloquium_assessments")
        .select("*")
        .eq("course_id", courseId)
        .order("student_id")
        .order("sira");
      if (error) throw error;
      return (data ?? []) as ColloquiumRow[];
    },
  });

  const studentIds = useMemo(() => [...new Set(rows.map((row) => row.student_id))], [rows]);
  const { data: profiles = [] } = useQuery<ProfileLite[]>({
    queryKey: ["ejournal-colloquium-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, ad, soyad, istifadeci_adi").in("user_id", studentIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.user_id, profile])), [profiles]);

  const grouped = useMemo(() => {
    const map = new Map<string, ColloquiumRow[]>();
    rows.forEach((row) => map.set(row.student_id, [...(map.get(row.student_id) ?? []), row]));
    return [...map.entries()].sort(([aStudentId], [bStudentId]) =>
      compareStudentProfilesBySurnameThenName(profileMap.get(aStudentId), profileMap.get(bStudentId)),
    );
  }, [rows, profileMap]);

  useEffect(() => {
    const next: Record<string, { date: string; grade: string }> = {};
    rows.forEach((row) => { next[row.id] = { date: row.tarix ?? "", grade: row.grade === null ? "" : String(row.grade) }; });
    setEdits(next);
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const studentRows = rows.filter((row) => row.student_id === studentId);
      const payload = studentRows.map((row) => {
        const edit = edits[row.id] ?? { date: "", grade: "" };
        const grade = edit.grade === "" ? null : Number(edit.grade);
        if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 10)) {
          throw new Error(jt("teacher.colloquiumRange", { n: row.sira }));
        }
        return { course_id: courseId, student_id: studentId, sira: row.sira, tarix: edit.date || null, grade };
      });
      const { error } = await supabase.from("colloquium_assessments").upsert(payload, { onConflict: "course_id,student_id,sira" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(jt("teacher.colloquiumSaved"));
      void queryClient.invalidateQueries({ queryKey: ["ejournal-colloquiums", courseId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold">{jt("teacher.colloquiumPanel")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{jt("teacher.colloquiumHint")}</p>
      </div>
      {grouped.length === 0 ? <EmptyState icon={FlaskConical} mesaj={jt("teacher.noColloquium")} /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {grouped.map(([studentId, studentRows]) => (
            <div key={studentId} className="overflow-hidden rounded-2xl border border-border/70 bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div><div className="font-bold text-foreground">{profileName(profileMap.get(studentId))}</div><div className="text-xs text-muted-foreground">{profileMap.get(studentId)?.istifadeci_adi ?? ""}</div></div>
                <Button type="button" size="sm" className="rounded-xl" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(studentId)}>{saveMutation.isPending && saveMutation.variables === studentId ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />} {jt("common.save")}</Button>
              </div>
              <Table>
                <TableHeader className="bg-muted/40"><TableRow><TableHead className="w-14 text-center">№</TableHead><TableHead>{jt("common.date")}</TableHead><TableHead>{jt("common.grade")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {studentRows.sort((a, b) => a.sira - b.sira).map((row) => {
                    const edit = edits[row.id] ?? { date: "", grade: "" };
                    return <TableRow key={row.id}><TableCell className="text-center font-semibold">{row.sira}</TableCell><TableCell><Input type="date" value={edit.date} onChange={(event) => setEdits((current) => ({ ...current, [row.id]: { ...edit, date: event.target.value } }))} className="min-w-36 rounded-xl" /></TableCell><TableCell><Input type="number" min={0} max={10} step="0.1" value={edit.grade} onChange={(event) => setEdits((current) => ({ ...current, [row.id]: { ...edit, grade: event.target.value } }))} placeholder="0–10" className="w-28 rounded-xl" /></TableCell></TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
