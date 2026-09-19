-- Təqvim/cədvəl redaktəsini yalnız admin və tyutora məhdudlaşdırır,
-- müəllim profil görünürlüğünü mövcud SELECT siyasətinə birləşdirir.

DROP POLICY IF EXISTS course_schedule_templates_insert ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_insert
ON public.course_schedule_templates
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS course_schedule_templates_update ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_update
ON public.course_schedule_templates
FOR UPDATE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS course_schedule_templates_delete ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_delete
ON public.course_schedule_templates
FOR DELETE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
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

CREATE OR REPLACE FUNCTION public.rebuild_current_semester_lesson_sessions(p_group_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autentifikasiya tələb olunur.';
  END IF;

  IF p_group_id IS NULL THEN
    IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Bütün qrupların cədvəlini yenidən qurmaq üçün admin icazəsi tələb olunur.';
    END IF;
  ELSE
    IF NOT public.has_role(v_uid, 'admin'::public.app_role)
       AND NOT EXISTS (
         SELECT 1
         FROM public.groups g
         WHERE g.id = p_group_id
           AND g.tyutor_id = v_uid
       ) THEN
      RAISE EXCEPTION 'Bu qrupun dərs cədvəlini yenidən qurmağa icazəniz yoxdur.';
    END IF;
  END IF;

  DELETE FROM public.course_lesson_sessions s
  WHERE NOT s.is_confirmed
    AND s.schedule_template_id IS NOT NULL
    AND (p_group_id IS NULL OR s.group_id = p_group_id);

  RETURN public.generate_current_semester_lesson_sessions(NULL, p_group_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_current_semester_lesson_sessions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rebuild_current_semester_lesson_sessions(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_select_course_teachers ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND public.is_tutor_of_student(user_id, (SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1
    FROM public.course_teachers ct
    WHERE ct.muellim_id = profiles.user_id
      AND (
        public.is_course_teacher(ct.course_id, (SELECT auth.uid()))
        OR public.is_course_tutor(ct.course_id, (SELECT auth.uid()))
        OR public.is_course_student(ct.course_id, (SELECT auth.uid()))
      )
  )
);