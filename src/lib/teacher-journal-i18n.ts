import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  title: "Gündəlik jurnal",
  description: "Əvvəlki, cari və növbəti dərsləri tarix üzrə izləyin. Keçmiş jurnal yalnız baxış üçündür, cari dərs isə server vaxtına görə yalnız dərs intervalında redaktə olunur.",
  today: "Bu gün",
  past: "Keçmiş",
  future: "Növbəti",
  active: "Dərs aktivdir",
  locked: "Kilidlənib",
  autoConfirmed: "Avtomatik təsdiqlənib",
  confirmed: "Təsdiqlənib",
  notCompleted: "Doldurulmayıb",
  closing: "Bağlanır",
  draftSaved: "Qaralama saxlanılıb",
  noSessions: "Bu fənn üzrə dərs sessiyası tapılmadı",
  noSessionsHint: "Dərs cədvəli yaradıldıqda əvvəlki və növbəti dərslər burada avtomatik görünəcək.",
  days: "Dərs günləri",
  previousDay: "Əvvəlki gün",
  nextDay: "Növbəti gün",
  lessonsOnDay: "Bu gündə {count} dərs",
  lesson: "Dərs",
  lecture: "Mühazirə",
  seminar: "Seminar",
  laboratory: "Laboratoriya",
  practice: "Təcrübə",
  colloquium: "Kollokvium",
  independent: "Sərbəst iş",
  sessionDetails: "Dərs detalları",
  topic: "Mövzu",
  topicPlaceholder: "Bu gün keçirilən mövzunu yazın...",
  topicNotSet: "Mövzu qeyd edilməyib",
  student: "Tələbə",
  attendance: "Davamiyyət",
  assessment: "Qiymətləndirmə",
  present: "İştirak etdi",
  absent: "İştirak etmədi",
  grade: "Qiymət",
  gradeOptional: "Qiymət (istəyə bağlı)",
  labStatus: "Laboratoriya işi",
  submitted: "Təhvil verdi",
  notSubmitted: "Təhvil vermədi",
  labPresentSubmitted: "İştirak etdi — Təhvil verdi",
  labPresentNotSubmitted: "İştirak etdi — Təhvil vermədi",
  notSet: "Qeyd edilməyib",
  notApplicable: "Tətbiq edilmir",
  allPresent: "Hamısını iştirak etdi et",
  attendanceRequired: "Yadda saxlamaq üçün bütün tələbələrin davamiyyətini seçin.",
  labStatusRequired: "İştirak edən bütün tələbələr üçün laboratoriya təhvil statusunu seçin.",
  gradeRange: "{student}: qiymət 0–10 aralığında olmalıdır.",
  saveDraft: "Yadda saxla",
  saving: "Yadda saxlanılır...",
  saved: "Jurnal yadda saxlanıldı. Dərs bitənədək yenidən dəyişə bilərsiniz.",
  savedAt: "Son yadda saxlama: {time}",
  saveError: "Jurnal yadda saxlanılmadı. Dəyişikliklər serverə yazılmayıb.",
  networkSaveError: "Şəbəkə bağlantısı yoxdur. Jurnal serverə yazılmadı — internet bərpa olduqdan sonra yenidən cəhd edin.",
  confirmFinal: "Təsdiqlə",
  confirming: "Təsdiqlənir...",
  confirmPrompt: "Jurnalı təsdiqlədikdən sonra müəllim kimi yenidən dəyişə bilməyəcəksiniz. Davam edilsin?",
  confirmedSuccess: "Jurnal təsdiqləndi və kilidləndi.",
  confirmError: "Jurnal təsdiqlənmədi. Məlumatlar kilidlənməyib.",
  activeHint: "Davamiyyət hər tələbə üçün məcburidir. Qiymət uyğun dərs növlərində istəyə bağlıdır.",
  lectureHint: "Mühazirədə əsas əməliyyat davamiyyət qeydidir; gündəlik qiymət istifadə edilmir.",
  gradedHint: "Davamiyyəti qeyd edin. İştirak edən tələbəyə 0–10 qiymət yazmaq istəyə bağlıdır.",
  labHint: "Hər tələbə üçün üç sadə vəziyyətdən birini seçin. İştirak edən tələbəyə 0–10 qiymət yazmaq istəyə bağlıdır.",
  autoLockHint: "Yadda saxlanmış qaralama dərs bitəndə avtomatik təsdiqlənir. İstəsəniz dərs bitməzdən əvvəl “Təsdiqlə” ilə dərhal kilidləyə bilərsiniz.",
  pastHint: "Jurnal bağlanıb. Bütün məlumatlar dəyişdirilmədən yalnız baxış rejimində göstərilir.",
  futureHint: "Dərs hələ başlamayıb. Jurnal server vaxtına görə dərs intervalı başlayan kimi aktiv olacaq.",
  readOnly: "Yalnız baxış",
  studentsCount: "{count} tələbə",
  recorded: "Davamiyyət tamamdır",
  unrecorded: "Qeyd edilməyib",
  presentCount: "{count} iştirak",
  absentCount: "{count} qayıb",
  mobileHint: "Tələbə kartında davamiyyəti 1 toxunuşla seçin; lazım olarsa qiyməti daxil edin.",
  emptyRoster: "Bu sessiya üçün tələbə siyahısı yoxdur.",
  changesUnsaved: "Yadda saxlanılmamış dəyişiklik var",
  liveTime: "Canlı dərs vaxtı",
  room: "Otaq",
  teacher: "Müəllim",
  serverTime: "Server vaxtı",
  status: "Status",
  retry: "Yenidən yoxla",
  loadErrorTitle: "Jurnal məlumatları yüklənmədi",
  loadErrorDescription: "Sessiya və ya tələbə siyahısı alınmadı. Bağlantını yoxlayıb yenidən cəhd edin.",
  leaveWarning: "Jurnalda yadda saxlanılmamış dəyişikliklər var. Səhifədən çıxsanız bu dəyişikliklər itəcək. Davam edilsin?",
  saveStateUnsaved: "Dəyişikliklər hələ serverə yazılmayıb",
  saveStateReady: "Yadda saxlamağa hazırdır",
  saveStateLocked: "Jurnal kilidlənib",
  unsupportedLesson: "Bu dərs növü gündəlik jurnal redaktəsi üçün nəzərdə tutulmayıb.",
} as const;

