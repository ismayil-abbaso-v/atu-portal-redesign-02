-- Dərs cədvəli qurucusu: interval toqquşması, sessiya rebuild-i və müəllim görünürlüğü

CREATE OR REPLACE FUNCTION private.validate_schedule_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_permissions jsonb;
  v_active jsonb;
BEGIN
  IF NOT private.is_course_group(NEW.course_id, NEW.group_id) THEN
    RAISE EXCEPTION 'Seçilən qrup bu fənnə təyin edilməyib.';
  END IF;

  IF NEW.dars_novu IS NULL THEN
    RAISE EXCEPTION 'Dərs cədvəli şablonunda dərs növü seçilməlidir.';
  END IF;

  SELECT ct.icazeler, c.aktiv_dars_novleri
    INTO v_permissions, v_active
  FROM public.course_teachers ct
  JOIN public.courses c ON c.id = ct.course_id
  WHERE ct.course_id = NEW.course_id
    AND ct.muellim_id = NEW.teacher_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müəllim bu fənnə təyin edilməyib.';
  END IF;

  IF NOT COALESCE((v_permissions ->> NEW.dars_novu)::boolean, false) THEN
    RAISE EXCEPTION 'Müəllimin seçilən dərs növü üçün icazəsi yoxdur.';
  END IF;

  IF NOT COALESCE((v_active ->> NEW.dars_novu)::boolean, false) THEN
    RAISE EXCEPTION 'Seçilən dərs növü bu fənn üçün aktiv deyil.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.course_schedule_templates existing
    WHERE existing.group_id = NEW.group_id
      AND existing.gun_nomresi = NEW.gun_nomresi
      AND (TG_OP = 'INSERT' OR existing.id <> NEW.id)
      AND existing.baslangic_saat < NEW.bitme_saat
      AND NEW.baslangic_saat < existing.bitme_saat
      AND (
        existing.hefte_novu = 'her_hefte'::public.schedule_week_type
        OR NEW.hefte_novu = 'her_hefte'::public.schedule_week_type
        OR existing.hefte_novu = NEW.hefte_novu
      )
  ) THEN
    RAISE EXCEPTION 'Bu qrup üçün seçilən gün və saat aralığında həftə növü ilə toqquşan dərs slotu var.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_schedule_template() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.prepare_schedule_template_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.course_lesson_sessions
    WHERE schedule_template_id = OLD.id
      AND NOT is_confirmed;
    RETURN OLD;
  END IF;

  IF NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.dars_novu IS DISTINCT FROM OLD.dars_novu
     OR NEW.gun_nomresi IS DISTINCT FROM OLD.gun_nomresi
     OR NEW.baslangic_saat IS DISTINCT FROM OLD.baslangic_saat
     OR NEW.bitme_saat IS DISTINCT FROM OLD.bitme_saat
     OR NEW.hefte_novu IS DISTINCT FROM OLD.hefte_novu THEN
    DELETE FROM public.course_lesson_sessions
    WHERE schedule_template_id = OLD.id
      AND NOT is_confirmed;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_schedule_template_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_prepare_schedule_template_change ON public.course_schedule_templates;
CREATE TRIGGER a_prepare_schedule_template_change
BEFORE UPDATE OR DELETE ON public.course_schedule_templates
FOR EACH ROW
EXECUTE FUNCTION private.prepare_schedule_template_change();

CREATE INDEX IF NOT EXISTS idx_course_schedule_templates_group_conflict
  ON public.course_schedule_templates(group_id, gun_nomresi, baslangic_saat, bitme_saat, hefte_novu);

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
    IF NOT public.has_role(v_uid, 'admin'::public.app_role)
       AND NOT public.has_role(v_uid, 'dekan'::public.app_role) THEN
      RAISE EXCEPTION 'Bütün qrupların cədvəlini yenidən qurmaq üçün admin/dekan icazəsi tələb olunur.';
    END IF;
  ELSE
    IF NOT public.has_role(v_uid, 'admin'::public.app_role)
       AND NOT public.has_role(v_uid, 'dekan'::public.app_role)
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

DROP POLICY IF EXISTS course_teachers_select ON public.course_teachers;
CREATE POLICY course_teachers_select
ON public.course_teachers
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR muellim_id = (SELECT auth.uid())
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
  OR public.is_course_student(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS profiles_select_course_teachers ON public.profiles;
CREATE POLICY profiles_select_course_teachers
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
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
