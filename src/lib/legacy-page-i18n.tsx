import { useLayoutEffect } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

import { LEGACY_TEXT_1 } from "@/lib/legacy-page-i18n-data-1";
import { LEGACY_TEXT_2 } from "@/lib/legacy-page-i18n-data-2";
import { LEGACY_TEXT_3 } from "@/lib/legacy-page-i18n-data-3";
import { LEGACY_TEXT_4 } from "@/lib/legacy-page-i18n-data-4";
import type { LegacyTranslation } from "@/lib/legacy-page-i18n-types";

const LEGACY_TEXT: Record<string, LegacyTranslation> = {
  ...LEGACY_TEXT_1,
  ...LEGACY_TEXT_2,
  ...LEGACY_TEXT_3,
  ...LEGACY_TEXT_4,
  "Yüklənir...": ["Yükleniyor...", "Loading...", "Загрузка..."],
  "və onun bütün oxunma statistikası silinəcək. Bu əməliyyat geri qaytarılmır.": [
    "ve tüm okunma istatistikleri silinecek. Bu işlem geri alınamaz.",
    "and all of its read statistics will be deleted. This action cannot be undone.",
    "и вся статистика прочтений будет удалена. Это действие нельзя отменить.",
  ],
  "fənni və bütün əlaqəli məlumatları (mövzular, müəllimlər, statuslar) HƏMİŞƏLİK silinəcək. Bu əməliyyat GERİ QAYTARILA BİLMƏZ.": [
    "dersi ve ilişkili tüm veriler (konular, öğretmenler, durumlar) KALICI olarak silinecek. Bu işlem GERİ ALINAMAZ.",
    "course and all related data (topics, teachers, statuses) will be PERMANENTLY deleted. This action CANNOT BE UNDONE.",
    "дисциплина и все связанные данные (темы, преподаватели, статусы) будут удалены НАВСЕГДА. Это действие НЕЛЬЗЯ ОТМЕНИТЬ.",
  ],
  "tələbəsi bu qrupdan çıxarılacaq. Tələbənin digər fənn/davamiyyət qeydlərinə toxunulmayacaq.": [
    "öğrencisi bu gruptan çıkarılacak. Öğrencinin diğer ders/devam kayıtlarına dokunulmayacak.",
    "will be removed from this group. The student's other course/attendance records will not be changed.",
    "будет удалён из этой группы. Другие записи студента по дисциплинам и посещаемости не изменятся.",
  ],
};

type TrackedValue = {
  source: string;
  lastOutput: string;
};

const TARGET_PATHS = [
  /^\/teqvim(?:\/|$)/,
  /^\/fakulte-icmali(?:\/|$)/,
  /^\/imtahanlar(?:\/|$)/,
  /^\/qruplar(?:\/|$)/,
  /^\/admin(?:\/|$)/,
] as const;

// Compatibility dictionary for authenticated legacy screens that pre-date the
// portal-wide i18n hooks. New UI should still use useI18n/usePageI18n directly.
const MONTHS: Record<string, LegacyTranslation> = {
  "yanvar": ["Ocak", "January", "января"],
  "fevral": ["Şubat", "February", "февраля"],
  "mart": ["Mart", "March", "марта"],
  "aprel": ["Nisan", "April", "апреля"],
  "may": ["Mayıs", "May", "мая"],
  "iyun": ["Haziran", "June", "июня"],
  "iyul": ["Temmuz", "July", "июля"],
  "avqust": ["Ağustos", "August", "августа"],
  "sentyabr": ["Eylül", "September", "сентября"],
  "oktyabr": ["Ekim", "October", "октября"],
  "noyabr": ["Kasım", "November", "ноября"],
  "dekabr": ["Aralık", "December", "декабря"],
  "yan": ["Oca", "Jan", "янв"],
  "fev": ["Şub", "Feb", "фев"],
  "mar": ["Mar", "Mar", "мар"],
  "apr": ["Nis", "Apr", "апр"],
  "iyn": ["Haz", "Jun", "июн"],
  "iyl": ["Tem", "Jul", "июл"],
  "avq": ["Ağu", "Aug", "авг"],
  "sen": ["Eyl", "Sep", "сен"],
  "okt": ["Eki", "Oct", "окт"],
  "noy": ["Kas", "Nov", "ноя"],
  "dek": ["Ara", "Dec", "дек"],
};

