# ATU Portal Redesign 02 — Source Audit

## Audit scope

- **Source repository:** `ismayil-abbaso-v/Atu-portal`
- **Source branch:** `main`
- **Audited source HEAD:** `1d00870523497d272ee5490a286e12fa93e03a38`
- **Target repository:** `ismayil-abbaso-v/atu-portal-redesign-02`
- **Target branch:** `main`
- **Target state at audit start:** empty repository
- **Audit mode:** source read-only; target documentation-only
- **Secrets:** source `.env` was not opened, read, copied, printed, diffed, or analyzed.

## Confirmed technology stack

The real source tree and `package.json` confirm the following stack:

- React 19.2
- TypeScript 5.8
- TanStack Router 1.170
- TanStack Start 1.168
- Vite 8
- Tailwind CSS 4.2
- TanStack React Query 5.101
- Supabase JS 2.112 + PostgreSQL backend
- Radix UI primitives
- shadcn-style local UI primitives under `src/components/ui`
- Lucide React
- Recharts
- date-fns
- React Hook Form + Zod
- Sonner
- Embla Carousel
- KaTeX and PDF.js
- XLSX tooling
- MUI 9 is also present in dependencies
- Lovable's Vite/TanStack configuration package
- Bun-based test script, with npm-compatible build/typecheck scripts

The project is a TanStack Start application rather than a conventional SPA-only Vite project. Server functions exist under `src/server-functions`, and the deployment build has Nitro/Vercel handling in `vite.config.ts`.

## Repository scale observed

At the audited HEAD:

- 509 tracked blob files
- 52 directories
- 40 entries under `src/routes`
- 37 TSX route files
- 2 TypeScript API route files
- 35 authenticated TSX route files
- 11 admin TSX route files
- 7 menu/settings TSX route files
- 146 files under `src/components`
- 69 files under `src/lib`
- 7 hooks
- 8 Supabase integration files
- 2 TanStack server-function modules
- 38 CSS files
- 146 files under `supabase`
- 8 explicit test files matched by the repository test naming convention

## Application architecture

### Root/application shell

`src/routes/__root.tsx` imports the base stylesheet and a number of global visual layers, including:

- `styles.css`
- `dark-theme.css`
- `academic-blue.css`
- `academic-blue-polish.css`
- `dashboard-network-tree.css`
- `profile-data-visibility.css`
- `groups-premium.css`
- `admin-premium.css`
- `announcement-editor-performance.css`

The authenticated parent route is `src/routes/_authenticated/route.tsx`. It:

- calls `supabase.auth.getUser()` before loading protected content;
- redirects unauthenticated users to `/`;
- normalizes legacy `/admin/qruplar` paths to canonical `/qruplar` paths;
- renders the shared `Sidebar` and `AppHeader`;
- loads the profile name/avatar from `profiles`;
- manages route-level scroll reset behavior;
- contains inline responsive CSS that alters header/main/aside behavior at mobile and desktop breakpoints.

This inline layout CSS is a redesign risk because it overlaps responsibilities that should eventually belong to the redesigned shell.

### Shared layout

`src/components/layout/Sidebar.tsx` is already role-aware. It reads:

- user roles;
- primary role;
- notification count;
- locale;
- current route.

It dynamically exposes tutor, faculty/group and admin destinations according to role. Desktop behavior is currently a collapsible, rounded, floating sidebar: roughly compact icon width vs. 235px expanded width. Mobile behavior is already a left drawer with backdrop, Escape handling and body scroll lock.

The reference design requires a substantially different desktop treatment: a stable institutional white rail around 244–256px visual width, persistent ATU branding, rectangular active rows, and architectural line-art at the bottom. The current sidebar should therefore be treated as behavior to preserve, not appearance to preserve.

`src/components/layout/AppHeader.tsx` currently provides:

- mobile menu toggle;
- app name/subtitle;
- notification button and dropdown;
- mark-all-read action;
- profile/avatar dropdown;
- profile navigation;
- logout.

