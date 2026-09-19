-- Elektron Jurnal yekun RLS auditi.
-- 20260829072425, 20260829072810 və 20260829072858 canlı hotfix-lərinin yekun
-- vəziyyəti bu faylda da birləşdirilib ki yeni mühit sıfırdan deterministik qurulsun.

CREATE OR REPLACE FUNCTION private.ejournal_is_course_teacher(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_teachers ct
    WHERE ct.course_id = p_course_id AND ct.muellim_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.ejournal_is_course_group_tutor(p_course_id uuid, p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.tyutor_id = p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = p_group_id AND g.tyutor_id = p_user_id
        AND (
          EXISTS (SELECT 1 FROM public.course_groups cg WHERE cg.course_id=p_course_id AND cg.group_id=p_group_id)
          OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id=p_course_id AND c.group_id=p_group_id)
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.ejournal_is_student_course_tutor(p_course_id uuid, p_student_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id=p_course_id AND c.tyutor_id=p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id=gm.group_id AND g.tyutor_id=p_user_id
      WHERE gm.user_id=p_student_id
        AND (
          EXISTS (SELECT 1 FROM public.course_groups cg WHERE cg.course_id=p_course_id AND cg.group_id=gm.group_id)
          OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id=p_course_id AND c.group_id=gm.group_id)
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_can_assess_course_at(
  p_course_id uuid,
  p_teacher_id uuid,
  p_now timestamptz,
  p_required_lesson_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_lesson_sessions s
    JOIN public.course_teachers ct
      ON ct.course_id=s.course_id AND ct.muellim_id=p_teacher_id
    WHERE s.course_id=p_course_id
      AND s.teacher_id=p_teacher_id
      AND s.dars_novu IS NOT NULL
      AND (p_required_lesson_type IS NULL OR s.dars_novu=p_required_lesson_type)
      AND COALESCE((ct.icazeler ->> s.dars_novu)::boolean, false)
      AND private.grade_time_window_contains(s.starts_at, s.ends_at, p_now)
  );
$$;

REVOKE ALL ON FUNCTION private.ejournal_is_course_teacher(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ejournal_is_course_group_tutor(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ejournal_is_student_course_tutor(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.teacher_can_assess_course_at(uuid,uuid,timestamptz,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ejournal_is_course_teacher(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$ SELECT private.ejournal_is_course_teacher(p_course_id, auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.ejournal_is_course_group_tutor(p_course_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$ SELECT private.ejournal_is_course_group_tutor(p_course_id, p_group_id, auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.ejournal_is_student_course_tutor(p_course_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$ SELECT private.ejournal_is_student_course_tutor(p_course_id, p_student_id, auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.ejournal_can_assess_course_now(p_course_id uuid, p_required_lesson_type text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
  SELECT private.ejournal_is_course_teacher(p_course_id, auth.uid())
     AND private.teacher_can_assess_course_at(p_course_id, auth.uid(), now(), p_required_lesson_type);
$$;

REVOKE ALL ON FUNCTION public.ejournal_is_course_teacher(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ejournal_is_course_group_tutor(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ejournal_is_student_course_tutor(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ejournal_can_assess_course_now(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ejournal_is_course_teacher(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ejournal_is_course_group_tutor(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ejournal_is_student_course_tutor(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ejournal_can_assess_course_now(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_week_parity(p_date date)
RETURNS public.academic_week_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_first public.academic_week_type;
  v_anchor date;
BEGIN
  SELECT ss.birinci_hefte_novu, ss.hefte_rotasiya_baslama_tarixi
  INTO v_first, v_anchor
  FROM public.system_settings ss
  ORDER BY ss.updated_at DESC NULLS LAST, ss.created_at DESC NULLS LAST
  LIMIT 1;
  RETURN private.week_parity_from_anchor(p_date, v_anchor, v_first);
END;
$$;
REVOKE ALL ON FUNCTION public.get_week_parity(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_week_parity(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_assessment_write_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_required_type text := NULL;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN NEW; END IF;

  IF TG_OP='UPDATE' AND (
    NEW.course_id IS DISTINCT FROM OLD.course_id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.sira IS DISTINCT FROM OLD.sira
  ) THEN
    RAISE EXCEPTION 'Qiymətləndirmə sətrinin fənn/tələbə/sıra sahələri dəyişdirilə bilməz.';
  END IF;

  IF TG_TABLE_NAME IN ('independent_work_assessments','course_work_assessments')
     AND v_uid=NEW.student_id
     AND public.has_role(v_uid,'telebe'::public.app_role)
     AND public.is_course_student(NEW.course_id,v_uid) THEN
    RETURN NEW;
  END IF;

  IF public.has_role(v_uid,'tyutor'::public.app_role)
     AND private.ejournal_is_student_course_tutor(NEW.course_id,NEW.student_id,v_uid) THEN
    RETURN NEW;
  END IF;

  IF public.has_role(v_uid,'muellim'::public.app_role)
     AND private.ejournal_is_course_teacher(NEW.course_id,v_uid) THEN
    v_required_type := CASE TG_TABLE_NAME
      WHEN 'independent_work_assessments' THEN 'serbest_is'
      WHEN 'colloquium_assessments' THEN 'kollokvium'
      ELSE NULL
    END;
    IF private.teacher_can_assess_course_at(NEW.course_id,v_uid,now(),v_required_type) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Qiymətləndirmə yalnız uyğun dərsin aktiv ±5 dəqiqəlik pəncərəsində aparıla bilər.';
  END IF;

  RAISE EXCEPTION 'Bu qiymətləndirmə sətrini dəyişmək icazəniz yoxdur.';
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_student_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_legacy_prefix text;
  v_expected_prefix text;
  v_required_type text := NULL;
BEGIN
  IF v_uid IS NULL OR v_uid<>NEW.student_id OR NOT public.has_role(v_uid,'telebe'::public.app_role) THEN RETURN NEW; END IF;
  IF public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN NEW; END IF;

  IF public.has_role(v_uid,'tyutor'::public.app_role)
     AND private.ejournal_is_student_course_tutor(NEW.course_id,NEW.student_id,v_uid) THEN RETURN NEW; END IF;

  v_required_type := CASE TG_TABLE_NAME WHEN 'independent_work_assessments' THEN 'serbest_is' ELSE NULL END;
  IF public.has_role(v_uid,'muellim'::public.app_role)
     AND private.ejournal_is_course_teacher(NEW.course_id,v_uid)
     AND private.teacher_can_assess_course_at(NEW.course_id,v_uid,now(),v_required_type) THEN RETURN NEW; END IF;

  IF NOT public.is_course_student(NEW.course_id,v_uid) THEN RAISE EXCEPTION 'Bu fənn üzrə təqdimat etmək icazəniz yoxdur.'; END IF;
  IF NEW.grade IS NOT NULL THEN RAISE EXCEPTION 'Tələbə qiymət sahəsinə toxuna bilməz.'; END IF;
  IF NEW.status='qiymetlendirilib'::public.assessment_submission_status THEN
    RAISE EXCEPTION 'Qiymətləndirilib statusunu yalnız səlahiyyətli əməkdaş təyin edə bilər.';
  END IF;

  IF TG_OP='UPDATE' THEN
    IF NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.sira IS DISTINCT FROM OLD.sira
       OR NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.topic IS DISTINCT FROM OLD.topic THEN
      RAISE EXCEPTION 'Tələbə qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
    IF OLD.file_url IS NOT NULL OR OLD.submitted_at IS NOT NULL OR OLD.status<>'gozleyir'::public.assessment_submission_status THEN
      RAISE EXCEPTION 'Artıq təhvil vermisiniz.';
    END IF;
  END IF;

  IF NEW.topic_id IS NULL OR NEW.file_url IS NULL OR NEW.submitted_at IS NULL OR NEW.status<>'teqdim_edilib'::public.assessment_submission_status THEN
    RAISE EXCEPTION 'Təqdimat üçün mövzu, fayl və təqdim edilmə vaxtı birlikdə yazılmalıdır.';
  END IF;

  v_legacy_prefix := NEW.student_id::text || '/' || NEW.course_id::text || '/';
  v_expected_prefix := 'course-materials/' || NEW.course_id::text || '/student-submissions/' || NEW.student_id::text || '/';
  IF position(v_legacy_prefix IN NEW.file_url)=1 THEN
    NEW.file_url := v_expected_prefix || substring(NEW.file_url FROM length(v_legacy_prefix)+1);
  END IF;
  IF position(v_expected_prefix IN NEW.file_url)<>1 THEN RAISE EXCEPTION 'Təqdimat fayl yolu tələbə və fənn qovluğuna uyğun deyil.'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_student_lesson_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_type public.course_grading_type;
  v_legacy_prefix text;
  v_expected_prefix text;
BEGIN
  IF v_uid IS NULL OR v_uid<>NEW.student_id OR NOT public.has_role(v_uid,'telebe'::public.app_role) THEN RETURN NEW; END IF;
  IF public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN NEW; END IF;

  IF public.has_role(v_uid,'muellim'::public.app_role)
     AND private.ejournal_is_course_teacher(NEW.course_id,v_uid)
     AND private.teacher_can_grade_lesson_at(NEW.lesson_session_id,v_uid,now()) THEN RETURN NEW; END IF;

  IF TG_OP='UPDATE' THEN
    IF NEW.lesson_session_id IS DISTINCT FROM OLD.lesson_session_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status
       OR NEW.grade IS DISTINCT FROM OLD.grade THEN
      RAISE EXCEPTION 'Tələbə davamiyyət, qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
    IF OLD.file_url IS NOT NULL OR OLD.lab_submitted IS TRUE THEN RAISE EXCEPTION 'Artıq təhvil vermisiniz.'; END IF;
  ELSE
    IF NEW.attendance_status IS NOT NULL OR NEW.grade IS NOT NULL THEN RAISE EXCEPTION 'Tələbə davamiyyət və qiymət sahələrini yaza bilməz.'; END IF;
  END IF;

  SELECT c.qiymetlendirme_novu INTO v_type FROM public.courses c WHERE c.id=NEW.course_id;
  IF v_type<>'laboratoriya'::public.course_grading_type THEN RAISE EXCEPTION 'Bu fənn laboratoriya tipli deyil.'; END IF;
  IF NEW.file_url IS NULL OR NEW.lab_submitted IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Laboratoriya təqdimatında fayl və təhvil statusu birlikdə yazılmalıdır.'; END IF;

  v_legacy_prefix := NEW.student_id::text || '/' || NEW.course_id::text || '/';
  v_expected_prefix := 'course-materials/' || NEW.course_id::text || '/student-submissions/' || NEW.student_id::text || '/';
  IF position(v_legacy_prefix IN NEW.file_url)=1 THEN
    NEW.file_url := v_expected_prefix || substring(NEW.file_url FROM length(v_legacy_prefix)+1);
  END IF;
  IF position(v_expected_prefix IN NEW.file_url)<>1 THEN RAISE EXCEPTION 'Laboratoriya fayl yolu tələbə və fənn qovluğuna uyğun deyil.'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_lesson_student_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_session_id uuid;
  v_course_id uuid;
  v_student_id uuid;
  v_confirmed boolean;
  v_type public.course_grading_type;
  v_group_id uuid;
BEGIN
  IF TG_OP='DELETE' THEN
    v_session_id:=OLD.lesson_session_id; v_course_id:=OLD.course_id; v_student_id:=OLD.student_id;
  ELSE
    v_session_id:=NEW.lesson_session_id; v_course_id:=NEW.course_id; v_student_id:=NEW.student_id;
  END IF;
  SELECT s.is_confirmed,s.group_id INTO v_confirmed,v_group_id FROM public.course_lesson_sessions s WHERE s.id=v_session_id;
  IF COALESCE(v_confirmed,false) THEN RAISE EXCEPTION 'Təsdiqlənmiş sessiyanın tələbə qeydi dəyişdirilə bilməz.'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id=v_group_id AND gm.user_id=v_student_id)
     OR NOT public.is_course_student(v_course_id,v_student_id) THEN
    RAISE EXCEPTION 'Tələbə bu sessiyanın qrup/fənn tərkibində deyil.';
  END IF;
  SELECT c.qiymetlendirme_novu INTO v_type FROM public.courses c WHERE c.id=v_course_id;
  IF v_type='meshgele'::public.course_grading_type AND NEW.lab_submitted IS NOT NULL THEN RAISE EXCEPTION 'Məşğələ tipli fənndə lab_submitted istifadə edilmir.'; END IF;
  IF v_type='laboratoriya'::public.course_grading_type AND NEW.grade IS NOT NULL THEN RAISE EXCEPTION 'Laboratoriya tipli fənndə gündəlik grade istifadə edilmir.'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_lesson_record_write_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $$
DECLARE
  v_uid uuid:=auth.uid();
  v_changed boolean:=false;
  v_session_id uuid;
  v_student_submission boolean:=false;
BEGIN
  IF TG_OP='INSERT' THEN
    v_session_id:=NEW.lesson_session_id;
    v_changed:=NEW.attendance_status IS NOT NULL OR NEW.grade IS NOT NULL OR NEW.lab_submitted IS NOT NULL OR NEW.file_url IS NOT NULL;
    v_student_submission:=v_uid=NEW.student_id AND public.has_role(v_uid,'telebe'::public.app_role)
      AND NEW.attendance_status IS NULL AND NEW.grade IS NULL AND NEW.lab_submitted IS TRUE AND NEW.file_url IS NOT NULL;
  ELSE
    v_session_id:=NEW.lesson_session_id;
    v_changed:=NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR NEW.grade IS DISTINCT FROM OLD.grade
      OR NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url;
    v_student_submission:=v_uid=OLD.student_id AND public.has_role(v_uid,'telebe'::public.app_role)
      AND NEW.lesson_session_id IS NOT DISTINCT FROM OLD.lesson_session_id
      AND NEW.student_id IS NOT DISTINCT FROM OLD.student_id
      AND NEW.course_id IS NOT DISTINCT FROM OLD.course_id
      AND NEW.attendance_status IS NOT DISTINCT FROM OLD.attendance_status
      AND NEW.grade IS NOT DISTINCT FROM OLD.grade
      AND (NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url);
  END IF;
  IF NOT v_changed OR v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN NEW; END IF;
  IF v_student_submission THEN RETURN NEW; END IF;
  IF NOT private.teacher_can_grade_lesson_at(v_session_id,v_uid,now()) THEN
    RAISE EXCEPTION 'Qiymət/davamiyyət yalnız dərsin başlanğıcından 5 dəqiqə əvvəl ilə bitməsindən 5 dəqiqə sonrakı intervalda və course_teachers icazəsi ilə yazıla bilər.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_independent_work_student_fields ON public.independent_work_assessments;
CREATE TRIGGER protect_independent_work_student_fields BEFORE INSERT OR UPDATE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION private.protect_student_submission_fields();
DROP TRIGGER IF EXISTS protect_course_work_student_fields ON public.course_work_assessments;
CREATE TRIGGER protect_course_work_student_fields BEFORE INSERT OR UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.protect_student_submission_fields();
DROP TRIGGER IF EXISTS protect_student_lesson_fields ON public.lesson_student_records;
CREATE TRIGGER protect_student_lesson_fields BEFORE INSERT OR UPDATE ON public.lesson_student_records FOR EACH ROW EXECUTE FUNCTION private.protect_student_lesson_fields();
DROP TRIGGER IF EXISTS enforce_independent_work_scope ON public.independent_work_assessments;
CREATE TRIGGER enforce_independent_work_scope BEFORE INSERT OR UPDATE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION private.enforce_assessment_write_scope();
DROP TRIGGER IF EXISTS enforce_course_work_scope ON public.course_work_assessments;
CREATE TRIGGER enforce_course_work_scope BEFORE INSERT OR UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.enforce_assessment_write_scope();
DROP TRIGGER IF EXISTS enforce_colloquium_scope ON public.colloquium_assessments;
CREATE TRIGGER enforce_colloquium_scope BEFORE INSERT OR UPDATE ON public.colloquium_assessments FOR EACH ROW EXECUTE FUNCTION private.enforce_assessment_write_scope();

ALTER TABLE public.course_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.independent_work_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_work_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colloquium_assessments ENABLE ROW LEVEL SECURITY;

-- Şablonlar
DROP POLICY IF EXISTS course_schedule_templates_select ON public.course_schedule_templates;
DROP POLICY IF EXISTS course_schedule_templates_insert ON public.course_schedule_templates;
DROP POLICY IF EXISTS course_schedule_templates_update ON public.course_schedule_templates;
DROP POLICY IF EXISTS course_schedule_templates_delete ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_select ON public.course_schedule_templates FOR SELECT TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.ejournal_is_course_teacher(course_id) OR public.ejournal_is_course_group_tutor(course_id,group_id)
  OR (public.is_course_student(course_id,(SELECT auth.uid())) AND public.is_group_member(group_id,(SELECT auth.uid())))
);
CREATE POLICY course_schedule_templates_insert ON public.course_schedule_templates FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);
CREATE POLICY course_schedule_templates_update ON public.course_schedule_templates FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);
CREATE POLICY course_schedule_templates_delete ON public.course_schedule_templates FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);

-- Sessiyalar
DROP POLICY IF EXISTS course_lesson_sessions_select ON public.course_lesson_sessions;
DROP POLICY IF EXISTS course_lesson_sessions_insert ON public.course_lesson_sessions;
DROP POLICY IF EXISTS course_lesson_sessions_update ON public.course_lesson_sessions;
DROP POLICY IF EXISTS course_lesson_sessions_delete ON public.course_lesson_sessions;
CREATE POLICY course_lesson_sessions_select ON public.course_lesson_sessions FOR SELECT TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.ejournal_is_course_teacher(course_id) OR public.ejournal_is_course_group_tutor(course_id,group_id)
  OR (public.is_course_student(course_id,(SELECT auth.uid())) AND public.is_group_member(group_id,(SELECT auth.uid())))
);
CREATE POLICY course_lesson_sessions_insert ON public.course_lesson_sessions FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);
CREATE POLICY course_lesson_sessions_update ON public.course_lesson_sessions FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
  OR (teacher_id=(SELECT auth.uid()) AND public.ejournal_is_course_teacher(course_id) AND public.can_grade_now(id,(SELECT auth.uid())))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
  OR (teacher_id=(SELECT auth.uid()) AND public.ejournal_is_course_teacher(course_id))
);
CREATE POLICY course_lesson_sessions_delete ON public.course_lesson_sessions FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);

-- Gündəlik tələbə qeydləri
DROP POLICY IF EXISTS lesson_student_records_select ON public.lesson_student_records;
DROP POLICY IF EXISTS lesson_student_records_insert ON public.lesson_student_records;
DROP POLICY IF EXISTS lesson_student_records_update ON public.lesson_student_records;
DROP POLICY IF EXISTS lesson_student_records_student_submission_update ON public.lesson_student_records;
DROP POLICY IF EXISTS lesson_student_records_delete ON public.lesson_student_records;
CREATE POLICY lesson_student_records_select ON public.lesson_student_records FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.ejournal_is_course_teacher(course_id)
  OR public.ejournal_is_student_course_tutor(course_id,student_id)
);
CREATE POLICY lesson_student_records_insert ON public.lesson_student_records FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.can_grade_now(lesson_session_id,(SELECT auth.uid()))
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
);
CREATE POLICY lesson_student_records_update ON public.lesson_student_records FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.can_grade_now(lesson_session_id,(SELECT auth.uid()))
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.can_grade_now(lesson_session_id,(SELECT auth.uid()))
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
);
CREATE POLICY lesson_student_records_delete ON public.lesson_student_records FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
);

-- Sərbəst iş
DROP POLICY IF EXISTS independent_work_assessments_select ON public.independent_work_assessments;
DROP POLICY IF EXISTS independent_work_assessments_insert ON public.independent_work_assessments;
DROP POLICY IF EXISTS independent_work_assessments_update ON public.independent_work_assessments;
DROP POLICY IF EXISTS independent_work_assessments_delete ON public.independent_work_assessments;
CREATE POLICY independent_work_assessments_select ON public.independent_work_assessments FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.ejournal_is_course_teacher(course_id)
  OR public.ejournal_is_student_course_tutor(course_id,student_id)
);
CREATE POLICY independent_work_assessments_insert ON public.independent_work_assessments FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'serbest_is'))
);
CREATE POLICY independent_work_assessments_update ON public.independent_work_assessments FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'serbest_is'))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'serbest_is'))
);
CREATE POLICY independent_work_assessments_delete ON public.independent_work_assessments FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
);

-- Kurs işi
DROP POLICY IF EXISTS course_work_assessments_select ON public.course_work_assessments;
DROP POLICY IF EXISTS course_work_assessments_insert ON public.course_work_assessments;
DROP POLICY IF EXISTS course_work_assessments_update ON public.course_work_assessments;
DROP POLICY IF EXISTS course_work_assessments_delete ON public.course_work_assessments;
CREATE POLICY course_work_assessments_select ON public.course_work_assessments FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.ejournal_is_course_teacher(course_id)
  OR public.ejournal_is_student_course_tutor(course_id,student_id)
);
CREATE POLICY course_work_assessments_insert ON public.course_work_assessments FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,NULL))
);
CREATE POLICY course_work_assessments_update ON public.course_work_assessments FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,NULL))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (student_id=(SELECT auth.uid()) AND public.is_course_student(course_id,(SELECT auth.uid())))
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,NULL))
);
CREATE POLICY course_work_assessments_delete ON public.course_work_assessments FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
);

