import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileArchive,
  FileSearch,
  FileText,
  FileX,
  FolderOpen,
  HelpCircle,
  Search,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import officeHero from "@/assets/office-hero.webp";
import { EmptyState } from "@/components/layout/EmptyState";
import { OfficeFileCard, type OfisFayli } from "@/components/office/OfficeFileCard";
import { OfficeUploadDialog } from "@/components/office/OfficeUploadDialog";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { OFIS_BUCKET, olcuFormatla } from "@/lib/office-files";
import { usePageI18n } from "@/lib/i18n-extra";
import "@/office-notifications-redesign.css";
import "@/library-office-content-redesign.css";

export const Route = createFileRoute("/_authenticated/ofis")({
  head: () => ({
    meta: [
      { title: "ATU Portal" },
      { name: "description", content: "ATU Portal" },
      { property: "og:title", content: "ATU Portal" },
      { property: "og:description", content: "ATU Portal" },
    ],
  }),
  component: OfisSehifesi,
});

const OFFICE_COPY = {
  az: {
    title: "Ofis xidmətləri",
    subtitle: "Sənədləriniz və rəqəmsal inzibati resurslarınız bir yerdə.",
    quote: "Rahat xidmət, operativ həll.",
    popular: "Ofis xidmətləri",
    upload: "Fayl yüklə",
    uploadHint: "Yeni sənədi təhlükəsiz fayl anbarına əlavə edin.",
    search: "Sənədlərdə axtar",
    searchHint: "Mövcud ofis fayllarını ada görə tapın.",
    files: "Mövcud sənədlər",
    filesHint: "Portalda sizə təqdim olunan rəqəmsal sənədlərə baxın.",
    help: "Dəstək mərkəzi",
    helpHint: "Portal istifadəsi ilə bağlı yardım səhifəsinə keçin.",
    recent: "Ofis sənədləri",
    recentHint: "Mövcud real fayllar və rəqəmsal resurslar.",
    overview: "Qısa statistika",
    total: "Ümumi fayl",
    mine: "Mənim fayllarım",
    storage: "Görünən həcm",
    support: "Dəstək",
    supportText: "Əlavə müraciət və ya texniki yardım üçün yardım mərkəzindən istifadə edin.",
    backendNote:
      "Hazırkı Ofis modulu rəqəmsal faylların yüklənməsi, axtarışı, endirilməsi və icazəli silinməsini dəstəkləyir. Müraciət, transkript sifarişi və dəstək bileti üçün ayrıca backend müqaviləsi bu modulda mövcud deyil.",
    noFiles: "Ofis sənədi yoxdur",
    searchPlaceholder: "Sənəd adında axtar...",
    noSearchResults: "Axtarışa uyğun sənəd tapılmadı.",
    clearSearch: "Axtarışı sıfırla",
    loadError: "Sənədləri yükləmək mümkün olmadı.",
    retry: "Yenidən cəhd et",
  },
  tr: {
    title: "Ofis hizmetleri",
    subtitle: "Belgeleriniz ve dijital idari kaynaklarınız tek yerde.",
    quote: "Kolay hizmet, hızlı çözüm.",
    popular: "Ofis hizmetleri",
    upload: "Dosya yükle",
    uploadHint: "Yeni belgeyi güvenli dosya alanına ekleyin.",
    search: "Belgelerde ara",
    searchHint: "Mevcut ofis dosyalarını adına göre bulun.",
    files: "Mevcut belgeler",
    filesHint: "Portaldaki dijital belgelere göz atın.",
    help: "Destek merkezi",
    helpHint: "Portal kullanım yardımı sayfasına gidin.",
    recent: "Ofis belgeleri",
    recentHint: "Mevcut gerçek dosyalar ve dijital kaynaklar.",
    overview: "Kısa istatistik",
    total: "Toplam dosya",
    mine: "Dosyalarım",
    storage: "Görünen boyut",
    support: "Destek",
    supportText: "Ek yardım için destek merkezini kullanın.",
    backendNote:
      "Mevcut Ofis modülü dijital dosya yükleme, arama, indirme ve izinli silmeyi destekler. Başvuru, transkript siparişi ve destek bileti için ayrı bir backend sözleşmesi bu modülde yoktur.",
    noFiles: "Ofis belgesi yok",
    searchPlaceholder: "Belge adında ara...",
    noSearchResults: "Aramayla eşleşen belge bulunamadı.",
    clearSearch: "Aramayı temizle",
    loadError: "Belgeler yüklenemedi.",
    retry: "Tekrar dene",
  },
  en: {
    title: "Office services",
    subtitle: "Your documents and digital administrative resources in one place.",
    quote: "Simple service, timely resolution.",
    popular: "Office services",
    upload: "Upload file",
    uploadHint: "Add a new document to the secure file store.",
    search: "Search documents",
    searchHint: "Find existing office files by name.",
    files: "Available documents",
    filesHint: "Browse the digital documents available in the portal.",
    help: "Support center",
    helpHint: "Open the portal help and support page.",
    recent: "Office documents",
    recentHint: "Real files and digital resources currently available.",
    overview: "Quick statistics",
    total: "Total files",
    mine: "My files",
    storage: "Visible size",
    support: "Support",
    supportText: "Use the help center for additional assistance.",
    backendNote:
      "The current Office module supports digital file upload, search, download and permitted deletion. This module does not currently expose a separate backend contract for applications, transcript orders or support tickets.",
    noFiles: "No office documents",
    searchPlaceholder: "Search document names...",
    noSearchResults: "No documents match your search.",
    clearSearch: "Clear search",
    loadError: "Documents could not be loaded.",
    retry: "Try again",
  },
  ru: {
    title: "Офисные услуги",
    subtitle: "Документы и цифровые административные ресурсы в одном месте.",
    quote: "Удобный сервис, оперативное решение.",
    popular: "Офисные услуги",
    upload: "Загрузить файл",
    uploadHint: "Добавьте новый документ в защищённое хранилище.",
    search: "Поиск документов",
    searchHint: "Найдите доступные офисные файлы по названию.",
    files: "Доступные документы",
    filesHint: "Просматривайте цифровые документы портала.",
    help: "Центр поддержки",
    helpHint: "Откройте страницу помощи по порталу.",
    recent: "Офисные документы",
    recentHint: "Реальные файлы и цифровые ресурсы.",
    overview: "Краткая статистика",
    total: "Всего файлов",
    mine: "Мои файлы",
    storage: "Объём",
    support: "Поддержка",
    supportText: "Для дополнительной помощи используйте центр поддержки.",
    backendNote:
      "Текущий модуль «Офис» поддерживает загрузку, поиск, скачивание и разрешённое удаление цифровых файлов. Отдельного backend-контракта для заявлений, заказа транскрипта или тикетов поддержки в этом модуле нет.",
    noFiles: "Офисных документов нет",
    searchPlaceholder: "Поиск по названию документа...",
    noSearchResults: "Документы по вашему запросу не найдены.",
    clearSearch: "Очистить поиск",
    loadError: "Не удалось загрузить документы.",
    retry: "Повторить",
  },
} as const;

