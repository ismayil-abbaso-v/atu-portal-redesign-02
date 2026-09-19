import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * Cari istifadəçinin bildirişlərini real-time olaraq (Supabase Realtime Postgres Changes)
 * yükləyən və idarə edən hook. Həm bildirisler.tsx səhifəsində (tam siyahı), həm də
 * Sidebar-da (yalnız oxunmamış say) istifadə olunur.
 */
export function useNotifications() {
  const { userId } = useUserRoles();
  const queryClient = useQueryClient();

  const queryKey = ["notifications", userId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", userId)
        .order("tarix", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!userId,
  });

  const notifications: Notification[] = data ?? [];
  const unreadCount = notifications.reduce((say, n) => say + (n.oxunub_mu ? 0 : 1), 0);

  // useNotifications eyni anda bir neçə yerdə (məs. Sidebar və bildirisler.tsx
  // səhifəsi) paralel çağırıla bilər. Supabase eyni topic adlı kanalı yenidən
  // istifadə etdiyi üçün (artıq subscribe olunmuş kanala .on() əlavə etmək
  // "cannot add postgres_changes callbacks ... after subscribe()" xətası atır),
  // hər hook instansına unikal kanal adı verməliyik ki, toqquşma olmasın.
  const channelIdRef = useRef(
    `notifications-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );

  // Realtime: yeni bildiriş gələndə və ya mövcud bildiriş yenilənəndə (məs. başqa
  // tabda oxunmuş kimi işarələnəndə) cache-i səhifə yenilənmədən yeniləyirik.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${userId}`,
        },
        (payload) => {
          const yeni = payload.new as Notification;
          queryClient.setQueryData(queryKey, (mevcud: Notification[] = []) => {
            if (mevcud.some((n) => n.id === yeni.id)) return mevcud;
            return [yeni, ...mevcud];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${userId}`,
        },
        (payload) => {
          const yenilenmis = payload.new as Notification;
          queryClient.setQueryData(queryKey, (mevcud: Notification[] = []) =>
            mevcud.map((n) => (n.id === yenilenmis.id ? yenilenmis : n)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ oxunub_mu: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      queryClient.setQueryData(queryKey, (mevcud: Notification[] = []) =>
        mevcud.map((n) => (n.id === id ? { ...n, oxunub_mu: true } : n)),
      );
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ oxunub_mu: true })
        .eq("profile_id", userId)
        .eq("oxunub_mu", false);
      if (error) throw error;
    },
    onMutate: async () => {
      queryClient.setQueryData(queryKey, (mevcud: Notification[] = []) =>
        mevcud.map((n) => ({ ...n, oxunub_mu: true })),
      );
    },
  });

  return { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, userId };
}
