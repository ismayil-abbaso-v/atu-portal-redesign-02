-- Create upcoming exam schedule table
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

-- Enable RLS and grant authenticated users access through policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_schedule TO authenticated;
GRANT ALL ON public.exam_schedule TO service_role;
ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;

-- SELECT: students can see only their group's exams; tutor/teacher/admin/dekan can see all.
CREATE POLICY "exam_schedule_select" ON public.exam_schedule FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    public.has_role(auth.uid(), 'tyutor') OR
    public.has_role(auth.uid(), 'muellim') OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.group_id = exam_schedule.group_id
    )
  );

-- INSERT: only tutor for their own group, admin, or dekan.
CREATE POLICY "exam_schedule_insert" ON public.exam_schedule FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND
      EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = exam_schedule.group_id
          AND g.tyutor_id = auth.uid()
      )
    )
  );

-- UPDATE: only tutor for their own group, admin, or dekan.
CREATE POLICY "exam_schedule_update" ON public.exam_schedule FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND
      EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = exam_schedule.group_id
          AND g.tyutor_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND
      EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = exam_schedule.group_id
          AND g.tyutor_id = auth.uid()
      )
    )
  );

-- DELETE: only tutor for their own group, admin, or dekan.
CREATE POLICY "exam_schedule_delete" ON public.exam_schedule FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND
      EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = exam_schedule.group_id
          AND g.tyutor_id = auth.uid()
      )
    )
  );

-- Keep updated_at in sync with the project's existing timestamp trigger convention.
CREATE TRIGGER exam_schedule_updated_at
BEFORE UPDATE ON public.exam_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
