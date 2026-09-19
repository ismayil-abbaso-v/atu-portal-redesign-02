import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import {
  TeacherColloquiumAssessmentPanel,
  TeacherWorkAssessmentPanel,
} from "@/components/teacher/TeacherAssessmentPanels";
import { TeacherDailyJournalPanel } from "@/components/teacher/TeacherDailyJournalPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRoleDashboardI18n } from "@/lib/role-dashboard-i18n";
import { useTeacherJournalI18n } from "@/lib/teacher-journal-i18n";
import { cn } from "@/lib/utils";
import "@/role-dashboard.css";

type CourseInfo = {
  id: string;
  ad: string;
  kod: string | null;
  kurs: number | null;
  kredit: number | null;
  otaq: string | null;
  otaqlar: unknown;
  qiymetlendirme_novu: "laboratoriya" | "meshgele" | null;
  kurs_isi_var: boolean;
};

type TeacherLink = {
  course_id: string;
  muellim_id: string;
  icazeler: Record<string, boolean> | null;
};

type PermissionKey = "muhazire" | "seminar" | "laboratoriya" | "tecrube" | "serbest_is" | "kollokvium";

const permissionOrder: PermissionKey[] = ["muhazire", "seminar", "laboratoriya", "tecrube", "serbest_is", "kollokvium"];

function courseRoomLabel(course: CourseInfo) {
  const values = new Set<string>();
  if (course.otaq?.trim()) values.add(course.otaq.trim());
  const rooms = course.otaqlar;
  if (Array.isArray(rooms)) {
    rooms.forEach((value) => {
      if (typeof value === "string" && value.trim()) values.add(value.trim());
    });
  } else if (rooms && typeof rooms === "object") {
    Object.values(rooms as Record<string, unknown>).forEach((value) => {
      if (typeof value === "string" && value.trim()) values.add(value.trim());
    });
  }
  return [...values].join(" · ") || "—";
}

