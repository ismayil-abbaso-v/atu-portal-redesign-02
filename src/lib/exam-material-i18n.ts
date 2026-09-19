import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  "title": "İmtahan materialları",
  "teacher.description": "Fənn və qrup üzrə Test və ya Bilet DOCX faylını təhlükəsiz şəkildə əlavə edin. Bu bölmə imtahan nəticələrindən tam ayrıdır.",
  "course": "Fənn",
  "group": "Qrup",
  "type": "İmtahan növü",
  "type.test": "Test",
  "type.ticket": "Bilet",
  "status.ready": "Material hazırdır",
  "status.waiting": "Material gözlənilir",
  "status.missing": "İmtahan materialı əlavə edilməyib",
  "status.unscheduled": "İmtahan vaxtı hələ təyin edilməyib",
  "date.unscheduled": "Tarix təyin edilməyib",
  "room.unscheduled": "Otaq təyin edilməyib",
  "file.docx": "DOCX",
  "file.upload": "Fayl yüklə",
  "file.replace": "Faylı dəyişdir",
  "file.download": "Faylı endir",
  "file.downloadExam": "İmtahan faylını endir",
  "file.preparing": "Hazırlanır...",
  "file.uploading": "Yüklənir...",
  "file.processing": "Emal edilir...",
  "file.uploaded": "Yükləndi",
  "file.name": "Fayl adı",
  "file.size": "Fayl ölçüsü",
  "file.uploadedAt": "Yüklənmə tarixi",
  "file.updatedAt": "Son yenilənmə",
  "file.choose": "DOCX faylı seçin",
  "file.chooseHint": "Yalnız .docx · maksimum 20 MB",
  "file.required": "DOCX faylı seçilməlidir.",
  "file.extensionError": "Yalnız .docx faylı qəbul edilir.",
  "file.mimeError": "Fayl DOCX MIME formatında deyil.",
  "file.sizeError": "Fayl boşdur və ya 20 MB limitini keçir.",
  "file.uploadError": "İmtahan materialı yüklənmədi.",
  "file.downloadError": "İmtahan faylı açıla bilmədi.",
  "file.uploadSuccess": "İmtahan materialı uğurla əlavə edildi.",
  "file.replaceSuccess": "İmtahan materialı uğurla yeniləndi.",
  "file.ownerOnly": "Bu materialı yalnız onu yükləyən müəllim dəyişə bilər.",
  "file.conflict": "Bu qrup, fənn və imtahan növü üçün artıq başqa müəllimin materialı mövcuddur.",
  "empty.course": "Cari semestr üzrə fənn tapılmadı.",
  "empty.group": "Bu fənn üçün cari qrup tapılmadı.",
  "student.material": "İmtahan materialı",
  "student.materials": "İmtahan materialları",
  "student.materialMissing": "İmtahan materialı hələ əlavə edilməyib.",
  "student.materialReadyHint": "Müəllim imtahan faylını əlavə edib. İmtahan vaxtı təyin edilməsə belə faylı buradan əldə edə bilərsiniz.",
  "tutor.ready": "Material hazırdır",
  "tutor.waiting": "Material əlavə edilməyib",
  "tutor.hint": "Tyutor materialı yalnız izləyir; dəyişiklik müəllim tərəfindən edilir.",
  "aria.upload": "{type} imtahan materialını yüklə",
  "aria.replace": "{type} imtahan materialını dəyişdir",
  "aria.download": "{type} imtahan materialını endir",
  "common.retry": "Yenidən cəhd et",
  "officialSyncPending": "Rəsmi portala göndərilir",
  "officialSyncProcessing": "Rəsmi portalda emal edilir",
  "officialSyncSuccess": "Rəsmi portal ilə sinxronlaşdırıldı",
  "officialSyncPartial": "Qismən sinxronlaşdırıldı",
  "officialSyncFailed": "Rəsmi portal sinxronizasiya xətası",
  "officialSyncRetrying": "Yenidən yoxlanılır",
  "officialExamCreated": "Rəsmi imtahan yaradıldı",
  "semesterScoresSynced": "Semestr balları sinxronlaşdırıldı",
  "unmatchedStudents": "{count} tələbə rəsmi portalda tapılmadı",
  "retryOfficialSync": "Rəsmi sinxronizasiyanı yenidən yoxla",
  "officialGroupNotFound": "Qrup rəsmi portalda tapılmadı.",
  "officialExamAlreadyStarted": "Rəsmi imtahan artıq başlayıb; material dəyişdirilə bilməz.",
  "officialInvalidDocx": "Rəsmi portal DOCX faylını etibarsız hesab etdi.",
  "officialPeriodMismatch": "Material cari tədris ili və semestr ilə uyğun deyil.",
  "officialSyncRetryQueued": "Yenidən sinxronizasiya növbəyə alındı.",
} as const;

