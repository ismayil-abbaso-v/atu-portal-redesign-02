import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Megaphone, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { supabase } from "@/integrations/supabase/client";
import type { Announcement, AnnouncementRead } from "@/lib/announcements";
import "@/announcements-premium.css";

export function StudentAnnouncementsHome({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: ["student-announcements-home", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcements")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(2);
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    enabled: Boolean(userId),
    staleTime: 20_000,
  });

  const readsQuery = useQuery({
    queryKey: ["student-announcement-reads-home", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcement_reads")
        .select("announcement_id,user_id,first_read_at,last_read_at,open_count")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as AnnouncementRead[];
    },
    enabled: Boolean(userId),
    staleTime: 20_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`student-announcements-home-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["student-announcements-home", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reads", filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["student-announcement-reads-home", userId] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const announcements = announcementsQuery.data ?? [];
  if (!announcementsQuery.isLoading && announcements.length === 0) return null;

  const readIds = new Set((readsQuery.data ?? []).map((item) => item.announcement_id));
  const unreadCount = announcements.filter((item) => !readIds.has(item.id)).length;

  return (
    <section className="announcement-shell mt-4 pb-2" aria-labelledby="student-announcements-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-primary/75">
            <Sparkles className="size-3.5" /> Universitet gündəmi
          </div>
          <div className="flex items-center gap-2.5">
            <h2 id="student-announcements-heading" className="font-display text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">
              Elanlar
            </h2>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                {unreadCount} yeni
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Akademik yeniliklər, tədbirlər və tələbə imkanları bir yerdə.</p>
        </div>
        <Link to="/elanlar" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-primary transition hover:bg-primary/8">
          Hamısını gör <ChevronRight className="size-4" />
        </Link>
      </div>

      {announcementsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[440px] animate-pulse rounded-3xl bg-muted" />
          <div className="h-[440px] animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : announcements.length > 0 ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {announcements.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
              initiallyRead={readIds.has(item.id)}
              compact
              home
            />
          ))}
        </div>
      ) : (
        <div className="announcement-empty flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <Megaphone className="relative z-10 mb-3 size-9 text-muted-foreground/50" />
          <p className="relative z-10 text-sm font-semibold text-muted-foreground">Hazırda aktiv elan yoxdur.</p>
        </div>
      )}
    </section>
  );
}
