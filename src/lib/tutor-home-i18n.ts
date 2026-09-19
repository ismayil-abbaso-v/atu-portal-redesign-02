import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

type TutorHomeKey =
  | "meta.title"
  | "hero.badge"
  | "hero.greeting"
  | "hero.description"
  | "hero.role"
  | "hero.period"
  | "hero.periodUnknown"
  | "metric.groups"
  | "metric.students"
  | "metric.courses"
  | "metric.exams"
  | "groups.title"
  | "groups.description"
  | "groups.studentCount"
  | "groups.courseCount"
  | "groups.nextExam"
  | "groups.noExam"
  | "groups.examSoon"
  | "groups.periodActive"
  | "groups.open"
  | "groups.emptyTitle"
  | "groups.emptyDescription"
  | "exams.title"
  | "exams.description"
  | "exams.viewAll"
  | "exams.emptyTitle"
  | "exams.emptyDescription"
  | "exams.room"
  | "exams.roomUnknown"
  | "exams.today"
  | "exams.tomorrow"
  | "exams.inDays"
  | "quick.title"
  | "quick.description"
  | "quick.groups"
  | "quick.groupsHint"
  | "quick.journal"
  | "quick.journalHint"
  | "quick.exams"
  | "quick.examsHint"
  | "common.courseUnknown"
  | "common.groupUnknown"
  | "common.user"
  | "common.retry"
  | "error.title"
  | "error.description";

type Dict = Record<TutorHomeKey, string>;

const az: Dict = {
  "meta.title": "Tyutor ana səhifəsi",
  "hero.badge": "Akademik müşayiət",
  "hero.greeting": "Salam, {name}",
  "hero.description": "Təyin olunduğunuz qrupların cari semestr üzrə akademik vəziyyətini bir baxışda izləyin.",
  "hero.role": "Tyutor",
  "hero.period": "{year} · {semester}",
  "hero.periodUnknown": "Cari tədris dövrü təyin edilməyib",
  "metric.groups": "Aktiv qrup",
  "metric.students": "Unikal tələbə",
  "metric.courses": "Aktiv fənn",
  "metric.exams": "Yaxın imtahan",
  "groups.title": "Mənim qruplarım",
  "groups.description": "Yalnız sizə təyin edilmiş aktiv qruplar və cari semestr məlumatları.",
  "groups.studentCount": "{count} tələbə",
  "groups.courseCount": "{count} fənn",
  "groups.nextExam": "Növbəti imtahan: {date}",
  "groups.noExam": "Yaxın imtahan planlanmayıb",
  "groups.examSoon": "İmtahan yaxınlaşır",
  "groups.periodActive": "Cari semestr",
  "groups.open": "{group} qrupunu aç",
  "groups.emptyTitle": "Sizə aktiv qrup təyin edilməyib",
  "groups.emptyDescription": "Tyutor təyinatı yaradıldıqda qrup bu səhifədə avtomatik görünəcək.",
  "exams.title": "Yaxın imtahanlar",
  "exams.description": "Qruplarınız üzrə tarix sırası ilə ən yaxın imtahanlar.",
  "exams.viewAll": "Hamısına bax",
  "exams.emptyTitle": "Yaxın imtahan yoxdur",
  "exams.emptyDescription": "Cari semestr üçün gələcək imtahan cədvəli hələ planlanmayıb.",
  "exams.room": "Otaq {room}",
  "exams.roomUnknown": "Otaq təyin edilməyib",
  "exams.today": "Bu gün",
  "exams.tomorrow": "Sabah",
  "exams.inDays": "{count} gün sonra",
  "quick.title": "Sürətli keçidlər",
  "quick.description": "Ən çox istifadə olunan tyutor iş sahələrinə birbaşa keçin.",
  "quick.groups": "Qruplar",
  "quick.groupsHint": "Qrup və fənn məlumatları",
  "quick.journal": "Rəqəmsal jurnal",
  "quick.journalHint": "Yalnız monitorinq görünüşü",
  "quick.exams": "İmtahanlar",
  "quick.examsHint": "İmtahan cədvəlinin idarəsi",
  "common.courseUnknown": "Fənn",
  "common.groupUnknown": "Qrup",
  "common.user": "İstifadəçi",
  "common.retry": "Yenidən cəhd et",
  "error.title": "Ana səhifə yüklənə bilmədi",
  "error.description": "Tyutor məlumatları çəkilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
};

