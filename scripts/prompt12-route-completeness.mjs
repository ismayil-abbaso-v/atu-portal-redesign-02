import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const SOURCE_HEAD = "1d00870523497d272ee5490a286e12fa93e03a38";
const expectedFiles = [
  "src/routes/_authenticated/admin/dersler.$courseId.tsx",
  "src/routes/_authenticated/admin/dersler.tsx",
  "src/routes/_authenticated/admin/elanlar.tsx",
  "src/routes/_authenticated/admin/index.tsx",
  "src/routes/_authenticated/admin/istifadeciler.tsx",
  "src/routes/_authenticated/admin/kitabxana.tsx",
  "src/routes/_authenticated/admin/loqlar.tsx",
  "src/routes/_authenticated/admin/qruplar.tsx",
  "src/routes/_authenticated/admin/qruplar_.$groupId.tsx",
  "src/routes/_authenticated/admin/tenzimlemeler.tsx",
  "src/routes/_authenticated/bildirisler.tsx",
  "src/routes/_authenticated/elanlar.tsx",
  "src/routes/_authenticated/elektron-jurnal.tsx",
  "src/routes/_authenticated/ev.tsx",
  "src/routes/_authenticated/fakulte-icmali.tsx",
  "src/routes/_authenticated/fennler_.$courseId.tsx",
  "src/routes/_authenticated/imtahanlar.tsx",
  "src/routes/_authenticated/kitabxana.tsx",
  "src/routes/_authenticated/menyu/bildiris.tsx",
  "src/routes/_authenticated/menyu/gorunus.tsx",
  "src/routes/_authenticated/menyu/index.tsx",
  "src/routes/_authenticated/menyu/profil.tsx",
  "src/routes/_authenticated/menyu/tehlukesizlik.tsx",
  "src/routes/_authenticated/menyu/transkript.tsx",
  "src/routes/_authenticated/menyu/yardim.tsx",
  "src/routes/_authenticated/muellim_.$groupId.$courseId.tsx",
  "src/routes/_authenticated/ofis.tsx",
  "src/routes/_authenticated/qruplar.tsx",
  "src/routes/_authenticated/qruplar_.$groupId.tsx",
  "src/routes/_authenticated/sohbet.tsx",
  "src/routes/_authenticated/teqvim.tsx",
  "src/routes/_authenticated/tyutor-paneli.tsx",
  "src/routes/_authenticated/tyutor_.$groupId.tsx",
  "src/routes/index.tsx"
];
const expectedUrls = [
  "/",
  "/admin",
  "/admin/dersler",
  "/admin/dersler/$courseId",
  "/admin/elanlar",
  "/admin/istifadeciler",
  "/admin/kitabxana",
  "/admin/loqlar",
  "/admin/qruplar",
  "/admin/qruplar/$groupId",
  "/admin/tenzimlemeler",
  "/bildirisler",
  "/elanlar",
  "/elektron-jurnal",
  "/ev",
  "/fakulte-icmali",
  "/fennler/$courseId",
  "/imtahanlar",
  "/kitabxana",
  "/menyu",
  "/menyu/bildiris",
  "/menyu/gorunus",
  "/menyu/profil",
  "/menyu/tehlukesizlik",
  "/menyu/transkript",
  "/menyu/yardim",
  "/muellim/$groupId/$courseId",
  "/ofis",
  "/qruplar",
  "/qruplar/$groupId",
  "/sohbet",
  "/teqvim",
  "/tyutor-paneli",
  "/tyutor/$groupId"
];
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(relative(root, abs).replaceAll("\\", "/"));
  }
  return out;
}

const actualUserRouteFiles = walk(join(root, "src/routes"))
  .filter((path) => path.endsWith(".tsx"))
  .filter((path) => !path.endsWith("/route.tsx"))
  .filter((path) => path !== "src/routes/__root.tsx")
  .sort();

assert(JSON.stringify(actualUserRouteFiles) === JSON.stringify(expectedFiles),
  `User-facing route file parity changed from audited source ${SOURCE_HEAD}.\nExpected: ${expectedFiles.join(", ")}\nActual: ${actualUserRouteFiles.join(", ")}`);

