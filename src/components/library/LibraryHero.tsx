import { BookOpen, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePageI18n } from "@/lib/i18n-extra";

export function LibraryHero({ axtaris, onAxtarisDeyis }: { axtaris: string; onAxtarisDeyis: (deyer: string) => void }) {
  const { t } = usePageI18n();
  const [deyer, setDeyer] = useState(axtaris);

  useEffect(() => { setDeyer(axtaris); }, [axtaris]);
  useEffect(() => {
    const zamanlayici = setTimeout(() => onAxtarisDeyis(deyer.trim()), 400);
    return () => clearTimeout(zamanlayici);
  }, [deyer, onAxtarisDeyis]);

  function axtarisGonder() { onAxtarisDeyis(deyer.trim()); }

  return (
    <section className="library-premium-hero relative isolate overflow-hidden rounded-[28px] px-5 py-7 text-primary-foreground sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <span aria-hidden className="library-premium-hero__pattern" />
      <span aria-hidden className="library-premium-hero__glow library-premium-hero__glow--one" />
      <span aria-hidden className="library-premium-hero__glow library-premium-hero__glow--two" />
      <span aria-hidden className="library-premium-hero__accent" />
      <span aria-hidden className="library-premium-hero__sweep" />

      <div className="relative z-10 grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-10">
        <div className="library-premium-hero__copy min-w-0">
          <div className="library-premium-hero__eyebrow mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-foreground/85 backdrop-blur-sm sm:text-[11px]">
            <BookOpen className="size-3.5" />
            Rəqəmsal kitabxana
          </div>

          <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-[2.9rem] lg:leading-[1.04]">
            {t("library.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-foreground/76 sm:text-base">
            {t("library.description")}
          </p>

          <div className="library-premium-search mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl p-1.5 sm:flex-row sm:items-center">
            <div className="library-premium-search__field flex min-w-0 flex-1 items-center gap-2.5">
              <Search className="size-5 shrink-0 text-primary-foreground/72" />
              <input
                value={deyer}
                onChange={(e) => setDeyer(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") axtarisGonder(); }}
                placeholder={t("library.searchPlaceholder")}
                className="library-premium-search__input h-12 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-primary-foreground shadow-none outline-none ring-0 placeholder:text-primary-foreground/52 focus:border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <Button type="button" onClick={axtarisGonder} className="library-premium-search__button h-12 shrink-0 rounded-xl px-7 font-bold">
              {t("library.searchButton")}
            </Button>
          </div>

          <div className="library-premium-hero__note mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary-foreground/68 sm:text-sm">
            <Sparkles className="size-4" />
            Kitabları kəşf edin, oxuyun və biliklərinizi genişləndirin.
          </div>
        </div>

        <div className="library-premium-hero__visual" aria-hidden>
          <span className="library-shelf__arch" />
          <span className="library-shelf__halo" />
          <div className="library-shelf__books">
            <span className="library-shelf__book library-shelf__book--1" />
            <span className="library-shelf__book library-shelf__book--2" />
            <span className="library-shelf__book library-shelf__book--3" />
            <span className="library-shelf__book library-shelf__book--4" />
            <span className="library-shelf__book library-shelf__book--5" />
            <span className="library-shelf__book library-shelf__book--6" />
          </div>
          <span className="library-shelf__line" />
        </div>
      </div>
    </section>
  );
}
