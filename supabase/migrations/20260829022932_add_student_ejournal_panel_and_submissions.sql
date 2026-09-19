-- Elektron jurnal tələbə paneli: vahid score breakdown, təhlükəsiz submission storage və student upload qaydaları.

CREATE OR REPLACE FUNCTION private.semester_score_components(
  p_type public.course_grading_type,
  p_has_course_work boolean,
  p_total_hours integer,
  p_absences integer,
  p_a numeric,
  p_b numeric,
  p_c numeric,
  p_d numeric,
  p_e numeric,
  p_meshgele_avg numeric,
  p_labs_submitted integer,
  p_total_labs integer,
  p_course_work numeric
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, private
AS $$
DECLARE
  v_attendance numeric := 0;
  v_colloquium numeric := 0;
  v_independent numeric := 0;
  v_daily numeric := 0;
  v_course_work numeric := 0;
  v_total numeric := 0;
  v_colloquium_max numeric := 18;
  v_daily_max numeric := 12;
  v_absence_limit integer := 0;
BEGIN
  IF p_type IS NULL THEN RETURN NULL; END IF;

  IF COALESCE(p_total_hours, 0) > 0 THEN
    v_attendance := greatest(0::numeric, 10::numeric - (((COALESCE(p_absences, 0) * 2)::numeric / p_total_hours::numeric) * 10::numeric));
    v_absence_limit := floor(p_total_hours::numeric / 8::numeric)::integer;
  END IF;

  v_independent := least(10::numeric, greatest(0::numeric, COALESCE(p_d, 0) + COALESCE(p_e, 0)));

  IF COALESCE(p_has_course_work, false) THEN
    v_colloquium_max := 12::numeric;
    v_daily_max := 8::numeric;
    v_colloquium := ((COALESCE(p_a, 0) + COALESCE(p_b, 0) + COALESCE(p_c, 0)) / 3::numeric) * 1.2::numeric;
    v_course_work := least(10::numeric, greatest(0::numeric, COALESCE(p_course_work, 0)));
  ELSE
    v_colloquium := ((COALESCE(p_a, 0) + COALESCE(p_b, 0) + COALESCE(p_c, 0)) / 3::numeric) * 1.8::numeric;
  END IF;

  IF p_type = 'meshgele'::public.course_grading_type THEN
    v_daily := COALESCE(p_meshgele_avg, 0) * CASE WHEN COALESCE(p_has_course_work, false) THEN 0.8::numeric ELSE 1.2::numeric END;
  ELSIF COALESCE(p_total_labs, 0) > 0 THEN
    v_daily := (COALESCE(p_labs_submitted, 0)::numeric / p_total_labs::numeric) * CASE WHEN COALESCE(p_has_course_work, false) THEN 8::numeric ELSE 12::numeric END;
  END IF;

  v_total := round(least(50::numeric, greatest(0::numeric, v_colloquium + v_independent + v_course_work + v_daily + v_attendance)), 2);

  RETURN jsonb_build_object(
    'grading_type', p_type::text,
    'has_course_work', COALESCE(p_has_course_work, false),
    'attendance', jsonb_build_object('value', round(v_attendance, 2), 'max', 10, 'absences', COALESCE(p_absences, 0), 'total_hours', COALESCE(p_total_hours, 0), 'absence_limit', v_absence_limit),
    'colloquium', jsonb_build_object('value', round(v_colloquium, 2), 'max', v_colloquium_max, 'grades', jsonb_build_array(COALESCE(p_a, 0), COALESCE(p_b, 0), COALESCE(p_c, 0))),
    'independent', jsonb_build_object('value', round(v_independent, 2), 'max', 10, 'grades', jsonb_build_array(COALESCE(p_d, 0), COALESCE(p_e, 0))),
    'daily', jsonb_build_object('value', round(v_daily, 2), 'max', v_daily_max, 'practice_average', round(COALESCE(p_meshgele_avg, 0), 2), 'labs_submitted', COALESCE(p_labs_submitted, 0), 'total_labs', COALESCE(p_total_labs, 0)),
    'course_work', jsonb_build_object('enabled', COALESCE(p_has_course_work, false), 'value', round(v_course_work, 2), 'max', CASE WHEN COALESCE(p_has_course_work, false) THEN 10 ELSE 0 END),
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION private.semester_score_components(public.course_grading_type, boolean, integer, integer, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.calculate_semester_score_breakdown(p_course_id uuid, p_student_id uuid)
RETURNS jsonb
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
  v_a numeric := 0; v_b numeric := 0; v_c numeric := 0;
  v_d numeric := 0; v_e numeric := 0;
  v_meshgele_avg numeric := 0;
  v_labs_submitted integer := 0;
  v_course_work numeric := 0;
BEGIN
  SELECT c.qiymetlendirme_novu, c.kurs_isi_var, c.umumi_lab_sayi INTO v_type, v_has_course_work, v_total_labs
  FROM public.courses c WHERE c.id = p_course_id;
  IF NOT FOUND OR v_type IS NULL THEN RETURN NULL; END IF;

  v_total_hours := public.course_effective_total_hours(p_course_id, p_student_id);

  SELECT count(*) FILTER (WHERE r.attendance_status = 'qayıb'::public.lesson_attendance_status)::integer,
         COALESCE(avg(r.grade) FILTER (WHERE r.grade IS NOT NULL), 0),
         count(*) FILTER (WHERE r.lab_submitted IS TRUE)::integer
  INTO v_absences, v_meshgele_avg, v_labs_submitted
  FROM public.lesson_student_records r
  JOIN public.course_lesson_sessions s ON s.id = r.lesson_session_id AND s.is_confirmed IS TRUE
  WHERE r.course_id = p_course_id AND r.student_id = p_student_id;

  SELECT COALESCE(max(x.grade) FILTER (WHERE x.sira = 1), 0), COALESCE(max(x.grade) FILTER (WHERE x.sira = 2), 0), COALESCE(max(x.grade) FILTER (WHERE x.sira = 3), 0)
  INTO v_a, v_b, v_c FROM public.colloquium_assessments x WHERE x.course_id = p_course_id AND x.student_id = p_student_id;

  SELECT COALESCE(max(x.grade) FILTER (WHERE x.sira = 1), 0), COALESCE(max(x.grade) FILTER (WHERE x.sira = 2), 0)
  INTO v_d, v_e FROM public.independent_work_assessments x WHERE x.course_id = p_course_id AND x.student_id = p_student_id;

  IF v_has_course_work THEN
    SELECT COALESCE(max(x.grade), 0) INTO v_course_work FROM public.course_work_assessments x WHERE x.course_id = p_course_id AND x.student_id = p_student_id;
  END IF;

  RETURN private.semester_score_components(v_type, v_has_course_work, v_total_hours, v_absences, v_a, v_b, v_c, v_d, v_e, v_meshgele_avg, v_labs_submitted, v_total_labs, v_course_work);
END;
$$;
REVOKE ALL ON FUNCTION private.calculate_semester_score_breakdown(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.calculate_semester_score(p_course_id uuid, p_student_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_breakdown jsonb;
BEGIN
  v_breakdown := private.calculate_semester_score_breakdown(p_course_id, p_student_id);
  IF v_breakdown IS NULL THEN RETURN NULL; END IF;
  RETURN (v_breakdown ->> 'total')::numeric;
END;
$$;
REVOKE ALL ON FUNCTION private.calculate_semester_score(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.semester_score_formula(
  p_type public.course_grading_type, p_has_course_work boolean, p_total_hours integer, p_absences integer,
  p_a numeric, p_b numeric, p_c numeric, p_d numeric, p_e numeric, p_meshgele_avg numeric,
  p_labs_submitted integer, p_total_labs integer, p_course_work numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, private
AS $$
DECLARE v_breakdown jsonb;
BEGIN
  v_breakdown := private.semester_score_components(p_type, p_has_course_work, p_total_hours, p_absences, p_a, p_b, p_c, p_d, p_e, p_meshgele_avg, p_labs_submitted, p_total_labs, p_course_work);
  IF v_breakdown IS NULL THEN RETURN NULL; END IF;
  RETURN (v_breakdown ->> 'total')::numeric;
END;
$$;
REVOKE ALL ON FUNCTION private.semester_score_formula(public.course_grading_type, boolean, integer, integer, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.semester_score_breakdown(p_course_id uuid, p_student_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_student_id uuid := COALESCE(p_student_id, auth.uid());
BEGIN
  IF v_uid IS NULL OR v_student_id IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF v_student_id = v_uid THEN
    IF NOT public.is_course_student(p_course_id, v_uid) THEN RAISE EXCEPTION 'Bu fənn üzrə məlumatı görmək icazəniz yoxdur.'; END IF;
  ELSIF NOT (public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) OR public.is_course_teacher(p_course_id, v_uid) OR public.is_course_tutor(p_course_id, v_uid)) THEN
    RAISE EXCEPTION 'Bu tələbənin semestr məlumatını görmək icazəniz yoxdur.';
  END IF;
  RETURN private.calculate_semester_score_breakdown(p_course_id, v_student_id);
END;
$$;
REVOKE ALL ON FUNCTION public.semester_score_breakdown(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.semester_score_breakdown(uuid, uuid) TO authenticated, service_role;

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
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  v_is_staff := public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) OR public.is_course_teacher(NEW.course_id, v_uid) OR public.is_course_tutor(NEW.course_id, v_uid);

  IF v_uid = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.sira IS DISTINCT FROM OLD.sira OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.topic IS DISTINCT FROM OLD.topic THEN
      RAISE EXCEPTION 'Tələbə qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
    IF NEW.status = 'qiymetlendirilib'::public.assessment_submission_status THEN RAISE EXCEPTION 'Qiymətləndirilib statusunu yalnız səlahiyyətli əməkdaş təyin edə bilər.'; END IF;

    v_submission_changed := NEW.topic_id IS DISTINCT FROM OLD.topic_id OR NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR NEW.status IS DISTINCT FROM OLD.status;
    IF v_submission_changed THEN
      IF OLD.file_url IS NOT NULL OR OLD.submitted_at IS NOT NULL OR OLD.status <> 'gozleyir'::public.assessment_submission_status THEN RAISE EXCEPTION 'Artıq təhvil vermisiniz.'; END IF;
      IF NEW.topic_id IS NULL OR NEW.file_url IS NULL OR NEW.submitted_at IS NULL OR NEW.status <> 'teqdim_edilib'::public.assessment_submission_status THEN RAISE EXCEPTION 'Təqdimat üçün mövzu, fayl və təqdim edilmə vaxtı birlikdə yazılmalıdır.'; END IF;
      IF position(OLD.student_id::text || '/' || OLD.course_id::text || '/' IN NEW.file_url) <> 1 THEN RAISE EXCEPTION 'Təqdimat fayl yolu istifadəçi və fənn qovluğuna uyğun deyil.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_student_submission_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_assessment_topic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_topic text;
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    SELECT ct.movzu INTO v_topic FROM public.course_topics ct WHERE ct.id = NEW.topic_id AND ct.course_id = NEW.course_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seçilən mövzu bu fənnə aid deyil.'; END IF;
    NEW.topic := v_topic;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_assessment_topic() FROM PUBLIC, anon, authenticated;

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
BEGIN
  v_is_staff := public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) OR public.is_course_teacher(OLD.course_id, v_uid);
  IF v_uid = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.lesson_session_id IS DISTINCT FROM OLD.lesson_session_id OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR NEW.grade IS DISTINCT FROM OLD.grade THEN
      RAISE EXCEPTION 'Tələbə davamiyyət, qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
    v_submission_changed := NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url;
    IF v_submission_changed THEN
      SELECT c.qiymetlendirme_novu INTO v_type FROM public.courses c WHERE c.id = OLD.course_id;
      IF v_type <> 'laboratoriya'::public.course_grading_type THEN RAISE EXCEPTION 'Bu fənn laboratoriya tipli deyil.'; END IF;
      IF OLD.file_url IS NOT NULL OR OLD.lab_submitted IS TRUE THEN RAISE EXCEPTION 'Artıq təhvil vermisiniz.'; END IF;
      IF NEW.file_url IS NULL OR NEW.lab_submitted IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Laboratoriya təqdimatında fayl və təhvil statusu birlikdə yazılmalıdır.'; END IF;
      IF position(OLD.student_id::text || '/' || OLD.course_id::text || '/' IN NEW.file_url) <> 1 THEN RAISE EXCEPTION 'Laboratoriya fayl yolu istifadəçi və fənn qovluğuna uyğun deyil.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_student_lesson_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_lesson_record_write_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_changed boolean := false;
  v_session_id uuid;
  v_student_submission boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_session_id := NEW.lesson_session_id;
    v_changed := NEW.attendance_status IS NOT NULL OR NEW.grade IS NOT NULL OR NEW.lab_submitted IS NOT NULL OR NEW.file_url IS NOT NULL;
  ELSE
    v_session_id := NEW.lesson_session_id;
    v_changed := NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url;
    v_student_submission := v_uid = OLD.student_id AND NEW.lesson_session_id IS NOT DISTINCT FROM OLD.lesson_session_id AND NEW.student_id IS NOT DISTINCT FROM OLD.student_id AND NEW.course_id IS NOT DISTINCT FROM OLD.course_id AND NEW.attendance_status IS NOT DISTINCT FROM OLD.attendance_status AND NEW.grade IS NOT DISTINCT FROM OLD.grade AND (NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url);
  END IF;

  IF NOT v_changed OR v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) THEN RETURN NEW; END IF;
  IF v_student_submission THEN RETURN NEW; END IF;
  IF NOT private.teacher_can_grade_lesson_at(v_session_id, v_uid, now()) THEN RAISE EXCEPTION 'Qiymət/davamiyyət yalnız dərsin başlanğıcından 5 dəqiqə əvvəl ilə bitməsindən 5 dəqiqə sonrakı intervalda və uyğun müəllim icazəsi ilə yazıla bilər.'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_lesson_record_write_window() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS lesson_student_records_student_submission_update ON public.lesson_student_records;
CREATE POLICY lesson_student_records_student_submission_update ON public.lesson_student_records FOR UPDATE TO authenticated
USING (student_id = (SELECT auth.uid()) AND public.is_course_student(course_id, (SELECT auth.uid())))
WITH CHECK (student_id = (SELECT auth.uid()) AND public.is_course_student(course_id, (SELECT auth.uid())));

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('student-submissions', 'student-submissions', false, 26214400)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS student_submissions_insert_own ON storage.objects;
CREATE POLICY student_submissions_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'student-submissions' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.group_members gm JOIN public.course_groups cg ON cg.group_id = gm.group_id WHERE gm.user_id = (SELECT auth.uid()) AND cg.course_id::text = (storage.foldername(name))[2])
);

DROP POLICY IF EXISTS student_submissions_select_authorized ON storage.objects;
CREATE POLICY student_submissions_select_authorized ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'student-submissions' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.course_teachers ct WHERE ct.muellim_id = (SELECT auth.uid()) AND ct.course_id::text = (storage.foldername(name))[2])
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.tyutor_id = (SELECT auth.uid()) AND c.id::text = (storage.foldername(name))[2])
  )
);

DROP POLICY IF EXISTS student_submissions_delete_unreferenced_own ON storage.objects;
CREATE POLICY student_submissions_delete_unreferenced_own ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'student-submissions' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT EXISTS (SELECT 1 FROM public.independent_work_assessments a WHERE a.student_id = (SELECT auth.uid()) AND a.file_url = storage.objects.name)
  AND NOT EXISTS (SELECT 1 FROM public.course_work_assessments a WHERE a.student_id = (SELECT auth.uid()) AND a.file_url = storage.objects.name)
  AND NOT EXISTS (SELECT 1 FROM public.lesson_student_records r WHERE r.student_id = (SELECT auth.uid()) AND r.file_url = storage.objects.name)
);

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['course_lesson_sessions','lesson_student_records','exam_scores','independent_work_assessments','course_work_assessments','colloquium_assessments']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;
