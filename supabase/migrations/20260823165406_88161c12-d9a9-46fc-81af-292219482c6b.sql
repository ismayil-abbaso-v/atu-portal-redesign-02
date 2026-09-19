CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = _group_id AND gm.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_group_teacher(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE (c.group_id = _group_id OR EXISTS (SELECT 1 FROM public.course_groups cg WHERE cg.course_id = c.id AND cg.group_id = _group_id))
      AND (c.muellim_id = _user_id OR EXISTS (SELECT 1 FROM public.course_teachers ct WHERE ct.course_id = c.id AND ct.muellim_id = _user_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_teacher(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.muellim_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.course_teachers ct WHERE ct.course_id = _course_id AND ct.muellim_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_course_tutor(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.tyutor_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.courses c JOIN public.groups g ON g.id = c.group_id WHERE c.id = _course_id AND g.tyutor_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.course_groups cg JOIN public.groups g ON g.id = cg.group_id WHERE cg.course_id = _course_id AND g.tyutor_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_course_student(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_student_status s WHERE s.course_id = _course_id AND s.user_id = _user_id AND s.status = 'elave')
    OR (
      NOT EXISTS (SELECT 1 FROM public.course_student_status s WHERE s.course_id = _course_id AND s.user_id = _user_id AND s.status = 'kesilib')
      AND (
        EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.group_id IS NOT NULL AND public.is_group_member(c.group_id, _user_id))
        OR EXISTS (SELECT 1 FROM public.course_groups cg WHERE cg.course_id = _course_id AND public.is_group_member(cg.group_id, _user_id))
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of_student(_student_id uuid, _tutor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = _student_id AND g.tyutor_id = _tutor_id
  );
$$;

DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR muellim_id = auth.uid() OR tyutor_id = auth.uid()
  OR public.is_course_teacher(id, auth.uid())
  OR public.is_course_tutor(id, auth.uid())
  OR public.is_course_student(id, auth.uid())
);

DROP POLICY IF EXISTS groups_select ON public.groups;
CREATE POLICY groups_select ON public.groups FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR tyutor_id = auth.uid()
  OR public.is_group_member(id, auth.uid())
  OR public.is_group_teacher(id, auth.uid())
);

DROP POLICY IF EXISTS course_groups_select ON public.course_groups;
CREATE POLICY course_groups_select ON public.course_groups FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR public.is_group_member(group_id, auth.uid())
  OR public.is_course_teacher(course_id, auth.uid())
  OR public.is_course_tutor(course_id, auth.uid())
);

DROP POLICY IF EXISTS course_topics_select ON public.course_topics;
CREATE POLICY course_topics_select ON public.course_topics FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR public.is_course_teacher(course_id, auth.uid())
  OR public.is_course_tutor(course_id, auth.uid())
  OR public.is_course_student(course_id, auth.uid())
);

DROP POLICY IF EXISTS course_student_status_select ON public.course_student_status;
CREATE POLICY course_student_status_select ON public.course_student_status FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR user_id = auth.uid()
  OR public.is_course_teacher(course_id, auth.uid())
  OR public.is_course_tutor(course_id, auth.uid())
);

DROP POLICY IF EXISTS course_teachers_select ON public.course_teachers;
CREATE POLICY course_teachers_select ON public.course_teachers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
  OR muellim_id = auth.uid()
);

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'dekan')
  OR (public.has_role(auth.uid(), 'tyutor') AND public.is_tutor_of_student(user_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'dekan') THEN
    IF NEW.fin_kodu IS DISTINCT FROM OLD.fin_kodu OR NEW.bolme IS DISTINCT FROM OLD.bolme
      OR NEW.fakulte IS DISTINCT FROM OLD.fakulte OR NEW.qrup IS DISTINCT FROM OLD.qrup
      OR NEW.sinif IS DISTINCT FROM OLD.sinif OR NEW.tedris_ili IS DISTINCT FROM OLD.tedris_ili
      OR NEW.tehsil_novu IS DISTINCT FROM OLD.tehsil_novu OR NEW.dim_bali IS DISTINCT FROM OLD.dim_bali
      OR NEW.ixtisas IS DISTINCT FROM OLD.ixtisas OR NEW.qebul_ili IS DISTINCT FROM OLD.qebul_ili
      OR NEW.bitirme_ili IS DISTINCT FROM OLD.bitirme_ili OR NEW.tehsil_haqqi IS DISTINCT FROM OLD.tehsil_haqqi
      OR NEW.esd_istifadeci IS DISTINCT FROM OLD.esd_istifadeci THEN
      RAISE EXCEPTION 'Bu profil sahələrini yalnız admin dəyişə bilər';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    OR NEW.fin_kodu IS DISTINCT FROM OLD.fin_kodu OR NEW.bolme IS DISTINCT FROM OLD.bolme
    OR NEW.fakulte IS DISTINCT FROM OLD.fakulte OR NEW.qrup IS DISTINCT FROM OLD.qrup
    OR NEW.sinif IS DISTINCT FROM OLD.sinif OR NEW.tedris_ili IS DISTINCT FROM OLD.tedris_ili
    OR NEW.tehsil_novu IS DISTINCT FROM OLD.tehsil_novu OR NEW.dim_bali IS DISTINCT FROM OLD.dim_bali
    OR NEW.ixtisas IS DISTINCT FROM OLD.ixtisas OR NEW.qebul_ili IS DISTINCT FROM OLD.qebul_ili
    OR NEW.bitirme_ili IS DISTINCT FROM OLD.bitirme_ili OR NEW.tehsil_haqqi IS DISTINCT FROM OLD.tehsil_haqqi
    OR NEW.esd_istifadeci IS DISTINCT FROM OLD.esd_istifadeci THEN
    RAISE EXCEPTION 'Bu profil sahələrini yalnız admin dəyişə bilər';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_tutor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member_for_file(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamp with time zone, timestamp with time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_distinct_faculties() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_registration_trend(timestamp with time zone, timestamp with time zone, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_role_distribution(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_username(text) FROM authenticated;