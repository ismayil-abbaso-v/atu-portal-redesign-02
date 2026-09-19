import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddBookForm } from "@/components/library/AddBookForm";
import type { LibraryBook } from "@/components/library/BookCard";
import { BookDetailModal } from "@/components/library/BookDetailModal";
import { BookResultsGrid } from "@/components/library/BookResultsGrid";
import { CategoryGrid } from "@/components/library/CategoryGrid";
import { LibraryHero } from "@/components/library/LibraryHero";
import { RecentBooks } from "@/components/library/RecentBooks";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { usePageI18n } from "@/lib/i18n-extra";
import "@/library-premium.css";
import "@/library-refinements.css";
import "@/chat-library-redesign.css";

const SEHIFE_OLCUSU = 15;
export const Route = createFileRoute("/_authenticated/kitabxana")({ head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }, { property: "og:title", content: "ATU Portal" }, { property: "og:description", content: "ATU Portal" }] }), component: KitabxanaSehifesi });

function KitabxanaSehifesi() {
  const { roles } = useUserRoles(); const { t } = usePageI18n(); const inzibatciMi = roles.includes("admin") || roles.includes("dekan");
  const [axtaris, setAxtaris] = useState(""); const [kateqoriya, setKateqoriya] = useState<string | null>(null); const [sehife, setSehife] = useState(1); const [seçilmişKitab, setSeçilmişKitab] = useState<LibraryBook | null>(null); const [modalAçıq, setModalAçıq] = useState(false);
  const axtarisAktivdir = axtaris.trim().length > 0; const siyahiRejimi = axtarisAktivdir || !!kateqoriya;
  const { data, isLoading } = useQuery({ queryKey: ["library-books-list", axtaris, kateqoriya, sehife], queryFn: async () => { const basdan = (sehife - 1) * SEHIFE_OLCUSU; const sona = basdan + SEHIFE_OLCUSU - 1; let sorgu = supabase.from("library_books").select("*", { count: "exact" }).order("elave_olunma_tarixi", { ascending: false }).range(basdan, sona); if (axtarisAktivdir) { const deyer = axtaris.trim().replace(/[%,]/g, ""); sorgu = sorgu.or(`ad.ilike.%${deyer}%,muellif.ilike.%${deyer}%`); } else if (kateqoriya) sorgu = sorgu.eq("kateqoriya", kateqoriya); const { data: netice, error, count } = await sorgu; if (error) throw error; return { kitablar: (netice ?? []) as LibraryBook[], sayi: count ?? 0 }; }, enabled: siyahiRejimi });
  const kitablar = data?.kitablar ?? []; const sehifeSayi = Math.max(1, Math.ceil((data?.sayi ?? 0) / SEHIFE_OLCUSU));
  function kateqoriyaSec(ad: string) { setKateqoriya(ad); setSehife(1); } function geriQayit() { setKateqoriya(null); setAxtaris(""); setSehife(1); } function kitabAc(kitab: LibraryBook) { setSeçilmişKitab(kitab); setModalAçıq(true); }
  return <div className="library-redesign-page flex flex-1 flex-col gap-4 pb-20 md:gap-5 md:pb-0">
    {siyahiRejimi ? <PageHeader baslıq={axtarisAktivdir ? t("library.searchResults") : (kateqoriya ?? t("library.title"))} geri onGeri={geriQayit}>{inzibatciMi ? <AddBookForm /> : null}</PageHeader> : null}
    {!siyahiRejimi ? <LibraryHero axtaris={axtaris} onAxtarisDeyis={setAxtaris} onKateqoriyaSec={kateqoriyaSec} /> : null}
    {siyahiRejimi ? <div key={`${kateqoriya ?? "search"}-${axtaris}`} className="library-premium-section library-category-results-panel rounded-[28px] p-4 sm:p-6"><BookResultsGrid kitablar={kitablar} yuklenir={isLoading} sehife={sehife} sehifeSayi={sehifeSayi} onSehifeDeyis={setSehife} onKitabSec={kitabAc} boşMesaj={axtarisAktivdir ? t("library.emptySearch") : t("library.emptyCategory")} /></div> : <>{inzibatciMi ? <div className="flex justify-end"><AddBookForm /></div> : null}<CategoryGrid onKateqoriyaSec={kateqoriyaSec} /><RecentBooks onKitabSec={kitabAc} /></>}
    <BookDetailModal kitab={seçilmişKitab} açıq={modalAçıq} onClose={() => setModalAçıq(false)} />
  </div>;
}