const textState = new WeakMap<Text, TrackedValue>();
const attributeState = new WeakMap<Element, Map<string, TrackedValue>>();

function translatedValue(value: LegacyTranslation, locale: Locale) {
  if (locale === "az") return null;
  return value[locale === "tr" ? 0 : locale === "en" ? 1 : 2];
}

function dynamicTranslation(source: string, locale: Locale): string | null {
  if (locale === "az") return source;

  const countPatterns: Array<[RegExp, LegacyTranslation]> = [
    [/^(\d+) fəaliyyət$/, ["$1 etkinlik", "$1 activities", "$1 действий"]],
    [/^(\d+) slot$/, ["$1 slot", "$1 slots", "$1 слотов"]],
    [/^(\d+) mövzu$/, ["$1 konu", "$1 topics", "$1 тем"]],
    [/^(\d+) fənn$/, ["$1 ders", "$1 courses", "$1 дисциплин"]],
    [/^(\d+) şəkil$/, ["$1 görsel", "$1 images", "$1 изображений"]],
    [/^(\d+) oxunma$/, ["$1 okunma", "$1 reads", "$1 прочтений"]],
  ];
  for (const [pattern, translations] of countPatterns) {
    const match = source.match(pattern);
    if (match) return (translatedValue(translations, locale) ?? source).replace("$1", match[1]!);
  }

  const mediaCount = source.match(/^(\d+) şəkil ·$/);
  if (mediaCount) {
    const base = translatedValue(["$1 görsel ·", "$1 images ·", "$1 изображений ·"], locale)!;
    return base.replace("$1", mediaCount[1]!);
  }

  const archiveRestore = source.match(/^Arxivdən çıxar \((\d+)\)$/);
  if (archiveRestore) {
    const base = translatedValue(["Arşivden çıkar ($1)", "Restore ($1)", "Восстановить ($1)"], locale)!;
    return base.replace("$1", archiveRestore[1]!);
  }
  const archive = source.match(/^Arxivləşdir \((\d+)\)$/);
  if (archive) {
    const base = translatedValue(["Arşivle ($1)", "Archive ($1)", "Архивировать ($1)"], locale)!;
    return base.replace("$1", archive[1]!);
  }

  const facultyOverview = source.match(/^(.+) üzrə fakültə göstəriciləri$/);
  if (facultyOverview) {
    const faculty = facultyOverview[1]!;
    if (locale === "tr") return `${faculty} fakülte göstergeleri`;
    if (locale === "en") return `Faculty indicators for ${faculty}`;
    return `Показатели факультета: ${faculty}`;
  }

  const academicDetails = source.match(/^Akademik Detallar — (.+)$/);
  if (academicDetails) {
    const course = academicDetails[1]!;
    if (locale === "tr") return `Akademik Detaylar — ${course}`;
    if (locale === "en") return `Academic Details — ${course}`;
    return `Академические детали — ${course}`;
  }

  const room = source.match(/^Otaq (.+)$/);
  if (room) {
    const number = room[1]!;
    if (locale === "tr") return `Derslik ${number}`;
    if (locale === "en") return `Room ${number}`;
    return `Аудитория ${number}`;
  }
  if (source === "Otaq göstərilməyib") {
    return translatedValue(["Derslik belirtilmemiş", "Room not specified", "Аудитория не указана"], locale);
  }

  const editAria = source.match(/^(Müəllim|Kredit|Otaq) redaktə et$/);
  if (editAria) {
    const label = editAria[1] === "Müəllim"
      ? translatedValue(["Öğretmen", "Teacher", "Преподаватель"], locale)
      : editAria[1] === "Kredit"
        ? translatedValue(["Kredi", "Credit", "Кредит"], locale)
        : translatedValue(["Derslik", "Room", "Аудитория"], locale);
    const action = translatedValue(["düzenle", "edit", "изменить"], locale);
    return locale === "ru" ? `${action} ${label}` : `${label} ${action}`;
  }

  const removeStudentAria = source.match(/^(.+) tələbəsini qrupdan çıxar$/);
  if (removeStudentAria) {
    const name = removeStudentAria[1]!;
    if (locale === "tr") return `${name} öğrencisini gruptan çıkar`;
    if (locale === "en") return `Remove ${name} from the group`;
    return `Удалить ${name} из группы`;
  }

  const currentWeek = source.match(/^Cari həftə: (.+)$/);
  if (currentWeek) {
    const value = currentWeek[1] === "Ayarlanmayıb"
      ? (locale === "tr" ? "Ayarlanmamış" : locale === "en" ? "Not configured" : "Не настроена")
      : currentWeek[1];
    if (locale === "tr") return `Geçerli hafta: ${value}`;
    if (locale === "en") return `Current week: ${value}`;
    return `Текущая неделя: ${value}`;
  }

  const sort = source.match(/^Sıra: (davamiyyət|qiymət)$/);
  if (sort) {
    const value = sort[1] === "davamiyyət"
      ? (locale === "tr" ? "devamlılık" : locale === "en" ? "attendance" : "посещаемость")
      : (locale === "tr" ? "not" : locale === "en" ? "grade" : "оценка");
    if (locale === "tr") return `Sıralama: ${value}`;
    if (locale === "en") return `Sort: ${value}`;
    return `Сортировка: ${value}`;
  }

  const statusAction = source.match(/^Statusu (aktiv|passiv) et$/);
  if (statusAction) {
    const active = statusAction[1] === "aktiv";
    if (locale === "tr") return `Durumu ${active ? "aktif" : "pasif"} yap`;
    if (locale === "en") return `Set status to ${active ? "active" : "inactive"}`;
    return `Сделать статус ${active ? "активным" : "неактивным"}`;
  }

  const errorPrefix = source.match(/^Xəta:\s*(.+)$/);
  if (errorPrefix) {
    const prefix = locale === "tr" ? "Hata" : locale === "en" ? "Error" : "Ошибка";
    return `${prefix}: ${errorPrefix[1]}`;
  }

  const weekWarning = source.match(/^Həftə ayarı saxlanıldı, sessiyalar yenilənərkən xəbərdarlıq:\s*(.+)$/);
  if (weekWarning) {
    if (locale === "tr") return `Hafta ayarı kaydedildi; oturumlar güncellenirken uyarı: ${weekWarning[1]}`;
    if (locale === "en") return `Week setting saved; warning while updating sessions: ${weekWarning[1]}`;
    return `Настройка недели сохранена; предупреждение при обновлении занятий: ${weekWarning[1]}`;
  }

  const userDelete = source.match(/^"(.+)" istifadəçisi və bütün əlaqəli məlumatları HƏMİŞƏLİK silinəcək\. Bu əməliyyat GERİ QAYTARILA BİLMƏZ\.$/);
  if (userDelete) {
    const name = userDelete[1]!;
    if (locale === "tr") return `"${name}" kullanıcısı ve ilişkili tüm veriler KALICI olarak silinecek. Bu işlem GERİ ALINAMAZ.`;
    if (locale === "en") return `The user "${name}" and all related data will be PERMANENTLY deleted. This action CANNOT BE UNDONE.`;
    return `Пользователь «${name}» и все связанные данные будут удалены НАВСЕГДА. Это действие НЕЛЬЗЯ ОТМЕНИТЬ.`;
  }

  const bookDelete = source.match(/^“(.+)” kitabı və ona aid fayllar Storage-dan silinəcək\. Bu əməliyyat geri qaytarıla bilməz\.$/);
  if (bookDelete) {
    const name = bookDelete[1]!;
    if (locale === "tr") return `“${name}” kitabı ve ilgili dosyalar Storage'dan silinecek. Bu işlem geri alınamaz.`;
    if (locale === "en") return `“${name}” and its files will be deleted from Storage. This action cannot be undone.`;
    return `Книга «${name}» и связанные файлы будут удалены из Storage. Это действие нельзя отменить.`;
  }

  const relative = source.match(/^(?:təxminən\s+)?(\d+)\s+(dəqiqə|saat|gün|ay)\s+əvvəl$/);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];
    if (locale === "tr") {
      const label = unit === "dəqiqə" ? "dakika" : unit === "saat" ? "saat" : unit === "gün" ? "gün" : "ay";
      return `${amount} ${label} önce`;
    }
    if (locale === "en") {
      const label = unit === "dəqiqə" ? "minute" : unit === "saat" ? "hour" : unit === "gün" ? "day" : "month";
      return `${amount} ${label}${amount === 1 ? "" : "s"} ago`;
    }
    const label = unit === "dəqiqə" ? "мин" : unit === "saat" ? "ч" : unit === "gün" ? "дн" : "мес";
    return `${amount} ${label} назад`;
  }

  if (source === "bir dəqiqədən az əvvəl") {
    return translatedValue(["bir dakikadan az önce", "less than a minute ago", "менее минуты назад"], locale);
  }

  let monthResult = source;
  let monthChanged = false;
  for (const [month, translations] of Object.entries(MONTHS)) {
    const translated = translatedValue(translations, locale);
    if (!translated) continue;
    const pattern = new RegExp(`(^|[\\s.,—-])${month}(?=$|[\\s.,—-])`, "giu");
    monthResult = monthResult.replace(pattern, (_match, prefix: string) => {
      monthChanged = true;
      return `${prefix}${translated}`;
    });
  }
  return monthChanged ? monthResult : null;
}

