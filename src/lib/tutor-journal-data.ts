import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SessionRow = Database["public"]["Tables"]["course_lesson_sessions"]["Row"];
type RecordRow = Database["public"]["Tables"]["lesson_student_records"]["Row"];
type IndependentRow = Database["public"]["Tables"]["independent_work_assessments"]["Row"];
type CourseWorkRow = Database["public"]["Tables"]["course_work_assessments"]["Row"];
type ColloquiumRow = Database["public"]["Tables"]["colloquium_assessments"]["Row"];
type TopicRow = Database["public"]["Tables"]["course_topics"]["Row"];
type TeacherRow = Database["public"]["Tables"]["course_teachers"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type TutorJournalSession = Pick<
  SessionRow,
  | "id"
  | "course_id"
  | "group_id"
  | "teacher_id"
  | "lesson_date"
  | "starts_at"
  | "ends_at"
  | "topic_id"
  | "movzu"
  | "is_confirmed"
  | "confirmed_at"
  | "confirmed_by"
  | "dars_novu"
>;

export type TutorJournalRecord = Pick<
  RecordRow,
  "id" | "lesson_session_id" | "student_id" | "course_id" | "attendance_status" | "grade" | "lab_submitted" | "file_url"
>;

export type TutorJournalIndependent = Pick<
  IndependentRow,
  "id" | "course_id" | "student_id" | "sira" | "topic_id" | "topic" | "file_url" | "grade" | "submitted_at" | "status"
>;

export type TutorJournalCourseWork = Pick<
  CourseWorkRow,
  "id" | "course_id" | "student_id" | "sira" | "topic_id" | "topic" | "file_url" | "grade" | "submitted_at" | "status"
>;

export type TutorJournalColloquium = Pick<
  ColloquiumRow,
  "id" | "course_id" | "student_id" | "sira" | "tarix" | "grade"
>;

export type TutorJournalTopic = Pick<TopicRow, "id" | "course_id" | "dars_novu" | "movzu" | "tarix" | "sira">;
export type TutorJournalTeacher = Pick<TeacherRow, "course_id" | "muellim_id" | "icazeler"> & {
  profile: Pick<ProfileRow, "user_id" | "ad" | "soyad"> | null;
};

export type TutorJournalAssessments = {
  independent: TutorJournalIndependent[];
  coursework: TutorJournalCourseWork[];
  colloquium: TutorJournalColloquium[];
};

export async function fetchTutorJournalSessions(groupId: string, courseId: string): Promise<TutorJournalSession[]> {
  if (!groupId || !courseId) return [];
  const { data, error } = await supabase
    .from("course_lesson_sessions")
    .select("id, course_id, group_id, teacher_id, lesson_date, starts_at, ends_at, topic_id, movzu, is_confirmed, confirmed_at, confirmed_by, dars_novu")
    .eq("group_id", groupId)
    .eq("course_id", courseId)
    .order("lesson_date", { ascending: false })
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TutorJournalSession[];
}

export async function fetchTutorJournalSessionRecords(sessionId: string): Promise<TutorJournalRecord[]> {
  if (!sessionId) return [];
  const { data, error } = await supabase
    .from("lesson_student_records")
    .select("id, lesson_session_id, student_id, course_id, attendance_status, grade, lab_submitted, file_url")
    .eq("lesson_session_id", sessionId);
  if (error) throw error;
  return (data ?? []) as TutorJournalRecord[];
}

export async function fetchTutorJournalTopics(courseId: string): Promise<TutorJournalTopic[]> {
  if (!courseId) return [];
  const { data, error } = await supabase
    .from("course_topics")
    .select("id, course_id, dars_novu, movzu, tarix, sira")
    .eq("course_id", courseId)
    .order("tarix", { ascending: true })
    .order("sira", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TutorJournalTopic[];
}

export async function fetchTutorJournalTeachers(courseId: string, historicalTeacherIds: string[] = []): Promise<TutorJournalTeacher[]> {
  if (!courseId) return [];
  const { data: assignments, error } = await supabase
    .from("course_teachers")
    .select("course_id, muellim_id, icazeler")
    .eq("course_id", courseId);
  if (error) throw error;

  const teacherIds = [...new Set([...(assignments ?? []).map((row) => row.muellim_id), ...historicalTeacherIds].filter(Boolean))];
  if (!teacherIds.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, ad, soyad")
    .in("user_id", teacherIds);
  if (profileError) throw profileError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const assignmentMap = new Map((assignments ?? []).map((assignment) => [assignment.muellim_id, assignment]));

  return teacherIds.map((teacherId) => {
    const assignment = assignmentMap.get(teacherId);
    return {
      course_id: assignment?.course_id ?? courseId,
      muellim_id: teacherId,
      icazeler: assignment?.icazeler ?? {},
      profile: profileMap.get(teacherId) ?? null,
    };
  });
}

export async function fetchTutorJournalAssessments(courseId: string, studentIds: string[]): Promise<TutorJournalAssessments> {
  if (!courseId || !studentIds.length) return { independent: [], coursework: [], colloquium: [] };
  const [independent, coursework, colloquium] = await Promise.all([
    supabase
      .from("independent_work_assessments")
      .select("id, course_id, student_id, sira, topic_id, topic, file_url, grade, submitted_at, status")
      .eq("course_id", courseId)
      .in("student_id", studentIds)
      .order("student_id")
      .order("sira"),
    supabase
      .from("course_work_assessments")
      .select("id, course_id, student_id, sira, topic_id, topic, file_url, grade, submitted_at, status")
      .eq("course_id", courseId)
      .in("student_id", studentIds)
      .order("student_id")
      .order("sira"),
    supabase
      .from("colloquium_assessments")
      .select("id, course_id, student_id, sira, tarix, grade")
      .eq("course_id", courseId)
      .in("student_id", studentIds)
      .order("student_id")
      .order("sira"),
  ]);

  if (independent.error) throw independent.error;
  if (coursework.error) throw coursework.error;
  if (colloquium.error) throw colloquium.error;

  return {
    independent: (independent.data ?? []) as TutorJournalIndependent[],
    coursework: (coursework.data ?? []) as TutorJournalCourseWork[],
    colloquium: (colloquium.data ?? []) as TutorJournalColloquium[],
  };
}
