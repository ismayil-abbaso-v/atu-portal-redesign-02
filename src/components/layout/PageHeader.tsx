import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, GraduationCap, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { type ReactNode } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import "@/profile-page-header.css";
import "@/security-premium.css";
import "@/transcript-premium.css";

type HeaderCopy = {
  adminEyebrow: string;
  calendarEyebrow: string;
  calendarDescription: string;
  transcriptEyebrow: string;
  transcriptDescription: string;
  securityEyebrow: string;
  profileEyebrow: string;
};

const HEADER_COPY: Record<Locale, HeaderCopy> = {
  az: {
    adminEyebrow: "Admin idarəetmə mərkəzi",
    calendarEyebrow: "Akademik planlayıcı",
    calendarDescription: "Dərslərinizi, imtahanları və akademik tədbirləri bir baxışda izləyin.",
    transcriptEyebrow: "Akademik transkript",
    transcriptDescription: "Semestrlər, kreditlər və ümumi akademik göstəricilərinizi rəsmi sənəd quruluşunda izləyin.",
    securityEyebrow: "Hesab təhlükəsizliyi",
    profileEyebrow: "Şəxsi kabinet",
  },
  tr: {
    adminEyebrow: "Yönetim merkezi",
    calendarEyebrow: "Akademik planlayıcı",
    calendarDescription: "Derslerinizi, sınavlarınızı ve akademik etkinliklerinizi tek bakışta takip edin.",
    transcriptEyebrow: "Akademik transkript",
    transcriptDescription: "Dönemlerinizi, kredilerinizi ve genel akademik göstergelerinizi resmi belge düzeninde takip edin.",
    securityEyebrow: "Hesap güvenliği",
    profileEyebrow: "Kişisel panel",
  },
  en: {
    adminEyebrow: "Administration center",
    calendarEyebrow: "Academic planner",
    calendarDescription: "Track your classes, exams, and academic events at a glance.",
    transcriptEyebrow: "Academic transcript",
    transcriptDescription: "Track semesters, credits, and overall academic indicators in an official document layout.",
    securityEyebrow: "Account security",
    profileEyebrow: "Personal portal",
  },
  ru: {
    adminEyebrow: "Центр администрирования",
    calendarEyebrow: "Академический планировщик",
    calendarDescription: "Следите за занятиями, экзаменами и академическими событиями в одном месте.",
    transcriptEyebrow: "Академический транскрипт",
    transcriptDescription: "Отслеживайте семестры, кредиты и общие академические показатели в формате официального документа.",
    securityEyebrow: "Безопасность аккаунта",
    profileEyebrow: "Личный кабинет",
  },
};

