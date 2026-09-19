import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";
import type { DarsNovu } from "@/lib/courses";
import type { ScheduleWeekType } from "@/lib/schedule";

type Vars = Record<string, string | number>;

const az = {
  "meta.title": "Təqvim",
  "meta.description": "Dərs, imtahan və tədbir cədvəlinizi idarə edin.",
  "page.title": "Təqvim",
  "view.calendar": "Təqvim",
  "view.schedule": "Cədvəl tənzimləməsi",
  "fallback.lesson": "Dərs",
  "fallback.exam": "İmtahan",
  "exam.scheduleDescription": "İmtahan cədvəli",
  "user.missing": "İstifadəçi tapılmadı.",
  "toast.eventCreated": "Tədbir yaradıldı.",
  "toast.eventUpdated": "Tədbir yeniləndi.",
  "toast.eventDeleted": "Tədbir silindi.",
  "management.title": "Cədvəl tənzimləməsi",
  "management.description": "Qrupun həftəlik şablonunu qurun; sessiyalar semestrə avtomatik generasiya olunur.",
  "management.noGroups": "İdarə edə biləcəyiniz qrup tapılmadı.",
  "management.group": "Qrup",
  "editor.teacherFallback": "Müəllim",
  "editor.title": "Həftəlik dərs cədvəli",
  "editor.description": "Şablon dəyişdikdə təsdiqlənməmiş sessiyalar avtomatik yenidən qurulur.",
  "editor.noCourses": "Bu qrupa bağlı cari fənn yoxdur.",
  "editor.noCoursesHint": "Slot yaratmazdan əvvəl fənni qrupa təyin edin.",
  "editor.slotCount": "{count} slot",
  "editor.addSlot": "Slot əlavə et",
  "editor.emptyDay": "Bu gün üçün dərs slotu yoxdur",
  "editor.emptyDayHint": "Əlavə etmək üçün klikləyin",
  "editor.unknownCourse": "Naməlum fənn",
  "editor.noLessonType": "Dərs növü yoxdur",
  "editor.room": "Otaq {room}",
  "editor.editAria": "{course} dərs slotunu redaktə et",
  "editor.deleteAria": "{course} dərs slotunu sil",
  "editor.dialogEdit": "Dərs slotunu redaktə et",
  "editor.dialogNew": "Yeni dərs slotu",
  "editor.course": "Fənn",
  "editor.coursePlaceholder": "Fənn seçin",
  "editor.teacher": "Müəllim",
  "editor.teacherPlaceholder": "Müəllim seçin",
  "editor.lessonType": "Dərs növü",
  "editor.lessonTypePlaceholder": "İcazəli dərs növünü seçin",
  "editor.noPermission": "Bu müəllimin fənn üzrə aktiv Elektron Jurnal icazəsi yoxdur.",
  "editor.start": "Başlanğıc",
  "editor.end": "Bitmə",
  "editor.roomLabel": "Otaq",
  "editor.roomPlaceholder": "Məsələn: B2-105",
  "editor.weekType": "Həftə növü",
  "editor.cancel": "Ləğv et",
  "editor.save": "Yadda saxla",
  "editor.errorCourse": "Fənn seçin.",
  "editor.errorTeacher": "Müəllim seçin.",
  "editor.errorLessonType": "Dərs növü seçin.",
  "editor.errorTime": "Başlanğıc saatı bitmə saatından əvvəl olmalıdır.",
  "editor.errorConflict": "Bu vaxt aralığı {week} slotu{course} ilə toqquşur. ÜST + ALT cütü istisnadır.",
  "editor.toastAdded": "Dərs slotu əlavə edildi.",
  "editor.toastUpdated": "Dərs slotu yeniləndi.",
  "editor.toastDeleted": "Dərs slotu silindi.",
  "editor.warningSaved": "Şablon yadda saxlandı, amma sessiyalar yenilənmədi. Tənzimləmələrdə həftə rotasiyasını tamamlayın.",
  "editor.warningDeleted": "Şablon silindi, sessiyaların yenilənməsi üçün həftə rotasiyasını tamamlayın.",
  "week.every": "Hər həftə",
  "week.upper": "Yalnız ÜST",
  "week.lower": "Yalnız ALT",
  "lesson.lecture": "Mühazirə",
  "lesson.seminar": "Seminar",
  "lesson.laboratory": "Laboratoriya",
  "lesson.practice": "Təcrübə",
  "event.editTitle": "Tədbiri redaktə et",
  "event.createTitle": "Yeni tədbir əlavə et",
  "event.title": "Başlıq",
  "event.titlePlaceholder": "Tədbirin başlığı",
  "event.date": "Tarix",
  "event.datePlaceholder": "Tarix seçin",
  "event.start": "Başlanğıc saat",
  "event.end": "Bitmə saat",
  "event.group": "Qrup",
  "event.university": "Universitet (Hamı)",
  "event.course": "Tədris fənni",
  "event.notSelected": "Seçilməyib",
  "event.description": "Təsvir",
  "event.descriptionPlaceholder": "Tədbir haqqında ətraflı məlumat",
  "event.delete": "Tədbiri sil",
  "event.cancel": "Ləğv et",
  "event.update": "Yenilə",
  "event.create": "Yarat",
  "event.deleteTitle": "Əminsiniz?",
  "event.deleteDescription": "Bu tədbiri silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.",
  "event.dismiss": "İmtina",
  "event.confirmDelete": "Bəli, sil",
} as const;

