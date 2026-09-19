# ATU Portal Redesign 02 — Backend Lock

## Purpose

This file defines the non-negotiable boundary for the redesign. The redesign is a presentation-layer project. It must not become a backend rewrite, authorization rewrite, data migration, or integration rewrite.

Source repository: `ismayil-abbaso-v/Atu-portal@main`  
Audited source HEAD: `1d00870523497d272ee5490a286e12fa93e03a38`

## Locked systems

The following are locked unless a later task explicitly changes scope and separately authorizes backend work:

- PostgreSQL schema
- tables and columns
- enums
- views/materialized views
- foreign keys
- indexes
- triggers
- RLS policies
- grants
- security-definer helpers
- RPC behavior
- migration history
- Supabase Edge Functions
- Supabase project configuration
- auth contracts
- role model
- route authorization semantics
- realtime channels and event semantics
- storage bucket semantics
- official exam integration
- external result intake
- electronic journal scoring/grading rules
- calendar/exam permission boundaries
- notification delivery/data model
- username login contract

No migration may be run or created during the redesign phases described by the redesign plan. No Edge Function may be deployed.

## Secret boundary

The source repository contains or may contain a `.env` file. It was deliberately not opened during this audit.

Prohibited:

- reading `.env`
- copying it
- committing it
- printing it
- diffing it
- encoding it
- exposing secret values in documentation or UI
- moving service-role credentials into client code

Only non-secret example environment files may be used in the later baseline transfer.

The source Vite configuration contains public/publishable Supabase bootstrap values by design. Their existence does not authorize exposing private credentials. The server-side Supabase client separately depends on a service-role key and must remain server-only.

## Authentication lock

Preserve all existing auth flows, including:

- session detection
- protected parent-route behavior
- username login flow
- password-reset flow
- MFA assurance and verification
- MFA enrollment/unenrollment
- local/global logout
- auth state listeners
- server-function auth middleware

`src/routes/_authenticated/route.tsx` currently protects the authenticated tree with `supabase.auth.getUser()`. Do not replace this with purely visual/client-state gating.

`src/integrations/supabase/auth-middleware.ts` is part of the server-function security boundary. Do not bypass it.

## Role and route-permission lock

Application roles observed:

- `admin`
- `dekan`
- `muellim`
- `tyutor`
- `telebe`

Primary-role precedence is:

`admin > dekan > muellim > tyutor > telebe`

The following permission helpers are locked behavior:

- `icazəAdminVəYaDekan`
- `canAccessGroups`
- `canAccessTutorPanel`
- `canAccessGroup`
- `canAccessCourse`
- `canManageCourse`
- `canAccessTeacherCourse`
- `canAccessTeacherGroup`
- `canEditLessonSession`
- `canGradeLesson`
- `canGradeAssessment`
- `canViewStudentCourseData`
- `canMonitorJournal`
- `canManageExamSchedule`

A redesign may move controls visually, but it may not make a control available to a role that did not previously have the permission, nor remove an authoritative check and replace it with hidden UI.

## High-value database surfaces observed

The redesign depends on real backend data from, among others:

- `profiles`
- `user_roles`
- `groups`
- `group_members`
- `courses`
- `course_groups`
- `course_teachers`
- `course_topics`
- `course_lesson_sessions`
- `calendar_events`
- `exam_schedule`
- `exam_detailed_results`
- `exam_scores`
- `attendance`
- `notes`
- `chat_groups`
- `chat_group_members`
- `chat_messages`
- `chat_group_last_message`
- `announcements`
- `announcement_reads`
- `notifications`
- `notification_settings`
- `library_books`
- `office_files`
- `system_settings`
- `activity_logs`
- `sessions_log`

This list is descriptive, not permission to alter any of them.

## Storage surfaces observed

Important storage behavior includes buckets/assets for:

- avatars
- chat files
- office files
- library books
- library covers
- note files
- course materials

Signed URL, upload, delete and public URL behavior must remain semantically unchanged. A new visual upload component must use the existing storage path and permission model.

## Realtime lock

Realtime is not decorative. It is functional.

Observed examples include:

- notification INSERT/UPDATE subscriptions
- chat message INSERT subscriptions

Do not replace realtime behavior with polling solely to simplify redesigned UI. Do not rename channels/tables/events unless a separate backend task explicitly requires it.

## Electronic journal lock

The electronic journal contains server-authoritative rules and must not be reconstructed from client assumptions.

Observed RPC/server-function boundaries include:

- `calculate_semester_score`
- `can_grade_now`
- `confirm_lesson_grading`
- `get_week_parity`
- `at_risk_students`
- `generate_current_semester_lesson_sessions`
- `unlock_lesson_session`

The redesign may change cards, tables, tabs and responsive rendering. It may not change grading math, edit windows, teacher ownership, roster scope or authoritative server-time logic.

## Exams and official integration lock

Do not alter:

- official exam client/server integration
- result synchronization behavior
- result intake API behavior
- exam schedule authorization
- teacher/tutor/admin role dispatch
- grading business rules
- student result interpretation

Visual status labels must derive from existing data/view models rather than inventing new backend states.

## Calendar lock

The calendar currently merges multiple event sources. It also has real create/update/delete mutations for allowed roles.

A redesigned calendar may reorganize presentation, but must preserve:

- source event identity
- month/date logic
- group/teacher/student scope
- existing mutation payloads
- permission/RLS expectations

Do not create a new event category schema merely because a reference screenshot contains a category chip.

## Notification lock

Preserve:

- user-specific notification query semantics
- realtime updates
- unread count
- optimistic mark-as-read
- mark-all-read
- routing metadata
- announcement read state
- notification settings persistence

Do not implement visually appealing notification counts with fake local-only state.

## Profile/security lock

Preserve:

- profile persistence
- avatar storage behavior
- MFA
- active session management
- password change
- session revocation
- sign-out semantics

Security UI may be redesigned, but security operations may not be approximated or mocked.

## Allowed presentation-layer work

Allowed later:

- JSX composition
- CSS/Tailwind classes
- semantic design tokens
- reusable visual primitives
- responsive layout
- icon changes using the existing icon stack
- accessible labels and focus improvements
- animation/motion
- skeleton/empty/error presentation
- image assets for contextual hero art
- presentational adapters that do not change query semantics

## Change-control rule

If a visual requirement appears to require a backend change:

1. stop that backend part;
2. preserve current behavior;
3. document the mismatch;
4. implement the closest safe visual representation;
5. request explicit backend scope in a separate task if truly necessary.

Redesign convenience is never sufficient justification for changing security or data contracts.
