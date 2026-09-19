import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  Save,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import { useTeacherAssessmentI18n } from "@/lib/teacher-assessment-i18n";
import { cn } from "@/lib/utils";

type ProfileLite = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  istifadeci_adi: string | null;
};

type WorkRow = {
  id: string;
  course_id: string;
  student_id: string;
  sira: number;
  topic: string | null;
  file_url: string | null;
  grade: number | null;
  submitted_at: string | null;
  status: "gozleyir" | "teqdim_edilib" | "qiymetlendirilib";
};

type ColloquiumRow = {
  id: string;
  course_id: string;
  student_id: string;
  sira: number;
  tarix: string | null;
  grade: number | null;
};

type SaveState = "idle" | "editing" | "pending" | "saved" | "error";
type AssessmentKind = "independent" | "coursework";
type AssessmentPermissions = Record<string, boolean>;

function profileName(profile: ProfileLite, fallback: string) {
  return [profile.ad, profile.soyad].filter(Boolean).join(" ") || profile.istifadeci_adi || fallback;
}

function normalizedGrade(value: string | undefined) {
  return (value ?? "").trim();
}

function useGroupRoster(userId: string, groupId: string, courseId: string) {
  const rosterQuery = useQuery<ProfileLite[]>({
    queryKey: ["teacher-assessment-roster", userId, groupId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("teacher_assessment_roster", {
        p_course_id: courseId,
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });

  const students = useMemo(
    () => [...(rosterQuery.data ?? [])].sort(compareStudentProfilesBySurnameThenName),
    [rosterQuery.data],
  );

  return {
    students,
    studentIds: students.map((student) => student.user_id),
    isLoading: rosterQuery.isLoading,
    isError: rosterQuery.isError,
    refetch: rosterQuery.refetch,
  };
}

function useAssessmentGate({
  userId,
  courseId,
  requiredLessonType,
  staticAllowed,
}: {
  userId: string;
  courseId: string;
  requiredLessonType: string | null;
  staticAllowed: boolean;
}) {
  const query = useQuery<boolean>({
    queryKey: ["teacher-assessment-gate", userId, courseId, requiredLessonType ?? "coursework"],
    enabled: staticAllowed,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ejournal_can_assess_course_now", {
        p_course_id: courseId,
        ...(requiredLessonType ? { p_required_lesson_type: requiredLessonType } : {}),
      });
      if (error) throw error;
      return data === true;
    },
  });

  return {
    canEdit: staticAllowed && query.data === true,
    isChecking: staticAllowed && (query.isLoading || query.isFetching),
    isError: query.isError,
    refetch: query.refetch,
  };
}

function workStaticPermission(kind: AssessmentKind, permissions: AssessmentPermissions) {
  if (kind === "independent") return permissions.serbest_is === true;
  return Object.values(permissions).some(Boolean);
}

