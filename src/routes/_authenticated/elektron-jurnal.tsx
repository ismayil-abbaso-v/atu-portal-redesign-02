import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpenCheck } from "lucide-react";

import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { StudentJournalView } from "@/components/electronic-journal/StudentJournalView";
import "@/components/electronic-journal/student-daily-lessons-table.css";
import { EmptyState } from "@/components/layout/EmptyState";
import { TutorJournalMonitor } from "@/components/tutor/TutorJournalMonitor";
import { useUserRoles } from "@/hooks/use-user-role";
import { useJournalI18n } from "@/lib/electronic-journal-i18n";
import { canMonitorJournal } from "@/lib/route-permissions";
import { useTutorJournalI18n } from "@/lib/tutor-journal-i18n";

export const Route = createFileRoute("/_authenticated/elektron-jurnal")({
  beforeLoad: canMonitorJournal,
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }] }),
  component: ElektronJurnalSehifesi,
});

function JournalLoadingSkeleton() {
  const { t: jt } = useJournalI18n();
  return <div className="animate-page-enter space-y-3 sm:space-y-4" aria-label={jt("page.loading")}><div className="skeleton-shimmer h-28 rounded-2xl sm:h-32" /><div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-5"><div className="mb-3 flex items-center justify-between"><div className="skeleton-shimmer h-8 w-36 rounded-lg" /><div className="skeleton-shimmer h-8 w-24 rounded-lg" /></div><div className="grid grid-cols-3 gap-2 sm:gap-3"><div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" /><div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" /><div className="skeleton-shimmer h-24 rounded-2xl sm:h-32" /></div></div><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-4"><div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-5"><div className="skeleton-shimmer h-10 w-full rounded-xl" /><div className="skeleton-shimmer mt-4 hidden h-[330px] rounded-xl sm:block" /></div><div className="hidden space-y-3 xl:block"><div className="skeleton-shimmer h-48 rounded-2xl" /><div className="skeleton-shimmer h-44 rounded-2xl" /></div></div></div>;
}

function ElektronJurnalSehifesi() {
  const { roles = [], userId, isLoading } = useUserRoles();
  const { t: jt, locale } = useJournalI18n();
  const { t: tutorT } = useTutorJournalI18n();
  const tutorView = roles.includes("tyutor") && !roles.includes("muellim");

  useEffect(() => {
    const title = tutorView ? tutorT("meta.title") : jt("page.title");
    const description = tutorView ? tutorT("meta.description") : jt("page.description");
    document.title = `${title} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [jt, locale, tutorT, tutorView]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      {isLoading || !userId ? <JournalLoadingSkeleton /> : roles.includes("muellim") ? <TeacherDashboard userId={userId} /> : roles.includes("tyutor") ? <TutorJournalMonitor userId={userId} /> : roles.includes("telebe") ? <div className="student-journal-daily-table"><StudentJournalView userId={userId} /></div> : <div className="rounded-2xl bg-card p-6 shadow-sm"><EmptyState icon={BookOpenCheck} mesaj={jt("page.roleOnly")} /></div>}
    </div>
  );
}