export function translateLegacyPageText(source: string, locale: Locale): string {
  if (locale === "az") return source;
  const exact = LEGACY_TEXT[source];
  if (exact) return translatedValue(exact, locale) ?? source;
  return dynamicTranslation(source, locale) ?? source;
}

function preserveWhitespace(raw: string, translated: string) {
  const leading = raw.match(/^\s*/)?.[0] ?? "";
  const trailing = raw.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translateTextNode(node: Text, locale: Locale) {
  const current = node.nodeValue ?? "";
  const existing = textState.get(node);
  let source = existing?.source ?? current;

  if (existing && current !== existing.lastOutput && current !== existing.source) {
    source = current;
  }

  const trimmed = source.trim();
  if (!trimmed) return;
  const translated = translateLegacyPageText(trimmed, locale);
  const output = preserveWhitespace(source, translated);
  textState.set(node, { source, lastOutput: output });
  if (current !== output) node.nodeValue = output;
}

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "content"] as const;

function translateAttribute(element: Element, attribute: string, locale: Locale) {
  if (!element.hasAttribute(attribute)) return;
  if (attribute === "content" && element.tagName !== "META") return;

  const current = element.getAttribute(attribute) ?? "";
  let tracked = attributeState.get(element);
  if (!tracked) {
    tracked = new Map();
    attributeState.set(element, tracked);
  }

  const existing = tracked.get(attribute);
  let source = existing?.source ?? current;
  if (existing && current !== existing.lastOutput && current !== existing.source) {
    source = current;
  }

  const translated = translateLegacyPageText(source.trim(), locale);
  const output = preserveWhitespace(source, translated);
  tracked.set(attribute, { source, lastOutput: output });
  if (current !== output) element.setAttribute(attribute, output);
}

