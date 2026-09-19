import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookMarked, BookOpenCheck, Database, Layers3, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { kitabxanaKateqoriyalari } from "@/lib/library-categories";
import { usePageI18n } from "@/lib/i18n-extra";

import { BookCard, type LibraryBook } from "./BookCard";

const COPY = {
  az: {
    featured: "Seçilmiş resurslar",
    latest: "Son əlavə olunanlar",
    overview: "Kitabxana icmalı",
    resources: "Rəqəmsal resurs",
    categories: "Kateqoriya",
    formats: "Görünən formatlar",
    databases: "Akademik verilənlər bazaları",
    databaseNote: "Xarici akademik baza inteqrasiyası hazırkı portalda aktiv deyil.",
    empty: "Hələ kitabxanaya kitab əlavə olunmayıb.",
    error: "Kitabxana məlumatlarını yükləmək mümkün olmadı.",
    retry: "Yenidən cəhd et",
  },
  tr: {
    featured: "Seçili kaynaklar",
    latest: "Son eklenenler",
    overview: "Kütüphane özeti",
    resources: "Dijital kaynak",
    categories: "Kategori",
    formats: "Görünen formatlar",
    databases: "Akademik veri tabanları",
    databaseNote: "Harici akademik veri tabanı entegrasyonu mevcut portalda etkin değil.",
    empty: "Kütüphaneye henüz kitap eklenmedi.",
    error: "Kütüphane bilgileri yüklenemedi.",
    retry: "Tekrar dene",
  },
  en: {
    featured: "Featured resources",
    latest: "Recently added",
    overview: "Library overview",
    resources: "Digital resources",
    categories: "Categories",
    formats: "Visible formats",
    databases: "Academic databases",
    databaseNote: "External academic database integration is not enabled in the current portal.",
    empty: "No books have been added to the library yet.",
    error: "Library information could not be loaded.",
    retry: "Try again",
  },
  ru: {
    featured: "Избранные ресурсы",
    latest: "Недавно добавленные",
    overview: "Обзор библиотеки",
    resources: "Цифровые ресурсы",
    categories: "Категории",
    formats: "Доступные форматы",
    databases: "Академические базы данных",
    databaseNote: "Интеграция внешних академических баз данных в текущем портале не активна.",
    empty: "В библиотеку пока не добавлены книги.",
    error: "Не удалось загрузить данные библиотеки.",
    retry: "Повторить",
  },
} as const;

export function RecentBooks({ onKitabSec }: { onKitabSec: (kitab: LibraryBook) => void }) {
  const { locale } = usePageI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.az;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["library-books-recent"],
    queryFn: async () => {
      const {
        data: rows,
        error,
        count,
      } = await supabase
        .from("library_books")
        .select("*", { count: "exact" })
        .order("elave_olunma_tarixi", { ascending: false })
        .limit(10);
      if (error) throw error;
      return { books: (rows ?? []) as LibraryBook[], count: count ?? 0 };
    },
  });

  const books = data?.books ?? [];
  const featured = books.slice(0, 5);
  const latest = books.slice(0, 3);
  const formats = Array.from(new Set(books.map((book) => book.format).filter(Boolean))).slice(0, 3);

  if (isLoading) {
    return (
      <section className="library-reference-overview">
        <div className="library-featured-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="library-reference-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="library-reference-overview">
        <div className="library-content-state" role="alert">
          <span>
            <AlertCircle aria-hidden />
          </span>
          <p>{copy.error}</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            {copy.retry}
          </Button>
        </div>
      </section>
    );
  }

  if (!books.length) {
    return (
      <section className="library-reference-overview">
        <EmptyState icon={BookMarked} mesaj={copy.empty} />
      </section>
    );
  }

  return (
    <section className="library-reference-layout">
      <div className="library-reference-main">
        <div className="library-reference-section-heading">
          <div>
            <span>
              <Sparkles aria-hidden />
            </span>
            <h2>{copy.featured}</h2>
          </div>
          <small>{featured.length}</small>
        </div>
        <div className="library-featured-grid">
          {featured.map((book) => (
            <BookCard key={book.id} kitab={book} yeni onClick={() => onKitabSec(book)} />
          ))}
        </div>

        <div className="library-reference-section-heading library-reference-section-heading--latest">
          <div>
            <span>
              <BookOpenCheck aria-hidden />
            </span>
            <h2>{copy.latest}</h2>
          </div>
        </div>
        <div className="library-latest-list">
          {latest.map((book) => (
            <button key={book.id} type="button" onClick={() => onKitabSec(book)}>
              <span className="library-latest-list__cover">
                {book.uz_qabigi_url ? (
                  <img src={book.uz_qabigi_url} alt="" loading="lazy" />
                ) : (
                  <BookMarked aria-hidden />
                )}
              </span>
              <span className="library-latest-list__copy">
                <strong>{book.ad}</strong>
                <small>{book.muellif}</small>
              </span>
              <span className="library-latest-list__format">{book.format}</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="library-reference-side">
        <section>
          <div className="library-side-heading">
            <h3>{copy.overview}</h3>
          </div>
          <div className="library-side-stats">
            <div>
              <span>
                <BookMarked aria-hidden />
              </span>
              <p>
                <strong>{data?.count ?? 0}</strong>
                <small>{copy.resources}</small>
              </p>
            </div>
            <div>
              <span>
                <Layers3 aria-hidden />
              </span>
              <p>
                <strong>{kitabxanaKateqoriyalari.length}</strong>
                <small>{copy.categories}</small>
              </p>
            </div>
          </div>
          <div className="library-format-summary">
            <small>{copy.formats}</small>
            <strong>{formats.length ? formats.join(" · ") : "—"}</strong>
          </div>
        </section>

        <section>
          <div className="library-side-heading">
            <h3>{copy.databases}</h3>
            <Database aria-hidden />
          </div>
          <p className="library-database-note">{copy.databaseNote}</p>
        </section>
      </aside>
    </section>
  );
}
