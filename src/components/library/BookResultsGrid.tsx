import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";

import { BookCard, type LibraryBook } from "./BookCard";

export function BookResultsGrid({
  kitablar,
  yuklenir,
  sehife,
  sehifeSayi,
  onSehifeDeyis,
  onKitabSec,
  boşMesaj,
}: {
  kitablar: LibraryBook[];
  yuklenir: boolean;
  sehife: number;
  sehifeSayi: number;
  onSehifeDeyis: (sehife: number) => void;
  onKitabSec: (kitab: LibraryBook) => void;
  boşMesaj: string;
}) {
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

  if (kitablar.length === 0) {
    return (
      <div className="library-category-results__empty">
        <EmptyState icon={SearchX} mesaj={boşMesaj} />
      </div>
    );
  }

  return (
    <div className="library-category-results__content space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
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
            className="size-9 rounded-xl"
            disabled={sehife <= 1}
            onClick={() => onSehifeDeyis(sehife - 1)}
            aria-label="Əvvəlki səhifə"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground">
            Səhifə {sehife} / {sehifeSayi}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-xl"
            disabled={sehife >= sehifeSayi}
            onClick={() => onSehifeDeyis(sehife + 1)}
            aria-label="Növbəti səhifə"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
