import { describe, expect, test } from "bun:test";

import { examMaterialMessages, examMaterialTranslate } from "./exam-material-i18n";

const locales = ["az", "en", "tr", "ru"] as const;
const requiredOfficialKeys = [
  "officialSyncPending",
  "officialSyncProcessing",
  "officialSyncSuccess",
  "officialSyncPartial",
  "officialSyncFailed",
  "officialExamCreated",
  "semesterScoresSynced",
  "unmatchedStudents",
  "retryOfficialSync",
  "officialGroupNotFound",
  "officialExamAlreadyStarted",
  "officialInvalidDocx",
  "officialPeriodMismatch",
] as const;

describe("exam material / official sync i18n", () => {
  test("all locales have exact key parity", () => {
    const base = Object.keys(examMaterialMessages.az).sort();
    for (const locale of locales) {
      expect(Object.keys(examMaterialMessages[locale]).sort()).toEqual(base);
      for (const key of base) {
        expect(examMaterialMessages[locale][key as keyof typeof examMaterialMessages.az].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("all Prompt 2 official status keys exist in every locale", () => {
    for (const locale of locales) {
      for (const key of requiredOfficialKeys) {
        expect(examMaterialMessages[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("unmatched student count interpolates in every locale", () => {
    for (const locale of locales) {
      const value = examMaterialTranslate(locale, "unmatchedStudents", { count: 2 });
      expect(value).toContain("2");
      expect(value).not.toContain("{count}");
    }
  });
});
