# ATU Portal Redesign 02 — Performance QA

## Build status

Production build: **PASS**.

The Vite/Nitro build completes successfully and produces deployable output.

## Asset checks

Prompt 11 statically checks the contextual reference hero assets and fails if any required hero exceeds 200 KB.

It also reports one inherited asset warning:

- `src/assets/login-illustration.png`: 1,531,443 bytes

This asset is outside the ten Prompt 11 reference-page hero contract but remains a useful optimization candidate.

## Runtime-oriented design checks

The redesign avoids:

- decorative large parallax behavior
- infinite decorative pulse/bounce motion in the audited redesign CSS
- JavaScript animation libraries added solely for the redesign

The motion system relies primarily on transform/opacity and CSS transitions, with reduced-motion handling.

Below-the-fold imagery introduced by resource/card components uses lazy-loading where those components already support it; contextual SVG heroes are lightweight.

## Build output observations

The server bundle contains heavy existing libraries, including:

- `pdfjs-dist` server library around 757 kB before gzip
- `xlsx-js-style` server library around 1.07 MB before gzip

These are existing functional dependencies, not Prompt 11 regressions. Removing or code-splitting them would be a separate functional/performance project and is outside this QA-only scope.

## LCP / CLS

CI did not run Lighthouse/Web Vitals against an authenticated production-like route, so no fabricated LCP/CLS numbers are recorded.

Recommended staging verification:

- capture LCP on `/ev` and the heaviest contextual-hero pages
- verify explicit image aspect ratios/dimensions in the rendered route
- inspect network duplication for hero assets
- inspect layout shift during user/profile and dashboard query hydration
