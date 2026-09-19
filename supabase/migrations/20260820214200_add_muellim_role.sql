-- 'muellim' enum value is added in migration 20260820214100_add_muellim_enum_value.sql,
-- which must run (and commit) before this file — a new enum value cannot be
-- referenced in the same transaction it was created in.

-- Add muellim_id to courses and copy existing tyutor_id to muellim_id
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS muellim_id uuid;
UPDATE public.courses SET muellim_id = tyutor_id WHERE muellim_id IS NULL;

-- Create course_groups helper table
CREATE TABLE IF NOT EXISTS public.course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  UNIQUE(course_id, group_id)
);

-- Enable RLS and grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_groups TO authenticated;
GRANT ALL ON public.course_groups TO service_role;
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;

-- course_groups policies
CREATE POLICY "course_groups_select" ON public.course_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "course_groups_write" ON public.course_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.muellim_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.muellim_id = auth.uid()
    )
  );

-- Update RLS policies for courses table
DROP POLICY IF EXISTS "courses_write" ON public.courses;
CREATE POLICY "courses_write" ON public.courses FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    tyutor_id = auth.uid() OR 
    (public.has_role(auth.uid(), 'muellim') AND muellim_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    tyutor_id = auth.uid() OR 
    (public.has_role(auth.uid(), 'muellim') AND muellim_id = auth.uid())
  );

-- Update RLS policies for exam_scores table
DROP POLICY IF EXISTS "exam_scores_select" ON public.exam_scores;
CREATE POLICY "exam_scores_select" ON public.exam_scores FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'dekan') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

DROP POLICY IF EXISTS "exam_scores_write" ON public.exam_scores;
CREATE POLICY "exam_scores_write" ON public.exam_scores FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

-- Update RLS policies for attendance table
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'dekan') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

DROP POLICY IF EXISTS "attendance_write" ON public.attendance;
CREATE POLICY "attendance_write" ON public.attendance FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

-- Update RLS policies for notes table
DROP POLICY IF EXISTS "notes_select" ON public.notes;
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'dekan') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

DROP POLICY IF EXISTS "notes_write" ON public.notes;
CREATE POLICY "notes_write" ON public.notes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()) OR 
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

-- Create faculty_stats view for DeanDashboard
CREATE OR REPLACE VIEW public.faculty_stats AS
SELECT 
  p.fakulte,
  COUNT(DISTINCT p.user_id) AS total_students,
  COALESCE(
    ROUND(
      100.0 * COUNT(CASE WHEN a.statusu = 'var' THEN 1 END) / NULLIF(COUNT(a.id), 0),
      1
    ),
    0
  ) AS avg_attendance,
  COALESCE(
    ROUND(AVG(e.yekun_qiymet), 1),
    0
  ) AS avg_score
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id AND ur.role = 'telebe'::public.app_role
LEFT JOIN public.attendance a ON p.user_id = a.user_id
LEFT JOIN public.exam_scores e ON p.user_id = e.user_id
GROUP BY p.fakulte;

GRANT SELECT ON public.faculty_stats TO authenticated;

-- Create group_stats view for DeanDashboard (ranking)
CREATE OR REPLACE VIEW public.group_stats AS
SELECT 
  p.qrup,
  p.fakulte,
  g.tyutor_id,
  (tp.ad || ' ' || tp.soyad) AS tyutor_ad_soyad,
  COUNT(DISTINCT p.user_id) AS total_students,
  COALESCE(
    ROUND(
      100.0 * COUNT(CASE WHEN a.statusu = 'var' THEN 1 END) / NULLIF(COUNT(a.id), 0),
      1
    ),
    0
  ) AS avg_attendance,
  COALESCE(
    ROUND(AVG(e.yekun_qiymet), 1),
    0
  ) AS avg_score
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id AND ur.role = 'telebe'::public.app_role
LEFT JOIN public.groups g ON p.qrup = g.ad
LEFT JOIN public.profiles tp ON g.tyutor_id = tp.user_id
LEFT JOIN public.attendance a ON p.user_id = a.user_id
LEFT JOIN public.exam_scores e ON p.user_id = e.user_id
WHERE p.qrup IS NOT NULL AND p.qrup <> ''
GROUP BY p.qrup, p.fakulte, g.tyutor_id, tp.ad, tp.soyad;

GRANT SELECT ON public.group_stats TO authenticated;
