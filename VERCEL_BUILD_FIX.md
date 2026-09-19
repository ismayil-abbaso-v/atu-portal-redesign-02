# Vercel build verification

The previous Vercel deployment was built from commit `06491cc`, where `src/routes/_authenticated/imtahanlar.tsx` had an unclosed `StudentView` JSX block. The route has since been corrected on `main`.

This file intentionally changes the repository so the Vercel Git integration creates a fresh deployment from the corrected `main` tree instead of relying on the previous deployment state.
