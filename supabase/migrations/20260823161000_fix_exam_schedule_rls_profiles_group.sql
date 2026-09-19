-- Fix exam_schedule RLS: profiles does not contain group_id.
-- Student-to-group membership is stored in group_members.

DROP POLICY IF EXISTS "exam_schedule_select" ON public.exam_schedule;

CREATE POLICY "exam_schedule_select" ON public.exam_schedule
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  public.has_role(auth.uid(), 'tyutor') OR
  public.has_role(auth.uid(), 'muellim') OR
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = exam_schedule.group_id
      AND gm.user_id = auth.uid()
  )
);
