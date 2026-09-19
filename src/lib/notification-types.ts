import {
  Award,
  Bell,
  CalendarDays,
  Megaphone,
  PartyPopper,
  Users,
  User,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type BildirisTipi =
  "sistem" | "tedbir" | "xeberdarliq" | "mukafat" | "shexsi" | "sosial" | "xususi_gun" | "elan";

export const bildirisTipKonfiqurasiyasi: Record<
  BildirisTipi,
  { etiket: string; icon: LucideIcon; renk: string; fon: string }
> = {
  sistem: { etiket: "Sistem", icon: Bell, renk: "text-blue-500", fon: "bg-blue-500/10" },
  tedbir: {
    etiket: "Tədbir",
    icon: CalendarDays,
    renk: "text-indigo-500",
    fon: "bg-indigo-500/10",
  },
  xeberdarliq: {
    etiket: "Xəbərdarlıq",
    icon: AlertTriangle,
    renk: "text-orange-500",
    fon: "bg-orange-500/10",
  },
  mukafat: { etiket: "Mükafat", icon: Award, renk: "text-emerald-500", fon: "bg-emerald-500/10" },
  shexsi: { etiket: "Şəxsi", icon: User, renk: "text-purple-500", fon: "bg-purple-500/10" },
  sosial: { etiket: "Sosial", icon: Users, renk: "text-pink-500", fon: "bg-pink-500/10" },
  xususi_gun: {
    etiket: "Xüsusi Gün",
    icon: PartyPopper,
    renk: "text-amber-500",
    fon: "bg-amber-500/10",
  },
  elan: { etiket: "Elan", icon: Megaphone, renk: "text-teal-500", fon: "bg-teal-500/10" },
};

export function bildirisKonfiqurasiyasiniAl(tip: string) {
  return (
    bildirisTipKonfiqurasiyasi[tip as BildirisTipi] ?? {
      etiket: tip,
      icon: Bell,
      renk: "text-muted-foreground",
      fon: "bg-muted",
    }
  );
}
