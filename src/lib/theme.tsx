import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Palette = "original" | "rose" | "forest" | "sunset";

type ThemeState = { mode: ThemeMode; palette: Palette; fontScale: number; setMode: (mode: ThemeMode) => void; setPalette: (palette: Palette) => void; setFontScale: (scale: number) => void };
const ThemeContext = createContext<ThemeState | null>(null);
const STORAGE_KEY = "atu-theme";
type Stored = { mode: ThemeMode; palette: Palette; fontScale: number };
const DEFAULTS: Stored = { mode: "light", palette: "original", fontScale: 1 };

type PaletteTokens = Record<string, string>;
const PALETTE_TOKENS: Record<Exclude<Palette, "original">, { light: PaletteTokens; dark: PaletteTokens }> = {
  rose: {
    light: { "--background":"oklch(.977 .009 238)", "--foreground":"oklch(.235 .032 250)", "--card":"oklch(.996 .004 238)", "--card-foreground":"oklch(.235 .032 250)", "--primary":"oklch(.455 .145 247)", "--primary-foreground":"oklch(.99 .002 240)", "--secondary":"oklch(.955 .018 236)", "--secondary-foreground":"oklch(.29 .06 247)", "--muted":"oklch(.954 .014 238)", "--muted-foreground":"oklch(.54 .032 244)", "--accent":"oklch(.925 .052 236)", "--accent-foreground":"oklch(.365 .12 247)", "--brand":"oklch(.39 .13 248)", "--brand-foreground":"oklch(.99 .002 240)", "--border":"oklch(.89 .026 236)", "--input":"oklch(.972 .012 238)", "--ring":"oklch(.57 .145 243)", "--sidebar":"oklch(.99 .006 238)", "--sidebar-foreground":"oklch(.235 .032 250)", "--sidebar-primary":"oklch(.455 .145 247)", "--sidebar-primary-foreground":"oklch(.99 .002 240)", "--sidebar-accent":"oklch(.932 .045 236)", "--sidebar-accent-foreground":"oklch(.365 .12 247)", "--sidebar-border":"oklch(.89 .026 236)" },
    dark: { "--background":"oklch(.17 .023 248)", "--foreground":"oklch(.95 .01 238)", "--card":"oklch(.215 .028 248)", "--card-foreground":"oklch(.95 .01 238)", "--primary":"oklch(.70 .135 242)", "--primary-foreground":"oklch(.15 .025 248)", "--secondary":"oklch(.265 .03 248)", "--secondary-foreground":"oklch(.94 .012 238)", "--muted":"oklch(.26 .027 248)", "--muted-foreground":"oklch(.71 .028 238)", "--accent":"oklch(.30 .065 244)", "--accent-foreground":"oklch(.96 .01 238)", "--brand":"oklch(.59 .145 245)", "--brand-foreground":"oklch(.985 .004 238)", "--border":"oklch(.34 .032 244 / .78)", "--input":"oklch(.225 .026 248)", "--ring":"oklch(.72 .13 240)", "--sidebar":"oklch(.19 .024 248)", "--sidebar-foreground":"oklch(.95 .01 238)", "--sidebar-primary":"oklch(.70 .135 242)", "--sidebar-primary-foreground":"oklch(.15 .025 248)", "--sidebar-accent":"oklch(.29 .055 244)", "--sidebar-accent-foreground":"oklch(.96 .01 238)", "--sidebar-border":"oklch(.34 .032 244 / .78)" }
  },
  forest: {
    light: { "--background":"oklch(.975 .018 150)", "--foreground":"oklch(.22 .045 150)", "--card":"oklch(.995 .006 150)", "--card-foreground":"oklch(.22 .045 150)", "--primary":"oklch(.42 .13 150)", "--primary-foreground":"oklch(.99 .003 150)", "--secondary":"oklch(.95 .025 150)", "--secondary-foreground":"oklch(.28 .055 150)", "--muted":"oklch(.95 .02 150)", "--muted-foreground":"oklch(.53 .04 150)", "--accent":"oklch(.92 .055 150)", "--accent-foreground":"oklch(.38 .12 150)", "--brand":"oklch(.36 .12 150)", "--brand-foreground":"oklch(.99 .003 150)", "--border":"oklch(.89 .035 150)", "--input":"oklch(.975 .018 150)", "--ring":"oklch(.5 .14 150)", "--sidebar":"oklch(.99 .008 150)", "--sidebar-foreground":"oklch(.22 .045 150)", "--sidebar-primary":"oklch(.42 .13 150)", "--sidebar-primary-foreground":"oklch(.99 .003 150)", "--sidebar-accent":"oklch(.93 .05 150)", "--sidebar-accent-foreground":"oklch(.38 .12 150)", "--sidebar-border":"oklch(.89 .035 150)" },
    dark: { "--background":"oklch(.18 .03 150)", "--foreground":"oklch(.96 .012 150)", "--card":"oklch(.235 .04 150)", "--card-foreground":"oklch(.96 .012 150)", "--primary":"oklch(.68 .12 150)", "--primary-foreground":"oklch(.19 .03 150)", "--secondary":"oklch(.28 .035 150)", "--secondary-foreground":"oklch(.95 .015 150)", "--muted":"oklch(.28 .035 150)", "--muted-foreground":"oklch(.71 .03 150)", "--accent":"oklch(.32 .06 150)", "--accent-foreground":"oklch(.96 .012 150)", "--brand":"oklch(.45 .12 150)", "--brand-foreground":"oklch(.99 .003 150)", "--border":"oklch(1 0 0 / 10%)", "--input":"oklch(1 0 0 / 10%)", "--ring":"oklch(.68 .12 150)", "--sidebar":"oklch(.21 .035 150)", "--sidebar-foreground":"oklch(.96 .012 150)", "--sidebar-primary":"oklch(.68 .12 150)", "--sidebar-primary-foreground":"oklch(.19 .03 150)", "--sidebar-accent":"oklch(.32 .06 150)", "--sidebar-accent-foreground":"oklch(.96 .012 150)", "--sidebar-border":"oklch(1 0 0 / 10%)" }
  },
  sunset: {
    light: { "--background":"oklch(.975 .022 72)", "--foreground":"oklch(.25 .055 42)", "--card":"oklch(.995 .008 72)", "--card-foreground":"oklch(.25 .055 42)", "--primary":"oklch(.52 .15 42)", "--primary-foreground":"oklch(.99 .004 72)", "--secondary":"oklch(.95 .03 72)", "--secondary-foreground":"oklch(.31 .07 42)", "--muted":"oklch(.95 .025 72)", "--muted-foreground":"oklch(.55 .045 42)", "--accent":"oklch(.92 .065 65)", "--accent-foreground":"oklch(.45 .13 42)", "--brand":"oklch(.44 .14 42)", "--brand-foreground":"oklch(.99 .004 72)", "--border":"oklch(.89 .04 65)", "--input":"oklch(.975 .022 72)", "--ring":"oklch(.59 .16 42)", "--sidebar":"oklch(.99 .01 72)", "--sidebar-foreground":"oklch(.25 .055 42)", "--sidebar-primary":"oklch(.52 .15 42)", "--sidebar-primary-foreground":"oklch(.99 .004 72)", "--sidebar-accent":"oklch(.93 .06 65)", "--sidebar-accent-foreground":"oklch(.45 .13 42)", "--sidebar-border":"oklch(.89 .04 65)" },
    dark: { "--background":"oklch(.19 .035 42)", "--foreground":"oklch(.96 .015 72)", "--card":"oklch(.24 .045 42)", "--card-foreground":"oklch(.96 .015 72)", "--primary":"oklch(.75 .12 62)", "--primary-foreground":"oklch(.21 .035 42)", "--secondary":"oklch(.29 .04 42)", "--secondary-foreground":"oklch(.95 .018 72)", "--muted":"oklch(.29 .04 42)", "--muted-foreground":"oklch(.72 .035 60)", "--accent":"oklch(.34 .07 55)", "--accent-foreground":"oklch(.97 .012 72)", "--brand":"oklch(.49 .13 42)", "--brand-foreground":"oklch(.99 .004 72)", "--border":"oklch(1 0 0 / 10%)", "--input":"oklch(1 0 0 / 10%)", "--ring":"oklch(.75 .12 62)", "--sidebar":"oklch(.22 .04 42)", "--sidebar-foreground":"oklch(.96 .015 72)", "--sidebar-primary":"oklch(.75 .12 62)", "--sidebar-primary-foreground":"oklch(.21 .035 42)", "--sidebar-accent":"oklch(.34 .07 55)", "--sidebar-accent-foreground":"oklch(.97 .012 72)", "--sidebar-border":"oklch(1 0 0 / 10%)" }
  }
};

