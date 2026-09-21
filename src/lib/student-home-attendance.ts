export type StudentHomeAttendanceRecord = {
  course_id: string | null;
  lesson_session_id: string | null;
  attendance_status: string | null;
};

export type StudentHomeAttendanceSummary = {
  courseCount: number;
  classes: number;
  present: number;
  absent: number;
  percent: number | null;
};

function normalizeSemesterText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("az-AZ")
    .replaceAll("ə", "e")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g");
}

export function resolveSemesterNumber(value: string | null | undefined): 1 | 2 | null {
  const normalized = normalizeSemesterText(value);
  if (normalized === "1" || normalized.includes("payiz") || normalized.includes("fall")) return 1;
  if (normalized === "2" || normalized.includes("yaz") || normalized.includes("spring")) return 2;
  return null;
}

export function summarizeStudentHomeAttendance(
  courseIds: readonly string[],
  records: readonly StudentHomeAttendanceRecord[],
  confirmedSessionIds: readonly string[],
): StudentHomeAttendanceSummary {
  const uniqueCourseIds = new Set(courseIds.filter(Boolean));
  const confirmedSessions = new Set(confirmedSessionIds.filter(Boolean));
  const confirmedRecords = records.filter(
    (record) =>
      Boolean(record.course_id) &&
      Boolean(record.lesson_session_id) &&
      uniqueCourseIds.has(record.course_id!) &&
      confirmedSessions.has(record.lesson_session_id!),
  );
  const present = confirmedRecords.filter(
    (record) => record.attendance_status === "iştirak edib",
  ).length;
  const absent = confirmedRecords.filter((record) => record.attendance_status === "qayıb").length;
  const classes = confirmedRecords.length;

  return {
    courseCount: uniqueCourseIds.size,
    classes,
    present,
    absent,
    percent: classes > 0 ? Math.round((present / classes) * 100) : null,
  };
}
