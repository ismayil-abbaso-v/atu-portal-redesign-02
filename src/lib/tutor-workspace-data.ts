import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchTutorUpcomingExamSchedules } from "@/lib/exam-schedule-data";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";

type PeriodRow = Pick<Database["public"]["Tables"]["system_settings"]["Row"], "cari_tedris_ili" | "cari_semestr">;
export type TutorGroupLite = Pick<Database["public"]["Tables"]["groups"]["Row"], "id" | "ad" | "faculty_id">;
export type TutorCourseLite = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "ad" | "kod" | "kurs" | "kredit">;
export type TutorExamLite = Pick<Database["public"]["Tables"]["exam_schedule"]["Row"], "id" | "group_id" | "course_id" | "imtahan_tarixi" | "baslangic_saat" | "otaq">;
export type TutorStudentLite = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "ad" | "soyad" | "avatar_url" | "istifadeci_adi">;

export type TutorPeriod = {
  year: string | null;
  semesterLabel: string | null;
  semester: number | null;
};

export type TutorMonitoringSummary = {
  sessionCount: number;
  confirmedCount: number;
  assessmentCount: number;
  latestConfirmedDate: string | null;
};

export function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az-AZ");
  if (["payız", "payiz", "fall", "autumn", "1", "i"].includes(normalized)) return 1;
  if (["yaz", "spring", "2", "ii"].includes(normalized)) return 2;
  return null;
}

export function bakuTodayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export async function fetchTutorPeriod(): Promise<TutorPeriod> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("cari_tedris_ili, cari_semestr")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  const row = data as PeriodRow | null;
  return {
    year: row?.cari_tedris_ili ?? null,
    semesterLabel: row?.cari_semestr ?? null,
    semester: semesterNumber(row?.cari_semestr),
  };
}

export async function fetchTutorAssignedGroups(userId: string): Promise<TutorGroupLite[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("id, ad, faculty_id")
    .eq("tyutor_id", userId)
    .eq("arxivlenib", false)
    .order("ad");
  if (error) throw error;
  return (data ?? []) as TutorGroupLite[];
}

export async function fetchTutorGroupCourses(groupId: string, period: TutorPeriod): Promise<TutorCourseLite[]> {
  if (!period.year || !period.semester) return [];
  const { data: links, error: linkError } = await supabase
    .from("course_groups")
    .select("course_id")
    .eq("group_id", groupId)
    .eq("tedris_ili", period.year)
    .eq("semestr", period.semester);
  if (linkError) throw linkError;
  const courseIds = [...new Set((links ?? []).map((row) => row.course_id))];
  if (!courseIds.length) return [];

  const { data, error } = await supabase
    .from("courses")
    .select("id, ad, kod, kurs, kredit")
    .in("id", courseIds)
    .order("ad");
  if (error) throw error;
  return (data ?? []) as TutorCourseLite[];
}

export async function fetchTutorGroupUpcomingExams(groupId: string, courseIds: string[], limit = 5): Promise<TutorExamLite[]> {
  if (!groupId || !courseIds.length) return [];
  const rows = await fetchTutorUpcomingExamSchedules(
    courseIds.map((courseId) => ({ group_id: groupId, course_id: courseId })),
    limit,
  );
  return rows.map(({ id, group_id, course_id, imtahan_tarixi, baslangic_saat, otaq }) => ({
    id,
    group_id,
    course_id,
    imtahan_tarixi,
    baslangic_saat,
    otaq,
  }));
}

export async function fetchTutorGroupStudents(groupId: string): Promise<TutorStudentLite[]> {
  const { data: members, error: memberError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  if (memberError) throw memberError;
  const userIds = [...new Set((members ?? []).map((row) => row.user_id))];
  if (!userIds.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, ad, soyad, avatar_url, istifadeci_adi")
    .in("user_id", userIds);
  if (error) throw error;
  return ((data ?? []) as TutorStudentLite[]).sort(compareStudentProfilesBySurnameThenName);
}

export async function fetchTutorMonitoringSummary(groupId: string, courseIds: string[]): Promise<TutorMonitoringSummary> {
  if (!courseIds.length) return { sessionCount: 0, confirmedCount: 0, assessmentCount: 0, latestConfirmedDate: null };

  const [sessionsResult, independentResult, courseWorkResult, colloquiumResult] = await Promise.all([
    supabase
      .from("course_lesson_sessions")
      .select("id, lesson_date, is_confirmed")
      .eq("group_id", groupId)
      .in("course_id", courseIds)
      .order("lesson_date", { ascending: false }),
    supabase.from("independent_work_assessments").select("id", { count: "exact", head: true }).in("course_id", courseIds),
    supabase.from("course_work_assessments").select("id", { count: "exact", head: true }).in("course_id", courseIds),
    supabase.from("colloquium_assessments").select("id", { count: "exact", head: true }).in("course_id", courseIds),
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (independentResult.error) throw independentResult.error;
  if (courseWorkResult.error) throw courseWorkResult.error;
  if (colloquiumResult.error) throw colloquiumResult.error;

  const sessions = sessionsResult.data ?? [];
  const confirmed = sessions.filter((session) => session.is_confirmed);
  return {
    sessionCount: sessions.length,
    confirmedCount: confirmed.length,
    assessmentCount: (independentResult.count ?? 0) + (courseWorkResult.count ?? 0) + (colloquiumResult.count ?? 0),
    latestConfirmedDate: confirmed[0]?.lesson_date ?? null,
  };
}
