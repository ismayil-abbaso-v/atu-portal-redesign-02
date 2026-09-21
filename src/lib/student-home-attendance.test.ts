import { describe, expect, test } from "bun:test";

import {
  resolveSemesterNumber,
  summarizeStudentHomeAttendance,
} from "./student-home-attendance";

describe("student home attendance summary", () => {
  test("confirmed dərslərdə bütün iştirakları 100% hesablayır", () => {
    expect(
      summarizeStudentHomeAttendance(
        ["course-1"],
        [
          { course_id: "course-1", lesson_session_id: "session-1", attendance_status: "iştirak edib" },
          { course_id: "course-1", lesson_session_id: "session-2", attendance_status: "iştirak edib" },
        ],
        ["session-1", "session-2"],
      ),
    ).toEqual({ courseCount: 1, classes: 2, present: 2, absent: 0, percent: 100 });
  });

  test("qayıbları faizdən düzgün çıxır", () => {
    expect(
      summarizeStudentHomeAttendance(
        ["course-1"],
        [
          { course_id: "course-1", lesson_session_id: "session-1", attendance_status: "iştirak edib" },
          { course_id: "course-1", lesson_session_id: "session-2", attendance_status: "qayıb" },
          { course_id: "course-1", lesson_session_id: "session-3", attendance_status: "iştirak edib" },
        ],
        ["session-1", "session-2", "session-3"],
      ),
    ).toEqual({ courseCount: 1, classes: 3, present: 2, absent: 1, percent: 67 });
  });

  test("confirmed olmayan session-u və cari semestrdən kənar fənni saymır", () => {
    expect(
      summarizeStudentHomeAttendance(
        ["course-1"],
        [
          { course_id: "course-1", lesson_session_id: "confirmed", attendance_status: "iştirak edib" },
          { course_id: "course-1", lesson_session_id: "draft", attendance_status: "qayıb" },
          { course_id: "course-old", lesson_session_id: "old", attendance_status: "qayıb" },
        ],
        ["confirmed", "old"],
      ),
    ).toEqual({ courseCount: 1, classes: 1, present: 1, absent: 0, percent: 100 });
  });

  test("duplicate course id-ləri iki dəfə saymır", () => {
    expect(summarizeStudentHomeAttendance(["course-1", "course-1", "course-2"], [], [])).toEqual({
      courseCount: 2,
      classes: 0,
      present: 0,
      absent: 0,
      percent: null,
    });
  });

  test("heç dərs olmadıqda faizi null saxlayır", () => {
    expect(summarizeStudentHomeAttendance([], [], [])).toEqual({
      courseCount: 0,
      classes: 0,
      present: 0,
      absent: 0,
      percent: null,
    });
  });
});

describe("resolveSemesterNumber", () => {
  test("AZ/EN və rəqəm semester dəyərlərini tanıyır", () => {
    expect(resolveSemesterNumber("Payız")).toBe(1);
    expect(resolveSemesterNumber("Fall")).toBe(1);
    expect(resolveSemesterNumber("1")).toBe(1);
    expect(resolveSemesterNumber("Yaz")).toBe(2);
    expect(resolveSemesterNumber("Spring")).toBe(2);
    expect(resolveSemesterNumber("2")).toBe(2);
    expect(resolveSemesterNumber(null)).toBeNull();
  });
});
