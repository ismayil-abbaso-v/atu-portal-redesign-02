import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardFilters } from "@/components/admin/dashboard/DashboardFilters";
import { presetEtiketleri, presetToRange, type Qranulyarlik, type TarixAraligi, type TarixAraligiPreset } from "@/components/admin/dashboard/dashboard-range";
import { RecentActivityCard } from "@/components/admin/dashboard/RecentActivityCard";
import { RegistrationTrendChart } from "@/components/admin/dashboard/RegistrationTrendChart";
import { RoleDistributionChart } from "@/components/admin/dashboard/RoleDistributionChart";
import { StatCards } from "@/components/admin/dashboard/StatCards";
import { TodaySessionsCard } from "@/components/admin/dashboard/TodaySessionsCard";
import { TopActiveUsersCard } from "@/components/admin/dashboard/TopActiveUsersCard";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "İdarəetmə Paneli — ATU Şəxsi Kabinet" }, { name: "description", content: "Admin panelinin ümumi göstəriciləri." }, { property: "og:title", content: "İdarəetmə Paneli — ATU Şəxsi Kabinet" }, { property: "og:description", content: "Admin panelinin ümumi göstəriciləri." }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [preset, setPreset] = useState<TarixAraligiPreset>("bu-ay");
  const [serbestAraligi, setSerbestAraligi] = useState<TarixAraligi | undefined>(undefined);
  const [fakulte, setFakulte] = useState<string | null>(null);
  const [qranulyarlıq, setQranulyarlıq] = useState<Qranulyarlik>("week");
  const araliq = useMemo(() => presetToRange(preset, serbestAraligi), [preset, serbestAraligi]);
  const dovrEtiketi = presetEtiketleri.find((p) => p.deyer === preset)?.etiket ?? "Bu ay";
  const fakulteEtiketi = fakulte ?? "Bütün fakültələr";

  return (
    <div className="admin-dashboard-page flex min-w-0 flex-1 flex-col">
      <PageHeader baslıq="İdarəetmə Paneli" />
      <div className="admin-dashboard-body flex flex-1 flex-col gap-4">
        <DashboardFilters preset={preset} onPresetChange={setPreset} serbestAraligi={serbestAraligi} onSerbestAraligiChange={setSerbestAraligi} fakulte={fakulte} onFakulteChange={setFakulte} onQranulyarliqDefaultChange={setQranulyarlıq} />
        <StatCards araliq={araliq} fakulte={fakulte} />
        <div className="admin-dashboard-analytics flex flex-col gap-4 lg:flex-row">
          <RegistrationTrendChart araliq={araliq} fakulte={fakulte} qranulyarlıq={qranulyarlıq} onQranulyarliqChange={setQranulyarlıq} dovrEtiketi={dovrEtiketi} />
          <RoleDistributionChart fakulte={fakulte} fakulteEtiketi={fakulteEtiketi} />
        </div>
        <div className="admin-dashboard-activity grid gap-4 lg:grid-cols-3">
          <TopActiveUsersCard dovrEtiketi={dovrEtiketi} araliq={araliq} />
          <TodaySessionsCard />
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
