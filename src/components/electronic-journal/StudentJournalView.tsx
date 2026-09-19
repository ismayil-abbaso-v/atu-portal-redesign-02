import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudUpload,
  ExternalLink,
  FileCheck2,
  FileText,
  Gauge,
  GraduationCap,
  Layers3,
  Loader2,
  Sparkles,
  TriangleAlert,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useJournalI18n } from "@/lib/electronic-journal-i18n";

type CourseRow = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "id" | "ad" | "kod" | "qiymetlendirme_novu" | "kurs_isi_var" | "umumi_lab_sayi"
>;
type LessonRecordRow = Database["public"]["Tables"]["lesson_student_records"]["Row"];
type SessionRow = Database["public"]["Tables"]["course_lesson_sessions"]["Row"];
type IndependentRow = Database["public"]["Tables"]["independent_work_assessments"]["Row"];
type CourseWorkRow = Database["public"]["Tables"]["course_work_assessments"]["Row"];
type ColloquiumRow = Database["public"]["Tables"]["colloquium_assessments"]["Row"];
type TopicRow = Pick<
  Database["public"]["Tables"]["course_topics"]["Row"],
  "id" | "course_id" | "movzu" | "dars_novu" | "tarix" | "sira"
>;
type ExamScoreRow = Database["public"]["Tables"]["exam_scores"]["Row"];
type SystemSettingsRow = Pick<
  Database["public"]["Tables"]["system_settings"]["Row"],
  "cari_semestr" | "cari_tedris_ili"
>;

type JournalEntry = { record: LessonRecordRow; session: SessionRow };
type SubmissionType = "lab" | "independent" | "coursework";
type ScorePiece = { value: number; max: number };
type ScoreBreakdown = {
  grading_type: "meshgele" | "laboratoriya";
  has_course_work: boolean;
  total: number;
  attendance: ScorePiece & { absences: number; total_hours: number; absence_limit: number };
  colloquium: ScorePiece;
  independent: ScorePiece;
  daily: ScorePiece & { practice_average: number; labs_submitted: number; total_labs: number };
  course_work: ScorePiece & { enabled: boolean };
};

const MAX_SUBMISSION_SIZE = 25 * 1024 * 1024;

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("az-AZ")
    .replaceAll("ə", "e")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g");
}

function semesterNumber(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (normalized.includes("payiz") || normalized.includes("fall")) return 1;
  if (normalized.includes("yaz") || normalized.includes("spring")) return 2;
  return null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseScorePiece(value: unknown): ScorePiece | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return { value: numberValue(row.value), max: numberValue(row.max) };
}

function parseBreakdown(value: Json | null): ScoreBreakdown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const attendance = parseScorePiece(root.attendance);
  const colloquium = parseScorePiece(root.colloquium);
  const independent = parseScorePiece(root.independent);
  const daily = parseScorePiece(root.daily);
  const courseWork = parseScorePiece(root.course_work);
  if (!attendance || !colloquium || !independent || !daily || !courseWork) return null;

  const attendanceRaw = root.attendance as Record<string, unknown>;
  const dailyRaw = root.daily as Record<string, unknown>;
  const courseWorkRaw = root.course_work as Record<string, unknown>;
  return {
    grading_type: root.grading_type === "laboratoriya" ? "laboratoriya" : "meshgele",
    has_course_work: root.has_course_work === true,
    total: numberValue(root.total),
    attendance: {
      ...attendance,
      absences: numberValue(attendanceRaw.absences),
      total_hours: numberValue(attendanceRaw.total_hours),
      absence_limit: numberValue(attendanceRaw.absence_limit),
    },
    colloquium,
    independent,
    daily: {
      ...daily,
      practice_average: numberValue(dailyRaw.practice_average),
      labs_submitted: numberValue(dailyRaw.labs_submitted),
      total_labs: numberValue(dailyRaw.total_labs),
    },
    course_work: { ...courseWork, enabled: courseWorkRaw.enabled === true },
  };
}

async function openSubmissionFile(fileUrl: string, fallbackMessage: string) {
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const normalized = fileUrl.replace(/^\/+/, "");
    const path = normalized.startsWith("student-submissions/")
      ? normalized.slice("student-submissions/".length)
      : normalized;
    const { data, error } = await supabase.storage.from("student-submissions").createSignedUrl(path, 120);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : fallbackMessage);
  }
}

