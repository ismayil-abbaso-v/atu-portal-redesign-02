import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  title: "İmtahanlar",
  subtitle: "Yalnız sizə təyin edilmiş cari fənnlərin imtahan cədvəli və tələbə balları.",
  schedule: "İmtahan cədvəli",
  scheduleEmpty: "Seçilmiş fənn üçün imtahan cədvəli hələ yaradılmayıb.",
  course: "Fənn",
  group: "Qrup",
  room: "Otaq",
  date: "Tarix",
  time: "Saat",
  gradingTitle: "İmtahan ballarının daxil edilməsi",
  gradingHint: "Semestr balı Elektron Jurnaldan serverdə hesablanır. Səlahiyyətli idarəçi 0–50 aralığında imtahan balını daxil edə bilər.",
  monitoringTitle: "İmtahan nəticələrinin monitorinqi",
  monitoringHint: "Bu bölmə yalnız baxış üçündür. Müəllim imtahan balını, semestr balını və yekun nəticəni heç bir halda dəyişə bilməz.",
  readOnly: "Yalnız monitorinq",
  readOnlyError: "Müəllim üçün imtahan nəticələri yalnız baxış rejimindədir.",
  student: "Tələbə",
  semesterScore: "Semestr balı",
  examScore: "İmtahan balı",
  finalScore: "Yekun",
  noCourses: "Cari semestr üzrə sizə təyin edilmiş fənn yoxdur.",
  noStudents: "Bu fənn üzrə cari tələbə tapılmadı.",
  saveAll: "İmtahan ballarını yadda saxla",
  saving: "Yadda saxlanılır...",
  saved: "Yadda saxlanıldı",
  saveError: "Ballar yadda saxlanılmadı.",
  pending: "Yadda saxlanılmamış dəyişiklik var",
  noChanges: "Yadda saxlanılacaq dəyişiklik yoxdur.",
  rangeError: "{student}: imtahan balı 0–50 aralığında olmalıdır.",
  academicPeriod: "{year} · {semester}",
  fall: "Payız semestri",
  spring: "Yaz semestri",
  calendar: "Təqvimə bax",
} as const;

export type TeacherExamKey = keyof typeof az;
type Dict = Record<TeacherExamKey, string>;

const tr: Dict = {
  title: "Sınavlar",
  subtitle: "Yalnızca size atanmış güncel derslerin sınav programı ve öğrenci notları.",
  schedule: "Sınav programı",
  scheduleEmpty: "Seçili ders için henüz sınav programı oluşturulmadı.",
  course: "Ders",
  group: "Grup",
  room: "Derslik",
  date: "Tarih",
  time: "Saat",
  gradingTitle: "Sınav notu girişi",
  gradingHint: "Dönem puanı Elektronik Günlükten sunucuda hesaplanır. Yetkili yönetici 0–50 arası sınav notunu girebilir.",
  monitoringTitle: "Sınav sonuçları izleme",
  monitoringHint: "Bu bölüm yalnızca görüntüleme içindir. Öğretmen sınav notunu, dönem puanını veya toplam sonucu hiçbir koşulda değiştiremez.",
  readOnly: "Yalnızca izleme",
  readOnlyError: "Öğretmen için sınav sonuçları yalnızca görüntüleme modundadır.",
  student: "Öğrenci",
  semesterScore: "Dönem puanı",
  examScore: "Sınav puanı",
  finalScore: "Toplam",
  noCourses: "Mevcut dönemde size atanmış ders yok.",
  noStudents: "Bu ders için güncel öğrenci bulunamadı.",
  saveAll: "Sınav notlarını kaydet",
  saving: "Kaydediliyor...",
  saved: "Kaydedildi",
  saveError: "Notlar kaydedilemedi.",
  pending: "Kaydedilmemiş değişiklik var",
  noChanges: "Kaydedilecek değişiklik yok.",
  rangeError: "{student}: sınav notu 0–50 arasında olmalıdır.",
  academicPeriod: "{year} · {semester}",
  fall: "Güz dönemi",
  spring: "Bahar dönemi",
  calendar: "Takvimi aç",
};

const en: Dict = {
  title: "Exams",
  subtitle: "Exam schedule and student scores only for your currently assigned courses.",
  schedule: "Exam schedule",
  scheduleEmpty: "No exam has been scheduled for the selected course yet.",
  course: "Course",
  group: "Group",
  room: "Room",
  date: "Date",
  time: "Time",
  gradingTitle: "Exam score entry",
  gradingHint: "The semester score is calculated on the server from the Electronic Journal. An authorized administrator may enter the 0–50 exam score.",
  monitoringTitle: "Exam results monitoring",
  monitoringHint: "This section is view-only. A teacher cannot change the exam score, semester score, or final result under any circumstances.",
  readOnly: "Monitoring only",
  readOnlyError: "Exam results are view-only for teachers.",
  student: "Student",
  semesterScore: "Semester score",
  examScore: "Exam score",
  finalScore: "Final",
  noCourses: "You have no assigned courses in the current semester.",
  noStudents: "No current students were found for this course.",
  saveAll: "Save exam scores",
  saving: "Saving...",
  saved: "Saved",
  saveError: "Exam scores were not saved.",
  pending: "There are unsaved changes",
  noChanges: "There are no changes to save.",
  rangeError: "{student}: exam score must be between 0 and 50.",
  academicPeriod: "{year} · {semester}",
  fall: "Fall semester",
  spring: "Spring semester",
  calendar: "Open calendar",
};

const ru: Dict = {
  title: "Экзамены",
  subtitle: "Расписание экзаменов и оценки только по предметам, назначенным вам в текущем семестре.",
  schedule: "Расписание экзаменов",
  scheduleEmpty: "Для выбранного предмета экзамен пока не запланирован.",
  course: "Предмет",
  group: "Группа",
  room: "Аудитория",
  date: "Дата",
  time: "Время",
  gradingTitle: "Ввод экзаменационных баллов",
  gradingHint: "Семестровый балл рассчитывается сервером из Электронного журнала. Уполномоченный администратор может ввести экзаменационный балл 0–50.",
  monitoringTitle: "Мониторинг результатов экзамена",
  monitoringHint: "Этот раздел доступен только для просмотра. Преподаватель ни при каких условиях не может изменить экзаменационный, семестровый или итоговый балл.",
  readOnly: "Только мониторинг",
  readOnlyError: "Для преподавателя результаты экзамена доступны только для просмотра.",
  student: "Студент",
  semesterScore: "Семестровый балл",
  examScore: "Экзаменационный балл",
  finalScore: "Итог",
  noCourses: "В текущем семестре вам не назначены предметы.",
  noStudents: "По этому предмету нет текущих студентов.",
  saveAll: "Сохранить экзаменационные баллы",
  saving: "Сохранение...",
  saved: "Сохранено",
  saveError: "Экзаменационные баллы не сохранены.",
  pending: "Есть несохранённые изменения",
  noChanges: "Нет изменений для сохранения.",
  rangeError: "{student}: экзаменационный балл должен быть от 0 до 50.",
  academicPeriod: "{year} · {semester}",
  fall: "Осенний семестр",
  spring: "Весенний семестр",
  calendar: "Открыть календарь",
};

const dictionaries: Record<Locale, Dict> = { az, tr, en, ru };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return Object.entries(vars).reduce((value, [key, replacement]) => value.replaceAll(`{${key}}`, String(replacement)), template);
}

export function useTeacherExamI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: TeacherExamKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? az[key], vars), [locale]);
  return { locale, t };
}
