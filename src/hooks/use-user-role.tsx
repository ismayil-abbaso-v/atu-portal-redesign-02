import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRoles() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Cari istifadəçini əldə et
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setIsAuthLoading(false);
    });

    // Sessiya dəyişikliklərini dinlə
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: err } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (err) throw err;
      return data.map((r) => r.role as AppRole);
    },
    enabled: !!userId,
  });

  return {
    roles,
    isLoading: isAuthLoading || isRolesLoading,
    error,
    refetch,
    userId,
  };
}

const rolePriorities: Record<AppRole, number> = {
  admin: 5,
  dekan: 4,
  muellim: 3,
  tyutor: 2,
  telebe: 1,
};

export function usePrimaryRole() {
  const { roles, isLoading, error, refetch, userId } = useUserRoles();

  let primaryRole: AppRole | null = null;
  if (roles && roles.length > 0) {
    primaryRole = [...roles].sort((a, b) => rolePriorities[b] - rolePriorities[a])[0] ?? null;
  } else if (!isLoading && userId) {
    // Əgər rol tapılmayıbsa, defolt olaraq tələbə
    primaryRole = "telebe";
  }

  return { primaryRole, isLoading, error, refetch, userId };
}
