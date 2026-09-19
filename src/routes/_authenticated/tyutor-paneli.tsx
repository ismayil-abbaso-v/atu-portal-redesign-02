import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { TutorOperationsPanel } from "@/components/tutor/TutorOperationsPanel";
import { useUserRoles } from "@/hooks/use-user-role";
import { canAccessTutorPanel } from "@/lib/route-permissions";

export const Route = createFileRoute("/_authenticated/tyutor-paneli")({
  beforeLoad: canAccessTutorPanel,
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }] }),
  component: TutorPanelRoute,
});

function TutorPanelRoute() {
  const { userId, roles, isLoading } = useUserRoles();
  const primaryTutor = roles.includes("tyutor") && !roles.some((role) => role === "admin" || role === "dekan" || role === "muellim");

  if (isLoading || !userId) {
    return <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-border/70 bg-card shadow-sm"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (!primaryTutor) return null;
  return <TutorOperationsPanel userId={userId} />;
}