import { useI18n, type Locale } from "@/lib/i18n";

const az = {
  "common.loading": "Yüklənir...",
  "hub.infoCenter": "Məlumat mərkəzi",
  "hub.title": "Elanlar və bildirişlər",
  "hub.subtitle": "Universitet elanlarını və portal üzrə sizə aid bildirişləri bir məkanda, ayrı bölmələrdə izləyin.",
  "hub.sectionsAria": "Məlumat bölmələri",
  "hub.announcements": "Elanlar",
  "hub.notifications": "Bildirişlər",
  "announcements.active": "Aktiv elan",
  "announcements.unread": "Oxunmamış",
  "announcements.featured": "Önə çıxarılan",
  "announcements.searchPlaceholder": "Elanlarda axtar...",
  "announcements.allCategories": "Bütün kateqoriyalar",
  "announcements.loadErrorTitle": "Elanlar yüklənmədi",
  "announcements.loadErrorBody": "Məlumatlar alınarkən xəta baş verdi. Səhifəni yeniləyib yenidən cəhd edin.",
  "announcements.emptyTitle": "Uyğun elan tapılmadı",
  "announcements.changeFilters": "Axtarış və filtr seçimlərinizi dəyişin.",
  "announcements.noActive": "Hazırda sizin üçün aktiv elan yoxdur.",
  "announcements.selected": "Seçilmiş",
  "announcements.all": "Bütün elanlar",
  "notifications.title": "Bildirişlər",
  "notifications.subtitle": "Portal üzrə sizə aid yeniliklər və xəbərdarlıqlar.",
  "notifications.markAllRead": "Hamısını oxu",
  "notifications.empty": "Bildiriş yoxdur",
  "notifications.emptyBody": "Yeni bildiriş gəldikdə burada görünəcək və vacib yenilikləri rahat izləyə biləcəksiniz.",
  "category.general": "Ümumi",
  "category.academic": "Akademik",
  "category.opportunity": "Fürsət",
  "category.event": "Tədbir",
  "category.important": "Vacib",
  "audience.all": "Bütün tələbələr",
  "audience.faculty": "Fakültə üzrə",
  "audience.group": "Qrup üzrə",
  "audience.facultyPrefix": "Fakültə",
  "audience.groupPrefix": "Qrup",
  "card.featuredBadge": "Önə çıxarılıb",
  "card.new": "Yeni",
  "card.selected": "Seçilmiş elan",
  "card.displayUntil": "Elanın göstərilmə müddəti: {date}-dək",
  "card.close": "Bağla",
  "card.viewDetails": "Ətraflı bax",
  "card.openLink": "Keçid et",
  "broadcast.open": "Bildiriş göndər",
  "broadcast.title": "Bildiriş göndər",
  "broadcast.heading": "Başlıq",
  "broadcast.headingPlaceholder": "Bildirişin başlığı",
  "broadcast.body": "Mətn",
  "broadcast.bodyPlaceholder": "Bildirişin mətni (istəyə bağlı)",
  "broadcast.type": "Tip",
  "broadcast.selectType": "Tip seçin",
  "broadcast.recipient": "Alıcı",
  "broadcast.allUsers": "Bütün istifadəçilər",
  "broadcast.selectedRole": "Seçilmiş rol",
  "broadcast.selectedGroup": "Seçilmiş qrup",
  "broadcast.role": "Rol",
  "broadcast.selectRole": "Rol seçin",
  "broadcast.group": "Qrup",
  "broadcast.selectGroup": "Qrup seçin",
  "broadcast.cancel": "Ləğv et",
  "broadcast.send": "Göndər",
  "broadcast.success": "Bildiriş göndərildi ({count} istifadəçiyə).",
  "broadcast.error": "Bildiriş göndərilə bilmədi.",
  "broadcast.selectGroupError": "Qrup seçin.",
  "role.student": "Tələbə",
  "role.tutor": "Tyutor",
  "role.teacher": "Müəllim",
  "role.dean": "Dekan",
  "type.system": "Sistem",
  "type.event": "Tədbir",
  "type.warning": "Xəbərdarlıq",
  "type.award": "Mükafat",
  "type.personal": "Şəxsi",
  "type.social": "Sosial",
  "type.specialDay": "Xüsusi Gün",
  "type.announcement": "Elan",
} as const;

