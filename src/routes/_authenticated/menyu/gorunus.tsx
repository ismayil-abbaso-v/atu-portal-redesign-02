import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Globe2,
  Home,
  Laptop,
  Moon,
  Palette as PaletteIcon,
  Sparkles,
  Sun,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import appearanceHero from "@/assets/appearance-settings-hero.webp";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SettingsPageHero } from "@/components/menu/SettingsPageHero";
import { DeanDashboard } from "@/components/dashboard/DeanDashboard";
import { RoleDashboardLocaleBridge } from "@/components/dashboard/RoleDashboardLocaleBridge";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { StudentDashboardLocaleBridge } from "@/components/dashboard/StudentDashboardLocaleBridge";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { TutorDashboard } from "@/components/dashboard/TutorDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { usePrimaryRole } from "@/hooks/use-user-role";
import { LOCALE_LABELS, type Locale, useI18n } from "@/lib/i18n";
import { useTheme, type Palette, type ThemeMode } from "@/lib/theme";
import "@/appearance-premium.css";
import "@/settings-redesign.css";

export const Route = createFileRoute("/_authenticated/menyu/gorunus")({
  head: () => ({
    meta: [
      { title: "Görünüş parametrləri — ATU Şəxsi Kabinet" },
      { name: "description", content: "Tema, rəng palitrası, dil və mətn ölçüsünü tənzimləyin." },
    ],
  }),
  component: GorunusSehifesi,
});

const temalar: { deyer: ThemeMode; key: "light" | "dark" | "system"; icon: typeof Sun }[] = [
  { deyer: "light", key: "light", icon: Sun },
  { deyer: "dark", key: "dark", icon: Moon },
  { deyer: "system", key: "system", icon: Laptop },
];

const palitralar: {
  deyer: Palette;
  nameKey: string;
  descKey: string;
  renkler: [string, string, string, string];
  accent: string;
}[] = [
  {
    deyer: "original",
    nameKey: "settings.paletteClassic",
    descKey: "settings.paletteClassicDescription",
    renkler: ["#6d0926", "#b8904d", "#f8f2e9", "#173a5e"],
    accent: "#6d0926",
  },
  {
    deyer: "rose",
    nameKey: "settings.paletteAcademic",
    descKey: "settings.paletteAcademicDescription",
    renkler: ["#1b4d7e", "#3d8bc9", "#e8f3fb", "#102b46"],
    accent: "#245f98",
  },
  {
    deyer: "forest",
    nameKey: "settings.paletteForest",
    descKey: "settings.paletteForestDescription",
    renkler: ["#176b4b", "#6eaf91", "#edf7f1", "#163a2d"],
    accent: "#176b4b",
  },
  {
    deyer: "sunset",
    nameKey: "settings.paletteSunset",
    descKey: "settings.paletteSunsetDescription",
    renkler: ["#9a542f", "#d7a66f", "#fcf4e8", "#4a2a1d"],
    accent: "#9a542f",
  },
];

const APPEARANCE_HERO: Record<Locale, { eyebrow: string; quote: string }> = {
  az: { eyebrow: "PORTAL GÖRÜNÜŞÜ", quote: "Rahat interfeys diqqəti vacib olana yönəldir." },
  tr: { eyebrow: "PORTAL GÖRÜNÜMÜ", quote: "Rahat bir arayüz dikkati önemli olana yönlendirir." },
  en: { eyebrow: "PORTAL APPEARANCE", quote: "A comfortable interface keeps attention on what matters." },
  ru: { eyebrow: "ОФОРМЛЕНИЕ ПОРТАЛА", quote: "Удобный интерфейс помогает сосредоточиться на главном." },
};

const akademikMaviAdlari: Record<Locale, string> = {
  az: "Akademik Mavi",
  tr: "Akademik Mavi",
  en: "Academic Blue",
  ru: "Академический синий",
};