const en: Dict = {
  "meta.title": "Tutor home",
  "hero.badge": "Academic guidance",
  "hero.greeting": "Hello, {name}",
  "hero.description": "See the current-semester academic picture of your assigned groups at a glance.",
  "hero.role": "Tutor",
  "hero.period": "{year} · {semester}",
  "hero.periodUnknown": "Current academic period is not configured",
  "metric.groups": "Active groups",
  "metric.students": "Unique students",
  "metric.courses": "Active courses",
  "metric.exams": "Upcoming exams",
  "groups.title": "My groups",
  "groups.description": "Only active groups assigned to you and their current-semester data.",
  "groups.studentCount": "{count} students",
  "groups.courseCount": "{count} courses",
  "groups.nextExam": "Next exam: {date}",
  "groups.noExam": "No upcoming exam is scheduled",
  "groups.examSoon": "Exam approaching",
  "groups.periodActive": "Current semester",
  "groups.open": "Open group {group}",
  "groups.emptyTitle": "No active group is assigned to you",
  "groups.emptyDescription": "Once a tutor assignment is created, the group will appear here automatically.",
  "exams.title": "Upcoming exams",
  "exams.description": "The nearest exams across your groups, ordered by date.",
  "exams.viewAll": "View all",
  "exams.emptyTitle": "No upcoming exams",
  "exams.emptyDescription": "No future exam schedule has been planned for the current semester yet.",
  "exams.room": "Room {room}",
  "exams.roomUnknown": "Room not assigned",
  "exams.today": "Today",
  "exams.tomorrow": "Tomorrow",
  "exams.inDays": "In {count} days",
  "quick.title": "Quick access",
  "quick.description": "Open the tutor work areas you use most often.",
  "quick.groups": "Groups",
  "quick.groupsHint": "Group and course information",
  "quick.journal": "Digital journal",
  "quick.journalHint": "Monitoring view only",
  "quick.exams": "Exams",
  "quick.examsHint": "Manage the exam schedule",
  "common.courseUnknown": "Course",
  "common.groupUnknown": "Group",
  "common.user": "User",
  "common.retry": "Try again",
  "error.title": "Home page could not be loaded",
  "error.description": "An error occurred while loading tutor data. Please try again.",
};

const ru: Dict = {
  "meta.title": "Главная тьютора",
  "hero.badge": "Академическое сопровождение",
  "hero.greeting": "Здравствуйте, {name}",
  "hero.description": "Просматривайте академическую картину назначенных вам групп за текущий семестр в одном месте.",
  "hero.role": "Тьютор",
  "hero.period": "{year} · {semester}",
  "hero.periodUnknown": "Текущий учебный период не настроен",
  "metric.groups": "Активные группы",
  "metric.students": "Уникальные студенты",
  "metric.courses": "Активные предметы",
  "metric.exams": "Ближайшие экзамены",
  "groups.title": "Мои группы",
  "groups.description": "Только назначенные вам активные группы и данные текущего семестра.",
  "groups.studentCount": "{count} студентов",
  "groups.courseCount": "{count} предметов",
  "groups.nextExam": "Следующий экзамен: {date}",
  "groups.noExam": "Ближайший экзамен не запланирован",
  "groups.examSoon": "Экзамен приближается",
  "groups.periodActive": "Текущий семестр",
  "groups.open": "Открыть группу {group}",
  "groups.emptyTitle": "Вам не назначена активная группа",
  "groups.emptyDescription": "После назначения тьютора группа автоматически появится на этой странице.",
  "exams.title": "Ближайшие экзамены",
  "exams.description": "Ближайшие экзамены ваших групп в хронологическом порядке.",
  "exams.viewAll": "Смотреть все",
  "exams.emptyTitle": "Ближайших экзаменов нет",
  "exams.emptyDescription": "На текущий семестр будущие экзамены пока не запланированы.",
  "exams.room": "Аудитория {room}",
  "exams.roomUnknown": "Аудитория не указана",
  "exams.today": "Сегодня",
  "exams.tomorrow": "Завтра",
  "exams.inDays": "Через {count} дн.",
  "quick.title": "Быстрый доступ",
  "quick.description": "Переходите напрямую к основным рабочим разделам тьютора.",
  "quick.groups": "Группы",
  "quick.groupsHint": "Группы и предметы",
  "quick.journal": "Цифровой журнал",
  "quick.journalHint": "Только мониторинг",
  "quick.exams": "Экзамены",
  "quick.examsHint": "Управление расписанием экзаменов",
  "common.courseUnknown": "Предмет",
  "common.groupUnknown": "Группа",
  "common.user": "Пользователь",
  "common.retry": "Повторить",
  "error.title": "Не удалось загрузить главную страницу",
  "error.description": "При загрузке данных тьютора произошла ошибка. Попробуйте ещё раз.",
};