-- Kollokvium
DROP POLICY IF EXISTS colloquium_assessments_select ON public.colloquium_assessments;
DROP POLICY IF EXISTS colloquium_assessments_insert ON public.colloquium_assessments;
DROP POLICY IF EXISTS colloquium_assessments_update ON public.colloquium_assessments;
DROP POLICY IF EXISTS colloquium_assessments_delete ON public.colloquium_assessments;
CREATE POLICY colloquium_assessments_select ON public.colloquium_assessments FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.ejournal_is_course_teacher(course_id)
  OR public.ejournal_is_student_course_tutor(course_id,student_id)
);
CREATE POLICY colloquium_assessments_insert ON public.colloquium_assessments FOR INSERT TO authenticated WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'kollokvium'))
);
CREATE POLICY colloquium_assessments_update ON public.colloquium_assessments FOR UPDATE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'kollokvium'))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_student_course_tutor(course_id,student_id))
  OR (public.ejournal_is_course_teacher(course_id) AND public.ejournal_can_assess_course_now(course_id,'kollokvium'))
);
CREATE POLICY colloquium_assessments_delete ON public.colloquium_assessments FOR DELETE TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
);

-- Canonical qrup/mövzu idarəsi
DROP POLICY IF EXISTS course_groups_write ON public.course_groups;
CREATE POLICY course_groups_write ON public.course_groups FOR ALL TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR (public.has_role((SELECT auth.uid()),'tyutor'::public.app_role) AND public.ejournal_is_course_group_tutor(course_id,group_id))
);
DROP POLICY IF EXISTS course_topics_write ON public.course_topics;
CREATE POLICY course_topics_write ON public.course_topics FOR ALL TO authenticated USING (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.ejournal_is_course_teacher(course_id)
) WITH CHECK (
  public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
  OR public.ejournal_is_course_teacher(course_id)
);

