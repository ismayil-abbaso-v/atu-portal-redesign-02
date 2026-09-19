# ATU Portal Redesign 02 — Prompt Conformance Matrix

Run date: 2026-09-19  
Prompt 17 parent: `4afa100ad5e0c347c24f37a32ffb564c4993fca2`  
Original remediation audit baseline: `6a555b741d613cf2e957e9efa2be740fcf4445ad`  
Read-only source reference: `ismayil-abbaso-v/Atu-portal@1d00870523497d272ee5490a286e12fa93e03a38`

## Status rules

- **PASS** means repository/build/static evidence supports the requirement.
- **BLOCKED** means the requirement needs a real authenticated browser, a reachable exact preview, or a reference fixture that is not available. BLOCKED is never converted to PASS from selectors or asset existence.
- **N/A** is used only where a rendered surface does not exist independently.
- No known critical requirement is recorded as PARTIAL or FAIL after the Prompt 17 remediation below.

## Prompt-by-prompt matrix

| Prompt | Requirement ID | Route/component | Requirement | Evidence file | Browser evidence | Desktop | Tablet | Mobile | Functional | Final status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | P0-AUDIT | repository | Audit source/target and lock backend | `SOURCE_AUDIT.md`, `BACKEND_LOCK.md` | N/A | N/A | N/A | N/A | PASS | **PASS** | Source remains read-only. |
| 1 | P1-BASELINE | repository | Preserve functional baseline without secrets | `BASELINE_STATUS.md`, release audit | N/A | N/A | N/A | N/A | PASS | **PASS** | No secret-bearing env file is introduced. |
| 2 | P2-SYSTEM | design system | Semantic burgundy/white tokens, typography and primitives | `src/redesign-system.css`, `src/styles.css` | BLOCKED for rendered comparison | PASS static | PASS static | PASS static | PASS | **PASS** | Design tokens and typography remain wired. |
| 3 | P3-SHELL | authenticated shell | Sidebar/header/content frame/mobile navigation | Prompt 11 QA + shell components | BLOCKED | PASS static | PASS static | PASS static | PASS | **BLOCKED** | Runtime visual acceptance needs authenticated screenshots. |
| 4 | P4-JOURNAL | journal + transcript | Real data/actions with redesigned presentation | `ROUTE_COMPLETENESS.md`, tests | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | No browser-only PASS is claimed. |
| 5 | P5-CALENDAR | `/teqvim`, `/imtahanlar` | Responsive calendar/exam workflows | Prompt 11/16 guards | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | Dynamic visual/interaction matrix needs safe auth. |
| 6 | P6-CHAT | `/sohbet`, `/kitabxana` | Preserve realtime/upload/search semantics | route completeness + tests | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | Keyboard/upload browser exercise is unavailable. |
| 7 | P7-OFFICE | `/ofis`, `/bildirisler` | Real service/file/notification behavior | route completeness + i18n/static QA | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | Authenticated mutations require browser evidence. |
| 8 | P8-MENU | `/menyu/**` | Profile/security/notification/appearance/transcript/help | route completeness + i18n | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | Security/auth mutations are not mocked. |
| 9 | P9-ROLES | admin/dean/teacher/tutor | Dense institutional workspace and preserved permissions | role workspace CSS + route audit | BLOCKED | PASS static | PASS static | PASS static | PASS automated | **BLOCKED** | Dense CRUD pages intentionally avoid decorative full heroes. |
| 10 | P10-MOBILE | shell + primary routes | Safe area, 100dvh, touch targets, no masked root overflow | `MOBILE_QA.md`, Prompt 16/17 guards | BLOCKED | N/A | BLOCKED | BLOCKED | PASS static | **BLOCKED** | Prompt 17 removes the remaining base `body min-width:320px`. |
| 11 | P11-QA | primary routes | Visual/accessibility/regression contract | `VISUAL_QA.md`, `ACCESSIBILITY_QA.md` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS automated | **BLOCKED** | Pixel comparison is still unavailable. |
| 12 | P12-ROUTES | route tree | All routes and safe error/empty/redirect states | `ROUTE_COMPLETENESS.md` | BLOCKED for authenticated render | PASS source | PASS source | PASS source | PASS automated | **PASS** | 34/34 source/build coverage is distinct from rendered acceptance. |
| 13 | P13-RELEASE | repository/release | Clean install, secret audit, lint-debt split, build/tests/smoke | `RELEASE_CHECKLIST.md`, workflow | No accessible live preview | N/A | N/A | N/A | PASS automated evidence | **PASS** | Prompt 17 refreshes the inherited lint baseline. |
| 14 | P14-IMAGES | contextual hero routes | Replace placeholder SVGs with professional WebP assets | `IMAGE_ASSET_AUDIT.md` | Crop screenshots BLOCKED | PASS asset | PASS asset | PASS asset | PASS static | **PASS** | All contextual heroes are local WebP and below 250 KB. |
| 15 | P15-BROWSER | 15 authenticated routes | Real screenshots/reference comparison/pixel correction | `VISUAL_QA.md`, visual manifest | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | **BLOCKED** | No reachable exact preview + safe QA identity/reference fixtures. |
| 16 | P16-A11Y | typography/data layouts | Remove tiny text and improve targets/root overflow | Prompt 16 audit + guard | Manual zoom/screen-reader BLOCKED | PASS static | PASS static | PASS static | PASS automated | **PASS** | Prompt 17 closes the residual base body-minimum inconsistency. |
| 17 | P17-FINAL | whole portal | Final image/content/i18n/performance/backend-lock conformance | this matrix + Prompt 17 guard/workflow | BLOCKED where browser-only | PASS static | PASS static | PASS static | PASS automated contract | **PASS** | Browser-only evidence remains explicitly BLOCKED. |

