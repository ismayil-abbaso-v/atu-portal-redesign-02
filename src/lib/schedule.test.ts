import { describe, expect, test } from "bun:test";

import { scheduleSlotsConflict } from "./schedule";

const base = {
  gun_nomresi: 1,
  baslangic_saat: "10:00",
  bitme_saat: "11:30",
} as const;

describe("scheduleSlotsConflict", () => {
  test("Hər həftə ilə ÜST üst-üstə düşəndə toqquşur", () => {
    expect(
      scheduleSlotsConflict(
        { ...base, hefte_novu: "her_hefte" },
        { ...base, baslangic_saat: "10:30", bitme_saat: "12:00", hefte_novu: "ust" },
      ),
    ).toBe(true);
  });

  test("ÜST və ALT eyni saatda növbələşə bilər", () => {
    expect(
      scheduleSlotsConflict(
        { ...base, hefte_novu: "ust" },
        { ...base, hefte_novu: "alt" },
      ),
    ).toBe(false);
  });

  test("iki ÜST intervalı üst-üstə düşəndə toqquşur", () => {
    expect(
      scheduleSlotsConflict(
        { ...base, hefte_novu: "ust" },
        { ...base, baslangic_saat: "11:00", bitme_saat: "12:00", hefte_novu: "ust" },
      ),
    ).toBe(true);
  });

  test("bir dərsin bitdiyi dəqiqədə digəri başlaya bilər", () => {
    expect(
      scheduleSlotsConflict(
        { ...base, baslangic_saat: "10:00", bitme_saat: "11:00", hefte_novu: "her_hefte" },
        { ...base, baslangic_saat: "11:00", bitme_saat: "12:00", hefte_novu: "her_hefte" },
      ),
    ).toBe(false);
  });
});