export type CalendarManagementKey = keyof typeof az;
type Dict = Record<CalendarManagementKey, string>;

const en: Dict = {
  "meta.title":"Calendar","meta.description":"Manage your lessons, exams and events.","page.title":"Calendar","view.calendar":"Calendar","view.schedule":"Schedule settings","fallback.lesson":"Lesson","fallback.exam":"Exam","exam.scheduleDescription":"Exam schedule","user.missing":"User could not be found.","toast.eventCreated":"Event created.","toast.eventUpdated":"Event updated.","toast.eventDeleted":"Event deleted.",
  "management.title":"Schedule settings","management.description":"Configure the group’s weekly template; semester sessions are generated automatically.","management.noGroups":"No group you can manage was found.","management.group":"Group",
  "editor.teacherFallback":"Teacher","editor.title":"Weekly lesson schedule","editor.description":"Unconfirmed sessions are rebuilt automatically when the template changes.","editor.noCourses":"This group has no linked current course.","editor.noCoursesHint":"Assign a course to the group before creating a slot.","editor.slotCount":"{count} slots","editor.addSlot":"Add slot","editor.emptyDay":"There is no lesson slot for this day","editor.emptyDayHint":"Click to add one","editor.unknownCourse":"Unknown course","editor.noLessonType":"No lesson type","editor.room":"Room {room}","editor.editAria":"Edit the {course} lesson slot","editor.deleteAria":"Delete the {course} lesson slot","editor.dialogEdit":"Edit lesson slot","editor.dialogNew":"New lesson slot","editor.course":"Course","editor.coursePlaceholder":"Select a course","editor.teacher":"Teacher","editor.teacherPlaceholder":"Select a teacher","editor.lessonType":"Lesson type","editor.lessonTypePlaceholder":"Select an allowed lesson type","editor.noPermission":"This teacher has no active Electronic Journal permission for the course.","editor.start":"Start","editor.end":"End","editor.roomLabel":"Room","editor.roomPlaceholder":"For example: B2-105","editor.weekType":"Week type","editor.cancel":"Cancel","editor.save":"Save","editor.errorCourse":"Select a course.","editor.errorTeacher":"Select a teacher.","editor.errorLessonType":"Select a lesson type.","editor.errorTime":"The start time must be before the end time.","editor.errorConflict":"This time range conflicts with the {week} slot{course}. The UPPER + LOWER pair is allowed.","editor.toastAdded":"Lesson slot added.","editor.toastUpdated":"Lesson slot updated.","editor.toastDeleted":"Lesson slot deleted.","editor.warningSaved":"The template was saved, but sessions were not rebuilt. Complete the week rotation settings.","editor.warningDeleted":"The template was deleted, but complete the week rotation settings to rebuild sessions.",
  "week.every":"Every week","week.upper":"UPPER only","week.lower":"LOWER only","lesson.lecture":"Lecture","lesson.seminar":"Seminar","lesson.laboratory":"Laboratory","lesson.practice":"Practice",
  "event.editTitle":"Edit event","event.createTitle":"Add new event","event.title":"Title","event.titlePlaceholder":"Event title","event.date":"Date","event.datePlaceholder":"Select a date","event.start":"Start time","event.end":"End time","event.group":"Group","event.university":"University (Everyone)","event.course":"Course","event.notSelected":"Not selected","event.description":"Description","event.descriptionPlaceholder":"Detailed information about the event","event.delete":"Delete event","event.cancel":"Cancel","event.update":"Update","event.create":"Create","event.deleteTitle":"Are you sure?","event.deleteDescription":"Are you sure you want to delete this event? This action cannot be undone.","event.dismiss":"Keep event","event.confirmDelete":"Yes, delete",
};

