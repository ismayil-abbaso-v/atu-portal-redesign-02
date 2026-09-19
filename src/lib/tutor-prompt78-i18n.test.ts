import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { calendarManagementMessages } from "./calendar-management-i18n";
import { tutorExamMessages } from "./tutor-exam-i18n";
import { examMaterialMessages } from "./exam-material-i18n";

const locales = ["az", "en", "tr", "ru"] as const;

function expectSameKeys(messages: Record<(typeof locales)[number], Record<string, string>>) {
  const baseline = Object.keys(messages.az).sort();
  for (const locale of locales) expect(Object.keys(messages[locale]).sort()).toEqual(baseline);
}

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Prompt 7-8 tutor i18n", () => {
  test("exam scheduler and calendar management keep identical locale key sets", () => {
    expectSameKeys(tutorExamMessages);
    expectSameKeys(calendarManagementMessages);
  });

  test("calendar management UI does not regress to hardcoded Azerbaijani labels", () => {
    const calendarUi = [
      "src/routes/_authenticated/teqvim.tsx",
      "src/components/calendar/ScheduleManagementView.tsx",
      "src/components/calendar/ScheduleTemplateEditor.tsx",
      "src/components/calendar/EventFormModal.tsx",
    ].map(source).join("\n");

    for (const text of [
      "Cədvəl tənzimləməsi",
      "Yeni tədbir əlavə et",
      "Yeni dərs slotu",
      "Başlanğıc saatı",
      "Əminsiniz?",
      "Bu gün üçün dərs slotu yoxdur",
    ]) {
      expect(calendarUi).not.toContain(`>${text}<`);
      expect(calendarUi).not.toContain(`\"${text}\"`);
    }
  });

  test("exam scheduler exposes localized period/group controls and runtime metadata", () => {
    const exam = source("src/components/exams/TutorExamSchedulerView.tsx");
    expect(exam).toContain('t("selector.period")');
    expect(exam).toContain('aria-label={t("aria.period")}');
    expect(exam).toContain('aria-label={t("aria.group")}');
    expect(exam).toContain('document.title = `${t("meta.title")} — ATU Portal`');
  });

  test("shared tutor routes do not keep Azerbaijani-only metadata", () => {
    const chat = source("src/routes/_authenticated/sohbet.tsx");
    const notifications = source("src/routes/_authenticated/bildirisler.tsx");
    expect(chat).not.toContain("Söhbət — ATU Şəxsi Kabinet");
    expect(chat).toContain('t("chat.metaTitle")');
    expect(notifications).not.toContain("Elanlar və bildirişlər — ATU Portal");
    expect(notifications).toContain('t("hub.title")');
  });

  test("legacy tutor group route is permission checked and safely redirected", () => {
    const legacy = source("src/routes/_authenticated/tyutor_.$groupId.tsx");
    expect(legacy).toContain("canAccessGroup(params.groupId)");
    expect(legacy).toContain('to: "/qruplar/$groupId"');
    expect(legacy).toContain("replace: true");
  });

  test("calendar schedule mutation controls retain 44px touch targets and aria labels", () => {
    const editor = source("src/components/calendar/ScheduleTemplateEditor.tsx");
    expect(editor).toContain('className="size-11 rounded-xl" aria-label={t("editor.editAria"');
    expect(editor).toContain('aria-label={t("editor.deleteAria"');
    expect(editor).toContain('className="min-h-11 gap-2 rounded-xl"');
  });
});

describe("Teacher exam monitoring read-only contract", () => {
  test("teacher role always opens the exam panel in read-only mode", () => {
    const route = source("src/routes/_authenticated/imtahanlar.tsx");
    expect(route).toContain('if (primaryRole === "muellim") return <TeacherExamGradingView userId={userId} readOnly />;');
  });

  test("teacher monitoring UI has no enabled grading mutation path", () => {
    const view = source("src/components/exams/TeacherExamGradingView.tsx");
    expect(view).toContain('enabled: Boolean(!readOnly && selectedCourseId && students.length)');
    expect(view).toContain('if (readOnly) throw new Error(t("readOnlyError"));');
    expect(view).toContain('{!readOnly && students.length ? (');
    expect(view).toContain('readOnly ? t("monitoringTitle") : t("gradingTitle")');
  });

  test("exam score RLS keeps teacher access SELECT-only", () => {
    const migration = source("supabase/migrations/20260831002000_teacher_exam_monitor_only.sql");
    expect(migration).toContain("Müəllim imtahan nəticələrini dəyişə bilməz");
    expect(migration).toContain("if not v_is_teacher and private.has_ejournal_data");
    expect(migration).toContain("pg_trigger_depth() = 0");
    expect(migration).not.toContain("private.teacher_can_grade_exam_score(course_id, user_id");
    expect(migration).toContain("create policy exam_scores_insert_staff");
    expect(migration).toContain("create policy exam_scores_update_staff");
  });

  test("authenticated role cannot bypass exam score RLS with truncate", () => {
    const migration = source("supabase/migrations/20260831002500_revoke_exam_scores_truncate.sql");
    expect(migration).toContain("revoke truncate on table public.exam_scores from authenticated");
  });
});

