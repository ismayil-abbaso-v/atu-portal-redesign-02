import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const read = (path) => readFileSync(join(root, path), "utf8");
const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .map((value) => value.trim())
  .filter(Boolean);

const trackedEnvFiles = trackedFiles.filter(
  (path) => /^\.env(?:\.|$)/.test(path) && path !== ".env.example",
);
assert(
  trackedEnvFiles.length === 0,
  `Tracked local environment files found: ${trackedEnvFiles.join(", ")}`,
);

const gitignore = read(".gitignore");
for (const rule of [".env", ".env.*", "!.env.example"]) {
  assert(gitignore.split("\n").includes(rule), `.gitignore is missing release security rule: ${rule}`);
}

const envExample = read(".env.example");
for (const key of [
  "VITE_SUPABASE_URL=",
  "VITE_SUPABASE_PUBLISHABLE_KEY=",
  "VITE_SUPABASE_PROJECT_ID=",
  "SUPABASE_URL=",
  "SUPABASE_PUBLISHABLE_KEY=",
  "SUPABASE_PROJECT_ID=",
  "SUPABASE_SERVICE_ROLE_KEY=",
]) {
  assert(envExample.includes(key), `.env.example is missing ${key}`);
}
assert(
  !/SUPABASE_SERVICE_ROLE_KEY=\S+/.test(envExample),
  ".env.example must never contain a service-role value",
);
assert(
  !/VITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN)/.test(envExample),
  ".env.example exposes a server secret through a VITE_ variable",
);

const runtimeFiles = trackedFiles.filter((path) => {
  if (path.startsWith("src/")) return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path);
  return ["vite.config.ts", "vercel.json"].includes(path);
});

const secretPatterns = [
  [/sb_secret_[A-Za-z0-9_-]{12,}/, "Supabase secret key literal"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key material"],
  [/VITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN)/, "browser-exposed secret variable"],
];

for (const path of runtimeFiles) {
  const source = read(path);
  for (const [pattern, label] of secretPatterns) {
    if (pattern.test(source)) failures.push(`${label} found in runtime source: ${path}`);
  }
  if (/\b(?:localhost|127\.0\.0\.1)\b/.test(source)) {
    const guardedPreviewBroker =
      path === "src/integrations/supabase/previewAuthStorage.ts" &&
      source.includes("lovableproject-dev.com") &&
      source.includes("localhost:3000");
    if (guardedPreviewBroker) {
      warnings.push(
        "Generated Lovable preview auth broker contains a localhost editor origin only inside its dev-preview guard.",
      );
    } else {
      failures.push(`Development-only host found in runtime source: ${path}`);
    }
  }
  if (/\bconsole\.(?:log|debug)\s*\(/.test(source)) {
    failures.push(`Debug console output found in runtime source: ${path}`);
  }
  if (/\bdebugger\s*;/.test(source)) {
    failures.push(`Debugger statement found in runtime source: ${path}`);
  }
}

const trackedPathsLower = trackedFiles.map((path) => path.toLowerCase());
for (const path of trackedPathsLower) {
  if (
    /(?:^|\/)(?:prototype|playground|debug-page|scratch)(?:\/|\.|$)/.test(path) &&
    !path.startsWith("docs/")
  ) {
    failures.push(`Debug/prototype artifact is tracked in production source: ${path}`);
  }
}

const viteConfig = read("vite.config.ts");
assert(viteConfig.includes('preset: "vercel"'), "Vite/Nitro Vercel preset is missing");
assert(viteConfig.includes('process.env["VERCEL"]'), "Vercel environment detection is missing");

const vercelConfig = JSON.parse(read("vercel.json"));
assert(vercelConfig.buildCommand === "npm run build", "vercel.json buildCommand must be npm run build");

const assetRoots = ["src/assets", "public"];
const assetFiles = [];
function walkAssets(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walkAssets(absolute);
    else assetFiles.push(absolute);
  }
}
for (const path of assetRoots) walkAssets(join(root, path));

for (const absolute of assetFiles) {
  const size = statSync(absolute).size;
  const path = relative(root, absolute).replaceAll("\\", "/");
  if (size > 2_000_000) failures.push(`Static asset exceeds 2 MB: ${path} (${size} bytes)`);
}

const loginAsset = join(root, "src/assets/login-illustration.png");
if (existsSync(loginAsset) && statSync(loginAsset).size > 1_000_000) {
  warnings.push(
    `Inherited locked login illustration remains large: ${statSync(loginAsset).size} bytes; visual replacement is outside Prompt 13.`,
  );
}

const loginRoute = read("src/routes/index.tsx");
assert(
  loginRoute.includes('fetchPriority="high"') && loginRoute.includes('loading="eager"'),
  "Above-the-fold login illustration should be explicitly prioritized",
);

const cssFiles = trackedFiles.filter((path) => extname(path) === ".css");
let importantCount = 0;
for (const path of cssFiles) {
  const source = read(path);
  importantCount += (source.match(/!important/g) ?? []).length;
  if (/outline\s*:\s*[^;}]*?(?:red|lime|magenta|fuchsia)/i.test(source)) {
    failures.push(`Debug outline found in CSS: ${path}`);
  }
}
if (importantCount > 250) {
  warnings.push(`CSS contains ${importantCount} !important declarations; retained to avoid risky release-stage redesign regressions.`);
}

for (const warning of warnings) console.warn(`Release audit warning: ${warning}`);

if (failures.length) {
  console.error("Prompt 13 production audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Prompt 13 production audit passed: ${trackedFiles.length} tracked files scanned; env/secret/debug/runtime-host/Vercel/asset contracts verified.`,
);