const tr: Dict = {
  "meta.title":"Takvim","meta.description":"Ders, sınav ve etkinlik programınızı yönetin.","page.title":"Takvim","view.calendar":"Takvim","view.schedule":"Program ayarları","fallback.lesson":"Ders","fallback.exam":"Sınav","exam.scheduleDescription":"Sınav programı","user.missing":"Kullanıcı bulunamadı.","toast.eventCreated":"Etkinlik oluşturuldu.","toast.eventUpdated":"Etkinlik güncellendi.","toast.eventDeleted":"Etkinlik silindi.",
  "management.title":"Program ayarları","management.description":"Grubun haftalık şablonunu yapılandırın; dönem oturumları otomatik oluşturulur.","management.noGroups":"Yönetebileceğiniz grup bulunamadı.","management.group":"Grup",
  "editor.teacherFallback":"Öğretmen","editor.title":"Haftalık ders programı","editor.description":"Şablon değiştiğinde onaylanmamış oturumlar otomatik olarak yeniden oluşturulur.","editor.noCourses":"Bu gruba bağlı güncel ders yok.","editor.noCoursesHint":"Slot oluşturmadan önce dersi gruba atayın.","editor.slotCount":"{count} slot","editor.addSlot":"Slot ekle","editor.emptyDay":"Bu gün için ders slotu yok","editor.emptyDayHint":"Eklemek için tıklayın","editor.unknownCourse":"Bilinmeyen ders","editor.noLessonType":"Ders türü yok","editor.room":"Salon {room}","editor.editAria":"{course} ders slotunu düzenle","editor.deleteAria":"{course} ders slotunu sil","editor.dialogEdit":"Ders slotunu düzenle","editor.dialogNew":"Yeni ders slotu","editor.course":"Ders","editor.coursePlaceholder":"Ders seçin","editor.teacher":"Öğretmen","editor.teacherPlaceholder":"Öğretmen seçin","editor.lessonType":"Ders türü","editor.lessonTypePlaceholder":"İzin verilen ders türünü seçin","editor.noPermission":"Bu öğretmenin ders için aktif Elektronik Günlük izni yok.","editor.start":"Başlangıç","editor.end":"Bitiş","editor.roomLabel":"Salon","editor.roomPlaceholder":"Örneğin: B2-105","editor.weekType":"Hafta türü","editor.cancel":"İptal","editor.save":"Kaydet","editor.errorCourse":"Ders seçin.","editor.errorTeacher":"Öğretmen seçin.","editor.errorLessonType":"Ders türü seçin.","editor.errorTime":"Başlangıç saati bitiş saatinden önce olmalıdır.","editor.errorConflict":"Bu zaman aralığı {week} slotu{course} ile çakışıyor. ÜST + ALT çifti istisnadır.","editor.toastAdded":"Ders slotu eklendi.","editor.toastUpdated":"Ders slotu güncellendi.","editor.toastDeleted":"Ders slotu silindi.","editor.warningSaved":"Şablon kaydedildi ancak oturumlar yenilenmedi. Hafta rotasyonu ayarlarını tamamlayın.","editor.warningDeleted":"Şablon silindi; oturumları yenilemek için hafta rotasyonu ayarlarını tamamlayın.",
  "week.every":"Her hafta","week.upper":"Yalnız ÜST","week.lower":"Yalnız ALT","lesson.lecture":"Ders anlatımı","lesson.seminar":"Seminer","lesson.laboratory":"Laboratuvar","lesson.practice":"Uygulama",
  "event.editTitle":"Etkinliği düzenle","event.createTitle":"Yeni etkinlik ekle","event.title":"Başlık","event.titlePlaceholder":"Etkinlik başlığı","event.date":"Tarih","event.datePlaceholder":"Tarih seçin","event.start":"Başlangıç saati","event.end":"Bitiş saati","event.group":"Grup","event.university":"Üniversite (Herkes)","event.course":"Ders","event.notSelected":"Seçilmedi","event.description":"Açıklama","event.descriptionPlaceholder":"Etkinlik hakkında ayrıntılı bilgi","event.delete":"Etkinliği sil","event.cancel":"İptal","event.update":"Güncelle","event.create":"Oluştur","event.deleteTitle":"Emin misiniz?","event.deleteDescription":"Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.","event.dismiss":"Vazgeç","event.confirmDelete":"Evet, sil",
};