function JournalSkeleton() {
  const { t: jt } = useJournalI18n();
  return (
    <div className="animate-page-enter space-y-3" aria-label={jt("page.loading")}>
      <div className="skeleton-shimmer h-28 rounded-2xl sm:h-32" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" />
        <div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" />
        <div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" />
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="skeleton-shimmer h-[420px] rounded-2xl" />
        <div className="hidden space-y-3 xl:block">
          <div className="skeleton-shimmer h-48 rounded-2xl" />
          <div className="skeleton-shimmer h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function ScoreMetric({
  label,
  value,
  icon,
  tone,
  helper,
}: {
  label: string;
  value: number | null;
  icon: ReactNode;
  tone: "primary" | "amber" | "emerald";
  helper?: ReactNode;
}) {
  const { t: jt } = useJournalI18n();
  const toneClasses = {
    primary: "border-primary/15 bg-primary/[0.055] text-primary",
    amber: "border-amber-500/20 bg-amber-500/[0.055] text-amber-700 dark:text-amber-400",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.055] text-emerald-700 dark:text-emerald-400",
  }[tone];

  return (
    <div className={`group relative min-w-0 overflow-hidden rounded-xl border px-2 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md min-[380px]:px-2.5 sm:rounded-2xl sm:p-4 ${toneClasses}`}>
      <div className="absolute -right-6 -top-7 size-16 rounded-full bg-current opacity-[0.045] transition-transform duration-500 group-hover:scale-125 sm:-right-7 sm:-top-8 sm:size-20" />
      <div className="relative flex items-center gap-2">
        <span className="hidden size-8 shrink-0 items-center justify-center rounded-xl bg-current/10 sm:flex">{icon}</span>
        <span className="min-w-0 truncate text-[9px] font-extrabold uppercase tracking-[0.035em] text-foreground/65 min-[380px]:text-[10px] sm:text-xs sm:normal-case sm:tracking-normal">
          {label}
        </span>
      </div>
      <div className="relative mt-1.5 flex min-h-9 min-w-0 items-end sm:mt-3 sm:min-h-10">
        <span className="font-data min-w-0 whitespace-nowrap text-[clamp(1.18rem,6.15vw,1.48rem)] font-extrabold leading-none tracking-[-0.035em] text-foreground min-[390px]:text-[1.5rem] sm:text-4xl sm:tracking-tight">
          {value === null ? "—" : value}
        </span>
        {value !== null ? <span className="mb-0.5 ml-1 hidden text-[10px] font-bold text-muted-foreground sm:inline sm:text-xs">{jt("common.scoreUnit")}</span> : null}
      </div>
      {helper ? <div className="relative mt-2 hidden sm:block">{helper}</div> : null}
    </div>
  );
}

function ProgressLine({ label, piece, icon }: { label: string; piece: ScorePiece; icon?: ReactNode }) {
  const percent = piece.max > 0 ? Math.min(100, Math.max(0, (piece.value / piece.max) * 100)) : 0;
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3 transition-colors hover:bg-muted/30">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <span className="truncate text-xs font-bold text-foreground sm:text-sm">{label}</span>
        </div>
        <span className="font-data text-xs font-extrabold tabular-nums text-foreground sm:text-sm">{piece.value}/{piece.max}</span>
      </div>
      <Progress value={percent} className="h-1.5 bg-primary/10 sm:h-2" />
    </div>
  );
}

function AttendanceBadge({ status }: { status: LessonRecordRow["attendance_status"] }) {
  const { t: jt } = useJournalI18n();
  if (!status) return <span className="text-muted-foreground">—</span>;
  const present = status === "iştirak edib";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition-all duration-300 ${present ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
      <span className={`size-1.5 rounded-full ${present ? "bg-emerald-500" : "bg-destructive"}`} />
      {present ? jt("common.present") : jt("common.absent")}
    </span>
  );
}

function FileButton({ path, compact = false }: { path: string | null; compact?: boolean }) {
  const { t: jt } = useJournalI18n();
  if (!path) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Button type="button" variant="outline" size="sm" className={`rounded-xl font-bold ${compact ? "h-8 px-2.5 text-xs" : ""}`} onClick={() => void openSubmissionFile(path, jt("common.fileOpenError"))}>
      <ExternalLink className="mr-1.5 size-3.5" /> {jt("common.view")}
    </Button>
  );
}