const TOKEN_KEYS = Array.from(new Set(Object.values(PALETTE_TOKENS).flatMap((p) => [...Object.keys(p.light), ...Object.keys(p.dark)])));

function apply({ mode, palette, fontScale }: Stored) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", dark);
  TOKEN_KEYS.forEach((key) => root.style.removeProperty(key));
  if (palette === "original") root.removeAttribute("data-palette");
  else {
    root.setAttribute("data-palette", palette);
    Object.entries(PALETTE_TOKENS[palette][dark ? "dark" : "light"]).forEach(([key, value]) => root.style.setProperty(key, value));
  }
  root.style.setProperty("--font-scale", String(fontScale));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(DEFAULTS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Stored>) : {};
      const next: Stored = { ...DEFAULTS, ...parsed, palette: parsed.palette === "rose" || parsed.palette === "forest" || parsed.palette === "sunset" || parsed.palette === "original" ? parsed.palette : DEFAULTS.palette };
      setState(next);
      apply(next);
    } catch { apply(DEFAULTS); }
  }, []);
  useEffect(() => {
    apply(state);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage bloklanıb */ }
  }, [state]);
  useEffect(() => {
    if (state.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => apply(state);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [state]);
  return <ThemeContext.Provider value={{ ...state, setMode: (mode) => setState((s) => ({ ...s, mode })), setPalette: (palette) => setState((s) => ({ ...s, palette })), setFontScale: (fontScale) => setState((s) => ({ ...s, fontScale })) }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme ThemeProvider daxilində istifadə olunmalıdır");
  return ctx;
}