REVOKE ALL ON TABLE public.course_schedule_templates, public.course_lesson_sessions, public.lesson_student_records,
  public.independent_work_assessments, public.course_work_assessments, public.colloquium_assessments FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.course_schedule_templates, public.course_lesson_sessions, public.lesson_student_records,
  public.independent_work_assessments, public.course_work_assessments, public.colloquium_assessments TO authenticated;
GRANT ALL ON TABLE public.course_schedule_templates, public.course_lesson_sessions, public.lesson_student_records,
  public.independent_work_assessments, public.course_work_assessments, public.colloquium_assessments TO service_role;

-- Storage: canonical private course-materials bucket.
DROP POLICY IF EXISTS course_materials_select ON storage.objects;
CREATE POLICY course_materials_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='course-materials' AND (
    public.has_role((SELECT auth.uid()),'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
    OR public.ejournal_is_course_teacher(((storage.foldername(name))[1])::uuid)
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid,(SELECT auth.uid()))
    OR public.is_course_student(((storage.foldername(name))[1])::uuid,(SELECT auth.uid()))
  )
);
DROP POLICY IF EXISTS course_materials_write ON storage.objects;
CREATE POLICY course_materials_write ON storage.objects FOR ALL TO authenticated USING (
  bucket_id='course-materials' AND (
    public.has_role((SELECT auth.uid()),'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
    OR public.ejournal_is_course_teacher(((storage.foldername(name))[1])::uuid)
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid,(SELECT auth.uid()))
  )
) WITH CHECK (
  bucket_id='course-materials' AND (
    public.has_role((SELECT auth.uid()),'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role)
    OR public.ejournal_is_course_teacher(((storage.foldername(name))[1])::uuid)
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid,(SELECT auth.uid()))
  )
);