export function TeacherWorkAssessmentPanel({
  userId,
  groupId,
  courseId,
  kind,
  permissions,
}: {
  userId: string;
  groupId: string;
  courseId: string;
  kind: AssessmentKind;
  permissions: AssessmentPermissions;
}) {
  const queryClient = useQueryClient();
  const { t, formatDateTime } = useTeacherAssessmentI18n();
  const { students, studentIds, isLoading: rosterLoading, isError: rosterError, refetch: refetchRoster } = useGroupRoster(userId, groupId, courseId);
  const [selectedIndex, setSelectedIndex] = useState("1");
  const [gradeEdits, setGradeEdits] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const selectedSira = kind === "independent" ? Number(selectedIndex) : 1;
  const maxGrade = kind === "independent" ? 5 : 10;
  const staticAllowed = workStaticPermission(kind, permissions);
  const gate = useAssessmentGate({
    userId,
    courseId,
    requiredLessonType: kind === "independent" ? "serbest_is" : null,
    staticAllowed,
  });

  const rowsQuery = useQuery<WorkRow[]>({
    queryKey: ["teacher-assessment-work", userId, groupId, courseId, kind, selectedSira],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      if (kind === "independent") {
        const { data, error } = await supabase
          .from("independent_work_assessments")
          .select("id, course_id, student_id, sira, topic, file_url, grade, submitted_at, status")
          .eq("course_id", courseId)
          .eq("sira", selectedSira)
          .in("student_id", studentIds);
        if (error) throw error;
        return (data ?? []) as WorkRow[];
      }

      const { data, error } = await supabase
        .from("course_work_assessments")
        .select("id, course_id, student_id, sira, topic, file_url, grade, submitted_at, status")
        .eq("course_id", courseId)
        .eq("sira", 1)
        .in("student_id", studentIds);
      if (error) throw error;
      return (data ?? []) as WorkRow[];
    },
  });

  const rowMap = useMemo(() => new Map((rowsQuery.data ?? []).map((row) => [row.student_id, row])), [rowsQuery.data]);
  const baselineGrades = useMemo(() => {
    const next: Record<string, string> = {};
    students.forEach((student) => {
      const row = rowMap.get(student.user_id);
      next[student.user_id] = row?.grade == null ? "" : String(row.grade);
    });
    return next;
  }, [students, rowMap]);

  useEffect(() => {
    setGradeEdits(baselineGrades);
    setSaveState("idle");
  }, [baselineGrades, selectedSira]);

  const dirtyStudentIds = useMemo(
    () => students
      .filter((student) => normalizedGrade(gradeEdits[student.user_id]) !== normalizedGrade(baselineGrades[student.user_id]))
      .map((student) => student.user_id),
    [students, gradeEdits, baselineGrades],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!gate.canEdit) throw new Error(staticAllowed ? t("windowClosed") : t("permissionReadonly"));
      if (dirtyStudentIds.length === 0) throw new Error(t("noChanges"));

      const payload = dirtyStudentIds.map((studentId) => {
        const student = students.find((item) => item.user_id === studentId);
        const raw = normalizedGrade(gradeEdits[studentId]);
        const grade = raw === "" ? null : Number(raw);
        if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > maxGrade)) {
          throw new Error(t("rangeError", { student: student ? profileName(student, t("student")) : t("student"), max: maxGrade }));
        }
        return { course_id: courseId, student_id: studentId, sira: selectedSira, grade };
      });

      if (kind === "independent") {
        const { error } = await supabase
          .from("independent_work_assessments")
          .upsert(payload, { onConflict: "course_id,student_id,sira" });
        if (error) throw error;
        return;
      }

      const courseworkPayload = payload.map(({ course_id, student_id, grade }) => ({ course_id, student_id, sira: 1, grade }));
      const { error } = await supabase
        .from("course_work_assessments")
        .upsert(courseworkPayload, { onConflict: "course_id,student_id" });
      if (error) throw error;
    },
    onMutate: () => setSaveState("pending"),
    onSuccess: async () => {
      setSaveState("saved");
      await queryClient.invalidateQueries({ queryKey: ["teacher-assessment-work", userId, groupId, courseId, kind, selectedSira] });
      toast.success(t("savedWork", { work: kind === "independent" ? t("independentWorkN", { n: selectedSira }) : t("courseworkTitle") }));
    },
    onError: (error: Error) => {
      setSaveState("error");
      toast.error(error.message || t("saveError"));
    },
  });

  function updateGrade(studentId: string, value: string) {
    setGradeEdits((current) => ({ ...current, [studentId]: value }));
    setSaveState("editing");
  }

  function changeIndex(value: string) {
    if (dirtyStudentIds.length > 0 && !window.confirm(t("discardConfirm"))) return;
    setSelectedIndex(value);
  }

  if (rosterLoading || rowsQuery.isLoading || gate.isChecking) return <AssessmentSkeleton />;
  if (rosterError || rowsQuery.isError || gate.isError) {
    return <AssessmentError onRetry={() => void Promise.all([refetchRoster(), rowsQuery.refetch(), gate.refetch()])} />;
  }

  const title = kind === "independent" ? t("independentTitle") : t("courseworkTitle");
  const hint = kind === "independent" ? t("independentHint") : t("courseworkHint");

  return (
    <section className="role-panel-enter min-w-0 rounded-[28px] border border-border/60 bg-card p-3.5 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <AssessmentGateBadge canEdit={gate.canEdit} />
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{hint}</p>
        </div>
        {kind === "independent" ? (
          <div className="w-full space-y-1.5 sm:w-52">
            <Label>{t("independentWork")}</Label>
            <Select value={selectedIndex} onValueChange={changeIndex}>
              <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("independentWorkN", { n: 1 })}</SelectItem>
                <SelectItem value="2">{t("independentWorkN", { n: 2 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {!staticAllowed ? (
        <AssessmentNotice kind="permission" text={t("permissionReadonly")} />
      ) : !gate.canEdit ? (
        <AssessmentNotice kind="time" text={t("windowClosed")} />
      ) : null}

      {students.length === 0 ? (
        <AssessmentEmpty />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/15 px-3 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">{t("studentCount", { count: students.length })}</span>
            <span className="text-[11px] leading-5 text-muted-foreground">{t("statusHint")}</span>
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {students.map((student, index) => {
              const row = rowMap.get(student.user_id);
              return (
                <article key={student.user_id} className="min-w-0 rounded-2xl border border-border/70 bg-background p-3.5 shadow-sm">
                  <StudentHeading student={student} index={index} />
                  <div className="mt-3 grid min-w-0 gap-3">
                    <ReadOnlyField label={t("status")}><SubmissionBadge status={row?.status ?? "gozleyir"} /></ReadOnlyField>
                    <ReadOnlyField label={t("submittedAt")} value={row?.submitted_at ? formatDateTime(row.submitted_at) : t("noDate")} />
                    <ReadOnlyField label={t("topic")} value={row?.topic?.trim() || t("noTopic")} />
                    <ReadOnlyField label={t("file")}>
                      {row?.file_url ? (
                        <Button type="button" variant="outline" className="min-h-11 w-full justify-center rounded-xl" onClick={() => void openSubmission(row.file_url!, t("fileOpenError"))}>
                          <ExternalLink className="mr-2 size-4" />{t("viewFile")}
                        </Button>
                      ) : <span className="text-sm text-muted-foreground">{t("noFile")}</span>}
                    </ReadOnlyField>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">{t("grade")}</Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={maxGrade}
                          step="0.1"
                          disabled={!gate.canEdit || saveMutation.isPending}
                          value={gradeEdits[student.user_id] ?? ""}
                          onChange={(event) => updateGrade(student.user_id, event.target.value)}
                          placeholder={`0–${maxGrade}`}
                          className="min-h-11 min-w-0 flex-1 rounded-xl text-base"
                        />
                        <span className="shrink-0 text-sm font-bold text-muted-foreground">/{maxGrade}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border/70 md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-14 text-center">№</TableHead>
                  <TableHead className="min-w-[220px]">{t("student")}</TableHead>
                  <TableHead className="min-w-[150px]">{t("status")}</TableHead>
                  <TableHead className="min-w-[180px]">{t("submittedAt")}</TableHead>
                  <TableHead className="min-w-[220px]">{t("topic")}</TableHead>
                  <TableHead className="min-w-[130px]">{t("file")}</TableHead>
                  <TableHead className="w-36">{t("grade")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const row = rowMap.get(student.user_id);
                  return (
                    <TableRow key={student.user_id}>
                      <TableCell className="text-center text-xs font-bold text-muted-foreground">{index + 1}</TableCell>
                      <TableCell><StudentName student={student} /></TableCell>
                      <TableCell><SubmissionBadge status={row?.status ?? "gozleyir"} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row?.submitted_at ? formatDateTime(row.submitted_at) : t("noDate")}</TableCell>
                      <TableCell className="max-w-[280px]"><span className="line-clamp-2 text-sm">{row?.topic?.trim() || t("noTopic")}</span></TableCell>
                      <TableCell>
                        {row?.file_url ? (
                          <Button type="button" size="sm" variant="outline" className="min-h-10 rounded-xl" onClick={() => void openSubmission(row.file_url!, t("fileOpenError"))}>
                            <ExternalLink className="mr-1.5 size-3.5" />{t("viewFile")}
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">{t("noFile")}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={maxGrade}
                            step="0.1"
                            disabled={!gate.canEdit || saveMutation.isPending}
                            value={gradeEdits[student.user_id] ?? ""}
                            onChange={(event) => updateGrade(student.user_id, event.target.value)}
                            placeholder={`0–${maxGrade}`}
                            className="w-24 rounded-xl"
                          />
                          <span className="text-xs font-semibold text-muted-foreground">/{maxGrade}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <AssessmentSaveBar
            state={saveMutation.isPending ? "pending" : saveState}
            dirtyCount={dirtyStudentIds.length}
            disabled={!gate.canEdit || saveMutation.isPending || dirtyStudentIds.length === 0}
            onSave={() => saveMutation.mutate()}
          />
        </>
      )}
    </section>
  );
}

export function TeacherColloquiumAssessmentPanel({
  userId,
  groupId,
  courseId,
  permissions,
}: {
  userId: string;
  groupId: string;
  courseId: string;
  permissions: AssessmentPermissions;
}) {
  const queryClient = useQueryClient();
  const { t } = useTeacherAssessmentI18n();
  const { students, studentIds, isLoading: rosterLoading, isError: rosterError, refetch: refetchRoster } = useGroupRoster(userId, groupId, courseId);
  const [selectedIndex, setSelectedIndex] = useState("1");
  const [edits, setEdits] = useState<Record<string, { date: string; grade: string }>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const selectedSira = Number(selectedIndex);
  const staticAllowed = permissions.kollokvium === true;
  const gate = useAssessmentGate({ userId, courseId, requiredLessonType: "kollokvium", staticAllowed });

  const rowsQuery = useQuery<ColloquiumRow[]>({
    queryKey: ["teacher-assessment-colloquium", userId, groupId, courseId, selectedSira],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colloquium_assessments")
        .select("id, course_id, student_id, sira, tarix, grade")
        .eq("course_id", courseId)
        .eq("sira", selectedSira)
        .in("student_id", studentIds);
      if (error) throw error;
      return (data ?? []) as ColloquiumRow[];
    },
  });

  const rowMap = useMemo(() => new Map((rowsQuery.data ?? []).map((row) => [row.student_id, row])), [rowsQuery.data]);
  const baseline = useMemo(() => {
    const next: Record<string, { date: string; grade: string }> = {};
    students.forEach((student) => {
      const row = rowMap.get(student.user_id);
      next[student.user_id] = { date: row?.tarix ?? "", grade: row?.grade == null ? "" : String(row.grade) };
    });
    return next;
  }, [students, rowMap]);

  useEffect(() => {
    setEdits(baseline);
    setSaveState("idle");
  }, [baseline, selectedSira]);

  const dirtyStudentIds = useMemo(
    () => students.filter((student) => {
      const current = edits[student.user_id] ?? { date: "", grade: "" };
      const before = baseline[student.user_id] ?? { date: "", grade: "" };
      return current.date !== before.date || normalizedGrade(current.grade) !== normalizedGrade(before.grade);
    }).map((student) => student.user_id),
    [students, edits, baseline],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!gate.canEdit) throw new Error(staticAllowed ? t("windowClosed") : t("permissionReadonly"));
      if (dirtyStudentIds.length === 0) throw new Error(t("noChanges"));

      const payload = dirtyStudentIds.map((studentId) => {
        const student = students.find((item) => item.user_id === studentId);
        const edit = edits[studentId] ?? { date: "", grade: "" };
        const raw = normalizedGrade(edit.grade);
        const grade = raw === "" ? null : Number(raw);
        if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 10)) {
          throw new Error(t("rangeError", { student: student ? profileName(student, t("student")) : t("student"), max: 10 }));
        }
        return { course_id: courseId, student_id: studentId, sira: selectedSira, tarix: edit.date || null, grade };
      });

      const { error } = await supabase
        .from("colloquium_assessments")
        .upsert(payload, { onConflict: "course_id,student_id,sira" });
      if (error) throw error;
    },
    onMutate: () => setSaveState("pending"),
    onSuccess: async () => {
      setSaveState("saved");
      await queryClient.invalidateQueries({ queryKey: ["teacher-assessment-colloquium", userId, groupId, courseId, selectedSira] });
      toast.success(t("savedColloquium", { n: selectedSira }));
    },
    onError: (error: Error) => {
      setSaveState("error");
      toast.error(error.message || t("saveError"));
    },
  });

  function updateEdit(studentId: string, patch: Partial<{ date: string; grade: string }>) {
    setEdits((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { date: "", grade: "" }), ...patch },
    }));
    setSaveState("editing");
  }

  function changeIndex(value: string) {
    if (dirtyStudentIds.length > 0 && !window.confirm(t("discardConfirm"))) return;
    setSelectedIndex(value);
  }

  if (rosterLoading || rowsQuery.isLoading || gate.isChecking) return <AssessmentSkeleton />;
  if (rosterError || rowsQuery.isError || gate.isError) {
    return <AssessmentError onRetry={() => void Promise.all([refetchRoster(), rowsQuery.refetch(), gate.refetch()])} />;
  }

  return (
    <section className="role-panel-enter min-w-0 rounded-[28px] border border-border/60 bg-card p-3.5 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{t("colloquiumTitle")}</h2>
            <AssessmentGateBadge canEdit={gate.canEdit} />
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("colloquiumHint")}</p>
        </div>
        <div className="w-full space-y-1.5 sm:w-52">
          <Label>{t("colloquium")}</Label>
          <Select value={selectedIndex} onValueChange={changeIndex}>
            <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t("colloquiumN", { n: 1 })}</SelectItem>
              <SelectItem value="2">{t("colloquiumN", { n: 2 })}</SelectItem>
              <SelectItem value="3">{t("colloquiumN", { n: 3 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!staticAllowed ? (
        <AssessmentNotice kind="permission" text={t("permissionReadonly")} />
      ) : !gate.canEdit ? (
        <AssessmentNotice kind="time" text={t("windowClosed")} />
      ) : null}

      {students.length === 0 ? (
        <AssessmentEmpty />
      ) : (
        <>
          <div className="mt-3 space-y-3 md:hidden">
            {students.map((student, index) => {
              const edit = edits[student.user_id] ?? { date: "", grade: "" };
              return (
                <article key={student.user_id} className="min-w-0 rounded-2xl border border-border/70 bg-background p-3.5 shadow-sm">
                  <StudentHeading student={student} index={index} />
                  <div className="mt-3 grid gap-3">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">{t("date")}</Label>
                      <Input type="date" disabled={!gate.canEdit || saveMutation.isPending} value={edit.date} onChange={(event) => updateEdit(student.user_id, { date: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl text-base" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">{t("grade")}</Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input type="number" inputMode="decimal" min={0} max={10} step="0.1" disabled={!gate.canEdit || saveMutation.isPending} value={edit.grade} onChange={(event) => updateEdit(student.user_id, { grade: event.target.value })} placeholder="0–10" className="min-h-11 min-w-0 flex-1 rounded-xl text-base" />
                        <span className="shrink-0 text-sm font-bold text-muted-foreground">/10</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border/70 md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-14 text-center">№</TableHead>
                  <TableHead className="min-w-[260px]">{t("student")}</TableHead>
                  <TableHead className="w-52">{t("date")}</TableHead>
                  <TableHead className="w-40">{t("grade")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const edit = edits[student.user_id] ?? { date: "", grade: "" };
                  return (
                    <TableRow key={student.user_id}>
                      <TableCell className="text-center text-xs font-bold text-muted-foreground">{index + 1}</TableCell>
                      <TableCell><StudentName student={student} /></TableCell>
                      <TableCell><Input type="date" disabled={!gate.canEdit || saveMutation.isPending} value={edit.date} onChange={(event) => updateEdit(student.user_id, { date: event.target.value })} className="min-h-10 min-w-40 rounded-xl" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input type="number" min={0} max={10} step="0.1" disabled={!gate.canEdit || saveMutation.isPending} value={edit.grade} onChange={(event) => updateEdit(student.user_id, { grade: event.target.value })} placeholder="0–10" className="w-24 rounded-xl" />
                          <span className="text-xs font-semibold text-muted-foreground">/10</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <AssessmentSaveBar
            state={saveMutation.isPending ? "pending" : saveState}
            dirtyCount={dirtyStudentIds.length}
            disabled={!gate.canEdit || saveMutation.isPending || dirtyStudentIds.length === 0}
            onSave={() => saveMutation.mutate()}
          />
        </>
      )}
    </section>
  );
}

function AssessmentGateBadge({ canEdit }: { canEdit: boolean }) {
  const { t } = useTeacherAssessmentI18n();
  if (canEdit) return <Badge className="rounded-full">{t("windowOpen")}</Badge>;
  return <Badge variant="outline" className="rounded-full">{t("readOnly")}</Badge>;
}

function AssessmentNotice({ kind, text }: { kind: "permission" | "time"; text: string }) {
  const Icon = kind === "time" ? Clock3 : CircleAlert;
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[.05] px-3.5 py-3 text-sm leading-6 text-foreground">
      <Icon className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <span>{text}</span>
    </div>
  );
}

function AssessmentSaveBar({
  state,
  dirtyCount,
  disabled,
  onSave,
}: {
  state: SaveState;
  dirtyCount: number;
  disabled: boolean;
  onSave: () => void;
}) {
  const { t } = useTeacherAssessmentI18n();
  const status = state === "pending" ? t("saving")
    : state === "saved" ? t("saved")
      : state === "error" ? t("saveError")
        : dirtyCount > 0 ? t("changesPending") : t("saved");
  return (
    <div className="sticky bottom-0 z-20 mt-4 -mx-1 rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-[0_-10px_30px_-24px_rgba(0,0,0,.45)] backdrop-blur md:static md:mx-0 md:bg-transparent md:shadow-none md:backdrop-blur-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold",
          state === "error" ? "bg-destructive/10 text-destructive" : state === "saved" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted/40 text-muted-foreground",
        )}>
          {state === "pending" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <CheckCircle2 className="size-4" /> : state === "error" ? <CircleAlert className="size-4" /> : <Save className="size-4" />}
          <span>{status}</span>
        </div>
        <Button type="button" className="min-h-11 w-full rounded-xl font-black sm:w-auto sm:min-w-48" disabled={disabled} onClick={onSave}>
          {state === "pending" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {state === "pending" ? t("saving") : t("saveAll")}
        </Button>
      </div>
    </div>
  );
}

function SubmissionBadge({ status }: { status: WorkRow["status"] }) {
  const { t } = useTeacherAssessmentI18n();
  const label = status === "qiymetlendirilib" ? t("graded") : status === "teqdim_edilib" ? t("submitted") : t("waiting");
  return (
    <Badge
      variant={status === "qiymetlendirilib" ? "default" : "outline"}
      className={cn("rounded-full", status === "teqdim_edilib" && "border-emerald-500/25 bg-emerald-500/[.06] text-emerald-700")}
    >
      {label}
    </Badge>
  );
}

function StudentHeading({ student, index }: { student: ProfileLite; index: number }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-black text-muted-foreground">{index + 1}</div>
      <div className="min-w-0 flex-1"><StudentName student={student} /></div>
    </div>
  );
}

function StudentName({ student }: { student: ProfileLite }) {
  const { t } = useTeacherAssessmentI18n();
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-bold text-foreground">{profileName(student, t("student"))}</div>
      {student.istifadeci_adi ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{student.istifadeci_adi}</div> : null}
    </div>
  );
}

function ReadOnlyField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 break-words text-sm leading-5 text-foreground">{children ?? value}</div>
    </div>
  );
}

function AssessmentEmpty() {
  const { t } = useTeacherAssessmentI18n();
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-12 text-center">
      <UsersRound className="mx-auto size-9 text-muted-foreground/60" />
      <h3 className="mt-3 text-sm font-bold text-foreground">{t("noStudentsTitle")}</h3>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">{t("noStudentsHint")}</p>
    </div>
  );
}

function AssessmentSkeleton() {
  return (
    <section className="role-panel-enter rounded-[28px] border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="animate-pulse">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="mt-2 h-4 w-full max-w-xl rounded bg-muted/70" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl border border-border/50 bg-muted/30" />)}
        </div>
      </div>
    </section>
  );
}

function AssessmentError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTeacherAssessmentI18n();
  return (
    <section className="role-panel-enter rounded-[28px] border border-destructive/20 bg-card px-5 py-12 text-center shadow-sm">
      <CircleAlert className="mx-auto size-9 text-destructive" />
      <h3 className="mt-3 text-sm font-bold text-foreground">{t("saveError")}</h3>
      <Button type="button" variant="outline" className="mt-4 min-h-11 rounded-xl" onClick={onRetry}>{t("retry")}</Button>
    </section>
  );
}

function storageTarget(fileUrl: string): { bucket: string; path: string } | null {
  const raw = fileUrl.trim();
  for (const bucket of ["course-materials", "note-files"]) {
    if (raw.startsWith(`${bucket}/`)) return { bucket, path: raw.slice(bucket.length + 1) };
  }

  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1] ?? "");
    if (bucket !== "course-materials" && bucket !== "note-files") return null;
    return { bucket, path: decodeURIComponent(match[2] ?? "") };
  } catch {
    return null;
  }
}

async function openSubmission(fileUrl: string, fallbackMessage: string) {
  try {
    const target = storageTarget(fileUrl);
    if (target) {
      const { data, error } = await supabase.storage.from(target.bucket).createSignedUrl(target.path, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    throw new Error(fallbackMessage);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : fallbackMessage);
  }
}