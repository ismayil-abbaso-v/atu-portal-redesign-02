# ATU Portal Redesign 02 — Visual Reference Map

## Reference status

Ten desktop reference images were supplied for the redesign audit. All ten uploaded files are **1536 × 864 px**, making 1536×864 the primary desktop visual-comparison viewport.

The canonical filenames below should be used by later implementation documentation. The current chat-upload filename is also recorded so the assets can be identified without ambiguity.

| Canonical reference | Uploaded file | Target route | Visual subject |
|---|---|---|---|
| `home.png` | `1000163339.png` | `/ev` | Student home/dashboard |
| `electronic-journal.png` | `1000163336.png` | `/elektron-jurnal` | Electronic journal/results |
| `calendar.png` | `1000163337.png` | `/teqvim` | Academic calendar |
| `exams.png` | `1000163333.png` | `/imtahanlar` | Exams dashboard |
| `chat.png` | `1000163342.png` | `/sohbet` | Group chat |
| `library.png` | `1000163334.png` | `/kitabxana` | Library |
| `office.png` | `1000163341.png` | `/ofis` | Office services |
| `notifications.png` | `1000163338.png` | `/bildirisler` | Notification center |
| `menu.png` | `1000163340.png` | `/menyu` | Menu/settings hub |
| `transcript.png` | `1000163335.png` | `/menyu/transkript` | Academic transcript |

## Shared desktop visual language

The references consistently define a premium institutional workspace rather than a generic SaaS dashboard.

### Core palette

- dominant dark cherry/burgundy
- warm/soft white background
- near-white cards
- dark navy/charcoal body text
- muted cool gray secondary text
- pale rose selection/highlight backgrounds
- restrained green/amber/blue semantic states

Later implementation should sample the reference burgundy and express it through semantic tokens rather than scattering unrelated red hex values.

### Sidebar

The reference sidebar is:

- permanently visible on desktop
- approximately 244–256px in visual width
- white
- separated by a subtle right rule
- ATU Portal mark at the top
- full text navigation, not an icon-only default state
- burgundy rounded-rectangle active item
- icon + label rows
- institutional architectural line-art and the words “Bilik / Texnologiya / Gələcək” at the bottom

This materially differs from the source's current collapsible rounded/floating desktop sidebar.

### Top header

The desktop references show:

- a long search field on the left
- theme/sun icon
- notification bell with badge
- avatar
- student name
- role/major text
- disclosure chevron

The source header currently has notification/profile behavior but no equivalent full-width desktop search. Later shell work must add search without losing existing header functionality.

### Typography

Reference hierarchy matches the source's existing font direction well:

- Fraunces-like editorial display for large titles and quotes
- Manrope-like modern UI/body typography
- strong numeric/data hierarchy where needed

The source already declares Manrope, Fraunces and IBM Plex Mono, so the redesign should consolidate around those rather than introduce another font family.

### Card treatment

- thin borders
- restrained shadows
- medium radius, not exaggerated pill cards
- dense but breathable whitespace
- burgundy square icon wells
- editorial section titles
- subtle pale-rose highlight states

### Page imagery rule

The supplied reference set intentionally uses **contextual imagery**, not the university building as a repeated hero.

Required visual theme per page:

- Home → student at laptop + technology/innovation context
- Electronic journal → academic results desk, laptop, books, notebook
- Calendar → planner/calendar workspace
- Exams → exam-preparation desk
- Chat → students collaborating
- Library → library/books
- Office → administrative office/documents
- Notifications → notification bell/digital notification composition
- Menu → account/settings/security workspace
- Transcript → transcript/diploma/graduation composition

The home page lower innovation banner should use an innovation lab/modern technology workspace. It should **not** switch back to a university-building photo.

### Text-in-image rule

Reference hero imagery must be treated as photographic/illustrative background material. Important UI copy, quotes, labels, CTA text, names and dynamic values should be real HTML/CSS, not baked into generated images.

This is necessary for:
- accessibility
- localization
- responsive reflow
- dynamic data
- visual QA

## Page-specific structural notes

### Home — `/ev`

Reference structure:
1. hero welcome band
2. academic progress large burgundy card
3. current-week schedule
4. scholarship/payment card
5. quick services
6. chat activity
7. innovation banner

The source does not necessarily contain scholarship/payment data. Later implementation must not hardcode reference values as fake real data; use a real equivalent summary or an honest empty/alternative state.

### Electronic journal — `/elektron-jurnal`

Reference:
- contextual academic hero
- academic period/program/course filter strip
- four summary cards
- dense results table
- status legend

The underlying role-aware journal behavior is more complex than the student screenshot and must remain intact for teacher/tutor views.

### Calendar — `/teqvim`

Reference:
- planner hero
- event filter chips
- large monthly calendar
- right-side upcoming/day events
- bottom academic date cards

On mobile, the desktop seven-column layout should not simply be miniaturized.

### Exams — `/imtahanlar`

Reference:
- study hero
- three main tabs
- large upcoming-exam list
- right mini calendar
- recent result summary

The source route is role-aware, so the screenshot is primarily a student visual specification.

### Chat — `/sohbet`

Reference:
- collaboration hero
- left conversation list
- right thread
- incoming neutral and outgoing burgundy messages

The source already has a logical mobile back affordance; later mobile redesign should preserve the native-messenger split-view behavior.

### Library — `/kitabxana`

Reference:
- library hero
- large search + advanced search
- category chips
- selected resources
- recently viewed items
- right library-card/database/loan stack

### Office — `/ofis`

Reference:
- administrative hero
- service cards
- own requests
- activity timeline
- right contact/support/FAQ cards

Only existing real services/actions may be wired.

### Notifications — `/bildirisler`

Reference:
- notification hero
- category tabs
- list with pinned/unread states
- right statistics and shortcuts

Existing read/realtime behavior remains authoritative.

### Menu — `/menyu`

Reference:
- settings/security hero
- six primary settings cards
- bottom support banner

### Transcript — `/menyu/transkript`

Reference:
- transcript/graduation hero
- four metrics
- semester tabs
- transcript table
- right official-transcript/student-info/grade-scale cards

PDF/download UI may only be active if backed by existing functionality.

## Mobile reference direction

The later mobile implementation should be app-like rather than a scaled desktop:

- compact top header
- no desktop sidebar
- fixed safe-area-aware bottom navigation
- five primary positions: Home, Calendar, center services/menu, Chat, Menu
- left drawer for full navigation/profile/logout
- one main vertical content flow
- chat list and conversation as separate mobile states
- compact calendar + selected-day detail
- horizontal chip/tab scrollers where appropriate
- 44×44 minimum touch targets

Primary mobile QA targets are 390×844 and 412×915, with wider coverage required by later prompts.

## Acceptance principle

The screenshots are visual specifications for structure and hierarchy. They are **not** permission to:
- hardcode sample user data;
- fake backend features;
- replace UI with one screenshot background;
- break role-aware behavior;
- bake dynamic text into images.

Later visual QA should compare rendered 1536×864 screenshots against this set page by page.
