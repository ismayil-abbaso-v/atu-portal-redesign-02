// src/lib/exam-score-utils.ts
//
// Faizə əsaslanan rəng tonu — bal/faiz göstərən HƏR yerdə (kartlar, progress
// bar-lar, badge-lər) eyni həddləri istifadə etmək üçün mərkəzi funksiya.
// Mövcud dizayn tokenlərindən (success/warning/destructive) istifadə edir,
// yeni rəng icad etmir (bax: Mərhələ 2 audit tapıntıları).

export type ScoreTone = "success" | "warning" | "destructive";

/** < 50% → destructive, 50-70% → warning, > 70% → success (Mərhələ 4 tələbi). */
export function getScoreTone(percentage: number | null | undefined): ScoreTone {
  const pct = typeof percentage === "number" && Number.isFinite(percentage) ? percentage : 0;
  if (pct < 50) return "destructive";
  if (pct <= 70) return "warning";
  return "success";
}

interface ScoreToneClasses {
  text: string;
  bg: string;
  border: string;
  progressIndicator: string;
  progressTrack: string;
}

const TONE_CLASSES: Record<ScoreTone, ScoreToneClasses> = {
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    progressIndicator: "bg-destructive",
    progressTrack: "bg-destructive/15",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    progressIndicator: "bg-warning",
    progressTrack: "bg-warning/15",
  },
  success: {
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    progressIndicator: "bg-success",
    progressTrack: "bg-success/15",
  },
};

export function getScoreToneClasses(percentage: number | null | undefined): ScoreToneClasses {
  return TONE_CLASSES[getScoreTone(percentage)];
}

/**
 * Faizi təhlükəsiz şəkildə göstərmək üçün formatlayır — `null`/`undefined`/
 * `NaN` hallarında "—" qaytarır, mənasız "NaN%" göstərmir (Mərhələ 8 tələbi).
 */
export function formatPercentage(percentage: number | null | undefined): string {
  if (typeof percentage !== "number" || !Number.isFinite(percentage)) return "—";
  const clamped = Math.max(0, Math.min(100, percentage));
  return `${Math.round(clamped)}%`;
}

/** Faizi 0-100 aralığına təhlükəsiz şəkildə sıxışdırır (progress bar üçün). */
export function clampPercentage(percentage: number | null | undefined): number {
  if (typeof percentage !== "number" || !Number.isFinite(percentage)) return 0;
  return Math.max(0, Math.min(100, percentage));
}
