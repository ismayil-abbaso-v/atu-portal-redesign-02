// src/hooks/use-student-exam-results.ts
//
// Tələbənin BÜTÜN imtahan nəticələrini (semestr icmalı + detallı test/bilet
// nəticələri) vahid, tip-təhlükəsiz formada gətirən hook.
//
// TƏHLÜKƏSİZLİK: userId HEÇ VAXT parametr/prop kimi kənardan verilmir —
// yalnız `useUserRoles()` vasitəsilə cari sessiyadan (`auth.uid()`) gəlir.
// Bu, bir istifadəçinin başqasının ID-sini manual şəkildə ötürüb onun
// nəticələrini görməsinin qarşısını alır (Mərhələ 0 qaydası).

import { useQueries } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-user-role";
import type { Database } from "@/integrations/supabase/types";
import { normalizeAnswersData, type NormalizedAnswer } from "@/lib/exam-answer-utils";

type ExamScoreRow = Database["public"]["Tables"]["exam_scores"]["Row"];
type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ExamDetailedResultRow = Database["public"]["Tables"]["exam_detailed_results"]["Row"];

/** `exam_scores` sətri, join olunmuş `courses` datası ilə birlikdə. */
export interface SemesterExamScore extends ExamScoreRow {
  courses: CourseRow | null;
}

/** `exam_detailed_results` sətri, `answers_data` normalize olunmuş halda. */
export interface DetailedExamResult extends Omit<
  ExamDetailedResultRow,
  "answers_data" | "exam_type"
> {
  examType: "test" | "ticket";
  answers: NormalizedAnswer[];
}

export interface UseStudentExamResultsResult {
  /** Semestr icmalı (`exam_scores` + `courses` join). */
  semesterScores: SemesterExamScore[];
  /** Detallı test/bilet nəticələri, normalize olunmuş `answers_data` ilə. */
  detailedResults: DetailedExamResult[];
  /** İki mənbədən gələn ümumi imtahan sayı (siyahı/kart sayğacları üçün). */
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  /** Xəta baş veribsə, ilk xətanın obyekti (mövcuddursa). */
  error: unknown;
  isEmpty: boolean;
  refetch: () => void;
}

export function useStudentExamResults(): UseStudentExamResultsResult {
  const { userId } = useUserRoles();

  const results = useQueries({
    queries: [
      {
        queryKey: ["student-exam-scores", userId],
        queryFn: async (): Promise<SemesterExamScore[]> => {
          if (!userId) return [];
          const { data, error } = await supabase
            .from("exam_scores")
            .select("*, courses(*)")
            .eq("user_id", userId);
          if (error) throw error;
          return (data ?? []) as SemesterExamScore[];
        },
        enabled: !!userId,
      },
      {
        queryKey: ["student-exam-detailed-results", userId],
        queryFn: async (): Promise<DetailedExamResult[]> => {
          if (!userId) return [];
          const { data, error } = await supabase
            .from("exam_detailed_results")
            .select("*")
            .eq("student_id", userId)
            .order("exam_completed_at", { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row): DetailedExamResult => {
            const { answers_data, exam_type, ...rest } = row;
            const examType: "test" | "ticket" = exam_type === "ticket" ? "ticket" : "test";
            return {
              ...rest,
              examType,
              answers: normalizeAnswersData(answers_data, examType),
            };
          });
        },
        enabled: !!userId,
      },
    ],
  });

  const [scoresQuery, detailedQuery] = results;
  const semesterScores = scoresQuery.data ?? [];
  const detailedResults = detailedQuery.data ?? [];

  const isLoading = scoresQuery.isLoading || detailedQuery.isLoading;
  const isError = scoresQuery.isError || detailedQuery.isError;
  const error = scoresQuery.error ?? detailedQuery.error ?? null;
  const totalCount = semesterScores.length + detailedResults.length;

  return {
    semesterScores,
    detailedResults,
    totalCount,
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && totalCount === 0,
    refetch: () => {
      void scoresQuery.refetch();
      void detailedQuery.refetch();
    },
  };
}
