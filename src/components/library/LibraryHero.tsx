import { BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import libraryHeroImage from "@/assets/library-hero.svg";
import { kitabxanaKateqoriyalari } from "@/lib/library-categories";
import { usePageI18n } from "@/lib/i18n-extra";

const COPY = {
  az: { title: "Kitabxana", subtitle: "Biliyə daha yaxın olaq!", description: "Elmi bilik, araşdırma və inkişaf üçün rəqəmsal resurslar.", quote: "Kitablar dünyanı anlamağın ən etibarlı yollarından biridir.", advanced: "Ətraflı axtarış", categories: "Kateqoriyalar" },
  tr: { title: "Kütüphane", subtitle: "Bilgiye daha yakın olalım!", description: "Bilim, araştırma ve gelişim için dijital kaynaklar.", quote: "Kitaplar dünyayı anlamanın en güvenilir yollarından biridir.", advanced: "Gelişmiş arama", categories: "Kategoriler" },
  en: { title: "Library", subtitle: "Move closer to knowledge.", description: "Digital resources for learning, research and development.", quote: "Books remain one of the most reliable ways to understand the world.", advanced: "Advanced search", categories: "Categories" },
  ru: { title: "Библиотека", subtitle: "Ближе к знаниям!", description: "Цифровые ресурсы для обучения, исследований и развития.", quote: "Книги остаются одним из самых надёжных способов понять мир.", advanced: "Расширенный поиск", categories: "Категории" },
} as const;

export function LibraryHero({ axtaris, onAxtarisDeyis, onKateqoriyaSec }: { axtaris: string; onAxtarisDeyis: (deyer: string) => void; onKateqoriyaSec: (kateqoriya: string) => void }) {
  const { locale, t } = usePageI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.az;
  const [deyer, setDeyer] = useState(axtaris);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => { setDeyer(axtaris); }, [axtaris]);
  useEffect(() => {
    const timer = setTimeout(() => onAxtarisDeyis(deyer.trim()), 400);
    return () => clearTimeout(timer);
  }, [deyer, onAxtarisDeyis]);

  function submitSearch() {
    onAxtarisDeyis(deyer.trim());
  }

  return (
    <>
      <section className="library-reference-hero" style={{ backgroundImage: `url(${libraryHeroImage})` }}>
        <div className="library-reference-hero__shade" aria-hidden />
        <div className="library-reference-hero__copy">
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          <span>{copy.description}</span>
        </div>
        <div className="library-reference-hero__mark" aria-hidden><BookOpen /></div>
        <blockquote>“{copy.quote}”</blockquote>
      </section>

      <section className="library-reference-search">
        <div className="library-reference-search__bar">
          <Search aria-hidden />
          <input value={deyer} onChange={(event) => setDeyer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder={t("library.searchPlaceholder")} aria-label={t("library.searchPlaceholder")} />
          <button type="button" onClick={submitSearch}>{t("library.searchButton")}</button>
        </div>
        <button type="button" className="library-reference-search__advanced" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((value) => !value)}>
          <SlidersHorizontal aria-hidden />{copy.advanced}
        </button>

        {advancedOpen ? (
          <div className="library-reference-search__categories" aria-label={copy.categories}>
            {kitabxanaKateqoriyalari.map(({ ad }) => <button key={ad} type="button" onClick={() => onKateqoriyaSec(ad)}>{ad}</button>)}
          </div>
        ) : null}
      </section>
    </>
  );
}
