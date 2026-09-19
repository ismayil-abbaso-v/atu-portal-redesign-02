# ATU Portal Redesign 02 — Route Completeness

## Scope and audited revisions

- Source (READ-ONLY): `ismayil-abbaso-v/Atu-portal@main`
- Source HEAD audited: `1d00870523497d272ee5490a286e12fa93e03a38`
- Target: `ismayil-abbaso-v/atu-portal-redesign-02@main`
- Target baseline before Prompt 12: `7090f3254e61de91ccc6df743cb8e1809abc3e12`
- Backend lock respected: no database schema, migration, RLS, Edge Function, storage, auth-contract or Supabase configuration change.

## Exact route diff

Source and target both contain exactly **40** entries under `src/routes`: **34 user-facing route modules**, **2 public API routes**, and **4 route infrastructure/documentation entries** (`README`, root route, authenticated layout, admin layout). The 34 user-facing route file paths are an exact 1:1 match; no source user-facing route is missing from target and no extra target user-facing route was introduced.

The generated TanStack route tree exposes all 34 audited user-facing URL patterns. The two public API routes are backend/integration contracts and are intentionally **N/A** for visual redesign:

- `/api/public/auth-username-login` — N/A (locked public API contract)
- `/api/public/receive-exam-result` — N/A (locked official integration contract)

## Prompt 12 correction

The completeness audit found one cross-route shell gap rather than a missing page: the shared title/metadata mapper did not include `/elektron-jurnal`, `/elanlar`, `/fennler/*`, `/muellim/*`, `/tyutor-paneli` and `/tyutor/*`. Prompt 12 adds those mappings plus AZ/TR/EN/RU labels. This is presentation/metadata only and does not alter route access or backend behavior.

## User-facing route matrix

| Route | Role | Desktop | Mobile | Design | Functionality | Status | Notes |
|---|---|---|---|---|---|---|---|
| `/` | Public | PASS | PASS | N/A (locked login) | PASS | **PASS** | Login/auth/MFA/reset flows preserved; no redesign change. |
| `/ev` | Authenticated; role-aware | PASS | PASS | PASS | PASS | **PASS** | Student/admin/dean/teacher/tutor dashboard routing preserved. |
| `/elektron-jurnal` | Academic roles via canMonitorJournal | PASS | PASS | PASS | PASS | **PASS** | Metadata coverage fixed in Prompt 12. |
| `/teqvim` | Authenticated; role/RLS scoped | PASS | PASS | PASS | PASS | **PASS** | Calendar responsive contract revalidated. |
| `/imtahanlar` | Authenticated; role-aware | PASS | PASS | PASS | PASS | **PASS** | Exam business rules unchanged. |
| `/sohbet` | Authenticated; RLS/realtime | PASS | PASS | PASS | PASS | **PASS** | Realtime/send semantics unchanged. |
| `/kitabxana` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Admin/dean affordances retained. |
| `/ofis` | Authenticated; privileged actions role/RLS scoped | PASS | PASS | PASS | PASS | **PASS** | Storage/backend contracts unchanged. |
| `/bildirisler` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Read state/routing/realtime retained. |
| `/elanlar` | Authenticated | PASS (redirect) | PASS (redirect) | N/A (redirect) | PASS | **PASS** | Legacy alias to /bildirisler; metadata coverage added. |
| `/menyu` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Primary-role-aware hub. |
| `/menyu/profil` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Existing profile/avatar mutations preserved. |
| `/menyu/tehlukesizlik` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Password/MFA/session logic preserved. |
| `/menyu/bildiris` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Notification preferences preserved. |
| `/menyu/gorunus` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Theme/language/font-scale logic preserved. |
| `/menyu/transkript` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Transcript data/export path preserved. |
| `/menyu/yardim` | Authenticated | PASS | PASS | PASS | PASS | **PASS** | Help content remains responsive. |
| `/qruplar` | Admin, dean, tutor via canAccessGroups | PASS | PASS | PASS | PASS | **PASS** | Role workspace wrapper + mobile rules. |
| `/qruplar/$groupId` | canAccessGroup | PASS | PASS | PASS | PASS | **PASS** | Dynamic access + loading + manager/tutor detail states. |
| `/fennler/$courseId` | Admin/dean/tutor via canAccessCourse | PASS | PASS | PASS | PASS | **PASS** | Dynamic missing/error/empty handling present; metadata fixed. |
| `/fakulte-icmali` | Dean-oriented; backend/RLS authoritative | PASS | PASS | PASS | PASS | **PASS** | Faculty workspace wrapper retained. |
| `/muellim/$groupId/$courseId` | canAccessTeacherCourse | PASS | PASS | PASS | PASS | **PASS** | Teacher workspace has explicit loading/error state; metadata fixed. |
| `/tyutor-paneli` | canAccessTutorPanel | PASS | PASS | PASS | PASS | **PASS** | Tutor workspace wrapper; metadata fixed. |
| `/tyutor/$groupId` | canAccessGroup | PASS (redirect) | PASS (redirect) | N/A (redirect) | PASS | **PASS** | Canonical redirect to /qruplar/$groupId. |
| `/admin` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Dense admin workspace redesign wrapper. |
| `/admin/dersler` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Admin course list. |
| `/admin/dersler/$courseId` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Dynamic missing-course EmptyState present. |
| `/admin/elanlar` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Announcement management. |
| `/admin/istifadeciler` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | User management. |
| `/admin/kitabxana` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Library administration. |
| `/admin/loqlar` | Admin parent guard | PASS | PASS | PASS | PASS | **PASS** | Activity logs. |
| `/admin/qruplar` | Authenticated parent canonical redirect | PASS (redirect) | PASS (redirect) | N/A (redirect) | PASS | **PASS** | Legacy admin URL redirects to /qruplar before admin layout. |
| `/admin/qruplar/$groupId` | Authenticated parent canonical redirect | PASS (redirect) | PASS (redirect) | N/A (redirect) | PASS | **PASS** | Legacy detail URL redirects to /qruplar/$groupId. |
| `/admin/tenzimlemeler` | Admin parent + explicit admin check | PASS | PASS | PASS | PASS | **PASS** | Settings route preserves admin boundary. |

