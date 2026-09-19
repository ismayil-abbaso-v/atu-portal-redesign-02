# ATU Portal Redesign 02 — Redesign Execution Plan

## Starting point

Source repository: `ismayil-abbaso-v/Atu-portal@main`  
Audited HEAD: `1d00870523497d272ee5490a286e12fa93e03a38`  
Target repository: `ismayil-abbaso-v/atu-portal-redesign-02`

At Prompt 0 audit time, the target was empty. This phase writes documentation only. The actual code baseline transfer belongs to Prompt 1.

## Guiding strategy

The source is already a functional, role-aware production portal. Therefore the redesign strategy is:

**preserve behavior, replace presentation incrementally, validate continuously.**

Do not rebuild the portal from screenshots. Do not create a parallel fake dashboard. Do not detach pages from their Supabase data.

## Phase 1 — Safe baseline transfer

Prompt 1 should copy the functional codebase from source to target while excluding secrets.

Required:
- preserve exact stack
- copy source/application/config/test files
- exclude `.env`
- do not deploy migrations/functions
- record source commit SHA
- run build/typecheck/lint/tests in target
- establish a clean baseline before design work

No redesign in this phase.

## Phase 2 — Design system and shell

Before page-by-page redesign, establish one semantic visual foundation.

### Consolidate tokens

Create semantic tokens for:
- canvas
- surface
- elevated surface
- muted surface
- borders
- text/muted text
- primary/hover/active/soft
- positive/warning/negative/info
- motion timing/easing

Retain existing theme infrastructure rather than replacing it.

### Typography

Use the already-declared:
- Manrope
- Fraunces
- IBM Plex Mono

### Desktop shell

Change presentation toward:
- stable ~244–256px institutional sidebar
- top search/header
- 1500–1600px bounded content workspace
- one predictable content scroll

Preserve:
- role-dependent links
- notification count
- profile/avatar
- logout
- mobile drawer semantics

### Mobile shell

Add/standardize:
- fixed compact top bar
- safe-area-aware fixed bottom navigation
- left drawer
- body scroll lock
- Escape/backdrop close
- route-change close
- 44px+ touch targets

Do not duplicate navigation logic between desktop and mobile when a shared route model can drive both.

## Phase 3 — Student home

Apply `home.png` to the student branch of `/ev`.

Preserve role dispatch for admin/dean/teacher/tutor. Do not force those roles into the student visual.

Student home should bind reference cards to real profile/course/exam/calendar/chat/notification data. Where the mockup shows data the backend does not actually have, choose a truthful equivalent or explicit empty state rather than invented production values.

## Phase 4 — Journal and transcript

Redesign:
- `/elektron-jurnal`
- `/menyu/transkript`

Important: journal is role-aware. Student reference styling must not erase teacher/tutor workflows or grading security.

Tables should use the new visual system while preserving real columns/actions and responsive overflow behavior.

## Phase 5 — Calendar and exams

Redesign:
- `/teqvim`
- `/imtahanlar`

Calendar must preserve the existing multi-source event model and write permissions.

Exam view must preserve current role dispatch:
- student
- teacher
- tutor
- admin/dean

Mobile calendar requires a dedicated compact design rather than shrinking the full desktop month grid.

## Phase 6 — Chat and library

Redesign:
- `/sohbet`
- `/kitabxana`

Chat is high-risk because realtime, attachments and mobile scrolling/keyboard behavior are functional. Restyle existing message/group logic rather than replacing it.

Library should preserve search, categories, permissions and storage behavior.

## Phase 7 — Office and notifications

Redesign:
- `/ofis`
- `/bildirisler`

Office reference features must be mapped only to real services/actions.

Notification UI must preserve:
- realtime
- read state
- unread count
- routing metadata
- announcement semantics

## Phase 8 — Menu/settings suite

Redesign:
- `/menyu`
- profile
- security
- notification preferences
- appearance
- transcript
- help

Security is a functional system, not a decorative settings screen. MFA/session/password behavior is locked.

## Phase 9 — Remaining role routes

Extend the same design system to:
- admin
- dean/faculty
- groups
- course management
- teacher workspace
- tutor workspace
- announcements and other authenticated routes

Do not copy the decorative student hero into dense CRUD/management screens when it harms efficiency. Use compact institutional page intros there.

## Phase 10 — Dedicated mobile pass

After desktop page work, run a separate mobile pass across every main route.

Required viewport coverage:
- 320×568
- 360×800
- 375×812
- 390×844
- 393×873
- 412×915
- 430×932

