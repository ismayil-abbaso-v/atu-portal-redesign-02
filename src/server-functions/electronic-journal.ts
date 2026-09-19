import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/live-database";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

type DailyLessonRecordInput = {
  studentId: string;
  attendanceStatus: "iştirak edib" | "qayıb";
  grade?: number | null;
  labSubmitted?: boolean | null;
};

function required(value: string, field: string) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${field} tələb olunur.`);
  return normalized;
}

/**
 * 50-ballıq semestr balını DB-dəki vahid formul ilə hesablayır və exam_scores-a yazır.
 * DB trigger-ləri də eyni private formula/sync funksiyasından istifadə edir.
 */
export const calculateSemesterScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { courseId: string; studentId: string }) => ({
    courseId: required(data.courseId, "courseId"),
    studentId: required(data.studentId, "studentId"),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: score, error } = await supabase.rpc("calculate_semester_score", {
      p_course_id: data.courseId,
      p_student_id: data.studentId,
    });
    if (error) throw new Error(error.message);
    return { score: score === null ? null : Number(score) };
  });

/** Backend-in məcburi müəllim+təyinat+icazə+±5 dəqiqə yoxlaması. */
export const canGradeNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { lessonId: string; teacherId: string }) => ({
    lessonId: required(data.lessonId, "lessonId"),
    teacherId: required(data.teacherId, "teacherId"),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: allowed, error } = await supabase.rpc("can_grade_now", {
      p_lesson_id: data.lessonId,
      p_teacher_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return { allowed: Boolean(allowed) };
  });

/**
 * Mövzu + bütün tələbələrin davamiyyəti + gündəlik qiymətləndirmə bir transaction-da
 * yazılır və sessiya təsdiqlənərək kilidlənir. Yekun icazə/vaxt yoxlaması DB RPC-dədir.
 */
export const confirmLessonGrading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { lessonId: string; topic: string; records: DailyLessonRecordInput[] }) => {
    const lessonId = required(data.lessonId, "lessonId");
    const topic = required(data.topic, "Mövzu");
    if (!Array.isArray(data.records) || data.records.length === 0) {
      throw new Error("Tələbə siyahısı boş ola bilməz.");
    }

    const records = data.records.map((record) => {
      const studentId = required(record.studentId, "studentId");
      if (record.attendanceStatus !== "iştirak edib" && record.attendanceStatus !== "qayıb") {
        throw new Error("Davamiyyət seçimi yanlışdır.");
      }
      if (
        record.grade !== null &&
        record.grade !== undefined &&
        (!Number.isFinite(record.grade) || record.grade < 0 || record.grade > 10)
      ) {
        throw new Error("Qiymət 0-10 aralığında olmalıdır.");
      }
      return {
        studentId,
        attendanceStatus: record.attendanceStatus,
        grade: record.grade ?? null,
        labSubmitted: Boolean(record.labSubmitted),
      };
    });

    return { lessonId, topic, records };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const payload = data.records.map((record) => ({
      student_id: record.studentId,
      attendance_status: record.attendanceStatus,
      grade: record.grade,
      lab_submitted: record.labSubmitted,
    }));

    const { data: confirmed, error } = await supabase.rpc("confirm_lesson_grading", {
      p_lesson_id: data.lessonId,
      p_topic: data.topic,
      p_records: payload,
    });
    if (error) throw new Error(error.message);
    return { confirmed: Boolean(confirmed) };
  });

export const getWeekParity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { date: string }) => ({ date: required(data.date, "date") }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: parity, error } = await supabase.rpc("get_week_parity", { p_date: data.date });
    if (error) throw new Error(error.message);
    return { parity };
  });

export const getAtRiskStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { groupId: string }) => ({ groupId: required(data.groupId, "groupId") }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: students, error } = await supabase.rpc("at_risk_students", {
      p_group_id: data.groupId,
    });
    if (error) throw new Error(error.message);
    return students ?? [];
  });

/** Cari system_settings semester aralığında idempotent sessiya generasiyası. */
export const generateSemesterSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { courseId?: string | null; groupId?: string | null }) => ({
    courseId: data.courseId?.trim() || undefined,
    groupId: data.groupId?.trim() || undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: inserted, error } = await supabase.rpc("generate_current_semester_lesson_sessions", {
      ...(data.courseId ? { p_course_id: data.courseId } : {}),
      ...(data.groupId ? { p_group_id: data.groupId } : {}),
    });
    if (error) throw new Error(error.message);
    return { inserted: Number(inserted ?? 0) };
  });

/** Admin/dekan üçün auditli xüsusi kilid-açma əməliyyatı. */
export const unlockLessonSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { lessonId: string; reason: string }) => ({
    lessonId: required(data.lessonId, "lessonId"),
    reason: required(data.reason, "reason"),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: unlocked, error } = await supabase.rpc("unlock_lesson_session", {
      p_lesson_id: data.lessonId,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { unlocked: Boolean(unlocked) };
  });