export function StudentJournalView({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { t: jt, semesterLabel } = useJournalI18n();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: settings = null } = useQuery<SystemSettingsRow | null>({
    queryKey: ["student-ejournal", "settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("cari_semestr, cari_tedris_ili")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const currentSemester = semesterNumber(settings?.cari_semestr);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseRow[]>({
    queryKey: ["student-ejournal", "courses", userId, settings?.cari_tedris_ili, currentSemester],
    enabled: Boolean(settings?.cari_tedris_ili && currentSemester),
    queryFn: async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      if (membershipError) throw membershipError;
      const groupIds = [...new Set((memberships ?? []).map((row) => row.group_id))];
      if (groupIds.length === 0) return [];

      const { data: links, error: linkError } = await supabase
        .from("course_groups")
        .select("course_id")
        .in("group_id", groupIds)
        .eq("tedris_ili", settings!.cari_tedris_ili!)
        .eq("semestr", currentSemester!);
      if (linkError) throw linkError;
      const courseIds = [...new Set((links ?? []).map((row) => row.course_id))];
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("courses")
        .select("id, ad, kod, qiymetlendirme_novu, kurs_isi_var, umumi_lab_sayi")
        .in("id", courseIds)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  useEffect(() => {
    if (selectedCourseId && courses.some((course) => course.id === selectedCourseId)) return;
    setSelectedCourseId(courses[0]?.id ?? "");
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;

  const { data: examScore = null } = useQuery<ExamScoreRow | null>({
    queryKey: ["student-ejournal", "exam-score", userId, selectedCourseId, settings?.cari_tedris_ili, currentSemester],
    enabled: Boolean(selectedCourseId && settings?.cari_tedris_ili && currentSemester),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_scores")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", selectedCourseId)
        .eq("tedris_ili", settings!.cari_tedris_ili!)
        .eq("semestr", currentSemester!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as ExamScoreRow | undefined) ?? null;
    },
  });

  const { data: breakdown = null } = useQuery<ScoreBreakdown | null>({
    queryKey: ["student-ejournal", "score-breakdown", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: Json | null; error: { message: string } | null }>;
      const { data, error } = await rpc("semester_score_breakdown", {
        p_course_id: selectedCourseId,
        p_student_id: userId,
      });
      if (error) throw new Error(error.message);
      return parseBreakdown(data);
    },
  });

  const { data: topics = [] } = useQuery<TopicRow[]>({
    queryKey: ["student-ejournal", "topics", selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_topics")
        .select("id, course_id, movzu, dars_novu, tarix, sira")
        .eq("course_id", selectedCourseId)
        .order("sira");
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
  });

  const { data: journalData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["student-ejournal", "lessons", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: records, error: recordError } = await supabase
        .from("lesson_student_records")
        .select("*")
        .eq("student_id", userId)
        .eq("course_id", selectedCourseId)
        .order("created_at", { ascending: false });
      if (recordError) throw recordError;
      const recordRows = (records ?? []) as LessonRecordRow[];
      if (recordRows.length === 0) return { entries: [] as JournalEntry[], records: [], sessions: [] as SessionRow[] };

      const sessionIds = [...new Set(recordRows.map((row) => row.lesson_session_id))];
      const { data: sessions, error: sessionError } = await supabase
        .from("course_lesson_sessions")
        .select("*")
        .in("id", sessionIds)
        .order("starts_at", { ascending: false });
      if (sessionError) throw sessionError;
      const sessionRows = (sessions ?? []) as SessionRow[];
      const sessionMap = new Map(sessionRows.map((session) => [session.id, session]));
      const entries = recordRows
        .map((record) => {
          const session = sessionMap.get(record.lesson_session_id);
          return session && session.is_confirmed ? { record, session } : null;
        })
        .filter((row): row is JournalEntry => row !== null)
        .sort((a, b) => b.session.starts_at.localeCompare(a.session.starts_at));
      return { entries, records: recordRows, sessions: sessionRows };
    },
  });

  const { data: independentWorks = [] } = useQuery<IndependentRow[]>({
    queryKey: ["student-ejournal", "independent", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("independent_work_assessments")
        .select("*")
        .eq("student_id", userId)
        .eq("course_id", selectedCourseId)
        .order("sira");
      if (error) throw error;
      return (data ?? []) as IndependentRow[];
    },
  });

  const { data: courseWorks = [] } = useQuery<CourseWorkRow[]>({
    queryKey: ["student-ejournal", "coursework", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId && selectedCourse?.kurs_isi_var),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_work_assessments")
        .select("*")
        .eq("student_id", userId)
        .eq("course_id", selectedCourseId)
        .order("sira");
      if (error) throw error;
      return (data ?? []) as CourseWorkRow[];
    },
  });

  const { data: colloquiums = [] } = useQuery<ColloquiumRow[]>({
    queryKey: ["student-ejournal", "colloquium", userId, selectedCourseId],
    enabled: Boolean(selectedCourseId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colloquium_assessments")
        .select("*")
        .eq("student_id", userId)
        .eq("course_id", selectedCourseId)
        .order("sira");
      if (error) throw error;
      return (data ?? []) as ColloquiumRow[];
    },
  });

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["student-ejournal"] });
    const channel = supabase
      .channel(`student-ejournal-live-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_lesson_sessions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_student_records", filter: `student_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_scores", filter: `user_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "independent_work_assessments", filter: `student_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_work_assessments", filter: `student_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "colloquium_assessments", filter: `student_id=eq.${userId}` }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const entries = journalData?.entries ?? [];
  const allLessonRecords = journalData?.records ?? [];
  const allSessions = journalData?.sessions ?? [];
  const attended = entries.filter((entry) => entry.record.attendance_status === "iştirak edib").length;
  const absent = entries.filter((entry) => entry.record.attendance_status === "qayıb").length;
  const attendancePercent = entries.length > 0 ? Math.round((attended / entries.length) * 100) : 0;
  const attendanceStatus: "none" | "risk" | "normal" = entries.length === 0
    ? "none"
    : breakdown && breakdown.attendance.absence_limit > 0 && absent >= breakdown.attendance.absence_limit
      ? "risk"
      : "normal";

  if (coursesLoading) return <JournalSkeleton />;

  if (courses.length === 0) {
    return (
      <div className="animate-page-enter rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-8">
        <EmptyState icon={BookOpenCheck} mesaj={jt("student.noCourses")} />
      </div>
    );
  }

  return (
    <div className="animate-page-enter space-y-3 pb-3 sm:space-y-4">
      <Collapsible open={coursePickerOpen} onOpenChange={setCoursePickerOpen} className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
        <div className="relative overflow-hidden bg-primary text-primary-foreground">
          <div className="pointer-events-none absolute -right-16 -top-24 size-48 rounded-full bg-white/[0.07]" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-white/[0.05]" />
          <div className="relative flex min-w-0 items-center gap-2.5 p-4 sm:gap-3 sm:p-5">
            <CollapsibleTrigger asChild>
              <button type="button" className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-primary-foreground">
                <span className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
                  <GraduationCap className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-foreground/60 sm:text-xs">
                    {jt("student.currentCourse")}
                    <ChevronDown className={`size-3.5 transition-transform duration-300 ${coursePickerOpen ? "rotate-180" : ""}`} />
                  </span>
                  <span className="mt-1 block line-clamp-2 break-words pr-1 text-[15px] font-extrabold leading-5 tracking-tight sm:text-xl sm:leading-6">{selectedCourse?.ad ?? jt("student.chooseCourse")}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-primary-foreground/70 sm:text-xs">
                    {selectedCourse?.kod ? <span>{selectedCourse.kod}</span> : null}
                    {selectedCourse?.kod ? <span className="opacity-50">•</span> : null}
                    <span>{semesterLabel(settings?.cari_semestr)}</span>
                    {settings?.cari_tedris_ili ? <span className="opacity-50">•</span> : null}
                    {settings?.cari_tedris_ili ? <span>{settings.cari_tedris_ili}</span> : null}
                  </span>
                </span>
              </button>
            </CollapsibleTrigger>

            <Button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="h-10 shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 text-primary-foreground shadow-none hover:bg-white/20 sm:h-11 sm:px-4"
            >
              <Upload className="size-4 sm:mr-2" />
              <span className="hidden text-sm font-extrabold sm:inline">{jt("student.uploadAssignment")}</span>
            </Button>
          </div>
        </div>

        <CollapsibleContent className="dropdown-enter min-w-0 overflow-hidden border-t border-border/60 bg-card p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between px-1 sm:px-2">
            <span className="text-xs font-bold text-muted-foreground">{jt("student.changeCourse")}</span>
            <Badge variant="secondary" className="rounded-lg text-[10px]">{jt("student.courseCount", { count: courses.length })}</Badge>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setCoursePickerOpen(false);
                  setDetailsOpen(false);
                }}
                className={`group flex w-full min-w-0 items-center justify-between gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200 sm:gap-3 ${course.id === selectedCourseId ? "border-primary/25 bg-primary/[0.07] text-primary" : "border-transparent hover:border-border hover:bg-muted/50"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 break-words text-sm font-bold leading-5">{course.ad}</span>
                  {course.kod ? <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">{course.kod}</span> : null}
                </span>
                <ChevronRight className={`size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${course.id === selectedCourseId ? "opacity-100" : "opacity-30"}`} />
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-2.5 shadow-sm min-[380px]:p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">{jt("student.academicResult")}</p>
            <h2 className="mt-0.5 text-base font-extrabold text-foreground sm:text-xl">{jt("student.currentEvaluation")}</h2>
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-extrabold text-primary transition-colors hover:bg-primary/[0.06] sm:px-3 sm:text-sm"
          >
            {detailsOpen ? jt("student.hideBreakdown") : jt("student.detailedBreakdown")}
            <ChevronDown className={`size-4 transition-transform duration-300 ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="animate-stagger grid w-full min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 min-[380px]:gap-2 sm:gap-3">
          <ScoreMetric
            label={jt("student.semester")}
            value={examScore?.semestr_qiymeti ?? 0}
            icon={<Gauge className="size-4" />}
            tone="primary"
            helper={<span className="text-xs font-semibold text-muted-foreground">{jt("student.max50")}</span>}
          />
          <ScoreMetric
            label={jt("student.exam")}
            value={examScore?.imtahan_bali ?? null}
            icon={<FileCheck2 className="size-4" />}
            tone="amber"
            helper={<span className="text-xs font-semibold text-muted-foreground">{jt("student.examResult")}</span>}
          />
          <ScoreMetric
            label={jt("student.final")}
            value={examScore?.yekun_qiymet ?? null}
            icon={<Award className="size-4" />}
            tone="emerald"
            helper={<span className="text-xs font-semibold text-muted-foreground">{jt("student.totalResult")}</span>}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 xl:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <UserCheck className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{jt("common.attendance")}</p>
              <p className="font-data text-sm font-extrabold">{attended}/{entries.length} <span className="font-sans text-[10px] text-muted-foreground">({attendancePercent}%)</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            {attendanceStatus === "risk" ? <TriangleAlert className="size-4 shrink-0 text-destructive" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{jt("common.status")}</p>
              <p className={`truncate text-sm font-extrabold ${attendanceStatus === "risk" ? "text-destructive" : attendanceStatus === "normal" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{attendanceStatus === "risk" ? jt("student.attendanceRisk") : attendanceStatus === "normal" ? jt("student.attendanceNormal") : jt("common.none")}</p>
            </div>
          </div>
        </div>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleContent className="pt-3 sm:pt-4">
            {breakdown ? (
              <div className="rounded-2xl border border-primary/10 bg-primary/[0.025] p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></span>
                    <div>
                      <p className="text-xs font-extrabold text-foreground sm:text-sm">{jt("student.scoreComposition")}</p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">{jt("student.liveFormula")}</p>
                    </div>
                  </div>
                  <span className="font-data rounded-xl bg-primary px-2.5 py-1.5 text-xs font-extrabold text-primary-foreground sm:text-sm">{breakdown.total}/50</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ProgressLine label={jt("common.colloquium")} piece={breakdown.colloquium} icon={<Layers3 className="size-3.5" />} />
                  <ProgressLine label={jt("common.independentWork")} piece={breakdown.independent} icon={<FileText className="size-3.5" />} />
                  <ProgressLine label={breakdown.grading_type === "laboratoriya" ? jt("common.laboratory") : jt("common.practice")} piece={breakdown.daily} icon={<Activity className="size-3.5" />} />
                  <ProgressLine label={jt("common.attendance")} piece={breakdown.attendance} icon={<UserCheck className="size-3.5" />} />
                  {breakdown.course_work.enabled ? <ProgressLine label={jt("common.courseWork")} piece={breakdown.course_work} icon={<GraduationCap className="size-3.5" />} /> : null}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.055] p-3 text-xs sm:p-4 sm:text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>{jt("student.gradingNotConfigured")}</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-4">
        <section className="min-w-0 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:p-5">
          <Tabs defaultValue="lessons" className="w-full">
            <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="flex h-auto w-max min-w-full justify-start rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="lessons" className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold sm:px-4 sm:text-sm">{jt("student.lessons")}</TabsTrigger>
                <TabsTrigger value="independent" className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold sm:px-4 sm:text-sm">{jt("student.independentWork")}</TabsTrigger>
                {selectedCourse?.kurs_isi_var ? <TabsTrigger value="coursework" className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold sm:px-4 sm:text-sm">{jt("student.courseWork")}</TabsTrigger> : null}
                <TabsTrigger value="colloquium" className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold sm:px-4 sm:text-sm">{jt("student.colloquium")}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="lessons" className="mt-3 focus-visible:outline-none sm:mt-4">
              <SectionHeading title={jt("student.dailyLessons")} subtitle={jt("student.confirmedLessons")} icon={<CalendarDays className="size-4" />} />
              <DailyLessonsPanel entries={entries} loading={lessonsLoading} />
            </TabsContent>
            <TabsContent value="independent" className="mt-3 focus-visible:outline-none sm:mt-4">
              <SectionHeading title={jt("student.independentWorks")} subtitle={jt("student.max2Submissions")} icon={<FileText className="size-4" />} />
              <IndependentPanel rows={independentWorks} />
            </TabsContent>
            {selectedCourse?.kurs_isi_var ? (
              <TabsContent value="coursework" className="mt-3 focus-visible:outline-none sm:mt-4">
                <SectionHeading title={jt("student.courseWork")} subtitle={jt("student.finalCourseWork")} icon={<GraduationCap className="size-4" />} />
                <CourseWorkPanel row={courseWorks[0] ?? null} />
              </TabsContent>
            ) : null}
            <TabsContent value="colloquium" className="mt-3 focus-visible:outline-none sm:mt-4">
              <SectionHeading title={jt("student.colloquiums")} subtitle={jt("student.threeAssessments")} icon={<Layers3 className="size-4" />} />
              <ColloquiumPanel rows={colloquiums} />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden space-y-3 xl:sticky xl:top-4 xl:block">
          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">{jt("common.attendance")}</p>
                <p className="mt-1 font-data text-2xl font-extrabold text-foreground">{attended}/{entries.length}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{jt("student.absenceSummary", { absent, percent: attendancePercent })}</p>
              </div>
              <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${attendancePercent * 3.6}deg, var(--muted) 0deg)` }}>
                <div className="flex size-15 items-center justify-center rounded-full bg-card font-data text-sm font-extrabold text-foreground">{attendancePercent}%</div>
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${attendanceStatus === "risk" ? "border-destructive/20 bg-destructive/[0.055] text-destructive" : "border-emerald-500/20 bg-emerald-500/[0.055] text-emerald-700 dark:text-emerald-400"}`}>
              {attendanceStatus === "risk" ? <TriangleAlert className="size-4" /> : <CheckCircle2 className="size-4" />}
              <span className="text-sm font-extrabold">{attendanceStatus === "risk" ? jt("student.attendanceRisk") : attendanceStatus === "normal" ? jt("student.attendanceNormal") : jt("student.noLessons")}</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
            <div className="bg-primary/[0.055] p-4">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CloudUpload className="size-5" /></div>
              <h3 className="mt-3 text-base font-extrabold">{jt("student.submitAssignment")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{jt("student.uploadDescription")}</p>
              <Button type="button" className="mt-4 w-full rounded-xl font-extrabold" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 size-4" /> {jt("student.uploadFile")}
              </Button>
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-3 z-20 xl:hidden">
        <Button type="button" onClick={() => setUploadOpen(true)} className="mx-auto flex h-11 w-fit rounded-full border border-primary-foreground/10 px-5 font-extrabold shadow-lg shadow-primary/20">
          <CloudUpload className="mr-2 size-4" /> {jt("student.uploadAssignment")}
        </Button>
      </div>

      {selectedCourse ? (
        <SubmissionDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          userId={userId}
          course={selectedCourse}
          topics={topics}
          independentWorks={independentWorks}
          courseWork={courseWorks[0] ?? null}
          lessonRecords={allLessonRecords}
          sessions={allSessions}
        />
      ) : null}
    </div>
  );
}

function SectionHeading({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 sm:mb-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.075] text-primary">{icon}</span>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-extrabold text-foreground sm:text-lg">{title}</h3>
        <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function DailyLessonsPanel({ entries, loading }: { entries: JournalEntry[]; loading: boolean }) {
  const { t: jt, formatDate, formatTime } = useJournalI18n();
  if (loading) {
    return (
      <div className="space-y-2 md:hidden">
        {[0, 1, 2].map((row) => <div key={row} className="skeleton-shimmer h-28 rounded-xl" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return <CompactEmpty icon={<CalendarDays className="size-5" />} title={jt("student.noConfirmedLessons")} description={jt("student.confirmedLessonHint")} />;
  }

  return (
    <>
      <div className="animate-stagger space-y-2 md:hidden">
        {entries.map((entry, index) => (
          <article key={entry.record.id} className="rounded-xl border border-border/65 bg-background p-3 transition-all duration-200 active:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                  <span>#{index + 1}</span>
                  <span>•</span>
                  <span>{formatDate(entry.session.starts_at)}</span>
                  <span>•</span>
                  <span>{formatTime(entry.session.starts_at)}</span>
                </div>
                <h4 className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-5 text-foreground">{entry.session.movzu || jt("student.topicMissing")}</h4>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{jt("common.grade")}</p>
                <p className="font-data mt-0.5 text-xl font-extrabold text-foreground">
                  {entry.record.grade !== null ? entry.record.grade : entry.record.lab_submitted ? "✓" : "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
              <AttendanceBadge status={entry.record.attendance_status} />
              <FileButton path={entry.record.file_url} compact />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">№</TableHead>
              <TableHead className="w-32">{jt("common.date")}</TableHead>
              <TableHead>{jt("common.topic")}</TableHead>
              <TableHead className="w-28">{jt("common.file")}</TableHead>
              <TableHead className="w-40">{jt("common.attendance")}</TableHead>
              <TableHead className="w-28">{jt("common.grade")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={entry.record.id}>
                <TableCell className="text-center font-data text-xs font-bold text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <p className="text-sm font-bold">{formatDate(entry.session.starts_at)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTime(entry.session.starts_at)}</p>
                </TableCell>
                <TableCell className="font-bold">{entry.session.movzu || jt("student.topicMissing")}</TableCell>
                <TableCell><FileButton path={entry.record.file_url} /></TableCell>
                <TableCell><AttendanceBadge status={entry.record.attendance_status} /></TableCell>
                <TableCell>
                  {entry.record.grade !== null ? <span className="font-data text-base font-extrabold">{entry.record.grade}</span>
                    : entry.record.lab_submitted ? <Badge variant="secondary" className="rounded-lg text-[10px]">{jt("student.labSubmitted")}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function IndependentPanel({ rows }: { rows: IndependentRow[] }) {
  const { t: jt, formatDate } = useJournalI18n();
  const displayRows = [1, 2].map((sira) => rows.find((row) => row.sira === sira) ?? null);
  return (
    <>
      <div className="space-y-2 md:hidden">
        {displayRows.map((row, index) => (
          <AssessmentMobileCard
            key={row?.id ?? index}
            number={index + 1}
            title={row?.topic || jt("student.independentOrdinal", { n: index + 1 })}
            date={row?.submitted_at}
            grade={row?.grade ?? null}
            file={row?.file_url ?? null}
            max="5"
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-14 text-center">№</TableHead><TableHead className="w-32">{jt("common.date")}</TableHead><TableHead>{jt("common.topic")}</TableHead><TableHead className="w-28">{jt("common.file")}</TableHead><TableHead className="w-24">{jt("common.grade")}</TableHead></TableRow></TableHeader>
          <TableBody>{displayRows.map((row, index) => <TableRow key={row?.id ?? index}><TableCell className="text-center font-data text-xs font-bold text-muted-foreground">{index + 1}</TableCell><TableCell>{formatDate(row?.submitted_at)}</TableCell><TableCell className="font-bold">{row?.topic || "—"}</TableCell><TableCell><FileButton path={row?.file_url ?? null} /></TableCell><TableCell className="font-data font-extrabold">{row?.grade ?? "—"}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </>
  );
}

function CourseWorkPanel({ row }: { row: CourseWorkRow | null }) {
  const { t: jt, formatDate } = useJournalI18n();
  return (
    <>
      <div className="md:hidden">
        <AssessmentMobileCard number={1} title={row?.topic || jt("student.courseWork")} date={row?.submitted_at} grade={row?.grade ?? null} file={row?.file_url ?? null} max="10" />
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-32">{jt("common.date")}</TableHead><TableHead>{jt("common.topic")}</TableHead><TableHead className="w-28">{jt("common.file")}</TableHead><TableHead className="w-24">{jt("common.grade")}</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell>{formatDate(row?.submitted_at)}</TableCell><TableCell className="font-bold">{row?.topic || "—"}</TableCell><TableCell><FileButton path={row?.file_url ?? null} /></TableCell><TableCell className="font-data font-extrabold">{row?.grade ?? "—"}</TableCell></TableRow></TableBody>
        </Table>
      </div>
    </>
  );
}

function ColloquiumPanel({ rows }: { rows: ColloquiumRow[] }) {
  const { t: jt, formatDate } = useJournalI18n();
  const displayRows = [1, 2, 3].map((sira) => rows.find((row) => row.sira === sira) ?? null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {displayRows.map((row, index) => (
          <div key={row?.id ?? index} className="rounded-xl border border-border/65 bg-background p-3 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{jt("student.ordinal", { n: index + 1 })}</p>
            <p className="font-data mt-2 text-2xl font-extrabold text-foreground">{row?.grade ?? "—"}</p>
            <p className="mt-1 truncate text-[9px] font-medium text-muted-foreground">{formatDate(row?.tarix)}</p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-16 text-center">№</TableHead><TableHead>{jt("common.date")}</TableHead><TableHead className="w-32">{jt("common.grade")}</TableHead></TableRow></TableHeader>
          <TableBody>{displayRows.map((row, index) => <TableRow key={row?.id ?? index}><TableCell className="text-center font-data text-xs font-bold text-muted-foreground">{index + 1}</TableCell><TableCell>{formatDate(row?.tarix)}</TableCell><TableCell className="font-data text-base font-extrabold">{row?.grade ?? "—"}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </>
  );
}

function AssessmentMobileCard({ number, title, date, grade, file, max }: { number: number; title: string; date: string | null | undefined; grade: number | null; file: string | null; max: string }) {
  const { t: jt, formatDate } = useJournalI18n();
  return (
    <article className="rounded-xl border border-border/65 bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-muted-foreground">#{number} • {formatDate(date)}</p>
          <h4 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-foreground">{title}</h4>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{jt("common.score")}</p>
          <p className="font-data text-lg font-extrabold">{grade ?? "—"}<span className="text-[9px] text-muted-foreground">/{max}</span></p>
        </div>
      </div>
      <div className="mt-2.5 border-t border-border/50 pt-2.5"><FileButton path={file} compact /></div>
    </article>
  );
}

function CompactEmpty({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/[0.075] text-primary">{icon}</span>
      <p className="mt-3 text-sm font-extrabold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function SubmissionDialog({
  open,
  onOpenChange,
  userId,
  course,
  topics,
  independentWorks,
  courseWork,
  lessonRecords,
  sessions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  course: CourseRow;
  topics: TopicRow[];
  independentWorks: IndependentRow[];
  courseWork: CourseWorkRow | null;
  lessonRecords: LessonRecordRow[];
  sessions: SessionRow[];
}) {
  const queryClient = useQueryClient();
  const { t: jt } = useJournalI18n();
  const [kind, setKind] = useState<SubmissionType | "">("");
  const [topicId, setTopicId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const reset = () => {
    setKind("");
    setTopicId("");
    setFile(null);
    setDragActive(false);
  };
  useEffect(() => { if (!open) reset(); }, [open]);

  const filteredTopics = useMemo(() => {
    if (!kind) return topics;
    const token = kind === "lab" ? "lab" : kind === "coursework" ? "kurs" : "serbest";
    const matching = topics.filter((topic) => {
      const value = `${normalizeText(topic.dars_novu)} ${normalizeText(topic.movzu)}`;
      if (kind === "independent") return value.includes("serbest") || value.includes("independent");
      return value.includes(token);
    });
    return matching.length > 0 ? matching : topics;
  }, [kind, topics]);

  useEffect(() => {
    if (topicId && !filteredTopics.some((topic) => topic.id === topicId)) setTopicId("");
  }, [filteredTopics, topicId]);

  const setSelectedFile = (next: File | null) => {
    if (next && next.size > MAX_SUBMISSION_SIZE) {
      toast.error(jt("student.fileTooLarge"));
      return;
    }
    setFile(next);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    setSelectedFile(event.dataTransfer.files?.[0] ?? null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!kind) throw new Error(jt("student.chooseTypeError"));
      if (!topicId) throw new Error(jt("student.chooseTopicError"));
      if (!file) throw new Error(jt("student.chooseFileError"));
      if (file.size > MAX_SUBMISSION_SIZE) throw new Error(jt("student.fileTooLarge"));

      const selectedTopic = topics.find((topic) => topic.id === topicId);
      if (!selectedTopic) throw new Error(jt("student.topicNotFound"));
      const ext = file.name.includes(".") ? file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") : "bin";
      const path = `${userId}/${course.id}/${kind}/${crypto.randomUUID()}.${ext || "bin"}`;
      const { error: uploadError } = await supabase.storage.from("student-submissions").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      try {
        if (kind === "independent") {
          const usedTopic = independentWorks.some((row) => row.topic_id === topicId && (row.file_url || row.submitted_at));
          if (usedTopic) throw new Error(jt("student.topicAlreadySubmitted"));
          const free = independentWorks.find((row) => !row.file_url && !row.submitted_at && row.status === "gozleyir");
          if (!free) throw new Error(jt("student.independentLimit"));
          const { error } = await supabase.from("independent_work_assessments").update({
            topic_id: topicId,
            file_url: path,
            submitted_at: new Date().toISOString(),
            status: "teqdim_edilib",
          }).eq("id", free.id).eq("student_id", userId);
          if (error) throw error;
        } else if (kind === "coursework") {
          if (!course.kurs_isi_var) throw new Error(jt("student.courseWorkDisabled"));
          if (!courseWork) throw new Error(jt("student.courseWorkMissing"));
          if (courseWork.file_url || courseWork.submitted_at || courseWork.status !== "gozleyir") throw new Error(jt("student.alreadySubmitted"));
          const { error } = await supabase.from("course_work_assessments").update({
            topic_id: topicId,
            file_url: path,
            submitted_at: new Date().toISOString(),
            status: "teqdim_edilib",
          }).eq("id", courseWork.id).eq("student_id", userId);
          if (error) throw error;
        } else {
          if (course.qiymetlendirme_novu !== "laboratoriya") throw new Error(jt("student.notLaboratoryCourse"));
          const topicType = normalizeText(selectedTopic.dars_novu);
          const candidates = sessions.filter((session) => !session.is_confirmed && normalizeText(session.dars_novu).includes("lab"));
          const session = candidates.find((row) => row.topic_id === topicId)
            ?? candidates.find((row) => row.lesson_date === selectedTopic.tarix && (topicType.includes("lab") || normalizeText(row.dars_novu).includes(topicType)))
            ?? candidates.find((row) => row.lesson_date === selectedTopic.tarix);
          if (!session) throw new Error(jt("student.noOpenLabSession"));
          const record = lessonRecords.find((row) => row.lesson_session_id === session.id);
          if (!record) throw new Error(jt("student.noLabRecord"));
          if (record.file_url || record.lab_submitted) throw new Error(jt("student.alreadySubmitted"));
          const { error } = await supabase.from("lesson_student_records").update({ file_url: path, lab_submitted: true }).eq("id", record.id).eq("student_id", userId);
          if (error) throw error;
        }
      } catch (error) {
        await supabase.storage.from("student-submissions").remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(jt("student.submitSuccess"));
      onOpenChange(false);
      reset();
      void queryClient.invalidateQueries({ queryKey: ["student-ejournal"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const independentFull = independentWorks.filter((row) => row.file_url || row.submitted_at).length >= 2;
  const courseWorkFull = Boolean(courseWork && (courseWork.file_url || courseWork.submitted_at || courseWork.status !== "gozleyir"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto rounded-2xl border-border bg-card p-0 sm:p-0 sm:rounded-3xl">
        <div className="border-b border-border/60 bg-primary/[0.045] p-5 sm:p-6">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CloudUpload className="size-5" /></div>
            <DialogTitle className="mt-3 text-xl font-extrabold sm:text-2xl">{jt("student.submitDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{jt("student.submitDialogDescription", { course: course.ad })}</p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground">{jt("student.assignmentType")}</label>
              <Select value={kind} onValueChange={(value) => { setKind(value as SubmissionType); setTopicId(""); }}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 px-3"><SelectValue placeholder={jt("student.chooseType")} /></SelectTrigger>
                <SelectContent>
                  {course.qiymetlendirme_novu === "laboratoriya" ? <SelectItem value="lab">{jt("common.laboratory")}</SelectItem> : null}
                  <SelectItem value="independent" disabled={independentFull}>{jt("common.independentWork")}{independentFull ? ` — ${jt("student.limitFull")}` : ""}</SelectItem>
                  {course.kurs_isi_var ? <SelectItem value="coursework" disabled={courseWorkFull}>{jt("common.courseWork")}{courseWorkFull ? ` — ${jt("student.submitted")}` : ""}</SelectItem> : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground">{jt("common.topic")}</label>
              <Select value={topicId} onValueChange={setTopicId} disabled={!kind || filteredTopics.length === 0}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 px-3"><SelectValue placeholder={filteredTopics.length === 0 ? jt("student.topicNotAdded") : jt("student.chooseTopic")} /></SelectTrigger>
                <SelectContent>{filteredTopics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.movzu}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <label
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className={`group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-all duration-300 ${dragActive ? "scale-[1.01] border-primary bg-primary/10" : file ? "border-emerald-500/40 bg-emerald-500/[0.055]" : "border-primary/35 bg-primary/[0.035] hover:border-primary/60 hover:bg-primary/[0.065]"}`}
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-0.5 ${file ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>
              {file ? <CheckCircle2 className="size-6" /> : <CloudUpload className="size-6" />}
            </span>
            <p className="mt-3 text-sm font-extrabold text-foreground">{file ? jt("student.fileSelected") : jt("student.dropFile")}</p>
            <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{file ? file.name : jt("student.maxFile25")}</p>
            <input type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
          </label>

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/35 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{file.name}</span>
              <span className="font-data text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 p-4 sm:p-5">
          <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>{jt("common.cancel")}</Button>
          <Button type="button" className="rounded-xl font-extrabold" onClick={() => mutation.mutate()} disabled={mutation.isPending || !kind || !topicId || !file}>
            {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
            {jt("student.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
