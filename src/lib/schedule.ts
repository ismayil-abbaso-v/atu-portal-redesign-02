export type ScheduleWeekType = "her_hefte" | "ust" | "alt";

export type ScheduleConflictCandidate = {
  gun_nomresi: number;
  baslangic_saat: string;
  bitme_saat: string;
  hefte_novu: ScheduleWeekType;
};

export const HEFTE_NOVU_ETIKETLERI: Record<ScheduleWeekType, string> = {
  her_hefte: "Hər həftə",
  ust: "Yalnız ÜST",
  alt: "Yalnız ALT",
};

export const HEFTE_GUNLERI = [
  { value: 1, short: "B.e.", label: "Bazar ertəsi" },
  { value: 2, short: "Ç.a.", label: "Çərşənbə axşamı" },
  { value: 3, short: "Ç.", label: "Çərşənbə" },
  { value: 4, short: "C.a.", label: "Cümə axşamı" },
  { value: 5, short: "C.", label: "Cümə" },
  { value: 6, short: "Ş.", label: "Şənbə" },
  { value: 7, short: "B.", label: "Bazar" },
] as const;

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function scheduleSlotsConflict(
  left: ScheduleConflictCandidate,
  right: ScheduleConflictCandidate,
): boolean {
  if (left.gun_nomresi !== right.gun_nomresi) return false;

  const leftStart = timeToMinutes(left.baslangic_saat);
  const leftEnd = timeToMinutes(left.bitme_saat);
  const rightStart = timeToMinutes(right.baslangic_saat);
  const rightEnd = timeToMinutes(right.bitme_saat);
  const overlaps = leftStart < rightEnd && rightStart < leftEnd;
  if (!overlaps) return false;

  // Yalnız bir-birini tamamlayan ÜST + ALT cütü eyni vaxt intervalını paylaşa bilər.
  return !(
    (left.hefte_novu === "ust" && right.hefte_novu === "alt") ||
    (left.hefte_novu === "alt" && right.hefte_novu === "ust")
  );
}

export function formatScheduleTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "—";
}