for (const path of expectedFiles) assert(existsSync(join(root, path)), `Missing user-facing route file: ${path}`);
for (const path of ["src/routes/api/public/auth-username-login.ts","src/routes/api/public/receive-exam-result.ts"])
  assert(existsSync(join(root, path)), `Missing locked public API route: ${path}`);

const routeTree = readFileSync(join(root, "src/routeTree.gen.ts"), "utf8");
for (const url of expectedUrls) assert(routeTree.includes("'" + url + "'"), `Generated route tree is missing URL: ${url}`);

const layout = readFileSync(join(root, "src/routes/_authenticated/route.tsx"), "utf8");
const coverageSignals = [
  ["/admin", "role-workspace-admin"],
  ["/qruplar", "role-workspace-groups"],
  ["/fakulte-icmali", "role-workspace-faculty"],
  ["/fennler/", "role-workspace-course"],
  ["/muellim/", "role-workspace-teacher"],
  ["/tyutor-paneli", "role-workspace-tutor"],
  ["/elanlar", "role-workspace-announcements"],
];
for (const [path, klass] of coverageSignals) {
  assert(layout.includes(path), `Authenticated shell lacks route coverage signal for ${path}`);
  assert(layout.includes(klass), `Authenticated shell lacks redesign wrapper ${klass}`);
}
for (const key of ["page.journal","page.announcements","page.course","page.teacherWorkspace","page.tutorWorkspace"])
  assert(layout.includes(key), `Route metadata mapping missing ${key}`);

const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
for (const key of ["page.journal","page.announcements","page.course","page.teacherWorkspace","page.tutorWorkspace"]) {
  const count = i18n.split(`"${key}"`).length - 1;
  assert(count >= 4, `Expected AZ/TR/EN/RU translations for ${key}; found ${count}`);
}

const rootRoute = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");
assert(rootRoute.includes("notFoundComponent: NotFoundComponent"), "Root 404 boundary missing");
assert(rootRoute.includes("errorComponent: ErrorComponent"), "Root error boundary missing");
assert(rootRoute.includes("overflow-x: hidden"), "Root horizontal-overflow protection missing");

const mobile = readFileSync(join(root, "src/mobile-native.css"), "utf8");
for (const signal of ["env(safe-area-inset-top)","env(safe-area-inset-bottom)","100dvh"])
  assert(mobile.includes(signal), `Mobile contract missing ${signal}`);

const dynamicChecks = [
  ["src/routes/_authenticated/qruplar_.$groupId.tsx", ["canAccessGroup", "GroupDetailView"]],
  ["src/routes/_authenticated/fennler_.$courseId.tsx", ["courseQuery.isError", "EmptyState"]],
  ["src/routes/_authenticated/muellim_.$groupId.$courseId.tsx", ["canAccessTeacherCourse", "TeacherCourseWorkspace"]],
  ["src/routes/_authenticated/tyutor_.$groupId.tsx", ["canAccessGroup", "redirect"]],
  ["src/routes/_authenticated/admin/dersler.$courseId.tsx", ["EmptyState", "Fənn tapılmadı"]],
  ["src/routes/_authenticated/admin/qruplar_.$groupId.tsx", ["EmptyState", "qrup tapılmadı"]],
];
for (const [path, signals] of dynamicChecks) {
  const content = readFileSync(join(root, path), "utf8");
  for (const signal of signals) assert(content.includes(signal), `Dynamic route ${path} lacks ${signal} handling`);
}
const teacher = readFileSync(join(root, "src/components/teacher/TeacherCourseWorkspace.tsx"), "utf8");
assert(teacher.includes("isError || !data"), "Teacher dynamic workspace lacks explicit query error state");

for (const path of ["src/redesign-system.css","src/role-workspace-redesign.css","src/mobile-native.css","scripts/prompt11-static-qa.mjs"])
  assert(existsSync(join(root, path)), `Required redesign/QA contract missing: ${path}`);

if (failures.length) {
  console.error("Prompt 12 route completeness QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Prompt 12 route completeness passed: ${expectedUrls.length} user-facing URLs, exact source route-file parity, dynamic/error/access/mobile/design coverage verified.`);