export type ExamMaterialI18nKey = keyof typeof az;
type Dict = Record<ExamMaterialI18nKey, string>;

const en: Dict = {
  "title":"Exam materials","teacher.description":"Securely add a Test or Ticket DOCX file for a course and group. This section is fully separated from exam results.","course":"Course","group":"Group","type":"Exam type","type.test":"Test","type.ticket":"Ticket","status.ready":"Material ready","status.waiting":"Waiting for material","status.missing":"No exam material has been added","status.unscheduled":"Exam time has not been scheduled yet","date.unscheduled":"Date not scheduled","room.unscheduled":"Room not scheduled","file.docx":"DOCX","file.upload":"Upload file","file.replace":"Replace file","file.download":"Download file","file.downloadExam":"Download exam file","file.preparing":"Preparing...","file.uploading":"Uploading...","file.processing":"Processing...","file.uploaded":"Uploaded","file.name":"File name","file.size":"File size","file.uploadedAt":"Uploaded","file.updatedAt":"Last updated","file.choose":"Choose a DOCX file","file.chooseHint":".docx only · maximum 20 MB","file.required":"Choose a DOCX file.","file.extensionError":"Only .docx files are accepted.","file.mimeError":"The file does not have the DOCX MIME type.","file.sizeError":"The file is empty or exceeds the 20 MB limit.","file.uploadError":"The exam material could not be uploaded.","file.downloadError":"The exam file could not be opened.","file.uploadSuccess":"Exam material uploaded successfully.","file.replaceSuccess":"Exam material updated successfully.","file.ownerOnly":"Only the teacher who uploaded this material can replace it.","file.conflict":"Another teacher already uploaded material for this group, course and exam type.","empty.course":"No current-semester course was found.","empty.group":"No current group was found for this course.","student.material":"Exam material","student.materials":"Exam materials","student.materialMissing":"Exam material has not been added yet.","student.materialReadyHint":"The teacher has added the exam file. You can download it here even before an exam time is scheduled.","tutor.ready":"Material ready","tutor.waiting":"Material not added","tutor.hint":"The tutor monitors material status only; the teacher manages the file.","aria.upload":"Upload {type} exam material","aria.replace":"Replace {type} exam material","aria.download":"Download {type} exam material","common.retry":"Try again","officialSyncPending":"Sending to the Official Portal","officialSyncProcessing":"Processing in the Official Portal","officialSyncSuccess":"Synced with the Official Portal","officialSyncPartial":"Partially synchronized","officialSyncFailed":"Official Portal synchronization error","officialSyncRetrying":"Checking again","officialExamCreated":"Official exam created","semesterScoresSynced":"Semester scores synchronized","unmatchedStudents":"{count} students were not found in the Official Portal","retryOfficialSync":"Retry official synchronization","officialGroupNotFound":"The group was not found in the Official Portal.","officialExamAlreadyStarted":"The official exam has already started; the material cannot be replaced.","officialInvalidDocx":"The Official Portal rejected the DOCX file as invalid.","officialPeriodMismatch":"The material does not match the current academic year and semester.","officialSyncRetryQueued":"Official synchronization was queued again.",
};

