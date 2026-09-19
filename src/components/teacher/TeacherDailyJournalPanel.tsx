import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FlaskConical,
  History,
  Loader2,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Save,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCanGradeNow } from "@/hooks/use-can-grade-now";
import { supabase } from "@/integrations/supabase/client";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import {
  bakuDayKey,
  fetchTeacherLessonSessions,
  fetchTeacherSessionRoomMaps,
  resolveTeacherSessionRoom,
  teacherSessionIsActive,
  type TeacherLessonSession,
} from "@/lib/teacher-sessions";
import { useTeacherJournalI18n } from "@/lib/teacher-journal-i18n";
import { cn } from "@/lib/utils";
import "@/teacher-daily-journal.css";

type CourseLite = {
  id: string;
  ad: string;
  otaq?: string | null;
  otaqlar?: unknown;
  qiymetlendirme_novu: "laboratoriya" | "meshgele" | null;
};

type SessionRow = TeacherLessonSession;

type LessonRecord = {
  id: string;
  lesson_session_id: string;
  student_id: string;
  course_id: string;
  attendance_status: "iştirak edib" | "qayıb" | null;
  grade: number | null;
  lab_submitted: boolean | null;
};

type ProfileLite = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  istifadeci_adi: string | null;
};

type MemberRow = { user_id: string; profiles: ProfileLite | null };
type AttendanceValue = "iştirak edib" | "qayıb" | null;
type LabValue = boolean | null;
type Draft = { attendance: AttendanceValue; grade: string; lab: LabValue };
type LessonMode = "lecture" | "graded" | "lab" | "unsupported";

type DisplayStudent = {
  userId: string;
  profile: ProfileLite | null;
  record: LessonRecord | null;
};

type SavePayloadRow = {
  student_id: string;
  attendance_status: Exclude<AttendanceValue, null>;
  grade: number | null;
  lab_submitted: boolean | null;
};

function monotonicNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function profileName(profile: ProfileLite | null | undefined, fallback: string) {
  if (!profile) return fallback;
  return [profile.ad, profile.soyad].filter(Boolean).join(" ") || profile.istifadeci_adi || fallback;
}

function lessonTypeKey(type: string | null) {
  const value = (type ?? "").trim().toLocaleLowerCase("az");
  if (value === "muhazire" || value === "mühazirə") return "lecture" as const;
  if (value === "seminar") return "seminar" as const;
  if (value === "laboratoriya") return "laboratory" as const;
  if (value === "tecrube" || value === "təcrübə" || value === "meshgele" || value === "məşğələ") return "practice" as const;
  if (value === "kollokvium") return "colloquium" as const;
  if (value === "serbest_is" || value === "sərbəst iş") return "independent" as const;
  return "lesson" as const;
}

function lessonMode(type: string | null): LessonMode {
  const key = lessonTypeKey(type);
  if (key === "lecture") return "lecture";
  if (key === "laboratory") return "lab";
  if (key === "seminar" || key === "practice") return "graded";
  return "unsupported";
}

function writeErrorMessage(error: unknown, fallback: string, offline: string) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return offline;
  return error instanceof Error && error.message ? error.message : fallback;
}

