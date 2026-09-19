CREATE OR REPLACE FUNCTION public.at_risk_students(p_group_id uuid)
RETURNS TABLE(
  user_id uuid,
  ad text,
  soyad text,
  course_id uuid,
  course_ad text,
  qayib_sayi bigint,
  qayib_limiti integer,
  telefon text,
  e_poct text,
  qrup text,
  fakulte text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::public.app_role)
     AND NOT public.has_role(v_uid, 'dekan'::public.app_role)
     AND NOT public.is_group_teacher(p_group_id, v_uid)
     AND NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = p_group_id AND g.tyutor_id = v_uid) THEN
    RAISE EXCEPTION 'Bu qrup üçün risk siyahısını görmək icazəniz yoxdur.';
  END IF;

  RETURN QUERY
  WITH group_courses AS (
    SELECT c.id AS course_id, c.ad AS course_ad
    FROM public.courses c
    WHERE c.group_id = p_group_id
    UNION
    SELECT c.id, c.ad
    FROM public.course_groups cg
    JOIN public.courses c ON c.id = cg.course_id
    WHERE cg.group_id = p_group_id
  ), students AS (
    SELECT gm.user_id, p.ad, p.soyad, p.telefon, p.e_poct,
           COALESCE(p.qrup, g.ad) AS qrup, p.fakulte
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    JOIN public.profiles p ON p.user_id = gm.user_id
    WHERE gm.group_id = p_group_id
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = gm.user_id AND ur.role = 'telebe'::public.app_role
      )
  )
  SELECT st.user_id, st.ad, st.soyad,
         gc.course_id, gc.course_ad,
         absences.qayib_sayi,
         public.absence_limit(hours.total_hours) AS qayib_limiti,
         st.telefon, st.e_poct, st.qrup, st.fakulte
  FROM students st
  CROSS JOIN group_courses gc
  CROSS JOIN LATERAL (
    SELECT count(*) FILTER (
      WHERE r.attendance_status = 'qayıb'::public.lesson_attendance_status
    )::bigint AS qayib_sayi
    FROM public.lesson_student_records r
    JOIN public.course_lesson_sessions s
      ON s.id = r.lesson_session_id
     AND s.is_confirmed IS TRUE
    WHERE r.student_id = st.user_id
      AND r.course_id = gc.course_id
      AND s.group_id = p_group_id
  ) absences
  CROSS JOIN LATERAL (
    SELECT public.course_effective_total_hours(gc.course_id, st.user_id) AS total_hours
  ) hours
  WHERE absences.qayib_sayi > public.absence_limit(hours.total_hours)
  ORDER BY st.soyad NULLS LAST, st.ad NULLS LAST, gc.course_ad;
END;
$$;

REVOKE ALL ON FUNCTION public.at_risk_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.at_risk_students(uuid) TO authenticated, service_role;
