import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, BookPlus, ChevronRight, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GroupCourseDialog } from "@/components/admin/group/GroupCourseDialog";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { muellimAdıFormatla } from "@/lib/courses";
import { useGroupsI18n } from "@/lib/groups-i18n";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import "@/role-dashboard.css";

type PeriodSettings = Pick<Database["public"]["Tables"]["system_settings"]["Row"], "cari_tedris_ili" | "cari_semestr">;
type StudentProfile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "ad" | "soyad" | "avatar_url">;
type CourseLite = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "ad" | "kod" | "kurs">;

function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (["payız", "payiz", "fall", "autumn", "1", "i"].includes(normalized)) return 1;
  if (["yaz", "spring", "2", "ii"].includes(normalized)) return 2;
  return null;
}

export function TutorGroupOverview({ groupId, userId }: { groupId: string; userId: string }) {
  const navigate = useNavigate();
  const { locale, t } = useGroupsI18n();
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);

  const groupQuery = useQuery({
    queryKey: ["tutor-group-overview", userId, groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, ad, faculty_id")
        .eq("id", groupId)
        .eq("tyutor_id", userId)
        .eq("arxivlenib", false)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (groupQuery.data?.ad) document.title = `${groupQuery.data.ad} — ${t("meta.title")} — ATU Portal`;
  }, [groupQuery.data?.ad, locale, t]);

  const periodQuery = useQuery<PeriodSettings | null>({
    queryKey: ["tutor-current-period"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("cari_tedris_ili, cari_semestr")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as PeriodSettings | null;
    },
  });
  const semester = semesterNumber(periodQuery.data?.cari_semestr);

  const membersQuery = useQuery({
    queryKey: ["tutor-group-members", userId, groupId],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select("id, user_id")
        .eq("group_id", groupId);
      if (error) throw error;
      if (!memberships?.length) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, avatar_url")
        .in("user_id", memberships.map((row) => row.user_id));
      if (profileError) throw profileError;

      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile as StudentProfile]));
      return memberships
        .map((row) => ({
          membershipId: row.id,
          profile: profileMap.get(row.user_id) ?? ({ user_id: row.user_id, ad: null, soyad: null, avatar_url: null } as StudentProfile),
        }))
        .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profile, b.profile));
    },
  });

  const coursesQuery = useQuery<CourseLite[]>({
    queryKey: ["tutor-group-courses", userId, groupId, periodQuery.data?.cari_tedris_ili ?? "", semester ?? ""],
    enabled: Boolean(periodQuery.data?.cari_tedris_ili) && semester != null,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("course_groups")
        .select("course_id")
        .eq("group_id", groupId)
        .eq("tedris_ili", periodQuery.data!.cari_tedris_ili!)
        .eq("semestr", semester!);
      if (error) throw error;
      const courseIds = [...new Set((links ?? []).map((row) => row.course_id))];
      if (!courseIds.length) return [];

      const { data, error: courseError } = await supabase
        .from("courses")
        .select("id, ad, kod, kurs")
        .in("id", courseIds)
        .order("kurs", { ascending: true })
        .order("ad", { ascending: true });
      if (courseError) throw courseError;
      return (data ?? []) as CourseLite[];
    },
  });

  const courses = coursesQuery.data ?? [];
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);
  const groupedCourses = useMemo(() => {
    const groups = new Map<number | null, CourseLite[]>();
    for (const course of courses) {
      const key = course.kurs && [1, 2, 3, 4].includes(course.kurs) ? course.kurs : null;
      groups.set(key, [...(groups.get(key) ?? []), course]);
    }
    return [...groups.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99));
  }, [courses]);

  if (groupQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!groupQuery.data) return <EmptyState icon={Users2} mesaj={t("detail.denied")} />;

  const periodLabel = periodQuery.data?.cari_tedris_ili
    ? t("detail.period", { year: periodQuery.data.cari_tedris_ili, semester: periodQuery.data.cari_semestr ?? "—" })
    : t("list.periodUnknown");

  return (
    <div className="role-panel-enter space-y-4 pb-7">
      <PageHeader baslıq={groupQuery.data.ad} geri>
        <Button className="min-h-11 gap-2 rounded-xl" onClick={() => setCourseDialogOpen(true)}>
          <BookPlus className="size-4" />
          {t("detail.addCourse")}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="rounded-full px-3 py-1.5">{periodLabel}</Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1.5">{t("list.students", { count: membersQuery.data?.length ?? 0 })}</Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1.5">{t("list.courses", { count: courses.length })}</Badge>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="mb-5 border-b border-border/70 pb-4">
            <h2 className="text-lg font-semibold text-foreground">{t("detail.currentCourses")}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">{t("detail.currentCoursesHint")}</p>
          </div>

          {coursesQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)}</div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-14 text-center">
              <BookOpen className="mx-auto size-9 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-semibold">{t("detail.noCourses")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedCourses.map(([year, yearCourses]) => (
                <div key={year ?? "other"}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {year ? t("detail.courseYear", { year }) : t("detail.otherCourses")}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground">{yearCourses.length}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {yearCourses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        aria-label={course.ad}
                        onClick={() => void navigate({ to: "/fennler/$courseId", params: { courseId: course.id } })}
                        className="role-panel-card group flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background p-3 text-left active:scale-[0.99]"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-2 text-sm font-semibold text-foreground">{course.ad}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">{course.kod || t("detail.courseMeta")}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="min-w-0 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">{t("detail.students")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("detail.readOnly")}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{membersQuery.data?.length ?? 0}</span>
          </div>

          {membersQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
          ) : !membersQuery.data?.length ? (
            <EmptyState icon={Users2} mesaj={t("detail.noStudents")} />
          ) : (
            <div className="space-y-1 lg:max-h-[650px] lg:overflow-y-auto lg:pr-1">
              {membersQuery.data.map(({ membershipId, profile }) => {
                const name = muellimAdıFormatla(profile);
                return (
                  <div key={membershipId} className="flex min-h-12 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/50">
                    <Avatar className="size-9 shrink-0">
                      {profile.avatar_url ? <SignedAvatarImage src={profile.avatar_url} alt={name} /> : null}
                      <AvatarFallback className="text-[11px]">{(profile.soyad?.[0] ?? profile.ad?.[0] ?? "?").toLocaleUpperCase("az-AZ")}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">{name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <GroupCourseDialog
        açıq={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        groupId={groupId}
        mövcudFennIdler={courseIds}
        tutorMode
      />
    </div>
  );
}
