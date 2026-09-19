# ATU Portal Redesign 02 — Route Inventory

## Audit basis

- Source: `ismayil-abbaso-v/Atu-portal@main`
- Source HEAD: `1d00870523497d272ee5490a286e12fa93e03a38`
- Route directory entries: 40
- TSX route files: 37
- TypeScript API route files: 2
- Authenticated TSX route files: 35
- Admin TSX route files: 11
- Menu/settings TSX route files: 7

The table below reflects the actual source tree and inspected guards. `/_authenticated` is the shared auth parent and is not itself a user-facing URL.

## Public and API routes

| Route | File | Access/behavior | Redesign note |
|---|---|---|---|
| `/` | `src/routes/index.tsx` | Public login; existing session detection, username login Edge Function, reset-password and MFA flows | Login behavior is locked; future visual work must preserve auth states |
| `/api/public/auth-username-login` | `src/routes/api/public/auth-username-login.ts` | Public API route used by login flow | Backend/API contract locked |
| `/api/public/receive-exam-result` | `src/routes/api/public/receive-exam-result.ts` | Public integration endpoint for result intake | Official integration locked |

## Shared authenticated shell

| Route scope | File | Access/behavior |
|---|---|---|
| all authenticated URLs | `src/routes/_authenticated/route.tsx` | `supabase.auth.getUser()`; unauthenticated → `/`; loads profile; renders Sidebar/AppHeader/Outlet; normalizes legacy admin group paths |

The parent also redirects:
- `/admin/qruplar` → `/qruplar`
- `/admin/qruplar/:groupId` → `/qruplar/:groupId`

These legacy route files still exist but the canonical navigation path is the non-admin URL.

## Student/common authenticated routes

| URL | Source file | Role/access model | Current implementation notes |
|---|---|---|---|
| `/ev` | `_authenticated/ev.tsx` | Any authenticated user; role-aware view | Switches between Admin, Dean, Teacher, Tutor and Student dashboards |
| `/elektron-jurnal` | `_authenticated/elektron-jurnal.tsx` | Academic roles via `canMonitorJournal` | Teacher journal, tutor monitor or student journal selected by roles |
| `/teqvim` | `_authenticated/teqvim.tsx` | Authenticated; data/actions further scoped by role/RLS | Combines lesson sessions, manual events, exams and completed exam data |
| `/imtahanlar` | `_authenticated/imtahanlar.tsx` | Authenticated; role-aware | Tutor scheduler, teacher grading, admin/dean grading, student exams |
| `/sohbet` | `_authenticated/sohbet.tsx` | Authenticated; RLS/realtime scope | Chat groups, messages, members and realtime INSERT handling |
| `/kitabxana` | `_authenticated/kitabxana.tsx` | Authenticated | Students browse; admin/dean receive management affordances |
| `/ofis` | `_authenticated/ofis.tsx` | Authenticated; privileged actions remain role/RLS constrained | Office files, storage download, privileged management |
| `/bildirisler` | `_authenticated/bildirisler.tsx` | Authenticated | Announcements, read state and realtime updates |
| `/elanlar` | `_authenticated/elanlar.tsx` | Authenticated | Legacy redirect to `/bildirisler` |

## Menu/settings routes

| URL | File | Access/behavior | Critical dependency |
|---|---|---|---|
| `/menyu` | `menyu/index.tsx` | Authenticated | Primary-role-aware menu hub |
| `/menyu/profil` | `menyu/profil.tsx` | Authenticated | `profiles`, avatar storage, profile update |
| `/menyu/tehlukesizlik` | `menyu/tehlukesizlik.tsx` | Authenticated | password update, MFA, own-session RPCs, logout |
| `/menyu/bildiris` | `menyu/bildiris.tsx` | Authenticated | `notification_settings` query/mutation |
| `/menyu/gorunus` | `menyu/gorunus.tsx` | Authenticated | theme/palette/font-scale and role preview |
| `/menyu/transkript` | `menyu/transkript.tsx` | Authenticated | profile + system settings + transcript document generation path |
| `/menyu/yardim` | `menyu/yardim.tsx` | Authenticated | help content/i18n; no auth redesign allowed |

