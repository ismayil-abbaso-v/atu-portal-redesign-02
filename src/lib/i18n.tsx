import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "az" | "tr" | "en" | "ru";

export const LOCALES: readonly Locale[] = ["az", "tr", "en", "ru"] as const;
export const LOCALE_LABELS: Record<Locale, string> = {
  az: "Azərbaycan",
  tr: "Türk",
  en: "İngilis",
  ru: "Rus",
};

const STORAGE_KEY = "atu-locale";
type Messages = Record<string, string>;

const commonAz: Messages = {
  "app.name": "ATU Portal",
  "app.subtitle": "Akademik və inzibati məlumatlar bir məkanda",
  "app.studentCabinet": "Tələbə kabineti",
  "common.back": "Geri",
  "common.home": "Ana səhifə",
  "common.tryAgain": "Yenidən cəhd et",
  "common.goHome": "Ana səhifəyə keç",
  "common.pageNotFound": "Səhifə tapılmadı",
  "common.pageNotFoundDescription": "Axtardığınız səhifə mövcud deyil və ya başqa ünvana köçürülüb.",
  "common.loadError": "Səhifə yüklənmədi",
  "common.loadErrorDescription": "Nəsə səhv oldu. Səhifəni yeniləyə və ya ana səhifəyə qayıda bilərsiniz.",
  "common.close": "Bağla",
  "common.save": "Yadda saxla",
  "common.cancel": "Ləğv et",
  "common.edit": "Redaktə et",
  "common.delete": "Sil",
  "common.add": "Əlavə et",
  "common.search": "Axtar",
  "common.loading": "Yüklənir...",
  "common.noData": "Məlumat yoxdur",
  "common.details": "Ətraflı",
  "nav.menu": "Menyu",
  "nav.home": "Ev",
  "nav.calendar": "Təqvim",
  "nav.exams": "İmtahanlar",
  "nav.chat": "Söhbət",
  "nav.library": "Kitabxana",
  "nav.office": "Ofis",
  "nav.notifications": "Bildirişlər",
  "nav.profile": "Profil",
  "nav.settings": "Parametrlər",
  "nav.security": "Təhlükəsizlik",
  "nav.logout": "Çıxış",
  "nav.facultyOverview": "Fakültə icmalı",
  "nav.groups": "Qruplar",
  "nav.admin": "Admin paneli",
  "nav.main": "Əsas",
  "settings.appearance": "Görünüş parametrləri",
  "settings.appearanceDescription": "Tema, rəng palitrası, dil və mətn ölçüsünü tənzimləyin.",
  "settings.theme": "Mövzu",
  "settings.themeDescription": "Portalın ümumi görünüşünü seçin.",
  "settings.light": "Açıq",
  "settings.lightDescription": "Gündüz görünüşü",
  "settings.dark": "Tünd",
  "settings.darkDescription": "Gecə görünüşü",
  "settings.system": "Sistem",
  "settings.systemDescription": "Cihazın seçiminə uyğun",
  "settings.palette": "Rəng palitrası",
  "settings.paletteDescription": "Seçim bütün portalın rənglərini dərhal yeniləyir.",
  "settings.active": "Aktiv",
  "settings.paletteClassic": "ATU Klassik",
  "settings.paletteClassicDescription": "Portalın əsas bordo və krem görünüşü",
  "settings.paletteAcademic": "Akademik Bordo",
  "settings.paletteAcademicDescription": "Daha dərin, sakit və akademik tonlar",
  "settings.paletteForest": "Sakit Yaşıl",
  "settings.paletteForestDescription": "Təmiz, balanslı və rahat oxunan yaşıl tonlar",
  "settings.paletteSunset": "Qum & Terrakota",
  "settings.paletteSunsetDescription": "İsti, yumşaq və müasir torpaq tonları",
  "settings.language": "Dil seçimi",
  "settings.languageDescription": "İnterfeys dilini seçin. Dəyişiklik dərhal tətbiq olunur.",
  "settings.fontSize": "Mətn ölçüsü",
  "settings.small": "Kiçik",
  "settings.standard": "Standart",
  "settings.large": "Böyük",
  "settings.livePreview": "Canlı önizləmə",
  "settings.livePreviewDescription": "Ana səhifənin görünüşü",
  "dashboard.welcome": "Xoş gəldiniz",
  "dashboard.personalCabinet": "Şəxsi kabinetiniz",
  "dashboard.semesterScore": "Semestr balı",
  "dashboard.examScore": "İmtahan balı",
  "dashboard.finalScore": "Yekun qiymət",
  "dashboard.attendance": "Davamiyyət",
  "dashboard.recentResults": "Son nəticələr",
  "dashboard.details": "Ətraflı",
  "dashboard.quickAccess": "Sürətli keçid",
  "dashboard.programming": "Proqramlaşdırmaya giriş",
  "dashboard.math": "Riyaziyyat",
  "dashboard.english": "İngilis dili",
  "dashboard.calendar": "Təqvim",
  "dashboard.library": "Kitabxana",
  "dashboard.transcript": "Transkript",
  "language.az": "Azərbaycan",
  "language.tr": "Türk",
  "language.en": "İngilis",
  "language.ru": "Rus",
  "page.home": "Ev",
  "page.calendar": "Təqvim",
  "page.exams": "İmtahanlar",
  "page.library": "Kitabxana",
  "page.office": "Ofis",
  "page.chat": "Söhbət",
  "page.notifications": "Bildirişlər",
  "page.profileSettings": "Profil parametrləri",
  "page.security": "Təhlükəsizlik",
  "page.notificationSettings": "Bildiriş parametrləri",
  "page.appearance": "Görünüş parametrləri",
  "page.transcript": "Transkript",
  "page.help": "Yardım Mərkəzi",
  "page.menu": "Menyu",
  "page.groups": "Qruplar",
  "page.facultyOverview": "Fakültə icmalı",
  "page.admin": "Admin paneli",
  "page.journal": "Elektron jurnal",
  "page.announcements": "Elanlar",
  "page.course": "Fənn",
  "page.teacherWorkspace": "Müəllim paneli",
  "page.tutorWorkspace": "Tyutor paneli",
  "profile.personal": "Şəxsi məlumatlar",
  "profile.contact": "Əlaqə məlumatı",
  "profile.academic": "Akademik məlumat",
  "profile.changePhoto": "Profil şəklini dəyiş",
  "profile.addPhoto": "Yeni şəkil əlavə et",
  "profile.username": "İstifadəçi adı",
  "profile.status": "Vəziyyət",
  "profile.socialStatus": "Sosial vəziyyət",
  "profile.photo": "Profil şəkli",
  "auth.title": "Azərbaycan Texnologiya Universitetinin şəxsi kabineti",
  "auth.username": "İstifadəçi adı",
  "auth.email": "E-poçt",
  "auth.password": "Şifrə",
  "auth.login": "Daxil ol",
  "auth.register": "Qeydiyyatdan keç",
  "auth.forgotPassword": "Şifrənizi unutmusunuz?",
  "auth.sendRecovery": "Bərpa linki göndər",
  "auth.noAccount": "Hesabınız yoxdur?",
  "auth.haveAccount": "Artıq hesabınız var?",
  "auth.confirmCode": "Təsdiq kodu",
  "auth.confirm": "Təsdiqlə",
  "auth.back": "Geri qayıt",
  "menu.profile": "Profil parametrləri",
  "menu.security": "Təhlükəsizlik",
  "menu.notifications": "Bildiriş parametrləri",
  "menu.appearance": "Parametrlərə baxın",
  "menu.transcript": "Transkript",
  "menu.help": "Yardım Mərkəzi",
  "header.unread": "oxunmamış bildiriş",
  "header.allRead": "Hamısı oxunub",
  "header.markAllRead": "Hamısını oxu",
  "header.noNotifications": "Bildiriş yoxdur",
  "header.newNotifications": "Yeni bildirişlər burada görünəcək.",
  "header.allNotifications": "Bütün bildirişlərə bax",
  "header.myProfile": "Mənim profilim",
  "header.viewPersonalData": "Şəxsi məlumatlara bax",
  "header.safeLogout": "Hesabdan təhlükəsiz çıxış",
};

