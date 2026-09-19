import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ExamScheduleLite = Pick<
  Database["public"]["Tables"]["exam_schedule"]["Row"],
  "id" | "group_id" | "course_id" | "imtahan_tarixi" | "baslangic_saat" | "otaq" | "yaradan_id" | "created_at" | "updated_at"
>;

export type ExamSchedulePair = { group_id: string; course_id: string };

export const examScheduleKeys = {
  tutorRoot: (userId: string) => ["tutor-exam-schedule", userId] as const,
  tutorGroup: (userId: string, groupId: string, courseIds: readonly string[]) =>
    ["tutor-exam-schedule", userId, groupId, [...courseIds].sort().join(",")] as const,
  tutorUpcoming: (userId: string, pairs: readonly ExamSchedulePair[]) =>
    [
      "tutor-exam-schedule",
      "upcoming",
      userId,
      [...pairs]
        .map((pair) => `${pair.group_id}:${pair.course_id}`)
        .sort()
        .join(","),
    ] as const,
};

export function examScheduleTodayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export async function fetchExamSchedulesForPairs(
  pairs: readonly ExamSchedulePair[],
  options: { fromDate?: string | null; limit?: number | null } = {},
): Promise<ExamScheduleLite[]> {
  if (!pairs.length) return [];

  const normalizedPairs = [...new Map(pairs.map((pair) => [`${pair.group_id}:${pair.course_id}`, pair])).values()];
  const groupIds = [...new Set(normalizedPairs.map((pair) => pair.group_id))];
  const courseIds = [...new Set(normalizedPairs.map((pair) => pair.course_id))];
  const validPairs = new Set(normalizedPairs.map((pair) => `${pair.group_id}:${pair.course_id}`));

  let query = supabase
    .from("exam_schedule")
    .select("id, group_id, course_id, imtahan_tarixi, baslangic_saat, otaq, yaradan_id, created_at, updated_at")
    .in("group_id", groupIds)
    .in("course_id", courseIds)
    .order("imtahan_tarixi", { ascending: true })
    .order("baslangic_saat", { ascending: true });

  if (options.fromDate) query = query.gte("imtahan_tarixi", options.fromDate);
  if (options.limit && options.limit > 0) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ExamScheduleLite[]).filter((exam) => validPairs.has(`${exam.group_id}:${exam.course_id}`));
}

export async function fetchTutorUpcomingExamSchedules(
  pairs: readonly ExamSchedulePair[],
  limit = 5,
): Promise<ExamScheduleLite[]> {
  return fetchExamSchedulesForPairs(pairs, { fromDate: examScheduleTodayIso(), limit });
}

export function examScheduleErrorCode(error: unknown):
  | "roomRequired"
  | "courseScope"
  | "duplicateCourse"
  | "groupTimeConflict"
  | "roomTimeConflict"
  | "forbidden"
  | "unknown" {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("EXAM_ROOM_REQUIRED")) return "roomRequired";
  if (message.includes("EXAM_COURSE_GROUP_SCOPE")) return "courseScope";
  if (message.includes("EXAM_DUPLICATE_COURSE") || message.includes("exam_schedule_one_per_course_uidx")) return "duplicateCourse";
  if (message.includes("EXAM_GROUP_TIME_CONFLICT") || message.includes("exam_schedule_group_slot_uidx")) return "groupTimeConflict";
  if (message.includes("EXAM_ROOM_TIME_CONFLICT") || message.includes("exam_schedule_room_slot_uidx")) return "roomTimeConflict";
  if (message.includes("row-level security") || message.includes("permission denied") || message.includes("42501")) return "forbidden";
  return "unknown";
}
