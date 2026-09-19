import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  "meta.title": "İmtahan planlaşdırılması",
  "meta.description": "Tyutor üçün təyin edilmiş qrupların cari semestr imtahan cədvəlinin idarə edilməsi.",
  "page.badge": "Tyutor · İmtahan cədvəli",
  "page.title": "İmtahan planlaşdırılması",
  "page.description": "Qrup və cari semestr fənni üzrə imtahan tarixini, başlanğıc saatını və otağı təhlükəsiz şəkildə planlayın.",
  "page.scopeHint": "Yalnız sizə təyin edilmiş aktiv qruplar və onların cari semestr fənləri idarə olunur.",
  "selector.period": "İmtahan dövrü",
  "selector.periodPlaceholder": "Cari akademik dövr",
  "selector.group": "Qrup",
  "selector.groupPlaceholder": "Qrup seçin",
  "summary.upcoming": "Yaxın imtahan",
  "summary.past": "Keçmiş",
  "summary.courses": "Cari fənn",
  "planned.title": "Planlanmış imtahanlar",
  "planned.description": "Yaxın imtahanlar tarix və saat sırası ilə göstərilir.",
  "planned.emptyTitle": "Yaxın imtahan planlanmayıb",
  "planned.emptyDescription": "Seçilmiş qrup üçün ilk imtahanı planlamaq üçün yeni imtahan düyməsindən istifadə edin.",
  "past.title": "Keçmiş imtahanlar",
  "past.count": "{count} keçmiş imtahan",
  "past.empty": "Keçmiş imtahan yoxdur.",
  "action.new": "Yeni imtahan",
  "action.edit": "Redaktə et",
  "action.delete": "Sil",
  "action.cancel": "Ləğv et",
  "action.save": "Yadda saxla",
  "action.saving": "Yadda saxlanılır...",
  "form.createTitle": "Yeni imtahan planla",
  "form.editTitle": "İmtahanı redaktə et",
  "form.course": "Fənn",
  "form.coursePlaceholder": "Fənn seçin",
  "form.date": "İmtahan tarixi",
  "form.time": "Başlanğıc saatı",
  "form.room": "Otaq",
  "form.roomPlaceholder": "Məsələn, B2-105",
  "form.required": "Fənn, tarix, başlanğıc saatı və otaq mütləq doldurulmalıdır.",
  "exam.group": "Qrup",
  "exam.course": "Fənn",
  "exam.date": "Tarix",
  "exam.time": "Saat",
  "exam.room": "Otaq",
  "exam.upcoming": "Planlanıb",
  "exam.past": "Keçmiş",
  "empty.noGroups": "Sizə tyutor kimi aktiv qrup təyin edilməyib.",
  "empty.noCourses": "Seçilmiş qrup üçün cari semestr fənni yoxdur.",
  "loading": "İmtahan cədvəli yüklənir...",
  "error.load": "İmtahan cədvəli yüklənərkən xəta baş verdi.",
  "error.roomRequired": "Otaq boş ola bilməz.",
  "error.courseScope": "Seçilmiş fənn bu qrupun cari semestr fənni deyil və planlaşdırıla bilməz.",
  "error.duplicateCourse": "Bu fənn üçün artıq imtahan planlaşdırılıb. Mövcud planı redaktə edin.",
  "error.groupTimeConflict": "Bu qrup üçün eyni tarix və saatda başqa imtahan artıq planlaşdırılıb.",
  "error.roomTimeConflict": "Bu otaqda eyni tarix və başlanğıc saatında başqa imtahan artıq planlaşdırılıb.",
  "error.forbidden": "Bu imtahan cədvəlini dəyişmək üçün icazəniz yoxdur.",
  "error.unknown": "İmtahan cədvəli əməliyyatı tamamlanmadı.",
  "toast.created": "İmtahan planlaşdırıldı.",
  "toast.updated": "İmtahan planı yeniləndi.",
  "toast.deleted": "İmtahan planı silindi.",
  "delete.title": "İmtahan planını sil?",
  "delete.description": "{course} üçün planlanan imtahan cədvəldən silinəcək. Bu əməliyyat geri qaytarılmır.",
  "aria.edit": "{course} imtahanını redaktə et",
  "aria.delete": "{course} imtahanını sil",
  "aria.period": "İmtahan dövrünü seçin",
  "aria.group": "İmtahan qrupu seçin",
  "common.retry": "Yenidən cəhd et",
} as const;

export type TutorExamKey = keyof typeof az;
type Dict = Record<TutorExamKey, string>;

