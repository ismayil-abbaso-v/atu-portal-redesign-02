import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  Library,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import studentHero from "@/assets/student-home-hero.webp";
import innovationLab from "@/assets/student-innovation-lab.webp";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import "@/student-home.css";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"] & {
  courses: Pick<Course, "ad" | "otaq"> | null;
};

type Locale = "az" | "tr" | "en" | "ru";

const copy = {
  az: {
    welcome: "Xoş gəlmisən,",
    future: "Azərbaycan Texnologiya Universitetində hər gün daha parlaq bir gələcəyə!",
    quote: "Texnologiya daha yaxşı bir gələcək yaradır.",
    words: ["TƏHSİL", "TEXNOLOGİYA", "İNKİŞAF", "SƏN"],
    progress: "Akademik irəliləyiş",
    semester: "Cari semestr",
    completed: "Tamamlandı",
    ongoing: "Davam edir",
    remaining: "Qalıb",
    subjects: "Fənn",
    smallSteps: "Kiçik addımlar böyük nəticələr yaradır.",
    week: "Bu həftə",
    showAll: "Hamısını göstər",
    noWeek: "Bu həftə üçün dərs planı yoxdur.",
    lesson: "Dərs",
    room: "Otaq",
    finance: "Təhsil haqqı və ödənişlər",
    tuition: "Təhsil haqqı",
    financeStatus: "Ödəniş statusu",
    noFinance: "Maliyyə məlumatı mövcud deyil.",
    group: "Tədris qrupu",
    average: "Orta bal",
    notices: "Yeni bildiriş",
    chat: "Söhbət aktivliyi",
    noChat: "Hələ yeni mesaj yoxdur.",
    openChat: "Söhbətə keç",
    you: "Siz",
    services: "Sürətli xidmətlər",
    journal: "Elektron jurnal",
    exams: "İmtahanlar",
    office: "Sənədlər və ofis",
    library: "Kitabxana",
    studentOffice: "Tələbə ofisi",
    innovation: "Texnologiya ilə daha güclü sabah!",
    innovationText: "İnnovativ düşüncə, bilikli gənclik, inkişaf edən cəmiyyət.",
    innovationCta: "ATU-da innovasiya",
    loadError: "Məlumatlar yüklənmədi",
    retry: "Yenidən cəhd et",
  },
  tr: {
    welcome: "Hoş geldin,",
    future: "Azerbaycan Teknoloji Üniversitesinde her gün daha parlak bir geleceğe!",
    quote: "Teknoloji daha iyi bir gelecek yaratır.",
    words: ["EĞİTİM", "TEKNOLOJİ", "GELİŞİM", "SEN"],
    progress: "Akademik ilerleme",
    semester: "Güncel dönem",
    completed: "Tamamlandı",
    ongoing: "Devam ediyor",
    remaining: "Kaldı",
    subjects: "Ders",
    smallSteps: "Küçük adımlar büyük sonuçlar yaratır.",
    week: "Bu hafta",
    showAll: "Tümünü göster",
    noWeek: "Bu hafta için ders planı yok.",
    lesson: "Ders",
    room: "Oda",
    finance: "Öğrenim ücreti ve ödemeler",
    tuition: "Öğrenim ücreti",
    financeStatus: "Ödeme durumu",
    noFinance: "Finansal bilgi mevcut değil.",
    group: "Eğitim grubu",
    average: "Ortalama",
    notices: "Yeni bildirim",
    chat: "Sohbet etkinliği",
    noChat: "Henüz yeni mesaj yok.",
    openChat: "Sohbete git",
    you: "Siz",
    services: "Hızlı hizmetler",
    journal: "Elektronik jurnal",
    exams: "Sınavlar",
    office: "Belgeler ve ofis",
    library: "Kütüphane",
    studentOffice: "Öğrenci ofisi",
    innovation: "Teknolojiyle daha güçlü yarın!",
    innovationText: "Yenilikçi düşünce, bilgili gençlik, gelişen toplum.",
    innovationCta: "ATU'da inovasyon",
    loadError: "Bilgiler yüklenemedi",
    retry: "Tekrar dene",
  },
  en: {
    welcome: "Welcome,",
    future: "A brighter future every day at Azerbaijan Technological University!",
    quote: "Technology creates a better future.",
    words: ["EDUCATION", "TECHNOLOGY", "GROWTH", "YOU"],
    progress: "Academic progress",
    semester: "Current semester",
    completed: "Completed",
    ongoing: "In progress",
    remaining: "Remaining",
    subjects: "Courses",
    smallSteps: "Small steps create great results.",
    week: "This week",
    showAll: "Show all",
    noWeek: "There are no classes planned for this week.",
    lesson: "Class",
    room: "Room",
    finance: "Tuition and payments",
    tuition: "Tuition fee",
    financeStatus: "Payment status",
    noFinance: "Financial information is unavailable.",
    group: "Study group",
    average: "Average score",
    notices: "New notifications",
    chat: "Chat activity",
    noChat: "There are no recent messages yet.",
    openChat: "Open chat",
    you: "You",
    services: "Quick services",
    journal: "Electronic journal",
    exams: "Exams",
    office: "Documents and office",
    library: "Library",
    studentOffice: "Student office",
    innovation: "A stronger tomorrow through technology!",
    innovationText: "Innovative thinking, knowledgeable youth, a developing society.",
    innovationCta: "Innovation at ATU",
    loadError: "Data could not be loaded",
    retry: "Try again",
  },
  ru: {
    welcome: "Добро пожаловать,",
    future: "Каждый день к более светлому будущему в Азербайджанском технологическом университете!",
    quote: "Технологии создают лучшее будущее.",
    words: ["ОБРАЗОВАНИЕ", "ТЕХНОЛОГИИ", "РАЗВИТИЕ", "ТЫ"],
    progress: "Академический прогресс",
    semester: "Текущий семестр",
    completed: "Завершено",
    ongoing: "Продолжается",
    remaining: "Осталось",
    subjects: "Предметы",
    smallSteps: "Маленькие шаги приводят к большим результатам.",
    week: "Эта неделя",
    showAll: "Показать все",
    noWeek: "На эту неделю занятий не запланировано.",
    lesson: "Занятие",
    room: "Аудитория",
    finance: "Обучение и платежи",
    tuition: "Стоимость обучения",
    financeStatus: "Статус оплаты",
    noFinance: "Финансовая информация недоступна.",
    group: "Учебная группа",
    average: "Средний балл",
    notices: "Новые уведомления",
    chat: "Активность чата",
    noChat: "Новых сообщений пока нет.",
    openChat: "Открыть чат",
    you: "Вы",
    services: "Быстрые сервисы",
    journal: "Электронный журнал",
    exams: "Экзамены",
    office: "Документы и офис",
    library: "Библиотека",
    studentOffice: "Студенческий офис",
    innovation: "Более сильное завтра с технологиями!",
    innovationText: "Инновационное мышление, образованная молодежь, развивающееся общество.",
    innovationCta: "Инновации в ATU",
    loadError: "Не удалось загрузить данные",
    retry: "Повторить",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

const dateLocales = { az, tr, en: enUS, ru } as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useCountUp(target: number, ready: boolean) {
  const [value, setValue] = useState(ready ? 0 : target);
  const ran = useRef(false);
  useEffect(() => {
    if (!ready || prefersReducedMotion() || ran.current) {
      setValue(target);
      return;
    }
    ran.current = true;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, target]);
  return value;
}

export function StudentDashboard({ userId }: { userId: string }) {
  const { locale } = useI18n();
  const lang = locale as Locale;
  const c = copy[lang];
  const dateLocale = dateLocales[lang];

  const profileQuery = useQuery({
    queryKey: ["student-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const groupsQuery = useQuery({
    queryKey: ["student-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const groupIds = groupsQuery.data?.map((item) => item.group_id) ?? [];

  const coursesQuery = useQuery({
    queryKey: ["student-courses", groupIds, userId],
    enabled: !groupsQuery.isLoading,
    queryFn: async () => {
      const groupCourses = groupIds.length
        ? await supabase.from("courses").select("*").in("group_id", groupIds)
        : { data: [] as Course[], error: null };
      if (groupCourses.error) throw groupCourses.error;
      const { data: scoreRows, error } = await supabase
        .from("exam_scores")
        .select("course_id, courses(*)")
        .eq("user_id", userId);
      if (error) throw error;
      const all = [...((groupCourses.data ?? []) as Course[])];
      for (const item of scoreRows ?? []) {
        const course = item.courses as Course | null;
        if (course && !all.some((entry) => entry.id === course.id)) all.push(course);
      }
      return all;
    },
  });
  const courses = coursesQuery.data ?? [];
  const courseIds = courses.map((course) => course.id);

  const scoresQuery = useQuery({
    queryKey: ["student-all-exam-scores", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_scores")
        .select("course_id, yekun_qiymet")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekQuery = useQuery({
    queryKey: ["student-week-events", groupIds, courseIds, format(weekStart, "yyyy-MM-dd")],
    enabled: !groupsQuery.isLoading && !coursesQuery.isLoading,
    queryFn: async () => {
      const filters: string[] = [];
      if (groupIds.length) filters.push(`group_id.in.(${groupIds.join(",")})`);
      if (courseIds.length) filters.push(`course_id.in.(${courseIds.join(",")})`);
      if (!filters.length) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, courses(ad, otaq)")
        .gte("tarix", format(weekStart, "yyyy-MM-dd"))
        .lte("tarix", format(weekEnd, "yyyy-MM-dd"))
        .or(filters.join(","))
        .order("tarix")
        .order("baslangic_saat");
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
  });

  const chatsQuery = useQuery({
    queryKey: ["student-home-chat", userId, locale],
    queryFn: async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from("chat_group_members")
        .select("chat_group_id")
        .eq("user_id", userId);
      if (membershipError) throw membershipError;
      const chatIds = (memberships ?? [])
        .map((item) => item.chat_group_id)
        .filter((id): id is string => Boolean(id));
      if (!chatIds.length) return [];
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("id, metin, created_at, gonderen_id, chat_group_id")
        .in("chat_group_id", chatIds)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      const senderIds = [
        ...new Set(
          (messages ?? [])
            .map((message) => message.gonderen_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const profiles = senderIds.length
        ? await supabase.from("profiles").select("user_id, ad, soyad").in("user_id", senderIds)
        : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      const names = new Map(
        (profiles.data ?? []).map((profile) => [
          profile.user_id,
          [profile.ad, profile.soyad].filter(Boolean).join(" "),
        ]),
      );
      return (messages ?? []).map((message) => ({
        ...message,
        senderName:
          message.gonderen_id === userId ? c.you : names.get(message.gonderen_id ?? "") || c.chat,
      }));
    },
  });

  const scores = scoresQuery.data ?? [];
  const completedIds = new Set(
    scores.filter((score) => score.yekun_qiymet != null).map((score) => score.course_id),
  );
  const completed = courses.filter((course) => completedIds.has(course.id)).length;
  const ongoing = Math.max(0, courses.length - completed);
  const remaining = Math.max(0, courses.length - completed - ongoing);
  const progress = courses.length ? Math.round((completed / courses.length) * 100) : 0;
  const isLoading =
    profileQuery.isLoading ||
    groupsQuery.isLoading ||
    coursesQuery.isLoading ||
    scoresQuery.isLoading;
  const hasError =
    profileQuery.isError ||
    groupsQuery.isError ||
    coursesQuery.isError ||
    scoresQuery.isError ||
    weekQuery.isError ||
    chatsQuery.isError;
  const animatedProgress = useCountUp(progress, !isLoading);
  const animatedCompleted = useCountUp(completed, !isLoading);
  const animatedOngoing = useCountUp(ongoing, !isLoading);
  if (isLoading) return <StudentHomeSkeleton />;
  if (hasError)
    return (
      <StudentHomeError
        label={c.loadError as string}
        retry={c.retry as string}
        onRetry={() =>
          void Promise.all([
            profileQuery.refetch(),
            groupsQuery.refetch(),
            coursesQuery.refetch(),
            scoresQuery.refetch(),
            weekQuery.refetch(),
            chatsQuery.refetch(),
          ])
        }
      />
    );

  const profile = profileQuery.data;
  const studentName =
    [profile?.ad, profile?.soyad].filter(Boolean).join(" ") || profile?.ad || "ATU";
  const weekEvents = weekQuery.data ?? [];
  const messages = chatsQuery.data ?? [];

  return (
    <div className="student-home">
      <section className="student-home-hero" style={{ backgroundImage: `url(${studentHero})` }}>
        <div className="student-home-hero__shade" />
        <div className="student-home-hero__copy">
          <p>{c.welcome as string}</p>
          <h1>{studentName}!</h1>
          <span>{c.future as string}</span>
        </div>
        <blockquote className="student-home-hero__quote">“{c.quote as string}”</blockquote>
        <div className="student-home-hero__words" aria-hidden>
          {(c.words as string[]).map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
      </section>

      <div className="student-home-grid">
        <section className="student-home-card student-home-progress">
          <CardHeading
            title={c.progress as string}
            action={<span className="student-home-pill">{c.semester as string}</span>}
          />
          <div className="student-home-progress__body">
            <div
              className="student-home-ring"
              style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}
              role="progressbar"
              aria-label={c.progress as string}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div>
                <strong>{animatedProgress}%</strong>
                <span>{c.completed as string}</span>
              </div>
            </div>
            <div className="student-home-progress__metrics">
              <Metric value={courses.length} label={c.subjects as string} />
              <Metric value={animatedCompleted} label={c.completed as string} tone="positive" />
              <Metric value={animatedOngoing} label={c.ongoing as string} tone="warning" />
              <Metric value={remaining} label={c.remaining as string} />
            </div>
          </div>
          <blockquote className="student-home-progress__quote">
            “{c.smallSteps as string}”
          </blockquote>
        </section>

        <section className="student-home-card student-home-week">
          <CardHeading
            title={c.week as string}
            subtitle={`${format(weekStart, "d MMM", { locale: dateLocale })} — ${format(weekEnd, "d MMM", { locale: dateLocale })}`}
            action={
              <Link className="student-home-heading-link" to="/teqvim">
                {c.showAll as string}
                <ArrowRight />
              </Link>
            }
          />
          <div className="student-home-week__days" aria-label={c.week as string}>
            {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((day) => (
              <span
                key={day.toISOString()}
                className={
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "is-today" : ""
                }
              >
                <b>{format(day, "EEE", { locale: dateLocale })}</b>
                <small>{format(day, "d")}</small>
              </span>
            ))}
          </div>
          {weekQuery.isLoading ? (
            <div className="student-home-inline-state">
              <Loader2 className="animate-spin" />
            </div>
          ) : weekEvents.length ? (
            <div className="student-home-schedule">
              {weekEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="student-home-schedule__row">
                  <time dateTime={event.tarix}>
                    <b>
                      {format(new Date(`${event.tarix}T12:00:00`), "EEE", { locale: dateLocale })}
                    </b>
                    <span>{format(new Date(`${event.tarix}T12:00:00`), "d")}</span>
                  </time>
                  <span className="student-home-schedule__line" />
                  <div>
                    <strong>{event.courses?.ad ?? event.baslıq}</strong>
                    <span>
                      {[
                        c.lesson,
                        `${event.baslangic_saat.slice(0, 5)}–${event.bitme_saat.slice(0, 5)}`,
                        event.courses?.otaq ? `${c.room} ${event.courses.otaq}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<CalendarDays />} label={c.noWeek as string} />
          )}
        </section>

        <div className="student-home-side">
          <section className="student-home-card student-home-finance">
            <CardHeading title={c.finance as string} />
            {profile?.tehsil_haqqi != null || profile?.tehsil_haqqi_statusu ? (
              <div className="student-home-finance__content">
                <span className="student-home-finance__icon">
                  <WalletCards />
                </span>
                {profile.tehsil_haqqi != null ? (
                  <div className="student-home-finance__amount">
                    <strong>{profile.tehsil_haqqi.toLocaleString(locale)} AZN</strong>
                    <span>{c.tuition as string}</span>
                  </div>
                ) : null}
                {profile.tehsil_haqqi_statusu ? (
                  <div className="student-home-finance__status">
                    <small>{c.financeStatus as string}</small>
                    <strong>{profile.tehsil_haqqi_statusu}</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <Empty icon={<WalletCards />} label={c.noFinance as string} />
            )}
          </section>
          <section className="student-home-card student-home-chat">
            <CardHeading
              title={c.chat as string}
              action={
                <Link to="/sohbet">
                  {c.openChat as string}
                  <ArrowRight />
                </Link>
              }
            />
            {chatsQuery.isLoading ? (
              <div className="student-home-inline-state">
                <Loader2 className="animate-spin" />
              </div>
            ) : messages.length ? (
              <div className="student-home-chat__list">
                {messages.map((message) => (
                  <div key={message.id}>
                    <span>{message.senderName.slice(0, 1).toUpperCase()}</span>
                    <p>
                      <strong>{message.senderName}</strong>
                      <small>{message.metin || "…"}</small>
                    </p>
                    <time>{format(new Date(message.created_at), "HH:mm")}</time>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<MessageCircle />} label={c.noChat as string} />
            )}
          </section>
        </div>

        <section className="student-home-card student-home-services">
          <CardHeading title={c.services as string} />
          <div className="student-home-services__grid">
            <Service to="/elektron-jurnal" icon={<BookOpen />} label={c.journal as string} />
            <Service to="/imtahanlar" icon={<CalendarDays />} label={c.exams as string} />
            <Service to="/ofis" icon={<FileText />} label={c.office as string} />
            <Service to="/kitabxana" icon={<Library />} label={c.library as string} />
            <Service to="/ofis" icon={<Building2 />} label={c.studentOffice as string} />
          </div>
        </section>
      </div>

      <section
        className="student-home-innovation"
        style={{ backgroundImage: `url(${innovationLab})` }}
      >
        <div className="student-home-innovation__copy">
          <Sparkles />
          <h2>{c.innovation as string}</h2>
          <p>{c.innovationText as string}</p>
          <Link to="/ofis">
            {c.innovationCta as string}
            <ArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}

function CardHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="student-home-card__heading">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className={tone ? `is-${tone}` : ""}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Service({
  to,
  icon,
  label,
}: {
  to: "/elektron-jurnal" | "/imtahanlar" | "/ofis" | "/kitabxana";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link to={to} className="student-home-service">
      <span>{icon}</span>
      <strong>{label}</strong>
      <ArrowRight />
    </Link>
  );
}

function Empty({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="student-home-empty">
      <span>{icon}</span>
      <p>{label}</p>
    </div>
  );
}

function StudentHomeSkeleton() {
  return (
    <div className="student-home student-home-skeleton" aria-busy="true">
      <div className="student-home-skeleton__hero" />
      <div className="student-home-skeleton__grid">
        <div />
        <div />
        <div />
      </div>
    </div>
  );
}

function StudentHomeError({
  label,
  retry,
  onRetry,
}: {
  label: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div className="student-home-error" role="alert">
      <RefreshCw />
      <h2>{label}</h2>
      <button type="button" onClick={onRetry}>
        {retry}
      </button>
    </div>
  );
}
