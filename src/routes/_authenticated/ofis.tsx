import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileX, Search, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/EmptyState";
import { OfficeFileCard, type OfisFayli } from "@/components/office/OfficeFileCard";
import { OfficeUploadDialog } from "@/components/office/OfficeUploadDialog";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { OFIS_BUCKET } from "@/lib/office-files";
import { usePageI18n } from "@/lib/i18n-extra";

export const Route = createFileRoute("/_authenticated/ofis")({
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }, { property: "og:title", content: "ATU Portal" }, { property: "og:description", content: "ATU Portal" }] }),
  component: OfisSehifesi,
});

function OfisSehifesi() {
  const queryClient = useQueryClient(); const { userId } = useUserRoles(); const { t } = usePageI18n();
  const [axtarisDeyeri, setAxtarisDeyeri] = useState(""); const [axtaris, setAxtaris] = useState(""); const [yukleModalAcıq, setYukleModalAcıq] = useState(false); const [endirilenId, setEndirilenId] = useState<string | null>(null);
  useEffect(() => { const zamanlayici = setTimeout(() => setAxtaris(axtarisDeyeri.trim()), 400); return () => clearTimeout(zamanlayici); }, [axtarisDeyeri]);
  const { data: fayllar = [], isLoading } = useQuery({ queryKey: ["ofis-fayllar", axtaris], queryFn: async () => { let sorgu = supabase.from("office_files").select("*").order("tarix", { ascending: false }); if (axtaris) { const deyer = axtaris.replace(/[%,]/g, ""); sorgu = sorgu.ilike("ad", `%${deyer}%`); } const { data, error } = await sorgu; if (error) throw error; return data as OfisFayli[]; } });
  const silMutasiyasi = useMutation({ mutationFn: async (fayl: OfisFayli) => { const { error: anbarXetasi } = await supabase.storage.from(OFIS_BUCKET).remove([fayl.fayl_url]); if (anbarXetasi) throw anbarXetasi; const { error } = await supabase.from("office_files").delete().eq("id", fayl.id); if (error) throw error; }, onSuccess: () => { toast.success(t("common.delete")); void queryClient.invalidateQueries({ queryKey: ["ofis-fayllar"] }); }, onError: () => { toast.error(t("common.error")); } });
  async function faylEndir(fayl: OfisFayli) { setEndirilenId(fayl.id); try { const { data, error } = await supabase.storage.from(OFIS_BUCKET).createSignedUrl(fayl.fayl_url, 60, { download: true }); if (error) throw error; window.open(data.signedUrl, "_blank"); } catch { toast.error(t("common.error")); } finally { setEndirilenId(null); } }
  return <><div className="mb-4 flex items-center gap-3"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input aria-label={t("common.search")} placeholder={t("common.search")} maxLength={120} value={axtarisDeyeri} onChange={(e) => setAxtarisDeyeri(e.target.value)} className="h-12 w-full rounded-2xl bg-card pl-12 pr-4 text-foreground shadow-sm outline-none ring-ring/40 focus:ring-2" /></div><button type="button" onClick={() => setYukleModalAcıq(true)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground transition hover:opacity-90"><UploadCloud className="size-5" /> {t("office.upload")}</button></div>{isLoading ? <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-card shadow-sm" />)}</div> : fayllar.length > 0 ? <div className="grid flex-1 auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{fayllar.map((fayl) => <OfficeFileCard key={fayl.id} fayl={fayl} silmeIcazesiVar={fayl.sahib_id === userId} endirilir={endirilenId === fayl.id} silinir={silMutasiyasi.isPending && silMutasiyasi.variables?.id === fayl.id} onEndir={() => void faylEndir(fayl)} onSil={() => silMutasiyasi.mutate(fayl)} />)}</div> : <div className="flex flex-1 rounded-3xl bg-card shadow-sm"><EmptyState icon={FileX} mesaj={axtaris ? t("library.emptySearch") : t("office.noFiles")} /></div>}<OfficeUploadDialog açıq={yukleModalAcıq} onOpenChange={setYukleModalAcıq} /></>;
}
