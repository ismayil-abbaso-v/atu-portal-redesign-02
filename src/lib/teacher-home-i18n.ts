import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  greeting: "Salam, {name} 👋",
  teacherFallback: "müəllim",
  todayCount: "Bu gün {count} dərsiniz var.",
  todayNone: "Bu gün üçün dərsiniz yoxdur.",
  nextLessonAt: "Növbəti dərsiniz saat {time}-dadır.",
  noUpcomingLesson: "Yaxın vaxt üçün yeni dərs planlaşdırılmayıb.",
  activeGroups: "Aktiv qrup",
  currentCourses: "Cari fənn",
  todayLessons: "Bugünkü dərs",
  nextLesson: "Növbəti dərs",
  groupsTitle: "Mənim qruplarım",
  groupsHint: "Yalnız cari semestrdə real olaraq dərs dediyiniz qruplar göstərilir.",
  selectedGroup: "{group} üzrə fənləriniz",
  selectedGroupHint: "Fənni seçərək həmin qrup üçün müəllim iş panelinə keçin.",
  todayScheduleTitle: "Bugünkü dərslər",
  todayScheduleHint: "Cari dərs başlayıbsa jurnalı bir toxunuşla aça bilərsiniz.",
  noTodayTitle: "Bu gün dərsiniz yoxdur",
  noTodayDescription: "Cari semestr üzrə bu gün sizə təyin edilmiş dərs sessiyası tapılmadı.",
  activeNow: "Dərs davam edir",
  startsAt: "{time}-da başlayır",
  completed: "Tamamlandı",
  openJournal: "Jurnalı aç",
  groupToday: "Bu gün {time}",
  groupNoToday: "Bu gün dərs yoxdur",
  groupNext: "Yaxın dərs: {date} · {time}",
  groupNoNext: "Yaxın dərs planlaşdırılmayıb",
  loadErrorTitle: "Müəllim paneli yüklənmədi",
  loadErrorDescription: "Cari tədris məlumatları alınarkən xəta baş verdi. Məlumatlar dəyişdirilməyib.",
  retry: "Yenidən yoxla",
  semesterFall: "Payız semestri",
  semesterSpring: "Yaz semestri",
  lessonLecture: "Mühazirə",
  lessonSeminar: "Seminar",
  lessonLaboratory: "Laboratoriya",
  lessonPractice: "Məşğələ",
  lessonIndependent: "Sərbəst iş",
  lessonColloquium: "Kollokvium",
  lessonGeneric: "Dərs",
  roomUnknown: "Otaq göstərilməyib",
} as const;

export type TeacherHomeKey = keyof typeof az;
export type TeacherHomeVars = Vars;
type Dict = Record<TeacherHomeKey, string>;

const tr: Dict = {
  greeting: "Merhaba, {name} 👋", teacherFallback: "öğretmen", todayCount: "Bugün {count} dersiniz var.", todayNone: "Bugün dersiniz yok.", nextLessonAt: "Sonraki dersiniz saat {time}'da.", noUpcomingLesson: "Yakın zamanda planlanmış yeni ders yok.", activeGroups: "Aktif grup", currentCourses: "Güncel ders", todayLessons: "Bugünkü ders", nextLesson: "Sonraki ders", groupsTitle: "Gruplarım", groupsHint: "Yalnızca mevcut dönemde gerçekten ders verdiğiniz gruplar gösterilir.", selectedGroup: "{group} dersleriniz", selectedGroupHint: "Dersi seçerek bu grup için öğretmen çalışma alanını açın.", todayScheduleTitle: "Bugünkü dersler", todayScheduleHint: "Ders başladıysa günlüğü tek dokunuşla açabilirsiniz.", noTodayTitle: "Bugün dersiniz yok", noTodayDescription: "Mevcut dönem için bugün size atanmış bir ders oturumu bulunamadı.", activeNow: "Ders devam ediyor", startsAt: "{time}'da başlıyor", completed: "Tamamlandı", openJournal: "Günlüğü aç", groupToday: "Bugün {time}", groupNoToday: "Bugün ders yok", groupNext: "Yakın ders: {date} · {time}", groupNoNext: "Yakın ders planlanmadı", loadErrorTitle: "Öğretmen paneli yüklenemedi", loadErrorDescription: "Güncel eğitim verileri alınırken bir hata oluştu. Hiçbir veri değiştirilmedi.", retry: "Tekrar dene", semesterFall: "Güz dönemi", semesterSpring: "Bahar dönemi", lessonLecture: "Ders anlatımı", lessonSeminar: "Seminer", lessonLaboratory: "Laboratuvar", lessonPractice: "Uygulama", lessonIndependent: "Bağımsız çalışma", lessonColloquium: "Kolokyum", lessonGeneric: "Ders", roomUnknown: "Oda belirtilmedi",
};

