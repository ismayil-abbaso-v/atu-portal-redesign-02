-- Müəllim/tələbə təqvimdə yalnız baxış rejimində qalır.
-- Manual calendar_events yazma əməliyyatları admin/dekan və yalnız öz qrupunda tyutora açıqdır.

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = calendar_events.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = calendar_events.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = calendar_events.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = calendar_events.group_id
        AND g.tyutor_id = (SELECT auth.uid())
    )
  )
);
