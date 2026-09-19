import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { journalMessages, journalTranslate } from "./electronic-journal-i18n";

const locales = ["az", "tr", "en", "ru"] as const;

describe("electronic journal i18n", () => {
  test("all locales contain exactly the same key set", () => {
    const base = Object.keys(journalMessages.az).sort();
    for (const locale of locales) {
      expect(Object.keys(journalMessages[locale]).sort()).toEqual(base);
      for (const key of base) expect(journalMessages[locale][key as keyof typeof journalMessages.az].trim().length).toBeGreaterThan(0);
    }
  });

  test("interpolates dynamic values in every locale", () => {
    for (const locale of locales) {
      const text = journalTranslate(locale, "student.courseCount", { count: 3 });
      expect(text).toContain("3");
      expect(text).not.toContain("{count}");
    }
  });

  test("journal UI does not regress to known hardcoded Azerbaijani labels", () => {
    const files = [
      "src/components/electronic-journal/StudentJournalView.tsx",
      "src/components/electronic-journal/TeacherJournalView.tsx",
      "src/routes/_authenticated/elektron-jurnal.tsx",
    ];
    const source = files.map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");
    const banned = [
      ">Cari fənn<", ">Akademik nəticə<", ">Cari qiymətləndirmə<", ">Dərslər<",
      ">Gündəlik dərslər<", ">Sərbəst işlər<", ">Kurs işi<", ">Kollokviumlar<",
      ">Davamiyyət<", ">Qiymət<", ">Fayl<", ">Tarix<", ">Mövzu<", ">Bax<",
      "Tapşırıq uğurla təhvil verildi.", "Dərs təsdiqləndi və jurnal kilidləndi.",
      "Qiymətləndirmə pəncərəsi bağlıdır.", "Elektron jurnal yüklənir",
    ];
    for (const item of banned) expect(source).not.toContain(item);
  });
});