function shouldSkip(element: Element | null) {
  if (!element) return false;
  return element.closest("script, style, noscript, [contenteditable='true']") !== null;
}

function translateSubtree(root: Node, locale: Locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = (root as Text).parentElement;
    if (!shouldSkip(parent)) translateTextNode(root as Text, locale);
    return;
  }

  if (!(root instanceof Element) && root !== document.body && root !== document.head) return;
  const element = root instanceof Element ? root : null;
  if (shouldSkip(element)) return;

  if (element) {
    for (const attribute of TRANSLATABLE_ATTRIBUTES) translateAttribute(element, attribute, locale);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.currentNode;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const parent = (current as Text).parentElement;
      if (!shouldSkip(parent)) translateTextNode(current as Text, locale);
    } else if (current instanceof Element && !shouldSkip(current)) {
      for (const attribute of TRANSLATABLE_ATTRIBUTES) translateAttribute(current, attribute, locale);
    }
    current = walker.nextNode();
  }
}

export function useLegacyPageI18nBridge(pathname: string) {
  const { locale } = useI18n();

  useLayoutEffect(() => {
    if (typeof document === "undefined" || !TARGET_PATHS.some((pattern) => pattern.test(pathname))) return;

    translateSubtree(document.head, locale);
    translateSubtree(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateSubtree(mutation.target, locale);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateAttribute(mutation.target, mutation.attributeName ?? "", locale);
          continue;
        }
        for (const node of Array.from(mutation.addedNodes)) translateSubtree(node, locale);
      }
    });

    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [locale, pathname]);
}
