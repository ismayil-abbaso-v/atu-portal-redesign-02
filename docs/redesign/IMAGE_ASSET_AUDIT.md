# ATU Portal Redesign 02 — Image Asset Audit

## Scope

- Target baseline: `6a555b741d613cf2e957e9efa2be740fcf4445ad`
- Scope: presentation assets and their frontend imports only
- Backend lock: respected; no schema, migration, RLS, Edge Function, auth, query, realtime, storage or business-logic file changed
- Login illustration: intentionally unchanged (locked UI)

## Finding

The twelve route heroes below previously used small, code-drawn SVG placeholders (approximately 1–3 KB). They satisfied the static asset-name contract but did not satisfy the original requirement for professional, contextual, photorealistic imagery. Each placeholder has been replaced with a distinct generated raster asset.

All new assets:

- are WebP, 1600×600;
- use a wide editorial composition with copy-safe negative space on the left;
- keep the contextual subject in the center/right for desktop and mobile cropping;
- contain no readable text, ATU logo, watermark, university building or campus facade;
- stay below the 250 KB hard limit;
- are bundled locally through Vite, with no third-party runtime image request.

## Replacement matrix

| Route                  | Previous asset/problem                                              | New asset                         |     Size | Desktop composition | Mobile crop safety                                      | Accessibility                                                              |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------- | -------: | ------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/teqvim`              | `calendar-hero.svg`; simplified vector desk                         | `calendar-hero.webp`              | 43,034 B | Reviewed            | Subject retained at existing mobile background position | Decorative CSS background; HTML heading remains the accessible name        |
| `/imtahanlar`          | `exams-hero.svg`; simplified vector desk                            | `exams-hero.webp`                 | 56,624 B | Reviewed            | Main study objects remain center/right                  | Decorative CSS background; HTML copy remains accessible                    |
| `/sohbet`              | `chat-hero.svg`; did not show real student collaboration            | `chat-hero.webp`                  | 43,850 B | Reviewed            | Three students remain grouped away from the edge        | Decorative CSS background; no text embedded in image                       |
| `/kitabxana`           | `library-hero.svg`; generic illustration rather than a real library | `library-hero.webp`               | 60,204 B | Reviewed            | Reader and desk remain in safe crop area                | Decorative CSS background; route title is HTML                             |
| `/ofis`                | `office-hero.svg`; abstract documents only                          | `office-hero.webp`                | 46,368 B | Reviewed            | Student-service interaction stays visible               | Decorative CSS background; no personal data in image                       |
| `/bildirisler`         | `notifications-hero.svg`; oversized vector bell                     | `notifications-hero.webp`         | 28,786 B | Reviewed            | Devices and notification shapes remain visible          | Decorative CSS background; notification meaning is also present in HTML/UI |
| `/menyu`               | `menu-settings-hero.svg`; generic laptop/vector panel               | `menu-settings-hero.webp`         | 36,412 B | Reviewed            | Laptop/profile/security objects stay visible            | Decorative CSS background; no generated UI text                            |
| `/menyu/profil`        | `profile-settings-hero.svg`; generic profile card                   | `profile-settings-hero.webp`      | 36,862 B | Reviewed            | Profile subject remains visible                         | Decorative CSS background; blank badge contains no PII                     |
| `/menyu/tehlukesizlik` | `security-settings-hero.svg`; generic shield/lock                   | `security-settings-hero.webp`     | 41,362 B | Reviewed            | Security key, lock and laptop remain visible            | Decorative CSS background; security meaning is in HTML copy                |
| `/menyu/bildiris`      | `notification-settings-hero.svg`; generic bell/toggles              | `notification-settings-hero.webp` | 38,502 B | Reviewed            | Phone and abstract indicators remain visible            | Decorative CSS background; no readable interface text                      |
| `/menyu/gorunus`       | `appearance-settings-hero.svg`; generic monitor                     | `appearance-settings-hero.webp`   | 37,882 B | Reviewed            | Material/color workspace remains visible                | Decorative CSS background; no embedded labels                              |
| `/menyu/yardim`        | `help-settings-hero.svg`; generic headset/question mark             | `help-settings-hero.webp`         | 36,588 B | Reviewed            | Headset and help-card objects remain visible            | Decorative CSS background; help content stays semantic HTML                |

## Existing raster heroes retained after review

The following existing WebP assets were not replaced because they already use contextual, professional raster imagery and comply with the no-building rule:

- `student-home-hero.webp`
- `student-innovation-lab.webp`
- `electronic-journal-hero.webp`
- `transcript-hero.webp`

## Visual validation status

- Source assets were reviewed together in a 2×6 contact sheet for composition, subject separation, text-free output and consistent burgundy/neutral art direction.
- Each asset is exactly 1600×600 and uses the current route hero's existing `background-size: cover` behavior.
- The left copy-safe region and center/right subject placement were checked at asset level for the existing desktop and mobile background-position rules.
- A true authenticated 1536×864 / 1440×900 / 390×844 / 412×915 route screenshot run is **not claimed by this change** because the repository contains no committed test credentials and auth/RLS must not be bypassed. That runtime screenshot matrix remains the explicitly scoped work of Prompt 15. This audit does not mark authenticated browser rendering as PASS without evidence.

## Generation specification

The built-in image-generation workflow was used with twelve separate route-specific prompts. Shared constraints were: photorealistic editorial hero, natural materials and daylight, neutral white plus restrained burgundy accents, left-side negative space, center/right subject, mobile-safe crop, no text, no logo, no watermark, no campus/building, and no dominant red background.

## Validation checklist

- [x] Twelve placeholder SVG imports replaced with WebP imports
- [x] Twelve old SVG assets removed after confirming no remaining references
- [x] 1600×600 dimensions
- [x] All new assets below 250 KB
- [x] No external image URLs
- [x] No backend files changed
- [x] Login asset unchanged
- [ ] Authenticated browser screenshot matrix (deferred to Prompt 15; no credentials are committed)

---

## Prompt 17 final image-coverage check — 2026-09-19

The final conformance audit enforces all fifteen primary contextual WebP hero references and rejects reintroduction of the twelve replaced placeholder SVGs. Asset-level coverage is PASS. Authenticated desktop/mobile crop screenshots remain BLOCKED for the reasons documented in `VISUAL_QA.md`; no asset-level inspection is presented as a rendered-route screenshot.
