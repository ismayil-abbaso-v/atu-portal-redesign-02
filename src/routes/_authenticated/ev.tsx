import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLayoutEffect } from "react";
import { StudentAnnouncementsHome } from "@/components/announcements/StudentAnnouncementsHome";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { DeanDashboard } from "@/components/dashboard/DeanDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { StudentDashboardLocaleBridge } from "@/components/dashboard/StudentDashboardLocaleBridge";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { TutorDashboard } from "@/components/dashboard/TutorDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrimaryRole } from "@/hooks/use-user-role";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/ev")({
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }, { property: "og:title", content: "ATU Portal" }, { property: "og:description", content: "ATU Portal" }] }),
  component: EvSehifesi,
});

function restartDashboardTreeMask() {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  root.style.removeProperty("--dashboard-tree-mask");
  const baseMask = getComputedStyle(root).getPropertyValue("--dashboard-tree-mask").trim();
  if (!baseMask) return () => {};
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let freshMask = baseMask;
  if (baseMask.endsWith('\")')) freshMask = `${baseMask.slice(0, -2)}#atu-restart-${token}\")`;
  else if (baseMask.endsWith("')")) freshMask = `${baseMask.slice(0, -2)}#atu-restart-${token}')`;
  else if (baseMask.endsWith(")")) freshMask = `${baseMask.slice(0, -1)}#atu-restart-${token})`;
  root.style.setProperty("--dashboard-tree-mask", freshMask);
  return () => root.style.removeProperty("--dashboard-tree-mask");
}

function EvSehifesi() {
  const { t } = useI18n();
  const { primaryRole, isLoading, error, refetch, userId } = usePrimaryRole();
  useLayoutEffect(() => restartDashboardTreeMask(), []);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-10 w-48 rounded-xl" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div><div className="grid gap-6 md:grid-cols-[1fr_320px]"><Skeleton className="h-[400px] rounded-3xl" /><Skeleton className="h-[400px] rounded-3xl" /></div></div>;
  if (error || !userId) return <div className="my-10 flex flex-1 flex-col items-center justify-center rounded-3xl bg-card p-8 text-center shadow-sm"><AlertCircle className="mb-3 size-12 text-destructive" /><h3 className="text-lg font-bold text-foreground">{t("common.loadError", "Məlumat yüklənə bilmədi")}</h3><p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("common.loadErrorDescription", "Hesabınıza aid məlumatlar çəkilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")}</p><button onClick={() => refetch()} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90"><RefreshCw className="size-4" /> {t("common.tryAgain")}</button></div>;

  switch (primaryRole) {
    case "admin": return <AdminDashboard />;
    case "dekan": return <DeanDashboard userId={userId} />;
    case "muellim": return <TeacherDashboard userId={userId} />;
    case "tyutor": return <TutorDashboard userId={userId} />;
    case "telebe":
    default:
      return <StudentDashboardLocaleBridge><StudentDashboard userId={userId} /><StudentAnnouncementsHome userId={userId} /></StudentDashboardLocaleBridge>;
  }
}