export function TeacherDailyJournalPanel({
  userId,
  groupId,
  course,
  permissions,
  initialSessionId,
}: {
  userId: string;
  groupId: string;
  course: CourseLite;
  permissions: Record<string, boolean>;
  initialSessionId?: string;
}) {
  const { t, formatShortDate, formatWeekday, formatTime } = useTeacherJournalI18n();
  const [clockTick, setClockTick] = useState(0);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [dirtySessionId, setDirtySessionId] = useState<string | null>(null);
  const appliedInitialSessionId = useRef<string | undefined>(undefined);

  const serverClockQuery = useQuery<{ serverMs: number; sampledAt: number }>({
    queryKey: ["teacher-daily-journal-server-clock", userId],
    queryFn: async () => {
      const startedAt = monotonicNow();
      const { data, error } = await supabase.rpc("ejournal_server_now");
      const finishedAt = monotonicNow();
      if (error) throw error;
      const serverMs = new Date(data).getTime();
      if (!Number.isFinite(serverMs)) throw new Error(t("loadErrorDescription"));
      return { serverMs: serverMs + Math.max(0, finishedAt - startedAt) / 2, sampledAt: finishedAt };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const nowMs = useMemo(() => {
    void clockTick;
    if (!serverClockQuery.data) return null;
    return serverClockQuery.data.serverMs + Math.max(0, monotonicNow() - serverClockQuery.data.sampledAt);
  }, [clockTick, serverClockQuery.data]);

  const sessionsQuery = useQuery<SessionRow[]>({
    queryKey: ["teacher-daily-journal-sessions", userId, groupId, course.id],
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    queryFn: () => fetchTeacherLessonSessions({
      userId,
      courseId: course.id,
      groupId,
      limit: 180,
    }),
  });

  const rosterQuery = useQuery<MemberRow[]>({
    queryKey: ["teacher-daily-journal-roster", userId, groupId, course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, profiles:user_id(user_id, ad, soyad, istifadeci_adi)")
        .eq("group_id", groupId);
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
    },
  });

  const teacherProfileQuery = useQuery<ProfileLite | null>({
    queryKey: ["teacher-daily-journal-teacher-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, istifadeci_adi")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileLite | null;
    },
  });

  const sessions = sessionsQuery.data ?? [];
  const roster = rosterQuery.data ?? [];
  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => compareStudentProfilesBySurnameThenName(a.profiles, b.profiles)),
    [roster],
  );

  const roomMapsQuery = useQuery({
    queryKey: ["teacher-daily-journal-room-maps", userId, groupId, course.id, sessions.map((session) => session.id).join(",")],
    enabled: sessions.length > 0,
    queryFn: () => fetchTeacherSessionRoomMaps(sessions),
  });

  const dayGroups = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    sessions.forEach((session) => {
      const key = bakuDayKey(session.starts_at);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    });
    return [...map.entries()]
      .map(([key, rows]) => ({ key, sessions: rows.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)) }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions]);

  const todayKey = nowMs == null ? "" : bakuDayKey(new Date(nowMs));
  const deepLinkedSession = useMemo(
    () => initialSessionId ? sessions.find((session) => session.id === initialSessionId) ?? null : null,
    [initialSessionId, sessions],
  );

  useEffect(() => {
    if (!deepLinkedSession || appliedInitialSessionId.current === deepLinkedSession.id || nowMs == null || dirtySessionId) return;
    appliedInitialSessionId.current = deepLinkedSession.id;
    setSelectedDay(bakuDayKey(deepLinkedSession.starts_at));
    setSelectedSessionId(deepLinkedSession.id);
  }, [deepLinkedSession, nowMs, dirtySessionId]);

  useEffect(() => {
    if (dirtySessionId || nowMs == null) return;
    if (deepLinkedSession && appliedInitialSessionId.current === deepLinkedSession.id) return;
    if (selectedDay && dayGroups.some((day) => day.key === selectedDay)) return;
    const active = sessions.find((session) => teacherSessionIsActive(session, nowMs));
    if (active) {
      setSelectedDay(bakuDayKey(active.starts_at));
      setSelectedSessionId(active.id);
      return;
    }
    const today = dayGroups.find((day) => day.key === todayKey);
    if (today) {
      setSelectedDay(today.key);
      return;
    }
    const past = dayGroups.filter((day) => day.key < todayKey).at(-1);
    const future = dayGroups.find((day) => day.key > todayKey);
    setSelectedDay(past?.key ?? future?.key ?? dayGroups[0]?.key ?? "");
  }, [dayGroups, sessions, selectedDay, nowMs, todayKey, dirtySessionId, deepLinkedSession]);

  const selectedDayIndex = dayGroups.findIndex((day) => day.key === selectedDay);
  const selectedDayGroup = selectedDayIndex >= 0 ? dayGroups[selectedDayIndex] : null;

  useEffect(() => {
    if (dirtySessionId || !selectedDayGroup || nowMs == null) return;
    if (selectedSessionId && selectedDayGroup.sessions.some((session) => session.id === selectedSessionId)) return;
    const active = selectedDayGroup.sessions.find((session) => teacherSessionIsActive(session, nowMs));
    if (active) {
      setSelectedSessionId(active.id);
      return;
    }
    const upcoming = selectedDayGroup.sessions.find((session) => +new Date(session.starts_at) > nowMs);
    setSelectedSessionId((upcoming ?? selectedDayGroup.sessions.at(-1))?.id ?? "");
  }, [selectedDayGroup, selectedSessionId, nowMs, dirtySessionId]);

  useBlocker({
    shouldBlockFn: () => Boolean(dirtySessionId) && !window.confirm(t("leaveWarning")),
    enableBeforeUnload: () => Boolean(dirtySessionId),
  });

  const handleDirtyChange = useCallback((sessionId: string, dirty: boolean) => {
    setDirtySessionId((current) => {
      if (dirty) return sessionId;
      return current === sessionId ? null : current;
    });
  }, []);

  const allowInternalChange = useCallback(() => {
    if (!dirtySessionId) return true;
    const allowed = window.confirm(t("leaveWarning"));
    if (allowed) setDirtySessionId(null);
    return allowed;
  }, [dirtySessionId, t]);

  const selectDay = (dayKey: string) => {
    if (dayKey === selectedDay || !allowInternalChange()) return;
    setSelectedDay(dayKey);
    setSelectedSessionId("");
  };

  const selectSession = (sessionId: string) => {
    if (sessionId === selectedSessionId || !allowInternalChange()) return;
    setSelectedSessionId(sessionId);
  };

  function moveDay(direction: -1 | 1) {
    const next = dayGroups[selectedDayIndex + direction];
    if (!next || !allowInternalChange()) return;
    setSelectedDay(next.key);
    setSelectedSessionId("");
  }

  const isLoading = sessionsQuery.isLoading || rosterQuery.isLoading || serverClockQuery.isLoading || (sessions.length > 0 && roomMapsQuery.isLoading);
  const isError = sessionsQuery.isError || rosterQuery.isError || serverClockQuery.isError || roomMapsQuery.isError;

  if (isLoading) return <JournalSkeleton />;

  if (isError || nowMs == null) {
    return (
      <JournalError
        onRetry={() => void Promise.all([sessionsQuery.refetch(), rosterQuery.refetch(), serverClockQuery.refetch(), roomMapsQuery.refetch()])}
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <section className="teacher-daily-journal rounded-[28px] border border-border/60 bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold text-foreground">{t("title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("description")}</p></div>
          <Badge variant="outline" className="rounded-full">{t("readOnly")}</Badge>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-14 text-center">
          <Clock3 className="mx-auto size-10 text-muted-foreground/65" />
          <h3 className="mt-4 text-base font-bold">{t("noSessions")}</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{t("noSessionsHint")}</p>
        </div>
      </section>
    );
  }

  const selectedSession = selectedDayGroup?.sessions.find((session) => session.id === selectedSessionId) ?? null;
  const activeSession = sessions.find((session) => teacherSessionIsActive(session, nowMs)) ?? null;
  const teacherName = profileName(teacherProfileQuery.data, t("teacher"));

  return (
    <section className="teacher-daily-journal rounded-[28px] border border-border/60 bg-card p-3 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:px-0">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5"><Clock3 className="size-3.5" />{t("serverTime")}: {formatTime(new Date(nowMs))}</Badge>
          {activeSession ? (
            <Badge className="gap-2 rounded-full px-3 py-1.5"><span className="teacher-journal-live-dot size-2 rounded-full bg-current" />{t("active")}</Badge>
          ) : (
            <Badge variant="outline" className="rounded-full px-3 py-1.5">{t("readOnly")}</Badge>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/65 bg-muted/15 p-2.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground"><CalendarDays className="size-4 text-primary" />{t("days")}</div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" className="size-11 rounded-xl" disabled={selectedDayIndex <= 0} aria-label={t("previousDay")} onClick={() => moveDay(-1)}><ChevronLeft className="size-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="size-11 rounded-xl" disabled={selectedDayIndex < 0 || selectedDayIndex >= dayGroups.length - 1} aria-label={t("nextDay")} onClick={() => moveDay(1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>

        <div className="teacher-journal-day-strip">
          {dayGroups.map((day) => {
            const sample = day.sessions[0]!;
            const selected = day.key === selectedDay;
            const active = day.sessions.some((session) => teacherSessionIsActive(session, nowMs));
            const past = day.sessions.every((session) => +new Date(session.ends_at) <= nowMs);
            return (
              <button
                key={day.key}
                type="button"
                className={cn(
                  "teacher-journal-day relative rounded-2xl border px-3 py-2.5 text-left",
                  selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-card hover:border-primary/25",
                )}
                onClick={() => selectDay(day.key)}
              >
                <div className={cn("text-[10px] font-bold uppercase tracking-[.08em]", selected ? "text-primary-foreground/75" : "text-muted-foreground")}>{day.key === todayKey ? t("today") : formatWeekday(sample.starts_at)}</div>
                <div className="mt-0.5 whitespace-nowrap text-sm font-black">{formatShortDate(sample.starts_at)}</div>
                <div className={cn("mt-1 flex items-center gap-1 text-[10px] font-semibold", selected ? "text-primary-foreground/75" : active ? "text-primary" : "text-muted-foreground")}>
                  {active ? <span className="teacher-journal-live-dot size-1.5 rounded-full bg-current" /> : past ? <LockKeyhole className="size-3" /> : <Clock3 className="size-3" />}
                  {active ? t("active") : past ? t("past") : t("future")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDayGroup ? (
        <div className="mt-3">
          <div className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{t("lessonsOnDay", { count: selectedDayGroup.sessions.length })}</div>
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectedDayGroup.sessions.map((session) => {
              const selected = session.id === selectedSessionId;
              const active = teacherSessionIsActive(session, nowMs);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    "teacher-journal-touch min-w-[160px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    selected ? "border-primary/35 bg-primary/[.06]" : "border-border/70 bg-background hover:border-primary/25",
                  )}
                >
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-foreground">{formatTime(session.starts_at)}–{formatTime(session.ends_at)}</span>{active ? <span className="teacher-journal-live-dot size-2 rounded-full bg-primary" /> : null}</div>
                  <div className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{t(lessonTypeKey(session.dars_novu))}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedSession ? (
        <JournalSessionDetail
          key={selectedSession.id}
          userId={userId}
          course={course}
          session={selectedSession}
          permissions={permissions}
          roster={sortedRoster}
          nowMs={nowMs}
          teacherName={teacherName}
          room={roomMapsQuery.data ? resolveTeacherSessionRoom(selectedSession, roomMapsQuery.data) ?? "—" : "—"}
          onDirtyChange={handleDirtyChange}
        />
      ) : null}
    </section>
  );
}

function JournalSessionDetail({
  userId,
  course,
  session,
  permissions,
  roster,
  nowMs,
  teacherName,
  room,
  onDirtyChange,
}: {
  userId: string;
  course: CourseLite;
  session: SessionRow;
  permissions: Record<string, boolean>;
  roster: MemberRow[];
  nowMs: number;
  teacherName: string;
  room: string;
  onDirtyChange: (sessionId: string, dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { t, formatDate, formatTime } = useTeacherJournalI18n();
  const [topic, setTopic] = useState(session.movzu ?? "");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dirty, setDirty] = useState(false);

  const strictActive = teacherSessionIsActive(session, nowMs);
  const isPast = +new Date(session.ends_at) <= nowMs;
  const isFuture = +new Date(session.starts_at) > nowMs;
  const mode = lessonMode(session.dars_novu);
  const isLab = mode === "lab";
  const supportsGrade = mode === "graded" || mode === "lab";

  const gradeGate = useCanGradeNow({
    lessonId: session.id,
    teacherId: userId,
    sessionTeacherId: session.teacher_id,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    lessonType: session.dars_novu,
    permissions,
    now: new Date(nowMs),
    enabled: strictActive && !session.is_confirmed && mode !== "unsupported",
  });

  const recordsQuery = useQuery<LessonRecord[]>({
    queryKey: ["teacher-daily-journal-records", userId, course.id, session.group_id, session.id],
    refetchInterval: strictActive && !dirty ? 20_000 : false,
    refetchOnWindowFocus: !dirty,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_student_records")
        .select("id, lesson_session_id, student_id, course_id, attendance_status, grade, lab_submitted")
        .eq("lesson_session_id", session.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as LessonRecord[];
    },
  });

  const records = recordsQuery.data ?? [];
  const recordIds = useMemo(() => [...new Set(records.map((record) => record.student_id))], [records]);
  const historicalProfilesQuery = useQuery<ProfileLite[]>({
    queryKey: ["teacher-daily-journal-record-profiles", userId, course.id, session.id, recordIds.join(",")],
    enabled: recordIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, ad, soyad, istifadeci_adi").in("user_id", recordIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });
  const historicalProfiles = historicalProfilesQuery.data ?? [];

  const displayStudents = useMemo<DisplayStudent[]>(() => {
    const rosterProfiles = new Map(roster.map((row) => [row.user_id, row.profiles]));
    historicalProfiles.forEach((profile) => rosterProfiles.set(profile.user_id, profile));
    if (records.length > 0) {
      return records
        .map((record) => ({ userId: record.student_id, profile: rosterProfiles.get(record.student_id) ?? null, record }))
        .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profile, b.profile));
    }
    return roster
      .map((row) => ({ userId: row.user_id, profile: row.profiles, record: null }))
      .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profile, b.profile));
  }, [records, roster, historicalProfiles]);

  useEffect(() => {
    if (dirty) return;
    const next: Record<string, Draft> = {};
    displayStudents.forEach((student) => {
      next[student.userId] = {
        attendance: student.record?.attendance_status ?? null,
        grade: student.record?.grade == null ? "" : String(student.record.grade),
        lab: student.record?.lab_submitted ?? null,
      };
    });
    setDrafts(next);
    setTopic(session.movzu ?? "");
  }, [session.id, session.movzu, displayStudents, dirty]);

  useEffect(() => {
    onDirtyChange(session.id, dirty);
    return () => onDirtyChange(session.id, false);
  }, [session.id, dirty, onDirtyChange]);

  const editable = strictActive && !session.is_confirmed && mode !== "unsupported" && gradeGate.canGrade && !gradeGate.isChecking;
  const allAttendanceSelected = displayStudents.length > 0 && displayStudents.every((student) => drafts[student.userId]?.attendance != null);
  const allLabStatusesSelected = !isLab || displayStudents.every((student) => {
    const draft = drafts[student.userId];
    return draft?.attendance === "qayıb" || (draft?.attendance === "iştirak edib" && draft.lab != null);
  });
  const presentCount = displayStudents.filter((student) => drafts[student.userId]?.attendance === "iştirak edib").length;
  const absentCount = displayStudents.filter((student) => drafts[student.userId]?.attendance === "qayıb").length;
  const canSubmit = editable && allAttendanceSelected && allLabStatusesSelected && displayStudents.length > 0;

  const buildPayload = useCallback((): SavePayloadRow[] => {
    if (!allAttendanceSelected) throw new Error(t("attendanceRequired"));
    if (!allLabStatusesSelected) throw new Error(t("labStatusRequired"));

    return displayStudents.map((student) => {
      const draft = drafts[student.userId] ?? { attendance: null, grade: "", lab: null };
      if (draft.attendance == null) throw new Error(t("attendanceRequired"));
      const rawGrade = draft.grade.trim();
      const grade = rawGrade === "" ? null : Number(rawGrade);
      if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 10)) {
        throw new Error(t("gradeRange", { student: profileName(student.profile, t("student")) }));
      }
      const absent = draft.attendance === "qayıb";
      return {
        student_id: student.userId,
        attendance_status: draft.attendance,
        grade: absent || !supportsGrade ? null : grade,
        lab_submitted: isLab ? (absent ? false : draft.lab) : null,
      };
    });
  }, [allAttendanceSelected, allLabStatusesSelected, displayStudents, drafts, isLab, supportsGrade, t]);

  const invalidateJournal = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["teacher-daily-journal-records", userId, course.id, session.group_id, session.id] }),
      queryClient.invalidateQueries({ queryKey: ["teacher-daily-journal-sessions", userId, session.group_id, course.id] }),
      queryClient.invalidateQueries({ queryKey: ["can-grade-now", session.id, userId] }),
    ]);
  }, [queryClient, userId, course.id, session.group_id, session.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editable) throw new Error(t("saveError"));
      const payload = buildPayload();
      const { error } = await supabase.rpc("save_lesson_grading_draft", {
        p_lesson_id: session.id,
        p_topic: topic.trim(),
        p_records: payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDirty(false);
      invalidateJournal();
    },
    onError: (error: unknown) => toast.error(writeErrorMessage(error, t("saveError"), t("networkSaveError"))),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!editable) throw new Error(t("confirmError"));
      const payload = buildPayload();
      const { error } = await supabase.rpc("confirm_lesson_grading", {
        p_lesson_id: session.id,
        p_topic: topic.trim(),
        p_records: payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("confirmedSuccess"));
      setDirty(false);
      invalidateJournal();
    },
    onError: (error: unknown) => toast.error(writeErrorMessage(error, t("confirmError"), t("networkSaveError"))),
  });

  function updateDraft(studentId: string, patch: Partial<Draft>) {
    if (!editable) return;
    setDrafts((current) => {
      const before = current[studentId] ?? { attendance: null, grade: "", lab: null };
      const next = { ...before, ...patch };
      if (patch.attendance === "qayıb") {
        next.grade = "";
        next.lab = isLab ? false : null;
      }
      if (!isLab) next.lab = null;
      if (!supportsGrade) next.grade = "";
      return { ...current, [studentId]: next };
    });
    setDirty(true);
  }

  function markAllPresent() {
    if (!editable) return;
    setDrafts((current) => {
      const next = { ...current };
      displayStudents.forEach((student) => {
        const before = next[student.userId] ?? { attendance: null, grade: "", lab: null };
        next[student.userId] = {
          ...before,
          attendance: "iştirak edib",
          lab: isLab ? (before.lab ?? false) : null,
          grade: supportsGrade ? before.grade : "",
        };
      });
      return next;
    });
    setDirty(true);
  }

  const status = session.is_confirmed
    ? session.auto_confirmed ? t("autoConfirmed") : t("confirmed")
    : strictActive ? t("active")
    : isFuture ? t("future")
    : session.draft_saved_at ? t("closing") : t("notCompleted");

  const modeHint = mode === "lecture" ? t("lectureHint") : mode === "lab" ? t("labHint") : mode === "graded" ? t("gradedHint") : t("unsupportedLesson");

  if (recordsQuery.isLoading || historicalProfilesQuery.isLoading) {
    return <SessionSkeleton />;
  }

  if (recordsQuery.isError || historicalProfilesQuery.isError) {
    return (
      <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/[.03] p-5 text-center">
        <ShieldAlert className="mx-auto size-8 text-destructive" />
        <h3 className="mt-3 font-bold">{t("loadErrorTitle")}</h3>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{t("loadErrorDescription")}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11 rounded-xl" onClick={() => void Promise.all([recordsQuery.refetch(), historicalProfilesQuery.refetch()])}>
          <RefreshCw className="mr-2 size-4" />{t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border/65 bg-background">
      <div className="border-b border-border/60 bg-muted/15 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={strictActive ? "default" : "outline"} className="rounded-full">{status}</Badge>
              <Badge variant="outline" className="rounded-full">{t(lessonTypeKey(session.dars_novu))}</Badge>
              {dirty ? <Badge variant="secondary" className="rounded-full">{t("changesUnsaved")}</Badge> : null}
            </div>
            <h3 className="mt-2 text-base font-black text-foreground">{formatDate(session.starts_at)} · {formatTime(session.starts_at)}–{formatTime(session.ends_at)}</h3>
            <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <span className="flex items-center gap-1.5"><UserRound className="size-3.5" />{teacherName}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{room}</span>
              <span className="flex items-center gap-1.5"><UsersRound className="size-3.5" />{t("studentsCount", { count: displayStudents.length })}</span>
              <span>{t("presentCount", { count: presentCount })} · {t("absentCount", { count: absentCount })}</span>
            </div>
          </div>
          {session.is_confirmed ? <LockKeyhole className="size-5 text-muted-foreground" /> : strictActive ? <CheckCircle2 className="size-5 text-primary" /> : isPast ? <History className="size-5 text-muted-foreground" /> : <Clock3 className="size-5 text-muted-foreground" />}
        </div>

        <div className={cn("mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5", strictActive ? "border-primary/15 bg-primary/[.04] text-foreground" : "border-border/60 bg-card text-muted-foreground")}>
          {strictActive ? <><strong>{t("liveTime")}: </strong>{modeHint}<span className="mt-1 block text-muted-foreground">{t("autoLockHint")}</span></> : isFuture ? t("futureHint") : t("pastHint")}
        </div>
      </div>

      <div className="space-y-4 p-3.5 sm:p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2"><Label className="font-bold">{t("topic")}</Label>{session.draft_saved_at ? <span className="text-[11px] text-muted-foreground">{t("savedAt", { time: formatTime(session.draft_saved_at) })}</span> : null}</div>
          {editable ? (
            <Textarea value={topic} onChange={(event) => { setTopic(event.target.value); setDirty(true); }} className="min-h-20 rounded-xl text-base sm:text-sm" placeholder={t("topicPlaceholder")} />
          ) : (
            <div className="min-h-14 rounded-xl border border-border/60 bg-muted/15 px-3 py-3 text-sm leading-6 text-foreground">{session.movzu?.trim() || t("topicNotSet")}</div>
          )}
        </div>

        {displayStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><UsersRound className="mx-auto size-8 text-muted-foreground/60" /><p className="mt-3 text-sm font-semibold text-muted-foreground">{t("emptyRoster")}</p></div>
        ) : (
          <>
            {editable ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">{t("mobileHint")}</p>
                <Button type="button" variant="outline" className="teacher-journal-touch rounded-xl font-bold" onClick={markAllPresent}><Check className="mr-1.5 size-4" />{t("allPresent")}</Button>
              </div>
            ) : null}

            <div className="teacher-journal-student-list space-y-3 md:hidden">
              {displayStudents.map((student, index) => (
                <MobileStudentCard
                  key={student.userId}
                  index={index}
                  student={student}
                  draft={drafts[student.userId] ?? { attendance: null, grade: "", lab: null }}
                  editable={editable}
                  mode={mode}
                  onChange={(patch) => updateDraft(student.userId, patch)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-border/70 md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/35 text-left text-xs font-bold text-muted-foreground">
                  <tr><th className="w-14 px-3 py-3 text-center">№</th><th className="min-w-[210px] px-3 py-3">{t("student")}</th><th className="min-w-[220px] px-3 py-3">{t("attendance")}</th><th className="min-w-[300px] px-3 py-3">{t("assessment")}</th></tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayStudents.map((student, index) => (
                    <DesktopStudentRow
                      key={student.userId}
                      index={index}
                      student={student}
                      draft={drafts[student.userId] ?? { attendance: null, grade: "", lab: null }}
                      editable={editable}
                      mode={mode}
                      onChange={(patch) => updateDraft(student.userId, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {strictActive && mode !== "unsupported" ? (
          <div className="teacher-journal-save-dock">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className={cn("text-xs font-bold", dirty ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>
                  {dirty ? t("saveStateUnsaved") : session.is_confirmed ? t("saveStateLocked") : t("saveStateReady")}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{!allAttendanceSelected ? t("attendanceRequired") : !allLabStatusesSelected ? t("labStatusRequired") : t("autoLockHint")}</div>
              </div>
              <div className="teacher-journal-action-grid">
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-journal-touch rounded-xl px-5 font-black"
                  disabled={!canSubmit || saveMutation.isPending || confirmMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  {saveMutation.isPending ? t("saving") : t("saveDraft")}
                </Button>
                <Button
                  type="button"
                  className="teacher-journal-touch rounded-xl px-5 font-black"
                  disabled={!canSubmit || saveMutation.isPending || confirmMutation.isPending}
                  onClick={() => { if (window.confirm(t("confirmPrompt"))) confirmMutation.mutate(); }}
                >
                  {confirmMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  {confirmMutation.isPending ? t("confirming") : t("confirmFinal")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MobileStudentCard({
  index,
  student,
  draft,
  editable,
  mode,
  onChange,
}: {
  index: number;
  student: DisplayStudent;
  draft: Draft;
  editable: boolean;
  mode: LessonMode;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const { t } = useTeacherJournalI18n();
  const absent = draft.attendance === "qayıb";
  const present = draft.attendance === "iştirak edib";
  const canGrade = mode === "graded" || mode === "lab";

  return (
    <article className="teacher-journal-mobile-card rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-black text-muted-foreground">{index + 1}</div>
        <div className="min-w-0 flex-1"><h4 className="truncate text-sm font-black text-foreground">{profileName(student.profile, `${t("student")} ${index + 1}`)}</h4>{student.profile?.istifadeci_adi ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.profile.istifadeci_adi}</p> : null}</div>
        {!editable && draft.attendance ? <Badge variant={absent ? "destructive" : "secondary"} className="rounded-full text-[10px]">{absent ? t("absent") : t("present")}</Badge> : null}
      </div>

      {mode === "lab" ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.07em] text-muted-foreground"><FlaskConical className="size-3.5" />{t("labStatus")}</div>
          {editable ? (
            <div className="teacher-journal-lab-choice-grid">
              <button type="button" className={cn("teacher-journal-touch rounded-xl border px-3 py-2.5 text-left text-xs font-black", present && draft.lab === true ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")} onClick={() => onChange({ attendance: "iştirak edib", lab: true })}>{t("labPresentSubmitted")}</button>
              <button type="button" className={cn("teacher-journal-touch rounded-xl border px-3 py-2.5 text-left text-xs font-black", present && draft.lab === false ? "border-primary/35 bg-primary/[.06] text-primary" : "border-border bg-background")} onClick={() => onChange({ attendance: "iştirak edib", lab: false })}>{t("labPresentNotSubmitted")}</button>
              <button type="button" className={cn("teacher-journal-touch rounded-xl border px-3 py-2.5 text-left text-xs font-black", absent ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background")} onClick={() => onChange({ attendance: "qayıb", lab: false, grade: "" })}>{t("absent")}</button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm font-bold">{absent ? t("absent") : present && draft.lab === true ? t("labPresentSubmitted") : present && draft.lab === false ? t("labPresentNotSubmitted") : t("unrecorded")}</div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.07em] text-muted-foreground">{t("attendance")}</div>
          {editable ? (
            <div className="teacher-journal-status-grid">
              <button type="button" className={cn("teacher-journal-touch rounded-xl border px-2.5 py-2 text-xs font-black", present ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground")} onClick={() => onChange({ attendance: "iştirak edib" })}>{t("present")}</button>
              <button type="button" className={cn("teacher-journal-touch rounded-xl border px-2.5 py-2 text-xs font-black", absent ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background text-foreground")} onClick={() => onChange({ attendance: "qayıb", grade: "", lab: null })}>{t("absent")}</button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm font-bold">{present ? t("present") : absent ? t("absent") : t("unrecorded")}</div>
          )}
        </div>
      )}

      {canGrade ? (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.07em] text-muted-foreground">{t("gradeOptional")}</div>
          {absent ? (
            <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm text-muted-foreground">{t("notApplicable")}</div>
          ) : editable ? (
            <Input type="number" inputMode="decimal" min={0} max={10} step="0.1" disabled={!present} value={draft.grade} onChange={(event) => onChange({ grade: event.target.value })} placeholder="0–10" className="teacher-journal-touch rounded-xl text-base" />
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm font-bold">{draft.grade !== "" ? `${draft.grade} / 10` : t("notSet")}</div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function DesktopStudentRow({
  index,
  student,
  draft,
  editable,
  mode,
  onChange,
}: {
  index: number;
  student: DisplayStudent;
  draft: Draft;
  editable: boolean;
  mode: LessonMode;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const { t } = useTeacherJournalI18n();
  const absent = draft.attendance === "qayıb";
  const present = draft.attendance === "iştirak edib";
  const canGrade = mode === "graded" || mode === "lab";

  return (
    <tr className="bg-card/40 align-middle">
      <td className="px-3 py-3 text-center text-xs font-bold text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-3"><div className="font-bold text-foreground">{profileName(student.profile, `${t("student")} ${index + 1}`)}</div><div className="mt-0.5 text-xs text-muted-foreground">{student.profile?.istifadeci_adi ?? ""}</div></td>
      <td className="px-3 py-3">
        {editable ? (
          <div className="flex flex-wrap gap-2"><Button type="button" variant={present ? "default" : "outline"} className="teacher-journal-touch rounded-xl" onClick={() => onChange({ attendance: "iştirak edib", ...(mode === "lab" ? { lab: draft.lab ?? false } : {}) })}>{t("present")}</Button><Button type="button" variant={absent ? "destructive" : "outline"} className="teacher-journal-touch rounded-xl" onClick={() => onChange({ attendance: "qayıb", grade: "", lab: mode === "lab" ? false : null })}>{t("absent")}</Button></div>
        ) : <Badge variant={absent ? "destructive" : present ? "secondary" : "outline"} className="rounded-full">{present ? t("present") : absent ? t("absent") : t("unrecorded")}</Badge>}
      </td>
      <td className="px-3 py-3">
        {mode === "lab" ? (
          <div className="space-y-2">
            {absent ? <span className="text-xs text-muted-foreground">{t("notApplicable")}</span> : editable ? (
              <div className="flex flex-wrap gap-1.5"><Button type="button" variant={present && draft.lab === true ? "default" : "outline"} disabled={!present} className="teacher-journal-touch rounded-xl" onClick={() => onChange({ lab: true })}>{t("submitted")}</Button><Button type="button" variant={present && draft.lab === false ? "secondary" : "outline"} disabled={!present} className="teacher-journal-touch rounded-xl" onClick={() => onChange({ lab: false })}>{t("notSubmitted")}</Button></div>
            ) : <span className="font-semibold">{present && draft.lab === true ? t("submitted") : present && draft.lab === false ? t("notSubmitted") : t("notSet")}</span>}
            {!absent && (editable ? <Input type="number" min={0} max={10} step="0.1" disabled={!present} value={draft.grade} onChange={(event) => onChange({ grade: event.target.value })} placeholder="0–10" className="teacher-journal-touch w-28 rounded-xl" /> : <div className="text-xs font-semibold text-muted-foreground">{t("gradeOptional")}: {draft.grade !== "" ? `${draft.grade} / 10` : t("notSet")}</div>)}
          </div>
        ) : canGrade ? (
          absent ? <span className="text-xs text-muted-foreground">{t("notApplicable")}</span> : editable ? <Input type="number" min={0} max={10} step="0.1" disabled={!present} value={draft.grade} onChange={(event) => onChange({ grade: event.target.value })} placeholder="0–10" className="teacher-journal-touch w-28 rounded-xl" /> : <span className="font-semibold">{draft.grade !== "" ? `${draft.grade} / 10` : t("notSet")}</span>
        ) : <span className="text-xs text-muted-foreground">{t("attendance")}</span>}
      </td>
    </tr>
  );
}

function JournalSkeleton() {
  return (
    <div className="teacher-daily-journal rounded-[28px] border border-border/60 bg-card p-4 shadow-sm sm:p-5" aria-busy="true">
      <div className="teacher-journal-skeleton h-7 w-48 rounded-lg" />
      <div className="teacher-journal-skeleton mt-2 h-4 w-full max-w-xl rounded-lg" />
      <div className="mt-5 flex gap-2 overflow-hidden">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="teacher-journal-skeleton h-20 min-w-24 rounded-2xl" />)}</div>
      <div className="teacher-journal-skeleton mt-5 h-64 rounded-2xl" />
    </div>
  );
}

function SessionSkeleton() {
  return <div className="teacher-journal-skeleton mt-3 h-72 rounded-2xl border border-border/40" aria-busy="true" />;
}

function JournalError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTeacherJournalI18n();
  return (
    <section className="teacher-daily-journal rounded-[28px] border border-destructive/20 bg-card px-5 py-12 text-center shadow-sm">
      <AlertTriangle className="mx-auto size-10 text-destructive" />
      <h2 className="mt-4 text-lg font-black">{t("loadErrorTitle")}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t("loadErrorDescription")}</p>
      <Button type="button" variant="outline" className="mt-5 min-h-11 rounded-xl" onClick={onRetry}><RefreshCw className="mr-2 size-4" />{t("retry")}</Button>
    </section>
  );
}