const en: Dict = {
  "meta.title":"Exam scheduling","meta.description":"Manage the current-semester exam schedule for groups assigned to the tutor.","page.badge":"Tutor · Exam schedule","page.title":"Exam scheduling","page.description":"Safely plan the exam date, start time and room for a group and its current-semester course.","page.scopeHint":"Only active groups assigned to you and their current-semester courses can be managed.","selector.period":"Exam period","selector.periodPlaceholder":"Current academic period","selector.group":"Group","selector.groupPlaceholder":"Select a group","summary.upcoming":"Upcoming exams","summary.past":"Past","summary.courses":"Current courses","planned.title":"Scheduled exams","planned.description":"Upcoming exams are shown in date and time order.","planned.emptyTitle":"No upcoming exam is scheduled","planned.emptyDescription":"Use the new exam button to schedule the first exam for the selected group.","past.title":"Past exams","past.count":"{count} past exams","past.empty":"There are no past exams.","action.new":"New exam","action.edit":"Edit","action.delete":"Delete","action.cancel":"Cancel","action.save":"Save","action.saving":"Saving...","form.createTitle":"Schedule a new exam","form.editTitle":"Edit exam","form.course":"Course","form.coursePlaceholder":"Select a course","form.date":"Exam date","form.time":"Start time","form.room":"Room","form.roomPlaceholder":"For example, B2-105","form.required":"Course, date, start time and room are required.","exam.group":"Group","exam.course":"Course","exam.date":"Date","exam.time":"Time","exam.room":"Room","exam.upcoming":"Scheduled","exam.past":"Past","empty.noGroups":"No active group is assigned to you as tutor.","empty.noCourses":"The selected group has no current-semester courses.","loading":"Loading exam schedule...","error.load":"An error occurred while loading the exam schedule.","error.roomRequired":"Room cannot be empty.","error.courseScope":"The selected course is not a current-semester course of this group and cannot be scheduled.","error.duplicateCourse":"An exam is already scheduled for this course. Edit the existing schedule.","error.groupTimeConflict":"Another exam is already scheduled for this group at the same date and time.","error.roomTimeConflict":"Another exam is already scheduled in this room at the same date and start time.","error.forbidden":"You do not have permission to change this exam schedule.","error.unknown":"The exam schedule operation could not be completed.","toast.created":"Exam scheduled.","toast.updated":"Exam schedule updated.","toast.deleted":"Exam schedule deleted.","delete.title":"Delete exam schedule?","delete.description":"The scheduled exam for {course} will be removed. This action cannot be undone.","aria.edit":"Edit the {course} exam","aria.delete":"Delete the {course} exam","aria.period":"Select the exam period","aria.group":"Select the exam group","common.retry":"Try again",
};

const tr: Dict = {
  "meta.title":"Sınav planlama","meta.description":"Tutora atanmış grupların güncel dönem sınav programını yönetin.","page.badge":"Tutor · Sınav programı","page.title":"Sınav planlama","page.description":"Grup ve güncel dönem dersi için sınav tarihini, başlangıç saatini ve salonu güvenli biçimde planlayın.","page.scopeHint":"Yalnızca size atanmış aktif gruplar ve güncel dönem dersleri yönetilebilir.","selector.period":"Sınav dönemi","selector.periodPlaceholder":"Güncel akademik dönem","selector.group":"Grup","selector.groupPlaceholder":"Grup seçin","summary.upcoming":"Yaklaşan sınav","summary.past":"Geçmiş","summary.courses":"Güncel ders","planned.title":"Planlanmış sınavlar","planned.description":"Yaklaşan sınavlar tarih ve saat sırasıyla gösterilir.","planned.emptyTitle":"Yaklaşan sınav planlanmamış","planned.emptyDescription":"Seçilen grup için ilk sınavı planlamak üzere yeni sınav düğmesini kullanın.","past.title":"Geçmiş sınavlar","past.count":"{count} geçmiş sınav","past.empty":"Geçmiş sınav yok.","action.new":"Yeni sınav","action.edit":"Düzenle","action.delete":"Sil","action.cancel":"İptal","action.save":"Kaydet","action.saving":"Kaydediliyor...","form.createTitle":"Yeni sınav planla","form.editTitle":"Sınavı düzenle","form.course":"Ders","form.coursePlaceholder":"Ders seçin","form.date":"Sınav tarihi","form.time":"Başlangıç saati","form.room":"Salon","form.roomPlaceholder":"Örneğin B2-105","form.required":"Ders, tarih, başlangıç saati ve salon zorunludur.","exam.group":"Grup","exam.course":"Ders","exam.date":"Tarih","exam.time":"Saat","exam.room":"Salon","exam.upcoming":"Planlandı","exam.past":"Geçmiş","empty.noGroups":"Size tutor olarak aktif grup atanmamış.","empty.noCourses":"Seçilen grup için güncel dönem dersi yok.","loading":"Sınav programı yükleniyor...","error.load":"Sınav programı yüklenirken hata oluştu.","error.roomRequired":"Salon boş bırakılamaz.","error.courseScope":"Seçilen ders bu grubun güncel dönem dersi değil ve planlanamaz.","error.duplicateCourse":"Bu ders için zaten sınav planlanmış. Mevcut planı düzenleyin.","error.groupTimeConflict":"Bu grup için aynı tarih ve saatte başka bir sınav zaten planlanmış.","error.roomTimeConflict":"Bu salonda aynı tarih ve başlangıç saatinde başka bir sınav zaten planlanmış.","error.forbidden":"Bu sınav programını değiştirme yetkiniz yok.","error.unknown":"Sınav programı işlemi tamamlanamadı.","toast.created":"Sınav planlandı.","toast.updated":"Sınav programı güncellendi.","toast.deleted":"Sınav programı silindi.","delete.title":"Sınav planı silinsin mi?","delete.description":"{course} için planlanan sınav silinecek. Bu işlem geri alınamaz.","aria.edit":"{course} sınavını düzenle","aria.delete":"{course} sınavını sil","aria.period":"Sınav dönemini seçin","aria.group":"Sınav grubunu seçin","common.retry":"Tekrar dene",
};

