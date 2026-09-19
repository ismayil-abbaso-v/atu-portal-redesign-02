// src/lib/exam-result-view-model.ts
//
// `exam_scores` (semestr icmalı) və `exam_detailed_results` (test/bilet
// nəticələri) iki fərqli cədvəldir, fərqli sütunlara malikdir və heç bir
// yerdə bir-birinə bağlanmır (`exam_detailed_results`-də `course_id` belə
// yoxdur). İstifadəçi üçün isə bunlar eyni vizual dildə, TƏK siyahıda
// görünməlidir (Mərhələ 4, bənd 4). Bu fayl ikisini vahid
// `ExamResultViewModel` formasına çevirir.

import type { DetailedExamResult, SemesterExamScore } from "@/hooks/use-student-exam-results";
import type { NormalizedAnswer } from "@/lib/exam-answer-utils";

export type ExamResultKind = "semester" | "test" | "ticket";

/** Test və bilet imtahanlarının vahid maksimum balı. */
export const EXAM_MAX_SCORE = 50;

export interface ExamResultDetailStats {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}

export interface ExamResultSemesterBreakdown {
  semesterScore: number | null;
  examScore: number | null;
}

export interface ExamResultViewModel {
  id: string;
  kind: ExamResultKind;
  title: string;
  initials: string;
  currentScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  startedAt: string | null;
  completedAt: string | null;
  hasQuestionDetail: boolean;
  answers: NormalizedAnswer[];
  courseRef: { id: string; ad: string } | null;
  detailStats: ExamResultDetailStats | null;
  semesterBreakdown: ExamResultSemesterBreakdown | null;
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function percentageFromScore(current: number | null, max: number | null): number | null {
  if (current === null || max === null || max <= 0) return null;
  const pct = (current / max) * 100;
  return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null;
}

export function semesterScoreToViewModel(score: SemesterExamScore): ExamResultViewModel {
  const courseName = score.courses?.ad ?? "Fənn";
  const semesterScore = typeof score.semestr_qiymeti === "number" ? score.semestr_qiymeti : null;
  const examScore = typeof score.imtahan_bali === "number" ? score.imtahan_bali : null;
  const hasComponents = semesterScore !== null || examScore !== null;

  const currentScore = hasComponents
    ? (semesterScore ?? 0) + (examScore ?? 0)
    : (typeof score.yekun_qiymet === "number" ? score.yekun_qiymet : null);
  const maxScore = currentScore !== null ? 100 : null;

  return {
    id: `semester-${score.id}`,
    kind: "semester",
    title: courseName,
    initials: deriveInitials(courseName),
    currentScore,
    maxScore,
    percentage: percentageFromScore(currentScore, maxScore),
    startedAt: null,
    completedAt: score.created_at ?? null,
    hasQuestionDetail: false,
    answers: [],
    courseRef: score.courses ? { id: score.courses.id, ad: score.courses.ad } : null,
    detailStats: null,
    semesterBreakdown: hasComponents ? { semesterScore, examScore } : null,
  };
}

export function detailedResultToViewModel(result: DetailedExamResult): ExamResultViewModel {
  const title =
    result.exam_name || (result.examType === "ticket" ? "Bilet imtahanı" : "Test imtahanı");

  // Test və bilet imtahanlarında sualların sayı dəyişə bilər, lakin yekun
  // qiymətləndirmə həmişə 50 bal üzərindən aparılır. Buna görə `total_questions`
  // və ya DB-dəki köhnə `total_score` faiz hesablamasında istifadə edilmir.
  const currentScore = typeof result.current_score === "number" ? result.current_score : null;
  const maxScore = currentScore !== null ? EXAM_MAX_SCORE : null;
  const percentage = percentageFromScore(currentScore, maxScore);

  return {
    id: `detailed-${result.id}`,
    kind: result.examType,
    title,
    initials: deriveInitials(title),
    currentScore,
    maxScore,
    percentage,
    startedAt: result.exam_started_at ?? null,
    completedAt: result.exam_completed_at ?? null,
    hasQuestionDetail: true,
    answers: result.answers,
    courseRef: null,
    detailStats: {
      totalQuestions: typeof result.total_questions === "number" ? result.total_questions : 0,
      correctCount: typeof result.correct_count === "number" ? result.correct_count : 0,
      wrongCount: typeof result.wrong_count === "number" ? result.wrong_count : 0,
      unansweredCount: typeof result.unanswered_count === "number" ? result.unanswered_count : 0,
    },
    semesterBreakdown: null,
  };
}

export function buildExamResultViewModels(
  semesterScores: SemesterExamScore[],
  detailedResults: DetailedExamResult[],
): ExamResultViewModel[] {
  const merged = [
    ...semesterScores.map(semesterScoreToViewModel),
    ...detailedResults.map(detailedResultToViewModel),
  ];

  return merged.sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return 1;
    if (!b.completedAt) return -1;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
}