export type NotificationHubKey = keyof typeof az;
type Vars = Record<string, string | number>;

const tr: Record<NotificationHubKey, string> = {
  "common.loading": "Yükleniyor...",
  "hub.infoCenter": "Bilgi merkezi", "hub.title": "Duyurular ve bildirimler", "hub.subtitle": "Üniversite duyurularını ve portaldaki size özel bildirimleri tek yerde, ayrı bölümlerde takip edin.", "hub.sectionsAria": "Bilgi bölümleri", "hub.announcements": "Duyurular", "hub.notifications": "Bildirimler",
  "announcements.active": "Aktif duyuru", "announcements.unread": "Okunmamış", "announcements.featured": "Öne çıkarılan", "announcements.searchPlaceholder": "Duyurularda ara...", "announcements.allCategories": "Tüm kategoriler", "announcements.loadErrorTitle": "Duyurular yüklenemedi", "announcements.loadErrorBody": "Veriler alınırken bir hata oluştu. Sayfayı yenileyip tekrar deneyin.", "announcements.emptyTitle": "Eşleşen duyuru bulunamadı", "announcements.changeFilters": "Arama ve filtre seçimlerinizi değiştirin.", "announcements.noActive": "Şu anda sizin için aktif duyuru yok.", "announcements.selected": "Seçilmiş", "announcements.all": "Tüm duyurular",
  "notifications.title": "Bildirimler", "notifications.subtitle": "Portalda size ait güncellemeler ve uyarılar.", "notifications.markAllRead": "Tümünü okundu yap", "notifications.empty": "Bildirim yok", "notifications.emptyBody": "Yeni bir bildirim geldiğinde burada görünecek ve önemli güncellemeleri kolayca takip edebileceksiniz.",
  "category.general": "Genel", "category.academic": "Akademik", "category.opportunity": "Fırsat", "category.event": "Etkinlik", "category.important": "Önemli",
  "audience.all": "Tüm öğrenciler", "audience.faculty": "Fakülteye göre", "audience.group": "Gruba göre", "audience.facultyPrefix": "Fakülte", "audience.groupPrefix": "Grup",
  "card.featuredBadge": "Öne çıkarıldı", "card.new": "Yeni", "card.selected": "Seçilmiş duyuru", "card.displayUntil": "Duyurunun gösterim süresi: {date} tarihine kadar", "card.close": "Kapat", "card.viewDetails": "Ayrıntıları gör", "card.openLink": "Bağlantıyı aç",
  "broadcast.open": "Bildirim gönder", "broadcast.title": "Bildirim gönder", "broadcast.heading": "Başlık", "broadcast.headingPlaceholder": "Bildirimin başlığı", "broadcast.body": "Metin", "broadcast.bodyPlaceholder": "Bildirim metni (isteğe bağlı)", "broadcast.type": "Tür", "broadcast.selectType": "Tür seçin", "broadcast.recipient": "Alıcı", "broadcast.allUsers": "Tüm kullanıcılar", "broadcast.selectedRole": "Seçilen rol", "broadcast.selectedGroup": "Seçilen grup", "broadcast.role": "Rol", "broadcast.selectRole": "Rol seçin", "broadcast.group": "Grup", "broadcast.selectGroup": "Grup seçin", "broadcast.cancel": "İptal", "broadcast.send": "Gönder", "broadcast.success": "Bildirim gönderildi ({count} kullanıcıya).", "broadcast.error": "Bildirim gönderilemedi.", "broadcast.selectGroupError": "Bir grup seçin.",
  "role.student": "Öğrenci", "role.tutor": "Danışman", "role.teacher": "Öğretmen", "role.dean": "Dekan",
  "type.system": "Sistem", "type.event": "Etkinlik", "type.warning": "Uyarı", "type.award": "Ödül", "type.personal": "Kişisel", "type.social": "Sosyal", "type.specialDay": "Özel Gün", "type.announcement": "Duyuru",
};

