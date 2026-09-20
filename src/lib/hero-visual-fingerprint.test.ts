import { describe, expect, test } from "bun:test";

import {
  compareHeroVisualFingerprints,
  type HeroVisualFingerprint,
} from "./hero-visual-fingerprint";

function rect(width = 320): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    width,
    height: 244,
    top: 0,
    right: width,
    bottom: 244,
    left: 0,
    toJSON: () => ({}),
  };
}

function fingerprint(): HeroVisualFingerprint {
  return {
    rect: rect(),
    width: "320px",
    height: "244px",
    minHeight: "244px",
    backgroundImage: 'url("/assets/calendar-hero.webp")',
    backgroundPosition: "50% 50%",
    backgroundSize: "cover",
    overflow: "hidden",
    borderRadius: "20px",
    copyRect: rect(160),
    copyTop: "122px",
    copyLeft: "24px",
    copyRight: "136px",
    copyWidth: "160px",
    copyMaxWidth: "none",
    copyTransform: "matrix(1, 0, 0, 1, 0, -60)",
    titleRect: rect(160),
    titleFontFamily: "Fraunces, Georgia, serif",
    titleFontSize: "40px",
    titleFontWeight: "650",
    titleLineHeight: "39.2px",
    titleLetterSpacing: "-1.4px",
    subtitleRect: rect(160),
    subtitleFontSize: "14px",
    subtitleLineHeight: "20.3px",
    subtitleWidth: "160px",
    shadeBackground: "linear-gradient(90deg, rgb(255, 255, 255), transparent)",
    quoteDisplay: "none",
    markDisplay: "none",
  };
}

describe("hero visual fingerprint", () => {
  test("accepts an unchanged hero while the old DOM remains mounted", () => {
    const initial = fingerprint();
    expect(compareHeroVisualFingerprints(initial, { ...initial })).toEqual([]);
  });

  test("reports transition-time typography, crop, and geometry changes", () => {
    const initial = fingerprint();
    const current = {
      ...initial,
      rect: rect(300),
      backgroundPosition: "71% 52%",
      titleFontSize: "28.8px",
      copyTop: "20px",
    };

    expect(compareHeroVisualFingerprints(initial, current).map(({ property }) => property)).toEqual(
      expect.arrayContaining(["rect.width", "backgroundPosition", "titleFontSize", "copyTop"]),
    );
  });
});
