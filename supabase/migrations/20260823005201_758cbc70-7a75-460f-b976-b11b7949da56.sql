-- 1) Username → user_id axtarışı. Login axtarışı olan get_email_by_username
-- funksiyası ilə TAM EYNİ normallaşdırma məntiqi: lower(trim(...)) hər iki tərəfdə.
-- Yalnız service_role (Edge Function / server route) çağıra bilər.
CREATE OR REPLACE FUNCTION public.get_user_id_by_username(p_istifadeci_adi text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.profiles
  WHERE lower(istifadeci_adi) = lower(trim(p_istifadeci_adi))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_username(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_username(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_username(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_username(text) TO service_role;

-- 2) Sinxronizasiya cəhdlərinin audit cədvəli: Layihə 1-dən gələn hər cəhd
-- (uğurlu və uğursuz) buraya yazılır. Username uyğunsuzluğu olan cəhdlər
-- success=false, error_message='profile_not_found' ilə görünür.
CREATE TABLE IF NOT EXISTS public.exam_sync_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_result_id text,
  student_username_raw text,
  student_username_normalized text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sync_attempts_created
  ON public.exam_sync_attempts(created_at DESC);

GRANT SELECT ON public.exam_sync_attempts TO authenticated;
GRANT ALL ON public.exam_sync_attempts TO service_role;

ALTER TABLE public.exam_sync_attempts ENABLE ROW LEVEL SECURITY;

-- Audit cədvəlini yalnız admin/dekan/tyutor oxuya bilər.
CREATE POLICY "exam_sync_attempts_select" ON public.exam_sync_attempts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dekan')
    OR public.has_role(auth.uid(), 'tyutor')
  );