const en: Record<NotificationHubKey, string> = {
  "common.loading": "Loading...",
  "hub.infoCenter": "Information center", "hub.title": "Announcements and notifications", "hub.subtitle": "Track university announcements and notifications relevant to you in one place, in separate sections.", "hub.sectionsAria": "Information sections", "hub.announcements": "Announcements", "hub.notifications": "Notifications",
  "announcements.active": "Active announcements", "announcements.unread": "Unread", "announcements.featured": "Featured", "announcements.searchPlaceholder": "Search announcements...", "announcements.allCategories": "All categories", "announcements.loadErrorTitle": "Announcements could not be loaded", "announcements.loadErrorBody": "An error occurred while loading data. Refresh the page and try again.", "announcements.emptyTitle": "No matching announcements", "announcements.changeFilters": "Change your search or filter selections.", "announcements.noActive": "There are no active announcements for you right now.", "announcements.selected": "Featured", "announcements.all": "All announcements",
  "notifications.title": "Notifications", "notifications.subtitle": "Updates and alerts related to your portal activity.", "notifications.markAllRead": "Mark all as read", "notifications.empty": "No notifications", "notifications.emptyBody": "New notifications will appear here so you can easily keep track of important updates.",
  "category.general": "General", "category.academic": "Academic", "category.opportunity": "Opportunity", "category.event": "Event", "category.important": "Important",
  "audience.all": "All students", "audience.faculty": "By faculty", "audience.group": "By group", "audience.facultyPrefix": "Faculty", "audience.groupPrefix": "Group",
  "card.featuredBadge": "Featured", "card.new": "New", "card.selected": "Featured announcement", "card.displayUntil": "Displayed until {date}", "card.close": "Close", "card.viewDetails": "View details", "card.openLink": "Open link",
  "broadcast.open": "Send notification", "broadcast.title": "Send notification", "broadcast.heading": "Title", "broadcast.headingPlaceholder": "Notification title", "broadcast.body": "Message", "broadcast.bodyPlaceholder": "Notification message (optional)", "broadcast.type": "Type", "broadcast.selectType": "Select a type", "broadcast.recipient": "Recipient", "broadcast.allUsers": "All users", "broadcast.selectedRole": "Selected role", "broadcast.selectedGroup": "Selected group", "broadcast.role": "Role", "broadcast.selectRole": "Select a role", "broadcast.group": "Group", "broadcast.selectGroup": "Select a group", "broadcast.cancel": "Cancel", "broadcast.send": "Send", "broadcast.success": "Notification sent to {count} users.", "broadcast.error": "Notification could not be sent.", "broadcast.selectGroupError": "Select a group.",
  "role.student": "Student", "role.tutor": "Tutor", "role.teacher": "Teacher", "role.dean": "Dean",
  "type.system": "System", "type.event": "Event", "type.warning": "Warning", "type.award": "Award", "type.personal": "Personal", "type.social": "Social", "type.specialDay": "Special Day", "type.announcement": "Announcement",
};

