import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { TeacherCourseWorkspace } from "@/components/teacher/TeacherCourseWorkspace";
import { useUserRoles } from "@/hooks/use-user-role";
import { canAccessTeacherCourse } from "@/lib/route-permissions";

export const Route = createFileRoute("/_authenticated/muellim_/$groupId/$courseId")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search.session === "string" && search.session.trim() ? search.session.trim() : undefined,
  }),
  beforeLoad: async ({ params }) => {
    await canAccessTeacherCourse(params.courseId, params.groupId);
  },
  head: () => ({
    meta: [
      { title: "Müəllim paneli — ATU Portal" },
      { name: "description", content: "Qrup və fənn üzrə müəllim jurnal paneli." },
    ],
  }),
  component: TeacherCourseRoute,
});

function TeacherCourseRoute() {
  const { groupId, courseId } = Route.useParams();
  const { session } = Route.useSearch();
  const { userId, isLoading } = useUserRoles();

  if (isLoading || !userId) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-[28px] border border-border/60 bg-card shadow-sm">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return <TeacherCourseWorkspace userId={userId} groupId={groupId} courseId={courseId} {...(session ? { initialSessionId: session } : {})} />;
}