const ru: Dict = {
  "meta.title":"Планирование экзаменов","meta.description":"Управление расписанием экзаменов текущего семестра для назначенных тьютору групп.","page.badge":"Тьютор · Расписание экзаменов","page.title":"Планирование экзаменов","page.description":"Безопасно планируйте дату, время начала и аудиторию экзамена для группы и дисциплины текущего семестра.","page.scopeHint":"Можно управлять только активными группами, назначенными вам, и их дисциплинами текущего семестра.","selector.period":"Экзаменационный период","selector.periodPlaceholder":"Текущий академический период","selector.group":"Группа","selector.groupPlaceholder":"Выберите группу","summary.upcoming":"Ближайшие","summary.past":"Прошедшие","summary.courses":"Текущие дисциплины","planned.title":"Запланированные экзамены","planned.description":"Ближайшие экзамены показаны по дате и времени.","planned.emptyTitle":"Ближайшие экзамены не запланированы","planned.emptyDescription":"Используйте кнопку нового экзамена, чтобы создать первое расписание для выбранной группы.","past.title":"Прошедшие экзамены","past.count":"Прошедших экзаменов: {count}","past.empty":"Прошедших экзаменов нет.","action.new":"Новый экзамен","action.edit":"Изменить","action.delete":"Удалить","action.cancel":"Отмена","action.save":"Сохранить","action.saving":"Сохранение...","form.createTitle":"Запланировать экзамен","form.editTitle":"Изменить экзамен","form.course":"Дисциплина","form.coursePlaceholder":"Выберите дисциплину","form.date":"Дата экзамена","form.time":"Время начала","form.room":"Аудитория","form.roomPlaceholder":"Например, B2-105","form.required":"Дисциплина, дата, время начала и аудитория обязательны.","exam.group":"Группа","exam.course":"Дисциплина","exam.date":"Дата","exam.time":"Время","exam.room":"Аудитория","exam.upcoming":"Запланирован","exam.past":"Прошёл","empty.noGroups":"Вам не назначена активная группа в качестве тьютора.","empty.noCourses":"Для выбранной группы нет дисциплин текущего семестра.","loading":"Загрузка расписания экзаменов...","error.load":"Не удалось загрузить расписание экзаменов.","error.roomRequired":"Аудитория не может быть пустой.","error.courseScope":"Выбранная дисциплина не относится к текущему семестру этой группы и не может быть запланирована.","error.duplicateCourse":"Для этой дисциплины уже запланирован экзамен. Измените существующее расписание.","error.groupTimeConflict":"Для этой группы на ту же дату и время уже запланирован другой экзамен.","error.roomTimeConflict":"В этой аудитории на ту же дату и время начала уже запланирован другой экзамен.","error.forbidden":"У вас нет прав изменять это расписание экзаменов.","error.unknown":"Операцию с расписанием экзаменов выполнить не удалось.","toast.created":"Экзамен запланирован.","toast.updated":"Расписание экзамена обновлено.","toast.deleted":"Расписание экзамена удалено.","delete.title":"Удалить расписание экзамена?","delete.description":"Экзамен по дисциплине {course} будет удалён из расписания. Действие необратимо.","aria.edit":"Изменить экзамен по дисциплине {course}","aria.delete":"Удалить экзамен по дисциплине {course}","aria.period":"Выберите экзаменационный период","aria.group":"Выберите экзаменационную группу","common.retry":"Повторить",
};

export const tutorExamMessages: Record<Locale, Dict> = { az, en, tr, ru };
const intlLocales: Record<Locale, string> = { az: "az-AZ", en: "en-GB", tr: "tr-TR", ru: "ru-RU" };

function interpolate(value: string, vars?: Vars) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function tutorExamTranslate(locale: Locale, key: TutorExamKey, vars?: Vars) {
  return interpolate(tutorExamMessages[locale][key] ?? az[key], vars);
}

export function useTutorExamI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: TutorExamKey, vars?: Vars) => tutorExamTranslate(locale, key, vars), [locale]);
  return { locale, intlLocale: intlLocales[locale], t };
}
