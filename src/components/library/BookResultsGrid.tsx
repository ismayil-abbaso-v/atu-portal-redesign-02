import { AlertCircle, ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { usePageI18n } from "@/lib/i18n-extra";

import { BookCard, type LibraryBook } from "./BookCard";

export function BookResultsGrid({
  kitablar,
  yuklenir,
  xetaVar,
  onYenidenCeht,
  sehife,
  sehifeSayi,
  onSehifeDeyis,
  onKitabSec,
  boşMesaj,
}: {
  kitablar: LibraryBook[];
  yuklenir: boolean;
  xetaVar: boolean;
  onYenidenCeht: () => void;
  sehife: number;
  sehifeSayi: number;
  onSehifeDeyis: (sehife: number) => void;
  onKitabSec: (kitab: LibraryBook) => void;
  boşMesaj: string;
}) {
  const { locale } = usePageI18n();
  const copy =
    locale === "tr"
      ? {
          error: "Kaynaklar yüklenemedi.",
          retry: "Tekrar dene",
          previous: "Önceki sayfa",
          next: "Sonraki sayfa",
          page: "Sayfa",
        }
      : locale === "en"
        ? {
            error: "Resources could not be loaded.",
            retry: "Try again",
            previous: "Previous page",
            next: "Next page",
            page: "Page",
          }
        : locale === "ru"
          ? {
              error: "Не удалось загрузить ресурсы.",
              retry: "Повторить",
              previous: "Предыдущая страница",
              next: "Следующая страница",
              page: "Страница",
            }
          : {
              error: "Resursları yükləmək mümkün olmadı.",
              retry: "Yenidən cəhd et",
              previous: "Əvvəlki səhifə",
              next: "Növbəti səhifə",
              page: "Səhifə",
            };

  if (yuklenir) {
    return (
      <div className="library-category-results__loading grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="library-category-results__skeleton aspect-[3/4] rounded-2xl bg-muted"
            style={{ animationDelay: `${i * 55}ms` }}
          />
        ))}
      </div>
    );
  }

  if (xetaVar) {
    return (
      <div className="library-content-state" role="alert">
        <span>
          <AlertCircle aria-hidden />
        </span>
        <p>{copy.error}</p>
        <Button type="button" variant="outline" onClick={onYenidenCeht}>
          {copy.retry}
        </Button>
      </div>
    );
  }

  if (kitablar.length === 0) {
    return (
      <div className="library-category-results__empty">
        <EmptyState icon={SearchX} mesaj={boşMesaj} />
      </div>
    );
  }

  return (
    <div className="library-category-results__content space-y-6">
      <div className="library-results-grid">
        {kitablar.map((kitab, index) => (
          <div
            key={kitab.id}
            className="library-category-results__book"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <BookCard kitab={kitab} onClick={() => onKitabSec(kitab)} />
          </div>
        ))}
      </div>

      {sehifeSayi > 1 ? (
        <div className="library-category-results__pagination flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            disabled={sehife <= 1}
            onClick={() => onSehifeDeyis(sehife - 1)}
            aria-label={copy.previous}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground">
            {copy.page} {sehife} / {sehifeSayi}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            disabled={sehife >= sehifeSayi}
            onClick={() => onSehifeDeyis(sehife + 1)}
            aria-label={copy.next}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
