import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { notificationHubMessages, notificationHubTranslate } from "./notification-hub-i18n";

const locales = ["az", "tr", "en", "ru"] as const;

describe("notification hub i18n", () => {
  test("all locales contain exactly the same key set", () => {
    const base = Object.keys(notificationHubMessages.az).sort();
    for (const locale of locales) {
      expect(Object.keys(notificationHubMessages[locale]).sort()).toEqual(base);
      for (const key of base) expect(notificationHubMessages[locale][key as keyof typeof notificationHubMessages.az].trim().length).toBeGreaterThan(0);
    }
  });

  test("interpolates dynamic values in every locale", () => {
    for (const locale of locales) {
      const text = notificationHubTranslate(locale, "broadcast.success", { count: 7 });
      expect(text).toContain("7");
      expect(text).not.toContain("{count}");
    }
  });

  test("notification UI and journal navigation do not regress to hardcoded Azerbaijani", () => {
    const files = [
      "src/routes/_authenticated/bildirisler.tsx",
      "src/components/announcements/AnnouncementCard.tsx",
      "src/components/notifications/BroadcastNotificationDialog.tsx",
      "src/components/layout/Sidebar.tsx",
    ];
    const source = files.map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");
    const banned = [
      ">Məlumat mərkəzi<", ">Elanlar və bildirişlər<", ">Aktiv elan<", ">Oxunmamış<", ">Önə çıxarılan<",
      "placeholder=\"Elanlarda axtar...\"", ">Bütün kateqoriyalar<", "title=\"Elanlar yüklənmədi\"",
      "title=\"Uyğun elan tapılmadı\"", ">Seçilmiş elan<", ">Ətraflı bax<", ">Bildiriş göndər<",
      ">Bütün istifadəçilər<", 'item.to === "/elektron-jurnal" ? "Elektron jurnal"',
    ];
    for (const item of banned) expect(source).not.toContain(item);
    expect(source).toContain('journalTranslate(locale, "page.title")');
  });
});
