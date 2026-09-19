import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  "meta.title": "Rəqəmsal jurnal monitorinqi",
  "meta.description": "Tyutor üçün təyin edilmiş qrupların rəqəmsal jurnal məlumatlarının yalnız oxu rejimində monitorinqi.",
  "page.title": "Rəqəmsal jurnal monitorinqi",
  "page.description": "Dərs sessiyalarını, davamiyyəti və qiymətləndirmələri dəyişiklik etmədən izləyin.",
  "page.readOnly": "Yalnız oxu rejimi",
  "page.readOnlyHint": "Tyutor bu səhifədə qiymət, davamiyyət, laboratoriya təhvili və jurnal statusunu dəyişə bilməz.",
  "selector.group": "Qrup",
  "selector.course": "Fənn",
  "selector.session": "Sessiya",
  "selector.chooseSession": "Sessiya seçin",
  "summary.students": "Tələbə",
  "summary.courses": "Cari fənn",
  "summary.sessions": "Sessiya",
  "summary.confirmed": "Təsdiqlənmiş",
  "tabs.daily": "Dərs sessiyaları",
  "tabs.independent": "Sərbəst iş",
  "tabs.colloquium": "Kollokvium",
  "tabs.coursework": "Kurs işi",
  "sessions.title": "Dərs sessiyaları",
  "sessions.description": "Keçmiş, bu gün və gələcək sessiyalar tarix sırası ilə göstərilir.",
  "sessions.all": "Hamısı",
  "sessions.past": "Keçmiş",
  "sessions.today": "Bu gün",
  "sessions.future": "Gələcək",
  "sessions.confirmed": "Təsdiqlənib",
  "sessions.pending": "Gözləyir",
  "sessions.topicMissing": "Mövzu qeyd edilməyib",
  "sessions.teacherMissing": "Müəllim məlumatı yoxdur",
  "sessions.none": "Seçilmiş fənn üçün dərs sessiyası tapılmadı.",
  "session.detail": "Sessiya detalları",
  "session.confirmedJournal": "Təsdiqlənmiş jurnal",
  "session.pendingJournal": "Jurnal hələ təsdiqlənməyib",
  "session.studentSearch": "Tələbə axtar...",
  "session.noStudents": "Bu qrupda tələbə tapılmadı.",
  "session.noMatches": "Axtarışa uyğun tələbə tapılmadı.",
  "student.student": "Tələbə",
  "student.attendance": "Davamiyyət",
  "student.grade": "Qiymət",
  "student.lab": "Lab təhvili",
  "student.file": "Fayl",
  "student.present": "İştirak edib",
  "student.absent": "Qayıb",
  "student.notMarked": "Qeyd edilməyib",
  "student.labSubmitted": "Təhvil verilib",
  "student.labNotSubmitted": "Təhvil verilməyib",
  "student.openFile": "Fayla bax",
  "student.fileError": "Fayl açıla bilmədi.",
  "assessment.student": "Tələbə",
  "assessment.ordinal": "Sıra",
  "assessment.topic": "Mövzu",
  "assessment.grade": "Qiymət",
  "assessment.status": "Status",
  "assessment.date": "Tarix",
  "assessment.file": "Fayl",
  "assessment.noneIndependent": "Bu fənn üzrə sərbəst iş qiymətləndirməsi yoxdur.",
  "assessment.noneColloquium": "Bu fənn üzrə kollokvium qiymətləndirməsi yoxdur.",
  "assessment.noneCoursework": "Bu fənn üzrə kurs işi qiymətləndirməsi yoxdur.",
  "assessment.waiting": "Gözləyir",
  "assessment.submitted": "Təqdim edilib",
  "assessment.graded": "Qiymətləndirilib",
  "lesson.muhazire": "Mühazirə",
  "lesson.seminar": "Seminar",
  "lesson.laboratoriya": "Laboratoriya",
  "lesson.serbest_is": "Sərbəst iş",
  "lesson.kollokvium": "Kollokvium",
  "lesson.tecrube": "Təcrübə",
  "lesson.qrup_dersi": "Qrup dərsi",
  "empty.noGroups": "Sizə tyutor kimi aktiv qrup təyin edilməyib.",
  "empty.noCourses": "Seçilmiş qrup üçün cari semestr fənni yoxdur.",
  "error.title": "Jurnal məlumatları yüklənmədi",
  "error.description": "Monitorinq məlumatları alınarkən xəta baş verdi.",
  "common.retry": "Yenidən cəhd et",
  "common.loading": "Yüklənir...",
  "common.unknown": "Məlum deyil",
  "common.none": "—",
} as const;

