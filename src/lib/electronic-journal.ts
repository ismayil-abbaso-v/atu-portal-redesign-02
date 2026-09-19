export type CourseGradingType = "meshgele" | "laboratoriya";
export type AcademicWeekType = "ust" | "alt";

export type SemesterScoreInput = {
  gradingType: CourseGradingType;
  hasCourseWork: boolean;
  totalHours: number;
  absences: number;
  colloquium1?: number | null;
  colloquium2?: number | null;
  colloquium3?: number | null;
  independentWork1?: number | null;
  independentWork2?: number | null;
  practiceAverage?: number | null;
  labsSubmitted?: number | null;
  totalLabs?: number | null;
  courseWork?: number | null;
};

const numeric = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** DB-dəki private.semester_score_formula ilə eyni deterministik 50-ballıq düstur. */
export function calculateSemesterScoreValue(input: SemesterScoreInput): number {
  const totalHours = Math.max(0, numeric(input.totalHours));
  const absences = Math.max(0, numeric(input.absences));
  const attendance =
    totalHours > 0 ? Math.max(0, 10 - ((absences * 2) / totalHours) * 10) : 0;

  const colloquiumAverage =
    (numeric(input.colloquium1) + numeric(input.colloquium2) + numeric(input.colloquium3)) / 3;
  const colloquium = colloquiumAverage * (input.hasCourseWork ? 1.2 : 1.8);
  const independent = Math.min(
    10,
    Math.max(0, numeric(input.independentWork1) + numeric(input.independentWork2)),
  );
  const courseWork = input.hasCourseWork
    ? Math.min(10, Math.max(0, numeric(input.courseWork)))
    : 0;

  let daily = 0;
  if (input.gradingType === "meshgele") {
    daily = numeric(input.practiceAverage) * (input.hasCourseWork ? 0.8 : 1.2);
  } else {
    const totalLabs = Math.max(0, numeric(input.totalLabs));
    if (totalLabs > 0) {
      daily =
        (Math.max(0, numeric(input.labsSubmitted)) / totalLabs) *
        (input.hasCourseWork ? 8 : 12);
    }
  }

  return round2(Math.min(50, Math.max(0, colloquium + independent + courseWork + daily + attendance)));
}

/** Prompt formulundakı qayıb limiti: floor(l / 8). */
export function getAbsenceLimit(totalHours: number): number {
  return Math.floor(Math.max(0, numeric(totalHours)) / 8);
}

function dateOnlyToUtcMs(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) throw new Error(`Yanlış tarix: ${value}`);
  return parsed;
}

/** SQL private.week_parity_from_anchor ilə eyni paritet hesablaması. */
export function getWeekParityFromAnchor(
  date: string,
  anchorMonday: string,
  firstWeek: AcademicWeekType,
): AcademicWeekType | null {
  const dateMs = dateOnlyToUtcMs(date);
  const anchorMs = dateOnlyToUtcMs(anchorMonday);
  if (dateMs < anchorMs) return null;
  const dayOffset = Math.floor((dateMs - anchorMs) / 86_400_000);
  const weekOffset = Math.floor(dayOffset / 7);
  if (weekOffset % 2 === 0) return firstWeek;
  return firstWeek === "ust" ? "alt" : "ust";
}

/** SQL private.grade_time_window_contains ilə eyni interval: starts_at <= now < ends_at. */
export function isInsideGradeWindow(
  startsAt: string | Date,
  endsAt: string | Date,
  now: string | Date = new Date(),
): boolean {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const nowMs = new Date(now).getTime();
  if (![startMs, endMs, nowMs].every(Number.isFinite)) return false;
  return nowMs >= startMs && nowMs < endMs;
}

function lessonPermissionKey(lessonType: string | null | undefined): string | null {
  const value = (lessonType ?? "").trim().toLocaleLowerCase("az");
  if (value === "muhazire" || value === "mühazirə") return "muhazire";
  if (value === "seminar") return "seminar";
  if (value === "laboratoriya") return "laboratoriya";
  if (value === "tecrube" || value === "təcrübə" || value === "meshgele" || value === "məşğələ") return "tecrube";
  if (value === "serbest_is" || value === "sərbəst iş") return "serbest_is";
  if (value === "kollokvium") return "kollokvium";
  return null;
}

export function teacherHasLessonPermission(
  permissions: Record<string, boolean> | null | undefined,
  lessonType: string | null | undefined,
): boolean {
  const key = lessonPermissionKey(lessonType);
  return Boolean(key && permissions?.[key]);
}

export type CanGradeNowClientInput = {
  startsAt: string | Date;
  endsAt: string | Date;
  now?: string | Date;
  assignedTeacher: boolean;
  permissions: Record<string, boolean> | null | undefined;
  lessonType: string | null | undefined;
};

/**
 * UI üçün sürətli feedback. Təhlükəsizlik qərarı deyil: mutation yenə DB RLS/trigger və
 * server-side can_grade_now RPC tərəfindən məcburi yoxlanılır.
 */
export function canGradeNowClient(input: CanGradeNowClientInput): boolean {
  return (
    input.assignedTeacher &&
    teacherHasLessonPermission(input.permissions, input.lessonType) &&
    isInsideGradeWindow(input.startsAt, input.endsAt, input.now)
  );
}
