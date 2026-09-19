import type { LegacyTranslation } from "@/lib/legacy-page-i18n-types";

const LEGACY_DATA = `
Kitabxana İdarəetmə — ATU Şəxsi Kabinet	Kütüphane Yönetimi — ATU Portal	Library Management — ATU Portal	Управление библиотекой — ATU Portal
Kitabxana kitablarının idarə edilməsi.	Kütüphane kitaplarının yönetimi.	Library book management.	Управление книгами библиотеки.
Kitabxana İdarəetmə	Kütüphane Yönetimi	Library Management	Управление библиотекой
Ad və ya müəllif üzrə axtar...	Ada veya yazara göre ara...	Search by title or author...	Поиск по названию или автору...
Kateqoriya	Kategori	Category	Категория
Bütün kateqoriyalar	Tüm kategoriler	All categories	Все категории
Kitablar yüklənərkən xəta baş verdi.	Kitaplar yüklenirken hata oluştu.	An error occurred while loading books.	Произошла ошибка при загрузке книг.
Axtarışa uyğun kitab tapılmadı.	Aramaya uygun kitap bulunamadı.	No book matches your search.	Книги по запросу не найдены.
Kitabxanada hələ kitab yoxdur.	Kütüphanede henüz kitap yok.	There are no books in the library yet.	В библиотеке пока нет книг.
Üz qabığı	Kapak	Cover	Обложка
Müəllif	Yazar	Author	Автор
Format	Format	Format	Формат
Əlavə olunma tarixi	Eklenme tarihi	Date added	Дата добавления
Əməliyyatlar	İşlemler	Actions	Действия
Kitab uğurla silindi.	Kitap başarıyla silindi.	Book deleted successfully.	Книга успешно удалена.
Kitab silinərkən xəta baş verdi.	Kitap silinirken hata oluştu.	An error occurred while deleting the book.	Произошла ошибка при удалении книги.
Kitabı silmək istəyirsiniz?	Kitabı silmek istiyor musunuz?	Do you want to delete the book?	Удалить книгу?
Bu əməliyyat geri qaytarıla bilməz.	Bu işlem geri alınamaz.	This action cannot be undone.	Это действие нельзя отменить.
Elanlar — Admin — ATU Şəxsi Kabinet	Duyurular — Yönetim — ATU Portal	Announcements — Admin — ATU Portal	Объявления — Админ — ATU Portal
Elanlar	Duyurular	Announcements	Объявления
Yeni elan	Yeni duyuru	New announcement	Новое объявление
Aktiv elan	Aktif duyuru	Active announcements	Активные объявления
Planlaşdırılıb	Planlandı	Scheduled	Запланировано
Qaralama	Taslak	Draft	Черновик
Unikal oxunma	Benzersiz okunma	Unique reads	Уникальные просмотры
Başlıq, mətn və auditoriyada axtar...	Başlık, metin ve hedef kitlede ara...	Search title, text and audience...	Поиск по заголовку, тексту и аудитории...
Bütün statuslar	Tüm durumlar	All statuses	Все статусы
Elan	Duyuru	Announcement	Объявление
Auditoriya	Hedef kitle	Audience	Аудитория
Oxunma	Okunma	Reads	Прочтения
Yayımla	Yayınla	Publish	Опубликовать
Surətini yarat	Kopyasını oluştur	Duplicate	Создать копию
Arxivlə	Arşivle	Archive	Архивировать
Elan tapılmadı	Duyuru bulunamadı	No announcements found	Объявления не найдены
Filtrləri dəyişin və ya yeni elan yaradın.	Filtreleri değiştirin veya yeni bir duyuru oluşturun.	Change the filters or create a new announcement.	Измените фильтры или создайте новое объявление.
Elanı silmək istəyirsiniz?	Duyuruyu silmek istiyor musunuz?	Do you want to delete the announcement?	Удалить объявление?
Bəli, sil	Evet, sil	Yes, delete	Да, удалить
surət	kopya	copy	копия
Aktiv	Aktif	Active	Активно
Arxivlənib	Arşivlendi	Archived	В архиве
Dərs — ATU Şəxsi Kabinet	Ders — ATU Portal	Course — ATU Portal	Дисциплина — ATU Portal
Dərsin təfərrüatları.	Ders ayrıntıları.	Course details.	Сведения о дисциплине.
Dərs təfərrüatı	Ders ayrıntıları	Course details	Сведения о дисциплине
Kredit	Kredi	Credit	Кредит
Kredit yeniləndi.	Kredi güncellendi.	Credit updated.	Кредит обновлён.
Kredit yenilənə bilmədi.	Kredi güncellenemedi.	Credit could not be updated.	Не удалось обновить кредит.
Otaq yeniləndi.	Derslik güncellendi.	Room updated.	Аудитория обновлена.
Otaq yenilənə bilmədi.	Derslik güncellenemedi.	Room could not be updated.	Не удалось обновить аудиторию.
Dərs silindi.	Ders silindi.	Course deleted.	Дисциплина удалена.
Dərs silinə bilmədi.	Ders silinemedi.	Course could not be deleted.	Не удалось удалить дисциплину.
Mövzu silindi.	Konu silindi.	Topic deleted.	Тема удалена.
Mövzu silinə bilmədi.	Konu silinemedi.	Topic could not be deleted.	Не удалось удалить тему.
Fənn tapılmadı.	Ders bulunamadı.	Course not found.	Дисциплина не найдена.
Mövzu əlavə et	Konu ekle	Add topic	Добавить тему
Sillabus	Ders izlencesi	Syllabus	Силлабус
Dərsi sil	Dersi sil	Delete course	Удалить дисциплину
Hamısı	Tümü	All	Все
Hələ heç bir mövzu əlavə edilməyib.	Henüz hiç konu eklenmedi.	No topics have been added yet.	Темы ещё не добавлены.
Endir	İndir	Download	Скачать
Alt Qrup	Alt Grup	Subgroup	Подгруппа
Kəsilən	Başarısız	Failed	Неуспешные
Krediti redaktə et	Krediyi düzenle	Edit credit	Редактировать кредит
Otağı redaktə et	Dersliği düzenle	Edit room	Редактировать аудиторию
Dərsi silmək istəyirsiniz?	Dersi silmek istiyor musunuz?	Do you want to delete the course?	Удалить дисциплину?
Mövzunu silmək istəyirsiniz?	Konuyu silmek istiyor musunuz?	Do you want to delete the topic?	Удалить тему?
mövzusu HƏMİŞƏLİK silinəcək.	konusu KALICI olarak silinecek.	topic will be PERMANENTLY deleted.	тема будет удалена НАВСЕГДА.
Qrup üzrə tədris olunan fənlər kurslara görə qruplaşdırılıb.	Grupta okutulan dersler sınıflara göre gruplandırılmıştır.	Courses taught in the group are organized by year.	Дисциплины группы сгруппированы по курсам.
Bu qrupa hələ fənn əlavə edilməyib.	Bu gruba henüz ders eklenmedi.	No course has been added to this group yet.	В эту группу ещё не добавлены дисциплины.
Yeni fənn əlavə etmək üçün yuxarıdakı düymədən istifadə edin.	Yeni ders eklemek için yukarıdaki düğmeyi kullanın.	Use the button above to add a new course.	Используйте кнопку выше, чтобы добавить дисциплину.
Bu kursda fənn əlavə edilməyib.	Bu sınıfa ders eklenmedi.	No course has been added for this year.	Для этого курса дисциплины не добавлены.
Digər fənlər	Diğer dersler	Other courses	Другие дисциплины
Qrup rəhbəri	Grup yöneticisi	Group leader	Руководитель группы
Təyin olunmuş rəhbər	Atanmış yönetici	Assigned leader	Назначенный руководитель
Rəhbər təyin edilməyib	Yönetici atanmamış	No leader assigned	Руководитель не назначен
Təyin etmək üçün klikləyin	Atamak için tıklayın	Click to assign	Нажмите, чтобы назначить
Qrup üzvləri	Grup üyeleri	Group members	Участники группы
Tələbə əlavə edilməyib	Öğrenci eklenmedi	No students have been added	Студенты не добавлены
Tələbə əlavə etmək üçün klikləyin	Öğrenci eklemek için tıklayın	Click to add a student	Нажмите, чтобы добавить студента
Qrup adı	Grup adı	Group name	Название группы
Tələbəni qrupdan çıxarmaq istəyirsiniz?	Öğrenciyi gruptan çıkarmak istiyor musunuz?	Do you want to remove the student from the group?	Удалить студента из группы?
`;

export const LEGACY_TEXT_4: Record<string, LegacyTranslation> = Object.fromEntries(
  LEGACY_DATA.trim().split("\n").map((line) => {
    const [source, tr, en, ru] = line.split("\t");
    return [source!, [tr!, en!, ru!] as LegacyTranslation];
  }),
);
