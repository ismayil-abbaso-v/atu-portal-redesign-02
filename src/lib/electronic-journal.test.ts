import { describe, expect, test } from "bun:test";

import {
  calculateSemesterScoreValue,
  canGradeNowClient,
  getAbsenceLimit,
  getWeekParityFromAnchor,
  isInsideGradeWindow,
  teacherHasLessonPermission,
} from "./electronic-journal";

describe("calculateSemesterScoreValue", () => {
  test("məşğələ, kurs işi yoxdur — 43.55", () => {
    expect(
      calculateSemesterScoreValue({
        gradingType: "meshgele",
        hasCourseWork: false,
        totalHours: 64,
        absences: 4,
        colloquium1: 10,
        colloquium2: 8,
        colloquium3: 9,
        independentWork1: 5,
        independentWork2: 4,
        practiceAverage: 8,
      }),
    ).toBe(43.55);
  });

  test("audit nümunəsi backend ilə eyni nəticə verir — 42.66", () => {
    expect(
      calculateSemesterScoreValue({
        gradingType: "meshgele",
        hasCourseWork: false,
        totalHours: 64,
        absences: 3,
        colloquium1: 8,
        colloquium2: 9,
        colloquium3: 7,
        independentWork1: 4,
        independentWork2: 5,
        practiceAverage: 8.5,
      }),
    ).toBe(42.66);
  });

  test("laboratoriya + kurs işi — 43.75", () => {
    expect(
      calculateSemesterScoreValue({
        gradingType: "laboratoriya",
        hasCourseWork: true,
        totalHours: 80,
        absences: 5,
        colloquium1: 7,
        colloquium2: 8,
        colloquium3: 9,
        independentWork1: 5,
        independentWork2: 5,
        labsSubmitted: 8,
        totalLabs: 10,
        courseWork: 9,
      }),
    ).toBe(43.75);
  });

  test("məşğələ + kurs işi 12/8 budaqlarını dəyişir", () => {
    expect(
      calculateSemesterScoreValue({
        gradingType: "meshgele",
        hasCourseWork: true,
        totalHours: 64,
        absences: 3,
        colloquium1: 8,
        colloquium2: 9,
        colloquium3: 7,
        independentWork1: 4,
        independentWork2: 5,
        practiceAverage: 8.5,
        courseWork: 9,
      }),
    ).toBe(43.46);
  });

  test("maksimum nəticə 50-dən yuxarı çıxmır", () => {
    expect(
      calculateSemesterScoreValue({
        gradingType: "meshgele",
        hasCourseWork: false,
        totalHours: 80,
        absences: 0,
        colloquium1: 10,
        colloquium2: 10,
        colloquium3: 10,
        independentWork1: 5,
        independentWork2: 5,
        practiceAverage: 10,
      }),
    ).toBe(50);
  });
});

describe("qayıb limiti", () => {
  test("floor(l/8) qaydasını tətbiq edir", () => {
    expect(getAbsenceLimit(64)).toBe(8);
    expect(getAbsenceLimit(63)).toBe(7);
    expect(getAbsenceLimit(0)).toBe(0);
  });
});

describe("week parity", () => {
  const anchor = "2026-09-14";

  test("ilk həftə və həmin həftənin ortası üst qalır", () => {
    expect(getWeekParityFromAnchor("2026-09-14", anchor, "ust")).toBe("ust");
    expect(getWeekParityFromAnchor("2026-09-17", anchor, "ust")).toBe("ust");
  });

  test("növbəti həftə alt olur", () => {
    expect(getWeekParityFromAnchor("2026-09-21", anchor, "ust")).toBe("alt");
  });

  test("iki həftə sonra yenidən üst olur", () => {
    expect(getWeekParityFromAnchor("2026-09-28", anchor, "ust")).toBe("ust");
  });
});

describe("grading window", () => {
  const startsAt = "2026-09-14T10:00:00+04:00";
  const endsAt = "2026-09-14T11:30:00+04:00";

  test("yalnız starts_at <= now < ends_at intervalını qəbul edir", () => {
    expect(isInsideGradeWindow(startsAt, endsAt, "2026-09-14T10:00:00+04:00")).toBe(true);
    expect(isInsideGradeWindow(startsAt, endsAt, "2026-09-14T11:29:59+04:00")).toBe(true);
  });

  test("dərsdən əvvəl və ends_at anından etibarən rədd edir", () => {
    expect(isInsideGradeWindow(startsAt, endsAt, "2026-09-14T09:59:59+04:00")).toBe(false);
    expect(isInsideGradeWindow(startsAt, endsAt, "2026-09-14T11:30:00+04:00")).toBe(false);
  });

  test("müəllim təyinatı və dərs növü icazəsi birlikdə tələb olunur", () => {
    const permissions = { seminar: true, laboratoriya: false };
    expect(teacherHasLessonPermission(permissions, "seminar")).toBe(true);
    expect(teacherHasLessonPermission(permissions, "laboratoriya")).toBe(false);
    expect(
      canGradeNowClient({
        startsAt,
        endsAt,
        now: "2026-09-14T10:30:00+04:00",
        assignedTeacher: true,
        permissions,
        lessonType: "seminar",
      }),
    ).toBe(true);
    expect(
      canGradeNowClient({
        startsAt,
        endsAt,
        now: "2026-09-14T10:30:00+04:00",
        assignedTeacher: false,
        permissions,
        lessonType: "seminar",
      }),
    ).toBe(false);
  });
});
