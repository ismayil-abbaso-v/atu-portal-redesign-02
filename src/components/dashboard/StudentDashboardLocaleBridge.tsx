import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type Locale = "az" | "tr" | "en" | "ru";

const staticText: Record<Locale, Record<string, string>> = {
  az: {},
  tr: {
    "Bugünkü cədvəliniz yüklənir…": "Bugün programınız yükleniyor…",
    "Bu gün cədvəlinizdə planlaşdırılmış dərs yoxdur.": "Bugün programınızda planlanmış ders yok.",
    "Orta bal": "Ortalama",
    "Ümumi ortalama": "Genel ortalama",
    "Bütün fənlər üzrə yekun qiymətlərin ortasıdır.": "Tüm derslerdeki final notlarının ortalamasıdır.",
    "Hələ heç bir yekun qiymətiniz yoxdur.": "Henüz final notunuz bulunmuyor.",
    "Aktiv fənlər": "Aktif dersler",
    "Yaxın imtahan": "Yaklaşan sınav",
    "Yeni bildiriş": "Yeni bildirim",
    "Bugünkü dərslər": "Bugünkü dersler",
    "Bu gün dərs yoxdur.": "Bugün ders yok.",
    "Dərs": "Ders",
    "Qrupunuz": "Grubunuz",
    "Hələ heç bir qrupa təyin edilməmisiniz.": "Henüz bir gruba atanmadınız.",
    "Qrup": "Grup",
    "Üzv məlumatı yoxdur": "Üye bilgisi yok",
    "Qrup yoldaşları": "Grup arkadaşları",
    "Qrup söhbəti": "Grup sohbeti",
    "Fayllar": "Dosyalar",
    "Qrup elanları": "Grup duyuruları",
    "Tezliklə": "Yakında",
    "Son bildirişlər": "Son bildirimler",
    "Hamısını gör": "Tümünü gör",
    "Bildiriş yoxdur.": "Bildirim yok.",
    "Otaq": "Oda",
    "dəq": "dk",
  },
  en: {
    "Bugünkü cədvəliniz yüklənir…": "Your schedule is loading…",
    "Bu gün cədvəlinizdə planlaşdırılmış dərs yoxdur.": "There are no scheduled classes today.",
    "Orta bal": "Average",
    "Ümumi ortalama": "Overall average",
    "Bütün fənlər üzrə yekun qiymətlərin ortasıdır.": "The average of your final grades across all courses.",
    "Hələ heç bir yekun qiymətiniz yoxdur.": "You do not have any final grades yet.",
    "Aktiv fənlər": "Active courses",
    "Yaxın imtahan": "Upcoming exam",
    "Yeni bildiriş": "New notification",
    "Bugünkü dərslər": "Today's classes",
    "Bu gün dərs yoxdur.": "No classes today.",
    "Dərs": "Class",
    "Qrupunuz": "Your group",
    "Hələ heç bir qrupa təyin edilməmisiniz.": "You have not been assigned to a group yet.",
    "Qrup": "Group",
    "Üzv məlumatı yoxdur": "No member information",
    "Qrup yoldaşları": "Group members",
    "Qrup söhbəti": "Group chat",
    "Fayllar": "Files",
    "Qrup elanları": "Group announcements",
    "Tezliklə": "Coming soon",
    "Son bildirişlər": "Recent notifications",
    "Hamısını gör": "View all",
    "Bildiriş yoxdur.": "No notifications.",
    "Otaq": "Room",
    "dəq": "min",
  },
  ru: {
    "Bugünkü cədvəliniz yüklənir…": "Расписание загружается…",
    "Bu gün cədvəlinizdə planlaşdırılmış dərs yoxdur.": "На сегодня запланированных занятий нет.",
    "Orta bal": "Средний балл",
    "Ümumi ortalama": "Общий средний балл",
    "Bütün fənlər üzrə yekun qiymətlərin ortasıdır.": "Среднее значение итоговых оценок по всем предметам.",
    "Hələ heç bir yekun qiymətiniz yoxdur.": "Итоговых оценок пока нет.",
    "Aktiv fənlər": "Активные предметы",
    "Yaxın imtahan": "Ближайший экзамен",
    "Yeni bildiriş": "Новое уведомление",
    "Bugünkü dərslər": "Занятия сегодня",
    "Bu gün dərs yoxdur.": "Сегодня занятий нет.",
    "Dərs": "Занятие",
    "Qrupunuz": "Ваша группа",
    "Hələ heç bir qrupa təyin edilməmisiniz.": "Вы ещё не назначены в группу.",
    "Qrup": "Группа",
    "Üzv məlumatı yoxdur": "Нет данных об участниках",
    "Qrup yoldaşları": "Одногруппники",
    "Qrup söhbəti": "Чат группы",
    "Fayllar": "Файлы",
    "Qrup elanları": "Объявления группы",
    "Tezliklə": "Скоро",
    "Son bildirişlər": "Последние уведомления",
    "Hamısını gör": "Посмотреть все",
    "Bildiriş yoxdur.": "Уведомлений нет.",
    "Otaq": "Аудитория",
    "dəq": "мин",
  },
};