The current header does **not** implement the large desktop search field shown in the redesign references. That search must be added later without removing notification/profile behavior.

### Role-aware home route

`/ev` dispatches by primary role:

- admin → `AdminDashboard`
- dekan → `DeanDashboard`
- muellim → `TeacherDashboard`
- tyutor → `TutorDashboard`
- otherwise/student → `StudentDashboard` + student announcements

This is an important boundary: the student reference screenshot applies to the student view only. Other role dashboards must retain their information architecture.

## State and data flow

The dominant client state/data pattern is React Query backed by Supabase.

Representative dependencies:

### Student dashboard
Uses `profiles`, `group_members`, `courses`, `exam_scores`, `calendar_events`, `groups`, and the shared realtime notification hook.

### Calendar
Uses role-aware scopes and queries such as:

- `group_members`
- `groups`
- `course_teachers`
- `course_lesson_sessions`
- `courses`
- `profiles`
- `calendar_events`
- `exam_schedule`
- `exam_detailed_results`
- `course_groups`

Calendar create/update/delete actions already exist and must remain governed by existing permissions/RLS.

### Chat
Uses:

- `chat_groups`
- `chat_group_last_message`
- `chat_messages`
- `chat_group_members`
- profile joins
- Supabase Realtime `postgres_changes`
- `chat-files` storage for attachments

### Library
Uses `library_books`, with admin/dekan-aware management behavior and storage buckets including library book/cover assets.

### Office
Uses `office_files` and its storage bucket, including signed downloads and privileged delete/upload behavior.

### Notifications/announcements
Uses:

- `notifications`
- `announcements`
- `announcement_reads`
- `notification_settings`
- realtime channels
- optimistic mark-read mutations

### Profile and security
Profile uses `profiles` plus the `avatars` storage bucket. Security contains real auth functionality: password update, Supabase MFA enrollment/verification/unenrollment, own-session listing/revocation RPCs, local/global sign-out and session log handling.

### Electronic journal
The journal is role-aware and backed by both direct data access and TanStack server functions. Server functions call authoritative RPCs including:

- `calculate_semester_score`
- `can_grade_now`
- `confirm_lesson_grading`
- `get_week_parity`
- `at_risk_students`
- `generate_current_semester_lesson_sessions`
- `unlock_lesson_session`

These are backend/business-rule boundaries and must not be reimplemented in the UI.

## Authentication and authorization

### Authentication

- Public root route `/` handles login/session workflows.
- Username login delegates to the `auth-username-login` Edge Function.
- MFA and password-reset flows already exist.
- `/_authenticated` checks `supabase.auth.getUser()` and redirects unauthenticated users.
- Server functions use `requireSupabaseAuth`.

### Roles

Generated database role type contains:

- `admin`
- `dekan`
- `muellim`
- `tyutor`
- `telebe`

`usePrimaryRole` applies this priority:
admin > dekan > muellim > tyutor > telebe.

### Authorization helpers

`src/lib/route-permissions.ts` defines important front-end guards while relying on backend/RLS for authoritative enforcement:

- admin/dean access
- groups access
- primary tutor panel access
- scoped group access
- scoped course management
- teacher-course assignment access
- teacher-group access
- grading/time-window access
- assessment permission access
- student course-data visibility
- journal access
- tutor exam-schedule scope

These helpers are redesign-locked behavior.

## Internationalization

The core i18n layer supports exactly:

- Azerbaijani (`az`)
- Turkish (`tr`)
- English (`en`)
- Russian (`ru`)

Locale is persisted under `atu-locale`. The repository also contains multiple feature-specific i18n modules and legacy page bridges. Redesign text must not bypass this architecture with permanent Azerbaijani-only hardcoded strings where translated equivalents already exist.

## Theme and typography

`src/styles.css` already declares:

- Manrope as sans/UI font
- Fraunces as display font
- IBM Plex Mono as data/mono font