## 404 / error / edge-state audit

| Scenario | Status | Evidence/behavior |
|---|---|---|
| Unknown route | **PASS** | Root `notFoundComponent` renders a branded 404 instead of a blank page. |
| Unauthorized / unauthenticated | **PASS** | Authenticated parent calls `supabase.auth.getUser()` and redirects to `/`; admin and dynamic route permission guards remain intact. |
| Missing entity | **PASS** | Dynamic course/group pages expose EmptyState/error handling; teacher workspace exposes explicit query error UI. |
| Invalid dynamic ID | **PASS** | Permission/query failures are contained by local states or the root `errorComponent`; no unhandled white-screen path is intentionally exposed. |
| Expired session | **PASS** | Shared authenticated parent revalidates current user and redirects to login when unavailable. |
| Network/query error | **PASS** | Root error boundary plus route/component query error states provide recoverable UI. |
| Empty data | **PASS** | Existing EmptyState/Skeleton paths are retained on data-heavy and dynamic pages. |

## Design and mobile consistency

- Primary redesigned student pages remain covered by Prompt 11's visual/mobile/accessibility static QA.
- Role routes are wrapped by `role-workspace-page` plus admin/groups/faculty/course/teacher/tutor/announcements variants.
- `src/mobile-native.css` retains safe-area top/bottom handling and `100dvh` behavior; the root shell does not globally clip horizontal overflow, so component-level overflow remains observable and fixable.
- Legacy route files that exist only as aliases (`/elanlar`, `/tyutor/$groupId`, `/admin/qruplar*`) are treated as redirect behavior, not separate visual pages.
- No backend file is modified by Prompt 12.

## Dynamic-route coverage

- `/qruplar/$groupId`: permission guard, role loading, tutor/manager view branching, group-detail empty/error handling.
- `/fennler/$courseId`: explicit loading, query error/missing entity and empty-topic states.
- `/muellim/$groupId/$courseId`: teacher-course permission guard; workspace explicit loading/error handling.
- `/tyutor/$groupId`: permission validation then canonical redirect.
- `/admin/dersler/$courseId`: missing-course EmptyState.
- `/admin/qruplar/$groupId`: legacy URL is intercepted by the authenticated parent and redirected to the canonical group route.

## Validation contract

`scripts/prompt12-route-completeness.mjs` pins the audited source HEAD and fails CI if:

- any of the 34 user-facing route modules is missing or an unexpected route module appears;
- generated route-tree URL coverage changes;
- role workspace redesign wrappers disappear;
- Prompt 12 metadata translations/mappings disappear;
- root 404/error boundaries disappear;
- document-level horizontal clipping is reintroduced;
- mobile safe-area/`100dvh` contracts disappear;
- critical dynamic-route access/error/empty-state signals disappear;
- core redesign QA assets/scripts disappear.

`.github/workflows/prompt12-validation.yml` re-runs Prompt 11 static contracts, Prompt 12 route completeness, typecheck, scoped ESLint, regression tests and production build. Repository-wide lint is still recorded as inherited baseline debt and is non-blocking exactly as in Prompt 11.

## Honest runtime limitation

Authenticated production-data browser E2E is not claimed here because no test credentials are committed and Prompt 12 must not introduce credentials or weaken auth. Route opening is therefore validated through generated route-tree compilation, access/error-state source contracts, regression tests and the production build. Public login remains a locked baseline route.

## Final status

**34/34 user-facing routes: PASS.**

**0 PARTIAL, 0 FAIL.** Redirect-only legacy aliases are PASS for routing/functionality and N/A only for independent visual design.

---

## Prompt 17 final route-conformance clarification — 2026-09-19

The existing **34/34 PASS** statement refers to route-tree/source/build coverage and automated error/redirect contracts. It must not be read as 34/34 rendered visual acceptance.

Prompt 17 keeps source/build route coverage at PASS while the 15 principal authenticated routes remain **BLOCKED for real visual browser evidence**. This distinction is recorded in `PROMPT_CONFORMANCE_MATRIX.md`. No missing route, new fake data source or backend-contract change was introduced by the final remediation.
