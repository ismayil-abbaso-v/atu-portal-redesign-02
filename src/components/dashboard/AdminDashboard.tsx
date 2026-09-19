import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UserPlus, BookMarked, Bell, CalendarClock, Loader2, ArrowUpRight, ShieldCheck, Landmark, UserCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAdminI18n } from "@/lib/admin-i18n";

export function AdminDashboard() {
  const { t } = useAdminI18n();
  const { data: rolesData = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["admin-role-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return data;
    },
  });
  const { data: recentRegsCount = 0, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["admin-recent-registrations"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { error, count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rolSaylari = rolesData.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.role] = (acc[curr.role] || 0) + 1;
    return acc;
  }, {});

  const rolMeta: Record<string, { etiket: string; icon: typeof ShieldCheck; renk: keyof typeof chipRenkler }> = {
    admin: { etiket: t("admin"), icon: ShieldCheck, renk: "maroon" },
    dekan: { etiket: t("dean"), icon: Landmark, renk: "gold" },
    muellim: { etiket: t("teacher"), icon: BookMarked, renk: "green" },
    tyutor: { etiket: t("tutor"), icon: UserCheck, renk: "amber" },
    telebe: { etiket: t("student"), icon: GraduationCap, renk: "primary" },
  };

  if (isLoadingRoles || isLoadingRecent) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader baslıq={t("dashboard")} />
      <div>
        <div className="mb-3 flex items-baseline justify-between px-0.5"><h2 className="font-display text-xl font-semibold text-foreground">{t("distribution")}</h2></div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">{Object.entries(rolMeta).map(([rolKey, meta]) => <StatChip key={rolKey} icon={meta.icon} renk={meta.renk} value={rolSaylari[rolKey] || 0} label={meta.etiket} />)}</div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t("quickOperations")}</p><h2 className="mt-1 font-display text-xl font-semibold text-foreground">{t("management")}</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <KeçidKart to="/admin" icon={UserPlus} baslıq={t("addUser")} aciqlama={t("addUserDescription")} />
            <KeçidKart to="/kitabxana" icon={BookMarked} baslıq={t("library")} aciqlama={t("libraryDescription")} />
            <KeçidKart to="/bildirisler" icon={Bell} baslıq={t("notifications")} aciqlama={t("notificationsDescription")} />
          </div>
        </section>
        <aside className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarClock className="size-6" /></div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">{t("last7Days")}</p>
          <p className="mt-1 font-data text-5xl font-semibold tracking-[-0.06em] text-foreground">{recentRegsCount}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("recentUsers")}</p>
        </aside>
      </div>
    </div>
  );
}

const chipRenkler = {
  maroon: { bg: "bg-accent", text: "text-primary" },
  gold: { bg: "bg-[var(--portal-gold-soft)]", text: "text-[var(--portal-gold)]" },
  green: { bg: "bg-[var(--color-success)]/15", text: "text-[var(--color-success)]" },
  amber: { bg: "bg-[var(--color-warning)]/15", text: "text-[var(--color-warning)]" },
  primary: { bg: "bg-primary/10", text: "text-primary" },
} as const;

function StatChip({ icon: Icon, renk, value, label }: { icon: typeof ShieldCheck; renk: keyof typeof chipRenkler; value: number | null; label: string }) {
  const { bg, text } = chipRenkler[renk];
  return <div className="flex items-center gap-3.5 rounded-3xl border border-border bg-card p-4"><div className={`flex size-[38px] flex-none items-center justify-center rounded-[11px] ${bg} ${text}`}><Icon className="size-[17px]" /></div><div><b className="block font-data text-xl font-semibold leading-none text-foreground">{value === null ? "—" : value}</b><span className="mt-1 block text-[11.5px] text-muted-foreground">{label}</span></div></div>;
}

function KeçidKart({ to, icon: Icon, baslıq, aciqlama }: { to: string; icon: typeof UserPlus; baslıq: string; aciqlama: string }) {
  return <Link to={to} className="group relative min-h-44 rounded-3xl border border-border bg-background p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"><div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span><ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-6"><h3 className="font-display font-semibold text-foreground">{baslıq}</h3><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{aciqlama}</p></div></Link>;
}
