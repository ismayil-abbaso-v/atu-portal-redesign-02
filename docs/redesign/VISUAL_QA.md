# ATU Portal Redesign 02 — Visual QA

## Prompt 15 execution status

Prompt 15 was executed on 2026-09-19 against commit `82411a0f356fb0f448915be3ed7a466cd6ac1d53`.

| Check | Result | Evidence |
|---|---|---|
| Production build and typecheck | PASS | `npm run build` |
| Automated unit suite | PASS | `npm test` |
| Static redesign contracts | PASS | `node scripts/prompt11-static-qa.mjs` |
| Real browser bootstrap | PASS | Chrome CDP session created |
| Local preview navigation | BLOCKED | Cloud browser rejected `http://127.0.0.1:5173/` with `net::ERR_BLOCKED_BY_CLIENT` |
| Authenticated route capture | BLOCKED | No safe demo/test identity or authenticated storage state is supplied by the repository |
| Reference pixel comparison | BLOCKED | Original reference screenshots are not stored as named fixtures in the repository |

No route or viewport is reported as visually passing without a rendered screenshot. The exact capture inventory and retry contract live in [`visual-qa/README.md`](./visual-qa/README.md) and [`visual-qa/manifest.json`](./visual-qa/manifest.json).

## Reference target

The primary desktop comparison target remains **1536×864**. Prompt 15 expands coverage to six desktop, three tablet and seven mobile widths.

| Route | Contextual hero contract | Static contract | Rendered comparison |
|---|---|---:|---:|
| `/ev` | student + laptop + technology | PASS | BLOCKED |
| `/elektron-jurnal` | academic-results desk | PASS | BLOCKED |
| `/teqvim` | planner/calendar workspace | PASS | BLOCKED |
| `/imtahanlar` | exam-preparation workspace | PASS | BLOCKED |
| `/sohbet` | students collaborating | PASS | BLOCKED |
| `/kitabxana` | library/books | PASS | BLOCKED |
| `/ofis` | administrative office/documents | PASS | BLOCKED |
| `/bildirisler` | notification visual | PASS | BLOCKED |
| `/menyu` | settings/security workspace | PASS | BLOCKED |
| `/menyu/transkript` | transcript/graduation | PASS | BLOCKED |
| `/menyu/profil` | profile workspace | PASS | BLOCKED |
| `/menyu/tehlukesizlik` | security workspace | PASS | BLOCKED |
| `/menyu/bildiris` | notification settings | PASS | BLOCKED |
| `/menyu/gorunus` | appearance settings | PASS | BLOCKED |
| `/menyu/yardim` | help/support workspace | PASS | BLOCKED |

The home innovation banner uses the dedicated innovation-lab asset rather than a university-building image.

## Static visual audit

The static audit verifies that every route has its expected contextual asset, rejects oversized reference hero assets above 200 KB, and rejects campus/building substitutions in the hero contract. It also checks the redesign shell, route-scoped responsive styles, mobile navigation semantics and asset integrity.

Source review covers sidebar and header geometry, content alignment, hero crop rules, typography, card/grid proportions, rails, spacing, border/radius/shadow tokens, controls, table/list density, banners, palette and mobile adaptations.

## Acceptance boundary

Static checks are not a substitute for screenshots. Final visual acceptance requires:

1. a safe authenticated test session with production-like data;
2. an externally reachable preview of the exact commit under review;
3. named reference images mapped to routes;
4. all manifest captures at their exact viewport dimensions;
5. inspection for overflow, clipping, fixed-element overlap, hero collisions, touch targets and reference drift.

Until those inputs exist, Prompt 15 is **engineering-complete but visual acceptance BLOCKED**. No global `overflow-x: hidden` workaround was added and no speculative CSS change was made from an unrendered page.

---

## Prompt 17 final conformance update — 2026-09-19

Prompt 17 re-audited the current target after Prompts 14–16 and closed two source-level responsive inconsistencies: the base `src/styles.css` still imposed `body { min-width: 320px; }`, and `src/routes/__root.tsx` still globally hid horizontal overflow on `html, body`. The final remediation changes the base minimum width to `0` and removes the RootShell clipping workaround. Intentional horizontal scrolling/containment remains component-scoped, so overflow defects cannot be hidden globally.

The final browser verdict remains **BLOCKED**, not PASS. GitHub reports a successful Vercel status on the Prompt 16 parent commit, but the connected Vercel API currently returns no discoverable project and no retrievable deployment URL. The repository also contains no safe authenticated QA identity and no machine-readable original reference fixture set. Therefore no new 1536×864, tablet or mobile screenshot/pixel-diff claim is fabricated.

Final source/build evidence is centralized in `PROMPT_CONFORMANCE_MATRIX.md` and enforced by `scripts/prompt17-conformance-audit.mjs`.
