import type { LegacyTranslation } from "@/lib/legacy-page-i18n-types";

const LEGACY_DATA = `
Təqvim	Takvim	Calendar	Календарь
Fakültə İcmalı	Fakülte Özeti	Faculty Overview	Обзор факультета
İdarəetmə Paneli	Yönetim Paneli	Administration Panel	Панель управления
Qruplar	Gruplar	Groups	Группы
Qrup	Grup	Group	Группа
Tyutorlar	Tutorlar	Tutors	Тьюторы
Tyutor	Tutor	Tutor	Тьютор
Tələbə	Öğrenci	Student	Студент
Tələbələr	Öğrenciler	Students	Студенты
Müəllim	Öğretmen	Teacher	Преподаватель
Müəllimlər	Öğretmenler	Teachers	Преподаватели
Dekan	Dekan	Dean	Декан
Administrator	Yönetici	Administrator	Администратор
Admin	Yönetici	Admin	Администратор
İstifadəçi	Kullanıcı	User	Пользователь
İstifadəçilər	Kullanıcılar	Users	Пользователи
Rol	Rol	Role	Роль
Status	Durum	Status	Статус
Fənn	Ders	Course	Дисциплина
Fənlər	Dersler	Courses	Дисциплины
Dərslər	Dersler	Courses	Дисциплины
Tarix	Tarih	Date	Дата
Başlanğıc	Başlangıç	Start	Начало
Bitmə	Bitiş	End	Окончание
Otaq	Derslik	Room	Аудитория
Mövzu	Konu	Topic	Тема
Qeyd	Not	Note	Заметка
Qeydlər	Notlar	Notes	Заметки
Fayl	Dosya	File	Файл
Əməliyyat	İşlem	Operation	Операция
Əməliyyatlar	İşlemler	Operations	Операции
Ətraflı məlumat	Ayrıntılı bilgi	Detailed information	Подробная информация
Davamiyyət	Devamlılık	Attendance	Посещаемость
Kəsilməzlik	Devamlılık	Continuity	Непрерывность
Yekun	Toplam	Final	Итог
Cəmi	Toplam	Total	Всего
Bax	Görüntüle	View	Просмотр
Yeni	Yeni	New	Новый
Redaktə	Düzenle	Edit	Изменить
Redaktə et	Düzenle	Edit	Изменить
Sil	Sil	Delete	Удалить
Seç	Seç	Select	Выбрать
Seçim	Seçim	Selection	Выбор
Yadda saxla	Kaydet	Save	Сохранить
Ləğv et	İptal	Cancel	Отмена
İmtina	Vazgeç	Cancel	Отмена
Yenilə	Güncelle	Update	Обновить
Yenidən cəhd et	Tekrar dene	Try again	Повторить
Təkrar yoxla	Tekrar kontrol et	Check again	Проверить снова
Əvvəlki	Önceki	Previous	Предыдущая
Növbəti	Sonraki	Next	Следующая
Yüklənir...	Yükleniyor...	Loading...	Загрузка...
yenilənir...	güncelleniyor...	updating...	обновляется...
Məlumat yoxdur.	Veri yok.	No data.	Нет данных.
Naməlum	Bilinmiyor	Unknown	Неизвестно
Naməlum istifadəçi	Bilinmeyen kullanıcı	Unknown user	Неизвестный пользователь
Naməlum fənn	Bilinmeyen ders	Unknown course	Неизвестная дисциплина
Adsız	İsimsiz	Unnamed	Без имени
Adsız tələbə	İsimsiz öğrenci	Unnamed student	Студент без имени
bəli	evet	yes	да
xeyr	hayır	no	нет
Xeyr	No	No.	№
AKTİV	AKTİF	ACTIVE	АКТИВЕН
PASSİV	PASİF	INACTIVE	НЕАКТИВЕН
Payız	Güz	Autumn	Осень
Yaz	Bahar	Spring	Весна
Statusu	Durumu	Set status to	Сделать статус
aktiv	aktif	active	активным
passiv	pasif	inactive	неактивным
et	yap		
fəaliyyət	etkinlik	activities	действий
mövzu	konu	topics	тем
slot	slot	slots	слотов
Qrup:	Grup:	Group:	Группа:
Cari həftə:	Geçerli hafta:	Current week:	Текущая неделя:
Akademik Detallar —	Akademik Detaylar —	Academic Details —	Академические детали —
üzrə fakültə göstəriciləri	fakülte göstergeleri	faculty indicators	показатели факультета
Təqvim — ATU Şəxsi Kabinet	Takvim — ATU Portal	Calendar — ATU Portal	Календарь — ATU Portal
Dərs və tədbir cədvəliniz.	Ders ve etkinlik takviminiz.	Your lesson and event calendar.	Ваш календарь занятий и событий.
Cədvəl tənzimləməsi	Program ayarları	Schedule management	Настройка расписания
Dərs sessiyası	Ders oturumu	Lesson session	Учебное занятие
Dərs	Ders	Lesson	Занятие
İmtahan	Sınav	Exam	Экзамен
İmtahan cədvəli	Sınav programı	Exam schedule	Расписание экзаменов
Bilet imtahanı	Bilet sınavı	Ticket exam	Экзамен по билетам
Test imtahanı	Test sınavı	Test exam	Тестовый экзамен
İmtahan nəticəsi	Sınav sonucu	Exam result	Результат экзамена
İstifadəçi tapılmadı.	Kullanıcı bulunamadı.	User not found.	Пользователь не найден.
Tədbir yeniləndi.	Etkinlik güncellendi.	Event updated.	Событие обновлено.
Tədbir yaradıldı.	Etkinlik oluşturuldu.	Event created.	Событие создано.
Tədbir silindi.	Etkinlik silindi.	Event deleted.	Событие удалено.
Cari həftə: ...	Geçerli hafta: ...	Current week: ...	Текущая неделя: ...
Cari həftə: Ayarlanmayıb	Geçerli hafta: Ayarlanmamış	Current week: Not configured	Текущая неделя: Не настроена
Tədbiri Redaktə et	Etkinliği Düzenle	Edit Event	Редактировать событие
Yeni Tədbir Əlavə et	Yeni Etkinlik Ekle	Add New Event	Добавить событие
Başlıq	Başlık	Title	Заголовок
Tədbirin başlığı	Etkinlik başlığı	Event title	Название события
Tarix seçin	Tarih seçin	Select date	Выберите дату
Başlanğıc Saat	Başlangıç Saati	Start Time	Время начала
Bitmə Saat	Bitiş Saati	End Time	Время окончания
Universitet (Hamı)	Üniversite (Herkes)	University (Everyone)	Университет (Все)
Tədris Fənni	Ders	Course	Дисциплина
Seçilməyib	Seçilmedi	Not selected	Не выбрано
Təsvir	Açıklama	Description	Описание
Tədbir haqqında ətraflı məlumat	Etkinlik hakkında ayrıntılı bilgi	Detailed information about the event	Подробная информация о событии
Tədbiri Sil	Etkinliği Sil	Delete Event	Удалить событие
Yarat	Oluştur	Create	Создать
Əminsiniz?	Emin misiniz?	Are you sure?	Вы уверены?
Bu tədbiri silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.	Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.	Are you sure you want to delete this event? This action cannot be undone.	Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.
Bəli, Sil	Evet, Sil	Yes, Delete	Да, удалить
Qrupun həftəlik şablonunu qurun; sessiyalar semestrə avtomatik generasiya olunur.	Grubun haftalık şablonunu oluşturun; oturumlar dönem için otomatik oluşturulur.	Configure the group's weekly template; sessions are generated automatically for the semester.	Настройте недельный шаблон группы; занятия автоматически создаются на семестр.
İdarə edə biləcəyiniz qrup tapılmadı.	Yönetebileceğiniz grup bulunamadı.	No group you can manage was found.	Не найдено групп, которыми вы можете управлять.
Həftəlik dərs cədvəli	Haftalık ders programı	Weekly lesson schedule	Еженедельное расписание занятий
Şablon dəyişdikdə təsdiqlənməmiş sessiyalar avtomatik yenidən qurulur.	Şablon değiştiğinde onaylanmamış oturumlar otomatik yeniden oluşturulur.	Unconfirmed sessions are rebuilt automatically when the template changes.	Неподтверждённые занятия автоматически перестраиваются при изменении шаблона.
Bu qrupa \`course_groups\` ilə bağlı fənn yoxdur.	Bu gruba \`course_groups\` üzerinden bağlı ders yok.	No course is linked to this group through \`course_groups\`.	К этой группе не привязана дисциплина через \`course_groups\`.
Slot yaratmazdan əvvəl fənni qrupa təyin edin.	Slot oluşturmadan önce dersi gruba atayın.	Assign a course to the group before creating a slot.	Перед созданием слота назначьте дисциплину группе.
Slot əlavə et	Slot ekle	Add slot	Добавить слот
Bu gün üçün dərs slotu yoxdur	Bu gün için ders slotu yok	No lesson slot for this day	На этот день нет учебных слотов
Əlavə etmək üçün klikləyin	Eklemek için tıklayın	Click to add	Нажмите, чтобы добавить
Dərs növü yoxdur	Ders türü yok	No lesson type	Тип занятия не указан
Dərs slotunu redaktə et	Ders slotunu düzenle	Edit lesson slot	Редактировать учебный слот
Yeni dərs slotu	Yeni ders slotu	New lesson slot	Новый учебный слот
Fənn seçin	Ders seçin	Select a course	Выберите дисциплину
Müəllim seçin	Öğretmen seçin	Select a teacher	Выберите преподавателя
Dərs növü	Ders türü	Lesson type	Тип занятия
Dərs növü seçin.	Ders türü seçin.	Select a lesson type.	Выберите тип занятия.
İcazəli dərs növünü seçin	İzin verilen ders türünü seçin	Select an allowed lesson type	Выберите разрешённый тип занятия
Bu müəllimin fənn üzrə aktiv Elektron Jurnal icazəsi yoxdur.	Bu öğretmenin ders için etkin Elektronik Günlük izni yok.	This teacher has no active Electronic Journal permission for the course.	У этого преподавателя нет активного разрешения Электронного журнала по дисциплине.
Başlanğıc saatı bitmə saatından əvvəl olmalıdır.	Başlangıç saati bitiş saatinden önce olmalıdır.	The start time must be before the end time.	Время начала должно быть раньше времени окончания.
Məsələn: B2-105	Örneğin: B2-105	For example: B2-105	Например: B2-105
Həftə növü	Hafta türü	Week type	Тип недели
Hər həftə	Her hafta	Every week	Каждую неделю
Yalnız ÜST	Yalnızca ÜST	UPPER only	Только ВЕРХ
Yalnız ALT	Yalnızca ALT	LOWER only	Только НИЗ
Dərs slotu yeniləndi.	Ders slotu güncellendi.	Lesson slot updated.	Учебный слот обновлён.
Dərs slotu əlavə edildi.	Ders slotu eklendi.	Lesson slot added.	Учебный слот добавлен.
Dərs slotu silindi.	Ders slotu silindi.	Lesson slot deleted.	Учебный слот удалён.
Şablon yadda saxlandı, amma sessiyalar yenilənmədi. Tənzimləmələrdə həftə rotasiyasını tamamlayın.	Şablon kaydedildi ancak oturumlar güncellenmedi. Ayarlardan hafta rotasyonunu tamamlayın.	The template was saved, but sessions were not updated. Complete the week rotation in Settings.	Шаблон сохранён, но занятия не обновлены. Завершите настройку ротации недель в настройках.
Şablon silindi, sessiyaların yenilənməsi üçün həftə rotasiyasını tamamlayın.	Şablon silindi; oturumları güncellemek için hafta rotasyonunu tamamlayın.	The template was deleted; complete the week rotation to update sessions.	Шаблон удалён; завершите ротацию недель для обновления занятий.
Bazar ertəsi	Pazartesi	Monday	Понедельник
Çərşənbə axşamı	Salı	Tuesday	Вторник
Çərşənbə	Çarşamba	Wednesday	Среда
`;

export const LEGACY_TEXT_1: Record<string, LegacyTranslation> = Object.fromEntries(
  LEGACY_DATA.trim().split("\n").map((line) => {
    const [source, tr, en, ru] = line.split("\t");
    return [source!, [tr!, en!, ru!] as LegacyTranslation];
  }),
);
