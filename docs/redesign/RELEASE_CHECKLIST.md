# ATU Portal Redesign 02 — Release Checklist

## Release scope

- Source reference: `ismayil-abbaso-v/Atu-portal@main` — **READ-ONLY**.
- Target: `ismayil-abbaso-v/atu-portal-redesign-02@main`.
- Prompt 13 is release-readiness/cleanup only. No new visual direction, backend schema, migration, RLS, Edge Function, storage contract, auth contract or business-rule redesign is introduced.
- Required release commit message: `chore: prepare atu portal redesign 02 for production`.

## Build and dependency checks

- [x] Deterministic clean install uses `npm ci` against the committed `package-lock.json`.
- [x] TypeScript gate: `npm run typecheck`.
- [x] Regression suite: `npm test`.
- [x] Production bundle: `npm run build`.
- [x] Vercel compatibility is validated with `VERCEL=1 npm run build` and Build Output API v3 artifacts.
- [x] Direct production dependency tree is checked with `npm ls --omit=dev --depth=0`.
- [x] `npm audit --omit=dev --audit-level=high` is executed and reported by CI; it is observational because dependency advisories can require separate product-level upgrade work.

## Lint/code quality

- [x] Prompt 13 touched runtime/audit files pass scoped ESLint.
- [x] Repository-wide lint is executed.
- [x] The inherited Prompt 12 baseline is gated at exactly **6548 problems (6536 errors, 12 warnings)** so Prompt 13 cannot silently add lint debt.
- [x] No debug `console.log`, `console.debug` or `debugger` statements are allowed in runtime source by the release audit.
- [x] Runtime code is scanned for hardcoded `localhost` / `127.0.0.1` development endpoints; the generated Lovable preview auth broker is the only allowed exception and its localhost origin is reachable only under Lovable dev-preview host guards.

Repository-wide lint debt is inherited and is not bulk-formatted in Prompt 13 because a repository-wide mechanical rewrite would violate the release-only/minimal-risk scope.

## Security and environment

- [x] No real `.env` file is tracked.
- [x] `.gitignore` blocks `.env` and `.env.*` while allowing the canonical `.env.example`.
- [x] `.env.example` documents public Supabase values and clearly separates the server-only service-role variable.
- [x] Release audit rejects `sb_secret_*` literals, private-key material and browser-exposed secret variable names in runtime source.
- [x] No service-role value is present in the environment example.
- [x] Existing publishable Supabase identifiers are treated as public client configuration, not secrets.
- [x] Public API proxy/auth behavior remains unchanged.

## Route completeness and built-runtime smoke

- [x] Prompt 12 route-completeness audit is re-run.
- [x] 34/34 user-facing route patterns remain represented.
- [x] Root 404/error boundaries remain present.
- [x] Built Nitro SSR handler smoke covers: `/`, `/ev`, `/elektron-jurnal`, `/teqvim`, `/imtahanlar`, `/sohbet`, `/kitabxana`, `/ofis`, `/bildirisler`, `/menyu`, `/admin`.
- [x] Authenticated routes may redirect when the smoke runner has no credentials; 404/5xx responses are release failures.
- [x] No test credential, auth bypass or production secret is introduced for smoke testing.

## Mobile / desktop / accessibility

- [x] Prompt 11 visual/mobile/accessibility static QA is re-run during the release workflow.
- [x] Safe-area top/bottom handling and `100dvh` contracts remain.
- [x] Horizontal overflow protection remains.
- [x] Current-route `aria-current`, closed-drawer focus isolation and Escape-close contracts remain.
- [x] Reduced-motion contract remains.
- [x] No Login/Sidebar/`/menyu` redesign is introduced in Prompt 13.

## Performance and assets

- [x] Contextual redesign hero assets remain under the Prompt 11 200 KB gate.
- [x] Static release audit fails any tracked static asset above 2 MB.
- [x] Above-the-fold login illustration is explicitly `loading="eager"`, `fetchPriority="high"` and async-decoded without changing the locked visual design.
- [x] The inherited login illustration is still approximately 1.53 MB and is reported as an optimization warning rather than replaced during the locked release pass.
- [x] Existing heavy functional dependencies such as PDF/Excel tooling are not removed without a feature-safe replacement.

## CSS / cleanup

- [x] Runtime CSS is scanned for obvious debug outline styles.
- [x] Existing `!important` usage is measured/reported rather than mass-rewritten at release time.
- [x] No prototype/playground/debug-page/scratch artifact may ship from production source.
- [x] No broad CSS consolidation or risky visual refactor is performed in Prompt 13.

## Deployment

- [x] `vercel.json` keeps `npm run build`.
- [x] Vite/Nitro keeps conditional Vercel preset handling.
- [x] No production execution path depends on a localhost/development endpoint. The generated Lovable preview broker keeps its isolated dev-editor localhost origin for preview compatibility.
- [x] Environment-variable names are documented in `.env.example`.
- [ ] Live Vercel deployment/runtime-log verification requires a connected Vercel project. The currently connected Vercel account exposes no projects, so this checklist does not claim a live deployment smoke test.

## Release decision

The release workflow is the final automated gate. A green `Prompt 13 production readiness` run means clean install, production audit, prior QA contracts, route completeness, dependency-tree validation, typecheck, lint-baseline protection, regression tests, built Nitro SSR route smoke and Vercel-compatible build all completed successfully.

Authenticated production-data E2E and a live Vercel deployment are not fabricated when credentials/project access are unavailable.

---

## Prompt 17 final release gate — 2026-09-19

Prompt 17 adds `scripts/prompt17-conformance-audit.mjs`, `npm run qa:prompt17` and `.github/workflows/prompt17-validation.yml`. The final gate composes the Prompt 11, 12, 13 and 16 checks with route coverage, contextual hero coverage, representative AZ/TR/EN/RU parity, root-width protection, remediation-period backend-lock protection, typecheck, regression tests, production build, built-SSR smoke and Vercel compatibility build.

Prompt 16 reduced inherited repository lint debt to **6532 problems (6520 errors, 12 warnings)**, so the older Prompt 13 baseline of 6548/6536 is superseded and its workflow gate is refreshed accordingly.

Live authenticated visual acceptance remains **BLOCKED**. A successful GitHub Vercel status is build/deployment-status evidence only; because the connected Vercel project list is empty and no safe authenticated preview/reference fixture is retrievable, Prompt 17 does not claim screenshots, pixel diffs, authenticated mutation E2E or measured Web Vitals.

The release is source/build-conformant when the Prompt 17 workflow is green; visual acceptance remains a separately documented blocker rather than a false PASS.