const tr: Dict = {
  "meta.title": "Tutor ana sayfası",
  "hero.badge": "Akademik rehberlik",
  "hero.greeting": "Merhaba, {name}",
  "hero.description": "Atandığınız grupların mevcut dönem akademik durumunu tek bakışta izleyin.",
  "hero.role": "Tutor",
  "hero.period": "{year} · {semester}",
  "hero.periodUnknown": "Güncel akademik dönem ayarlanmamış",
  "metric.groups": "Aktif grup",
  "metric.students": "Benzersiz öğrenci",
  "metric.courses": "Aktif ders",
  "metric.exams": "Yaklaşan sınav",
  "groups.title": "Gruplarım",
  "groups.description": "Yalnızca size atanmış aktif gruplar ve mevcut dönem verileri.",
  "groups.studentCount": "{count} öğrenci",
  "groups.courseCount": "{count} ders",
  "groups.nextExam": "Sonraki sınav: {date}",
  "groups.noExam": "Yaklaşan sınav planlanmamış",
  "groups.examSoon": "Sınav yaklaşıyor",
  "groups.periodActive": "Mevcut dönem",
  "groups.open": "{group} grubunu aç",
  "groups.emptyTitle": "Size aktif bir grup atanmamış",
  "groups.emptyDescription": "Tutor ataması oluşturulduğunda grup burada otomatik olarak görünür.",
  "exams.title": "Yaklaşan sınavlar",
  "exams.description": "Gruplarınızdaki en yakın sınavlar tarih sırasıyla.",
  "exams.viewAll": "Tümünü gör",
  "exams.emptyTitle": "Yaklaşan sınav yok",
  "exams.emptyDescription": "Mevcut dönem için gelecekteki sınav programı henüz planlanmamış.",
  "exams.room": "Oda {room}",
  "exams.roomUnknown": "Oda atanmamış",
  "exams.today": "Bugün",
  "exams.tomorrow": "Yarın",
  "exams.inDays": "{count} gün sonra",
  "quick.title": "Hızlı erişim",
  "quick.description": "En sık kullandığınız tutor çalışma alanlarına doğrudan geçin.",
  "quick.groups": "Gruplar",
  "quick.groupsHint": "Grup ve ders bilgileri",
  "quick.journal": "Dijital jurnal",
  "quick.journalHint": "Yalnızca izleme görünümü",
  "quick.exams": "Sınavlar",
  "quick.examsHint": "Sınav programını yönetin",
  "common.courseUnknown": "Ders",
  "common.groupUnknown": "Grup",
  "common.user": "Kullanıcı",
  "common.retry": "Tekrar dene",
  "error.title": "Ana sayfa yüklenemedi",
  "error.description": "Tutor verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
};

const dictionaries: Record<Locale, Dict> = { az, en, ru, tr };
const localeTags: Record<Locale, string> = { az: "az-AZ", en: "en-US", ru: "ru-RU", tr: "tr-TR" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function useTutorHomeI18n() {
  const { locale } = useI18n();
  const t = useCallback(
    (key: TutorHomeKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? en[key] ?? key, vars),
    [locale],
  );
  const formatHeroDate = useCallback(
    (value: Date) => new Intl.DateTimeFormat(localeTags[locale], {
      timeZone: "Asia/Baku",
      day: "numeric",
      month: "long",
      weekday: "long",
    }).format(value),
    [locale],
  );
  const formatExamDate = useCallback(
    (value: string) => new Intl.DateTimeFormat(localeTags[locale], {
      timeZone: "Asia/Baku",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00+04:00`)),
    [locale],
  );
  return { locale, t, formatHeroDate, formatExamDate };
}
