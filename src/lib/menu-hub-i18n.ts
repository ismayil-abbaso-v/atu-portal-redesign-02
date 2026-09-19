import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

const menuHubMessages = {
  az: {
    seoTitle: "Menyu — ATU Şəxsi Kabinet",
    seoDescription: "Profil, təhlükəsizlik, bildiriş, görünüş, transkript və yardım parametrlərini bir məkandan idarə edin.",
    heroEyebrow: "MƏNİM MENYUM",
    heroTitle: "Parametrləriniz həmişə sizinlə!",
    heroSubtitle: "Profilinizi idarə edin, təhlükəsizliyi təmin edin, seçimlərinizi fərdiləşdirin və daha rahat universitet həyatı yaşayın.",
    sectionEyebrow: "İdarəetmə",
    sectionTitle: "Parametrlər və seçimlər",
    sectionCount: "{count} bölmə",
    openSectionAria: "{section} bölməsini aç",
    profileTitle: "Profil parametrləri",
    profileDescription: "Şəxsi və akademik məlumatlarınızı idarə edin.",
    profileTag: "Hesab",
    securityTitle: "Təhlükəsizlik",
    securityDescription: "Hesab təhlükəsizliyi və giriş seçimlərini tənzimləyin.",
    securityTag: "Təhlükəsizlik",
    notificationsTitle: "Bildiriş parametrləri",
    notificationsDescription: "Bildiriş seçimlərinizi və xəbərdarlıqları idarə edin.",
    notificationsTag: "Bildirişlər",
    appearanceTitle: "Görünüş parametrləri",
    appearanceDescription: "Tema, rəng palitrası və görünüş seçimlərini dəyişin.",
    appearanceTag: "Görünüş",
    transcriptTitle: "Transkript",
    transcriptDescription: "Akademik nəticələrinizə və transkriptinizə baxın.",
    transcriptTag: "Akademik",
    helpTitle: "Yardım Mərkəzi",
    helpDescription: "Portal istifadəsi ilə bağlı dəstək və məlumat alın.",
    helpTag: "Dəstək",
  },
  tr: {
    seoTitle: "Menü — ATÜ Kişisel Portal",
    seoDescription: "Profil, güvenlik, bildirim, görünüm, transkript ve yardım ayarlarını tek yerden yönetin.",
    heroEyebrow: "MENÜM",
    heroTitle: "Ayarlarınız her zaman sizinle!",
    heroSubtitle: "Profilinizi yönetin, güvenliğinizi koruyun ve üniversite deneyiminizi kişiselleştirin.",
    sectionEyebrow: "Yönetim",
    sectionTitle: "Ayarlar ve tercihler",
    sectionCount: "{count} bölüm",
    openSectionAria: "{section} bölümünü aç",
    profileTitle: "Profil ayarları",
    profileDescription: "Kişisel ve akademik bilgilerinizi yönetin.",
    profileTag: "Hesap",
    securityTitle: "Güvenlik",
    securityDescription: "Hesap güvenliğinizi ve oturum açma seçeneklerinizi yönetin.",
    securityTag: "Güvenlik",
    notificationsTitle: "Bildirim ayarları",
    notificationsDescription: "Bildirim tercihlerinizi ve uyarılarınızı yönetin.",
    notificationsTag: "Bildirimler",
    appearanceTitle: "Görünüm ayarları",
    appearanceDescription: "Tema, renk paleti ve görünüm tercihlerinizi değiştirin.",
    appearanceTag: "Görünüm",
    transcriptTitle: "Transkript",
    transcriptDescription: "Akademik sonuçlarınızı ve transkriptinizi görüntüleyin.",
    transcriptTag: "Akademik",
    helpTitle: "Yardım Merkezi",
    helpDescription: "Portal kullanımıyla ilgili destek ve bilgi alın.",
    helpTag: "Destek",
  },
  en: {
    seoTitle: "Menu — ATU Personal Portal",
    seoDescription: "Manage your profile, security, notifications, appearance, transcript and help settings from one place.",
    heroEyebrow: "MY MENU",
    heroTitle: "Your settings, always with you!",
    heroSubtitle: "Manage your profile, protect your account and personalize your university experience from one place.",
    sectionEyebrow: "Management",
    sectionTitle: "Settings and preferences",
    sectionCount: "{count} sections",
    openSectionAria: "Open {section}",
    profileTitle: "Profile settings",
    profileDescription: "Manage your personal and academic information.",
    profileTag: "Account",
    securityTitle: "Security",
    securityDescription: "Manage account security and sign-in options.",
    securityTag: "Security",
    notificationsTitle: "Notification settings",
    notificationsDescription: "Manage notification preferences and alerts.",
    notificationsTag: "Notifications",
    appearanceTitle: "Appearance settings",
    appearanceDescription: "Change the theme, color palette and appearance preferences.",
    appearanceTag: "Appearance",
    transcriptTitle: "Transcript",
    transcriptDescription: "Review your academic results and transcript.",
    transcriptTag: "Academic",
    helpTitle: "Help Center",
    helpDescription: "Get support and information about using the portal.",
    helpTag: "Support",
  },
  ru: {
    seoTitle: "Меню — Личный кабинет ATU",
    seoDescription: "Управляйте профилем, безопасностью, уведомлениями, оформлением, транскриптом и справкой в одном месте.",
    heroEyebrow: "МОЁ МЕНЮ",
    heroTitle: "Ваши настройки всегда с вами!",
    heroSubtitle: "Управляйте профилем, защищайте аккаунт и настраивайте университетский опыт в одном месте.",
    sectionEyebrow: "Управление",
    sectionTitle: "Настройки и предпочтения",
    sectionCount: "Разделов: {count}",
    openSectionAria: "Открыть раздел «{section}»",
    profileTitle: "Настройки профиля",
    profileDescription: "Управляйте личными и академическими данными.",
    profileTag: "Аккаунт",
    securityTitle: "Безопасность",
    securityDescription: "Настройте безопасность аккаунта и параметры входа.",
    securityTag: "Безопасность",
    notificationsTitle: "Настройки уведомлений",
    notificationsDescription: "Управляйте уведомлениями и предупреждениями.",
    notificationsTag: "Уведомления",
    appearanceTitle: "Настройки оформления",
    appearanceDescription: "Измените тему, цветовую палитру и параметры интерфейса.",
    appearanceTag: "Оформление",
    transcriptTitle: "Транскрипт",
    transcriptDescription: "Просматривайте академические результаты и транскрипт.",
    transcriptTag: "Учёба",
    helpTitle: "Центр помощи",
    helpDescription: "Получите поддержку и информацию по использованию портала.",
    helpTag: "Поддержка",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MenuHubKey = keyof (typeof menuHubMessages)["az"];
type Replacements = Record<string, string | number>;

function interpolate(message: string, replacements?: Replacements) {
  if (!replacements) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key]) : match,
  );
}

export function getMenuHubMessage(locale: Locale, key: MenuHubKey, replacements?: Replacements) {
  const message = menuHubMessages[locale]?.[key] ?? menuHubMessages.az[key];
  return interpolate(message, replacements);
}

export function useMenuHubI18n() {
  const { locale } = useI18n();
  const t = useCallback(
    (key: MenuHubKey, replacements?: Replacements) => getMenuHubMessage(locale, key, replacements),
    [locale],
  );

  return { locale, t };
}