export function TeacherCourseWorkspace({
  userId,
  groupId,
  courseId,
  initialSessionId,
}: {
  userId: string;
  groupId: string;
  courseId: string;
  initialSessionId?: string;
}) {
  const navigate = useNavigate();
  const { locale, t } = useRoleDashboardI18n();
  const { t: journalT } = useTeacherJournalI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-course-workspace-context", userId, groupId, courseId],
    queryFn: async () => {
      const [courseResult, groupResult, teacherResult, membershipResult] = await Promise.all([
        supabase.from("courses").select("id, ad, kod, kurs, kredit, otaq, otaqlar, qiymetlendirme_novu, kurs_isi_var").eq("id", courseId).single(),
        supabase.from("groups").select("id, ad").eq("id", groupId).single(),
        supabase.from("course_teachers").select("course_id, muellim_id, icazeler").eq("course_id", courseId).eq("muellim_id", userId).maybeSingle(),
        supabase.from("course_groups").select("course_id, group_id").eq("course_id", courseId).eq("group_id", groupId).limit(1).maybeSingle(),
      ]);
      if (courseResult.error) throw courseResult.error;
      if (groupResult.error) throw groupResult.error;
      if (teacherResult.error) throw teacherResult.error;
      if (membershipResult.error) throw membershipResult.error;
      if (!teacherResult.data || !membershipResult.data) throw new Error(t("teacher.workspaceDeniedDescription"));
      return {
        course: courseResult.data as CourseInfo,
        group: groupResult.data as { id: string; ad: string },
        teacherLink: teacherResult.data as unknown as TeacherLink,
      };
    },
  });

  useEffect(() => {
    if (!data?.course.ad) return;
    const title = `${data.course.ad} — ${t("teacher.homeTitle")}`;
    const description = t("teacher.workspaceDescription");
    document.title = title;

    let descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = description;

    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;

    let ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      document.head.appendChild(ogDescription);
    }
    ogDescription.content = description;
  }, [data?.course.ad, locale, t]);

  if (isLoading) return <PanelLoader label={t("common.loading")} />;

  if (isError || !data) {
    return (
      <section className="role-panel-enter rounded-[28px] border border-destructive/20 bg-card px-6 py-14 text-center shadow-sm" role="alert">
        <ShieldCheck className="mx-auto size-11 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">{t("teacher.workspaceDeniedTitle")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("teacher.workspaceDeniedDescription")}</p>
        <Button className="mt-5 min-h-11 rounded-xl" variant="outline" onClick={() => void navigate({ to: "/ev" })}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> {t("teacher.backCabinet")}
        </Button>
      </section>
    );
  }

  const permissions = data.teacherLink.icazeler ?? {};
  const activePermissions = permissionOrder.filter((key) => permissions[key] === true);
  const dailyPermission = activePermissions.some((key) => ["muhazire", "seminar", "laboratoriya", "tecrube"].includes(key));
  const courseworkPermission = activePermissions.length > 0;
  const roomLabel = courseRoomLabel(data.course);
  const permissionLabel = (key: PermissionKey) => {
    if (key === "muhazire") return journalT("lecture");
    if (key === "seminar") return journalT("seminar");
    if (key === "laboratoriya") return journalT("laboratory");
    if (key === "tecrube") return journalT("practice");
    if (key === "serbest_is") return journalT("independent");
    return journalT("colloquium");
  };

  return (
    <div className="role-panel-enter min-w-0 space-y-4 overflow-x-clip pb-8">
      <section className="relative overflow-hidden rounded-[30px] border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="role-panel-orbit pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border border-primary/10" aria-hidden="true" />
        <div className="relative">
          <button
            type="button"
            onClick={() => void navigate({ to: "/ev" })}
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("teacher.backCabinet")}
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3 py-1">{data.group.ad}</Badge>
                {data.course.kod ? <Badge variant="outline" className="rounded-full px-3 py-1">{data.course.kod}</Badge> : null}
                {data.course.kurs ? <Badge variant="outline" className="rounded-full px-3 py-1">{data.course.kurs}</Badge> : null}
              </div>
              <h1 className="mt-3 break-words font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{data.course.ad}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("teacher.workspaceDescription")}</p>
            </div>

            <div className="grid w-full min-w-0 grid-cols-2 gap-2 lg:w-[330px]">
              <InfoMetric label={t("common.credit")} value={data.course.kredit ?? "—"} />
              <InfoMetric label={t("common.room")} value={roomLabel} />
            </div>
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("common.type")}</div>
            <div className="flex flex-wrap gap-2">
              {activePermissions.length > 0 ? activePermissions.map((key) => (
                <Badge key={key} variant="secondary" className="rounded-full px-3 py-1.5 text-xs font-bold">
                  {permissionLabel(key)}
                </Badge>
              )) : <Badge variant="outline" className="rounded-full px-3 py-1.5 text-xs">{journalT("readOnly")}</Badge>}
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="daily" className="teacher-workspace-tabs w-full min-w-0">
        <TabsList className={cn(
          "grid h-auto w-full min-w-0 gap-1 rounded-2xl bg-muted p-1",
          data.course.kurs_isi_var ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}>
          <TabsTrigger value="daily" className="min-h-11 min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold sm:text-sm">
            {!dailyPermission ? <LockKeyhole className="mr-1.5 size-3.5 shrink-0" aria-hidden="true" /> : null}<span className="truncate">{t("teacher.dailyTab")}</span>
          </TabsTrigger>
          <TabsTrigger value="independent" className="min-h-11 min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold sm:text-sm">
            {permissions.serbest_is !== true ? <LockKeyhole className="mr-1.5 size-3.5 shrink-0" aria-hidden="true" /> : null}<span className="truncate">{t("teacher.independentTab")}</span>
          </TabsTrigger>
          <TabsTrigger value="colloquium" className="min-h-11 min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold sm:text-sm">
            {permissions.kollokvium !== true ? <LockKeyhole className="mr-1.5 size-3.5 shrink-0" aria-hidden="true" /> : null}<span className="truncate">{t("teacher.colloquiumTab")}</span>
          </TabsTrigger>
          {data.course.kurs_isi_var ? (
            <TabsTrigger value="coursework" className="min-h-11 min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold sm:text-sm">
              {!courseworkPermission ? <LockKeyhole className="mr-1.5 size-3.5 shrink-0" aria-hidden="true" /> : null}<span className="truncate">{t("teacher.courseworkTab")}</span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="daily" className="mt-4 min-w-0 focus-visible:outline-none">
          <TeacherDailyJournalPanel userId={userId} groupId={groupId} course={data.course} permissions={permissions} {...(initialSessionId ? { initialSessionId } : {})} />
        </TabsContent>
        <TabsContent value="independent" className="mt-4 min-w-0 focus-visible:outline-none">
          <TeacherWorkAssessmentPanel userId={userId} groupId={groupId} courseId={courseId} kind="independent" permissions={permissions} />
        </TabsContent>
        <TabsContent value="colloquium" className="mt-4 min-w-0 focus-visible:outline-none">
          <TeacherColloquiumAssessmentPanel userId={userId} groupId={groupId} courseId={courseId} permissions={permissions} />
        </TabsContent>
        {data.course.kurs_isi_var ? (
          <TabsContent value="coursework" className="mt-4 min-w-0 focus-visible:outline-none">
            <TeacherWorkAssessmentPanel userId={userId} groupId={groupId} courseId={courseId} kind="coursework" permissions={permissions} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-background/80 px-3 py-3 text-center">
      <div className="break-words text-sm font-black leading-5 text-foreground sm:text-base">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
    </div>
  );
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="role-panel-enter flex min-h-[300px] items-center justify-center rounded-[28px] border border-border/60 bg-card shadow-sm" role="status" aria-label={label}>
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}