## Group, course, faculty, teacher and tutor routes

| URL | File | Guard/access |
|---|---|---|
| `/qruplar` | `_authenticated/qruplar.tsx` | `canAccessGroups`: admin, dekan, tyutor |
| `/qruplar/:groupId` | `_authenticated/qruplar_.$groupId.tsx` | `canAccessGroup`; tutor is restricted to assigned group; admin/dean manager semantics preserved |
| `/fennler/:courseId` | `_authenticated/fennler_.$courseId.tsx` | `canAccessCourse`: admin/dekan/tutor with assignment checks |
| `/fakulte-icmali` | `_authenticated/fakulte-icmali.tsx` | Component is dean-oriented and queries only when `dekan`; backend/RLS remains authoritative. Unlike the routes above, there is no inspected `beforeLoad` guard, so redesign must not weaken this boundary further |
| `/muellim/:groupId/:courseId` | `_authenticated/muellim_.$groupId.$courseId.tsx` | `canAccessTeacherCourse`; requires teacher assignment and matching course-group relationship |
| `/tyutor-paneli` | `_authenticated/tyutor-paneli.tsx` | `canAccessTutorPanel`; primary tutor only, excluding admin/dean/teacher multi-role users |
| `/tyutor/:groupId` | `_authenticated/tyutor_.$groupId.tsx` | Validates `canAccessGroup`, then redirects to canonical group route |

## Admin route subtree

Parent `src/routes/_authenticated/admin/route.tsx` is **admin-only**. It explicitly rejects non-admin users. A dean is redirected to canonical manager/group pages rather than being allowed into the admin shell.

| URL | Source file | Access/behavior |
|---|---|---|
| `/admin` | `admin/index.tsx` | Admin dashboard, inherits admin parent guard |
| `/admin/dersler` | `admin/dersler.tsx` | Course administration |
| `/admin/dersler/:courseId` | `admin/dersler.$courseId.tsx` | Course detail/management |
| `/admin/elanlar` | `admin/elanlar.tsx` | Announcement management |
| `/admin/istifadeciler` | `admin/istifadeciler.tsx` | User administration, RPC/profile updates |
| `/admin/kitabxana` | `admin/kitabxana.tsx` | Library administration |
| `/admin/loqlar` | `admin/loqlar.tsx` | Activity log browsing |
| `/admin/qruplar` | `admin/qruplar.tsx` | Legacy file exists; authenticated parent redirects to canonical `/qruplar` |
| `/admin/qruplar/:groupId` | `admin/qruplar_.$groupId.tsx` | Legacy file exists; authenticated parent redirects to canonical group detail |
| `/admin/tenzimlemeler` | `admin/tenzimlemeler.tsx` | Additional explicit admin check; system settings |

## Role model that redesign must preserve

`usePrimaryRole` priority:

1. admin
2. dekan
3. muellim
4. tyutor
5. telebe

Important consequences:

- A multi-role account may intentionally see a higher-priority home/exam experience.
- A tutor panel intentionally excludes higher staff roles.
- Admin UI must remain admin-only.
- Dean management uses canonical group/faculty routes rather than the admin shell.
- Teacher course access is derived from `course_teachers` and `course_groups`, not from visual navigation.
- Hiding a link is never a replacement for route guards or RLS.

## Route-level redesign acceptance rules

For every listed route in later prompts:

1. URL identity must remain stable unless the source already performs a redirect.
2. Existing `beforeLoad` guards must remain semantically equivalent.
3. Visual components may change; permission checks must not.
4. Loading, empty, error, unauthorized and missing-entity states must not regress.
5. Dynamic IDs must continue to flow through TanStack Router params.
6. Role-aware components must preserve current role dispatch.
7. No redesign step may add a client-only bypass around existing RLS/server checks.
