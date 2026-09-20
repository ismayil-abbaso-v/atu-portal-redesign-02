import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const failures = [];
const sourceFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if ([".css", ".ts", ".tsx"].includes(extname(entry.name))) sourceFiles.push(path);
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function fail(path, source, index, message) {
  failures.push(`${relative(root, path)}:${lineOf(source, index)} — ${message}`);
}

walk(sourceRoot);

for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");

  for (const match of source.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)) {
    if (Number(match[1]) < 10) fail(path, source, match.index, `production font is ${match[1]}px`);
  }
  for (const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
    if (Number(match[1]) < 10)
      fail(path, source, match.index, `Tailwind production font is ${match[1]}px`);
  }

  if (extname(path) === ".css") {
    for (const match of source.matchAll(
      /(?:^|})\s*(html|body|:root|#root)(?:\s*,[^{}]+)?\s*\{([^}]*)\}/gms,
    )) {
      if (/overflow-x:\s*(hidden|clip)/i.test(match[2])) {
        fail(path, source, match.index, "root-level horizontal overflow clipping is forbidden");
      }
    }
  }

  if (extname(path) === ".tsx") {
    for (const match of source.matchAll(
      /<button\b[^>]*className=(?:"([^"]*)"|\{[^}]*"([^"]*)"[^}]*\})[^>]*>/gms,
    )) {
      const classes = `${match[1] ?? ""} ${match[2] ?? ""}`;
      if (/\bsize-(?:8|9)\b|\b(?:size|h|w)-\[(?:[1-9]|[12]\d|3\d)px\]/.test(classes)) {
        fail(path, source, match.index, "interactive control is smaller than 40px");
      }
    }
  }
}

const heroAssets = [
  "student-home-hero.webp",
  "electronic-journal-hero.webp",
  "calendar-hero.webp",
  "exams-hero.webp",
  "chat-hero.webp",
  "library-hero.webp",
  "office-hero.webp",
  "notifications-hero.webp",
  "menu-settings-hero.webp",
  "profile-settings-hero.webp",
  "security-settings-hero.webp",
  "notification-settings-hero.webp",
  "appearance-settings-hero.webp",
  "help-settings-hero.webp",
  "transcript-hero.webp",
];
for (const asset of heroAssets) {
  if (!existsSync(join(sourceRoot, "assets", asset)))
    failures.push(`src/assets/${asset} — contextual hero is missing`);
}

/* Code-split page CSS must not reintroduce the old hero after navigation. */
const legacyHeroContracts = [
  ["src/student-home.css", ["student-home-hero-in"]],
  ["src/journal-redesign.css", ["journal-hero-in"]],
  [
    "src/calendar-exams-redesign.css",
    ["p5hero", "p5copy", ".calendar-redesign-hero:after", ".exam-reference-hero:after"],
  ],
  [
    "src/chat-library-redesign.css",
    ["p6HeroIn", "p6CopyIn", ".chat-redesign-hero:after", ".library-reference-hero:after"],
  ],
  [
    "src/office-notifications-redesign.css",
    ["p7HeroIn", "p7CopyIn", ".office-reference-hero:after", ".notification-reference-hero:after"],
  ],
  ["src/settings-redesign.css", ["p8HeroIn", "p8CopyIn", ".settings-page-hero__geometry"]],
];
for (const [relativePath, forbiddenTokens] of legacyHeroContracts) {
  const legacySource = readFileSync(join(root, relativePath), "utf8");
  for (const token of forbiddenTokens) {
    if (legacySource.includes(token)) {
      failures.push(`${relativePath} — code-split legacy hero token returned: ${token}`);
    }
  }
}

/* Phone hero visuals must be owned by mounted hero classes/variants. */
const mobileHeroContractPath = join(sourceRoot, "mobile-hero-stability.css");
const mobileHeroContract = readFileSync(mobileHeroContractPath, "utf8");
if (mobileHeroContract.includes("[data-route")) {
  failures.push(
    "src/mobile-hero-stability.css — mobile hero visuals depend on mutable shell data-route",
  );
}
if (mobileHeroContract.includes("!important")) {
  failures.push(
    "src/mobile-hero-stability.css — mobile stability contract must not use !important",
  );
}
for (const selector of [
  ".student-home-hero",
  ".journal-redesign-hero",
  ".calendar-redesign-hero",
  ".exam-reference-hero",
  ".chat-redesign-hero",
  ".library-reference-hero",
  ".office-reference-hero",
  ".notification-reference-hero",
  ".settings-page-hero",
  ".transcript-page-header",
]) {
  if (!mobileHeroContract.includes(selector)) {
    failures.push(`src/mobile-hero-stability.css — missing stable selector ${selector}`);
  }
}
if (!/@media\s*\(max-width:\s*767px\)/.test(mobileHeroContract)) {
  failures.push("src/mobile-hero-stability.css — phone viewport guard is missing");
}
if (!/@container\s+portal-content\s*\(max-width:\s*640px\)/.test(mobileHeroContract)) {
  failures.push("src/mobile-hero-stability.css — portal-content container guard is missing");
}

const settingsHeroSource = readFileSync(
  join(sourceRoot, "components", "menu", "SettingsPageHero.tsx"),
  "utf8",
);
if (!settingsHeroSource.includes("data-hero-variant={variant}")) {
  failures.push("src/components/menu/SettingsPageHero.tsx — stable mounted variant is missing");
}

if (failures.length) {
  console.error("Prompt 16 responsive/accessibility guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Prompt 16 guard passed: ${sourceFiles.length} source files, no sub-10px production text, no root overflow clipping, no undersized native icon controls, and ${heroAssets.length} contextual heroes present.`,
);