const dynamicToday: Record<Locale, (count: number) => string> = {
  az: (count) => `Bu gün cədvəlinizdə ${count} dərs var. Uğurlu bir gün keçirin.`,
  tr: (count) => `Bugün programınızda ${count} ders var. Başarılı bir gün dilerim.`,
  en: (count) => `You have ${count} classes scheduled today. Have a productive day.`,
  ru: (count) => `Сегодня у вас ${count} занятий. Желаем продуктивного дня.`,
};

const greeting: Record<Locale, string> = {
  az: "Salam",
  tr: "Merhaba",
  en: "Hello",
  ru: "Здравствуйте",
};

const dateLocales: Record<Locale, string> = {
  az: "az-AZ",
  tr: "tr-TR",
  en: "en-US",
  ru: "ru-RU",
};

const azDateWords = /(yanvar|fevral|mart|aprel|may|iyun|iyul|avqust|sentyabr|oktyabr|noyabr|dekabr|bazar ertəsi|çərşənbə axşamı|çərşənbə|cümə axşamı|cümə|şənbə|bazar)/i;

function localizedDate(locale: Locale): string {
  const value = new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date());
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length >= 2) return `${parts[1]} · ${parts[0]}`;
  return value;
}

function translateTextNode(textNode: Text, locale: Locale) {
  // Azərbaycan dili defoltdur və artıq mətnlər Azərbaycan dilindədir.
  // Burada heç bir DOM yazışı etməmək vacibdir: əks halda MutationObserver
  // öz yazdığı eyni mətni yenidən tutaraq sonsuz callback dövrü yarada bilər.
  if (locale === "az") return;

  const original = textNode.nodeValue ?? "";
  const value = original.trim();
  if (!value) return;

  const map = staticText[locale];
  const exact = map[value];
  if (exact) {
    textNode.nodeValue = original.replace(value, exact);
    return;
  }

  const match = value.match(/^Bu gün cədvəlinizdə (\d+) dərs var\. Uğurlu bir gün keçirin\.$/);
  if (match) {
    textNode.nodeValue = original.replace(value, dynamicToday[locale](Number(match[1])));
    return;
  }

  if (/^Salam(?:[,!]|\s)/i.test(value)) {
    textNode.nodeValue = original.replace(/^\s*Salam/i, greeting[locale]);
    return;
  }

  if (azDateWords.test(value) && /\d{1,2}/.test(value) && value.includes("·")) {
    textNode.nodeValue = original.replace(value, localizedDate(locale));
    return;
  }

  const room = value.match(/^Otaq (.+)$/);
  if (room) {
    textNode.nodeValue = original.replace(value, `${map.Otaq} ${room[1]}`);
    return;
  }

  const duration = value.match(/^(\d+) dəq$/);
  if (duration) {
    textNode.nodeValue = original.replace(value, `${duration[1]} ${map["dəq"]}`);
  }
}

function translateTree(root: HTMLElement, locale: Locale) {
  if (locale === "az") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    translateTextNode(node as Text, locale);
  }
}

function translateAddedNode(node: Node, locale: Locale) {
  if (locale === "az") return;

  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text, locale);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let child: Node | null;
  while ((child = walker.nextNode())) {
    translateTextNode(child as Text, locale);
  }
}

export function StudentDashboardLocaleBridge({ children }: { children: ReactNode }) {
  const { locale } = useI18n();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-student-dashboard]");
    if (!root || locale === "az") return;

    // İlk render üçün bir dəfə tam ağacı çeviririk.
    translateTree(root, locale);

    // Dashboard-da count-up/ring animasiyaları hər frame-də text node dəyişdirə
    // bilər. Əvvəlki implementasiya hər dəyişiklikdə bütün dashboard-u yenidən
    // gəzirdi. İndi yalnız dəyişən node və yeni əlavə olunan subtree işlənir.
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, locale);
          continue;
        }

        for (const addedNode of mutation.addedNodes) {
          translateAddedNode(addedNode, locale);
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return <div data-student-dashboard className="contents">{children}</div>;
}
