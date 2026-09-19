-- Frontend storage alias köhnə semantik yolu göndərə bilər; DB həmişə canonical course-materials URL saxlayır.

CREATE OR REPLACE FUNCTION private.protect_student_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_submission_changed boolean := false;
  v_legacy_prefix text;
  v_expected_prefix text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  v_is_staff := public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'dekan'::public.app_role)
    OR public.is_course_teacher(NEW.course_id, v_uid)
    OR public.is_course_tutor(NEW.course_id, v_uid);

  IF v_uid = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.sira IS DISTINCT FROM OLD.sira
       OR NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.topic IS DISTINCT FROM OLD.topic THEN
      RAISE EXCEPTION 'Tələbə qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;

    IF NEW.status = 'qiymetlendirilib'::public.assessment_submission_status THEN
      RAISE EXCEPTION 'Qiymətləndirilib statusunu yalnız səlahiyyətli əməkdaş təyin edə bilər.';
    END IF;

    v_submission_changed := NEW.topic_id IS DISTINCT FROM OLD.topic_id
      OR NEW.file_url IS DISTINCT FROM OLD.file_url
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.status IS DISTINCT FROM OLD.status;

    IF v_submission_changed THEN
      IF OLD.file_url IS NOT NULL
         OR OLD.submitted_at IS NOT NULL
         OR OLD.status <> 'gozleyir'::public.assessment_submission_status THEN
        RAISE EXCEPTION 'Artıq təhvil vermisiniz.';
      END IF;

      IF NEW.topic_id IS NULL OR NEW.file_url IS NULL OR NEW.submitted_at IS NULL
         OR NEW.status <> 'teqdim_edilib'::public.assessment_submission_status THEN
        RAISE EXCEPTION 'Təqdimat üçün mövzu, fayl və təqdim edilmə vaxtı birlikdə yazılmalıdır.';
      END IF;

      v_legacy_prefix := OLD.student_id::text || '/' || OLD.course_id::text || '/';
      v_expected_prefix := 'course-materials/' || OLD.course_id::text || '/student-submissions/' || OLD.student_id::text || '/';

      IF position(v_legacy_prefix IN NEW.file_url) = 1 THEN
        NEW.file_url := v_expected_prefix || substring(NEW.file_url FROM length(v_legacy_prefix) + 1);
      END IF;

      IF position(v_expected_prefix IN NEW.file_url) <> 1 THEN
        RAISE EXCEPTION 'Təqdimat fayl yolu tələbə və fənn qovluğuna uyğun deyil.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_student_submission_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.protect_student_lesson_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_type public.course_grading_type;
  v_submission_changed boolean := false;
  v_legacy_prefix text;
  v_expected_prefix text;
BEGIN
  v_is_staff := public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'dekan'::public.app_role)
    OR public.is_course_teacher(OLD.course_id, v_uid);

  IF v_uid = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.lesson_session_id IS DISTINCT FROM OLD.lesson_session_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status
       OR NEW.grade IS DISTINCT FROM OLD.grade THEN
      RAISE EXCEPTION 'Tələbə davamiyyət, qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;

    v_submission_changed := NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted
      OR NEW.file_url IS DISTINCT FROM OLD.file_url;

    IF v_submission_changed THEN
      SELECT c.qiymetlendirme_novu INTO v_type
      FROM public.courses c WHERE c.id = OLD.course_id;

      IF v_type <> 'laboratoriya'::public.course_grading_type THEN
        RAISE EXCEPTION 'Bu fənn laboratoriya tipli deyil.';
      END IF;

      IF OLD.file_url IS NOT NULL OR OLD.lab_submitted IS TRUE THEN
        RAISE EXCEPTION 'Artıq təhvil vermisiniz.';
      END IF;

      IF NEW.file_url IS NULL OR NEW.lab_submitted IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Laboratoriya təqdimatında fayl və təhvil statusu birlikdə yazılmalıdır.';
      END IF;

      v_legacy_prefix := OLD.student_id::text || '/' || OLD.course_id::text || '/';
      v_expected_prefix := 'course-materials/' || OLD.course_id::text || '/student-submissions/' || OLD.student_id::text || '/';

      IF position(v_legacy_prefix IN NEW.file_url) = 1 THEN
        NEW.file_url := v_expected_prefix || substring(NEW.file_url FROM length(v_legacy_prefix) + 1);
      END IF;

      IF position(v_expected_prefix IN NEW.file_url) <> 1 THEN
        RAISE EXCEPTION 'Laboratoriya fayl yolu tələbə və fənn qovluğuna uyğun deyil.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_student_lesson_fields() FROM PUBLIC, anon, authenticated;