const tr: Dict = {
  "title":"Sınav materyalleri","teacher.description":"Ders ve grup için Test veya Bilet DOCX dosyasını güvenli biçimde ekleyin. Bu bölüm sınav sonuçlarından tamamen ayrıdır.","course":"Ders","group":"Grup","type":"Sınav türü","type.test":"Test","type.ticket":"Bilet","status.ready":"Materyal hazır","status.waiting":"Materyal bekleniyor","status.missing":"Sınav materyali eklenmedi","status.unscheduled":"Sınav zamanı henüz belirlenmedi","date.unscheduled":"Tarih belirlenmedi","room.unscheduled":"Salon belirlenmedi","file.docx":"DOCX","file.upload":"Dosya yükle","file.replace":"Dosyayı değiştir","file.download":"Dosyayı indir","file.downloadExam":"Sınav dosyasını indir","file.preparing":"Hazırlanıyor...","file.uploading":"Yükleniyor...","file.processing":"İşleniyor...","file.uploaded":"Yüklendi","file.name":"Dosya adı","file.size":"Dosya boyutu","file.uploadedAt":"Yükleme tarihi","file.updatedAt":"Son güncelleme","file.choose":"DOCX dosyası seçin","file.chooseHint":"Yalnızca .docx · en fazla 20 MB","file.required":"Bir DOCX dosyası seçilmelidir.","file.extensionError":"Yalnızca .docx dosyaları kabul edilir.","file.mimeError":"Dosya DOCX MIME türünde değil.","file.sizeError":"Dosya boş veya 20 MB sınırını aşıyor.","file.uploadError":"Sınav materyali yüklenemedi.","file.downloadError":"Sınav dosyası açılamadı.","file.uploadSuccess":"Sınav materyali başarıyla eklendi.","file.replaceSuccess":"Sınav materyali başarıyla güncellendi.","file.ownerOnly":"Bu materyali yalnızca yükleyen öğretmen değiştirebilir.","file.conflict":"Bu grup, ders ve sınav türü için başka bir öğretmenin materyali zaten var.","empty.course":"Güncel dönemde ders bulunamadı.","empty.group":"Bu ders için güncel grup bulunamadı.","student.material":"Sınav materyali","student.materials":"Sınav materyalleri","student.materialMissing":"Sınav materyali henüz eklenmedi.","student.materialReadyHint":"Öğretmen sınav dosyasını ekledi. Sınav zamanı belirlenmeden önce de buradan indirebilirsiniz.","tutor.ready":"Materyal hazır","tutor.waiting":"Materyal eklenmedi","tutor.hint":"Tutor yalnızca materyal durumunu izler; dosyayı öğretmen yönetir.","aria.upload":"{type} sınav materyalini yükle","aria.replace":"{type} sınav materyalini değiştir","aria.download":"{type} sınav materyalini indir","common.retry":"Tekrar dene","officialSyncPending":"Resmî portala gönderiliyor","officialSyncProcessing":"Resmî portalda işleniyor","officialSyncSuccess":"Resmî portal ile senkronize edildi","officialSyncPartial":"Kısmen senkronize edildi","officialSyncFailed":"Resmî portal senkronizasyon hatası","officialSyncRetrying":"Yeniden kontrol ediliyor","officialExamCreated":"Resmî sınav oluşturuldu","semesterScoresSynced":"Dönem puanları senkronize edildi","unmatchedStudents":"{count} öğrenci resmî portalda bulunamadı","retryOfficialSync":"Resmî senkronizasyonu yeniden dene","officialGroupNotFound":"Grup resmî portalda bulunamadı.","officialExamAlreadyStarted":"Resmî sınav zaten başladı; materyal değiştirilemez.","officialInvalidDocx":"Resmî portal DOCX dosyasını geçersiz buldu.","officialPeriodMismatch":"Materyal güncel akademik yıl ve dönemle eşleşmiyor.","officialSyncRetryQueued":"Resmî senkronizasyon yeniden sıraya alındı.",
};

