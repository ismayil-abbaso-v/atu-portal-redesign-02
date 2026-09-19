import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type DarsNovu =
  "muhazire" | "seminar" | "laboratoriya" | "serbest_is" | "kollokvium" | "tecrube";

/** course_topics.dars_novu-da mövcud OLAN növlər (sıra ilə). */
export const DARS_NOVLERI: DarsNovu[] = [
  "muhazire",
  "seminar",
  "laboratoriya",
  "serbest_is",
  "kollokvium",
  "tecrube",
];

/** courses.aktiv_dars_novleri panelindəki bütün açar-lar (Qrup dərsi daxil). */
export const AKTIV_DARS_NOVU_ACARLARI = [...DARS_NOVLERI, "qrup_dersi"] as const;
export type AktivDarsNovuAcari = (typeof AKTIV_DARS_NOVU_ACARLARI)[number];

export const DARS_NOVU_ETIKETLERI: Record<AktivDarsNovuAcari, string> = {
  muhazire: "Mühazirə",
  seminar: "Seminar",
  laboratoriya: "Laboratoriya",
  serbest_is: "Sərbəst iş",
  kollokvium: "Kollokvium",
  tecrube: "Təcrübə",
  qrup_dersi: "Qrup dərsi",
};

export type CourseRoomMap = Partial<Record<AktivDarsNovuAcari, string>>;

export function courseRoomMap(value: Json | null | undefined): CourseRoomMap {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const result: CourseRoomMap = {};
  for (const lessonType of AKTIV_DARS_NOVU_ACARLARI) {
    const room = value[lessonType];
    if (typeof room === "string" && room.trim()) result[lessonType] = room.trim();
  }
  return result;
}

export function courseRoomSummary(value: Json | null | undefined, legacyRoom?: string | null): string {
  const map = courseRoomMap(value);
  const entries = AKTIV_DARS_NOVU_ACARLARI.flatMap((lessonType) => {
    const room = map[lessonType];
    return room ? [`${DARS_NOVU_ETIKETLERI[lessonType]}: ${room}`] : [];
  });
  if (entries.length > 0) return entries.join(" · ");
  return legacyRoom?.trim() || "—";
}

export const DEFAULT_AKTIV_DARS_NOVLERI: Record<AktivDarsNovuAcari, boolean> = {
  muhazire: true,
  seminar: true,
  laboratoriya: false,
  serbest_is: true,
  kollokvium: true,
  tecrube: false,
  qrup_dersi: false,
};

export const DEFAULT_MUELLIM_ICAZELERI: Record<DarsNovu, boolean> = {
  muhazire: true,
  seminar: true,
  laboratoriya: false,
  serbest_is: true,
  kollokvium: true,
  tecrube: false,
};

/** Köhnə course_topics.fayl_kateqoriyasi sahəsi üçün saxlanılır. */
export const FAYL_KATEQORIYALARI = ["seminar", "teqdimat", "diger"] as const;
export type FaylKateqoriyasi = (typeof FAYL_KATEQORIYALARI)[number];

export const FAYL_KATEQORIYASI_ETIKETLERI: Record<FaylKateqoriyasi, string> = {
  seminar: "Seminar",
  teqdimat: "Təqdimat",
  diger: "Digər",
};

/** Yeni çoxfayllı mövzu sistemi. primary mövzunun əsas faylıdır. */
export const TOPIC_FAYL_KATEQORIYALARI = ["primary", "seminar", "teqdimat", "diger"] as const;
export type TopicFaylKateqoriyasi = (typeof TOPIC_FAYL_KATEQORIYALARI)[number];

export const TOPIC_FAYL_KATEQORIYASI_ETIKETLERI: Record<TopicFaylKateqoriyasi, string> = {
  primary: "Əsas fayl",
  seminar: "Seminar",
  teqdimat: "Təqdimat",
  diger: "Digər",
};

export type CourseTopicFile = {
  id: string;
  topic_id: string;
  course_id: string;
  category: TopicFaylKateqoriyasi;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export const COURSE_MATERIALS_BUCKET = "course-materials";
export const MAX_COURSE_FAYL_OLCUSU = 50 * 1024 * 1024; // 50MB

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type CourseTeacher = Database["public"]["Tables"]["course_teachers"]["Row"];
export type CourseTopic = Database["public"]["Tables"]["course_topics"]["Row"];
export type CourseStudentStatus = Database["public"]["Tables"]["course_student_status"]["Row"];

export type MuellimProfil = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
};

/** Fənn faylını (sillabus/mövzu) course-materials bucket-inə yükləyir, storage yolunu qaytarır. */
export async function courseFayliYukle(courseId: string, fayl: File): Promise<string> {
  const uzantı = fayl.name.includes(".") ? fayl.name.split(".").pop() : "";
  const yol = `${courseId}/${crypto.randomUUID()}${uzantı ? `.${uzantı}` : ""}`;
  const { error } = await supabase.storage
    .from(COURSE_MATERIALS_BUCKET)
    .upload(yol, fayl, { upsert: false, cacheControl: "3600" });
  if (error) throw new Error(error.message);
  return yol;
}

/** Storage-dakı fənn faylını imzalı keçid ilə açır/endirir. */
export async function courseFayliEndir(yol: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(COURSE_MATERIALS_BUCKET)
    .createSignedUrl(yol, 60, { download: true });
  if (error) throw new Error(error.message);
  window.open(data.signedUrl, "_blank");
}

/** DB sətri silindikdən sonra storage-da orphan fayl qalmasın deyə istifadə olunur. */
export async function courseFayliSil(yol: string): Promise<void> {
  if (!yol) return;
  const { error } = await supabase.storage.from(COURSE_MATERIALS_BUCKET).remove([yol]);
  if (error) throw new Error(error.message);
}

export function muellimAdıFormatla(
  profil: Pick<MuellimProfil, "ad" | "soyad"> | null | undefined,
): string {
  if (!profil) return "—";
  return [profil.ad, profil.soyad].filter(Boolean).join(" ") || "—";
}

export function tarixFormatla(iso: string | null | undefined): string {
  if (!iso) return "—";
  const tarix = new Date(iso);
  if (Number.isNaN(tarix.getTime())) return "—";
  const gun = tarix.getDate().toString().padStart(2, "0");
  const ay = (tarix.getMonth() + 1).toString().padStart(2, "0");
  return `${gun}.${ay}.${tarix.getFullYear()}`;
}

export function saatFormatla(deyer: string | null | undefined): string | null {
  if (!deyer) return null;
  return deyer.slice(0, 5);
}