function OfisSehifesi() {
  const queryClient = useQueryClient();
  const { userId } = useUserRoles();
  const { locale, t } = usePageI18n();
  const copy = OFFICE_COPY[locale as keyof typeof OFFICE_COPY] ?? OFFICE_COPY.az;
  const [axtarisDeyeri, setAxtarisDeyeri] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [yukleModalAcıq, setYukleModalAcıq] = useState(false);
  const [endirilenId, setEndirilenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAxtaris(axtarisDeyeri.trim()), 400);
    return () => clearTimeout(timer);
  }, [axtarisDeyeri]);

  const {
    data: fayllar = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["ofis-fayllar", axtaris],
    queryFn: async () => {
      let query = supabase.from("office_files").select("*").order("tarix", { ascending: false });
      if (axtaris) {
        const value = axtaris.replace(/[%,]/g, "");
        query = query.ilike("ad", `%${value}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as OfisFayli[];
    },
  });

  const silMutasiyasi = useMutation({
    mutationFn: async (fayl: OfisFayli) => {
      const { error: storageError } = await supabase.storage
        .from(OFIS_BUCKET)
        .remove([fayl.fayl_url]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("office_files").delete().eq("id", fayl.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.delete"));
      void queryClient.invalidateQueries({ queryKey: ["ofis-fayllar"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  async function faylEndir(fayl: OfisFayli) {
    setEndirilenId(fayl.id);
    try {
      const { data, error } = await supabase.storage
        .from(OFIS_BUCKET)
        .createSignedUrl(fayl.fayl_url, 60, { download: true });
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setEndirilenId(null);
    }
  }

  const mineCount = useMemo(
    () => fayllar.filter((file) => file.sahib_id === userId).length,
    [fayllar, userId],
  );
  const visibleBytes = useMemo(
    () => fayllar.reduce((sum, file) => sum + Number(file.olcusu || 0), 0),
    [fayllar],
  );

  return (
    <div className="office-redesign-page animate-page-enter">
      <section className="office-reference-hero" style={{ backgroundImage: `url(${officeHero})` }}>
        <div className="office-reference-hero__shade" aria-hidden />
        <div className="office-reference-hero__copy">
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <blockquote>“{copy.quote}”</blockquote>
        <span className="office-reference-hero__mark" aria-hidden>
          <FileArchive />
        </span>
      </section>

      <section className="office-services">
        <div className="office-section-heading">
          <h2>{copy.popular}</h2>
        </div>
        <div className="office-service-grid">
          <button type="button" onClick={() => setYukleModalAcıq(true)}>
            <span>
              <UploadCloud aria-hidden />
            </span>
            <strong>{copy.upload}</strong>
            <small>{copy.uploadHint}</small>
            <ArrowRight aria-hidden />
          </button>
          <button type="button" onClick={() => searchRef.current?.focus()}>
            <span>
              <FileSearch aria-hidden />
            </span>
            <strong>{copy.search}</strong>
            <small>{copy.searchHint}</small>
            <ArrowRight aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => filesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <span>
              <FolderOpen aria-hidden />
            </span>
            <strong>{copy.files}</strong>
            <small>{copy.filesHint}</small>
            <ArrowRight aria-hidden />
          </button>
          <Link to="/menyu/yardim">
            <span>
              <HelpCircle aria-hidden />
            </span>
            <strong>{copy.help}</strong>
            <small>{copy.helpHint}</small>
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>

      <div className="office-main-layout">
        <main className="office-main-column">
          <div className="office-documents-toolbar">
            <div>
              <h2>{copy.recent}</h2>
              <p>{copy.recentHint}</p>
            </div>
            <label>
              <Search aria-hidden />
              <input
                ref={searchRef}
                aria-label={copy.search}
                placeholder={copy.searchPlaceholder}
                maxLength={120}
                value={axtarisDeyeri}
                onChange={(event) => setAxtarisDeyeri(event.target.value)}
              />
            </label>
          </div>

          <section ref={filesRef} className="office-documents-panel">
            {isLoading ? (
              <div className="office-file-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="office-file-skeleton" />
                ))}
              </div>
            ) : isError ? (
              <div className="office-content-state" role="alert">
                <FileX aria-hidden />
                <p>{copy.loadError}</p>
                <button type="button" onClick={() => void refetch()}>
                  {copy.retry}
                </button>
              </div>
            ) : fayllar.length > 0 ? (
              <div className="office-file-grid animate-stagger">
                {fayllar.map((fayl) => (
                  <OfficeFileCard
                    key={fayl.id}
                    fayl={fayl}
                    silmeIcazesiVar={fayl.sahib_id === userId}
                    endirilir={endirilenId === fayl.id}
                    silinir={silMutasiyasi.isPending && silMutasiyasi.variables?.id === fayl.id}
                    onEndir={() => void faylEndir(fayl)}
                    onSil={() => silMutasiyasi.mutate(fayl)}
                  />
                ))}
              </div>
            ) : (
              <div className="office-empty">
                <EmptyState icon={FileX} mesaj={axtaris ? copy.noSearchResults : copy.noFiles} />
                {axtaris ? (
                  <button
                    type="button"
                    className="office-clear-search"
                    onClick={() => setAxtarisDeyeri("")}
                  >
                    {copy.clearSearch}
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </main>

        <aside className="office-side-column">
          <section>
            <div className="office-side-heading">
              <h3>{copy.overview}</h3>
              <FileText aria-hidden />
            </div>
            <div className="office-stat-grid">
              <div>
                <strong>{fayllar.length}</strong>
                <small>{copy.total}</small>
              </div>
              <div>
                <strong>{mineCount}</strong>
                <small>{copy.mine}</small>
              </div>
            </div>
            <div className="office-storage-stat">
              <span>{copy.storage}</span>
              <strong>{olcuFormatla(visibleBytes)}</strong>
            </div>
          </section>

          <section>
            <div className="office-side-heading">
              <h3>{copy.support}</h3>
              <HelpCircle aria-hidden />
            </div>
            <p className="office-side-copy">{copy.supportText}</p>
            <Link to="/menyu/yardim" className="office-support-link">
              {copy.help}
              <ArrowRight aria-hidden />
            </Link>
          </section>

          <section className="office-backend-note">
            <p>{copy.backendNote}</p>
          </section>
        </aside>
      </div>

      <OfficeUploadDialog açıq={yukleModalAcıq} onOpenChange={setYukleModalAcıq} />
    </div>
  );
}
