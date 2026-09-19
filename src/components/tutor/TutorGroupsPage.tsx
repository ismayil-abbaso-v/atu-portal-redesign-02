import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpenCheck, CalendarDays, ChevronRight, RefreshCw, Search, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useGroupsI18n } from "@/lib/groups-i18n";
import "@/role-dashboard.css";

type GroupLite = Pick<Database["public"]["Tables"]["groups"]["Row"], "id" | "ad">;
type MemberLite = Pick<Database["public"]["Tables"]["group_members"]["Row"], "group_id" | "user_id">;
type CourseGroupLite = Pick<Database["public"]["Tables"]["course_groups"]["Row"], "group_id" | "course_id">;
type PeriodSettings = Pick<Database["public"]["Tables"]["system_settings"]["Row"], "cari_tedris_ili" | "cari_semestr">;

function semesterNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("az");
  if (["payız", "payiz", "fall", "autumn", "1", "i"].includes(normalized)) return 1;
  if (["yaz", "spring", "2", "ii"].includes(normalized)) return 2;
  return null;
}

export function TutorGroupsPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { locale, t } = useGroupsI18n();
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = `${t("meta.title")} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = t("meta.description");
  }, [locale, t]);

  const periodQuery = useQuery<PeriodSettings | null>({
    queryKey: ["tutor-groups-period"],
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

  const groupsQuery = useQuery<GroupLite[]>({
    queryKey: ["tutor-groups-list", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, ad")
        .eq("tyutor_id", userId)
        .eq("arxivlenib", false)
        .order("ad");
      if (error) throw error;
      return (data ?? []) as GroupLite[];
    },
  });

  const groups = groupsQuery.data ?? [];
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  const membersQuery = useQuery<MemberLite[]>({
    queryKey: ["tutor-groups-members", userId, groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);
      if (error) throw error;
      return (data ?? []) as MemberLite[];
    },
  });

  const courseGroupsQuery = useQuery<CourseGroupLite[]>({
    queryKey: [
      "tutor-groups-course-links",
      userId,
      groupIds.join(","),
      periodQuery.data?.cari_tedris_ili ?? "",
      semester ?? "",
    ],
    enabled: groupIds.length > 0 && Boolean(periodQuery.data?.cari_tedris_ili) && semester != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("group_id, course_id")
        .in("group_id", groupIds)
        .eq("tedris_ili", periodQuery.data!.cari_tedris_ili!)
        .eq("semestr", semester!);
      if (error) throw error;
      return (data ?? []) as CourseGroupLite[];
    },
  });

  const cards = useMemo(() => {
    const members = membersQuery.data ?? [];
    const links = courseGroupsQuery.data ?? [];
    return groups.map((group) => ({
      ...group,
      studentCount: new Set(members.filter((row) => row.group_id === group.id).map((row) => row.user_id)).size,
      courseCount: new Set(links.filter((row) => row.group_id === group.id).map((row) => row.course_id)).size,
    }));
  }, [courseGroupsQuery.data, groups, membersQuery.data]);

  const visibleCards = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale === "az" ? "az-AZ" : undefined);
    if (!query) return cards;
    return cards.filter((group) => group.ad.toLocaleLowerCase(locale === "az" ? "az-AZ" : undefined).includes(query));
  }, [cards, locale, search]);

  const periodLabel = periodQuery.data?.cari_tedris_ili
    ? t("list.period", {
        year: periodQuery.data.cari_tedris_ili,
        semester: periodQuery.data.cari_semestr ?? "—",
      })
    : t("list.periodUnknown");

  const loading = groupsQuery.isLoading || periodQuery.isLoading || membersQuery.isLoading || courseGroupsQuery.isLoading;
  const error = groupsQuery.isError || periodQuery.isError || membersQuery.isError || courseGroupsQuery.isError;

  const retry = () => {
    void groupsQuery.refetch();
    void periodQuery.refetch();
    if (groupIds.length) void membersQuery.refetch();
    if (groupIds.length && semester != null && periodQuery.data?.cari_tedris_ili) void courseGroupsQuery.refetch();
  };

  if (loading) return <TutorGroupsSkeleton />;

  return (
    <div className="role-panel-enter space-y-4 pb-7">
      <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.045] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
              <Users2 className="size-3.5" />
              {periodLabel}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("list.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("list.description")}</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1.5 text-xs">
            {t("list.groupCount", { count: groups.length })}
          </Badge>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("list.search")}
              className="min-h-11 rounded-xl pl-9"
            />
          </div>
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1.5 text-xs font-semibold">
            {periodLabel}
          </Badge>
        </div>

        {error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center">
            <RefreshCw className="size-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold text-foreground">{t("list.errorTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("list.errorDescription")}</p>
            <Button variant="outline" className="mt-4 min-h-11 rounded-xl" onClick={retry}>
              <RefreshCw className="size-4" /> {t("list.retry")}
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <EmptyGroups title={t("list.emptyTitle")} description={t("list.emptyDescription")} />
        ) : visibleCards.length === 0 ? (
          <EmptyGroups title={t("list.noSearchTitle")} description={t("list.noSearchDescription")} />
        ) : (
          <div className="role-panel-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleCards.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-label={t("list.open", { group: group.ad })}
                onClick={() => void navigate({ to: "/qruplar/$groupId", params: { groupId: group.id } })}
                className="role-panel-card group relative min-h-[168px] overflow-hidden rounded-2xl border border-border/80 bg-background p-4 text-left active:scale-[0.99] sm:p-5"
              >
                <div className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <CalendarDays className="size-4" />
                </div>
                <div className="pr-12">
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {periodLabel}
                  </span>
                  <h2 className="mt-3 line-clamp-2 font-display text-xl font-bold tracking-tight text-foreground">{group.ad}</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                    <Users2 className="size-3.5 text-primary" /> {t("list.students", { count: group.studentCount })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                    <BookOpenCheck className="size-3.5 text-primary" /> {t("list.courses", { count: group.courseCount })}
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  {t("list.open", { group: group.ad })}
                  <ChevronRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyGroups({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 text-center">
      <Users2 className="size-9 text-muted-foreground/65" />
      <h2 className="mt-3 font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function TutorGroupsSkeleton() {
  return (
    <div className="space-y-4 pb-7">
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="rounded-[28px] border border-border bg-card p-4 sm:p-5 lg:p-6">
        <Skeleton className="mb-4 h-11 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-[168px] rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}
