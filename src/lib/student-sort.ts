export type StudentNameLike = {
  ad?: string | null;
  soyad?: string | null;
  istifadeci_adi?: string | null;
};

const azStudentCollator = new Intl.Collator("az", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
});

function compareNullableName(a: string | null | undefined, b: string | null | undefined): number {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";

  if (!left && right) return 1;
  if (left && !right) return -1;
  return azStudentCollator.compare(left, right);
}

/**
 * Qrup tələbələri üçün vahid sıralama qaydası:
 * 1) soyad A-Z, 2) eyni soyadda ad A-Z.
 * Bu funksiya yalnız sıralamanı dəyişir; ekranda ad yenə "Ad Soyad" kimi göstərilir.
 */
export function compareStudentProfilesBySurnameThenName(
  a: StudentNameLike | null | undefined,
  b: StudentNameLike | null | undefined,
): number {
  const surname = compareNullableName(a?.soyad, b?.soyad);
  if (surname !== 0) return surname;

  const name = compareNullableName(a?.ad, b?.ad);
  if (name !== 0) return name;

  return compareNullableName(a?.istifadeci_adi, b?.istifadeci_adi);
}

export function sortStudentProfilesBySurnameThenName<T extends StudentNameLike>(rows: readonly T[]): T[] {
  return [...rows].sort(compareStudentProfilesBySurnameThenName);
}
