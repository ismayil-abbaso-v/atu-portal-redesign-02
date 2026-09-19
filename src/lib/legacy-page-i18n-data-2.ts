import type { LegacyTranslation } from "@/lib/legacy-page-i18n-types";

const LEGACY_DATA = `
Cümə axşamı	Perşembe	Thursday	Четверг
Cümə	Cuma	Friday	Пятница
Şənbə	Cumartesi	Saturday	Суббота
Bazar	Pazar	Sunday	Воскресенье
Fakültə İcmalı — ATU Şəxsi Kabinet	Fakülte Özeti — ATU Portal	Faculty Overview — ATU Portal	Обзор факультета — ATU Portal
Bu səhifə yalnız dekan üçün əlçatandır.	Bu sayfaya yalnızca dekan erişebilir.	This page is available only to the dean.	Эта страница доступна только декану.
Profilinizdə fakültə məlumatı təyin edilməyib.	Profilinizde fakülte bilgisi tanımlanmamış.	Faculty information is not set in your profile.	В вашем профиле не указана информация о факультете.
PDF / Çap	PDF / Yazdır	PDF / Print	PDF / Печать
Hesabat generasiya et	Rapor oluştur	Generate report	Сформировать отчёт
Ümumi tələbə sayı	Toplam öğrenci sayısı	Total students	Общее число студентов
Tələbə sayı	Öğrenci sayısı	Student count	Количество студентов
Ortalama davamiyyət	Ortalama devamlılık	Average attendance	Средняя посещаемость
Ortalama davamiyyət %	Ortalama devamlılık %	Average attendance %	Средняя посещаемость %
Ortalama yekun qiymət	Ortalama final notu	Average final grade	Средняя итоговая оценка
Ortalama qiymət	Ortalama not	Average grade	Средняя оценка
Aktiv qrup sayı	Aktif grup sayısı	Active groups	Количество активных групп
Davamiyyət trendi	Devamlılık trendi	Attendance trend	Динамика посещаемости
Son 6 ay	Son 6 ay	Last 6 months	Последние 6 месяцев
Davamiyyət trendi üçün məlumat yoxdur.	Devamlılık trendi için veri yok.	No data is available for the attendance trend.	Нет данных для динамики посещаемости.
Qrup və ya tyutor axtar...	Grup veya tutor ara...	Search group or tutor...	Поиск группы или тьютора...
Sıra: davamiyyət	Sıralama: devamlılık	Sort: attendance	Сортировка: посещаемость
Sıra: qiymət	Sıralama: not	Sort: grade	Сортировка: оценка
Davamiyyət %	Devamlılık %	Attendance %	Посещаемость %
Uyğun nəticə tapılmadı.	Uygun sonuç bulunamadı.	No matching result was found.	Подходящих результатов не найдено.
Tyutor və tələbə hesablarına baxış	Tutor ve öğrenci hesaplarına genel bakış	Tutor and student account overview	Обзор аккаунтов тьюторов и студентов
Yalnız oxuma · status istisnadır	Salt okunur · durum hariç	Read only · except status	Только чтение · кроме статуса
Profil məlumatları	Profil bilgileri	Profile information	Информация профиля
E-poçt	E-posta	Email	Эл. почта
Telefon	Telefon	Phone	Телефон
Fakültə	Fakülte	Faculty	Факультет
Status yeniləndi.	Durum güncellendi.	Status updated.	Статус обновлён.
Status dəyişdirilə bilmədi.	Durum değiştirilemedi.	Status could not be changed.	Не удалось изменить статус.
İmtahanlar — ATU Şəxsi Kabinet	Sınavlar — ATU Portal	Exams — ATU Portal	Экзамены — ATU Portal
İmtahan balları, davamiyyət və akademik qeydləriniz.	Sınav puanlarınız, devamlılık ve akademik notlarınız.	Your exam scores, attendance, and academic notes.	Ваши экзаменационные баллы, посещаемость и академические записи.
Akademik Detallar	Akademik Detaylar	Academic Details	Академические детали
Qeydlər Jurnalı	Notlar Günlüğü	Notes Journal	Журнал заметок
İştirak edib	Katıldı	Attended	Присутствовал
İştirak edir	Katılıyor	Present	Присутствует
Qayıb	Yok	Absent	Отсутствует
Davamiyyət qeydi yoxdur.	Devam kaydı yok.	No attendance record.	Записей о посещаемости нет.
Qeyd tapılmadı.	Not bulunamadı.	No notes found.	Заметки не найдены.
Yüklə	İndir	Download	Скачать
Fayl yüklənərkən xəta baş verdi.	Dosya indirilirken hata oluştu.	An error occurred while downloading the file.	Произошла ошибка при скачивании файла.
İmtahan ballarının daxil edilməsi	Sınav puanlarının girilmesi	Enter exam scores	Ввод экзаменационных баллов
Semestr balı Elektron Jurnalın 50 ballıq formulundan avtomatik gəlir və burada dəyişdirilə bilməz.	Dönem puanı Elektronik Günlüğün 50 puanlık formülünden otomatik gelir ve burada değiştirilemez.	The semester score is taken automatically from the Electronic Journal's 50-point formula and cannot be changed here.	Семестровый балл автоматически берётся из 50-балльной формулы Электронного журнала и не может быть изменён здесь.
Bu fənn üzrə tələbə tapılmadı.	Bu ders için öğrenci bulunamadı.	No students were found for this course.	По этой дисциплине студенты не найдены.
Semestr balı	Dönem puanı	Semester score	Семестровый балл
İmtahan balı	Sınav puanı	Exam score	Экзаменационный балл
Elektron Jurnal formulunun nəticəsi	Elektronik Günlük formülü sonucu	Electronic Journal formula result	Результат формулы Электронного журнала
İmtahan ballarını yadda saxla	Sınav puanlarını kaydet	Save exam scores	Сохранить экзаменационные баллы
Rəhbərlik etdiyiniz qrup tapılmadı.	Yönettiğiniz grup bulunamadı.	No group under your supervision was found.	Группа под вашим руководством не найдена.
Davamiyyət qeydi	Devam kaydı	Attendance record	Учёт посещаемости
İmtahanlar	Sınavlar	Exams	Экзамены
Davamiyyət jurnalı uğurla qeyd olundu.	Devam günlüğü başarıyla kaydedildi.	Attendance journal saved successfully.	Журнал посещаемости успешно сохранён.
Bu qrupa təyin edilmiş fənn tapılmadı.	Bu gruba atanmış ders bulunamadı.	No course assigned to this group was found.	Для этой группы не найдено назначенной дисциплины.
Jurnalı Yadda Saxla	Günlüğü Kaydet	Save Journal	Сохранить журнал
Kəsilməyib	Kesilmedi	Not interrupted	Не прервано
Kəsilib	Kesildi	Interrupted	Прервано
Qeyd yeniləndi.	Not güncellendi.	Note updated.	Заметка обновлена.
Yeni qeyd əlavə olundu.	Yeni not eklendi.	New note added.	Новая заметка добавлена.
Qeyd jurnalından silindi.	Not günlükten silindi.	Note deleted from the journal.	Заметка удалена из журнала.
Yeni qeyd yaz	Yeni not yaz	Write new note	Добавить заметку
Bu tələbə və fənn üzrə qeyd yazılmayıb.	Bu öğrenci ve ders için not yazılmamış.	No note has been written for this student and course.	Для этого студента и дисциплины заметок нет.
Qeydi Redaktə et	Notu Düzenle	Edit Note	Редактировать заметку
Yeni Qeyd yaz	Yeni Not Yaz	Write New Note	Добавить новую заметку
Dərs mövzusu	Ders konusu	Lesson topic	Тема занятия
Material Faylı	Materyal Dosyası	Material File	Файл материала
Mövcud fayl yüklənib	Mevcut dosya yüklendi	Existing file is attached	Текущий файл прикреплён
Fayl seçin...	Dosya seçin...	Choose a file...	Выберите файл...
Əlavə Qeyd	Ek Not	Additional Note	Дополнительная заметка
Qeydlərinizi bura yazın...	Notlarınızı buraya yazın...	Write your notes here...	Введите заметки здесь...
Silməyi təsdiqləyin	Silmeyi onaylayın	Confirm deletion	Подтвердите удаление
Bu qeydi jurnaldan silmək istədiyinizə əminsiniz? Sənəd silindikdən sonra geri qaytarıla bilməz.	Bu notu günlükten silmek istediğinizden emin misiniz? Silindikten sonra geri alınamaz.	Are you sure you want to delete this note from the journal? It cannot be restored after deletion.	Вы уверены, что хотите удалить эту заметку из журнала? После удаления восстановить её нельзя.
Qruplar — ATU Şəxsi Kabinet	Gruplar — ATU Portal	Groups — ATU Portal	Группы — ATU Portal
Qrupların idarə edilməsi.	Grupların yönetimi.	Group management.	Управление группами.
Qrup axtar...	Grup ara...	Search groups...	Поиск групп...
Aktiv qruplar	Aktif gruplar	Active groups	Активные группы
Arxivə bax	Arşivi görüntüle	View archive	Открыть архив
Arxivlə	Arşivle	Archive	Архивировать
Qruplar yüklənərkən xəta baş verdi.	Gruplar yüklenirken hata oluştu.	An error occurred while loading groups.	Произошла ошибка при загрузке групп.
Arxivlənmiş qrup tapılmadı.	Arşivlenmiş grup bulunamadı.	No archived group was found.	Архивные группы не найдены.
Heç bir qrup tapılmadı.	Hiçbir grup bulunamadı.	No groups found.	Группы не найдены.
Rəhbər tayin edilməyib	Yönetici atanmamış	No leader assigned	Руководитель не назначен
Qrup adını daxil edin.	Grup adını girin.	Enter a group name.	Введите название группы.
Qrup üçün fakültə seçin.	Grup için fakülte seçin.	Select a faculty for the group.	Выберите факультет для группы.
Qrup yaradıldı.	Grup oluşturuldu.	Group created.	Группа создана.
Qrup yaradıla bilmədi.	Grup oluşturulamadı.	Group could not be created.	Не удалось создать группу.
Qruplar arxivdən çıxarıldı.	Gruplar arşivden çıkarıldı.	Groups were restored from the archive.	Группы восстановлены из архива.
Qruplar arxivləşdirildi.	Gruplar arşivlendi.	Groups were archived.	Группы архивированы.
Əməliyyat uğursuz oldu.	İşlem başarısız oldu.	The operation failed.	Операция не выполнена.
Qrup — ATU Şəxsi Kabinet	Grup — ATU Portal	Group — ATU Portal	Группа — ATU Portal
Qrupun təfərrüatları.	Grup ayrıntıları.	Group details.	Сведения о группе.
Qrup təfərrüatı	Grup ayrıntıları	Group details	Сведения о группе
Qrup məlumatları yüklənə bilmədi və ya qrup tapılmadı.	Grup bilgileri yüklenemedi veya grup bulunamadı.	Group information could not be loaded or the group was not found.	Не удалось загрузить данные группы или группа не найдена.
Qrup adı yeniləndi.	Grup adı güncellendi.	Group name updated.	Название группы обновлено.
Qrup adı yenilənə bilmədi.	Grup adı güncellenemedi.	Group name could not be updated.	Не удалось обновить название группы.
Tələbə qrupdan çıxarıldı.	Öğrenci gruptan çıkarıldı.	Student removed from the group.	Студент удалён из группы.
Tələbə çıxarıla bilmədi.	Öğrenci gruptan çıkarılamadı.	Student could not be removed.	Не удалось удалить студента.
Qrupu redaktə et	Grubu düzenle	Edit group	Редактировать группу
Rəhbər təyin et	Yönetici ata	Assign leader	Назначить руководителя
Rəhbər	Yönetici	Leader	Руководитель
Tələbə əlavə et	Öğrenci ekle	Add student	Добавить студента
Fənn əlavə et	Ders ekle	Add course	Добавить дисциплину
Qrup rəhbəri	Grup yöneticisi	Group leader	Руководитель группы
Qrup üzvləri	Grup üyeleri	Group members	Участники группы
Qrup məlumatları	Grup bilgileri	Group information	Информация о группе
İdarəetmə Paneli — ATU Şəxsi Kabinet	Yönetim Paneli — ATU Portal	Administration Panel — ATU Portal	Панель управления — ATU Portal
Admin panelinin ümumi göstəriciləri.	Yönetim panelinin genel göstergeleri.	Administration panel overview.	Общие показатели панели управления.
Bugün	Bugün	Today	Сегодня
Bu həftə	Bu hafta	This week	Эта неделя
Bu ay	Bu ay	This month	Этот месяц
Son 30 gün	Son 30 gün	Last 30 days	Последние 30 дней
Sərbəst	Özel	Custom	Произвольно
Tarix aralığı	Tarih aralığı	Date range	Диапазон дат
Bütün fakültələr	Tüm fakülteler	All faculties	Все факультеты
Bütün rollar	Tüm roller	All roles	Все роли
Bütün əməliyyatlar	Tüm işlemler	All operations	Все операции
Günlər üzrə	Günlere göre	By day	По дням
Həftələr üzrə	Haftalara göre	By week	По неделям
Aylar üzrə	Aylara göre	By month	По месяцам
— aktiv	— aktif	— active	— активно
Statistika yüklənərkən xəta baş verdi.	İstatistikler yüklenirken hata oluştu.	An error occurred while loading statistics.	Произошла ошибка при загрузке статистики.
Ümumi istifadəçilər	Toplam kullanıcı	Total users	Всего пользователей
Tezliklə	Yakında	Coming soon	Скоро
Kitablar	Kitaplar	Books	Книги
Bugünkü loqlar	Bugünkü kayıtlar	Today's logs	Сегодняшние журналы
Qeydiyyatlar	Kayıtlar	Registrations	Регистрации
İstifadəçi qeydiyyatları	Kullanıcı kayıtları	User registrations	Регистрации пользователей
Qrafik yüklənərkən xəta baş verdi.	Grafik yüklenirken hata oluştu.	An error occurred while loading the chart.	Произошла ошибка при загрузке графика.
Seçilmiş dövrdə qeydiyyat qeydə alınmayıb.	Seçilen dönemde kayıt bulunmuyor.	No registrations were recorded during the selected period.	За выбранный период регистраций не было.
Ən aktiv istifadəçilər	En aktif kullanıcılar	Most active users	Самые активные пользователи
Hələ fəaliyyət qeydə alınmayıb.	Henüz etkinlik kaydedilmedi.	No activity has been recorded yet.	Активность пока не зафиксирована.
Bu gün sistemdə qeydə alınan fəaliyyətlərin sayı.	Bugün sistemde kaydedilen etkinliklerin sayısı.	Number of activities recorded in the system today.	Количество действий, зарегистрированных в системе сегодня.
Son fəaliyyət	Son etkinlik	Recent activity	Последняя активность
Hamısına bax	Tümünü görüntüle	View all	Посмотреть все
Fəaliyyət məlumatı yüklənmədi.	Etkinlik verileri yüklenemedi.	Activity data could not be loaded.	Не удалось загрузить данные активности.
Dərslər — ATU Şəxsi Kabinet	Dersler — ATU Portal	Courses — ATU Portal	Дисциплины — ATU Portal
Dərslərin idarə edilməsi.	Derslerin yönetimi.	Course management.	Управление дисциплинами.
Fənn axtar...	Ders ara...	Search courses...	Поиск дисциплин...
Yeni fənn	Yeni ders	New course	Новая дисциплина
Fənlər yüklənərkən xəta baş verdi.	Dersler yüklenirken hata oluştu.	An error occurred while loading courses.	Произошла ошибка при загрузке дисциплин.
Heç bir fənn tapılmadı.	Hiçbir ders bulunamadı.	No courses found.	Дисциплины не найдены.
`;

export const LEGACY_TEXT_2: Record<string, LegacyTranslation> = Object.fromEntries(
  LEGACY_DATA.trim().split("\n").map((line) => {
    const [source, tr, en, ru] = line.split("\t");
    return [source!, [tr!, en!, ru!] as LegacyTranslation];
  }),
);
