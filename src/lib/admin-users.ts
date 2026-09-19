import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROL_ETIKETLERI: Record<AppRole, string> = {
  admin: "Admin",
  dekan: "Dekan",
  tyutor: "Tyutor",
  muellim: "Müəllim",
  telebe: "Tələbə",
};

export const ROL_SIRASI: AppRole[] = ["admin", "dekan", "tyutor", "muellim", "telebe"];

export type IstifadeciSetri = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  ata_adi: string | null;
  istifadeci_adi: string | null;
  avatar_url: string | null;
  telefon: string | null;
  e_poct: string | null;
  cins: string | null;
  fin_kodu: string | null;
  dogum_tarixi: string | null;
  qebul_ili: number | null;
  bitirme_ili: number | null;
  ixtisas: string | null;
  fakulte: string | null;
  qrup: string | null;
  sheher: string | null;
  dim_bali: number | null;
  tehsil_novu: string | null;
  sosial_veziyyet: string | null;
  tehsil_haqqi: number | null;
  tehsil_haqqi_statusu: string | null;
  esd_istifadeci: boolean | null;
  status: string;
  rollar: AppRole[];
  umumi_say: number;
};

export const SEHIFE_OLCULERI = [20, 50, 100] as const;

/** Profil şəklini 'avatars' bucket-inə yükləyir və ictimai URL-i qaytarır. */
export async function avatarYukle(userId: string, fayl: File): Promise<string> {
  const uzantı = fayl.name.includes(".") ? fayl.name.split(".").pop() : "png";
  const yol = `${userId}/${crypto.randomUUID()}.${uzantı}`;
  const { error } = await supabase.storage.from("avatars").upload(yol, fayl, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(yol);
  return data.publicUrl;
}

export function tamAdFormatla(ad: string | null, soyad: string | null): string {
  return [soyad, ad].filter(Boolean).join(" ") || "—";
}