const MONTH_NAMES: Record<Locale, readonly string[]> = {
  az: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

function formatHeaderDate(date: Date, locale: Locale) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[locale][date.getMonth()];
  const year = date.getFullYear();
  return locale === "ru" ? `${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

export function PageHeader({ baslıq, geri = false, onGeri, children }: { baslıq: string; geri?: boolean; onGeri?: () => void; children?: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t, locale } = useI18n();
  const copy = HEADER_COPY[locale];
  const translatedTitle = t(baslıq, baslıq);
  const isAdminHeader = pathname === "/admin" || pathname.startsWith("/admin/");
  const isCalendarHeader = baslıq === "Təqvim";
  const isProfileHeader = ["Profil parametrləri", "Profil ayarları", "Profile settings", "Настройки профиля"].includes(translatedTitle);
  const isSecurityHeader = ["Təhlükəsizlik", "Güvenlik", "Security", "Безопасность"].includes(translatedTitle);
  const isTranscriptHeader = ["Transkript", "Transcript", "Транскрипт"].includes(translatedTitle) || baslıq === "Transkript";

  if (isAdminHeader) {
    return (
      <header className="admin-page-header surface-card relative mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <span aria-hidden className="admin-page-header__accent" />
        <span aria-hidden className="admin-page-header__grid" />
        <span aria-hidden className="admin-page-header__glow" />
        <span aria-hidden className="admin-page-header__sweep" />

        <svg aria-hidden className="admin-page-header__network" viewBox="0 0 860 150" preserveAspectRatio="none">
          <path className="admin-page-header__line" d="M18 111 L116 62 L218 96 L322 42 L432 83 L552 34 L672 78 L838 35" />
          <path className="admin-page-header__line admin-page-header__line--soft" d="M74 132 L178 104 L282 125 L392 79 L505 118 L618 88 L742 111 L846 76" />
          <path className="admin-page-header__flow" d="M18 111 L116 62 L218 96 L322 42 L432 83 L552 34 L672 78 L838 35" />
          <path className="admin-page-header__flow admin-page-header__flow--two" d="M74 132 L178 104 L282 125 L392 79 L505 118 L618 88 L742 111 L846 76" />
          <circle cx="116" cy="62" r="4.5" />
          <circle cx="218" cy="96" r="3.5" />
          <circle cx="322" cy="42" r="5" />
          <circle cx="432" cy="83" r="4" />
          <circle cx="552" cy="34" r="4.5" />
          <circle cx="672" cy="78" r="4" />
          <circle cx="742" cy="111" r="3.5" />
        </svg>

        <div className="admin-page-header__content relative z-10 flex min-h-[72px] items-center gap-3 sm:gap-4">
          {geri ? (
            <button
              type="button"
              aria-label={t("common.back")}
              onClick={() => (onGeri ? onGeri() : router.history.back())}
              className="admin-page-header__back inline-flex size-11 shrink-0 items-center justify-center rounded-2xl"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : null}

          <div className="admin-page-header__copy min-w-0">
            <span className="admin-page-header__eyebrow" aria-hidden>
              <ShieldCheck className="size-3.5" />
              {copy.adminEyebrow}
            </span>
            <h1 className="admin-page-header__title truncate font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {translatedTitle}
            </h1>
          </div>

          <div className="admin-page-header__visual hidden shrink-0 sm:flex" aria-hidden>
            <span className="admin-page-header__orbit admin-page-header__orbit--one" />
            <span className="admin-page-header__orbit admin-page-header__orbit--two" />
            <span className="admin-page-header__core"><ShieldCheck className="size-6" /></span>
          </div>

          {children ? <div className="admin-page-header__actions ml-auto flex shrink-0 items-center gap-2">{children}</div> : null}
        </div>
      </header>
    );
  }

  if (isCalendarHeader) {
    const todayLabel = formatHeaderDate(new Date(), locale);

    return (
      <header className="calendar-page-hero surface-card relative mb-6 overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div aria-hidden className="calendar-page-hero__ambient" />
        <div aria-hidden className="calendar-page-hero__grid" />
        <div aria-hidden className="calendar-page-hero__sweep" />
        <div aria-hidden className="calendar-page-hero__orb calendar-page-hero__orb--one" />
        <div aria-hidden className="calendar-page-hero__orb calendar-page-hero__orb--two" />
        <div aria-hidden className="calendar-page-hero__topline" />

        <div className="relative z-10 flex min-h-[116px] items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:text-[11px]">
              <Sparkles className="size-3.5" />
              {copy.calendarEyebrow}
            </div>
            <h1 className="truncate font-display text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
              {translatedTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {copy.calendarDescription}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-sm">
                <CalendarDays className="size-4 text-primary" />
                <span className="capitalize">{todayLabel}</span>
              </div>
              {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
            </div>
          </div>

          <div className="calendar-page-hero__visual ml-auto hidden shrink-0 sm:flex" aria-hidden>
            <div className="calendar-page-hero__calendar-card">
              <div className="calendar-page-hero__calendar-head">
                <span />
                <span />
              </div>
              <div className="calendar-page-hero__calendar-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} className={index === 8 ? "is-active" : ""} style={{ animationDelay: `${index * 55}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (isTranscriptHeader) {
    return (
      <header className="transcript-page-header surface-card relative mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <span aria-hidden className="transcript-page-header__accent" />
        <span aria-hidden className="transcript-page-header__grid" />
        <span aria-hidden className="transcript-page-header__glow" />
        <span aria-hidden className="transcript-page-header__sweep" />

        <div className="transcript-page-header__content">
          {geri ? (
            <button
              type="button"
              aria-label={t("common.back")}
              onClick={() => (onGeri ? onGeri() : router.history.back())}
              className="transcript-page-header__back"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : null}

          <div className="transcript-page-header__copy">
            <div className="transcript-page-header__eyebrow" aria-hidden>
              <span className="transcript-page-header__eyebrow-dot" />
              {copy.transcriptEyebrow}
            </div>
            <h1 className="transcript-page-header__title">{translatedTitle}</h1>
            <p className="transcript-page-header__subtitle">
              {copy.transcriptDescription}
            </p>
          </div>

          <div className="transcript-page-header__visual" aria-hidden>
            <span className="transcript-page-header__orbit transcript-page-header__orbit--one" />
            <span className="transcript-page-header__orbit transcript-page-header__orbit--two" />
            <span className="transcript-page-header__core"><GraduationCap className="size-6" /></span>
          </div>

          {children ? <div className="transcript-page-header__actions">{children}</div> : null}
        </div>
      </header>
    );
  }

  if (isSecurityHeader) {
    return (
      <header className="security-page-header surface-card relative mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <span aria-hidden className="security-page-header__accent" />
        <span aria-hidden className="security-page-header__mesh" />
        <span aria-hidden className="security-page-header__halo" />
        <span aria-hidden className="security-page-header__sweep" />

        <div className="security-page-header__visual" aria-hidden>
          <span className="security-page-header__orbit security-page-header__orbit--one" />
          <span className="security-page-header__orbit security-page-header__orbit--two" />
          <span className="security-page-header__core"><ShieldCheck className="size-7" /></span>
        </div>

        <div className="security-page-header__content flex min-h-10 items-center gap-3 sm:gap-4">
          {geri ? (
            <button
              type="button"
              aria-label={t("common.back")}
              onClick={() => (onGeri ? onGeri() : router.history.back())}
              className="security-page-header__back relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition-[background-color,color,transform,box-shadow,border-color] duration-200 hover:-translate-x-0.5 hover:border-primary/25 hover:bg-primary hover:text-primary-foreground hover:shadow-sm"
            >
              <ArrowLeft className="relative z-10 size-5" />
            </button>
          ) : null}

          <div className="min-w-0">
            <span className="security-page-header__eyebrow" aria-hidden>
              <span className="security-page-header__eyebrow-dot" />
              {copy.securityEyebrow}
            </span>
            <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              {translatedTitle}
            </h1>
          </div>

          {children ? <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div> : null}
        </div>
      </header>
    );
  }

  if (isProfileHeader) {
    return (
      <header className="profile-page-header surface-card relative mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <span aria-hidden className="profile-page-header__accent" />
        <span aria-hidden className="profile-page-header__pattern" />
        <span aria-hidden className="profile-page-header__halo" />
        <span aria-hidden className="profile-page-header__sweep" />
        <span aria-hidden className="profile-page-header__focus" />

        <svg aria-hidden className="profile-page-header__network" viewBox="0 0 520 150" preserveAspectRatio="none">
          <path className="profile-page-header__line" d="M16 107 L92 64 L170 93 L247 43 L326 82 L401 37 L500 70" />
          <path className="profile-page-header__line profile-page-header__line--soft" d="M70 122 L135 103 L212 119 L291 75 L367 108 L446 82" />
          <path className="profile-page-header__flow" d="M16 107 L92 64 L170 93 L247 43 L326 82 L401 37 L500 70" />
          <path className="profile-page-header__flow profile-page-header__flow--two" d="M70 122 L135 103 L212 119 L291 75 L367 108 L446 82" />
          <circle cx="92" cy="64" r="4.5" />
          <circle cx="247" cy="43" r="4.5" />
          <circle cx="326" cy="82" r="4.5" />
          <circle cx="401" cy="37" r="4.5" />
          <circle cx="367" cy="108" r="4.5" />
        </svg>

        <div className="profile-page-header__content flex min-h-10 items-center gap-3 sm:gap-4">
          {geri ? (
            <button
              type="button"
              aria-label={t("common.back")}
              onClick={() => (onGeri ? onGeri() : router.history.back())}
              className="profile-page-header__back relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition-[background-color,color,transform,box-shadow,border-color] duration-200 hover:-translate-x-0.5 hover:border-primary/25 hover:bg-primary hover:text-primary-foreground hover:shadow-sm"
            >
              <ArrowLeft className="relative z-10 size-5" />
            </button>
          ) : null}

          <div className="profile-page-header__heading min-w-0">
            <span className="profile-page-header__eyebrow" aria-hidden>
              <UserRound className="size-3" />
              {copy.profileEyebrow}
            </span>
            <h1 className="profile-page-header__title truncate font-display text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              {translatedTitle}
            </h1>
          </div>

          {children ? <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div> : null}
        </div>
      </header>
    );
  }

  return (
    <header className="surface-card relative mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <div className="flex min-h-10 items-center gap-3 sm:gap-4">
        {geri ? (
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={() => (onGeri ? onGeri() : router.history.back())}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition-[background-color,color,transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}

        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            {translatedTitle}
          </h1>
        </div>

        {children ? <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
