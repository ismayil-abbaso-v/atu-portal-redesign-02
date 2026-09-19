import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import {
  examMaterialKeys,
  fetchExamMaterials,
  mergeUpcomingExamsWithMaterials,
  type ScheduledExamForMerge,
  type StudentUpcomingExam,
} from "@/lib/exam-materials";
import { semesterNumber } from "@/lib/tutor-workspace-data";

export type UpcomingExam = StudentUpcomingExam;

export function useUpcomingExams(userId: string | null) {
  const today = format(new Date(), "yyyy-MM-dd");

  const periodQuery = useQuery({
    queryKey: ["student-upcoming-exams", "period", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("cari_tedris_ili, cari_semestr")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return {
        academicYear: data?.cari_tedris_ili?.trim() ?? "",
        semester: semesterNumber(data?.cari_semestr),
      };
    },
    staleTime: 60_000,
  });

  const groupQuery = useQuery({
    queryKey: ["student-exam-schedule-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId || "");
      if (error) throw error;
      return [...new Set((data ?? []).map((row) => row.group_id))];
    },
    enabled: !!userId,
  });
  const groupIds = groupQuery.data ?? [];
  const academicYear = periodQuery.data?.academicYear ?? "";
  const semester = periodQuery.data?.semester ?? null;

  const courseLinkQuery = useQuery({
    queryKey: ["student-upcoming-exams", "course-links", userId, academicYear, semester, groupIds],
    enabled: Boolean(groupIds.length && academicYear && semester),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("course_id, group_id")
        .in("group_id", groupIds)
        .eq("tedris_ili", academicYear)
        .eq("semestr", semester!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const courseIds = [...new Set((courseLinkQuery.data ?? []).map((row) => row.course_id))];

  const scheduleQuery = useQuery<ScheduledExamForMerge[]>({
    queryKey: ["student-upcoming-exams", "schedule", userId, groupIds, today],
    queryFn: async () => {
      if (!groupIds.length) return [];
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("id, group_id, course_id, imtahan_tarixi, baslangic_saat, otaq, courses:course_id(ad)")
        .in("group_id", groupIds)
        .gte("imtahan_tarixi", today)
        .order("imtahan_tarixi", { ascending: true })
        .order("baslangic_saat", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduledExamForMerge[];
    },
    enabled: groupIds.length > 0,
  });

  const materialsQuery = useQuery({
    queryKey: userId ? examMaterialKeys.scope(userId, "telebe", academicYear, semester, groupIds, courseIds) : ["exam-materials", "anonymous"],
    enabled: Boolean(userId && groupIds.length && courseIds.length && academicYear && semester),
    queryFn: () => fetchExamMaterials({ academicYear, semester: semester!, groupIds, courseIds }),
  });

  const courseNamesQuery = useQuery({
    queryKey: ["student-upcoming-exams", "course-names", userId, courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, ad").in("id", courseIds);
      if (error) throw error;
      return new Map((data ?? []).map((course) => [course.id, course.ad]));
    },
  });

  const takenQuery = useQuery<string[]>({
    queryKey: ["student-taken-course-ids", userId, academicYear, semester],
    queryFn: async () => {
      if (!academicYear || !semester) return [];
      const { data, error } = await supabase
        .from("exam_scores")
        .select("course_id, imtahan_bali")
        .eq("user_id", userId || "")
        .eq("tedris_ili", academicYear)
        .eq("semestr", semester);
      if (error) throw error;
      return (data ?? []).filter((row) => row.course_id && row.imtahan_bali !== null).map((row) => row.course_id as string);
    },
    enabled: Boolean(userId && academicYear && semester),
  });

  const takenSet = new Set(takenQuery.data ?? []);
  const merged = mergeUpcomingExamsWithMaterials(
    scheduleQuery.data ?? [],
    materialsQuery.data ?? [],
    courseNamesQuery.data ?? new Map<string, string>(),
  );
  const exams = merged.filter((exam) => !takenSet.has(exam.course_id));

  return {
    exams,
    isLoading: periodQuery.isLoading || groupQuery.isLoading || courseLinkQuery.isLoading || scheduleQuery.isLoading || materialsQuery.isLoading || courseNamesQuery.isLoading || takenQuery.isLoading,
    isError: periodQuery.isError || groupQuery.isError || courseLinkQuery.isError || scheduleQuery.isError || materialsQuery.isError || courseNamesQuery.isError || takenQuery.isError,
  };
}
