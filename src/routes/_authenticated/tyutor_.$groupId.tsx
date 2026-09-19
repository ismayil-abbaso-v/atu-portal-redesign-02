import { createFileRoute, redirect } from "@tanstack/react-router";

import { canAccessGroup } from "@/lib/route-permissions";

export const Route = createFileRoute("/_authenticated/tyutor_/$groupId")({
  beforeLoad: async ({ params }) => {
    await canAccessGroup(params.groupId);
    throw redirect({
      to: "/qruplar/$groupId",
      params: { groupId: params.groupId },
      replace: true,
    });
  },
  component: () => null,
});
