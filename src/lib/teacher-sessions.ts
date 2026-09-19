import { supabase } from "@/integrations/supabase/client";

export type TeacherLessonSession = {
  id: string;
  schedule_template_id: string | null;
  course_id: string;
  group_id: string;
  teacher_id: string;
  lesson_date: string;
  starts_at: string;
  ends_at: string;
  dars_novu: string | null;
  movzu: string | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  draft_saved_at: string | null;
  auto_confirmed: boolean;
  auto_confirmed_at: string | null;
  auto_finalize_enabled: boolean;
};

export type TeacherSessionCourseRoom = {
  id: string;
  otaq: string | null;
  otaqlar: unknown;
};

export type TeacherSessionTemplateRoom = {
  id: string;
  otaq: string | null;
};

export type TeacherSessionRoomMaps = {
  courses: Map<string, TeacherSessionCourseRoom>;
  templates: Map<string, string | null>;
};

const SESSION_COLUMNS = [
  "id",
  "schedule_template_id",
  "course_id",
  "group_id",
  "teacher_id",
  "lesson_date",
  "starts_at",
  "ends_at",
  "dars_novu",
  "movzu",
  "is_confirmed",
  "confirmed_at",
  "draft_saved_at",
  "auto_confirmed",
  "auto_confirmed_at",
  "auto_finalize_enabled",
].join(", ");

export function normalizeTeacherLessonType(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (!normalized) return null;
  if (normalized === "mühazirə" || normalized === "muhazire") return "muhazire";
  if (normalized === "seminar") return "seminar";
  if (normalized === "laboratoriya" || normalized === "laboratory" || normalized === "lab") return "laboratoriya";
  if (["təcrübə", "tecrube", "məşğələ", "meshgele", "practice"].includes(normalized)) return "tecrube";
  if (["sərbəst iş", "serbest_is", "independent"].includes(normalized)) return "serbest_is";
  if (["kollokvium", "colloquium"].includes(normalized)) return "kollokvium";
  return normalized;
}

export function teacherSessionPairKey(courseId: string, groupId: string) {
  return `${courseId}:${groupId}`;
}

export function bakuDayKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function teacherSessionStatus(session: Pick<TeacherLessonSession, "starts_at" | "ends_at" | "is_confirmed">, nowMs: number) {
  const starts = new Date(session.starts_at).getTime();
  const ends = new Date(session.ends_at).getTime();
  if (session.is_confirmed || nowMs >= ends) return "completed" as const;
  if (nowMs < starts) return "future" as const;
  return "active" as const;
}

export function teacherSessionIsActive(session: Pick<TeacherLessonSession, "starts_at" | "ends_at" | "is_confirmed">, nowMs: number) {
  return teacherSessionStatus(session, nowMs) === "active";
}

function roomFromCourse(course: TeacherSessionCourseRoom | undefined, lessonType: string | null | undefined) {
  if (!course) return null;
  const rooms = course.otaqlar;
  const lessonKey = normalizeTeacherLessonType(lessonType);

  if (rooms && typeof rooms === "object" && !Array.isArray(rooms)) {
    const record = rooms as Record<string, unknown>;
    const candidates = lessonKey
      ? [lessonKey, lessonKey === "tecrube" ? "meshgele" : lessonKey]
      : [];
    for (const candidate of candidates) {
      const value = record[candidate];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  if (course.otaq?.trim()) return course.otaq.trim();

  if (Array.isArray(rooms)) {
    const first = rooms.find((value) => typeof value === "string" && value.trim());
    if (typeof first === "string") return first.trim();
  }
  return null;
}

export function resolveTeacherSessionRoom(
  session: Pick<TeacherLessonSession, "schedule_template_id" | "course_id" | "dars_novu">,
  roomMaps: TeacherSessionRoomMaps,
) {
  if (session.schedule_template_id) {
    const templateRoom = roomMaps.templates.get(session.schedule_template_id);
    if (templateRoom?.trim()) return templateRoom.trim();
  }
  return roomFromCourse(roomMaps.courses.get(session.course_id), session.dars_novu);
}

export async function fetchTeacherSessionRoomMaps(sessions: TeacherLessonSession[]): Promise<TeacherSessionRoomMaps> {
  const courseIds = [...new Set(sessions.map((session) => session.course_id))];
  const templateIds = [
    ...new Set(sessions.map((session) => session.schedule_template_id).filter((value): value is string => Boolean(value))),
  ];

  const [courseResult, templateResult] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id, otaq, otaqlar").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    templateIds.length
      ? supabase.from("course_schedule_templates").select("id, otaq").in("id", templateIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (courseResult.error) throw courseResult.error;
  if (templateResult.error) throw templateResult.error;

  return {
    courses: new Map(((courseResult.data ?? []) as TeacherSessionCourseRoom[]).map((row) => [row.id, row])),
    templates: new Map(((templateResult.data ?? []) as TeacherSessionTemplateRoom[]).map((row) => [row.id, row.otaq])),
  };
}

export async function fetchTeacherLessonSessions({
  userId,
  courseId,
  groupId,
  courseIds,
  groupIds,
  allowedPairs,
  startDate,
  endDate,
  endsAfter,
  limit = 180,
}: {
  userId: string;
  courseId?: string;
  groupId?: string;
  courseIds?: string[];
  groupIds?: string[];
  allowedPairs?: ReadonlySet<string>;
  startDate?: string;
  endDate?: string;
  endsAfter?: string;
  limit?: number;
}): Promise<TeacherLessonSession[]> {
  let query = supabase
    .from("course_lesson_sessions")
    .select(SESSION_COLUMNS)
    .eq("teacher_id", userId)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (courseId) query = query.eq("course_id", courseId);
  if (groupId) query = query.eq("group_id", groupId);
  if (courseIds?.length) query = query.in("course_id", courseIds);
  if (groupIds?.length) query = query.in("group_id", groupIds);
  if (startDate) query = query.gte("lesson_date", startDate);
  if (endDate) query = query.lte("lesson_date", endDate);
  if (endsAfter) query = query.gte("ends_at", endsAfter);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as TeacherLessonSession[];
  if (!allowedPairs) return rows;
  return rows.filter((row) => allowedPairs.has(teacherSessionPairKey(row.course_id, row.group_id)));
}
