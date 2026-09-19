-- Elektron Jurnal: 50-ballıq formula, exam_scores sinxronu və statistik VIEW uyğunluğu

-- Core migration-dakı DELETE yolunu TG_OP-a görə təhlükəsizləşdir.
CREATE OR REPLACE FUNCTION private.validate_lesson_student_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_session_id uuid;
  v_course_id uuid;
  v_student_id uuid;
  v_confirmed boolean;
  v_type public.course_grading_type;
  v_group_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.lesson_session_id;
    v_course_id := OLD.course_id;
    v_student_id := OLD.student_id;
  ELSE
    v_session_id := NEW.lesson_session_id;
    v_course_id := NEW.course_id;
    v_student_id := NEW.student_id;
  END IF;

  SELECT s.is_confirmed, s.group_id INTO v_confirmed, v_group_id
  FROM public.course_lesson_sessions s WHERE s.id = v_session_id;

  IF TG_OP IN ('UPDATE', 'DELETE') AND COALESCE(v_confirmed, false) THEN
    RAISE EXCEPTION 'Təsdiqlənmiş sessiyanın tələbə qeydi dəyişdirilə bilməz.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = v_group_id AND gm.user_id = v_student_id)
     OR NOT public.is_course_student(v_course_id, v_student_id) THEN
    RAISE EXCEPTION 'Tələbə bu sessiyanın qrup/fənn tərkibində deyil.';
  END IF;

  SELECT c.qiymetlendirme_novu INTO v_type FROM public.courses c WHERE c.id = v_course_id;
  IF v_type = 'meshgele'::public.course_grading_type AND NEW.lab_submitted IS NOT NULL THEN
    RAISE EXCEPTION 'Məşğələ tipli fənndə lab_submitted istifadə edilmir.';
  END IF;
  IF v_type = 'laboratoriya'::public.course_grading_type AND NEW.grade IS NOT NULL THEN
    RAISE EXCEPTION 'Laboratoriya tipli fənndə gündəlik grade istifadə edilmir.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_lesson_student_record() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_ejournal_data(p_course_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.lesson_student_records r
      JOIN public.course_lesson_sessions s ON s.id = r.lesson_session_id
      WHERE r.course_id = p_course_id AND r.student_id = p_student_id AND s.is_confirmed
    )
    OR EXISTS (
      SELECT 1 FROM public.independent_work_assessments x
      WHERE x.course_id = p_course_id AND x.student_id = p_student_id
        AND (x.grade IS NOT NULL OR x.submitted_at IS NOT NULL OR x.status <> 'gozleyir'::public.assessment_submission_status)
    )
    OR EXISTS (
      SELECT 1 FROM public.course_work_assessments x
      WHERE x.course_id = p_course_id AND x.student_id = p_student_id
        AND (x.grade IS NOT NULL OR x.submitted_at IS NOT NULL OR x.status <> 'gozleyir'::public.assessment_submission_status)
    )
    OR EXISTS (
      SELECT 1 FROM public.colloquium_assessments x
      WHERE x.course_id = p_course_id AND x.student_id = p_student_id
        AND (x.grade IS NOT NULL OR x.tarix IS NOT NULL)
    );
