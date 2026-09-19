# Prompt 15 visual-regression runbook

## Outcome

The 2026-09-19 run established the complete capture matrix and attempted a real Chrome CDP session. The browser session started, but navigation to the local Vite preview was rejected with `net::ERR_BLOCKED_BY_CLIENT`. The repository contains no public preview URL, safe test credentials/session fixture, or named reference-image fixtures. All 240 authenticated captures therefore remain `BLOCKED`.

This is intentionally not recorded as a visual pass. Build, unit and static-contract results are tracked separately from rendered acceptance.

## Required routes

| Group | Routes |
|---|---|
| Primary | `/ev`, `/elektron-jurnal`, `/teqvim`, `/imtahanlar`, `/sohbet`, `/kitabxana`, `/ofis`, `/bildirisler` |
| Menu | `/menyu`, `/menyu/transkript`, `/menyu/profil`, `/menyu/tehlukesizlik`, `/menyu/bildiris`, `/menyu/gorunus`, `/menyu/yardim` |

## Viewport matrix

| Class | Viewports |
|---|---|
| Desktop | 2560×1440, 1920×1080, 1536×864, 1440×900, 1366×768, 1280×800 |
| Tablet | 1024×1366, 820×1180, 768×1024 |
| Mobile | 430×932, 412×915, 393×873, 390×844, 375×812, 360×800, 320×568 |

## Screenshot naming

Use `docs/redesign/visual-qa/screenshots/<route-key>--<width>x<height>.png`. For example, `/menyu/profil` at 390×844 becomes `menyu-profil--390x844.png`. Reference images should be stored under `references/` with the same route key and documented provenance.

## Capture procedure

1. Build and serve the exact commit on an externally reachable preview URL.
2. Authenticate using a dedicated non-production QA identity through the normal sign-in flow. Never embed credentials or session tokens in the repository.
3. Load production-like, privacy-safe fixture data.
4. Capture every route at every exact viewport in `manifest.json`.
5. Record final URL, screenshot path, page and nested overflow, clipped controls, fixed-element overlap, touch-target failures, hero crop/collision and reference-diff result.
6. Fix the smallest responsible component or route-scoped style. Do not conceal defects with global overflow clipping.
7. Re-run build, tests, static QA and the complete affected viewport set.

## Acceptance rules

- `PASS` requires a real rendered capture and completed measurements.
- `BLOCKED` requires a concrete blocker and no visual-pass claim.
- `FAIL` requires an issue identifier and reproducible route/viewport.
- A static source contract can pass while rendered acceptance remains blocked.
- The 1536×864 reference comparison is mandatory for each mapped route once fixtures exist.