export type TutorJournalKey = keyof typeof az;
type Dict = Record<TutorJournalKey, string>;

const en: Dict = {
  "meta.title": "Digital journal monitoring", "meta.description": "Read-only monitoring of digital journal data for groups assigned to the tutor.",
  "page.title": "Digital journal monitoring", "page.description": "Monitor lesson sessions, attendance and assessments without changing academic data.", "page.readOnly": "Read-only", "page.readOnlyHint": "Tutors cannot change grades, attendance, lab submission or journal state on this page.",
  "selector.group": "Group", "selector.course": "Course", "selector.session": "Session", "selector.chooseSession": "Select a session",
  "summary.students": "Students", "summary.courses": "Current courses", "summary.sessions": "Sessions", "summary.confirmed": "Confirmed",
  "tabs.daily": "Lesson sessions", "tabs.independent": "Independent work", "tabs.colloquium": "Colloquium", "tabs.coursework": "Coursework",
  "sessions.title": "Lesson sessions", "sessions.description": "Past, today and future sessions are shown in date order.", "sessions.all": "All", "sessions.past": "Past", "sessions.today": "Today", "sessions.future": "Future", "sessions.confirmed": "Confirmed", "sessions.pending": "Pending", "sessions.topicMissing": "No topic recorded", "sessions.teacherMissing": "Teacher information unavailable", "sessions.none": "No lesson sessions were found for the selected course.",
  "session.detail": "Session details", "session.confirmedJournal": "Confirmed journal", "session.pendingJournal": "Journal is not confirmed yet", "session.studentSearch": "Search students...", "session.noStudents": "No students were found in this group.", "session.noMatches": "No students match your search.",
  "student.student": "Student", "student.attendance": "Attendance", "student.grade": "Grade", "student.lab": "Lab submission", "student.file": "File", "student.present": "Present", "student.absent": "Absent", "student.notMarked": "Not recorded", "student.labSubmitted": "Submitted", "student.labNotSubmitted": "Not submitted", "student.openFile": "Open file", "student.fileError": "The file could not be opened.",
  "assessment.student": "Student", "assessment.ordinal": "No.", "assessment.topic": "Topic", "assessment.grade": "Grade", "assessment.status": "Status", "assessment.date": "Date", "assessment.file": "File", "assessment.noneIndependent": "There are no independent-work assessments for this course.", "assessment.noneColloquium": "There are no colloquium assessments for this course.", "assessment.noneCoursework": "There are no coursework assessments for this course.", "assessment.waiting": "Waiting", "assessment.submitted": "Submitted", "assessment.graded": "Graded",
  "lesson.muhazire": "Lecture", "lesson.seminar": "Seminar", "lesson.laboratoriya": "Laboratory", "lesson.serbest_is": "Independent work", "lesson.kollokvium": "Colloquium", "lesson.tecrube": "Practice", "lesson.qrup_dersi": "Group lesson",
  "empty.noGroups": "No active group is assigned to you as tutor.", "empty.noCourses": "There are no current-semester courses for the selected group.", "error.title": "Journal data could not be loaded", "error.description": "An error occurred while loading monitoring data.", "common.retry": "Try again", "common.loading": "Loading...", "common.unknown": "Unknown", "common.none": "—",
};

