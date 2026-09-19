// Avatar bucket-i privatdır: bazada saxlanan "public" URL-ləri imzalanmış
// (signed) URL-ə çeviririk ki, şəkillər göstərilə bilsin.
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const KES = new Map<string, { url: string; bitir: number }>();
const MUDDET = 60 * 60; // 1 saat

/** URL-dən avatars bucket-indəki obyekt yolunu çıxarır (yoxdursa null). */
export function avatarYolunuCixar(url: string | null | undefined): string | null {
  if (!url) return null;
  const nisan = "/storage/v1/object/public/avatars/";
  const i = url.indexOf(nisan);
  if (i >= 0) return decodeURIComponent(url.slice(i + nisan.length).split("?")[0] ?? "");
  if (!url.startsWith("http") && !url.startsWith("blob:") && !url.startsWith("data:")) return url;
  return null;
}

/** Avatar üçün imzalanmış URL qaytarır; digər URL-lər olduğu kimi ötürülür. */
export function useAvatarUrl(url: string | null | undefined): string | undefined {
  const [netice, setNetice] = useState<string | undefined>(() => {
    const yol = avatarYolunuCixar(url);
    if (!yol) return url ?? undefined;
    const kes = KES.get(yol);
    return kes && kes.bitir > Date.now() ? kes.url : undefined;
  });

  useEffect(() => {
    const yol = avatarYolunuCixar(url);
    if (!yol) {
      setNetice(url ?? undefined);
      return;
    }
    const kes = KES.get(yol);
    if (kes && kes.bitir > Date.now()) {
      setNetice(kes.url);
      return;
    }
    let legv = false;
    void supabase.storage
      .from("avatars")
      .createSignedUrl(yol, MUDDET)
      .then(({ data }) => {
        if (legv || !data?.signedUrl) return;
        KES.set(yol, { url: data.signedUrl, bitir: Date.now() + (MUDDET - 60) * 1000 });
        setNetice(data.signedUrl);
      });
    return () => {
      legv = true;
    };
  }, [url]);

  return netice;
}
