# ATU Portal Redesign 02 — Baseline Status

## Baseline identity

- Source repository: `ismayil-abbaso-v/Atu-portal`
- Source branch: `main`
- Source commit: `1d00870523497d272ee5490a286e12fa93e03a38`
- Target repository: `ismayil-abbaso-v/atu-portal-redesign-02`
- Target branch: `main`
- Baseline commit: `53cb47e6c20603682f00e114a1527a3ac7bd601d`
- Baseline commit message: `chore: seed atu portal redesign 02 baseline`

## Copied baseline

The source application was copied without redesign or framework changes. The baseline includes the functional application and its supporting project files, including:

- `src/`
- `public/`
- `supabase/`
- tests and documentation
- `package.json`, `package-lock.json`, and `bun.lock`
- TypeScript, Vite, ESLint, Prettier, Tailwind, and component configuration
- safe environment templates (`.env.example` and `env.example`)

The pre-existing Prompt 0 audit documents under `docs/redesign/` were preserved.

## Secret exclusions and backend safety

- `.env` was explicitly excluded and was not copied to the target.
- No secret value was added to the target repository.
- No Supabase migration was executed.
- No Edge Function was deployed.
- No remote Supabase project or backend data was changed.
- The source repository was treated as read-only and was not modified.

## Validation environment

- Node.js: `v24.19.0`
- npm: `11.9.0`
- Bun tests: `1.4.2` through an ephemeral `npx` runner
- Dependency installation: completed with `npm install --package-lock=false` so source parity and the copied lockfiles remained unchanged.

## Validation results

| Check | Result | Notes |
| --- | --- | --- |
| Dependency clean install | Known source issue | `npm ci` reports that `package.json` and `package-lock.json` are not synchronized: `eslint-plugin-react-hooks@6.1.1` does not match lockfile `5.2.0`, and `zod-validation-error@4.0.2` is missing from the lockfile. |
| Typecheck | Passed | `npm run typecheck` completed successfully. |
| Build | Passed | `npm run build` completed successfully, including its follow-up typecheck. |
| Tests | Passed | 72 passed, 0 failed across the eight files in the repository test script. |
| Lint | Known source issue | 6,821 errors and 13 warnings across 198 files. Of these, 6,736 errors and 3 warnings are marked fixable; the dominant failure is the existing Prettier formatting backlog. |

No validation failure was introduced by the source-to-target transfer: every included source blob was copied byte-for-byte, and the target-only audit/status documentation is additive.

## Existing warnings

The successful production build reports the following non-blocking warnings:

- `vite-tsconfig-paths` can be replaced by Vite's native `resolve.tsconfigPaths` support.
- `xlsx-js-style` imports `node:fs` and `node:stream`, which Vite externalizes for browser compatibility.
- Some production chunks exceed 500 kB after minification.
- `inlineDynamicImports` is ignored when code splitting is enabled.
- npm reports the inherited `http-proxy` environment configuration warning.
- Installed dependency warnings note deprecated/unmaintained versions of `tsconfck`, Recharts 2.x, and ESLint 9.x.

These warnings were documented rather than changed because Prompt 1 is limited to establishing a source-equivalent baseline and explicitly excludes redesign, framework migration, and unrelated refactoring.
