# ATU Portal Redesign 02 — Mobile QA

## Prompt 15 status

The required responsive matrix contains 16 viewport sizes across 15 authenticated routes (240 route/viewport captures). Static responsive contracts pass; real rendering is currently **BLOCKED** because the managed browser cannot reach the local preview and the repository provides neither an external preview URL nor a safe authenticated test fixture.

| Class | Exact widths | Static contract | Real screenshots |
|---|---|---:|---:|
| Desktop | 2560, 1920, 1536, 1440, 1366, 1280 | PASS | BLOCKED |
| Tablet | 1024, 820, 768 | PASS | BLOCKED |
| Mobile | 430, 412, 393, 390, 375, 360, 320 | PASS | BLOCKED |

Exact width/height pairs are defined once in [`visual-qa/manifest.json`](./visual-qa/manifest.json).

## Verified source contracts

Static QA verifies:

- `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`;
- `100dvh` for constrained mobile experiences;
- route-scoped responsive CSS for primary and `/menyu` routes;
- `aria-current` on mobile navigation;
- mobile drawer focus isolation while closed;
- content bottom clearance for the fixed bottom navigation;
- contextual hero assets for all covered routes.

## Required rendered checks

Every capture must inspect:

- document and nested horizontal overflow;
- clipped text, controls and focus rings;
- minimum practical touch targets;
- top header, drawer, dialogs and bottom-nav overlap;
- safe-area padding;
- hero text/image collisions and crop quality;
- chat and data-table internal scrolling;
- keyboard focus order at mobile widths;
- zoom at 80%, 100%, 125%, 150%, 175% and 200%.

The shell is designed around a compact fixed header, five-slot bottom navigation, elevated services action and slide drawer. Chat uses a constrained `100dvh` region; calendar has a mobile-specific presentation; data-heavy pages use scoped scrolling or mobile cards.

## Acceptance boundary

The matrix remains `BLOCKED`, not `PASS`, until screenshots are produced from the exact reviewed commit in an authenticated session. A retry must populate the screenshot path, final URL, overflow measurements and issue/result fields in the manifest without changing the viewport list.
