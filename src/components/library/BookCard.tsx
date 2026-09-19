import { BookMarked } from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

export type LibraryBook = Database["public"]["Tables"]["library_books"]["Row"];

export function BookCard({
  kitab,
  yeni = false,
  onClick,
}: {
  kitab: LibraryBook;
  yeni?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="library-book-card group flex flex-col text-left focus:outline-none"
    >
      <div className="library-book-cover relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
        {kitab.uz_qabigi_url ? (
          <img
            src={kitab.uz_qabigi_url}
            alt={kitab.ad}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 via-muted to-primary/10 px-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-card/70 text-primary shadow-sm">
              <BookMarked className="size-7 stroke-[1.4]" />
            </span>
            <span className="line-clamp-2 text-xs font-semibold text-muted-foreground">{kitab.ad}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/22 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {yeni ? (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-primary px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary-foreground shadow-sm">
            Yeni
          </span>
        ) : null}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{kitab.ad}</p>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{kitab.muellif}</p>
    </button>
  );
}
