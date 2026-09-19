-- ============================================================
-- Bilet İmtahan Portalından (Layihə 1) gələn nəticələrdə imtahanın
-- başladığı vaxtı (exam_started_at) da saxlayır. `exam_completed_at`
-- ilə birlikdə tələbənin imtahanı hansı müddətdə başa vurduğunu
-- (Müddət) hesablamaq üçün istifadə olunur.
-- ============================================================

ALTER TABLE public.exam_detailed_results
  ADD COLUMN IF NOT EXISTS exam_started_at timestamptz;

COMMENT ON COLUMN public.exam_detailed_results.exam_started_at IS
  'İmtahanın başladığı vaxt (Layihə 1-dəki official_exam_results.started_at). Müddət = exam_completed_at - exam_started_at.';