export type TeacherJournalKey = keyof typeof az;
type Dict = Record<TeacherJournalKey, string>;

const tr: Dict = {
  title:"Günlük ders defteri",description:"Önceki, güncel ve sonraki dersleri tarihe göre izleyin. Geçmiş kayıtlar yalnızca görüntülenir; güncel ders sunucu saatına göre yalnız ders aralığında düzenlenir.",today:"Bugün",past:"Geçmiş",future:"Sonraki",active:"Ders aktif",locked:"Kilitli",autoConfirmed:"Otomatik onaylandı",confirmed:"Onaylandı",notCompleted:"Doldurulmadı",closing:"Kapanıyor",draftSaved:"Taslak kaydedildi",noSessions:"Bu ders için oturum bulunamadı",noSessionsHint:"Ders programı oluşturulduğunda önceki ve sonraki dersler burada otomatik görünür.",days:"Ders günleri",previousDay:"Önceki gün",nextDay:"Sonraki gün",lessonsOnDay:"Bu günde {count} ders",lesson:"Ders",lecture:"Ders",seminar:"Seminer",laboratory:"Laboratuvar",practice:"Uygulama",colloquium:"Kolokyum",independent:"Bağımsız çalışma",sessionDetails:"Ders ayrıntıları",topic:"Konu",topicPlaceholder:"Bugün işlenen konuyu yazın...",topicNotSet:"Konu girilmedi",student:"Öğrenci",attendance:"Devam durumu",assessment:"Değerlendirme",present:"Katıldı",absent:"Katılmadı",grade:"Not",gradeOptional:"Not (isteğe bağlı)",labStatus:"Laboratuvar çalışması",submitted:"Teslim etti",notSubmitted:"Teslim etmedi",labPresentSubmitted:"Katıldı — Teslim etti",labPresentNotSubmitted:"Katıldı — Teslim etmedi",notSet:"Belirtilmedi",notApplicable:"Uygulanmaz",allPresent:"Tümünü katıldı yap",attendanceRequired:"Kaydetmek için tüm öğrencilerin devam durumunu seçin.",labStatusRequired:"Katılan tüm öğrenciler için laboratuvar teslim durumunu seçin.",gradeRange:"{student}: not 0–10 arasında olmalıdır.",saveDraft:"Kaydet",saving:"Kaydediliyor...",saved:"Günlük kaydedildi. Ders bitene kadar tekrar değiştirebilirsiniz.",savedAt:"Son kayıt: {time}",saveError:"Günlük kaydedilmedi. Değişiklikler sunucuya yazılmadı.",networkSaveError:"Ağ bağlantısı yok. Günlük sunucuya yazılmadı; internet geri geldiğinde tekrar deneyin.",confirmFinal:"Onayla",confirming:"Onaylanıyor...",confirmPrompt:"Günlüğü onayladıktan sonra öğretmen olarak tekrar değiştiremezsiniz. Devam edilsin mi?",confirmedSuccess:"Günlük onaylandı ve kilitlendi.",confirmError:"Günlük onaylanamadı. Veriler kilitlenmedi.",activeHint:"Devam durumu her öğrenci için zorunludur. Uygun ders türlerinde not isteğe bağlıdır.",lectureHint:"Derste temel işlem devam kaydıdır; günlük not kullanılmaz.",gradedHint:"Devam durumunu kaydedin. Katılan öğrenciye 0–10 not vermek isteğe bağlıdır.",labHint:"Her öğrenci için üç basit durumdan birini seçin. Katılan öğrenciye 0–10 not vermek isteğe bağlıdır.",autoLockHint:"Kaydedilmiş taslak ders bitince otomatik onaylanır. İsterseniz ders bitmeden “Onayla” ile hemen kilitleyebilirsiniz.",pastHint:"Günlük kapandı. Tüm bilgiler yalnız görüntüleme modundadır.",futureHint:"Ders henüz başlamadı. Günlük sunucu saatına göre ders aralığı başlayınca etkinleşir.",readOnly:"Yalnız görüntüleme",studentsCount:"{count} öğrenci",recorded:"Devam tamam",unrecorded:"Kaydedilmedi",presentCount:"{count} katılım",absentCount:"{count} devamsız",mobileHint:"Öğrenci kartında devam durumunu tek dokunuşla seçin; gerekirse not girin.",emptyRoster:"Bu oturum için öğrenci listesi yok.",changesUnsaved:"Kaydedilmemiş değişiklik var",liveTime:"Canlı ders zamanı",room:"Oda",teacher:"Öğretmen",serverTime:"Sunucu saati",status:"Durum",retry:"Tekrar dene",loadErrorTitle:"Günlük bilgileri yüklenemedi",loadErrorDescription:"Oturum veya öğrenci listesi alınamadı. Bağlantıyı kontrol edip tekrar deneyin.",leaveWarning:"Günlükte kaydedilmemiş değişiklikler var. Sayfadan ayrılırsanız kaybolacak. Devam edilsin mi?",saveStateUnsaved:"Değişiklikler henüz sunucuya yazılmadı",saveStateReady:"Kaydetmeye hazır",saveStateLocked:"Günlük kilitli",unsupportedLesson:"Bu ders türü günlük düzenleme için tasarlanmamıştır."
};