It also defines OKLCH light/dark semantic tokens and shared motion utilities.

`src/lib/theme.tsx` persists theme state under `atu-theme` and supports:

- light
- dark
- system
- multiple palette overrides
- font scaling

Default mode is light and the original palette. The redesign references target the light appearance. Existing theme logic should not be deleted merely because dark-mode redesign is not in the current visual scope.

## Existing motion/accessibility groundwork

The source already includes:

- `:focus-visible` outlines
- page-enter animation
- stagger utilities
- dialog/dropdown animations
- success/error micro-animations
- notification transitions
- mobile touch sizing in many components
- drawer Escape handling
- reduced-motion handling in the authenticated layout

The redesign should consolidate rather than stack additional competing animation systems.

## CSS collision and maintainability risks

The audit found **38 CSS files**, with several override chains.

High-risk groups:

1. **Admin**
   - root imports `admin-premium.css`
   - admin layout additionally imports `admin-premium-v2.css`
   - `admin-header-unified.css`
   - `admin-header-compact.css`
   - `admin-nav-border-fix.css`

2. **Groups**
   - root imports `groups-premium.css`
   - group routes additionally import:
     - `groups-header-premium.css`
     - `groups-header-v2.css`
     - `groups-header-wave-fix.css`

3. **Notifications**
   - page imports:
     - `announcements-premium.css`
     - `notifications-premium.css`
     - `notifications-hub-refinement.css`

4. **Library**
   - `library-premium.css`
   - `library-refinements.css`

5. **Settings/profile**
   - separate global files for profile, security, appearance, help, notification settings, transcript and menu.

6. **Base stylesheet global selectors**
   `styles.css` globally styles generic `table`, `input`, `select`, `textarea`, dialog, tab and button patterns. Page-specific CSS can therefore override or be overridden by base rules.

7. **Authenticated layout inline style block**
   It directly targets broad selectors such as `header.sticky.top-0`, `main`, and `aside.sticky.top-4`. This is particularly risky during shell redesign.

Recommended later remediation: introduce scoped redesign primitives/tokens first, then remove or narrow obsolete override chains only after visual and functional parity is verified. Do not perform a blind global CSS deletion.

## Responsive risks

- Current sidebar is optimized around collapse/expand behavior rather than the fixed reference rail.
- Authenticated layout contains breakpoint-specific inline positioning rules.
- Global tables become a minimum width of 640px below 768px, which is acceptable only inside correctly scoped horizontal scroll containers.
- Calendar currently renders a 7-column grid with minimum cell heights; a dedicated mobile treatment is required.
- Chat already separates group list/thread behavior and has a mobile back affordance; preserve that logic when restyling.
- Several role/admin pages are information-dense and cannot safely inherit the decorative student hero pattern.
- Existing route/page CSS uses many global selectors; mobile overrides can leak between routes.

## Build/test surface

Scripts confirmed in `package.json`:

- `npm run dev`
- `npm run typecheck` → tutor-focused TS config
- `npm run typecheck:all`
- `npm run build` → Vite build + typecheck
- `npm run lint`
- `npm test`/Bun test script for eight explicit suites

Current prompt scope does not copy or execute the target application because the target repository was empty and this phase is documentation-only.

## Key redesign invariants

Preserve:

- auth flows and MFA;
- role hierarchy;
- route guards;
- Supabase queries/mutations;
- RLS-backed assumptions;
- realtime chat and notifications;
- journal RPC/server-function boundaries;
- official exam integration;
- storage semantics;
- existing i18n;
- route identities.

Change later only at presentation level unless a verified layout adapter is necessary.

## Audit conclusion

The source is already a production-oriented, role-aware portal with significant backend coupling. The redesign should be implemented as a controlled presentation-layer replacement, not as a rewrite. The highest technical risk is not the visual work itself; it is accidentally changing authorization/data behavior while consolidating a large set of legacy/global CSS layers.
