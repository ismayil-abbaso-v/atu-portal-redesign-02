-- Müəllim elektron jurnal axını: atomik gündəlik təsdiq və dərs vaxtı sərhədlərinin backend qorunması

CREATE OR REPLACE FUNCTION private.enforce_teacher_session_grading_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_dekan boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);
  v_is_dekan := public.has_role(v_uid, 'dekan'::public.app_role);

  IF v_is_admin OR v_is_dekan THEN
    RETURN NEW;
  END IF;

  IF v_uid = OLD.teacher_id AND public.is_course_teacher(OLD.course_id, v_uid) THEN
    IF NEW.schedule_template_id IS DISTINCT FROM OLD.schedule_template_id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
       OR NEW.dars_novu IS DISTINCT FROM OLD.dars_novu
       OR NEW.lesson_date IS DISTINCT FROM OLD.lesson_date
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
      RAISE EXCEPTION 'Müəllim jurnal ekranından dərsin cədvəl/sistem sahələrini dəyişə bilməz.';
    END IF;

    IF NEW.movzu IS DISTINCT FROM OLD.movzu
       OR NEW.topic_id IS DISTINCT FROM OLD.topic_id
       OR NEW.is_confirmed IS DISTINCT FROM OLD.is_confirmed THEN
      IF NOT private.teacher_can_grade_lesson_at(OLD.id, v_uid, now()) THEN
        RAISE EXCEPTION 'Mövzu, davamiyyət və qiymətləndirmə yalnız aktiv dərsin qiymətləndirmə pəncərəsində dəyişdirilə bilər.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_teacher_session_grading_scope() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS b_enforce_teacher_session_grading_scope ON public.course_lesson_sessions;
CREATE TRIGGER b_enforce_teacher_session_grading_scope
BEFORE UPDATE ON public.course_lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION private.enforce_teacher_session_grading_scope();

CREATE OR REPLACE FUNCTION private.confirm_lesson_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_missing integer;
  v_total integer;
  v_unlock_id text := current_setting('app.ejournal_unlock_session_id', true);
  v_uid uuid := auth.uid();