$$;
REVOKE ALL ON FUNCTION private.has_ejournal_data(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.calculate_semester_score(p_course_id uuid, p_student_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_type public.course_grading_type;
  v_has_course_work boolean;
  v_total_hours integer;
  v_total_labs integer;
  v_absences integer := 0;
  v_attendance_score numeric := 0;
  v_col_sum numeric := 0;
  v_col_component numeric := 0;
  v_independent_component numeric := 0;
  v_course_work_component numeric := 0;
  v_meshgele_avg numeric := 0;
  v_daily_component numeric := 0;
  v_labs_submitted integer := 0;
  v_result numeric := 0;
BEGIN
  SELECT c.qiymetlendirme_novu, c.kurs_isi_var, c.umumi_ders_saati, c.umumi_lab_sayi
    INTO v_type, v_has_course_work, v_total_hours, v_total_labs
  FROM public.courses c WHERE c.id = p_course_id;

  IF NOT FOUND OR v_type IS NULL THEN RETURN NULL; END IF;

  IF v_total_hours IS NULL THEN
    SELECT count(*)::integer * 2 INTO v_total_hours
    FROM public.lesson_student_records r
    WHERE r.course_id = p_course_id AND r.student_id = p_student_id;
  END IF;

  SELECT
    count(*) FILTER (WHERE r.attendance_status = 'qayıb'::public.lesson_attendance_status)::integer,
    COALESCE(avg(r.grade) FILTER (WHERE r.grade IS NOT NULL), 0),
    count(*) FILTER (WHERE r.lab_submitted IS TRUE)::integer
    INTO v_absences, v_meshgele_avg, v_labs_submitted
  FROM public.lesson_student_records r
  JOIN public.course_lesson_sessions s ON s.id = r.lesson_session_id
  WHERE r.course_id = p_course_id AND r.student_id = p_student_id AND s.is_confirmed;

  IF COALESCE(v_total_hours, 0) > 0 THEN
    v_attendance_score := greatest(0::numeric,
      10::numeric - (((v_absences * 2)::numeric / v_total_hours::numeric) * 10::numeric));
  ELSE
    v_attendance_score := 0;
  END IF;

  SELECT COALESCE(sum(COALESCE(x.grade, 0)), 0) INTO v_col_sum
  FROM public.colloquium_assessments x
  WHERE x.course_id = p_course_id AND x.student_id = p_student_id;

  SELECT COALESCE(sum(COALESCE(x.grade, 0)), 0) INTO v_independent_component
  FROM public.independent_work_assessments x
  WHERE x.course_id = p_course_id AND x.student_id = p_student_id;
  v_independent_component := least(10::numeric, greatest(0::numeric, v_independent_component));

  IF v_has_course_work THEN
    SELECT COALESCE(max(x.grade), 0) INTO v_course_work_component
    FROM public.course_work_assessments x
    WHERE x.course_id = p_course_id AND x.student_id = p_student_id;
    v_course_work_component := least(10::numeric, greatest(0::numeric, v_course_work_component));
    v_col_component := (v_col_sum / 3::numeric) * 1.2::numeric;
  ELSE
    v_course_work_component := 0;
    v_col_component := (v_col_sum / 3::numeric) * 1.8::numeric;
  END IF;

  IF v_type = 'meshgele'::public.course_grading_type THEN
    v_daily_component := v_meshgele_avg * CASE WHEN v_has_course_work THEN 0.8::numeric ELSE 1.2::numeric END;
  ELSE
    -- umumi_lab_sayi formuldakı f-dir. NULL olduqda onu təxmin etmirik; lab komponenti 0 qalır.
    IF COALESCE(v_total_labs, 0) > 0 THEN
      v_daily_component := (v_labs_submitted::numeric / v_total_labs::numeric)
        * CASE WHEN v_has_course_work THEN 8::numeric ELSE 12::numeric END;
    ELSE
      v_daily_component := 0;
    END IF;
  END IF;

  v_result := v_col_component + v_independent_component + v_course_work_component + v_daily_component + v_attendance_score;
  RETURN round(least(50::numeric, greatest(0::numeric, v_result)), 2);
END;
$$;
REVOKE ALL ON FUNCTION private.calculate_semester_score(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.sync_exam_semester_score(p_course_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_score numeric;
  v_year text;
  v_semester_text text;
  v_semester smallint;
  v_updated integer := 0;
BEGIN
  IF NOT private.has_ejournal_data(p_course_id, p_student_id) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.qiymetlendirme_novu IS NOT NULL) THEN RETURN; END IF;

  v_score := private.calculate_semester_score(p_course_id, p_student_id);
  IF v_score IS NULL THEN RETURN; END IF;

  SELECT ss.cari_tedris_ili, ss.cari_semestr INTO v_year, v_semester_text
  FROM public.system_settings ss ORDER BY ss.updated_at DESC NULLS LAST, ss.created_at DESC NULLS LAST LIMIT 1;

  v_semester := CASE lower(btrim(COALESCE(v_semester_text, '')))
    WHEN 'payız' THEN 1 WHEN 'payiz' THEN 1 WHEN 'fall' THEN 1 WHEN '1' THEN 1 WHEN 'i' THEN 1
    WHEN 'yaz' THEN 2 WHEN 'spring' THEN 2 WHEN '2' THEN 2 WHEN 'ii' THEN 2 ELSE NULL END;

  IF NULLIF(btrim(COALESCE(v_year, '')), '') IS NOT NULL AND v_semester IS NOT NULL THEN
    UPDATE public.exam_scores SET semestr_qiymeti = v_score
    WHERE user_id = p_student_id AND course_id = p_course_id AND tedris_ili = v_year AND semestr = v_semester;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  IF v_updated = 0 THEN
    INSERT INTO public.exam_scores(user_id, course_id, semestr_qiymeti, tedris_ili, semestr)
    VALUES (p_student_id, p_course_id, v_score, v_year, v_semester);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_exam_semester_score(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_exam_semester_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_score numeric;
BEGIN
  IF NEW.course_id IS NOT NULL
     AND private.has_ejournal_data(NEW.course_id, NEW.user_id)
     AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = NEW.course_id AND c.qiymetlendirme_novu IS NOT NULL) THEN
    v_score := private.calculate_semester_score(NEW.course_id, NEW.user_id);
    IF v_score IS NOT NULL THEN NEW.semestr_qiymeti := v_score; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_exam_semester_score() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS enforce_ejournal_semester_score ON public.exam_scores;
CREATE TRIGGER enforce_ejournal_semester_score BEFORE INSERT OR UPDATE ON public.exam_scores
FOR EACH ROW EXECUTE FUNCTION private.enforce_exam_semester_score();

CREATE OR REPLACE FUNCTION private.sync_semester_score_from_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_course_id uuid; v_student_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_course_id := OLD.course_id; v_student_id := OLD.student_id;
  ELSE v_course_id := NEW.course_id; v_student_id := NEW.student_id; END IF;
  PERFORM private.sync_exam_semester_score(v_course_id, v_student_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_semester_score_from_assessment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_score_independent_work ON public.independent_work_assessments;
CREATE TRIGGER sync_score_independent_work AFTER INSERT OR UPDATE OR DELETE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION private.sync_semester_score_from_assessment();
DROP TRIGGER IF EXISTS sync_score_course_work ON public.course_work_assessments;
CREATE TRIGGER sync_score_course_work AFTER INSERT OR UPDATE OR DELETE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.sync_semester_score_from_assessment();
DROP TRIGGER IF EXISTS sync_score_colloquium ON public.colloquium_assessments;
CREATE TRIGGER sync_score_colloquium AFTER INSERT OR UPDATE OR DELETE ON public.colloquium_assessments FOR EACH ROW EXECUTE FUNCTION private.sync_semester_score_from_assessment();

CREATE OR REPLACE FUNCTION private.sync_scores_on_session_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  IF NOT OLD.is_confirmed AND NEW.is_confirmed THEN
    FOR r IN SELECT student_id FROM public.lesson_student_records WHERE lesson_session_id = NEW.id LOOP
      PERFORM private.sync_exam_semester_score(NEW.course_id, r.student_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_scores_on_session_confirmation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS z_sync_scores_on_session_confirmation ON public.course_lesson_sessions;
CREATE TRIGGER z_sync_scores_on_session_confirmation AFTER UPDATE OF is_confirmed ON public.course_lesson_sessions
FOR EACH ROW EXECUTE FUNCTION private.sync_scores_on_session_confirmation();

CREATE OR REPLACE FUNCTION private.sync_scores_on_session_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT student_id FROM public.lesson_student_records WHERE lesson_session_id = NEW.id LOOP
    PERFORM private.sync_exam_semester_score(NEW.course_id, r.student_id);
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_scores_on_session_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS z_sync_scores_on_session_insert ON public.course_lesson_sessions;
CREATE TRIGGER z_sync_scores_on_session_insert AFTER INSERT ON public.course_lesson_sessions
FOR EACH ROW EXECUTE FUNCTION private.sync_scores_on_session_insert();

CREATE OR REPLACE FUNCTION private.sync_scores_on_session_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM private.course_student_ids(OLD.course_id) LOOP
    PERFORM private.sync_exam_semester_score(OLD.course_id, r.user_id);
  END LOOP;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_scores_on_session_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS z_sync_scores_on_session_delete ON public.course_lesson_sessions;
CREATE TRIGGER z_sync_scores_on_session_delete AFTER DELETE ON public.course_lesson_sessions
FOR EACH ROW EXECUTE FUNCTION private.sync_scores_on_session_delete();

CREATE OR REPLACE FUNCTION private.sync_scores_on_course_formula_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  IF NEW.qiymetlendirme_novu IS DISTINCT FROM OLD.qiymetlendirme_novu
     OR NEW.kurs_isi_var IS DISTINCT FROM OLD.kurs_isi_var
     OR NEW.umumi_lab_sayi IS DISTINCT FROM OLD.umumi_lab_sayi
     OR NEW.umumi_ders_saati IS DISTINCT FROM OLD.umumi_ders_saati THEN
    FOR r IN SELECT user_id FROM private.course_student_ids(NEW.id) LOOP
      PERFORM private.sync_exam_semester_score(NEW.id, r.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_scores_on_course_formula_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS z_sync_scores_on_course_formula_change ON public.courses;
CREATE TRIGGER z_sync_scores_on_course_formula_change
AFTER UPDATE OF qiymetlendirme_novu, kurs_isi_var, umumi_lab_sayi, umumi_ders_saati ON public.courses
FOR EACH ROW EXECUTE FUNCTION private.sync_scores_on_course_formula_change();

-- Compatibility qərarı: köhnə attendance-a dual-write yoxdur.
-- Statistik VIEW-lar yeni session-based attendance-dan istifadə edir; score isə avtomatik exam_scores.semestr_qiymeti ilə sinxron qalır.
CREATE OR REPLACE VIEW public.faculty_stats WITH (security_invoker = true) AS
WITH student_attendance AS (
  SELECT r.student_id,
    round(100.0 * count(*) FILTER (WHERE r.attendance_status = 'iştirak edib'::public.lesson_attendance_status)::numeric
      / NULLIF(count(*), 0)::numeric, 1) AS attendance_pct
  FROM public.lesson_student_records r
  JOIN public.course_lesson_sessions s ON s.id = r.lesson_session_id
  WHERE s.is_confirmed
  GROUP BY r.student_id
),
student_scores AS (
  SELECT e.user_id AS student_id,
    round(avg(COALESCE(e.yekun_qiymet, e.semestr_qiymeti)), 1) AS avg_score
  FROM public.exam_scores e GROUP BY e.user_id
)
SELECT p.fakulte,
  count(DISTINCT p.user_id) AS total_students,
  COALESCE(round(avg(sa.attendance_pct), 1), 0::numeric) AS avg_attendance,
  COALESCE(round(avg(ss.avg_score), 1), 0::numeric) AS avg_score
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'telebe'::public.app_role
LEFT JOIN student_attendance sa ON sa.student_id = p.user_id
LEFT JOIN student_scores ss ON ss.student_id = p.user_id
GROUP BY p.fakulte;

CREATE OR REPLACE VIEW public.group_stats WITH (security_invoker = true) AS
WITH student_attendance AS (
  SELECT r.student_id,
    round(100.0 * count(*) FILTER (WHERE r.attendance_status = 'iştirak edib'::public.lesson_attendance_status)::numeric
      / NULLIF(count(*), 0)::numeric, 1) AS attendance_pct
  FROM public.lesson_student_records r
  JOIN public.course_lesson_sessions s ON s.id = r.lesson_session_id
  WHERE s.is_confirmed
  GROUP BY r.student_id
),
student_scores AS (
  SELECT e.user_id AS student_id,
    round(avg(COALESCE(e.yekun_qiymet, e.semestr_qiymeti)), 1) AS avg_score
  FROM public.exam_scores e GROUP BY e.user_id
)
SELECT p.qrup,
  p.fakulte,
  g.tyutor_id,
  (tp.ad || ' '::text) || tp.soyad AS tyutor_ad_soyad,
  count(DISTINCT p.user_id) AS total_students,
  COALESCE(round(avg(sa.attendance_pct), 1), 0::numeric) AS avg_attendance,
  COALESCE(round(avg(ss.avg_score), 1), 0::numeric) AS avg_score
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'telebe'::public.app_role
LEFT JOIN public.groups g ON p.qrup = g.ad
LEFT JOIN public.profiles tp ON g.tyutor_id = tp.user_id
LEFT JOIN student_attendance sa ON sa.student_id = p.user_id
LEFT JOIN student_scores ss ON ss.student_id = p.user_id
WHERE p.qrup IS NOT NULL AND p.qrup <> ''::text
GROUP BY p.qrup, p.fakulte, g.tyutor_id, tp.ad, tp.soyad;

GRANT SELECT ON public.faculty_stats TO authenticated, service_role;
GRANT SELECT ON public.group_stats TO authenticated, service_role;