Key mobile requirements:
- no horizontal body overflow
- no desktop-only route
- no microscopic tables/calendars
- keyboard-safe chat/forms
- correct safe-area insets
- single primary page scroll
- drawer/chat internal scroll only where intentional

## Phase 11 — Visual, accessibility and regression QA

Primary desktop comparison viewport: **1536×864**.

For every supplied reference page compare:
- sidebar width
- header height
- content origin
- hero height/crop
- title baseline
- typography
- grid proportions
- card dimensions
- right rail width
- spacing
- radius
- border/shadow
- icon scale
- table density
- burgundy tone

Run:
- build
- typecheck
- lint
- existing tests
- keyboard checks
- reduced-motion checks
- console/network smoke tests

## Phase 12 — Route completeness

Compare source and target route trees after redesign.

No route should remain accidentally on the old visual system merely because it was not in the ten supplied screenshots.

Dynamic route and error/empty/unauthorized states must also render safely.

## Phase 13 — Release readiness

Perform:
- secret scan
- dependency cleanup
- debug/dead-code cleanup
- image optimization review
- CSS override cleanup
- Vercel compatibility check
- clean install/build/test
- major-route smoke test

## CSS migration strategy

Because the source has 38 CSS files and multiple override chains, avoid a one-shot deletion.

Recommended sequence:

1. add semantic redesign tokens/primitives;
2. migrate shell;
3. migrate reference pages individually;
4. scope/retire route-specific legacy rules only when the migrated page no longer relies on them;
5. migrate role/admin pages;
6. use visual regression to detect leakage;
7. remove demonstrably unused override files at release-cleanup stage.

High-risk chains to treat explicitly:
- admin premium/header override family
- group premium/header override family
- notifications premium/refinement family
- library premium/refinements
- global generic element rules in `styles.css`
- inline layout style in authenticated parent

## Data-integrity strategy

For every redesigned component:

1. identify the existing query/hook/mutation;
2. keep the query key and data source stable unless a presentational adapter is required;
3. keep mutation payload/side effects stable;
4. preserve loading/error/empty paths;
5. preserve role guards;
6. preserve realtime subscriptions;
7. add only presentational derived data via memoization/view-model helpers;
8. never substitute screenshot sample values for missing backend fields.

## Hero asset strategy

Contextual imagery is required, but images must remain subordinate to the UI.

Rules:
- no repeated university-building hero
- no important baked text
- fixed aspect-ratio containers to avoid CLS
- responsive object positioning
- preload only the true LCP hero where justified
- lazy-load below-fold imagery
- compress appropriately
- keep HTML overlay copy localized

Home lower innovation banner must also use innovation/workspace imagery rather than a building.

## Motion strategy

Reuse/consolidate current motion foundations.

Target:
- 120ms fast
- 180ms standard
- 260ms medium
- 420ms slow
- `cubic-bezier(.22,1,.36,1)` premium ease

Prefer transform/opacity.

Avoid:
- infinite decorative pulse
- bounce
- large parallax
- layout-animating height/position where transform works
- animation that competes with exam/journal tasks

Respect `prefers-reduced-motion`.

## Accessibility strategy

Maintain/raise baseline toward WCAG 2.2 AA:

- visible focus
- semantic headings
- keyboard navigation
- Escape behavior
- `aria-current` navigation
- `aria-expanded` disclosure states
- 44×44 mobile targets
- non-color-only status communication
- accessible names for icon-only controls
- logical reading order when desktop columns collapse on mobile

## Known risks to monitor

1. Global CSS collisions from many premium/refinement files.
2. Authenticated layout inline styles overriding redesigned shell rules.
3. Role-aware home/journal/exam routes being accidentally designed only for students.
4. Mobile chat nested scrolling/keyboard issues.
5. Calendar density on small screens.
6. Generic global table/input styling leaking into custom reference pages.
7. Reference screenshot sample data tempting hardcoded production values.
8. Admin legacy routes and canonical redirects being visually tested as separate active pages.
9. Dark/theme palette behavior being unintentionally broken while focusing on light mode.
10. Generated/photographic hero assets causing LCP/CLS regressions.

## Definition of success

The redesign is complete only when:

- target retains source functional behavior;
- supplied pages visually match the references closely at 1536×864;
- mobile is purpose-built and usable;
- all routes are covered;
- backend/security contracts are unchanged;
- no secret is copied;
- build/typecheck/lint/tests pass without redesign-introduced failures;
- no source repository mutation occurred.