const tr: Dict = {
  "meta.title": "Dijital jurnal izleme", "meta.description": "Tutora atanmış grupların dijital jurnal verilerinin salt okunur izlenmesi.",
  "page.title": "Dijital jurnal izleme", "page.description": "Ders oturumlarını, devamlılığı ve değerlendirmeleri akademik verileri değiştirmeden izleyin.", "page.readOnly": "Salt okunur", "page.readOnlyHint": "Tutor bu sayfada not, devamlılık, laboratuvar teslimi veya jurnal durumunu değiştiremez.",
  "selector.group": "Grup", "selector.course": "Ders", "selector.session": "Oturum", "selector.chooseSession": "Oturum seçin",
  "summary.students": "Öğrenci", "summary.courses": "Güncel ders", "summary.sessions": "Oturum", "summary.confirmed": "Onaylı",
  "tabs.daily": "Ders oturumları", "tabs.independent": "Bağımsız çalışma", "tabs.colloquium": "Kolokyum", "tabs.coursework": "Ders projesi",
  "sessions.title": "Ders oturumları", "sessions.description": "Geçmiş, bugün ve gelecek oturumlar tarih sırasıyla gösterilir.", "sessions.all": "Tümü", "sessions.past": "Geçmiş", "sessions.today": "Bugün", "sessions.future": "Gelecek", "sessions.confirmed": "Onaylandı", "sessions.pending": "Bekliyor", "sessions.topicMissing": "Konu girilmemiş", "sessions.teacherMissing": "Öğretmen bilgisi yok", "sessions.none": "Seçilen ders için oturum bulunamadı.",
  "session.detail": "Oturum ayrıntıları", "session.confirmedJournal": "Onaylanmış jurnal", "session.pendingJournal": "Jurnal henüz onaylanmadı", "session.studentSearch": "Öğrenci ara...", "session.noStudents": "Bu grupta öğrenci bulunamadı.", "session.noMatches": "Aramanızla eşleşen öğrenci yok.",
  "student.student": "Öğrenci", "student.attendance": "Devamlılık", "student.grade": "Not", "student.lab": "Lab teslimi", "student.file": "Dosya", "student.present": "Katıldı", "student.absent": "Devamsız", "student.notMarked": "Kaydedilmedi", "student.labSubmitted": "Teslim edildi", "student.labNotSubmitted": "Teslim edilmedi", "student.openFile": "Dosyayı aç", "student.fileError": "Dosya açılamadı.",
  "assessment.student": "Öğrenci", "assessment.ordinal": "Sıra", "assessment.topic": "Konu", "assessment.grade": "Not", "assessment.status": "Durum", "assessment.date": "Tarih", "assessment.file": "Dosya", "assessment.noneIndependent": "Bu ders için bağımsız çalışma değerlendirmesi yok.", "assessment.noneColloquium": "Bu ders için kolokyum değerlendirmesi yok.", "assessment.noneCoursework": "Bu ders için ders projesi değerlendirmesi yok.", "assessment.waiting": "Bekliyor", "assessment.submitted": "Teslim edildi", "assessment.graded": "Notlandırıldı",
  "lesson.muhazire": "Ders", "lesson.seminar": "Seminer", "lesson.laboratoriya": "Laboratuvar", "lesson.serbest_is": "Bağımsız çalışma", "lesson.kollokvium": "Kolokyum", "lesson.tecrube": "Uygulama", "lesson.qrup_dersi": "Grup dersi",
  "empty.noGroups": "Size tutor olarak aktif grup atanmamış.", "empty.noCourses": "Seçilen grup için güncel dönem dersi yok.", "error.title": "Jurnal verileri yüklenemedi", "error.description": "İzleme verileri yüklenirken bir hata oluştu.", "common.retry": "Tekrar dene", "common.loading": "Yükleniyor...", "common.unknown": "Bilinmiyor", "common.none": "—",
};

