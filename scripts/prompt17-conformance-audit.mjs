import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const srcRoot = join(root, "src");
const failures = [];
const baseline = "6a555b741d613cf2e957e9efa2be740fcf4445ad";

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function walk(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, output);
    else output.push(path);
  }
  return output;
}

const requiredRoutes = [
  "src/routes/_authenticated/ev.tsx",
  "src/routes/_authenticated/elektron-jurnal.tsx",
  "src/routes/_authenticated/teqvim.tsx",
  "src/routes/_authenticated/imtahanlar.tsx",
  "src/routes/_authenticated/sohbet.tsx",
  "src/routes/_authenticated/kitabxana.tsx",
  "src/routes/_authenticated/ofis.tsx",
  "src/routes/_authenticated/bildirisler.tsx",
  "src/routes/_authenticated/menyu/index.tsx",
  "src/routes/_authenticated/menyu/transkript.tsx",
  "src/routes/_authenticated/menyu/profil.tsx",
  "src/routes/_authenticated/menyu/tehlukesizlik.tsx",
  "src/routes/_authenticated/menyu/bildiris.tsx",
  "src/routes/_authenticated/menyu/gorunus.tsx",
  "src/routes/_authenticated/menyu/yardim.tsx",
];

for (const route of requiredRoutes) {
  if (!existsSync(join(root, route))) fail(`${route} — required Prompt 17 route is missing`);
}

const contextualHeroes = [
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

const replacedPlaceholderHeroes = [
  "calendar-hero",
  "exams-hero",
  "chat-hero",
  "library-hero",
  "office-hero",
  "notifications-hero",
  "menu-settings-hero",
  "profile-settings-hero",
  "security-settings-hero",
  "notification-settings-hero",
  "appearance-settings-hero",
  "help-settings-hero",
];

const sourceText = walk(srcRoot)
  .filter((path) => [".css", ".ts", ".tsx"].includes(extname(path)))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

for (const hero of contextualHeroes) {
  const path = join(srcRoot, "assets", hero);
  if (!existsSync(path)) {
    fail(`src/assets/${hero} — contextual hero is missing`);
    continue;
  }
  const size = statSync(path).size;
  if (size > 250 * 1024) fail(`src/assets/${hero} — ${size} B exceeds 250 KB`);
  if (!sourceText.includes(hero)) fail(`src/assets/${hero} — asset is not referenced by source`);
}

for (const basename of replacedPlaceholderHeroes) {
  const legacy = join(srcRoot, "assets", `${basename}.svg`);
  if (existsSync(legacy)) fail(`${relative(root, legacy)} — legacy placeholder SVG still exists`);
  if (sourceText.includes(`${basename}.svg`)) {
    fail(`${basename}.svg — legacy placeholder SVG is still referenced`);
  }
}

const styles = read("src/styles.css");
if (/body\s*\{[^}]*min-width:\s*(?:[3-9]\d{2,}|\d{4,})px/i.test(styles)) {
  fail("src/styles.css — body keeps a fixed >=300px minimum width");
}

const requiredDocs = [
  "docs/redesign/PROMPT_CONFORMANCE_MATRIX.md",
  "docs/redesign/IMAGE_ASSET_AUDIT.md",
  "docs/redesign/VISUAL_QA.md",
  "docs/redesign/MOBILE_QA.md",
  "docs/redesign/ACCESSIBILITY_QA.md",
  "docs/redesign/PERFORMANCE_QA.md",
  "docs/redesign/ROUTE_COMPLETENESS.md",
  "docs/redesign/RELEASE_CHECKLIST.md",
  "docs/redesign/TYPOGRAPHY_RESPONSIVE_A11Y_AUDIT.md",
];
for (const path of requiredDocs) {
  if (!existsSync(join(root, path))) fail(`${path} — final QA evidence file is missing`);
}

const mainI18n = read("src/lib/i18n.tsx");
const extraI18n = read("src/lib/i18n-extra.ts");
for (const key of [
  "page.home",
  "page.calendar",
  "page.exams",
  "page.library",
  "page.office",
  "page.chat",
  "page.notifications",
  "page.profileSettings",
  "page.security",
  "page.notificationSettings",
  "page.appearance",
  "page.transcript",
  "page.help",
  "page.menu",
]) {
  const escaped = key.replace(".", "\\.");
  const matches = mainI18n.match(new RegExp(`"${escaped}"`, "g")) ?? [];
  if (matches.length < 4) fail(`src/lib/i18n.tsx — ${key} is not present for all four locales`);
}
for (const key of [
  "calendar.noEventsToday",
  "chat.empty",
  "chat.writeMessage",
  "library.noResults",
  "transcript.loading",
  "office.noFiles",
  "notifications.markRead",
  "common.retry",
]) {
  const escaped = key.replace(".", "\\.");
  const matches = extraI18n.match(new RegExp(`"${escaped}"`, "g")) ?? [];
  if (matches.length < 4) fail(`src/lib/i18n-extra.ts — ${key} is not present for all four locales`);
}

try {
  const changed = execFileSync("git", ["diff", "--name-only", `${baseline}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  const lockedPrefixes = ["supabase/", "src/integrations/supabase/", "src/server-functions/"];
  for (const path of changed) {
    if (lockedPrefixes.some((prefix) => path.startsWith(prefix))) {
      fail(`${path} — backend-lock path changed after remediation baseline`);
    }
    if (/^\.env(?:\.|$)/.test(path) && path !== ".env.example") {
      fail(`${path} — secret-bearing environment file changed`);
    }
  }
} catch (error) {
  fail(`backend-lock git diff could not be evaluated: ${error.message}`);
}

if (failures.length) {
  console.error("Prompt 17 conformance audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "Prompt 17 conformance audit passed: routes, contextual heroes, i18n parity, responsive root contract, evidence files and backend lock are intact.",
);
