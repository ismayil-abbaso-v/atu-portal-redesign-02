import { useQuery } from "@tanstack/react-query";
import { Users, CalendarCheck2, Award, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDeanI18n } from "@/lib/dean-i18n";

export function DeanDashboard({ userId }: { userId: string }) {
  const { t } = useDeanI18n();
  const { data: profile, isLoading: isLoadingProfile } = useQuery({ queryKey: ["dean-profile", userId], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("fakulte").eq("user_id", userId).maybeSingle(); if (error) throw error; return data; } });
  const fakulte = profile?.fakulte || "";
  const { data: facultyStats, isLoading: isLoadingStats } = useQuery({ queryKey: ["dean-faculty-stats", fakulte], queryFn: async () => { if (!fakulte) return null; const { data, error } = await supabase.from("faculty_stats").select("*").eq("fakulte", fakulte).maybeSingle(); if (error) throw error; return data; }, enabled: !!fakulte });
  const { data: groupStats = [], isLoading: isLoadingGroups } = useQuery({ queryKey: ["dean-group-stats", fakulte], queryFn: async () => { if (!fakulte) return []; const { data, error } = await supabase.from("group_stats").select("*").eq("fakulte", fakulte).order("avg_score", { ascending: false }); if (error) throw error; return data; }, enabled: !!fakulte });
  if (isLoadingProfile || isLoadingStats || isLoadingGroups) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  return <div className="space-y-4 pb-6">
    <PageHeader baslıq={`${t("cabinet")}${fakulte ? ` — ${fakulte}` : ""}`} />
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <StatChip icon={Users} renk="maroon" value={facultyStats?.total_students ?? 0} label={t("totalStudents")} />
      <StatChip icon={CalendarCheck2} renk="gold" value={facultyStats?.avg_attendance ?? 0} suffix="%" label={t("attendance")} />
      <StatChip icon={Award} renk="green" value={facultyStats?.avg_score ?? 0} label={t("averageFinal")} />
    </div>
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between"><div className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">{t("ranking")}</h2></div></div>
      {groupStats.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("noGroups")}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr><th>{t("rank")}</th><th>{t("group")}</th><th>{t("tutor")}</th><th>{t("students")}</th><th>{t("avgAttendance")}</th><th>{t("avgFinal")}</th></tr></thead><tbody>{groupStats.map((item, idx) => <tr key={idx}><td className="font-bold text-muted-foreground">{idx + 1}</td><td className="font-semibold text-foreground">{item.qrup}</td><td className="text-foreground">{item.tyutor_ad_soyad || t("unassigned")}</td><td className="text-muted-foreground">{item.total_students}</td><td><span className="font-semibold text-foreground">{item.avg_attendance}%</span><div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${item.avg_attendance}%` }} /></div></td><td className="font-bold text-primary">{item.avg_score} / 100</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

const chipRenkler = { maroon: { bg: "bg-accent", text: "text-primary" }, gold: { bg: "bg-[var(--portal-gold-soft)]", text: "text-[var(--portal-gold)]" }, green: { bg: "bg-[var(--color-success)]/15", text: "text-[var(--color-success)]" } } as const;
function StatChip({ icon: Icon, renk, value, suffix, label }: { icon: typeof Users; renk: keyof typeof chipRenkler; value: number | null; suffix?: string; label: string }) { const { bg, text } = chipRenkler[renk]; return <div className="flex items-center gap-3.5 rounded-3xl border border-border bg-card p-4"><div className={`flex size-[38px] flex-none items-center justify-center rounded-[11px] ${bg} ${text}`}><Icon className="size-[17px]" /></div><div><b className="block font-data text-xl font-semibold leading-none text-foreground">{value === null ? "—" : `${value}${suffix ?? ""}`}</b><span className="mt-1 block text-[11.5px] text-muted-foreground">{label}</span></div></div>; }
