import {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export type TarixAraligiPreset = "bugun" | "bu-hefte" | "bu-ay" | "son-30-gun" | "serbest";
export type Qranulyarlik = "day" | "week" | "month";

export type TarixAraligi = {
  /** Daxildir (>=) */
  start: Date;
  /** Xaricdir (<), yəni aralığın sonrakı günü/anı */
  end: Date;
};

/** Hər preset üçün defolt qranulyarlıq (istifadəçi sonra Select ilə dəyişə bilər). */
export const presetDefaultQranulyarliq: Record<TarixAraligiPreset, Qranulyarlik> = {
  bugun: "day",
  "bu-hefte": "day",
  "bu-ay": "week",
  "son-30-gun": "week",
  serbest: "week",
};

/** Verilmiş preset (və "sərbəst" üçün seçilmiş aralıq) əsasında [start, end) tarix aralığını hesablayır. */
export function presetToRange(
  preset: TarixAraligiPreset,
  serbestAraligi?: TarixAraligi,
): TarixAraligi {
  const indi = new Date();
  switch (preset) {
    case "bugun":
      return { start: startOfDay(indi), end: startOfDay(addDays(indi, 1)) };
    case "bu-hefte": {
      const start = startOfWeek(indi, { weekStartsOn: 1 });
      return { start, end: addWeeks(start, 1) };
    }
    case "bu-ay": {
      const start = startOfMonth(indi);
      return { start, end: startOfMonth(addMonths(indi, 1)) };
    }
    case "son-30-gun":
      return { start: startOfDay(subDays(indi, 29)), end: startOfDay(addDays(indi, 1)) };
    case "serbest":
      if (serbestAraligi) {
        return {
          start: startOfDay(serbestAraligi.start),
          end: startOfDay(addDays(serbestAraligi.end, 1)),
        };
      }
      // Sərbəst seçilib amma hələ tarix seçilməyibsə, bu ayı defolt göstər
      return { start: startOfMonth(indi), end: startOfMonth(addMonths(indi, 1)) };
  }
}

export const presetEtiketleri: { deyer: TarixAraligiPreset; etiket: string }[] = [
  { deyer: "bugun", etiket: "Bugün" },
  { deyer: "bu-hefte", etiket: "Bu həftə" },
  { deyer: "bu-ay", etiket: "Bu ay" },
  { deyer: "son-30-gun", etiket: "Son 30 gün" },
  { deyer: "serbest", etiket: "Sərbəst" },
];

export const qranulyarlıqEtiketleri: { deyer: Qranulyarlik; etiket: string }[] = [
  { deyer: "day", etiket: "Günlər üzrə" },
  { deyer: "week", etiket: "Həftələr üzrə" },
  { deyer: "month", etiket: "Aylar üzrə" },
];

export const rolEtiketleri: Record<string, string> = {
  admin: "Administrator",
  dekan: "Dekan",
  tyutor: "Tyutor",
  muellim: "Müəllim",
  telebe: "Tələbə",
};

/** Donut/legend rəngləri — mövcud --chart-1..5 tema tokenlərindən. */
export const rolRengleri: Record<string, string> = {
  admin: "var(--chart-3)",
  dekan: "var(--chart-1)",
  muellim: "var(--chart-4)",
  tyutor: "var(--chart-2)",
  telebe: "var(--chart-5)",
};