const ru: Dict = {
  "meta.title": "Мониторинг цифрового журнала", "meta.description": "Просмотр данных цифрового журнала назначенных тьютору групп только для чтения.",
  "page.title": "Мониторинг цифрового журнала", "page.description": "Просматривайте занятия, посещаемость и оценки без изменения академических данных.", "page.readOnly": "Только чтение", "page.readOnlyHint": "Тьютор не может изменять оценки, посещаемость, сдачу лабораторных или состояние журнала на этой странице.",
  "selector.group": "Группа", "selector.course": "Дисциплина", "selector.session": "Занятие", "selector.chooseSession": "Выберите занятие",
  "summary.students": "Студенты", "summary.courses": "Текущие дисциплины", "summary.sessions": "Занятия", "summary.confirmed": "Подтверждено",
  "tabs.daily": "Занятия", "tabs.independent": "Самостоятельная работа", "tabs.colloquium": "Коллоквиум", "tabs.coursework": "Курсовая работа",
  "sessions.title": "Занятия", "sessions.description": "Прошедшие, сегодняшние и будущие занятия отображаются по дате.", "sessions.all": "Все", "sessions.past": "Прошедшие", "sessions.today": "Сегодня", "sessions.future": "Будущие", "sessions.confirmed": "Подтверждено", "sessions.pending": "Ожидает", "sessions.topicMissing": "Тема не указана", "sessions.teacherMissing": "Нет данных преподавателя", "sessions.none": "Для выбранной дисциплины занятия не найдены.",
  "session.detail": "Детали занятия", "session.confirmedJournal": "Подтвержденный журнал", "session.pendingJournal": "Журнал еще не подтвержден", "session.studentSearch": "Поиск студента...", "session.noStudents": "В группе нет студентов.", "session.noMatches": "По запросу студенты не найдены.",
  "student.student": "Студент", "student.attendance": "Посещаемость", "student.grade": "Оценка", "student.lab": "Лабораторная", "student.file": "Файл", "student.present": "Присутствовал", "student.absent": "Отсутствовал", "student.notMarked": "Не отмечено", "student.labSubmitted": "Сдано", "student.labNotSubmitted": "Не сдано", "student.openFile": "Открыть файл", "student.fileError": "Не удалось открыть файл.",
  "assessment.student": "Студент", "assessment.ordinal": "№", "assessment.topic": "Тема", "assessment.grade": "Оценка", "assessment.status": "Статус", "assessment.date": "Дата", "assessment.file": "Файл", "assessment.noneIndependent": "Нет оценок за самостоятельные работы по этой дисциплине.", "assessment.noneColloquium": "Нет оценок за коллоквиумы по этой дисциплине.", "assessment.noneCoursework": "Нет оценок за курсовую работу по этой дисциплине.", "assessment.waiting": "Ожидает", "assessment.submitted": "Сдано", "assessment.graded": "Оценено",
  "lesson.muhazire": "Лекция", "lesson.seminar": "Семинар", "lesson.laboratoriya": "Лаборатория", "lesson.serbest_is": "Самостоятельная работа", "lesson.kollokvium": "Коллоквиум", "lesson.tecrube": "Практика", "lesson.qrup_dersi": "Групповое занятие",
  "empty.noGroups": "Вам не назначена активная группа как тьютору.", "empty.noCourses": "Для выбранной группы нет дисциплин текущего семестра.", "error.title": "Не удалось загрузить журнал", "error.description": "Произошла ошибка при загрузке данных мониторинга.", "common.retry": "Повторить", "common.loading": "Загрузка...", "common.unknown": "Неизвестно", "common.none": "—",
};

const dictionaries: Record<Locale, Dict> = { az, en, tr, ru };
const intlLocales: Record<Locale, string> = { az: "az-AZ", en: "en-US", tr: "tr-TR", ru: "ru-RU" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? `{${key}}`));
}

export function tutorJournalTranslate(locale: Locale, key: TutorJournalKey, vars?: Vars) {
  return interpolate(dictionaries[locale][key] ?? az[key], vars);
}

export function useTutorJournalI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: TutorJournalKey, vars?: Vars) => tutorJournalTranslate(locale, key, vars), [locale]);
  return { locale, intlLocale: intlLocales[locale], t };
}
