import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, ScrollText, Settings, Library, Users, Megaphone, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRoles } from "@/hooks/use-user-role";
import { useAdminI18n } from "@/lib/admin-i18n";

type AdminTab = { to: string; key: string; icon: LucideIcon; yalnızAdmin?: boolean };

const tablar: AdminTab[] = [
  { to: "/admin", key: "adminNav", icon: BarChart3 },
  { to: "/admin/istifadeciler", key: "users", icon: Users },
  { to: "/admin/dersler", key: "courses", icon: BookOpen },
  { to: "/admin/loqlar", key: "logs", icon: ScrollText },
  { to: "/admin/kitabxana", key: "libraryManagement", icon: Library },
  { to: "/admin/elanlar", key: "announcements", icon: Megaphone },
  { to: "/admin/tenzimlemeler", key: "settings", icon: Settings, yalnızAdmin: true },
];

export function AdminNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { roles } = useUserRoles();
  const { t } = useAdminI18n();
  const görünənTablar = tablar.filter((tab) => !tab.yalnızAdmin || roles.includes("admin"));
  const aktivTab = görünənTablar.find((tab) => tab.to === pathname) ?? görünənTablar[0];
  if (!aktivTab) return null;

  return (
    <nav className="admin-nav relative z-0 rounded-3xl bg-card p-2 shadow-sm">
      <div className="admin-nav-desktop hidden gap-1 overflow-x-auto sm:flex">
        {görünənTablar.map((tab, index) => {
          const aktiv = tab.to === pathname;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              data-admin-tab-index={index}
              data-active={aktiv ? "true" : "false"}
              className={`admin-nav-link flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${aktiv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <span className="admin-nav-icon inline-flex items-center justify-center"><tab.icon className="size-4" /></span>
              <span>{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
      <div className="admin-nav-mobile sm:hidden">
        <Select value={aktivTab.to} onValueChange={(deyer) => { void navigate({ to: deyer as never }); }}>
          <SelectTrigger className="w-full rounded-2xl">
            <SelectValue><span className="flex items-center gap-2"><aktivTab.icon className="size-4" />{t(aktivTab.key)}</span></SelectValue>
          </SelectTrigger>
          <SelectContent>
            {görünənTablar.map((tab) => <SelectItem key={tab.to} value={tab.to}><span className="flex items-center gap-2"><tab.icon className="size-4" />{t(tab.key)}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