const en: Dict = {
  title:"Daily journal",description:"Browse previous, current and upcoming lessons by date. Past journals are read-only; the current lesson is editable only inside its server-time interval.",today:"Today",past:"Past",future:"Upcoming",active:"Lesson is active",locked:"Locked",autoConfirmed:"Auto-confirmed",confirmed:"Confirmed",notCompleted:"Not completed",closing:"Closing",draftSaved:"Draft saved",noSessions:"No lesson sessions were found for this course",noSessionsHint:"Previous and upcoming lessons will appear here automatically once the timetable is generated.",days:"Lesson days",previousDay:"Previous day",nextDay:"Next day",lessonsOnDay:"{count} lessons on this day",lesson:"Lesson",lecture:"Lecture",seminar:"Seminar",laboratory:"Laboratory",practice:"Practice",colloquium:"Colloquium",independent:"Independent work",sessionDetails:"Lesson details",topic:"Topic",topicPlaceholder:"Enter today's lesson topic...",topicNotSet:"No topic recorded",student:"Student",attendance:"Attendance",assessment:"Assessment",present:"Present",absent:"Absent",grade:"Grade",gradeOptional:"Grade (optional)",labStatus:"Laboratory work",submitted:"Submitted",notSubmitted:"Not submitted",labPresentSubmitted:"Present — Submitted",labPresentNotSubmitted:"Present — Not submitted",notSet:"Not recorded",notApplicable:"Not applicable",allPresent:"Mark all present",attendanceRequired:"Select attendance for every student before saving.",labStatusRequired:"Select a laboratory submission status for every present student.",gradeRange:"{student}: grade must be between 0 and 10.",saveDraft:"Save",saving:"Saving...",saved:"Journal saved. You can keep editing until the lesson ends.",savedAt:"Last saved: {time}",saveError:"The journal was not saved. Your changes were not written to the server.",networkSaveError:"There is no network connection. The journal was not written to the server; retry after reconnecting.",confirmFinal:"Confirm",confirming:"Confirming...",confirmPrompt:"After confirmation you cannot edit this journal as a teacher. Continue?",confirmedSuccess:"Journal confirmed and locked.",confirmError:"The journal was not confirmed. The data remains unlocked.",activeHint:"Attendance is required for every student. Grades are optional for supported lesson types.",lectureHint:"Lecture sessions are attendance-first; daily grades are not used.",gradedHint:"Record attendance. A 0–10 grade is optional for present students.",labHint:"Choose one of the three simple states for every student. A 0–10 grade is optional for present students.",autoLockHint:"A saved draft is automatically confirmed when the lesson ends. You can also use “Confirm” before the lesson ends to lock it immediately.",pastHint:"The journal is closed. All details are strictly read-only.",futureHint:"This lesson has not started. The journal becomes active according to server time when its interval begins.",readOnly:"Read only",studentsCount:"{count} students",recorded:"Attendance complete",unrecorded:"Not recorded",presentCount:"{count} present",absentCount:"{count} absent",mobileHint:"Set attendance with one tap on each student card; add a grade only when needed.",emptyRoster:"There is no student roster for this session.",changesUnsaved:"There are unsaved changes",liveTime:"Live lesson time",room:"Room",teacher:"Teacher",serverTime:"Server time",status:"Status",retry:"Retry",loadErrorTitle:"Journal data could not be loaded",loadErrorDescription:"The session or student roster could not be loaded. Check the connection and try again.",leaveWarning:"There are unsaved journal changes. They will be lost if you leave this page. Continue?",saveStateUnsaved:"Changes have not been written to the server",saveStateReady:"Ready to save",saveStateLocked:"Journal is locked",unsupportedLesson:"This lesson type is not intended for daily journal editing."
};