## Image coverage

| Route | Asset | Format / size | Static semantic status | Browser crop |
|---|---|---|---|---|
| `/ev` | `student-home-hero.webp` | WebP / 67,692 B | PASS | BLOCKED |
| `/elektron-jurnal` | `electronic-journal-hero.webp` | WebP / 47,948 B | PASS | BLOCKED |
| `/teqvim` | `calendar-hero.webp` | WebP / 43,034 B | PASS | BLOCKED |
| `/imtahanlar` | `exams-hero.webp` | WebP / 56,624 B | PASS | BLOCKED |
| `/sohbet` | `chat-hero.webp` | WebP / 43,850 B | PASS | BLOCKED |
| `/kitabxana` | `library-hero.webp` | WebP / 60,204 B | PASS | BLOCKED |
| `/ofis` | `office-hero.webp` | WebP / 46,368 B | PASS | BLOCKED |
| `/bildirisler` | `notifications-hero.webp` | WebP / 28,786 B | PASS | BLOCKED |
| `/menyu` | `menu-settings-hero.webp` | WebP / 36,412 B | PASS | BLOCKED |
| `/menyu/profil` | `profile-settings-hero.webp` | WebP / 36,862 B | PASS | BLOCKED |
| `/menyu/tehlukesizlik` | `security-settings-hero.webp` | WebP / 41,362 B | PASS | BLOCKED |
| `/menyu/bildiris` | `notification-settings-hero.webp` | WebP / 38,502 B | PASS | BLOCKED |
| `/menyu/gorunus` | `appearance-settings-hero.webp` | WebP / 37,882 B | PASS | BLOCKED |
| `/menyu/transkript` | `transcript-hero.webp` | WebP / 45,862 B | PASS | BLOCKED |
| `/menyu/yardim` | `help-settings-hero.webp` | WebP / 36,588 B | PASS | BLOCKED |

The twelve Prompt 14 placeholder SVGs are absent. Dense admin/teacher/tutor/dean routes retain compact institutional intros rather than checklist-driven photography.

## Final conclusions

- Required source/build route families remain present.
- Representative AZ/TR/EN/RU page/action/empty-state key parity is guarded.
- No production credential, auth bypass, fake server session or backend mutation is added.
- Prompt 17 rejects remediation changes under `supabase/`, `src/integrations/supabase/` and `src/server-functions/`.
- Runtime-only pixel comparison, virtual keyboard behavior, authenticated mutations, screen-reader traversal and measured LCP/CLS remain BLOCKED until a reachable exact preview, safe QA identity and reference fixtures exist.

There are **no known critical PARTIAL or FAIL rows** after the source-level correction. Outstanding items are explicit **BLOCKED browser evidence**.
