# ATU Portal Redesign 02 — Regression QA

## Automated results

QA baseline: `6be94c49d1cf561152cc44fef1bdc15a1ad99064`.

- Typecheck: **PASS**
- Regression suite: **72 PASS / 0 FAIL**
- Production build: **PASS**
- Prompt 11 static QA: **PASS**
- Build verification: **PASS**
- Prompt 2 validation: **PASS**
- Prompt 3 validation: **PASS**
- Prompt 5 validation: **PASS**
- Prompt 6 validation: **PASS**
- Prompt 7 validation: **PASS**
- Prompt 8 verification/redesign validation: **PASS**
- Prompt 9 validation: **PASS**
- Prompt 10 mobile validation: **PASS**

The 72-test suite spans 8 test files covering electronic journal, schedules, localization, notification hub, tutor localization, official-exam integration, official-result synchronization and exam-material localization.

## Functional areas protected by existing code/contracts

The redesign did not intentionally rewrite the backend contracts for:

- login/logout and auth routing
- role routing
- profile data
- notifications and mark-read behavior
- calendar data
- exam data/materials/results
- realtime chat and file transfer
- library queries
- office file operations
- transcript data
- role-based admin/teacher/tutor/faculty workspaces

Prompt 11's corrections are presentation/accessibility/regression fixes only.

## Browser smoke-test limitation

An end-to-end authenticated smoke run covering login, message sending, deep-linked dynamic entities, profile mutation and server-backed empty/error states was not executed in the CI workflow because production credentials/test accounts are not committed and must not be introduced solely for QA.

Accordingly, the automated result is a source/build/regression **PASS**, while an authenticated staging smoke test remains a recommended release gate.

## Repository-wide lint

Repository-wide lint currently reports 6548 issues (6536 errors, 12 warnings). The workflow records this as inherited baseline debt and continues; scoped Prompt 11 semantic lint passes. This report does not describe repository-wide lint as passing.
