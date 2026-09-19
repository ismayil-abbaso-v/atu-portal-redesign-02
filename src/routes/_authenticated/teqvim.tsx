import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { BookOpen, CalendarCheck2, CalendarDays, CalendarRange, Clock3, Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CurrentWeekBadge } from "@/components/calendar/CurrentWeekBadge";
import { DayDetails, type EventWithDetails } from "@/components/calendar/DayDetails";
import { EventFormModal } from "@/components/calendar/EventFormModal";
import { FloatingAddButton } from "@/components/calendar/FloatingAddButton";
import { MonthYearNav } from "@/components/calendar/MonthYearNav";
import { ScheduleManagementView } from "@/components/calendar/ScheduleManagementView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCalendarManagementI18n } from "@/lib/calendar-management-i18n";
import { usePageI18n } from "@/lib/i18n-extra";
import calendarHero from "@/assets/calendar-hero.svg";
import "@/calendar-exams-redesign.css";
import {
  fetchTeacherLessonSessions,
  fetchTeacherSessionRoomMaps,
  resolveTeacherSessionRoom,
  type TeacherLessonSession,
} from "@/lib/teacher-sessions";

type EventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["calendar_events"]["Update"];
type ExamDetailedResultRow = Database["public"]["Tables"]["exam_detailed_results"]["Row"];
type LessonSessionRow = Database["public"]["Tables"]["course_lesson_sessions"]["Row"];

type ScopeData = {
  groupIds: string[];
  teacherCourseIds: string[];
};

const CALENDAR_UI = {
  az: {
    subtitle: "Akademik həyatınızı planlaşdırın.",
    description: "Dərslər, imtahanlar, tapşırıqlar və universitet tədbirləri — hamısı bir yerdə!",
    quote: "Nizamlı plan böyük nailiyyətlərə aparır.",
    all: "Hamısı", lessons: "Dərslər", exams: "İmtahanlar", events: "Tədbirlər",
    addEvent: "Tədbir əlavə et", examSession: "İmtahan sessiyası", academicCalendar: "Akademik təqvim", importantDates: "Vacib tarixlər",
    examSessionNote: "İmtahan planınızı və nəticələri izləyin.", academicCalendarNote: "Cari ayın dərs və tədbirlərinə baxın.",
    importantDatesNote: "Görünən dövrdə planlaşdırılmış qeydlər.", planned: "plan",
    bannerTitle: "Planla. Öyrən. Nail ol!", bannerText: "Daha güclü bir sabaha doğru akademik ritminizi bir yerdən idarə edin.",
  },
  tr: {
    subtitle: "Akademik hayatınızı planlayın.", description: "Dersler, sınavlar, görevler ve üniversite etkinlikleri — hepsi bir arada!",
    quote: "Düzenli plan büyük başarılara götürür.", all: "Tümü", lessons: "Dersler", exams: "Sınavlar", events: "Etkinlikler",
    addEvent: "Etkinlik ekle", examSession: "Sınav dönemi", academicCalendar: "Akademik takvim", importantDates: "Önemli tarihler",
    examSessionNote: "Sınav planınızı ve sonuçları takip edin.", academicCalendarNote: "Bu ayın ders ve etkinliklerini görün.",
    importantDatesNote: "Görünen dönemde planlanan kayıtlar.", planned: "plan",
    bannerTitle: "Planla. Öğren. Başar!", bannerText: "Akademik ritminizi tek yerden yönetin.",
  },
  en: {
    subtitle: "Plan your academic life.", description: "Classes, exams, assignments and university events — all in one place.",
    quote: "A disciplined plan leads to meaningful achievement.", all: "All", lessons: "Classes", exams: "Exams", events: "Events",
    addEvent: "Add event", examSession: "Exam session", academicCalendar: "Academic calendar", importantDates: "Important dates",
    examSessionNote: "Track your exam plan and results.", academicCalendarNote: "Review this month's classes and events.",
    importantDatesNote: "Items planned in the visible period.", planned: "planned",
    bannerTitle: "Plan. Learn. Achieve!", bannerText: "Manage your academic rhythm in one place.",
  },
  ru: {
    subtitle: "Планируйте академическую жизнь.", description: "Занятия, экзамены, задания и события университета — всё в одном месте.",
    quote: "Системный план ведёт к большим достижениям.", all: "Все", lessons: "Занятия", exams: "Экзамены", events: "События",
    addEvent: "Добавить событие", examSession: "Экзаменационная сессия", academicCalendar: "Академический календарь", importantDates: "Важные даты",
    examSessionNote: "Следите за планом экзаменов и результатами.", academicCalendarNote: "Просматривайте занятия и события месяца.",
    importantDatesNote: "Запланированные записи в видимом периоде.", planned: "запланировано",
    bannerTitle: "Планируй. Учись. Достигай!", bannerText: "Управляйте академическим ритмом в одном месте.",
  },
} as const;