const ru: Dict = {
  title:"Ежедневный журнал",description:"Просматривайте прошлые, текущие и будущие занятия по датам. Прошлые журналы доступны только для чтения; текущее занятие редактируется только в интервале серверного времени.",today:"Сегодня",past:"Прошлое",future:"Следующие",active:"Занятие активно",locked:"Заблокировано",autoConfirmed:"Подтверждено автоматически",confirmed:"Подтверждено",notCompleted:"Не заполнено",closing:"Закрывается",draftSaved:"Черновик сохранён",noSessions:"Для этого предмета не найдены занятия",noSessionsHint:"После формирования расписания прошлые и будущие занятия появятся здесь автоматически.",days:"Дни занятий",previousDay:"Предыдущий день",nextDay:"Следующий день",lessonsOnDay:"Занятий в этот день: {count}",lesson:"Занятие",lecture:"Лекция",seminar:"Семинар",laboratory:"Лабораторная",practice:"Практика",colloquium:"Коллоквиум",independent:"Самостоятельная работа",sessionDetails:"Детали занятия",topic:"Тема",topicPlaceholder:"Введите тему сегодняшнего занятия...",topicNotSet:"Тема не указана",student:"Студент",attendance:"Посещаемость",assessment:"Оценивание",present:"Присутствовал",absent:"Отсутствовал",grade:"Оценка",gradeOptional:"Оценка (необязательно)",labStatus:"Лабораторная работа",submitted:"Сдал",notSubmitted:"Не сдал",labPresentSubmitted:"Присутствовал — Сдал",labPresentNotSubmitted:"Присутствовал — Не сдал",notSet:"Не указано",notApplicable:"Не применяется",allPresent:"Отметить всех присутствующими",attendanceRequired:"Перед сохранением укажите посещаемость каждого студента.",labStatusRequired:"Для каждого присутствующего студента укажите статус сдачи лабораторной работы.",gradeRange:"{student}: оценка должна быть от 0 до 10.",saveDraft:"Сохранить",saving:"Сохранение...",saved:"Журнал сохранён. Его можно изменять до окончания занятия.",savedAt:"Последнее сохранение: {time}",saveError:"Журнал не сохранён. Изменения не записаны на сервер.",networkSaveError:"Нет подключения к сети. Журнал не записан на сервер; повторите попытку после восстановления связи.",confirmFinal:"Подтвердить",confirming:"Подтверждение...",confirmPrompt:"После подтверждения преподаватель не сможет изменить этот журнал. Продолжить?",confirmedSuccess:"Журнал подтверждён и заблокирован.",confirmError:"Журнал не подтверждён. Данные не заблокированы.",activeHint:"Посещаемость обязательна для каждого студента. Оценка необязательна для поддерживаемых типов занятий.",lectureHint:"На лекции основное действие — посещаемость; ежедневная оценка не используется.",gradedHint:"Укажите посещаемость. Для присутствующего студента оценка 0–10 необязательна.",labHint:"Для каждого студента выберите одно из трёх простых состояний. Для присутствующего студента оценка 0–10 необязательна.",autoLockHint:"Сохранённый черновик автоматически подтверждается после окончания занятия. До окончания можно сразу заблокировать его кнопкой «Подтвердить».",pastHint:"Журнал закрыт. Все данные доступны только для чтения.",futureHint:"Занятие ещё не началось. Журнал станет активным по серверному времени в начале интервала.",readOnly:"Только просмотр",studentsCount:"{count} студентов",recorded:"Посещаемость заполнена",unrecorded:"Не записано",presentCount:"Присутствовало: {count}",absentCount:"Отсутствовало: {count}",mobileHint:"Одним касанием укажите посещаемость в карточке студента; оценку добавляйте только при необходимости.",emptyRoster:"Для этого занятия нет списка студентов.",changesUnsaved:"Есть несохранённые изменения",liveTime:"Текущее занятие",room:"Аудитория",teacher:"Преподаватель",serverTime:"Время сервера",status:"Статус",retry:"Повторить",loadErrorTitle:"Не удалось загрузить журнал",loadErrorDescription:"Не удалось получить занятие или список студентов. Проверьте соединение и повторите попытку.",leaveWarning:"В журнале есть несохранённые изменения. При выходе они будут потеряны. Продолжить?",saveStateUnsaved:"Изменения ещё не записаны на сервер",saveStateReady:"Готово к сохранению",saveStateLocked:"Журнал заблокирован",unsupportedLesson:"Этот тип занятия не предназначен для редактирования ежедневного журнала."
};

const dictionaries: Record<Locale, Dict> = { az, tr, en, ru };
const localeTags: Record<Locale, string> = { az: "az-AZ", tr: "tr-TR", en: "en-US", ru: "ru-RU" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function useTeacherJournalI18n() {
  const { locale } = useI18n();
  const t = useCallback(
    (key: TeacherJournalKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? en[key] ?? key, vars),
    [locale],
  );
  const formatDate = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)),
    [locale],
  );
  const formatShortDate = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", day: "2-digit", month: "short" }).format(new Date(value)),
    [locale],
  );
  const formatWeekday = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", weekday: "short" }).format(new Date(value)),
    [locale],
  );
  const formatTime = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)),
    [locale],
  );
  return { locale, t, formatDate, formatShortDate, formatWeekday, formatTime };
}
