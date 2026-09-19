import { useQuery } from "@tanstack/react-query";
import { BookMarked, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { supabase } from "@/integrations/supabase/client";

import { BookCard, type LibraryBook } from "./BookCard";

export function RecentBooks({ onKitabSec }: { onKitabSec: (kitab: LibraryBook) => void }) {
  const { data: kitablar = [], isLoading } = useQuery({
    queryKey: ["library-books-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .order("elave_olunma_tarixi", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as LibraryBook[];
    },
  });

  return (
    <section className="library-premium-section rounded-[28px] p-5 sm:p-6 lg:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="library-recent-header-icon flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Yeni kolleksiya</p>
            <h2 className="truncate font-display text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">Son Əlavə Olanlar</h2>
          </div>
        </div>
        {!isLoading && kitablar.length > 0 ? (
          <span className="hidden rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
            {kitablar.length} kitab
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : kitablar.length === 0 ? (
        <EmptyState icon={BookMarked} mesaj="Hələ kitabxanaya kitab əlavə olunmayıb." />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-5 lg:gap-x-5">
          {kitablar.map((kitab) => (
            <BookCard key={kitab.id} kitab={kitab} yeni onClick={() => onKitabSec(kitab)} />
          ))}
        </div>
      )}
    </section>
  );
}