const en: Dict = {
  greeting: "Hello, {name} 👋", teacherFallback: "teacher", todayCount: "You have {count} lessons today.", todayNone: "You have no lessons today.", nextLessonAt: "Your next lesson starts at {time}.", noUpcomingLesson: "No upcoming lesson is currently scheduled.", activeGroups: "Active groups", currentCourses: "Current courses", todayLessons: "Today's lessons", nextLesson: "Next lesson", groupsTitle: "My groups", groupsHint: "Only groups you actually teach in the current semester are shown.", selectedGroup: "Your courses in {group}", selectedGroupHint: "Choose a course to open the teacher workspace for this group.", todayScheduleTitle: "Today's lessons", todayScheduleHint: "When a lesson is active, you can open its journal in one tap.", noTodayTitle: "No lessons today", noTodayDescription: "No lesson session assigned to you was found for today in the current semester.", activeNow: "Lesson in progress", startsAt: "Starts at {time}", completed: "Completed", openJournal: "Open journal", groupToday: "Today at {time}", groupNoToday: "No lesson today", groupNext: "Next lesson: {date} · {time}", groupNoNext: "No upcoming lesson scheduled", loadErrorTitle: "Teacher dashboard could not be loaded", loadErrorDescription: "An error occurred while loading current academic data. No data was changed.", retry: "Try again", semesterFall: "Fall semester", semesterSpring: "Spring semester", lessonLecture: "Lecture", lessonSeminar: "Seminar", lessonLaboratory: "Laboratory", lessonPractice: "Practice", lessonIndependent: "Independent work", lessonColloquium: "Colloquium", lessonGeneric: "Lesson", roomUnknown: "Room not specified",
};

const ru: Dict = {
  greeting: "Здравствуйте, {name} 👋", teacherFallback: "преподаватель", todayCount: "Сегодня у вас занятий: {count}.", todayNone: "Сегодня у вас нет занятий.", nextLessonAt: "Следующее занятие начнётся в {time}.", noUpcomingLesson: "Ближайшие занятия пока не запланированы.", activeGroups: "Активные группы", currentCourses: "Текущие предметы", todayLessons: "Занятия сегодня", nextLesson: "Следующее занятие", groupsTitle: "Мои группы", groupsHint: "Показаны только группы, в которых вы действительно преподаёте в текущем семестре.", selectedGroup: "Ваши предметы в группе {group}", selectedGroupHint: "Выберите предмет, чтобы открыть рабочую панель преподавателя для этой группы.", todayScheduleTitle: "Занятия сегодня", todayScheduleHint: "Если занятие уже идёт, журнал можно открыть одним нажатием.", noTodayTitle: "Сегодня занятий нет", noTodayDescription: "В текущем семестре на сегодня не найдено назначенных вам занятий.", activeNow: "Занятие идёт", startsAt: "Начнётся в {time}", completed: "Завершено", openJournal: "Открыть журнал", groupToday: "Сегодня в {time}", groupNoToday: "Сегодня занятий нет", groupNext: "Ближайшее занятие: {date} · {time}", groupNoNext: "Ближайших занятий нет", loadErrorTitle: "Не удалось загрузить кабинет преподавателя", loadErrorDescription: "При загрузке текущих учебных данных произошла ошибка. Данные не изменялись.", retry: "Повторить", semesterFall: "Осенний семестр", semesterSpring: "Весенний семестр", lessonLecture: "Лекция", lessonSeminar: "Семинар", lessonLaboratory: "Лабораторная", lessonPractice: "Практика", lessonIndependent: "Самостоятельная работа", lessonColloquium: "Коллоквиум", lessonGeneric: "Занятие", roomUnknown: "Аудитория не указана",
};

const dictionaries: Record<Locale, Dict> = { az, tr, en, ru };
const localeTags: Record<Locale, string> = { az: "az-AZ", tr: "tr-TR", en: "en-US", ru: "ru-RU" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function useTeacherHomeI18n() {
  const { locale, t: rootT } = useI18n();
  const t = useCallback((key: TeacherHomeKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? az[key], vars), [locale]);
  const formatLongDate = useCallback((value: string | number | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(value)), [locale]);
  const formatShortDate = useCallback((value: string | number | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit" }).format(new Date(value)), [locale]);
  return { locale, t, formatLongDate, formatShortDate, appName: rootT("app.name") };
}
