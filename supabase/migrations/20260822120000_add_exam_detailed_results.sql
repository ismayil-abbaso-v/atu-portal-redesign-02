-- ============================================================
-- Bilet İmtahan Portalından sinxronlaşan detallı imtahan nəticələri
-- (hər sual, tələbənin cavabı, AI qiymətləndirməsi daxil olmaqla)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exam_detailed_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mənbə sistemdəki (Bilet İmtahan Portalı) original qeydin ID-si.
  -- Eyni nəticə təkrar göndərilsə (retry) bu sahə dublikatın qarşısını alır.
  source_result_id uuid NOT NULL UNIQUE,

  -- auth.users.id (auth.uid()) — mövcud exam_scores.user_id pattern-i ilə eynidir
  student_id uuid NOT NULL,
  student_username text NOT NULL,

  exam_name text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'test' CHECK (exam_type IN ('test', 'ticket')),

  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  unanswered_count integer NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  current_score numeric NOT NULL DEFAULT 0,
  semester_score_snapshot numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,

  -- Test: [{question:{text,imageUrl,options}, selectedIndex, correctIndex}]
  -- Bilet: [{question:{text,imageUrl}, answer, images[], score, feedback}]
  answers_data jsonb NOT NULL DEFAULT '[]'::jsonb,

  exam_completed_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_detailed_results_student
  ON public.exam_detailed_results(student_id);

CREATE INDEX IF NOT EXISTS idx_exam_detailed_results_username
  ON public.exam_detailed_results(student_username);

GRANT SELECT ON public.exam_detailed_results TO authenticated;
GRANT ALL ON public.exam_detailed_results TO service_role;

ALTER TABLE public.exam_detailed_results ENABLE ROW LEVEL SECURITY;

-- Tələbə yalnız öz nəticəsini görür; admin/dekan/tyutor hamısını görür.
-- Yazma (INSERT/UPDATE) yalnız service_role vasitəsilə (Edge Function) baş verir,
-- ona görə authenticated rol üçün ayrıca INSERT/UPDATE policy YOXDUR.
CREATE POLICY "exam_detailed_results_select" ON public.exam_detailed_results
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dekan')
    OR public.has_role(auth.uid(), 'tyutor')
  );
