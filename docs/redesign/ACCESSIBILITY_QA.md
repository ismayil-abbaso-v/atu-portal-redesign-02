# ATU Portal Redesign 02 — Accessibility QA

Target: WCAG 2.2 AA where applicable to the portal UI.

## Automated/static checks completed

**PASS**:

- Desktop sidebar current-route semantics with `aria-current="page"`.
- Mobile bottom navigation current-route semantics.
- Header controls expose expanded state for overlays.
- Closed notification/profile overlays are removed from focus navigation with `inert`.
- Closed mobile drawer uses focus isolation.
- Escape closes active header overlays.
- Notification unread state includes screen-reader text and is not color-only.
- Reduced-motion CSS contract exists.
- Prompt 11 scoped semantic ESLint passes.
- TypeScript typecheck passes.

## Keyboard behavior

Reviewed source contracts include:

- button elements for interactive controls
- Escape close behavior for overlays/drawers
- visible focus rules in the design system
- semantic links for navigation
- explicit labels/aria-labels on icon-only controls introduced or corrected in redesign stages

## Reduced motion

The redesign includes `prefers-reduced-motion: reduce` handling and Prompt 11 rejects decorative infinite bounce/pulse behavior in the redesign CSS contract.

## Remaining manual accessibility review

A browser + screen-reader session is still recommended for:

- exact focus order across all authenticated data states
- dialog focus trapping in every legacy dialog
- live-region announcements after async mutations
- 200% zoom rendering
- contrast confirmation against actual rendered images/content
- VoiceOver/NVDA naming on third-party Radix controls

These items require an interactive authenticated browser session and are not replaced by static source checks.