BEGIN
  IF NOT OLD.is_confirmed AND NEW.is_confirmed THEN
    IF NOT (
      public.has_role(v_uid, 'admin'::public.app_role)
      OR public.has_role(v_uid, 'dekan'::public.app_role)
      OR (
        NEW.teacher_id = v_uid
        AND public.is_course_teacher(NEW.course_id, v_uid)
        AND private.teacher_can_grade_lesson_at(NEW.id, v_uid, now())
      )
    ) THEN
      RAISE EXCEPTION 'Bu dərs sessiyasını yalnız aktiv qiymətləndirmə pəncərəsində təsdiqləyə bilərsiniz.';
    END IF;

    PERFORM private.seed_session_students(NEW.id, NEW.course_id, NEW.group_id);

    SELECT count(*), count(*) FILTER (WHERE attendance_status IS NULL)
      INTO v_total, v_missing
    FROM public.lesson_student_records
    WHERE lesson_session_id = NEW.id;

    IF v_total = 0 THEN
      RAISE EXCEPTION 'Sessiyanı təsdiqləmək üçün qrupda tələbə olmalıdır.';
    END IF;
    IF v_missing > 0 THEN
      RAISE EXCEPTION 'Sessiyanı təsdiqləməzdən əvvəl bütün tələbələrin davamiyyətini qeyd edin.';
    END IF;

    NEW.confirmed_at := now();
    NEW.confirmed_by := v_uid;
  ELSIF OLD.is_confirmed AND NOT NEW.is_confirmed THEN
    IF v_unlock_id <> OLD.id::text
       OR NOT (
         public.has_role(v_uid, 'admin'::public.app_role)
         OR public.has_role(v_uid, 'dekan'::public.app_role)
       ) THEN
      RAISE EXCEPTION 'Təsdiqlənmiş sessiyanı yalnız admin/dekan auditli kilid-açma əməliyyatı ilə geri aça bilər.';
    END IF;
    NEW.confirmed_at := NULL;
    NEW.confirmed_by := NULL;
  ELSIF OLD.is_confirmed IS DISTINCT FROM NEW.is_confirmed THEN
    RAISE EXCEPTION 'Təsdiq vəziyyəti dəyişdirilə bilməz.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.confirm_lesson_session() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_lesson_grading(
  p_lesson_id uuid,
  p_topic text,
  p_records jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.course_lesson_sessions%ROWTYPE;
  v_grading_type public.course_grading_type;
  v_expected_count integer;
  v_payload_count integer;
  v_unique_count integer;
  v_item jsonb;
  v_student_id uuid;
  v_attendance text;
  v_grade numeric;
  v_lab_submitted boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autentifikasiya tələb olunur.';
  END IF;

  SELECT * INTO v_session
  FROM public.course_lesson_sessions
  WHERE id = p_lesson_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dərs sessiyası tapılmadı.';
  END IF;

  IF v_session.teacher_id <> v_uid
     OR NOT public.is_course_teacher(v_session.course_id, v_uid) THEN
    RAISE EXCEPTION 'Bu dərsi qiymətləndirmək icazəniz yoxdur.';
  END IF;

  IF v_session.is_confirmed THEN
    RAISE EXCEPTION 'Bu dərs artıq təsdiqlənib və kilidlənib.';
  END IF;

  IF NOT private.teacher_can_grade_lesson_at(p_lesson_id, v_uid, now()) THEN
    RAISE EXCEPTION 'Qiymətləndirmə pəncərəsi aktiv deyil.';
  END IF;

  IF length(btrim(COALESCE(p_topic, ''))) < 2 THEN
    RAISE EXCEPTION 'Dərsin mövzusunu daxil edin.';
  END IF;

  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RAISE EXCEPTION 'Tələbə qiymətləndirmə siyahısı düzgün formatda deyil.';
  END IF;

  SELECT qiymetlendirme_novu
    INTO v_grading_type
  FROM public.courses
  WHERE id = v_session.course_id;

  IF v_grading_type IS NULL THEN
    RAISE EXCEPTION 'Fənnin qiymətləndirmə növü (məşğələ/laboratoriya) təyin edilməyib.';
  END IF;

  PERFORM private.seed_session_students(v_session.id, v_session.course_id, v_session.group_id);

  SELECT count(*)::integer
    INTO v_expected_count
  FROM public.lesson_student_records
  WHERE lesson_session_id = v_session.id;

  v_payload_count := jsonb_array_length(p_records);

  SELECT count(DISTINCT x.student_id)::integer
    INTO v_unique_count
  FROM (
    SELECT NULLIF(item ->> 'student_id', '')::uuid AS student_id
    FROM jsonb_array_elements(p_records) AS item
  ) x;

  IF v_expected_count = 0 THEN
    RAISE EXCEPTION 'Bu sessiyanın qrupunda qiymətləndiriləcək tələbə yoxdur.';
  END IF;

  IF v_payload_count <> v_expected_count OR v_unique_count <> v_expected_count THEN
    RAISE EXCEPTION 'Təsdiq üçün bütün tələbələr siyahıda yalnız bir dəfə olmalıdır.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_records) AS item
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.lesson_student_records r
      WHERE r.lesson_session_id = v_session.id
        AND r.student_id = NULLIF(item ->> 'student_id', '')::uuid
    )
  ) THEN
    RAISE EXCEPTION 'Qiymətləndirmə siyahısında bu dərsə aid olmayan tələbə var.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := NULLIF(v_item ->> 'student_id', '')::uuid;
    v_attendance := v_item ->> 'attendance_status';

    IF v_attendance NOT IN ('iştirak edib', 'qayıb') THEN
      RAISE EXCEPTION 'Bütün tələbələr üçün davamiyyət seçilməlidir.';
    END IF;

    v_grade := NULL;
    IF v_item ? 'grade' AND jsonb_typeof(v_item -> 'grade') <> 'null' THEN
      v_grade := (v_item ->> 'grade')::numeric;
    END IF;

    v_lab_submitted := false;
    IF v_item ? 'lab_submitted' AND jsonb_typeof(v_item -> 'lab_submitted') <> 'null' THEN
      v_lab_submitted := (v_item ->> 'lab_submitted')::boolean;
    END IF;

    IF v_attendance = 'qayıb' THEN
      v_grade := NULL;
      v_lab_submitted := false;
    END IF;

    IF v_grading_type = 'meshgele'::public.course_grading_type THEN
      IF v_grade IS NOT NULL AND (v_grade < 0 OR v_grade > 10) THEN
        RAISE EXCEPTION 'Gündəlik qiymət 0-10 aralığında olmalıdır.';
      END IF;

      UPDATE public.lesson_student_records
      SET attendance_status = v_attendance::public.lesson_attendance_status,
          grade = v_grade,
          lab_submitted = NULL,
          updated_at = now()
      WHERE lesson_session_id = v_session.id
        AND student_id = v_student_id;
    ELSIF v_grading_type = 'laboratoriya'::public.course_grading_type THEN
      UPDATE public.lesson_student_records
      SET attendance_status = v_attendance::public.lesson_attendance_status,
          grade = NULL,
          lab_submitted = v_lab_submitted,
          updated_at = now()
      WHERE lesson_session_id = v_session.id
        AND student_id = v_student_id;
    ELSE
      RAISE EXCEPTION 'Dəstəklənməyən fənn qiymətləndirmə növü.';
    END IF;
  END LOOP;

  UPDATE public.course_lesson_sessions
  SET movzu = btrim(p_topic),
      is_confirmed = true,
      updated_at = now()
  WHERE id = v_session.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_lesson_grading(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_lesson_grading(uuid, text, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.confirm_lesson_grading(uuid, text, jsonb) IS
  'Müəllimin aktiv dərs pəncərəsində mövzu+davamiyyət+gündəlik qiymətləndirməni atomik yazıb sessiyanı kilidləməsi.';