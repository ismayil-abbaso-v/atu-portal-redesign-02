import {
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const MAX_OFIS_FAYL_OLCUSU = 100 * 1024 * 1024; // 100MB
export const OFIS_BUCKET = "office-files";

export type OfisFayilNovu = "pdf" | "word" | "excel" | "sekil" | "diger";

/** MIME növünə görə fayl kateqoriyasını təyin edir. */
export function faylNovunuTeyinEt(mimeNovu: string | null | undefined): OfisFayilNovu {
  if (!mimeNovu) return "diger";
  if (mimeNovu === "application/pdf") return "pdf";
  if (mimeNovu.startsWith("image/")) return "sekil";
  if (
    mimeNovu.includes("wordprocessingml") ||
    mimeNovu === "application/msword"
  ) {
    return "word";
  }
  if (
    mimeNovu.includes("spreadsheetml") ||
    mimeNovu === "application/vnd.ms-excel" ||
    mimeNovu === "text/csv"
  ) {
    return "excel";
  }
  return "diger";
}

const IKON_XARITESI: Record<OfisFayilNovu, LucideIcon> = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  sekil: FileImage,
  diger: FileIcon,
};

const RENG_XARITESI: Record<OfisFayilNovu, string> = {
  pdf: "bg-red-500/10 text-red-500",
  word: "bg-blue-500/10 text-blue-500",
  excel: "bg-emerald-500/10 text-emerald-500",
  sekil: "bg-violet-500/10 text-violet-500",
  diger: "bg-muted text-muted-foreground",
};

export function faylIkonuAl(nov: OfisFayilNovu): LucideIcon {
  return IKON_XARITESI[nov];
}

export function faylRengiAl(nov: OfisFayilNovu): string {
  return RENG_XARITESI[nov];
}

/** Bayt ölçüsünü KB/MB formatına çevirir. */
export function olcuFormatla(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  const kb = bayt / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * Faylı Supabase Storage-a XMLHttpRequest ilə yükləyir ki, yüklənmə faizini
 * (progress) real vaxtda izləmək mümkün olsun (supabase-js SDK-nın fetch əsaslı
 * upload() metodu progress hadisəsi vermir).
 */
export async function progresLiYukle(
  yol: string,
  fayl: File,
  onProgress: (faiz: number) => void,
): Promise<void> {
  const { data: sessiya } = await supabase.auth.getSession();
  const token = sessiya.session?.access_token;

  const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase konfiqurasiyası tapılmadı.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${SUPABASE_URL}/storage/v1/object/${OFIS_BUCKET}/${encodeURI(yol)}`,
    );
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", fayl.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (hadise) => {
      if (hadise.lengthComputable) {
        onProgress(Math.round((hadise.loaded / hadise.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Fayl yüklənərkən xəta baş verdi."));
      }
    };
    xhr.onerror = () => reject(new Error("Fayl yüklənərkən xəta baş verdi."));
    xhr.send(fayl);
  });
}