const messages: Record<Locale, Messages> = {
  az: commonAz,
  tr: {
    ...commonAz,
    "app.name": "ATÜ Portal", "app.subtitle": "Akademik ve idari bilgiler tek yerde", "app.studentCabinet": "Öğrenci paneli",
    "common.back": "Geri", "common.home": "Ana sayfa", "common.tryAgain": "Tekrar dene", "common.goHome": "Ana sayfaya git", "common.pageNotFound": "Sayfa bulunamadı", "common.pageNotFoundDescription": "Aradığınız sayfa mevcut değil veya başka bir adrese taşınmış.", "common.loadError": "Sayfa yüklenemedi", "common.loadErrorDescription": "Bir şeyler ters gitti. Sayfayı yenileyebilir veya ana sayfaya dönebilirsiniz.", "common.close": "Kapat", "common.save": "Kaydet", "common.cancel": "İptal", "common.edit": "Düzenle", "common.delete": "Sil", "common.add": "Ekle", "common.search": "Ara", "common.loading": "Yükleniyor...", "common.noData": "Veri yok",
    "nav.menu": "Menü", "nav.home": "Ana sayfa", "nav.calendar": "Takvim", "nav.exams": "Sınavlar", "nav.chat": "Sohbet", "nav.library": "Kütüphane", "nav.office": "Ofis", "nav.notifications": "Bildirimler", "nav.profile": "Profil", "nav.settings": "Ayarlar", "nav.security": "Güvenlik", "nav.logout": "Çıkış", "nav.facultyOverview": "Fakülte özeti", "nav.groups": "Gruplar", "nav.admin": "Yönetim paneli", "nav.main": "Ana",
    "settings.appearance": "Görünüm ayarları", "settings.appearanceDescription": "Tema, renk paleti, dil ve metin boyutunu ayarlayın.", "settings.theme": "Tema", "settings.themeDescription": "Portalın genel görünümünü seçin.", "settings.light": "Açık", "settings.lightDescription": "Gündüz görünümü", "settings.dark": "Koyu", "settings.darkDescription": "Gece görünümü", "settings.system": "Sistem", "settings.systemDescription": "Cihaz tercihine göre", "settings.palette": "Renk paleti", "settings.paletteDescription": "Seçim portalın renklerini anında günceller.", "settings.active": "Aktif", "settings.paletteClassic": "ATÜ Klasik", "settings.paletteClassicDescription": "Portalın temel bordo ve krem görünümü", "settings.paletteAcademic": "Akademik Bordo", "settings.paletteAcademicDescription": "Daha derin, sakin ve akademik tonlar", "settings.paletteForest": "Sakin Yeşil", "settings.paletteForestDescription": "Temiz, dengeli ve rahat okunan yeşil tonlar", "settings.paletteSunset": "Kum & Terrakota", "settings.paletteSunsetDescription": "Sıcak, yumuşak ve modern toprak tonları", "settings.language": "Dil seçimi", "settings.languageDescription": "Arayüz dilini seçin. Değişiklik hemen uygulanır.", "settings.fontSize": "Metin boyutu", "settings.small": "Küçük", "settings.standard": "Standart", "settings.large": "Büyük", "settings.livePreview": "Canlı önizleme", "settings.livePreviewDescription": "Ana sayfa görünümü",
    "dashboard.welcome": "Hoş geldiniz", "dashboard.personalCabinet": "Kişisel paneliniz", "dashboard.semesterScore": "Dönem puanı", "dashboard.examScore": "Sınav puanı", "dashboard.finalScore": "Final notu", "dashboard.attendance": "Devamlılık", "dashboard.recentResults": "Sonuçlar", "dashboard.details": "Detaylar", "dashboard.quickAccess": "Hızlı erişim", "dashboard.programming": "Programlamaya giriş", "dashboard.math": "Matematik", "dashboard.english": "İngilizce", "dashboard.calendar": "Takvim", "dashboard.library": "Kütüphane", "dashboard.transcript": "Transkript",
    "language.az": "Azerbaycan", "language.tr": "Türk", "language.en": "İngilizce", "language.ru": "Rusça",
    "page.home": "Ana sayfa", "page.calendar": "Takvim", "page.exams": "Sınavlar", "page.library": "Kütüphane", "page.office": "Ofis", "page.chat": "Sohbet", "page.notifications": "Bildirimler", "page.profileSettings": "Profil ayarları", "page.security": "Güvenlik", "page.notificationSettings": "Bildirim ayarları", "page.appearance": "Görünüm ayarları", "page.transcript": "Transkript", "page.help": "Yardım Merkezi", "page.menu": "Menü", "page.groups": "Gruplar", "page.facultyOverview": "Fakülte özeti", "page.admin": "Yönetim paneli", "page.journal": "Elektronik günlük", "page.announcements": "Duyurular", "page.course": "Ders", "page.teacherWorkspace": "Öğretmen paneli", "page.tutorWorkspace": "Tütör paneli",
    "profile.personal": "Kişisel bilgiler", "profile.contact": "İletişim bilgileri", "profile.academic": "Akademik bilgiler", "profile.changePhoto": "Profil fotoğrafını değiştir", "profile.addPhoto": "Yeni fotoğraf ekle", "profile.username": "Kullanıcı adı", "profile.status": "Durum", "profile.socialStatus": "Sosyal durum", "profile.photo": "Profil fotoğrafı",
    "auth.title": "Azerbaycan Teknoloji Üniversitesi öğrenci paneli", "auth.username": "Kullanıcı adı", "auth.email": "E-posta", "auth.password": "Şifre", "auth.login": "Giriş yap", "auth.register": "Kayıt ol", "auth.forgotPassword": "Şifrenizi mi unuttunuz?", "auth.sendRecovery": "Kurtarma bağlantısı gönder", "auth.noAccount": "Hesabınız yok mu?", "auth.haveAccount": "Zaten hesabınız var mı?", "auth.confirmCode": "Doğrulama kodu", "auth.confirm": "Doğrula", "auth.back": "Geri dön",
    "menu.profile": "Profil ayarları", "menu.security": "Güvenlik", "menu.notifications": "Bildirim ayarları", "menu.appearance": "Görünüm ayarları", "menu.transcript": "Transkript", "menu.help": "Yardım Merkezi", "header.allRead": "Hepsi okundu", "header.markAllRead": "Tümünü oku", "header.noNotifications": "Bildirim yok", "header.newNotifications": "Yeni bildirimler burada görünecek.", "header.allNotifications": "Tüm bildirimleri gör", "header.myProfile": "Profilim", "header.viewPersonalData": "Kişisel bilgilere bak", "header.safeLogout": "Hesaptan güvenli çıkış",
  },
  en: {
    ...commonAz,
    "app.name": "ATU Portal", "app.subtitle": "Academic and administrative information in one place", "app.studentCabinet": "Student portal",
    "common.back": "Back", "common.home": "Home", "common.tryAgain": "Try again", "common.goHome": "Go home", "common.pageNotFound": "Page not found", "common.pageNotFoundDescription": "The page you're looking for doesn't exist or has been moved.", "common.loadError": "This page didn't load", "common.loadErrorDescription": "Something went wrong. You can try refreshing or head back home.", "common.close": "Close", "common.save": "Save", "common.cancel": "Cancel", "common.edit": "Edit", "common.delete": "Delete", "common.add": "Add", "common.search": "Search", "common.loading": "Loading...", "common.noData": "No data",
    "nav.menu": "Menu", "nav.home": "Home", "nav.calendar": "Calendar", "nav.exams": "Exams", "nav.chat": "Chat", "nav.library": "Library", "nav.office": "Office", "nav.notifications": "Notifications", "nav.profile": "Profile", "nav.settings": "Settings", "nav.security": "Security", "nav.logout": "Log out", "nav.facultyOverview": "Faculty overview", "nav.groups": "Groups", "nav.admin": "Admin panel", "nav.main": "Main",
    "settings.appearance": "Appearance settings", "settings.appearanceDescription": "Adjust the theme, color palette, language and text size.", "settings.theme": "Theme", "settings.themeDescription": "Choose the portal's overall appearance.", "settings.light": "Light", "settings.lightDescription": "Daytime appearance", "settings.dark": "Dark", "settings.darkDescription": "Night-time appearance", "settings.system": "System", "settings.systemDescription": "Follow your device preference", "settings.palette": "Color palette", "settings.paletteDescription": "Your choice updates the portal colors instantly.", "settings.active": "Active", "settings.paletteClassic": "ATU Classic", "settings.paletteClassicDescription": "The portal's signature burgundy and cream look", "settings.paletteAcademic": "Academic Burgundy", "settings.paletteAcademicDescription": "Deeper, calmer academic tones", "settings.paletteForest": "Calm Forest", "settings.paletteForestDescription": "Clean, balanced and easy-to-read green tones", "settings.paletteSunset": "Sand & Terracotta", "settings.paletteSunsetDescription": "Warm, soft and modern earth tones", "settings.language": "Language", "settings.languageDescription": "Choose the interface language. Changes apply immediately.", "settings.fontSize": "Text size", "settings.small": "Small", "settings.standard": "Standard", "settings.large": "Large", "settings.livePreview": "Live preview", "settings.livePreviewDescription": "Home page appearance",
    "dashboard.welcome": "Welcome", "dashboard.personalCabinet": "Your personal portal", "dashboard.semesterScore": "Semester score", "dashboard.examScore": "Exam score", "dashboard.finalScore": "Final grade", "dashboard.attendance": "Attendance", "dashboard.recentResults": "Recent results", "dashboard.details": "Details", "dashboard.quickAccess": "Quick access", "dashboard.programming": "Introduction to programming", "dashboard.math": "Mathematics", "dashboard.english": "English", "dashboard.calendar": "Calendar", "dashboard.library": "Library", "dashboard.transcript": "Transcript",
    "language.az": "Azerbaijani", "language.tr": "Turkish", "language.en": "English", "language.ru": "Russian",
    "page.home": "Home", "page.calendar": "Calendar", "page.exams": "Exams", "page.library": "Library", "page.office": "Office", "page.chat": "Chat", "page.notifications": "Notifications", "page.profileSettings": "Profile settings", "page.security": "Security", "page.notificationSettings": "Notification settings", "page.appearance": "Appearance settings", "page.transcript": "Transcript", "page.help": "Help Center", "page.menu": "Menu", "page.groups": "Groups", "page.facultyOverview": "Faculty overview", "page.admin": "Admin panel", "page.journal": "Electronic journal", "page.announcements": "Announcements", "page.course": "Course", "page.teacherWorkspace": "Teacher workspace", "page.tutorWorkspace": "Tutor workspace",
    "profile.personal": "Personal information", "profile.contact": "Contact information", "profile.academic": "Academic information", "profile.changePhoto": "Change profile photo", "profile.addPhoto": "Add new photo", "profile.username": "Username", "profile.status": "Status", "profile.socialStatus": "Social status", "profile.photo": "Profile photo",
    "auth.title": "Azerbaijan Technology University student portal", "auth.username": "Username", "auth.email": "Email", "auth.password": "Password", "auth.login": "Log in", "auth.register": "Create account", "auth.forgotPassword": "Forgot your password?", "auth.sendRecovery": "Send recovery link", "auth.noAccount": "Don't have an account?", "auth.haveAccount": "Already have an account?", "auth.confirmCode": "Verification code", "auth.confirm": "Verify", "auth.back": "Go back",
    "menu.profile": "Profile settings", "menu.security": "Security", "menu.notifications": "Notification settings", "menu.appearance": "Appearance settings", "menu.transcript": "Transcript", "menu.help": "Help Center", "header.allRead": "All read", "header.markAllRead": "Mark all as read", "header.noNotifications": "No notifications", "header.newNotifications": "New notifications will appear here.", "header.allNotifications": "View all notifications", "header.myProfile": "My profile", "header.viewPersonalData": "View personal information", "header.safeLogout": "Sign out securely",
  },
  ru: {
    ...commonAz,
    "app.name": "Портал ATU", "app.subtitle": "Академическая и административная информация в одном месте", "app.studentCabinet": "Студенческий кабинет",
    "common.back": "Назад", "common.home": "Главная", "common.tryAgain": "Повторить", "common.goHome": "На главную", "common.pageNotFound": "Страница не найдена", "common.pageNotFoundDescription": "Страница не существует или была перемещена.", "common.loadError": "Не удалось загрузить страницу", "common.loadErrorDescription": "Произошла ошибка. Попробуйте обновить страницу или вернуться на главную.", "common.close": "Закрыть", "common.save": "Сохранить", "common.cancel": "Отмена", "common.edit": "Изменить", "common.delete": "Удалить", "common.add": "Добавить", "common.search": "Поиск", "common.loading": "Загрузка...", "common.noData": "Нет данных",
    "nav.menu": "Меню", "nav.home": "Главная", "nav.calendar": "Календарь", "nav.exams": "Экзамены", "nav.chat": "Чат", "nav.library": "Библиотека", "nav.office": "Офис", "nav.notifications": "Уведомления", "nav.profile": "Профиль", "nav.settings": "Настройки", "nav.security": "Безопасность", "nav.logout": "Выйти", "nav.facultyOverview": "Обзор факультета", "nav.groups": "Группы", "nav.admin": "Панель администратора", "nav.main": "Основное",
    "settings.appearance": "Настройки внешнего вида", "settings.appearanceDescription": "Настройте тему, цветовую палитру, язык и размер текста.", "settings.theme": "Тема", "settings.themeDescription": "Выберите общий вид портала.", "settings.light": "Светлая", "settings.lightDescription": "Дневной режим", "settings.dark": "Тёмная", "settings.darkDescription": "Ночной режим", "settings.system": "Системная", "settings.systemDescription": "Следовать настройкам устройства", "settings.palette": "Цветовая палитра", "settings.paletteDescription": "Выбор мгновенно обновляет цвета портала.", "settings.active": "Активна", "settings.paletteClassic": "Классическая ATU", "settings.paletteClassicDescription": "Фирменное сочетание бордового и кремового", "settings.paletteAcademic": "Академический бордовый", "settings.paletteAcademicDescription": "Глубокие, спокойные академические оттенки", "settings.paletteForest": "Спокойный зелёный", "settings.paletteForestDescription": "Чистые, сбалансированные и комфортные зелёные оттенки", "settings.paletteSunset": "Песок и терракота", "settings.paletteSunsetDescription": "Тёплые, мягкие и современные оттенки земли", "settings.language": "Язык", "settings.languageDescription": "Выберите язык интерфейса. Изменение применяется сразу.", "settings.fontSize": "Размер текста", "settings.small": "Маленький", "settings.standard": "Стандартный", "settings.large": "Большой", "settings.livePreview": "Предпросмотр", "settings.livePreviewDescription": "Вид главной страницы",
    "dashboard.welcome": "Добро пожаловать", "dashboard.personalCabinet": "Ваш личный кабинет", "dashboard.semesterScore": "Баллы за семестр", "dashboard.examScore": "Экзаменационный балл", "dashboard.finalScore": "Итоговая оценка", "dashboard.attendance": "Посещаемость", "dashboard.recentResults": "Последние результаты", "dashboard.details": "Подробнее", "dashboard.quickAccess": "Быстрый доступ", "dashboard.programming": "Введение в программирование", "dashboard.math": "Математика", "dashboard.english": "Английский язык", "dashboard.calendar": "Календарь", "dashboard.library": "Библиотека", "dashboard.transcript": "Транскрипт",
    "language.az": "Азербайджанский", "language.tr": "Турецкий", "language.en": "Английский", "language.ru": "Русский",
    "page.home": "Главная", "page.calendar": "Календарь", "page.exams": "Экзамены", "page.library": "Библиотека", "page.office": "Офис", "page.chat": "Чат", "page.notifications": "Уведомления", "page.profileSettings": "Настройки профиля", "page.security": "Безопасность", "page.notificationSettings": "Настройки уведомлений", "page.appearance": "Настройки внешнего вида", "page.transcript": "Транскрипт", "page.help": "Центр помощи", "page.menu": "Меню", "page.groups": "Группы", "page.facultyOverview": "Обзор факультета", "page.admin": "Панель администратора", "page.journal": "Электронный журнал", "page.announcements": "Объявления", "page.course": "Курс", "page.teacherWorkspace": "Панель преподавателя", "page.tutorWorkspace": "Панель тьютора",
    "profile.personal": "Личные данные", "profile.contact": "Контактные данные", "profile.academic": "Академические данные", "profile.changePhoto": "Изменить фото профиля", "profile.addPhoto": "Добавить новое фото", "profile.username": "Имя пользователя", "profile.status": "Статус", "profile.socialStatus": "Социальный статус", "profile.photo": "Фото профиля",
    "auth.title": "Личный кабинет Азербайджанского технологического университета", "auth.username": "Имя пользователя", "auth.email": "Электронная почта", "auth.password": "Пароль", "auth.login": "Войти", "auth.register": "Зарегистрироваться", "auth.forgotPassword": "Забыли пароль?", "auth.sendRecovery": "Отправить ссылку восстановления", "auth.noAccount": "Нет аккаунта?", "auth.haveAccount": "Уже есть аккаунт?", "auth.confirmCode": "Код подтверждения", "auth.confirm": "Подтвердить", "auth.back": "Вернуться",
    "menu.profile": "Настройки профиля", "menu.security": "Безопасность", "menu.notifications": "Настройки уведомлений", "menu.appearance": "Настройки внешнего вида", "menu.transcript": "Транскрипт", "menu.help": "Центр помощи", "header.allRead": "Всё прочитано", "header.markAllRead": "Прочитать всё", "header.noNotifications": "Нет уведомлений", "header.newNotifications": "Новые уведомления появятся здесь.", "header.allNotifications": "Все уведомления", "header.myProfile": "Мой профиль", "header.viewPersonalData": "Личные данные", "header.safeLogout": "Безопасный выход",
  },
};