const ru: Record<NotificationHubKey, string> = {
  "common.loading": "Загрузка...",
  "hub.infoCenter": "Информационный центр", "hub.title": "Объявления и уведомления", "hub.subtitle": "Следите за объявлениями университета и относящимися к вам уведомлениями портала в одном месте, в отдельных разделах.", "hub.sectionsAria": "Информационные разделы", "hub.announcements": "Объявления", "hub.notifications": "Уведомления",
  "announcements.active": "Активные объявления", "announcements.unread": "Непрочитанные", "announcements.featured": "Выделенные", "announcements.searchPlaceholder": "Поиск по объявлениям...", "announcements.allCategories": "Все категории", "announcements.loadErrorTitle": "Не удалось загрузить объявления", "announcements.loadErrorBody": "При загрузке данных произошла ошибка. Обновите страницу и повторите попытку.", "announcements.emptyTitle": "Подходящие объявления не найдены", "announcements.changeFilters": "Измените параметры поиска или фильтра.", "announcements.noActive": "Сейчас для вас нет активных объявлений.", "announcements.selected": "Выделенные", "announcements.all": "Все объявления",
  "notifications.title": "Уведомления", "notifications.subtitle": "Новости и предупреждения портала, относящиеся к вам.", "notifications.markAllRead": "Отметить всё как прочитанное", "notifications.empty": "Нет уведомлений", "notifications.emptyBody": "Новые уведомления появятся здесь, чтобы вы могли легко следить за важными обновлениями.",
  "category.general": "Общие", "category.academic": "Академические", "category.opportunity": "Возможности", "category.event": "Мероприятия", "category.important": "Важное",
  "audience.all": "Все студенты", "audience.faculty": "По факультету", "audience.group": "По группе", "audience.facultyPrefix": "Факультет", "audience.groupPrefix": "Группа",
  "card.featuredBadge": "Выделено", "card.new": "Новое", "card.selected": "Выделенное объявление", "card.displayUntil": "Показывается до {date}", "card.close": "Закрыть", "card.viewDetails": "Подробнее", "card.openLink": "Перейти",
  "broadcast.open": "Отправить уведомление", "broadcast.title": "Отправить уведомление", "broadcast.heading": "Заголовок", "broadcast.headingPlaceholder": "Заголовок уведомления", "broadcast.body": "Текст", "broadcast.bodyPlaceholder": "Текст уведомления (необязательно)", "broadcast.type": "Тип", "broadcast.selectType": "Выберите тип", "broadcast.recipient": "Получатель", "broadcast.allUsers": "Все пользователи", "broadcast.selectedRole": "Выбранная роль", "broadcast.selectedGroup": "Выбранная группа", "broadcast.role": "Роль", "broadcast.selectRole": "Выберите роль", "broadcast.group": "Группа", "broadcast.selectGroup": "Выберите группу", "broadcast.cancel": "Отмена", "broadcast.send": "Отправить", "broadcast.success": "Уведомление отправлено ({count} пользователям).", "broadcast.error": "Не удалось отправить уведомление.", "broadcast.selectGroupError": "Выберите группу.",
  "role.student": "Студент", "role.tutor": "Тьютор", "role.teacher": "Преподаватель", "role.dean": "Декан",
  "type.system": "Система", "type.event": "Мероприятие", "type.warning": "Предупреждение", "type.award": "Награда", "type.personal": "Личное", "type.social": "Социальное", "type.specialDay": "Особый день", "type.announcement": "Объявление",
};

export const notificationHubMessages: Record<Locale, Record<NotificationHubKey, string>> = { az, tr, en, ru };

export const notificationCategoryKeys = {
  general: "category.general", academic: "category.academic", opportunity: "category.opportunity", event: "category.event", important: "category.important",
} as const satisfies Record<string, NotificationHubKey>;

export const notificationRoleKeys = {
  telebe: "role.student", tyutor: "role.tutor", muellim: "role.teacher", dekan: "role.dean",
} as const satisfies Record<string, NotificationHubKey>;

export const notificationTypeKeys = {
  sistem: "type.system", tedbir: "type.event", xeberdarliq: "type.warning", mukafat: "type.award", shexsi: "type.personal", sosial: "type.social", xususi_gun: "type.specialDay", elan: "type.announcement",
} as const satisfies Record<string, NotificationHubKey>;

export function notificationHubTranslate(locale: Locale, key: NotificationHubKey, vars?: Vars) {
  let text = notificationHubMessages[locale][key] ?? notificationHubMessages.az[key] ?? key;
  if (!vars) return text;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

export function useNotificationHubI18n() {
  const { locale } = useI18n();
  return {
    locale,
    t: (key: NotificationHubKey, vars?: Vars) => notificationHubTranslate(locale, key, vars),
  };
}
