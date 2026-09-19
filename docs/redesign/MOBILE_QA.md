# ATU Portal Redesign 02 — Mobile QA

## Target viewports

Prompt 11's required mobile/tablet targets are covered through the responsive contract established in Prompt 10 and revalidated in Prompt 11:

- 430×932
- 412×915
- 393×873
- 390×844
- 375×812
- 360×800
- 320×568
- 768×1024
- 820×1180
- 1024×1366

## Verified contracts

Static QA verifies:

- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`
- `100dvh`
- horizontal page overflow protection
- route-scoped mobile CSS for the primary reference routes
- `/menyu` family mobile coverage
- `aria-current` on mobile navigation
- mobile drawer focus isolation while closed

## Interaction/layout expectations

The implemented mobile shell keeps:

- fixed compact top header
- fixed five-slot bottom navigation
- elevated center services/menu action
- left slide drawer with backdrop
- route-change close behavior
- Escape-close support through shell/header controls
- minimum practical touch targets in the mobile design layer
- page bottom padding so content is not obscured by bottom navigation

Chat uses its own constrained scroll area and `100dvh` logic. Calendar is adapted rather than rendering a microscopic desktop month grid. Data-heavy pages use horizontal scrolling or mobile cards where defined by their redesign CSS.

## Zoom QA

The CSS avoids a fixed full-page width and applies overflow protection. The target range remains:

- 80%
- 100%
- 125%
- 150%
- 175%
- 200%

Automated browser zoom screenshots were not produced in CI, so zoom is a **static contract PASS / manual rendering review recommended** item rather than a claimed visual pixel pass.
