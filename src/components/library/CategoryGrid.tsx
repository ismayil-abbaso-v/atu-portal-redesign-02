import { Shapes } from "lucide-react";

import { kitabxanaKateqoriyalari } from "@/lib/library-categories";

export function CategoryGrid({
  onKateqoriyaSec,
}: {
  onKateqoriyaSec: (kateqoriya: string) => void;
}) {
  return (
    <div className="library-category-classic relative overflow-hidden rounded-3xl bg-card p-5 shadow-sm sm:p-6">
      <span aria-hidden className="library-category-classic__loadline" />

      <div className="library-category-classic__header mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <span className="library-category-classic__title-icon flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shapes className="size-5" />
          </span>
          Kateqoriyalar
        </h2>
        <span className="hidden rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
          {kitabxanaKateqoriyalari.length} bölmə
        </span>
      </div>

      <div className="library-category-classic__grid grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {kitabxanaKateqoriyalari.map(({ ad, ikon: Ikon }, index) => (
          <button
            key={ad}
            type="button"
            onClick={() => onKateqoriyaSec(ad)}
            className="library-category-classic__card group flex flex-col items-center gap-3 rounded-2xl bg-muted/60 px-3 py-5 text-center transition-colors hover:bg-muted"
            style={{ animationDelay: `${95 + index * 48}ms` }}
          >
            <span
              className="library-category-classic__icon flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
              style={{ animationDelay: `${210 + index * 48}ms` }}
            >
              <Ikon className="size-6" />
            </span>
            <span className="text-sm font-bold leading-tight text-foreground">{ad}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
