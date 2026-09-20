export type HeroVisualFingerprint = {
  rect: DOMRectReadOnly;
  width: string;
  height: string;
  minHeight: string;
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
  overflow: string;
  borderRadius: string;
  copyRect: DOMRectReadOnly;
  copyTop: string;
  copyLeft: string;
  copyRight: string;
  copyWidth: string;
  copyMaxWidth: string;
  copyTransform: string;
  titleRect: DOMRectReadOnly;
  titleFontFamily: string;
  titleFontSize: string;
  titleFontWeight: string;
  titleLineHeight: string;
  titleLetterSpacing: string;
  subtitleRect: DOMRectReadOnly;
  subtitleFontSize: string;
  subtitleLineHeight: string;
  subtitleWidth: string;
  shadeBackground: string;
  quoteDisplay: string;
  markDisplay: string;
};

export type HeroVisualFingerprintTargets = {
  copy: HTMLElement;
  title: HTMLElement;
  subtitle: HTMLElement;
  shade: HTMLElement;
  quote?: HTMLElement | null;
  mark?: HTMLElement | null;
};

export type HeroFingerprintDifference = {
  property: string;
  initial: number | string;
  current: number | string;
};

const rectKeys = ["x", "y", "width", "height", "top", "right", "bottom", "left"] as const;

export function captureHeroVisualFingerprint(
  hero: HTMLElement,
  targets: HeroVisualFingerprintTargets,
): HeroVisualFingerprint {
  const heroStyle = getComputedStyle(hero);
  const copyStyle = getComputedStyle(targets.copy);
  const titleStyle = getComputedStyle(targets.title);
  const subtitleStyle = getComputedStyle(targets.subtitle);

  return {
    rect: hero.getBoundingClientRect(),
    width: heroStyle.width,
    height: heroStyle.height,
    minHeight: heroStyle.minHeight,
    backgroundImage: heroStyle.backgroundImage,
    backgroundPosition: heroStyle.backgroundPosition,
    backgroundSize: heroStyle.backgroundSize,
    overflow: heroStyle.overflow,
    borderRadius: heroStyle.borderRadius,
    copyRect: targets.copy.getBoundingClientRect(),
    copyTop: copyStyle.top,
    copyLeft: copyStyle.left,
    copyRight: copyStyle.right,
    copyWidth: copyStyle.width,
    copyMaxWidth: copyStyle.maxWidth,
    copyTransform: copyStyle.transform,
    titleRect: targets.title.getBoundingClientRect(),
    titleFontFamily: titleStyle.fontFamily,
    titleFontSize: titleStyle.fontSize,
    titleFontWeight: titleStyle.fontWeight,
    titleLineHeight: titleStyle.lineHeight,
    titleLetterSpacing: titleStyle.letterSpacing,
    subtitleRect: targets.subtitle.getBoundingClientRect(),
    subtitleFontSize: subtitleStyle.fontSize,
    subtitleLineHeight: subtitleStyle.lineHeight,
    subtitleWidth: subtitleStyle.width,
    shadeBackground: getComputedStyle(targets.shade).backgroundImage,
    quoteDisplay: targets.quote ? getComputedStyle(targets.quote).display : "absent",
    markDisplay: targets.mark ? getComputedStyle(targets.mark).display : "absent",
  };
}

export function compareHeroVisualFingerprints(
  initial: HeroVisualFingerprint,
  current: HeroVisualFingerprint,
  geometryTolerance = 0.5,
): HeroFingerprintDifference[] {
  const differences: HeroFingerprintDifference[] = [];
  const compareRect = (property: string, a: DOMRectReadOnly, b: DOMRectReadOnly) => {
    for (const key of rectKeys) {
      if (Math.abs(a[key] - b[key]) > geometryTolerance) {
        differences.push({ property: `${property}.${key}`, initial: a[key], current: b[key] });
      }
    }
  };

  compareRect("rect", initial.rect, current.rect);
  compareRect("copyRect", initial.copyRect, current.copyRect);
  compareRect("titleRect", initial.titleRect, current.titleRect);
  compareRect("subtitleRect", initial.subtitleRect, current.subtitleRect);

  const styleKeys = [
    "width",
    "height",
    "minHeight",
    "backgroundImage",
    "backgroundPosition",
    "backgroundSize",
    "overflow",
    "borderRadius",
    "copyTop",
    "copyLeft",
    "copyRight",
    "copyWidth",
    "copyMaxWidth",
    "copyTransform",
    "titleFontFamily",
    "titleFontSize",
    "titleFontWeight",
    "titleLineHeight",
    "titleLetterSpacing",
    "subtitleFontSize",
    "subtitleLineHeight",
    "subtitleWidth",
    "shadeBackground",
    "quoteDisplay",
    "markDisplay",
  ] as const;

  for (const key of styleKeys) {
    if (initial[key] !== current[key]) {
      differences.push({ property: key, initial: initial[key], current: current[key] });
    }
  }

  return differences;
}

export async function observeHeroFingerprintUntilDetached(
  hero: HTMLElement,
  targets: HeroVisualFingerprintTargets,
  initial = captureHeroVisualFingerprint(hero, targets),
): Promise<HeroFingerprintDifference[]> {
  const differences: HeroFingerprintDifference[] = [];

  while (hero.isConnected) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (!hero.isConnected) break;
    differences.push(
      ...compareHeroVisualFingerprints(initial, captureHeroVisualFingerprint(hero, targets)),
    );
    if (differences.length > 0) break;
  }

  return differences;
}
