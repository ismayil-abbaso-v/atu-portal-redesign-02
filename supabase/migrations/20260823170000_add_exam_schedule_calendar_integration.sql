-- Exam schedule records used by tutors and the student calendar.
CREATE TABLE IF NOT EXISTS public.exam_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  imtahan_tarixi date NOT NULL,
  baslangic_saat time NOT NULL,
  otaq text NOT NULL,
  yaradan_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_schedule TO authenticated;
GRANT ALL ON public.exam_schedule TO service_role;
ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_schedule_select" ON public.exam_schedule;
CREATE POLICY "exam_schedule_select" ON public.exam_schedule FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = exam_schedule.group_id AND gm.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = exam_schedule.group_id AND g.tyutor_id = auth.uid()) OR
  yaradan_id = auth.uid()
);

DROP POLICY IF EXISTS "exam_schedule_insert" ON public.exam_schedule;
CREATE POLICY "exam_schedule_insert" ON public.exam_schedule FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  (
    public.has_role(auth.uid(), 'tyutor') AND
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = exam_schedule.group_id AND g.tyutor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "exam_schedule_update" ON public.exam_schedule;
CREATE POLICY "exam_schedule_update" ON public.exam_schedule FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  yaradan_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  (
    public.has_role(auth.uid(), 'tyutor') AND
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = exam_schedule.group_id AND g.tyutor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "exam_schedule_delete" ON public.exam_schedule;
CREATE POLICY "exam_schedule_delete" ON public.exam_schedule FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  yaradan_id = auth.uid()
);

DROP TRIGGER IF EXISTS exam_schedule_updated_at ON public.exam_schedule;
CREATE TRIGGER exam_schedule_updated_at
BEFORE UPDATE ON public.exam_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS exam_schedule_group_date_idx
  ON public.exam_schedule (group_id, imtahan_tarixi);
CREATE INDEX IF NOT EXISTS exam_schedule_course_date_idx
  ON public.exam_schedule (course_id, imtahan_tarixi);