const legacyPageTitles: Record<Locale, Record<string, string>> = {
  az: {},
  tr: { "Ev": "Ana sayfa", "Profil parametrləri": "Profil ayarları", "Təhlükəsizlik": "Güvenlik", "Bildirişlər": "Bildirimler", "Bildiriş parametrləri": "Bildirim ayarları", "Görünüş parametrləri": "Görünüm ayarları", "Transkript": "Transkript", "Yardım Mərkəzi": "Yardım Merkezi", "Kitabxana": "Kütüphane", "Ofis": "Ofis", "Söhbət": "Sohbet", "Təqvim": "Takvim", "İmtahanlar": "Sınavlar", "Qruplar": "Gruplar", "Fakültə icmalı": "Fakülte özeti", "Menyu": "Menü" },
  en: { "Ev": "Home", "Profil parametrləri": "Profile settings", "Təhlükəsizlik": "Security", "Bildirişlər": "Notifications", "Bildiriş parametrləri": "Notification settings", "Görünüş parametrləri": "Appearance settings", "Transkript": "Transcript", "Yardım Mərkəzi": "Help Center", "Kitabxana": "Library", "Ofis": "Office", "Söhbət": "Chat", "Təqvim": "Calendar", "İmtahanlar": "Exams", "Qruplar": "Groups", "Fakültə icmalı": "Faculty overview", "Menyu": "Menu" },
  ru: { "Ev": "Главная", "Profil parametrləri": "Настройки профиля", "Təhlükəsizlik": "Безопасность", "Bildirişlər": "Уведомления", "Bildiriş parametrləri": "Настройки уведомлений", "Görünüş parametrləri": "Настройки внешнего вида", "Transkript": "Транскрипт", "Yardım Mərkəzi": "Центр помощи", "Kitabxana": "Библиотека", "Ofis": "Офис", "Söhbət": "Чат", "Təqvim": "Календарь", "İmtahanlar": "Экзамены", "Qruplar": "Группы", "Fakültə icmalı": "Обзор факультета", "Menyu": "Меню" },
};

const localeForIntl: Record<Locale, string> = { az: "az-AZ", tr: "tr-TR", en: "en-US", ru: "ru-RU" };

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && LOCALES.includes(value as Locale);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "az";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : "az";
}

type I18nContextValue = {
  locale: Locale;
  locales: readonly Locale[];
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  intlLocale: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage may be unavailable */ }
    document.documentElement.lang = next;
    document.documentElement.dir = "ltr";
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* storage may be unavailable */ }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    locales: LOCALES,
    setLocale,
    intlLocale: localeForIntl[locale],
    t: (key, fallback) => messages[locale][key] ?? legacyPageTitles[locale][key] ?? messages.az[key] ?? fallback ?? key,
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n I18nProvider daxilində istifadə olunmalıdır");
  return context;
}

export function useLocaleFormatter() {
  const { intlLocale } = useI18n();
  return useMemo(() => ({
    number: new Intl.NumberFormat(intlLocale),
    date: new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }),
    time: new Intl.DateTimeFormat(intlLocale, { timeStyle: "short" }),
  }), [intlLocale]);
}
