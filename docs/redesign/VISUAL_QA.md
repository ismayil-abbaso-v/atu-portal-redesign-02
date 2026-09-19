# ATU Portal Redesign 02 — Visual QA

## Reference target

Primary desktop comparison target: **1536×864**.

Reference routes:

| Route | Contextual hero contract | Static contract |
|---|---|---|
| /ev | student + laptop + technology | PASS |
| /elektron-jurnal | academic-results desk | PASS |
| /teqvim | planner/calendar workspace | PASS |
| /imtahanlar | exam-preparation workspace | PASS |
| /sohbet | students collaborating | PASS |
| /kitabxana | library/books | PASS |
| /ofis | administrative office/documents | PASS |
| /bildirisler | notification visual | PASS |
| /menyu | settings/security workspace | PASS |
| /menyu/transkript | transcript/graduation | PASS |

The home innovation banner uses the dedicated innovation-lab asset rather than a university-building image.

## Static visual audit

Prompt 11 verifies that the expected hero asset exists for every reference route, and rejects oversized reference hero assets above 200 KB. It also rejects building/campus naming in the reference hero contract.

The shell and page implementations now consistently use the redesign's burgundy/white institutional language, contextual hero treatment, shared border/radius conventions and mobile route scoping.

## Pixel checklist status

The following items are represented in the implementation and were included in the QA source review:

1. sidebar width and active navigation treatment
2. logo placement
3. navigation row height
4. header height
5. search position
6. avatar/profile block
7. content left edge
8. hero hierarchy and crop rules
9. title and text hierarchy
10. card/grid proportions
11. right-side rails
12. section spacing
13. border/radius/shadow system
14. icon/button sizing
15. table/list density
16. bottom contextual banners
17. burgundy palette consistency
18. mobile adaptations

## Screenshot comparison status

A true screenshot side-by-side/pixel-diff was **not produced in CI**. The authenticated routes require a valid application session/data context, and the original reference screenshots are not stored in the repository as visual-regression fixtures.

Therefore:

- No false "pixel-perfect PASS" is claimed.
- Static visual contracts: **PASS**.
- Authenticated 1536×864 reference screenshot comparison: **MANUAL REVIEW REQUIRED**.
- The manual review should capture each reference route with production-like data and compare sidebar, header, hero, grid/card geometry, table density, whitespace and image crop to the supplied reference image.

This limitation does not affect the successful typecheck, tests or production build.
