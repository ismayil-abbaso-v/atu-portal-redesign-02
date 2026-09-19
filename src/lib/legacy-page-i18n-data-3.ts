import type { LegacyTranslation } from "@/lib/legacy-page-i18n-types";

const LEGACY_DATA = `
İstifadəçilər — ATU Şəxsi Kabinet	Kullanıcılar — ATU Portal	Users — ATU Portal	Пользователи — ATU Portal
İstifadəçilərin idarə edilməsi.	Kullanıcı yönetimi.	User management.	Управление пользователями.
Axtar...	Ara...	Search...	Поиск...
Arxivləşdir	Arşivle	Archive	Архивировать
Seçilmiş istifadəçilər arxivləşdirildi.	Seçilen kullanıcılar arşivlendi.	Selected users were archived.	Выбранные пользователи архивированы.
Arxivləşdirmə uğursuz oldu.	Arşivleme başarısız oldu.	Archiving failed.	Не удалось архивировать.
Şifrə ən azı 6 simvol olmalıdır.	Şifre en az 6 karakter olmalıdır.	Password must be at least 6 characters.	Пароль должен содержать не менее 6 символов.
Şifrə uğurla dəyişdirildi.	Şifre başarıyla değiştirildi.	Password changed successfully.	Пароль успешно изменён.
Şifrə dəyişdirilə bilmədi.	Şifre değiştirilemedi.	Password could not be changed.	Не удалось изменить пароль.
İstifadəçi silindi.	Kullanıcı silindi.	User deleted.	Пользователь удалён.
İstifadəçi silinə bilmədi.	Kullanıcı silinemedi.	User could not be deleted.	Не удалось удалить пользователя.
Profil şəkli yeniləndi.	Profil resmi güncellendi.	Profile picture updated.	Фото профиля обновлено.
Şəkil yüklənə bilmədi.	Resim yüklenemedi.	Image could not be uploaded.	Не удалось загрузить изображение.
İstifadəçilər yüklənərkən xəta baş verdi.	Kullanıcılar yüklenirken hata oluştu.	An error occurred while loading users.	Произошла ошибка при загрузке пользователей.
Heç bir istifadəçi tapılmadı.	Hiçbir kullanıcı bulunamadı.	No users found.	Пользователи не найдены.
No	No	No.	№
Ad	Ad	First name	Имя
Soyad	Soyad	Last name	Фамилия
Ata adı	Baba adı	Middle name	Отчество
İstifadəçi adı	Kullanıcı adı	Username	Имя пользователя
Şifrə	Şifre	Password	Пароль
Profil Şəkli	Profil Resmi	Profile Picture	Фото профиля
Cins	Cinsiyet	Gender	Пол
FİN Kodu	FIN Kodu	FIN Code	FIN-код
Doğum tarixi	Doğum tarihi	Date of birth	Дата рождения
Qəbul ili	Kabul yılı	Admission year	Год поступления
Bitirmə ili	Mezuniyet yılı	Graduation year	Год выпуска
İxtisas	Bölüm	Major	Специальность
Şəhər	Şehir	City	Город
DİM Balı	DİM Puanı	DIM Score	Балл DİM
Təhsil növü	Eğitim türü	Education type	Форма обучения
Sosial vəziyyət	Sosyal durum	Social status	Социальный статус
Təhsil haqqı	Öğrenim ücreti	Tuition fee	Стоимость обучения
ESD istifadəçisi	ESD kullanıcısı	ESD user	Пользователь ESD
Şifrəni dəyiş	Şifreyi değiştir	Change password	Изменить пароль
Yüklənir...	Yükleniyor...	Uploading...	Загрузка...
Şəkli dəyiş	Resmi değiştir	Change picture	Изменить фото
Yeni şifrə	Yeni şifre	New password	Новый пароль
İstifadəçini silmək istəyirsiniz?	Kullanıcıyı silmek istiyor musunuz?	Do you want to delete the user?	Удалить пользователя?
Redaktə et	Düzenle	Edit	Изменить
Loqlar — ATU Şəxsi Kabinet	Kayıtlar — ATU Portal	Logs — ATU Portal	Журналы — ATU Portal
Loqlar	Kayıtlar	Logs	Журналы
Ad, soyad və ya istifadəçi adı...	Ad, soyad veya kullanıcı adı...	Name, surname or username...	Имя, фамилия или имя пользователя...
Filtrləri təmizlə	Filtreleri temizle	Clear filters	Очистить фильтры
Loqlar yüklənmədi	Kayıtlar yüklenemedi	Logs could not be loaded	Не удалось загрузить журналы
Məlumat bazası sorğusu zamanı xəta baş verdi.	Veritabanı sorgusu sırasında hata oluştu.	An error occurred while querying the database.	Произошла ошибка при запросе к базе данных.
Bu filtrlərə uyğun fəaliyyət tapılmadı.	Bu filtrelere uygun etkinlik bulunamadı.	No activity matches these filters.	Нет действий, соответствующих этим фильтрам.
Giriş Edildi	Giriş Yapıldı	Signed In	Вход выполнен
Sessiya Sonlandırıldı	Oturum Sonlandırıldı	Session Ended	Сеанс завершён
Səhifə Açıldı	Sayfa Açıldı	Page Opened	Страница открыта
Bildirişlər Oxundu	Bildirimler Okundu	Notifications Read	Уведомления прочитаны
Profil Yeniləndi	Profil Güncellendi	Profile Updated	Профиль обновлён
Qrup Yaradıldı	Grup Oluşturuldu	Group Created	Группа создана
Qrup Yeniləndi	Grup Güncellendi	Group Updated	Группа обновлена
Qrup Silindi	Grup Silindi	Group Deleted	Группа удалена
Fənn Yaradıldı	Ders Oluşturuldu	Course Created	Дисциплина создана
Fənn Yeniləndi	Ders Güncellendi	Course Updated	Дисциплина обновлена
Fənn Silindi	Ders Silindi	Course Deleted	Дисциплина удалена
Kitab Əlavə Edildi	Kitap Eklendi	Book Added	Книга добавлена
Kitab Yeniləndi	Kitap Güncellendi	Book Updated	Книга обновлена
Kitab Silindi	Kitap Silindi	Book Deleted	Книга удалена
Fayl Yükləndi	Dosya Yüklendi	File Uploaded	Файл загружен
Fayl Silindi	Dosya Silindi	File Deleted	Файл удалён
Qrup Üzvü Əlavə Edildi	Grup Üyesi Eklendi	Group Member Added	Участник группы добавлен
Qrup Üzvü Silindi	Grup Üyesi Silindi	Group Member Removed	Участник группы удалён
Müəllim Təyin Edildi	Öğretmen Atandı	Teacher Assigned	Преподаватель назначен
Müəllim Təyinatı Yeniləndi	Öğretmen Ataması Güncellendi	Teacher Assignment Updated	Назначение преподавателя обновлено
Müəllim Təyinatı Silindi	Öğretmen Ataması Silindi	Teacher Assignment Removed	Назначение преподавателя удалено
Mövzu Əlavə Edildi	Konu Eklendi	Topic Added	Тема добавлена
Mövzu Yeniləndi	Konu Güncellendi	Topic Updated	Тема обновлена
Mövzu Silindi	Konu Silindi	Topic Deleted	Тема удалена
Rol Əlavə Edildi	Rol Eklendi	Role Added	Роль добавлена
Rol Yeniləndi	Rol Güncellendi	Role Updated	Роль обновлена
Rol Silindi	Rol Silindi	Role Removed	Роль удалена
Sistem Tənzimləməsi Yeniləndi	Sistem Ayarı Güncellendi	System Setting Updated	Системная настройка обновлена
Jurnal Sessiyasının Kilidi Açıldı	Günlük Oturumu Kilidi Açıldı	Journal Session Unlocked	Сеанс журнала разблокирован
Elan Yaradıldı	Duyuru Oluşturuldu	Announcement Created	Объявление создано
Elan Yeniləndi	Duyuru Güncellendi	Announcement Updated	Объявление обновлено
Elan Silindi	Duyuru Silindi	Announcement Deleted	Объявление удалено
Tənzimləmələr — ATU Şəxsi Kabinet	Ayarlar — ATU Portal	Settings — ATU Portal	Настройки — ATU Portal
Tənzimləmələr	Ayarlar	Settings	Настройки
Sistem tənzimləmələri sətri tapılmadı.	Sistem ayarları kaydı bulunamadı.	System settings record was not found.	Запись системных настроек не найдена.
Məcburi sahələri doldurun.	Zorunlu alanları doldurun.	Fill in the required fields.	Заполните обязательные поля.
İlk tədris həftəsinin növünü və rotasiya başlama tarixini seçin.	İlk eğitim haftası türünü ve rotasyon başlangıç tarihini seçin.	Select the first teaching-week type and the rotation start date.	Выберите тип первой учебной недели и дату начала ротации.
Rotasiya başlama tarixi Bazar ertəsi olmalıdır.	Rotasyon başlangıç tarihi Pazartesi olmalıdır.	The rotation start date must be a Monday.	Дата начала ротации должна быть понедельником.
Tənzimləmələr yadda saxlanıldı.	Ayarlar kaydedildi.	Settings saved.	Настройки сохранены.
Tənzimləmələr yadda saxlanılarkən xəta baş verdi.	Ayarlar kaydedilirken hata oluştu.	An error occurred while saving settings.	Произошла ошибка при сохранении настроек.
Sistem tənzimləmələri yüklənmədi.	Sistem ayarları yüklenemedi.	System settings could not be loaded.	Не удалось загрузить системные настройки.
Sistem tənzimləmələri	Sistem ayarları	System settings	Системные настройки
Portalın əsas məlumatlarını idarə edin.	Portalın temel bilgilerini yönetin.	Manage the portal's core information.	Управляйте основными данными портала.
Universitet adı	Üniversite adı	University name	Название университета
Əlaqə e-poçtu	İletişim e-postası	Contact email	Контактная эл. почта
Cari tədris ili	Geçerli akademik yıl	Current academic year	Текущий учебный год
Cari semestr	Geçerli dönem	Current semester	Текущий семестр
Alt / Üst həftə rotasiyası	Alt / Üst hafta rotasyonu	Lower / Upper week rotation	Ротация нижней / верхней недели
Cron istifadə edilmir; cari həftə bu başlanğıc nöqtəsindən riyazi hesablanır.	Cron kullanılmaz; geçerli hafta bu başlangıç noktasından matematiksel olarak hesaplanır.	Cron is not used; the current week is calculated mathematically from this starting point.	Cron не используется; текущая неделя вычисляется математически от этой начальной точки.
Semestrin 1-ci tədris həftəsi	Dönemin 1. eğitim haftası	First teaching week of the semester	Первая учебная неделя семестра
Seçin	Seçin	Select	Выберите
Rotasiya başlama tarixi	Rotasyon başlangıç tarihi	Rotation start date	Дата начала ротации
Semestrin ilk tədris həftəsinin Bazar ertəsini seçin.	Dönemin ilk eğitim haftasının Pazartesi gününü seçin.	Select the Monday of the semester's first teaching week.	Выберите понедельник первой учебной недели семестра.
Yadda saxlanılır...	Kaydediliyor...	Saving...	Сохранение...
Fakültələr	Fakülteler	Faculties	Факультеты
Qrupları fakültələr üzrə təşkil edin və idarə edin.	Grupları fakültelere göre düzenleyin ve yönetin.	Organize and manage groups by faculty.	Организуйте и управляйте группами по факультетам.
Fakültə əlavə et	Fakülte ekle	Add faculty	Добавить факультет
Hələ fakültə əlavə edilməyib.	Henüz fakülte eklenmedi.	No faculty has been added yet.	Факультеты ещё не добавлены.
Fakültəni redaktə et	Fakülteyi düzenle	Edit faculty	Редактировать факультет
Yeni fakültə	Yeni fakülte	New faculty	Новый факультет
Fakültənin adını və istəyə görə qısa kodunu daxil edin.	Fakültenin adını ve isteğe bağlı kısa kodunu girin.	Enter the faculty name and an optional short code.	Введите название факультета и при необходимости короткий код.
Fakültə adı	Fakülte adı	Faculty name	Название факультета
Mühəndislik fakültəsi	Mühendislik fakültesi	Faculty of Engineering	Инженерный факультет
Kod	Kod	Code	Код
(istəyə görə)	(isteğe bağlı)	(optional)	(необязательно)
Fakültə silinsin?	Fakülte silinsin mi?	Delete faculty?	Удалить факультет?
Bu əməliyyat geri qaytarıla bilməz. Fakültəyə bağlı qruplar varsa silinmə rədd ediləcək.	Bu işlem geri alınamaz. Fakülteye bağlı gruplar varsa silme reddedilir.	This action cannot be undone. Deletion will be rejected if groups are linked to the faculty.	Это действие нельзя отменить. Удаление будет отклонено, если к факультету привязаны группы.
Silinir...	Siliniyor...	Deleting...	Удаление...
Fakültə adını daxil edin.	Fakülte adını girin.	Enter a faculty name.	Введите название факультета.
Bu fakültə artıq mövcuddur.	Bu fakülte zaten mevcut.	This faculty already exists.	Этот факультет уже существует.
Fakültə yeniləndi.	Fakülte güncellendi.	Faculty updated.	Факультет обновлён.
Fakültə əlavə edildi.	Fakülte eklendi.	Faculty added.	Факультет добавлен.
Bu fakültəyə bağlı qruplar var. Əvvəlcə qrupları başqa fakültəyə keçirin.	Bu fakülteye bağlı gruplar var. Önce grupları başka bir fakülteye taşıyın.	Groups are linked to this faculty. Move them to another faculty first.	К этому факультету привязаны группы. Сначала перенесите их на другой факультет.
Fakültə silindi.	Fakülte silindi.	Faculty deleted.	Факультет удалён.
`;

export const LEGACY_TEXT_3: Record<string, LegacyTranslation> = Object.fromEntries(
  LEGACY_DATA.trim().split("\n").map((line) => {
    const [source, tr, en, ru] = line.split("\t");
    return [source!, [tr!, en!, ru!] as LegacyTranslation];
  }),
);
