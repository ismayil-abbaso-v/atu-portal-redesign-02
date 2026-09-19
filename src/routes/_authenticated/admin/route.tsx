import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AdminNav } from "@/components/admin/AdminNav";
import { supabase } from "@/integrations/supabase/client";
import "@/admin-premium-v2.css";
import "@/admin-header-unified.css";
import "@/admin-header-compact.css";
import "@/admin-nav-border-fix.css";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw redirect({ to: "/ev" });

    const { data: roleRows, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;

    const roller = (roleRows ?? []).map((r) => r.role);

    // /admin yalnız həqiqi admin hesabları üçündür. Dekan öz səlahiyyətlərini
    // ayrıca rol-təhlükəsiz səhifələrdən idarə edir.
    if (!roller.includes("admin")) {
      if (roller.includes("dekan")) {
        // Qrup səhifəsindəki köhnə fənn kartı /admin/dersler/:id ünvanına
        // yönlənsə belə dekanı admin layout-a buraxmırıq. Mümkündürsə həmin
        // fənnin aid olduğu icazəli qrupa geri qaytarırıq ki, istifadəçi qrup
        // kontekstini də itirməsin.
        const dersMatch = location.pathname.match(/^\/admin\/dersler\/([^/]+)\/?$/);
        if (dersMatch?.[1]) {
          const courseId = decodeURIComponent(dersMatch[1]);
          const { data: qrupElaqesi } = await supabase
            .from("course_groups")
            .select("group_id")
            .eq("course_id", courseId)
            .limit(1)
            .maybeSingle();

          if (qrupElaqesi?.group_id) {
            throw redirect({
              to: "/qruplar/$groupId",
              params: { groupId: qrupElaqesi.group_id },
              replace: true,
            });
          }
        }

        throw redirect({ to: "/qruplar", replace: true });
      }
      throw redirect({ to: "/ev", replace: true });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="admin-app-layout admin-premium-v2 relative z-0 flex min-w-0 max-w-full flex-1 flex-col">
      <AdminNav />
      <div className="admin-content mt-4 flex min-w-0 max-w-full flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
