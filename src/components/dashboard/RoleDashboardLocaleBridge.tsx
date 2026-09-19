import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type Locale = "az" | "tr" | "en" | "ru";

type Dict = Record<string, string>;
const dictionaries: Record<Exclude<Locale, "az">, Dict> = {
  tr: {
    "Müəllim Kabineti": "Öğretmen Paneli", "Tədris etdiyiniz fənn tapılmadı.": "Verdiğiniz ders bulunamadı.", "Son 5 dərsin davamiyyəti": "Son 5 dersin devam durumu", "Hələ ki, davamiyyət statistikası yoxdur.": "Henüz devam istatistiği yok.", "Bal daxil et": "Not gir", "Qiymətləndirmə": "Değerlendirme", "Bağla": "Kapat", "Tələbə": "Öğrenci", "Semestr qiyməti (Maks. 50)": "Yarıyıl notu (Maks. 50)", "İmtahan Balı (Maks. 50)": "Sınav notu (Maks. 50)", "Yoxdur": "Yok", "Yekun": "Final", "Zəhmət olmasa tələbəni seçin.": "Lütfen öğrenciyi seçin.", "Tələbənin imtahan balları uğurla qeyd olundu.": "Öğrencinin sınav notları başarıyla kaydedildi.", "Xəta baş verdi.": "Bir hata oluştu.", "Saxla": "Kaydet", "Ləğv et": "İptal et"
  },
  en: {
    "Müəllim Kabineti": "Teacher Dashboard", "Tədris etdiyiniz fənn tapılmadı.": "No courses assigned to you were found.", "Son 5 dərsin davamiyyəti": "Attendance for the last 5 classes", "Hələ ki, davamiyyət statistikası yoxdur.": "There is no attendance statistics yet.", "Bal daxil et": "Enter grade", "Qiymətləndirmə": "Assessment", "Bağla": "Close", "Tələbə": "Student", "Semestr qiyməti (Maks. 50)": "Semester grade (Max. 50)", "İmtahan Balı (Maks. 50)": "Exam grade (Max. 50)", "Yoxdur": "None", "Yekun": "Final", "Zəhmət olmasa tələbəni seçin.": "Please select a student.", "Tələbənin imtahan balları uğurla qeyd olundu.": "The student's exam grades were saved successfully.", "Xəta baş verdi.": "An error occurred.", "Saxla": "Save", "Ləğv et": "Cancel"
  },
  ru: {
    "Müəllim Kabineti": "Панель преподавателя", "Tədris etdiyiniz fənn tapılmadı.": "Назначенные вам предметы не найдены.", "Son 5 dərsin davamiyyəti": "Посещаемость последних 5 занятий", "Hələ ki, davamiyyət statistikası yoxdur.": "Статистики посещаемости пока нет.", "Bal daxil et": "Ввести оценку", "Qiymətləndirmə": "Оценивание", "Bağla": "Закрыть", "Tələbə": "Студент", "Semestr qiyməti (Maks. 50)": "Семестровая оценка (макс. 50)", "İmtahan Balı (Maks. 50)": "Экзаменационная оценка (макс. 50)", "Yoxdur": "Нет", "Yekun": "Итог", "Zəhmət olmasa tələbəni seçin.": "Выберите студента.", "Tələbənin imtahan balları uğurla qeyd olundu.": "Экзаменационные оценки студента успешно сохранены.", "Xəta baş verdi.": "Произошла ошибка.", "Saxla": "Сохранить", "Ləğv et": "Отмена"
  }
};

function translate(root: HTMLElement, locale: Locale) {
  if (locale === "az") return;
  const map = dictionaries[locale];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const text of nodes) {
    const value = text.nodeValue?.trim();
    if (!value) continue;
    const replacement = map[value];
    if (replacement) text.nodeValue = text.nodeValue!.replace(value, replacement);
  }
}

export function RoleDashboardLocaleBridge({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-role-dashboard]");
    if (!root) return;
    translate(root, locale);
    const observer = new MutationObserver(() => translate(root, locale));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);
  return <div data-role-dashboard className="contents">{children}</div>;
}
