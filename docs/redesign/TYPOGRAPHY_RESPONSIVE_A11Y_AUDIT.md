# Typography, responsive layout and accessibility remediation

Run date: 2026-09-19  
Baseline: `6825fc5f253a9068f2a01b12efb268e3cbb1ac13`

## Outcome

Prompt 16 removed every explicit 7–9px production font declaration found in `src/` (82 CSS/Tailwind occurrences), removed root-level horizontal overflow clipping, enlarged six undersized native icon controls, and added an automated regression guard.

The work changes presentation and accessibility only. No database, migration, RLS, Edge Function, Supabase configuration, authentication, query, realtime, storage or business-logic file changed.

## Remediation log

| Area | Files/selectors | Before | Remediation | Viewport | Evidence |
|---|---|---|---|---|---|
| Student home | `student-home.css` compact labels and metadata | 8–9px | 10–11px compact-label floor | 320–2560 | guard PASS |
| Journal | `journal-redesign.css`, `StudentJournalView.tsx` | 8–9px labels and values | 10–11px minimum | 320–2560 | guard PASS |
| Calendar/exams | `calendar-exams-redesign.css`, `exams-flow.css`, `exams-horizon-mobile.css`, `CalendarGrid.tsx` | 7–9px dates, events, tabs and metadata | 10–11px compact-label floor | 320–2560 | guard PASS |
| Chat/library | `chat-library-redesign.css`, chat/library components | 7–9px sender, time, category and resource metadata | 10–11px minimum; wrapping rules preserved | 320–2560 | guard PASS |
| Office/notifications | `office-notifications-redesign.css` | 7–9px service, file, notification and filter metadata | 10–11px minimum | 320–2560 | guard PASS |
| Settings | profile, security, appearance, help, menu and transcript CSS | 7–9px eyebrow, status and compact metadata | 10–11px minimum | 320–2560 | guard PASS |
| Role workspaces | tutor/admin/course components | 9px badges and metrics | 11px minimum | 320–2560 | guard PASS |
| Root overflow | `mobile-native.css` `html, body, #root` | `min-width: 320px` plus `overflow-x: hidden` masked defects and could overflow at zoom | root min-width reset to zero; global clipping removed; component min-width containment retained | mobile / 200% zoom contract | guard PASS |
| Touch targets | security modal, avatar crop, syllabus clear, course-student remove, PWA close, admin-log icon | 32–36px native buttons | 44×44px controls | touch/mobile | guard PASS |
| Regression protection | `prompt16-responsive-a11y-guard.mjs` | no dedicated gate | rejects sub-10px text, root overflow clipping and undersized native icon buttons; checks contextual hero inventory | CI/local | guard PASS |

## Typography contract after remediation

- Body, form labels and ordinary button text continue to use the design-system 12–16px scale.
- Compact uppercase metadata has a hard floor of 10px.
- Previously explicit 9px metadata is now 11px.
- No explicit 7px, 8px or 9px CSS/Tailwind production text remains.
- Existing responsive wrapping, line clamping and semantic title attributes were preserved; no data field or action was removed to gain space.

## Data density and mobile behavior

The existing data-heavy implementations already use the intended split:

- desktop semantic tables with scoped horizontal containers where columns must remain tabular;
- mobile card/list representations in teacher, tutor and exam workspaces;
- mobile calendar cells with selected-day detail outside the compact month grid;
- chat list/thread as separate mobile states with `100dvh`;
- fixed-bottom-nav clearance and safe-area variables in the mobile shell.

This remediation does not replace table semantics with decorative cards on desktop and does not add global clipping. Existing data/query behavior is unchanged.

## Automated guard

Run:

```bash
npm run qa:responsive-a11y
```

The guard walks CSS, TS and TSX source and fails on:

- explicit production text below 10px;
- Tailwind arbitrary text below 10px;
- `html`, `body`, `:root` or `#root` horizontal clipping;
- native icon buttons explicitly sized below 40px;
- missing contextual hero assets.

The guard supplements rather than replaces rendered browser and assistive-technology testing.

## Validation

| Validation | Result |
|---|---|
| Prompt 16 responsive/accessibility guard | PASS |
| Prompt 11 static visual/accessibility guard | PASS |
| Production build and tutor typecheck | PASS |
| Existing automated test suite | PASS — 72/72 |
| New/updated QA scripts lint | PASS |
| Touched legacy TSX lint comparison | No regression — baseline 422 errors, current 422 errors |
| Full repository lint | Existing debt — 6,532 findings (6,520 errors, 12 warnings) |

The touched legacy-component lint findings are pre-existing formatting debt: the exact same file set reports 422 errors before and after this remediation. No bulk formatting or unrelated refactor was applied.

## Browser acceptance boundary

Real authenticated 320×568, landscape-mobile, virtual-keyboard, 200% zoom, focus-trap and screen-reader verification remains **BLOCKED** for the same recorded Prompt 15 reasons: the managed browser cannot reach the local preview, the repository has no externally reachable preview URL or safe QA identity, and reference fixtures are unavailable.

No rendered PASS is claimed for those cases. Final acceptance requires the authenticated capture procedure in `docs/redesign/visual-qa/README.md`.
