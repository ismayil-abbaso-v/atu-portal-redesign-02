import { useI18n } from "@/lib/i18n";

type Locale = "az" | "tr" | "en" | "ru";
const messages: Record<Locale, Record<string, string>> = {
  az: { cabinet: "Dekan Kabineti", totalStudents: "Ümumi tələbə sayı", attendance: "Ortalama davamiyyət", averageFinal: "Ortalama qiymət (yekun)", ranking: "Qrup və Tyutor Akademik Reytinqi", noGroups: "Bu fakültədə hələ qrup qeydiyyatı yoxdur.", rank: "Sıra", group: "Qrup", tutor: "Tyutor", students: "Tələbə sayı", avgAttendance: "Ort. davamiyyət", avgFinal: "Ort. yekun qiymət", unassigned: "Təyin edilməyib" },
  tr: { cabinet: "Dekan Paneli", totalStudents: "Toplam öğrenci sayısı", attendance: "Ortalama devamlılık", averageFinal: "Ortalama final notu", ranking: "Grup ve Tutor Akademik Sıralaması", noGroups: "Bu fakültede henüz grup kaydı yok.", rank: "Sıra", group: "Grup", tutor: "Tutor", students: "Öğrenci sayısı", avgAttendance: "Ort. devamlılık", avgFinal: "Ort. final notu", unassigned: "Atanmadı" },
  en: { cabinet: "Dean Dashboard", totalStudents: "Total students", attendance: "Average attendance", averageFinal: "Average final grade", ranking: "Group & Tutor Academic Ranking", noGroups: "There are no group registrations in this faculty yet.", rank: "Rank", group: "Group", tutor: "Tutor", students: "Student count", avgAttendance: "Avg. attendance", avgFinal: "Avg. final grade", unassigned: "Not assigned" },
  ru: { cabinet: "Панель декана", totalStudents: "Всего студентов", attendance: "Средняя посещаемость", averageFinal: "Средняя итоговая оценка", ranking: "Академический рейтинг групп и тьюторов", noGroups: "В этом факультете пока нет зарегистрированных групп.", rank: "Место", group: "Группа", tutor: "Тьютор", students: "Количество студентов", avgAttendance: "Сред. посещаемость", avgFinal: "Сред. итоговая оценка", unassigned: "Не назначен" },
};
export function useDeanI18n() { const { locale } = useI18n(); const t = (key: string) => messages[locale][key] ?? messages.en[key] ?? key; return { locale, t }; }
