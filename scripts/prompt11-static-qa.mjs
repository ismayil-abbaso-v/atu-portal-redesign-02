import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function text(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireIncludes(path, needle, label) {
  const source = text(path);
  if (!source.includes(needle))
    failures.push(`${label}: ${path} does not contain ${JSON.stringify(needle)}`);
}

const referenceRoutes = [
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
];

for (const route of referenceRoutes) {
  if (!existsSync(join(root, route))) failures.push(`Reference route missing: ${route}`);
}

const heroAssets = [
  "src/assets/student-home-hero.webp",
  "src/assets/electronic-journal-hero.webp",
  "src/assets/calendar-hero.webp",
  "src/assets/exams-hero.webp",
  "src/assets/chat-hero.webp",
  "src/assets/library-hero.webp",
  "src/assets/office-hero.webp",
  "src/assets/notifications-hero.webp",
  "src/assets/menu-settings-hero.webp",
  "src/assets/profile-settings-hero.webp",
  "src/assets/security-settings-hero.webp",
  "src/assets/notification-settings-hero.webp",
  "src/assets/appearance-settings-hero.webp",
  "src/assets/help-settings-hero.webp",
  "src/assets/transcript-hero.webp",
  "src/assets/student-innovation-lab.webp",
];

for (const asset of heroAssets) {
  const absolute = join(root, asset);
  if (!existsSync(absolute)) {
    failures.push(`Contextual visual missing: ${asset}`);
    continue;
  }
  const size = statSync(absolute).size;
  if (size > 200_000)
    failures.push(`Reference hero asset exceeds 200 KB: ${asset} (${size} bytes)`);
  if (/building|campus|university-building|atu-building/i.test(asset)) {
    failures.push(`Building-themed hero asset is not allowed on reference routes: ${asset}`);
  }
}

requireIncludes(
  "src/routes/_authenticated/route.tsx",
  "data-route={pathname}",
  "Route-scoped responsive QA",
);
requireIncludes("src/mobile-native.css", "env(safe-area-inset-top)", "Mobile safe-area QA");
requireIncludes("src/mobile-native.css", "env(safe-area-inset-bottom)", "Mobile safe-area QA");
requireIncludes("src/mobile-native.css", "100dvh", "Mobile viewport QA");
const mobileCss = text("src/mobile-native.css");
if (
  /html\s*,\s*\n?\s*body\s*,\s*\n?\s*#root\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/s.test(mobileCss)
) {
  failures.push("Horizontal-overflow QA: root-level clipping must not hide component overflow");
}
requireIncludes("src/styles.css", "@media (prefers-reduced-motion:reduce)", "Reduced-motion QA");
requireIncludes(
  "src/components/layout/MobileBottomNav.tsx",
  'aria-current={active ? "page" : undefined}',
  "Bottom-nav current-page semantics",
);
requireIncludes(
  "src/components/layout/Sidebar.tsx",
  'aria-current={aktiv ? "page" : undefined}',
  "Sidebar current-page semantics",
);
requireIncludes(
  "src/components/layout/Sidebar.tsx",
  "inert={!acıq}",
  "Closed drawer focus isolation",
);
requireIncludes(
  "src/components/layout/AppHeader.tsx",
  "inert={!open}",
  "Closed notification-panel focus isolation",
);
requireIncludes(
  "src/components/layout/AppHeader.tsx",
  "inert={!profileOpen}",
  "Closed profile-panel focus isolation",
);
requireIncludes(
  "src/components/layout/AppHeader.tsx",
  'event.key !== "Escape"',
  "Header Escape behavior",
);
requireIncludes(
  "src/routes/_authenticated/bildirisler.tsx",
  '<span className="sr-only">{unreadLabel}</span>',
  "Unread state non-color label",
);

for (const route of [
  "/ev",
  "/elektron-jurnal",
  "/teqvim",
  "/imtahanlar",
  "/sohbet",
  "/kitabxana",
  "/ofis",
  "/bildirisler",
]) {
  if (!mobileCss.includes(`[data-route="${route}"]`))
    failures.push(`Mobile route contract missing for ${route}`);
}
if (!mobileCss.includes('[data-route^="/menyu"]') && !mobileCss.includes('[data-route="/menyu"]')) {
  failures.push("Mobile route contract missing for /menyu family");
}

const loginIllustration = join(root, "src/assets/login-illustration.png");
if (existsSync(loginIllustration) && statSync(loginIllustration).size > 1_000_000) {
  warnings.push(
    `Large inherited login asset: src/assets/login-illustration.png (${statSync(loginIllustration).size} bytes).`,
  );
}

const cssFiles = [
  "src/styles.css",
  "src/redesign-system.css",
  "src/mobile-native.css",
  "src/calendar-exams-redesign.css",
  "src/chat-library-redesign.css",
  "src/office-notifications-redesign.css",
  "src/settings-redesign.css",
  "src/role-workspace-redesign.css",
];
for (const cssFile of cssFiles) {
  const source = text(cssFile);
  if (/\bparallax\b/i.test(source)) failures.push(`Large parallax behavior found in ${cssFile}`);
  if (/animation[^;]*(bounce|pulse)[^;]*infinite/i.test(source))
    failures.push(`Infinite decorative bounce/pulse found in ${cssFile}`);
}

for (const warning of warnings) console.warn(`QA warning: ${warning}`);
if (failures.length) {
  console.error("Prompt 11 static QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
const requiredDocs = [
  "docs/redesign/IMPLEMENTATION_SUMMARY.md",
  "docs/redesign/VISUAL_QA.md",
  "docs/redesign/MOBILE_QA.md",
  "docs/redesign/ACCESSIBILITY_QA.md",
  "docs/redesign/REGRESSION_QA.md",
  "docs/redesign/PERFORMANCE_QA.md",
];
for (const doc of requiredDocs) {
  if (!existsSync(join(root, doc))) failures.push(`Missing Prompt 11 QA documentation: ${doc}`);
}
if (failures.length) {
  console.error("Prompt 11 documentation QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  `Prompt 11 static QA passed: ${referenceRoutes.length} reference routes, ${heroAssets.length} contextual visual assets, responsive/accessibility contracts and QA documentation verified.`,
);