const ru: Dict = {
  "title":"Материалы экзамена","teacher.description":"Безопасно добавьте DOCX-файл теста или билетов для дисциплины и группы. Этот раздел полностью отделён от результатов экзамена.","course":"Дисциплина","group":"Группа","type":"Тип экзамена","type.test":"Тест","type.ticket":"Билеты","status.ready":"Материал готов","status.waiting":"Ожидается материал","status.missing":"Материал экзамена не добавлен","status.unscheduled":"Время экзамена ещё не назначено","date.unscheduled":"Дата не назначена","room.unscheduled":"Аудитория не назначена","file.docx":"DOCX","file.upload":"Загрузить файл","file.replace":"Заменить файл","file.download":"Скачать файл","file.downloadExam":"Скачать файл экзамена","file.preparing":"Подготовка...","file.uploading":"Загрузка...","file.processing":"Обработка...","file.uploaded":"Загружено","file.name":"Имя файла","file.size":"Размер файла","file.uploadedAt":"Дата загрузки","file.updatedAt":"Последнее обновление","file.choose":"Выберите DOCX-файл","file.chooseHint":"Только .docx · максимум 20 МБ","file.required":"Необходимо выбрать DOCX-файл.","file.extensionError":"Допускаются только файлы .docx.","file.mimeError":"Файл не соответствует MIME-типу DOCX.","file.sizeError":"Файл пуст или превышает лимит 20 МБ.","file.uploadError":"Не удалось загрузить материал экзамена.","file.downloadError":"Не удалось открыть файл экзамена.","file.uploadSuccess":"Материал экзамена успешно добавлен.","file.replaceSuccess":"Материал экзамена успешно обновлён.","file.ownerOnly":"Заменить этот материал может только загрузивший его преподаватель.","file.conflict":"Другой преподаватель уже загрузил материал для этой группы, дисциплины и типа экзамена.","empty.course":"Дисциплины текущего семестра не найдены.","empty.group":"Для этой дисциплины текущая группа не найдена.","student.material":"Материал экзамена","student.materials":"Материалы экзамена","student.materialMissing":"Материал экзамена пока не добавлен.","student.materialReadyHint":"Преподаватель добавил файл экзамена. Его можно скачать здесь даже до назначения времени экзамена.","tutor.ready":"Материал готов","tutor.waiting":"Материал не добавлен","tutor.hint":"Тьютор только отслеживает статус материала; файлом управляет преподаватель.","aria.upload":"Загрузить материал экзамена {type}","aria.replace":"Заменить материал экзамена {type}","aria.download":"Скачать материал экзамена {type}","common.retry":"Повторить","officialSyncPending":"Отправляется в официальный портал","officialSyncProcessing":"Обрабатывается в официальном портале","officialSyncSuccess":"Синхронизировано с официальным порталом","officialSyncPartial":"Частично синхронизировано","officialSyncFailed":"Ошибка синхронизации с официальным порталом","officialSyncRetrying":"Повторная проверка","officialExamCreated":"Официальный экзамен создан","semesterScoresSynced":"Семестровые баллы синхронизированы","unmatchedStudents":"{count} студентов не найдены в официальном портале","retryOfficialSync":"Повторить официальную синхронизацию","officialGroupNotFound":"Группа не найдена в официальном портале.","officialExamAlreadyStarted":"Официальный экзамен уже начался; материал нельзя заменить.","officialInvalidDocx":"Официальный портал отклонил DOCX как недействительный.","officialPeriodMismatch":"Материал не соответствует текущему учебному году и семестру.","officialSyncRetryQueued":"Официальная синхронизация снова поставлена в очередь.",
};

export const examMaterialMessages: Record<Locale, Dict> = { az, en, tr, ru };

function interpolate(value: string, vars?: Vars) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function examMaterialTranslate(locale: Locale, key: ExamMaterialI18nKey, vars?: Vars) {
  return interpolate(examMaterialMessages[locale][key] ?? az[key], vars);
}

export function useExamMaterialI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: ExamMaterialI18nKey, vars?: Vars) => examMaterialTranslate(locale, key, vars), [locale]);
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-GB";
  return { locale, intlLocale, t };
}
