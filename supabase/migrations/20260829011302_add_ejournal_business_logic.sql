-- Elektron jurnal: biznes məntiqi, grading pəncərəsi, risk və sessiya generasiyası

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS tedris_hefte_sayi smallint NOT NULL DEFAULT 15;
DO $$ BEGIN
  ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_tedris_hefte_sayi_check
    CHECK (tedris_hefte_sayi BETWEEN 1 AND 30);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.course_schedule_templates ADD COLUMN IF NOT EXISTS dars_novu text;
ALTER TABLE public.course_lesson_sessions ADD COLUMN IF NOT EXISTS dars_novu text;
DO $$ BEGIN
  ALTER TABLE public.course_schedule_templates ADD CONSTRAINT course_schedule_templates_dars_novu_check
    CHECK (dars_novu IS NULL OR dars_novu IN ('muhazire','seminar','laboratoriya','serbest_is','kollokvium','tecrube'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.course_lesson_sessions ADD CONSTRAINT course_lesson_sessions_dars_novu_check
    CHECK (dars_novu IS NULL OR dars_novu IN ('muhazire','seminar','laboratoriya','serbest_is','kollokvium','tecrube'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.system_settings.tedris_hefte_sayi IS 'Cari semestr üçün tədris həftələrinin sayı; default 15.';
COMMENT ON COLUMN public.course_schedule_templates.dars_novu IS 'course_teachers.icazeler JSON icazəsi ilə yoxlanılan dərs növü.';
COMMENT ON COLUMN public.course_lesson_sessions.dars_novu IS 'Şablondan sessiyaya kopyalanan dərs növü.';

CREATE OR REPLACE FUNCTION private.week_parity_from_anchor(p_date date, p_anchor date, p_first public.academic_week_type)
RETURNS public.academic_week_type LANGUAGE plpgsql IMMUTABLE SET search_path=public,private AS $$
DECLARE v_offset integer;
BEGIN
  IF p_date IS NULL OR p_anchor IS NULL OR p_first IS NULL OR p_date < p_anchor THEN RETURN NULL; END IF;
  v_offset := floor(((p_date-p_anchor)::numeric)/7)::integer;
  IF mod(v_offset,2)=0 THEN RETURN p_first; END IF;
  RETURN CASE p_first WHEN 'ust'::public.academic_week_type THEN 'alt'::public.academic_week_type ELSE 'ust'::public.academic_week_type END;
END $$;
REVOKE ALL ON FUNCTION private.week_parity_from_anchor(date,date,public.academic_week_type) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_week_parity(p_date date)
RETURNS public.academic_week_type LANGUAGE plpgsql STABLE SET search_path=public,private AS $$
DECLARE v_first public.academic_week_type; v_anchor date;
BEGIN
  SELECT birinci_hefte_novu, hefte_rotasiya_baslama_tarixi INTO v_first,v_anchor
  FROM public.system_settings ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
  RETURN private.week_parity_from_anchor(p_date,v_anchor,v_first);
END $$;
REVOKE ALL ON FUNCTION public.get_week_parity(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_week_parity(date) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.academic_week_type(p_date date)
RETURNS public.academic_week_type LANGUAGE sql STABLE SET search_path=public AS $$ SELECT public.get_week_parity(p_date) $$;
REVOKE ALL ON FUNCTION public.academic_week_type(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.academic_week_type(date) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.validate_schedule_template()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_permissions jsonb; v_active jsonb;
BEGIN
  IF NOT private.is_course_group(NEW.course_id,NEW.group_id) THEN RAISE EXCEPTION 'Seçilən qrup bu fənnə təyin edilməyib.'; END IF;
  IF NEW.dars_novu IS NULL THEN RAISE EXCEPTION 'Dərs cədvəli şablonunda dərs növü seçilməlidir.'; END IF;
  SELECT ct.icazeler,c.aktiv_dars_novleri INTO v_permissions,v_active
  FROM public.course_teachers ct JOIN public.courses c ON c.id=ct.course_id
  WHERE ct.course_id=NEW.course_id AND ct.muellim_id=NEW.teacher_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Müəllim bu fənnə təyin edilməyib.'; END IF;
  IF NOT COALESCE((v_permissions->>NEW.dars_novu)::boolean,false) THEN RAISE EXCEPTION 'Müəllimin seçilən dərs növü üçün icazəsi yoxdur.'; END IF;
  IF NOT COALESCE((v_active->>NEW.dars_novu)::boolean,false) THEN RAISE EXCEPTION 'Seçilən dərs növü bu fənn üçün aktiv deyil.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_schedule_template() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.validate_lesson_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_template public.course_schedule_templates%ROWTYPE; v_permissions jsonb;
BEGIN
  IF TG_OP='INSERT' AND NEW.is_confirmed THEN RAISE EXCEPTION 'Yeni dərs sessiyası təsdiqlənmiş vəziyyətdə yaradıla bilməz.'; END IF;
  IF NOT private.is_course_group(NEW.course_id,NEW.group_id) THEN RAISE EXCEPTION 'Sessiyanın qrupu bu fənnə təyin edilməyib.'; END IF;
  IF NEW.dars_novu IS NULL THEN RAISE EXCEPTION 'Sessiyada dərs növü olmalıdır.'; END IF;
  IF NEW.schedule_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.course_schedule_templates WHERE id=NEW.schedule_template_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Dərs cədvəli şablonu tapılmadı.'; END IF;
    IF v_template.course_id<>NEW.course_id OR v_template.group_id<>NEW.group_id OR v_template.teacher_id<>NEW.teacher_id OR v_template.dars_novu IS DISTINCT FROM NEW.dars_novu THEN
      RAISE EXCEPTION 'Sessiya məlumatları cədvəl şablonu ilə uyğun deyil.';
    END IF;
  END IF;
  SELECT icazeler INTO v_permissions FROM public.course_teachers WHERE course_id=NEW.course_id AND muellim_id=NEW.teacher_id;
  IF NOT FOUND OR NOT COALESCE((v_permissions->>NEW.dars_novu)::boolean,false) THEN RAISE EXCEPTION 'Sessiya müəlliminin bu dərs növü üçün icazəsi yoxdur.'; END IF;
  IF NEW.topic_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.course_topics WHERE id=NEW.topic_id AND course_id=NEW.course_id) THEN RAISE EXCEPTION 'Mövzu bu fənnə aid deyil.'; END IF;
  IF NEW.lesson_date<>(NEW.starts_at AT TIME ZONE 'Asia/Baku')::date THEN RAISE EXCEPTION 'lesson_date başlanğıc vaxtının Bakı tarixi ilə uyğun olmalıdır.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_lesson_session() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.generate_course_lesson_sessions(p_start_date date,p_end_date date,p_course_id uuid DEFAULT NULL,p_group_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_inserted integer:=0; v_count integer; v_rotation_ready boolean; t record; d date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date THEN RAISE EXCEPTION 'Tarix aralığı yanlışdır.'; END IF;
  IF p_end_date-p_start_date>370 THEN RAISE EXCEPTION 'Bir çağırışda maksimum 370 günlük sessiya generasiya edilə bilər.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.system_settings WHERE birinci_hefte_novu IS NOT NULL AND hefte_rotasiya_baslama_tarixi IS NOT NULL) INTO v_rotation_ready;
  IF NOT v_rotation_ready AND EXISTS(
    SELECT 1 FROM public.course_schedule_templates x WHERE x.hefte_novu<>'her_hefte'::public.schedule_week_type
      AND (p_course_id IS NULL OR x.course_id=p_course_id) AND (p_group_id IS NULL OR x.group_id=p_group_id)
      AND (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) OR public.is_course_tutor(x.course_id,v_uid))
  ) THEN RAISE EXCEPTION 'Alt/üst həftə generasiyası üçün system_settings-də ilk həftə növü və Bazar ertəsi başlanğıc tarixi təyin edilməlidir.'; END IF;
  FOR t IN SELECT x.* FROM public.course_schedule_templates x
    WHERE (p_course_id IS NULL OR x.course_id=p_course_id) AND (p_group_id IS NULL OR x.group_id=p_group_id)
      AND (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) OR public.is_course_tutor(x.course_id,v_uid))
  LOOP
    IF t.dars_novu IS NULL THEN RAISE EXCEPTION 'Şablon % üçün dərs növü təyin edilməyib.',t.id; END IF;
    FOR d IN SELECT gs::date FROM generate_series(p_start_date,p_end_date,interval '1 day') gs LOOP
      IF extract(isodow from d)::integer=t.gun_nomresi AND (t.hefte_novu='her_hefte'::public.schedule_week_type OR public.get_week_parity(d)::text=t.hefte_novu::text) THEN
        INSERT INTO public.course_lesson_sessions(schedule_template_id,course_id,group_id,teacher_id,dars_novu,lesson_date,starts_at,ends_at)
        VALUES(t.id,t.course_id,t.group_id,t.teacher_id,t.dars_novu,d,((d+t.baslangic_saat) AT TIME ZONE 'Asia/Baku'),((d+t.bitme_saat) AT TIME ZONE 'Asia/Baku'))
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_count=ROW_COUNT; v_inserted:=v_inserted+v_count;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_inserted;
END $$;
REVOKE ALL ON FUNCTION public.generate_course_lesson_sessions(date,date,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_course_lesson_sessions(date,date,uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.current_semester_date_range()
RETURNS TABLE(start_date date,end_date date) LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE v_anchor date; v_weeks integer; v_year text; v_semester text;
BEGIN
  SELECT hefte_rotasiya_baslama_tarixi,tedris_hefte_sayi,cari_tedris_ili,cari_semestr INTO v_anchor,v_weeks,v_year,v_semester
  FROM public.system_settings ORDER BY updated_at DESC NULLS LAST,created_at DESC NULLS LAST LIMIT 1;
  IF NULLIF(btrim(COALESCE(v_year,'')),'') IS NULL OR NULLIF(btrim(COALESCE(v_semester,'')),'') IS NULL THEN RAISE EXCEPTION 'Cari tədris ili və semestr system_settings-də təyin edilməlidir.'; END IF;
  IF v_anchor IS NULL THEN RAISE EXCEPTION 'Semestrin ilk tədris Bazar ertəsi (hefte_rotasiya_baslama_tarixi) təyin edilməlidir.'; END IF;
  start_date:=v_anchor; end_date:=v_anchor+((COALESCE(v_weeks,15)*7)-1); RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.current_semester_date_range() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_semester_date_range() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.generate_current_semester_lesson_sessions(p_course_id uuid DEFAULT NULL,p_group_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_start date; v_end date;
BEGIN
  SELECT start_date,end_date INTO v_start,v_end FROM public.current_semester_date_range();
  RETURN public.generate_course_lesson_sessions(v_start,v_end,p_course_id,p_group_id);
END $$;
REVOKE ALL ON FUNCTION public.generate_current_semester_lesson_sessions(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_current_semester_lesson_sessions(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.grade_time_window_contains(p_starts_at timestamptz,p_ends_at timestamptz,p_now timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public,private AS $$
SELECT p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_now IS NOT NULL
 AND p_now>=p_starts_at-interval '5 minutes' AND p_now<=p_ends_at+interval '5 minutes' $$;
REVOKE ALL ON FUNCTION private.grade_time_window_contains(timestamptz,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.teacher_can_grade_lesson_at(p_lesson_id uuid,p_teacher_id uuid,p_now timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,private AS $$
SELECT EXISTS(SELECT 1 FROM public.course_lesson_sessions s JOIN public.course_teachers ct ON ct.course_id=s.course_id AND ct.muellim_id=p_teacher_id
 WHERE s.id=p_lesson_id AND s.teacher_id=p_teacher_id AND s.dars_novu IS NOT NULL
   AND COALESCE((ct.icazeler->>s.dars_novu)::boolean,false)
   AND private.grade_time_window_contains(s.starts_at,s.ends_at,p_now)) $$;
REVOKE ALL ON FUNCTION private.teacher_can_grade_lesson_at(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.can_grade_now(p_lesson_id uuid,p_teacher_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF v_uid<>p_teacher_id AND NOT public.has_role(v_uid,'admin'::public.app_role) AND NOT public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN false; END IF;
  RETURN private.teacher_can_grade_lesson_at(p_lesson_id,p_teacher_id,now());
END $$;
REVOKE ALL ON FUNCTION public.can_grade_now(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_grade_now(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.enforce_lesson_record_write_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_uid uuid:=auth.uid(); v_changed boolean:=false; v_session_id uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    v_session_id:=NEW.lesson_session_id;
    v_changed:=NEW.attendance_status IS NOT NULL OR NEW.grade IS NOT NULL OR NEW.lab_submitted IS NOT NULL OR NEW.file_url IS NOT NULL;
  ELSE
    v_session_id:=NEW.lesson_session_id;
    v_changed:=NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted OR NEW.file_url IS DISTINCT FROM OLD.file_url;
  END IF;
  IF NOT v_changed OR v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) THEN RETURN NEW; END IF;
  IF NOT private.teacher_can_grade_lesson_at(v_session_id,v_uid,now()) THEN RAISE EXCEPTION 'Qiymət/davamiyyət yalnız dərsin başlanğıcından 5 dəqiqə əvvəl ilə bitməsindən 5 dəqiqə sonrakı intervalda və uyğun müəllim icazəsi ilə yazıla bilər.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enforce_lesson_record_write_window() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_lesson_record_write_window ON public.lesson_student_records;
CREATE TRIGGER enforce_lesson_record_write_window BEFORE INSERT OR UPDATE ON public.lesson_student_records FOR EACH ROW EXECUTE FUNCTION private.enforce_lesson_record_write_window();

CREATE OR REPLACE FUNCTION private.protect_student_lesson_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_is_staff boolean;
BEGIN
  v_is_staff:=public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'dekan'::public.app_role) OR public.is_course_teacher(OLD.course_id,auth.uid());
  IF auth.uid()=OLD.student_id AND NOT v_is_staff AND (
    NEW.lesson_session_id IS DISTINCT FROM OLD.lesson_session_id OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.course_id IS DISTINCT FROM OLD.course_id
    OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.lab_submitted IS DISTINCT FROM OLD.lab_submitted
  ) THEN RAISE EXCEPTION 'Tələbə davamiyyət, qiymət, laboratoriya statusu və sistem sahələrini dəyişə bilməz.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_student_lesson_fields() FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS lesson_student_records_insert ON public.lesson_student_records;
CREATE POLICY lesson_student_records_insert ON public.lesson_student_records FOR INSERT TO authenticated WITH CHECK(
 public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.can_grade_now(lesson_session_id,(SELECT auth.uid())));
DROP POLICY IF EXISTS lesson_student_records_update ON public.lesson_student_records;
CREATE POLICY lesson_student_records_update ON public.lesson_student_records FOR UPDATE TO authenticated
USING(public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.can_grade_now(lesson_session_id,(SELECT auth.uid())))
WITH CHECK(public.has_role((SELECT auth.uid()),'admin'::public.app_role) OR public.has_role((SELECT auth.uid()),'dekan'::public.app_role) OR public.can_grade_now(lesson_session_id,(SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.absence_limit(p_total_hours integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT floor(greatest(COALESCE(p_total_hours,0),0)::numeric/8)::integer $$;
REVOKE ALL ON FUNCTION public.absence_limit(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.absence_limit(integer) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.semester_score_formula(
 p_type public.course_grading_type,p_has_course_work boolean,p_total_hours integer,p_absences integer,
 p_a numeric,p_b numeric,p_c numeric,p_d numeric,p_e numeric,p_meshgele_avg numeric,p_labs_submitted integer,p_total_labs integer,p_course_work numeric)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=public,private AS $$
DECLARE v_att numeric:=0; v_col numeric:=0; v_ind numeric:=0; v_daily numeric:=0; v_cw numeric:=0; v_result numeric:=0;
BEGIN
  IF p_type IS NULL THEN RETURN NULL; END IF;
  IF COALESCE(p_total_hours,0)>0 THEN v_att:=greatest(0::numeric,10::numeric-(((COALESCE(p_absences,0)*2)::numeric/p_total_hours::numeric)*10::numeric)); END IF;
  v_ind:=least(10::numeric,greatest(0::numeric,COALESCE(p_d,0)+COALESCE(p_e,0)));
  IF COALESCE(p_has_course_work,false) THEN
    v_col:=((COALESCE(p_a,0)+COALESCE(p_b,0)+COALESCE(p_c,0))/3::numeric)*1.2::numeric;
    v_cw:=least(10::numeric,greatest(0::numeric,COALESCE(p_course_work,0)));
  ELSE v_col:=((COALESCE(p_a,0)+COALESCE(p_b,0)+COALESCE(p_c,0))/3::numeric)*1.8::numeric; END IF;
  IF p_type='meshgele'::public.course_grading_type THEN
    v_daily:=COALESCE(p_meshgele_avg,0)*CASE WHEN COALESCE(p_has_course_work,false) THEN 0.8::numeric ELSE 1.2::numeric END;
  ELSIF COALESCE(p_total_labs,0)>0 THEN
    v_daily:=(COALESCE(p_labs_submitted,0)::numeric/p_total_labs::numeric)*CASE WHEN COALESCE(p_has_course_work,false) THEN 8::numeric ELSE 12::numeric END;
  END IF;
  v_result:=v_col+v_ind+v_cw+v_daily+v_att;
  RETURN round(least(50::numeric,greatest(0::numeric,v_result)),2);
END $$;
REVOKE ALL ON FUNCTION private.semester_score_formula(public.course_grading_type,boolean,integer,integer,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,numeric) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.has_ejournal_data(p_course_id uuid,p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,private AS $$
SELECT EXISTS(SELECT 1 FROM public.lesson_student_records r WHERE r.course_id=p_course_id AND r.student_id=p_student_id AND (r.attendance_status IS NOT NULL OR r.grade IS NOT NULL OR r.lab_submitted IS NOT NULL OR r.file_url IS NOT NULL))
 OR EXISTS(SELECT 1 FROM public.independent_work_assessments x WHERE x.course_id=p_course_id AND x.student_id=p_student_id AND (x.grade IS NOT NULL OR x.submitted_at IS NOT NULL OR x.status<>'gozleyir'::public.assessment_submission_status))
 OR EXISTS(SELECT 1 FROM public.course_work_assessments x WHERE x.course_id=p_course_id AND x.student_id=p_student_id AND (x.grade IS NOT NULL OR x.submitted_at IS NOT NULL OR x.status<>'gozleyir'::public.assessment_submission_status))
 OR EXISTS(SELECT 1 FROM public.colloquium_assessments x WHERE x.course_id=p_course_id AND x.student_id=p_student_id AND (x.grade IS NOT NULL OR x.tarix IS NOT NULL)) $$;
REVOKE ALL ON FUNCTION private.has_ejournal_data(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.calculate_semester_score(p_course_id uuid,p_student_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_type public.course_grading_type; v_has_cw boolean; v_l integer; v_f integer; v_m integer:=0; v_a numeric:=0; v_b numeric:=0; v_c numeric:=0; v_d numeric:=0; v_e numeric:=0; v_avg numeric:=0; v_g integer:=0; v_cw numeric:=0;
BEGIN
  SELECT qiymetlendirme_novu,kurs_isi_var,umumi_lab_sayi INTO v_type,v_has_cw,v_f FROM public.courses WHERE id=p_course_id;
  IF NOT FOUND OR v_type IS NULL THEN RETURN NULL; END IF;
  v_l:=public.course_effective_total_hours(p_course_id,p_student_id);
  SELECT count(*) FILTER(WHERE attendance_status='qayıb'::public.lesson_attendance_status)::integer,COALESCE(avg(grade) FILTER(WHERE grade IS NOT NULL),0),count(*) FILTER(WHERE lab_submitted IS TRUE)::integer
    INTO v_m,v_avg,v_g FROM public.lesson_student_records WHERE course_id=p_course_id AND student_id=p_student_id;
  SELECT COALESCE(max(grade) FILTER(WHERE sira=1),0),COALESCE(max(grade) FILTER(WHERE sira=2),0),COALESCE(max(grade) FILTER(WHERE sira=3),0)
    INTO v_a,v_b,v_c FROM public.colloquium_assessments WHERE course_id=p_course_id AND student_id=p_student_id;
  SELECT COALESCE(max(grade) FILTER(WHERE sira=1),0),COALESCE(max(grade) FILTER(WHERE sira=2),0)
    INTO v_d,v_e FROM public.independent_work_assessments WHERE course_id=p_course_id AND student_id=p_student_id;
  IF v_has_cw THEN SELECT COALESCE(max(grade),0) INTO v_cw FROM public.course_work_assessments WHERE course_id=p_course_id AND student_id=p_student_id; END IF;
  RETURN private.semester_score_formula(v_type,v_has_cw,v_l,v_m,v_a,v_b,v_c,v_d,v_e,v_avg,v_g,v_f,v_cw);
END $$;
REVOKE ALL ON FUNCTION private.calculate_semester_score(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.sync_exam_semester_score(p_course_id uuid,p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_score numeric; v_year text; v_semtext text; v_sem smallint; v_id uuid;
BEGIN
  IF NOT private.has_ejournal_data(p_course_id,p_student_id) OR NOT EXISTS(SELECT 1 FROM public.courses WHERE id=p_course_id AND qiymetlendirme_novu IS NOT NULL) THEN RETURN; END IF;
  v_score:=private.calculate_semester_score(p_course_id,p_student_id); IF v_score IS NULL THEN RETURN; END IF;
  SELECT cari_tedris_ili,cari_semestr INTO v_year,v_semtext FROM public.system_settings ORDER BY updated_at DESC NULLS LAST,created_at DESC NULLS LAST LIMIT 1;
  v_sem:=CASE lower(btrim(COALESCE(v_semtext,''))) WHEN 'payız' THEN 1 WHEN 'payiz' THEN 1 WHEN 'fall' THEN 1 WHEN '1' THEN 1 WHEN 'i' THEN 1 WHEN 'yaz' THEN 2 WHEN 'spring' THEN 2 WHEN '2' THEN 2 WHEN 'ii' THEN 2 ELSE NULL END;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student_id::text||':'||p_course_id::text||':'||COALESCE(v_year,'')||':'||COALESCE(v_sem::text,''),0));
  SELECT id INTO v_id FROM public.exam_scores WHERE user_id=p_student_id AND course_id=p_course_id AND (v_year IS NULL OR tedris_ili=v_year) AND (v_sem IS NULL OR semestr=v_sem) ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.exam_scores(user_id,course_id,semestr_qiymeti,tedris_ili,semestr,yekun_qiymet) VALUES(p_student_id,p_course_id,v_score,v_year,v_sem,NULL);
  ELSE
    UPDATE public.exam_scores SET semestr_qiymeti=v_score,yekun_qiymet=CASE WHEN imtahan_bali IS NULL THEN NULL ELSE least(100::numeric,v_score+imtahan_bali) END WHERE id=v_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.sync_exam_semester_score(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.enforce_exam_semester_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_score numeric;
BEGIN
  IF NEW.course_id IS NOT NULL AND private.has_ejournal_data(NEW.course_id,NEW.user_id) AND EXISTS(SELECT 1 FROM public.courses WHERE id=NEW.course_id AND qiymetlendirme_novu IS NOT NULL) THEN
    v_score:=private.calculate_semester_score(NEW.course_id,NEW.user_id);
    IF v_score IS NOT NULL THEN NEW.semestr_qiymeti:=v_score; NEW.yekun_qiymet:=CASE WHEN NEW.imtahan_bali IS NULL THEN NULL ELSE least(100::numeric,v_score+NEW.imtahan_bali) END; END IF;
  END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enforce_exam_semester_score() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS sync_score_lesson_student_record ON public.lesson_student_records;
CREATE TRIGGER sync_score_lesson_student_record AFTER INSERT OR UPDATE OR DELETE ON public.lesson_student_records FOR EACH ROW EXECUTE FUNCTION private.sync_semester_score_from_assessment();

CREATE OR REPLACE FUNCTION public.calculate_semester_score(p_course_id uuid,p_student_id uuid)
RETURNS numeric LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_score numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF v_uid<>p_student_id AND NOT public.has_role(v_uid,'admin'::public.app_role) AND NOT public.has_role(v_uid,'dekan'::public.app_role) AND NOT public.is_course_teacher(p_course_id,v_uid) AND NOT public.is_course_tutor(p_course_id,v_uid) THEN RAISE EXCEPTION 'Bu semestr balını hesablamaq üçün icazəniz yoxdur.'; END IF;
  v_score:=private.calculate_semester_score(p_course_id,p_student_id); IF v_score IS NULL THEN RETURN NULL; END IF;
  IF private.has_ejournal_data(p_course_id,p_student_id) THEN PERFORM private.sync_exam_semester_score(p_course_id,p_student_id); END IF;
  RETURN v_score;
END $$;
REVOKE ALL ON FUNCTION public.calculate_semester_score(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calculate_semester_score(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.at_risk_students(p_group_id uuid)
RETURNS TABLE(user_id uuid,ad text,soyad text,course_id uuid,course_ad text,qayib_sayi bigint,qayib_limiti integer,telefon text,e_poct text,qrup text,fakulte text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF NOT public.has_role(v_uid,'admin'::public.app_role) AND NOT public.has_role(v_uid,'dekan'::public.app_role) AND NOT public.is_group_teacher(p_group_id,v_uid) AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=p_group_id AND tyutor_id=v_uid) THEN RAISE EXCEPTION 'Bu qrup üçün risk siyahısını görmək icazəniz yoxdur.'; END IF;
  RETURN QUERY WITH gc AS(
    SELECT c.id course_id,c.ad course_ad FROM public.courses c WHERE c.group_id=p_group_id UNION SELECT c.id,c.ad FROM public.course_groups cg JOIN public.courses c ON c.id=cg.course_id WHERE cg.group_id=p_group_id
  ), st AS(
    SELECT gm.user_id,p.ad,p.soyad,p.telefon,p.e_poct,COALESCE(p.qrup,g.ad) qrup,p.fakulte FROM public.group_members gm JOIN public.groups g ON g.id=gm.group_id JOIN public.profiles p ON p.user_id=gm.user_id
    WHERE gm.group_id=p_group_id AND EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=gm.user_id AND ur.role='telebe'::public.app_role)
  )
  SELECT st.user_id,st.ad,st.soyad,gc.course_id,gc.course_ad,a.qayib_sayi,public.absence_limit(h.total_hours),st.telefon,st.e_poct,st.qrup,st.fakulte
  FROM st CROSS JOIN gc
  CROSS JOIN LATERAL(SELECT count(*) FILTER(WHERE r.attendance_status='qayıb'::public.lesson_attendance_status)::bigint qayib_sayi FROM public.lesson_student_records r JOIN public.course_lesson_sessions s ON s.id=r.lesson_session_id WHERE r.student_id=st.user_id AND r.course_id=gc.course_id AND s.group_id=p_group_id) a
  CROSS JOIN LATERAL(SELECT public.course_effective_total_hours(gc.course_id,st.user_id) total_hours) h
  WHERE a.qayib_sayi>public.absence_limit(h.total_hours)
  ORDER BY st.soyad NULLS LAST,st.ad NULLS LAST,gc.course_ad;
END $$;
REVOKE ALL ON FUNCTION public.at_risk_students(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.at_risk_students(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_confirmed_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_unlock text:=current_setting('app.ejournal_unlock_session_id',true); v_uid uuid:=auth.uid();
BEGIN
  IF OLD.is_confirmed THEN
    IF TG_OP='UPDATE' AND NEW.is_confirmed=false AND v_unlock=OLD.id::text AND (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role)) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Təsdiqlənmiş dərs sessiyası dəyişdirilə və ya silinə bilməz.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_confirmed_session() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.confirm_lesson_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_missing integer; v_total integer; v_unlock text:=current_setting('app.ejournal_unlock_session_id',true); v_uid uuid:=auth.uid();
BEGIN
  IF NOT OLD.is_confirmed AND NEW.is_confirmed THEN
    IF NOT(public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role) OR (NEW.teacher_id=v_uid AND public.is_course_teacher(NEW.course_id,v_uid))) THEN RAISE EXCEPTION 'Bu dərs sessiyasını təsdiqləmək icazəniz yoxdur.'; END IF;
    PERFORM private.seed_session_students(NEW.id,NEW.course_id,NEW.group_id);
    SELECT count(*),count(*) FILTER(WHERE attendance_status IS NULL) INTO v_total,v_missing FROM public.lesson_student_records WHERE lesson_session_id=NEW.id;
    IF v_total=0 THEN RAISE EXCEPTION 'Sessiyanı təsdiqləmək üçün qrupda tələbə olmalıdır.'; END IF;
    IF v_missing>0 THEN RAISE EXCEPTION 'Sessiyanı təsdiqləməzdən əvvəl bütün tələbələrin davamiyyətini qeyd edin.'; END IF;
    NEW.confirmed_at:=now(); NEW.confirmed_by:=v_uid;
  ELSIF OLD.is_confirmed AND NOT NEW.is_confirmed THEN
    IF v_unlock<>OLD.id::text OR NOT(public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role)) THEN RAISE EXCEPTION 'Təsdiqlənmiş sessiyanı yalnız admin/dekan auditli kilid-açma əməliyyatı ilə geri aça bilər.'; END IF;
    NEW.confirmed_at:=NULL; NEW.confirmed_by:=NULL;
  ELSIF OLD.is_confirmed IS DISTINCT FROM NEW.is_confirmed THEN RAISE EXCEPTION 'Təsdiq vəziyyəti dəyişdirilə bilməz.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.confirm_lesson_session() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.unlock_lesson_session(p_lesson_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_session public.course_lesson_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF NOT(public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'dekan'::public.app_role)) THEN RAISE EXCEPTION 'Sessiyanın kilidini yalnız admin və ya dekan aça bilər.'; END IF;
  IF length(btrim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'Kilidi açma səbəbi ən azı 3 simvol olmalıdır.'; END IF;
  SELECT * INTO v_session FROM public.course_lesson_sessions WHERE id=p_lesson_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dərs sessiyası tapılmadı.'; END IF;
  IF NOT v_session.is_confirmed THEN RAISE EXCEPTION 'Sessiya artıq açıqdır.'; END IF;
  PERFORM set_config('app.ejournal_unlock_session_id',p_lesson_id::text,true);
  UPDATE public.course_lesson_sessions SET is_confirmed=false,confirmed_at=NULL,confirmed_by=NULL WHERE id=p_lesson_id;
  INSERT INTO public.activity_logs(user_id,emeliyyat,etrafli) VALUES(v_uid,'jurnal_sessiyasi_kilidi_acildi',jsonb_build_object(
    'cedvel','course_lesson_sessions','record_id',p_lesson_id,'course_id',v_session.course_id,'group_id',v_session.group_id,'teacher_id',v_session.teacher_id,
    'lesson_date',v_session.lesson_date,'sebeb',btrim(p_reason),'evvelki_confirmed_at',v_session.confirmed_at,'evvelki_confirmed_by',v_session.confirmed_by));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.unlock_lesson_session(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unlock_lesson_session(uuid,text) TO authenticated,service_role;
