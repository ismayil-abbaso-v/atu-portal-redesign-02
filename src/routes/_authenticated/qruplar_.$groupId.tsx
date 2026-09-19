import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { TutorGroupOverview } from "@/components/tutor/TutorGroupOverview";
import { useUserRoles } from "@/hooks/use-user-role";
import { canAccessGroup } from "@/lib/route-permissions";
import { GroupDetailView } from "@/routes/_authenticated/admin/qruplar_.$groupId";
import "@/groups-header-premium.css";
import "@/groups-header-v2.css";
import "@/groups-header-wave-fix.css";

export const Route = createFileRoute("/_authenticated/qruplar_/$groupId")({
  beforeLoad: ({ params }) => canAccessGroup(params.groupId),
  component: QruplarGroupIdPage,
});

function QruplarGroupIdPage() {
  const { groupId } = Route.useParams();
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
    return <TutorGroupOverview groupId={groupId} userId={userId} />;
  }

  return <GroupDetailView groupId={groupId} />;
}
