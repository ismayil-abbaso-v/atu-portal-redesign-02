import { useQuery } from "@tanstack/react-query";

import { canGradeNowClient } from "@/lib/electronic-journal";
import { canGradeNow } from "@/server-functions/electronic-journal";

type UseCanGradeNowInput = {
  lessonId: string;
  teacherId: string;
  sessionTeacherId: string;
  startsAt: string;
  endsAt: string;
  lessonType: string | null;
  permissions: Record<string, boolean> | null | undefined;
  now?: string | Date;
  enabled?: boolean;
};

/**
 * UI serverdən kalibrə olunmuş vaxtla sürətli feedback verir, yekun qərarı isə
 * backend RPC-dən alır. Mutation-ların özünü DB RLS + trigger ayrıca qoruyur.
 */
export function useCanGradeNow(input: UseCanGradeNowInput) {
  const localAllowed = canGradeNowClient({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    ...(input.now !== undefined ? { now: input.now } : {}),
    assignedTeacher: input.teacherId === input.sessionTeacherId,
    permissions: input.permissions,
    lessonType: input.lessonType,
  });

  const query = useQuery({
    queryKey: ["can-grade-now", input.lessonId, input.teacherId],
    enabled: (input.enabled ?? true) && Boolean(input.lessonId && input.teacherId),
    queryFn: async () => {
      const result = await canGradeNow({ data: { lessonId: input.lessonId, teacherId: input.teacherId } });
      return result.allowed;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  return {
    localAllowed,
    backendAllowed: query.data ?? false,
    canGrade: localAllowed && query.data === true,
    isChecking: query.isLoading || query.isFetching,
    error: query.error,
  };
}
