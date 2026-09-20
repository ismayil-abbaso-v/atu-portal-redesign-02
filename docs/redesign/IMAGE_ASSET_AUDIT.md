# ATU Portal — contextual hero asset audit

Audit date: 2026-09-20
Scope: authenticated page heroes and dashboard innovation banner. Global `AppHeader`, `Sidebar`, `MobileBottomNav`, authentication shell and chatbot are excluded and unchanged.

## Inventory and decision matrix

| Route / placement       | Hero component                                 | Previous image                    | Human imagery | Primary issue                                                                  | Institutional direction                                                   | Desktop focal point | Mobile focal point | Asset / code decision                              |
| ----------------------- | ---------------------------------------------- | --------------------------------- | ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------- | ------------------ | -------------------------------------------------- |
| `/ev`                   | `StudentDashboard` / `student-home-hero`       | `student-home-hero.webp`          | Yes           | AI-looking students dominated the page identity                                | Human-free campus architecture, academic materials and technology network | right-center        | 70% center         | Replaced asset; mobile height/overlay refined      |
| `/ev` innovation banner | `StudentDashboard` / `student-home-innovation` | `student-innovation-lab.webp`     | Yes           | Repeated staged student imagery                                                | Abstract laboratory glassware and connected research nodes                | center-right        | center             | Replaced asset                                     |
| `/elektron-jurnal`      | route hero                                     | `electronic-journal-hero.webp`    | No            | Existing contextual visual acceptable; mobile copy density needed control      | Digital gradebook and academic record motif                               | right               | 68% center         | Asset retained; mobile hero refined                |
| `/imtahanlar`           | `ExamsOverviewHero`                            | `exams-hero.webp`                 | No            | Existing exam still-life is relevant; mobile decorative copy crowded the image | Exam paper, clock and writing materials                                   | right               | 68% center         | Asset retained; decorative mobile elements reduced |
| `/teqvim`               | route hero                                     | `calendar-hero.webp`              | Yes           | Staged human subject and unstable mobile crop                                  | Premium planner, clock and academic calendar composition                  | right-center        | 69% center         | Replaced asset; CTA retained at 44 px              |
| `/kitabxana`            | `LibraryHero`                                  | `library-hero.webp`               | Yes           | Reader imagery unnecessary for the function                                    | Book stacks, shelves and digital catalogue motif                          | right-center        | 70% center         | Replaced asset; mobile quote removed               |
| `/ofis`                 | route hero                                     | `office-hero.webp`                | Yes           | Office workers weakened institutional neutrality                               | Official folders, blank documents, seal and secure transfer motif         | right-center        | 70% center         | Replaced asset; mobile quote removed               |
| `/sohbet`               | route hero                                     | `chat-hero.webp`                  | Yes           | Human group repeated the same visual language as other routes                  | Secure message cards and university network nodes                         | right-center        | 70% center         | Replaced asset; compact mobile hero                |
| `/bildirisler`          | route hero                                     | `notifications-hero.webp`         | No            | Existing notification still-life is appropriate; mobile quote was cramped      | Bell, reminder and announcement cards                                     | right               | 70% center         | Asset retained; mobile layout refined              |
| `/menyu`                | shared settings hero                           | `menu-settings-hero.webp`         | No            | Existing modular still-life is appropriate                                     | Abstract system modules and configuration controls                        | right               | 70% center         | Asset retained; compact mobile composition         |
| `/menyu/profil`         | shared settings hero                           | `profile-settings-hero.webp`      | Yes           | Portrait-style profile representation unnecessary                              | Blank identity card, shield and institutional identification              | right-center        | 70% center         | Replaced asset; no PII or portrait                 |
| `/menyu/tehlukesizlik`  | shared settings hero                           | `security-settings-hero.webp`     | Yes           | Person-led security visual was not institutionally appropriate                 | Lock, shield, encrypted network and server architecture                   | right-center        | 70% center         | Replaced asset                                     |
| `/menyu/bildiris`       | shared settings hero                           | `notification-settings-hero.webp` | Yes           | Person/device composition distracted from controls                             | Bell, priority rings, mute and calendar reminder objects                  | right-center        | 70% center         | Replaced asset                                     |
| `/menyu/gorunus`        | shared settings hero                           | `appearance-settings-hero.webp`   | Yes           | Human-led creative scene did not describe appearance settings clearly          | Light/dark panels, neutral swatches and contrast motif                    | right-center        | 70% center         | Replaced asset                                     |
| `/menyu/transkript`     | `PageHeader` / `transcript-page-header`        | `transcript-hero.webp`            | No            | Existing official document still-life is compliant; mobile header was too tall | Formal academic document and seal-inspired composition                    | right               | 70% center         | Asset retained; mobile visual simplified           |
| `/menyu/yardim`         | shared settings hero                           | `help-settings-hero.webp`         | No            | Existing human-free help still-life is compliant                               | Guide book, wayfinding and question-card motifs                           | right               | 70% center         | Asset retained; shared mobile layout refined       |

## Asset constraints

- Replacements contain no people, faces, hands, humanoid robots, readable text, personal data, university logos or watermarks.
- Hero copy remains semantic HTML; images remain decorative CSS backgrounds.
- Generated images use page-specific still-life or architectural compositions with copy-safe negative space on the left.
- Images are stripped of metadata, encoded as WebP, and sized near the existing wide hero aspect ratio.
- Mobile route rules are isolated in `src/institutional-heroes.css`; no broad `header`, `img`, `body` or navigation override is used.
- Existing data fetching, actions, role visibility, routes and backend contracts are unchanged.

## Files replaced

- `src/assets/student-home-hero.webp`
- `src/assets/student-innovation-lab.webp`
- `src/assets/calendar-hero.webp`
- `src/assets/chat-hero.webp`
- `src/assets/library-hero.webp`
- `src/assets/office-hero.webp`
- `src/assets/profile-settings-hero.webp`
- `src/assets/security-settings-hero.webp`
- `src/assets/notification-settings-hero.webp`
- `src/assets/appearance-settings-hero.webp`

## Runtime validation boundary

Authenticated route screenshots require a valid portal session. The project does not contain test credentials and authentication/RLS must not be bypassed. Asset-level visual inspection, automated source checks and build checks are recorded separately; authenticated screenshots are only marked complete when a legitimate session is available.