const ru: Dict = {
  "meta.title":"Календарь","meta.description":"Управляйте расписанием занятий, экзаменов и событий.","page.title":"Календарь","view.calendar":"Календарь","view.schedule":"Настройка расписания","fallback.lesson":"Занятие","fallback.exam":"Экзамен","exam.scheduleDescription":"Расписание экзаменов","user.missing":"Пользователь не найден.","toast.eventCreated":"Событие создано.","toast.eventUpdated":"Событие обновлено.","toast.eventDeleted":"Событие удалено.",
  "management.title":"Настройка расписания","management.description":"Настройте недельный шаблон группы; занятия на семестр создаются автоматически.","management.noGroups":"Группы, доступные для управления, не найдены.","management.group":"Группа",
  "editor.teacherFallback":"Преподаватель","editor.title":"Недельное расписание занятий","editor.description":"Неподтверждённые занятия автоматически перестраиваются при изменении шаблона.","editor.noCourses":"У этой группы нет связанной дисциплины текущего периода.","editor.noCoursesHint":"Перед созданием слота назначьте дисциплину группе.","editor.slotCount":"Слотов: {count}","editor.addSlot":"Добавить слот","editor.emptyDay":"На этот день нет слотов занятий","editor.emptyDayHint":"Нажмите, чтобы добавить","editor.unknownCourse":"Неизвестная дисциплина","editor.noLessonType":"Тип занятия не указан","editor.room":"Аудитория {room}","editor.editAria":"Изменить слот занятия {course}","editor.deleteAria":"Удалить слот занятия {course}","editor.dialogEdit":"Изменить слот занятия","editor.dialogNew":"Новый слот занятия","editor.course":"Дисциплина","editor.coursePlaceholder":"Выберите дисциплину","editor.teacher":"Преподаватель","editor.teacherPlaceholder":"Выберите преподавателя","editor.lessonType":"Тип занятия","editor.lessonTypePlaceholder":"Выберите разрешённый тип занятия","editor.noPermission":"У этого преподавателя нет активного разрешения Электронного журнала по дисциплине.","editor.start":"Начало","editor.end":"Окончание","editor.roomLabel":"Аудитория","editor.roomPlaceholder":"Например: B2-105","editor.weekType":"Тип недели","editor.cancel":"Отмена","editor.save":"Сохранить","editor.errorCourse":"Выберите дисциплину.","editor.errorTeacher":"Выберите преподавателя.","editor.errorLessonType":"Выберите тип занятия.","editor.errorTime":"Время начала должно быть раньше времени окончания.","editor.errorConflict":"Этот интервал конфликтует со слотом {week}{course}. Пара ВЕРХ + НИЗ допускается.","editor.toastAdded":"Слот занятия добавлен.","editor.toastUpdated":"Слот занятия обновлён.","editor.toastDeleted":"Слот занятия удалён.","editor.warningSaved":"Шаблон сохранён, но занятия не перестроены. Завершите настройку чередования недель.","editor.warningDeleted":"Шаблон удалён; завершите настройку чередования недель для перестроения занятий.",
  "week.every":"Каждую неделю","week.upper":"Только ВЕРХ","week.lower":"Только НИЗ","lesson.lecture":"Лекция","lesson.seminar":"Семинар","lesson.laboratory":"Лабораторная","lesson.practice":"Практика",
  "event.editTitle":"Изменить событие","event.createTitle":"Добавить событие","event.title":"Заголовок","event.titlePlaceholder":"Название события","event.date":"Дата","event.datePlaceholder":"Выберите дату","event.start":"Время начала","event.end":"Время окончания","event.group":"Группа","event.university":"Университет (Все)","event.course":"Дисциплина","event.notSelected":"Не выбрано","event.description":"Описание","event.descriptionPlaceholder":"Подробная информация о событии","event.delete":"Удалить событие","event.cancel":"Отмена","event.update":"Обновить","event.create":"Создать","event.deleteTitle":"Вы уверены?","event.deleteDescription":"Вы уверены, что хотите удалить это событие? Действие необратимо.","event.dismiss":"Не удалять","event.confirmDelete":"Да, удалить",
};

export const calendarManagementMessages: Record<Locale, Dict> = { az, en, tr, ru };

function interpolate(value: string, vars?: Vars) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function calendarManagementTranslate(locale: Locale, key: CalendarManagementKey, vars?: Vars) {
  return interpolate(calendarManagementMessages[locale][key] ?? az[key], vars);
}

export function useCalendarManagementI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: CalendarManagementKey, vars?: Vars) => calendarManagementTranslate(locale, key, vars), [locale]);
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-GB";
  return { locale, intlLocale, t };
}

export function scheduleWeekLabel(type: ScheduleWeekType, t: (key: CalendarManagementKey, vars?: Vars) => string) {
  return t(type === "her_hefte" ? "week.every" : type === "ust" ? "week.upper" : "week.lower");
}

export function lessonTypeLabel(type: DarsNovu, t: (key: CalendarManagementKey, vars?: Vars) => string) {
  const keys: Partial<Record<DarsNovu, CalendarManagementKey>> = {
    muhazire: "lesson.lecture",
    seminar: "lesson.seminar",
    laboratoriya: "lesson.laboratory",
    tecrube: "lesson.practice",
  };
  return t(keys[type] ?? "editor.noLessonType");
}