export const Route = createFileRoute("/_authenticated/teqvim")({
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }] }),
  component: TeqvimSehifesi,
});

function bakuTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function fullName(profile: { ad: string | null; soyad: string | null } | undefined) {
  if (!profile) return null;
  return [profile.ad, profile.soyad].filter(Boolean).join(" ") || null;
}

function eventKey(courseId: string | null, groupId: string | null, date: string, start: string) {
  return `${courseId ?? ""}|${groupId ?? ""}|${date}|${start.slice(0, 5)}`;
}

function TeqvimSehifesi() {
  const queryClient = useQueryClient();
  const { roles = [], userId } = useUserRoles();
  const { locale, intlLocale, t } = useCalendarManagementI18n();
  const { t: pageT } = usePageI18n();
  const [secilmisTarix, setSecilmisTarix] = useState<Date>(new Date());
  const [ay, setAy] = useState(new Date().getMonth());
  const [il, setIl] = useState(new Date().getFullYear());
  const [axtaris, setAxtaris] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "lesson" | "exam" | "event">("all");
  const [sehifeGorunusu, setSehifeGorunusu] = useState<"calendar" | "schedule">("calendar");
  const [modalAciq, setModalAciq] = useState(false);
  const [redakteTedbir, setRedakteTedbir] = useState<EventWithDetails | null>(null);

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

  const isAdmin = roles.includes("admin");
  const privileged = isAdmin || roles.includes("dekan");
  const canManage = isAdmin || roles.includes("tyutor");
  const teacherOnly = roles.includes("muellim") && !privileged && !roles.includes("tyutor") && !roles.includes("telebe");

  const monthFirst = new Date(il, ay, 1);
  const firstDayIndex = (monthFirst.getDay() + 6) % 7;
  const gridStart = addDays(monthFirst, -firstDayIndex);
  const gridEnd = addDays(gridStart, 41);
  const startDate = format(gridStart, "yyyy-MM-dd");
  const endDate = format(gridEnd, "yyyy-MM-dd");
  const monthStart = format(new Date(il, ay, 1), "yyyy-MM-dd");
  const monthEndExclusive = format(new Date(il, ay + 1, 1), "yyyy-MM-dd");

  const { data: scope = { groupIds: [], teacherCourseIds: [] } } = useQuery<ScopeData>({
    queryKey: ["calendar-role-scope", userId, roles.join(",")],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId || privileged) return { groupIds: [], teacherCourseIds: [] };
      const groupIds = new Set<string>();
      const teacherCourseIds = new Set<string>();

      if (roles.includes("telebe")) {
        const { data, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
        if (error) throw error;
        (data ?? []).forEach((row) => groupIds.add(row.group_id));
      }

      if (roles.includes("tyutor")) {
        const { data, error } = await supabase.from("groups").select("id").eq("tyutor_id", userId);
        if (error) throw error;
        (data ?? []).forEach((row) => groupIds.add(row.id));
      }

      if (roles.includes("muellim")) {
        const { data, error } = await supabase.from("course_teachers").select("course_id").eq("muellim_id", userId);
        if (error) throw error;
        (data ?? []).forEach((row) => teacherCourseIds.add(row.course_id));
      }

      return { groupIds: [...groupIds], teacherCourseIds: [...teacherCourseIds] };
    },
  });

  const { data: managedGroups = [] } = useQuery({
    queryKey: ["calendar-managed-groups", userId, isAdmin, roles.includes("tyutor")],
    enabled: !!userId && canManage,
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase.from("groups").select("id, ad").eq("arxivlenib", false).order("ad");
      if (!isAdmin) query = query.eq("tyutor_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lessonEvents = [], isLoading: lessonsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["calendar-lesson-sessions", startDate, endDate, userId, roles.join(","), scope.groupIds.join(",")],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      let visible: LessonSessionRow[];
      if (teacherOnly) {
        visible = await fetchTeacherLessonSessions({ userId, startDate, endDate, limit: 300 }) as unknown as LessonSessionRow[];
      } else {
        const { data, error } = await supabase.from("course_lesson_sessions").select("*").gte("lesson_date", startDate).lte("lesson_date", endDate).order("lesson_date").order("starts_at");
        if (error) throw error;
        visible = ((data ?? []) as LessonSessionRow[]).filter((session) => {
          if (privileged) return true;
          if (roles.includes("muellim") && session.teacher_id === userId) return true;
          if ((roles.includes("telebe") || roles.includes("tyutor")) && scope.groupIds.includes(session.group_id)) return true;
          return false;
        });
      }

      if (visible.length === 0) return [];

      const courseIds = [...new Set(visible.map((session) => session.course_id))];
      const groupIds = [...new Set(visible.map((session) => session.group_id))];
      const teacherIds = [...new Set(visible.map((session) => session.teacher_id))];

      const [courseResult, groupResult, profileResult, roomMaps] = await Promise.all([
        supabase.from("courses").select("id, ad, otaq, otaqlar").in("id", courseIds),
        supabase.from("groups").select("id, ad").in("id", groupIds),
        supabase.from("profiles").select("user_id, ad, soyad").in("user_id", teacherIds),
        fetchTeacherSessionRoomMaps(visible as unknown as TeacherLessonSession[]),
      ]);
      if (courseResult.error) throw courseResult.error;
      if (groupResult.error) throw groupResult.error;
      if (profileResult.error) throw profileResult.error;

      const courseMap = new Map((courseResult.data ?? []).map((row) => [row.id, row]));
      const groupMap = new Map((groupResult.data ?? []).map((row) => [row.id, row]));
      const profileMap = new Map((profileResult.data ?? []).map((row) => [row.user_id, row]));

      return visible.map((session) => {
        const course = courseMap.get(session.course_id);
        const group = groupMap.get(session.group_id);
        const profile = profileMap.get(session.teacher_id);
        const courseName = course?.ad ?? t("fallback.lesson");
        const start = bakuTime(session.starts_at);
        const end = bakuTime(session.ends_at);
        return {
          id: `lesson-${session.id}`,
          group_id: session.group_id,
          course_id: session.course_id,
          tarix: session.lesson_date,
          baslıq: courseName,
          baslangic_saat: start,
          bitme_saat: end,
          tesvir: null,
          yaradan_id: session.teacher_id,
          created_at: session.created_at,
          updated_at: session.updated_at,
          groups: group ? { ad: group.ad } : null,
          courses: { ad: courseName },
          profiles: profile ? { ad: profile.ad, soyad: profile.soyad } : null,
          isLessonSession: true,
          lessonSessionId: session.id,
          scheduleTemplateId: session.schedule_template_id,
          teacherName: fullName(profile),
          room: resolveTeacherSessionRoom(session as unknown as TeacherLessonSession, roomMaps),
        } satisfies EventWithDetails;
      });
    },
  });

  const { data: manualEvents = [], isLoading: manualLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["calendar-events", startDate, endDate, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*, groups(ad), courses(ad), profiles:yaradan_id(ad, soyad)").gte("tarix", startDate).lte("tarix", endDate).order("tarix").order("baslangic_saat");
      if (error) throw error;
      return ((data ?? []) as EventWithDetails[]).map((event) => {
        if (!event.courses?.ad) return event;
        return { ...event, baslıq: event.courses.ad, tesvir: event.tesvir ?? (event.baslıq !== event.courses.ad ? event.baslıq : null) };
      });
    },
  });

  const { data: examEvents = [], isLoading: examsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["exam-schedule-calendar", startDate, endDate, userId, roles.join(","), scope.groupIds.join(","), scope.teacherCourseIds.join(",")],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("exam_schedule").select("*, courses(ad), groups(ad)").gte("imtahan_tarixi", startDate).lte("imtahan_tarixi", endDate).order("imtahan_tarixi").order("baslangic_saat");
      if (error) throw error;

      const visible = (data ?? []).filter((exam) => {
        if (privileged) return true;
        if ((roles.includes("telebe") || roles.includes("tyutor")) && scope.groupIds.includes(exam.group_id)) return true;
        if (roles.includes("muellim") && scope.teacherCourseIds.includes(exam.course_id)) return true;
        return false;
      });

      return visible.map((exam) => ({
        id: `exam-${exam.id}`,
        group_id: exam.group_id,
        course_id: exam.course_id,
        tarix: exam.imtahan_tarixi,
        baslıq: exam.courses?.ad ?? t("fallback.exam"),
        baslangic_saat: exam.baslangic_saat,
        bitme_saat: exam.baslangic_saat,
        tesvir: t("exam.scheduleDescription"),
        yaradan_id: exam.yaradan_id,
        created_at: exam.created_at,
        updated_at: exam.updated_at,
        groups: exam.groups ? { ad: exam.groups.ad } : null,
        courses: exam.courses ? { ad: exam.courses.ad } : null,
        profiles: null,
        isExam: true,
        examCompleted: false,
      })) as EventWithDetails[];
    },
  });

  const { data: takenExamEvents = [], isLoading: takenExamsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["taken-exam-results-calendar", monthStart, monthEndExclusive, userId],
    enabled: !!userId && roles.includes("telebe"),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("exam_detailed_results").select("*").eq("student_id", userId).gte("exam_completed_at", `${monthStart}T00:00:00`).lt("exam_completed_at", `${monthEndExclusive}T00:00:00`).order("exam_completed_at");
      if (error) throw error;

      return ((data ?? []) as ExamDetailedResultRow[]).map((result) => ({
        id: `taken-${result.id}`,
        group_id: null,
        course_id: null,
        tarix: result.exam_completed_at.slice(0, 10),
        baslıq: result.exam_name || (result.exam_type === "ticket" ? pageT("calendar.ticketExam") : pageT("calendar.testExam")),
        baslangic_saat: result.exam_started_at?.slice(11, 16) || result.exam_completed_at.slice(11, 16),
        bitme_saat: result.exam_completed_at.slice(11, 16),
        tesvir: pageT("calendar.examResult"),
        yaradan_id: userId,
        created_at: result.exam_completed_at,
        updated_at: result.exam_completed_at,
        groups: null,
        courses: null,
        profiles: null,
        isExam: true,
        examCompleted: true,
        examScore: result.current_score,
        examMaxScore: 50,
      }));
    },
  });

  const lessonKeys = useMemo(() => new Set(lessonEvents.map((event) => eventKey(event.course_id, event.group_id, event.tarix, event.baslangic_saat))), [lessonEvents]);

  const events = useMemo<EventWithDetails[]>(() => {
    const nonDuplicateManual = manualEvents.filter((event) => !event.course_id || !lessonKeys.has(eventKey(event.course_id, event.group_id, event.tarix, event.baslangic_saat)));
    return [...lessonEvents, ...nonDuplicateManual, ...examEvents, ...takenExamEvents];
  }, [lessonEvents, manualEvents, examEvents, takenExamEvents, lessonKeys]);

  const filteredEvents = useMemo(() => {
    const needle = axtaris.trim().toLocaleLowerCase(intlLocale);
    return events.filter((event) => {
      const matchesSearch = !needle || [event.baslıq, event.courses?.ad, event.groups?.ad, event.teacherName, event.room]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase(intlLocale).includes(needle));
      const matchesKind =
        eventFilter === "all" ||
        (eventFilter === "lesson" && event.isLessonSession === true) ||
        (eventFilter === "exam" && event.isExam === true) ||
        (eventFilter === "event" && event.isLessonSession !== true && event.isExam !== true);
      return matchesSearch && matchesKind;
    });
  }, [events, axtaris, intlLocale, eventFilter]);

  const selectedDateString = format(secilmisTarix, "yyyy-MM-dd");
  const selectedDayEvents = filteredEvents.filter((event) => event.tarix === selectedDateString);

  const { data: modalCourses = [] } = useQuery({
    queryKey: ["calendar-modal-courses", userId, isAdmin, managedGroups.map((group) => group.id).join(",")],
    enabled: !!userId && canManage,
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase.from("courses").select("id, ad").order("ad");
        if (error) throw error;
        return data ?? [];
      }
      const groupIds = managedGroups.map((group) => group.id);
      if (!groupIds.length) return [];
      const { data: links, error: linkError } = await supabase.from("course_groups").select("course_id").in("group_id", groupIds);
      if (linkError) throw linkError;
      const ids = [...new Set((links ?? []).map((link) => link.course_id))];
      if (!ids.length) return [];
      const { data, error } = await supabase.from("courses").select("id, ad").in("id", ids).order("ad");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Omit<EventInsert, "yaradan_id">) => {
      if (!userId) throw new Error(t("user.missing"));
      if (redakteTedbir) {
        const update: EventUpdate = payload;
        const { error } = await supabase.from("calendar_events").update(update).eq("id", redakteTedbir.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("calendar_events").insert({ ...payload, yaradan_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(redakteTedbir ? "toast.eventUpdated" : "toast.eventCreated"));
      setModalAciq(false);
      setRedakteTedbir(null);
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("toast.eventDeleted"));
      setModalAciq(false);
      setRedakteTedbir(null);
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setRedakteTedbir(null);
    setModalAciq(true);
  };

  const openEdit = (event: EventWithDetails) => {
    if (event.isLessonSession || event.isExam || !canManage) return;
    setRedakteTedbir(event);
    setModalAciq(true);
  };

  const loading = lessonsLoading || manualLoading || examsLoading || takenExamsLoading;

  const calendarView = (
    <div className="calendar-redesign-board">
      <div className="calendar-redesign-calendar">
        <MonthYearNav ay={ay} il={il} onAySec={setAy} onIlSec={setIl} axtaris={axtaris} onAxtarisDeyis={setAxtaris} />
        <CalendarGrid ay={ay} il={il} events={filteredEvents} secilmisTarix={secilmisTarix} onTarixSec={setSecilmisTarix} />
      </div>
      <aside className="calendar-redesign-aside">
        <DayDetails tarix={secilmisTarix} events={selectedDayEvents} userId={userId} roles={roles} onEditClick={openEdit} onDeleteClick={(event) => deleteMutation.mutate(event.id)} />
      </aside>
    </div>
  );

  const copy = CALENDAR_UI[locale as keyof typeof CALENDAR_UI] ?? CALENDAR_UI.az;
  const lessonCount = events.filter((event) => event.isLessonSession === true).length;
  const examCount = events.filter((event) => event.isExam === true).length;
  const generalEventCount = Math.max(0, events.length - lessonCount - examCount);
  const filterItems = [
    { id: "all" as const, label: copy.all, count: events.length },
    { id: "lesson" as const, label: copy.lessons, count: lessonCount },
    { id: "exam" as const, label: copy.exams, count: examCount },
    { id: "event" as const, label: copy.events, count: generalEventCount },
  ];

  return (
    <div className="calendar-redesign animate-page-enter">
      <section className="calendar-redesign-hero" style={{ backgroundImage: `url(${calendarHero})` }}>
        <div className="calendar-redesign-hero__shade" aria-hidden />
        <div className="calendar-redesign-hero__copy">
          <h1>{t("page.title")}</h1>
          <p>{copy.subtitle}</p>
          <span>{copy.description}</span>
        </div>
        <blockquote className="calendar-redesign-hero__quote">“{copy.quote}”</blockquote>
        <div className="calendar-redesign-hero__mark" aria-hidden><CalendarDays /></div>
        {canManage ? <button type="button" className="calendar-redesign-hero__action" onClick={openCreate}><Plus aria-hidden /> {copy.addEvent}</button> : null}
      </section>

      <div className="calendar-redesign-toolbar">
        <div className="calendar-redesign-filters" role="group" aria-label={copy.all}>
          {filterItems.map((item) => (
            <button type="button" key={item.id} aria-pressed={eventFilter === item.id} className={eventFilter === item.id ? "is-active" : ""} onClick={() => setEventFilter(item.id)}>
              <span>{item.label}</span><small>{item.count}</small>
            </button>
          ))}
        </div>
        <div className="calendar-redesign-toolbar__meta">
          {loading ? <span className="calendar-redesign-loading" aria-label="Loading"><Loader2 className="animate-spin" /></span> : null}
          <CurrentWeekBadge />
        </div>
      </div>

      {canManage ? (
        <Tabs value={sehifeGorunusu} onValueChange={(value) => setSehifeGorunusu(value as "calendar" | "schedule")} className="calendar-redesign-mode">
          <TabsList>
            <TabsTrigger value="calendar"><CalendarDays aria-hidden /> {t("view.calendar")}</TabsTrigger>
            <TabsTrigger value="schedule"><CalendarRange aria-hidden /> {t("view.schedule")}</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {canManage && sehifeGorunusu === "schedule" ? <ScheduleManagementView groups={managedGroups} /> : (
        <>
          {calendarView}
          <section className="calendar-redesign-links" aria-label="Calendar shortcuts">
            <Link to="/imtahanlar"><span><CalendarCheck2 aria-hidden /></span><strong>{copy.examSession}</strong><small>{copy.examSessionNote}</small></Link>
            <button type="button" onClick={() => { const now = new Date(); setAy(now.getMonth()); setIl(now.getFullYear()); setSecilmisTarix(now); }}>
              <span><BookOpen aria-hidden /></span><strong>{copy.academicCalendar}</strong><small>{copy.academicCalendarNote}</small>
            </button>
            <div><span><Clock3 aria-hidden /></span><strong>{copy.importantDates}</strong><small>{filteredEvents.length} {copy.planned} · {copy.importantDatesNote}</small></div>
          </section>
          <section className="calendar-redesign-banner">
            <div><Sparkles aria-hidden /><h2>{copy.bannerTitle}</h2><p>{copy.bannerText}</p></div>
            <span aria-hidden>{String(filteredEvents.length).padStart(2, "0")}</span>
          </section>
        </>
      )}

      {canManage && sehifeGorunusu === "calendar" ? <FloatingAddButton onClick={openCreate} /> : null}
      {canManage ? (
        <EventFormModal
          isOpen={modalAciq}
          onClose={() => { setModalAciq(false); setRedakteTedbir(null); }}
          eventToEdit={redakteTedbir}
          groups={managedGroups}
          courses={modalCourses}
          roles={roles}
          onSubmit={async (data) => { await saveMutation.mutateAsync(data); }}
          onDelete={async (id) => { await deleteMutation.mutateAsync(id); }}
        />
      ) : null}
    </div>
  );
}
