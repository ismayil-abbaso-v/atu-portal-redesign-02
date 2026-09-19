-- Tyutor cədvəl şablonunu yalnız öz qrupunda dəyişə bilər.

DROP POLICY IF EXISTS course_schedule_templates_insert ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_insert
ON public.course_schedule_templates
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = course_schedule_templates.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS course_schedule_templates_update ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_update
ON public.course_schedule_templates
FOR UPDATE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = course_schedule_templates.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = course_schedule_templates.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS course_schedule_templates_delete ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_delete
ON public.course_schedule_templates
FOR DELETE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = course_schedule_templates.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);