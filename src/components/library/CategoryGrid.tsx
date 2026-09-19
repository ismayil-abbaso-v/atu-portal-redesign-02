import { Shapes } from "lucide-react";

import { kitabxanaKateqoriyalari } from "@/lib/library-categories";
import { usePageI18n } from "@/lib/i18n-extra";

const TITLE = { az: "Kateqoriyalar", tr: "Kategoriler", en: "Categories", ru: "Категории" } as const;

export function CategoryGrid({ onKateqoriyaSec }: { onKateqoriyaSec: (kateqoriya: string) => void }) {
  const { locale } = usePageI18n();
  const title = TITLE[locale as keyof typeof TITLE] ?? TITLE.az;

  return (
    <section className="library-category-strip">
      <div className="library-category-strip__heading">
        <span><Shapes aria-hidden /></span>
        <h2>{title}</h2>
      </div>
      <div className="library-category-strip__scroller">
        {kitabxanaKateqoriyalari.map(({ ad, ikon: Icon }, index) => (
          <button key={ad} type="button" onClick={() => onKateqoriyaSec(ad)} style={{ animationDelay: `${index * 30}ms` }}>
            <span><Icon aria-hidden /></span>
            {ad}
          </button>
        ))}
      </div>
    </section>
  );
}
