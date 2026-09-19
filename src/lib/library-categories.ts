import {
  BookOpen,
  TrendingUp,
  FlaskConical,
  History,
  Brain,
  Glasses,
  Rocket,
  Lightbulb,
  Baby,
  Feather,
  LineChart,
  BookMarked,
  Palette,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface KitabxanaKateqoriya {
  ad: string;
  ikon: LucideIcon;
}

export const kitabxanaKateqoriyalari: KitabxanaKateqoriya[] = [
  { ad: "Roman", ikon: BookOpen },
  { ad: "Şəxsi İnkişaf", ikon: TrendingUp },
  { ad: "Elm və Texnologiya", ikon: FlaskConical },
  { ad: "Tarix", ikon: History },
  { ad: "Psixologiya", ikon: Brain },
  { ad: "Detektiv və Triller", ikon: Glasses },
  { ad: "Fantaziya və Elmi Fantastika", ikon: Rocket },
  { ad: "Fəlsəfə", ikon: Lightbulb },
  { ad: "Uşaqlar və Gənclər", ikon: Baby },
  { ad: "Poeziya və Ədəbiyyat", ikon: Feather },
  { ad: "Biznes", ikon: LineChart },
  { ad: "Din", ikon: BookMarked },
  { ad: "İncəsənət", ikon: Palette },
  { ad: "Digər", ikon: MoreHorizontal },
];

// AddBookForm-dakı Select üçün eyni siyahı, sadəcə {ad} formatında istifadə olunur.
export const kitabxanaKateqoriyaAdlari: string[] = kitabxanaKateqoriyalari.map((k) => k.ad);

export function kitabxanaKateqoriyaIkonu(kateqoriya: string): LucideIcon {
  return kitabxanaKateqoriyalari.find((k) => k.ad === kateqoriya)?.ikon ?? MoreHorizontal;
}