function DilSecicisi({
  locale,
  locales,
  setLocale,
  label,
}: {
  locale: Locale;
  locales: readonly Locale[];
  setLocale: (locale: Locale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="appearance-language-trigger flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 text-left font-semibold text-foreground shadow-sm outline-none hover:border-primary/40 hover:bg-accent/30 focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Globe2 className="size-4" />
          </span>
          <span className="truncate">{LOCALE_LABELS[locale]}</span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        role="listbox"
        aria-label={label}
        className={`absolute inset-x-0 top-[calc(100%+8px)] z-50 origin-top overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 transition-all duration-200 ${open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"}`}
      >
        {locales.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors duration-150 ${active ? "bg-accent text-primary" : "text-foreground hover:bg-muted"}`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex size-8 items-center justify-center rounded-lg text-xs font-extrabold uppercase ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {code}
                </span>
                <span className="font-semibold">{LOCALE_LABELS[code]}</span>
              </span>
              {active && <Check className="size-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RealAnaSehifeOnizleme() {
  const { primaryRole, isLoading, userId } = usePrimaryRole();

  let dashboard = null;
  if (!isLoading && userId) {
    switch (primaryRole) {
      case "admin":
        dashboard = <AdminDashboard />;
        break;
      case "dekan":
        dashboard = <DeanDashboard userId={userId} />;
        break;
      case "muellim":
        dashboard = (
          <RoleDashboardLocaleBridge>
            <TeacherDashboard userId={userId} />
          </RoleDashboardLocaleBridge>
        );
        break;
      case "tyutor":
        dashboard = (
          <RoleDashboardLocaleBridge>
            <TutorDashboard userId={userId} />
          </RoleDashboardLocaleBridge>
        );
        break;
      case "telebe":
      default:
        dashboard = (
          <StudentDashboardLocaleBridge>
            <StudentDashboard userId={userId} />
          </StudentDashboardLocaleBridge>
        );
    }
  }

  return (
    <div className="appearance-preview__viewport">
      {isLoading || !userId ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-36 w-full rounded-3xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Real ana səhifə önizləməsi">
          <div className="origin-top-left scale-[0.42]" style={{ width: "238.095238%" }}>
            <div className="p-5">{dashboard}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function GorunusSehifesi() {
  const { t, locale, setLocale, locales } = useI18n();
  const { mode, palette, fontScale, setMode, setPalette, setFontScale } = useTheme();

  useEffect(() => {
    document.title = `${t("settings.appearance")} — ${t("app.name")}`;
  }, [t, locale]);

  return (
    <div className="appearance-page prompt8-appearance">
      <SettingsPageHero
        variant="appearance"
        image={appearanceHero}
        eyebrow={APPEARANCE_HERO[locale].eyebrow}
        title={t("settings.appearance")}
        subtitle={`${t("settings.themeDescription")} ${t("settings.paletteDescription")}`}
        quote={APPEARANCE_HERO[locale].quote}
        icon={<PaletteIcon />}
        backLabel={t("common.back")}
      />

      <div className="appearance-layout">
        <div className="appearance-column">
          <section className="appearance-card">
            <div className="appearance-section-head">
              <span className="appearance-section-icon"><Sparkles className="size-5" /></span>
              <div>
                <h2 className="appearance-section-title">{t("settings.theme")}</h2>
                <p className="appearance-section-desc">{t("settings.themeDescription")}</p>
              </div>
            </div>

            <div className="appearance-theme-grid">
              {temalar.map((item) => {
                const Icon = item.icon;
                const active = mode === item.deyer;
                return (
                  <button
                    key={item.deyer}
                    type="button"
                    onClick={() => setMode(item.deyer)}
                    aria-pressed={active}
                    className={`appearance-theme-option ${active ? "is-active" : ""}`}
                  >
                    <div className="appearance-theme-option__top">
                      <span className="appearance-theme-option__icon"><Icon className="size-5" /></span>
                      <span className="appearance-theme-option__name">{t(`settings.${item.key}`)}</span>
                      {active && <Check className="appearance-theme-option__check size-4" />}
                    </div>
                    <p className="appearance-theme-option__desc">{t(`settings.${item.key}Description`)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="appearance-card">
            <div className="appearance-section-head">
              <span className="appearance-section-icon"><PaletteIcon className="size-5" /></span>
              <div>
                <h2 className="appearance-section-title">{t("settings.palette")}</h2>
                <p className="appearance-section-desc">{t("settings.paletteDescription")}</p>
              </div>
            </div>

            <div className="appearance-palette-list">
              {palitralar.map((item) => {
                const active = palette === item.deyer;
                return (
                  <button
                    key={item.deyer}
                    type="button"
                    onClick={() => setPalette(item.deyer)}
                    aria-pressed={active}
                    className={`appearance-palette-option ${active ? "is-active" : ""}`}
                  >
                    <div
                      className="appearance-palette-option__bar"
                      style={{ background: `linear-gradient(90deg, ${item.renkler[0]}, ${item.renkler[1]}, ${item.renkler[2]}, ${item.renkler[3]})` }}
                    />
                    <div className="appearance-palette-option__body">
                      <div className="appearance-palette-swatches" aria-hidden>
                        {item.renkler.map((color) => (
                          <span key={color} className="appearance-palette-swatch" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="appearance-palette-copy">
                        <div className="appearance-palette-name">
                          <span>{item.deyer === "rose" ? akademikMaviAdlari[locale] : t(item.nameKey)}</span>
                          {active && <span className="appearance-active-badge">{t("settings.active")}</span>}
                        </div>
                        <p className="appearance-palette-desc">{t(item.descKey)}</p>
                      </div>
                      <span className="appearance-palette-action" style={{ color: item.accent }}>
                        {active ? <Check className="size-4" /> : <ChevronDown className="size-4 -rotate-90" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="appearance-compact-grid">
            <section className="appearance-card">
              <div className="appearance-section-head">
                <span className="appearance-section-icon"><Globe2 className="size-5" /></span>
                <div>
                  <h2 className="appearance-section-title">{t("settings.language")}</h2>
                  <p className="appearance-section-desc">{t("settings.languageDescription")}</p>
                </div>
              </div>
              <DilSecicisi locale={locale} locales={locales} setLocale={setLocale} label={t("settings.language")} />
            </section>

            <section className="appearance-card">
              <div className="appearance-section-head">
                <span className="appearance-section-icon"><Type className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="appearance-section-title">{t("settings.fontSize")}</h2>
                </div>
                <span className="appearance-font-value">{Math.round(fontScale * 100)}%</span>
              </div>
              <div className="appearance-slider-wrap">
                <Slider
                  value={[fontScale]}
                  min={0.9}
                  max={1.3}
                  step={0.05}
                  onValueChange={([value]) => setFontScale(value ?? 1)}
                  aria-label={t("settings.fontSize")}
                />
                <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t("settings.small")}</span>
                  <span>{t("settings.standard")}</span>
                  <span>{t("settings.large")}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="appearance-preview">
          <div className="appearance-preview__head">
            <span className="appearance-preview__icon"><Home className="size-5" /></span>
            <div className="appearance-preview__copy">
              <h2 className="appearance-preview__title">{t("settings.livePreview")}</h2>
              <p className="appearance-preview__desc">{t("settings.livePreviewDescription")}</p>
            </div>
            <span className="appearance-preview__status">
              <span className="appearance-preview__status-dot" />
              Canlı
            </span>
          </div>

          <div className="appearance-preview__chrome">
            <div className="appearance-preview__toolbar" aria-hidden>
              <span className="appearance-preview__toolbar-dot" />
              <span className="appearance-preview__toolbar-dot" />
              <span className="appearance-preview__toolbar-dot" />
              <span className="appearance-preview__toolbar-label">ATU Portal · /ev</span>
            </div>
            <RealAnaSehifeOnizleme />
          </div>
        </aside>
      </div>
    </div>
  );
}
