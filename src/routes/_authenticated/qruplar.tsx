import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";

import { TutorGroupsPage } from "@/components/tutor/TutorGroupsPage";
import { useUserRoles } from "@/hooks/use-user-role";
import { canAccessGroups } from "@/lib/route-permissions";
import { Route as LegacyGroupsRoute } from "@/routes/_authenticated/admin/qruplar";
import "@/groups-header-premium.css";
import "@/groups-header-v2.css";
import "@/groups-header-wave-fix.css";

const LegacyGroupsPage = LegacyGroupsRoute.options.component as ComponentType;

export const Route = createFileRoute("/_authenticated/qruplar")({
  beforeLoad: canAccessGroups,
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }] }),
  component: QruplarPage,
});

function QruplarPage() {
  const { roles = [], userId, isLoading } = useUserRoles();
  const managerView = roles.includes("admin") || roles.includes("dekan");

  if (isLoading || !userId) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-border/70 bg-card shadow-sm">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!managerView && roles.includes("tyutor")) {
    return <TutorGroupsPage userId={userId} />;
  }

  return <LegacyGroupsPage />;
}