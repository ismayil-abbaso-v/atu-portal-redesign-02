import type { Database } from "@/integrations/supabase/types";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];

/** courses.kurs-da mövcud OLAN dəyərlər (sıra ilə) — qrup dərinlik səhifəsindəki bölmələr. */
export const KURSLAR = [1, 2, 3, 4] as const;

export const KURS_ETIKETLERI: Record<number, string> = {
  1: "I Kurs",
  2: "II Kurs",
  3: "III Kurs",
  4: "IV Kurs",
  5: "V Kurs",
  6: "VI Kurs",
};

export const GROUPS_SEHIFE_OLCUSU = 50;

export const GROUPS_SEHIFE_OLCULERI = [20, 50, 100] as const;