describe("Exam material workflow contract", () => {
  test("exam material translations keep AZ EN TR RU key parity", () => {
    expectSameKeys(examMaterialMessages);
  });

  test("teacher material manager is DOCX-only, owner-aware and touch friendly", () => {
    const panel = source("src/components/exams/TeacherExamMaterialsPanel.tsx");
    expect(panel).toContain("validateExamMaterialFile");
    expect(panel).toContain('accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"');
    expect(panel).toContain("selectedMaterial.uploaded_by === userId");
    expect(panel).toContain('className="min-h-11');
    expect(panel).toContain('t("common.retry")');
  });

  test("shared service merges schedule and material into one card and supports material-only cards", () => {
    const service = source("src/lib/exam-materials.ts");
    expect(service).toContain('const key = `${exam.group_id}:${exam.course_id}`');
    expect(service).toContain("scheduledKeys.add(key)");
    expect(service).toContain("if (scheduledKeys.has(key) || !pairMaterials.length) continue");
    expect(service).toContain("materialOnly: true");
    expect(service).toContain("materials: [...pairMaterials]");
  });

  test("storage is private, collision-safe, DOCX-only and signed downloads are short lived", () => {
    const service = source("src/lib/exam-materials.ts");
    const migration = source("supabase/migrations/20260831031000_exam_materials_workflow.sql");
    const integrity = source("supabase/migrations/20260831032000_exam_material_storage_integrity.sql");
    expect(service).toContain('EXAM_MATERIAL_BUCKET = "exam-materials"');
    expect(service).toContain("EXAM_MATERIAL_MAX_BYTES = 20 * 1024 * 1024");
    expect(service).toContain("EXAM_MATERIAL_SIGNED_URL_SECONDS = 120");
    expect(service).toContain("crypto.randomUUID()");
    expect(migration).toContain("'exam-materials',\n  'exam-materials',\n  false,");
    expect(migration).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(integrity).toContain("exam_material_storage_object_matches");
    expect(integrity).toContain("EXAM_MATERIAL_STORAGE_MISMATCH");
  });

  test("tutor material status is monitoring-only", () => {
    const tutor = source("src/components/exams/TutorExamMaterialStatus.tsx");
    expect(tutor).toContain("fetchExamMaterials");
    expect(tutor).not.toContain("uploadExamMaterial");
    expect(tutor).not.toContain('.from("exam_materials").update');
    expect(tutor).not.toContain('.from("exam_materials").insert');
  });

  test("student card downloads signed materials and exposes unscheduled placeholder", () => {
    const upcoming = source("src/components/exams/UpcomingExamsList.tsx");
    expect(upcoming).toContain("createExamMaterialSignedUrl");
    expect(upcoming).toContain('mt("status.unscheduled")');
    expect(upcoming).toContain('mt("file.downloadExam")');
    expect(upcoming).toContain("min-h-11");
  });

  test("exam material migrations remain isolated from official result writes", () => {
    const migration = source("supabase/migrations/20260831031000_exam_materials_workflow.sql");
    const integrity = source("supabase/migrations/20260831032000_exam_material_storage_integrity.sql");
    const normalized = `${migration}\n${integrity}`.toLowerCase();
    expect(normalized).not.toContain("update public.exam_scores");
    expect(normalized).not.toContain("insert into public.exam_scores");
    expect(normalized).not.toContain("update public.exam_detailed_results");
    expect(normalized).not.toContain("insert into public.exam_detailed_results");
  });
});
