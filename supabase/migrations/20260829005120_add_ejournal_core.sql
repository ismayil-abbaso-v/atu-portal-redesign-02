-- Elektron Jurnal: əsas DB infrastrukturu

DO $$ BEGIN CREATE TYPE public.course_grading_type AS ENUM ('meshgele', 'laboratoriya'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.schedule_week_type AS ENUM ('her_hefte', 'ust', 'alt'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_week_type AS ENUM ('ust', 'alt'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lesson_attendance_status AS ENUM ('iştirak edib', 'qayıb'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.assessment_submission_status AS ENUM ('gozleyir', 'teqdim_edilib', 'qiymetlendirilib'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS qiymetlendirme_novu public.course_grading_type,
  ADD COLUMN IF NOT EXISTS kurs_isi_var boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS umumi_lab_sayi integer,
  ADD COLUMN IF NOT EXISTS umumi_ders_saati integer;

DO $$ BEGIN ALTER TABLE public.courses ADD CONSTRAINT courses_umumi_lab_sayi_check CHECK (umumi_lab_sayi IS NULL OR umumi_lab_sayi > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.courses ADD CONSTRAINT courses_umumi_ders_saati_check CHECK (umumi_ders_saati IS NULL OR umumi_ders_saati > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.courses ADD CONSTRAINT courses_lab_count_grading_type_check
    CHECK (umumi_lab_sayi IS NULL OR COALESCE(qiymetlendirme_novu = 'laboratoriya'::public.course_grading_type, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.courses.qiymetlendirme_novu IS '50-ballıq semestr formulunda məşğələ və ya laboratoriya budağını seçir; aktiv_dars_novleri-dən fərqlidir.';
COMMENT ON COLUMN public.courses.kurs_isi_var IS 'Fənndə kurs işi qiymətləndirməsinin olub-olmaması.';
COMMENT ON COLUMN public.courses.umumi_lab_sayi IS 'Laboratoriya formulundakı ümumi laboratoriya sayı (f).';
COMMENT ON COLUMN public.courses.umumi_ders_saati IS 'Semestr üzrə ümumi dərs saatı (l). NULL olduqda yaradılmış sessiyalardan avtomatik hesablanır.';

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS birinci_hefte_novu public.academic_week_type,
  ADD COLUMN IF NOT EXISTS hefte_rotasiya_baslama_tarixi date;
DO $$ BEGIN
  ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_rotation_monday_check
    CHECK (hefte_rotasiya_baslama_tarixi IS NULL OR extract(isodow from hefte_rotasiya_baslama_tarixi) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON COLUMN public.system_settings.birinci_hefte_novu IS 'Semestrin ilk tədris həftəsinin növü: üst və ya alt.';
COMMENT ON COLUMN public.system_settings.hefte_rotasiya_baslama_tarixi IS 'Həftə rotasiyasının hesablandığı ilk Bazar ertəsi.';

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_teachers'::regclass
      AND conname = 'course_teachers_course_id_muellim_id_key'
  ) THEN
    ALTER TABLE public.course_teachers
      ADD CONSTRAINT course_teachers_course_id_muellim_id_key UNIQUE (course_id, muellim_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.course_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  gun_nomresi smallint NOT NULL CHECK (gun_nomresi BETWEEN 1 AND 7),
  baslangic_saat time NOT NULL,
  bitme_saat time NOT NULL,
  otaq text,
  hefte_novu public.schedule_week_type NOT NULL DEFAULT 'her_hefte',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_schedule_templates_time_check CHECK (bitme_saat > baslangic_saat),
  CONSTRAINT course_schedule_templates_teacher_fkey FOREIGN KEY (course_id, teacher_id)
    REFERENCES public.course_teachers(course_id, muellim_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT course_schedule_templates_unique_slot UNIQUE (course_id, group_id, teacher_id, gun_nomresi, baslangic_saat, hefte_novu)
);
CREATE INDEX IF NOT EXISTS idx_course_schedule_templates_course_group ON public.course_schedule_templates(course_id, group_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_templates_teacher ON public.course_schedule_templates(teacher_id);

CREATE TABLE IF NOT EXISTS public.course_lesson_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_template_id uuid REFERENCES public.course_schedule_templates(id) ON DELETE SET NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  lesson_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  movzu text,
  is_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_lesson_sessions_time_check CHECK (ends_at > starts_at),
  CONSTRAINT course_lesson_sessions_confirmation_check CHECK (
    (NOT is_confirmed AND confirmed_at IS NULL AND confirmed_by IS NULL)
    OR (is_confirmed AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
  ),
  CONSTRAINT course_lesson_sessions_teacher_fkey FOREIGN KEY (course_id, teacher_id)
    REFERENCES public.course_teachers(course_id, muellim_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT course_lesson_sessions_id_course_unique UNIQUE (id, course_id),
  CONSTRAINT course_lesson_sessions_template_date_unique UNIQUE (schedule_template_id, lesson_date),
  CONSTRAINT course_lesson_sessions_slot_unique UNIQUE (course_id, group_id, teacher_id, starts_at)
);
CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_course_date ON public.course_lesson_sessions(course_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_group_date ON public.course_lesson_sessions(group_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_teacher_date ON public.course_lesson_sessions(teacher_id, lesson_date);

CREATE TABLE IF NOT EXISTS public.lesson_student_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  attendance_status public.lesson_attendance_status,
  grade numeric(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 10)),
  lab_submitted boolean,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_student_records_session_course_fkey FOREIGN KEY (lesson_session_id, course_id)
    REFERENCES public.course_lesson_sessions(id, course_id) ON DELETE CASCADE,
  CONSTRAINT lesson_student_records_unique UNIQUE (lesson_session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_student_records_student_course ON public.lesson_student_records(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_student_records_course_attendance ON public.lesson_student_records(course_id, attendance_status);

CREATE TABLE IF NOT EXISTS public.independent_work_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sira smallint NOT NULL CHECK (sira IN (1, 2)),
  topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  topic text,
  file_url text,
  grade numeric(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 5)),
  submitted_at timestamptz,
  status public.assessment_submission_status NOT NULL DEFAULT 'gozleyir',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT independent_work_assessments_unique UNIQUE (course_id, student_id, sira)
);
CREATE INDEX IF NOT EXISTS idx_independent_work_student_course ON public.independent_work_assessments(student_id, course_id);

CREATE TABLE IF NOT EXISTS public.course_work_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sira smallint NOT NULL DEFAULT 1 CHECK (sira = 1),
  topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  topic text,
  file_url text,
  grade numeric(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 10)),
  submitted_at timestamptz,
  status public.assessment_submission_status NOT NULL DEFAULT 'gozleyir',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_work_assessments_unique UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_course_work_student_course ON public.course_work_assessments(student_id, course_id);

CREATE TABLE IF NOT EXISTS public.colloquium_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sira smallint NOT NULL CHECK (sira IN (1, 2, 3)),
  tarix date,
  grade numeric(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 10)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT colloquium_assessments_unique UNIQUE (course_id, student_id, sira)
);
CREATE INDEX IF NOT EXISTS idx_colloquium_student_course ON public.colloquium_assessments(student_id, course_id);

ALTER TABLE public.course_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.independent_work_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_work_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colloquium_assessments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS course_schedule_templates_updated_at ON public.course_schedule_templates;
CREATE TRIGGER course_schedule_templates_updated_at BEFORE UPDATE ON public.course_schedule_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS course_lesson_sessions_updated_at ON public.course_lesson_sessions;
CREATE TRIGGER course_lesson_sessions_updated_at BEFORE UPDATE ON public.course_lesson_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS lesson_student_records_updated_at ON public.lesson_student_records;
CREATE TRIGGER lesson_student_records_updated_at BEFORE UPDATE ON public.lesson_student_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS independent_work_assessments_updated_at ON public.independent_work_assessments;
CREATE TRIGGER independent_work_assessments_updated_at BEFORE UPDATE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS course_work_assessments_updated_at ON public.course_work_assessments;
CREATE TRIGGER course_work_assessments_updated_at BEFORE UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS colloquium_assessments_updated_at ON public.colloquium_assessments;
CREATE TRIGGER colloquium_assessments_updated_at BEFORE UPDATE ON public.colloquium_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.course_student_ids(p_course_id uuid)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  WITH candidates AS (
    SELECT gm.user_id FROM public.courses c JOIN public.group_members gm ON gm.group_id = c.group_id WHERE c.id = p_course_id
    UNION
    SELECT gm.user_id FROM public.course_groups cg JOIN public.group_members gm ON gm.group_id = cg.group_id WHERE cg.course_id = p_course_id
    UNION
    SELECT css.user_id FROM public.course_student_status css WHERE css.course_id = p_course_id AND css.status = 'elave'
  )
  SELECT DISTINCT x.user_id FROM candidates x
  JOIN public.user_roles ur ON ur.user_id = x.user_id AND ur.role = 'telebe'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.course_student_status css
    WHERE css.course_id = p_course_id AND css.user_id = x.user_id AND css.status = 'kesilib'
  );
$$;
REVOKE ALL ON FUNCTION private.course_student_ids(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_course_group(p_course_id uuid, p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.group_id = p_group_id)
  OR EXISTS (SELECT 1 FROM public.course_groups cg WHERE cg.course_id = p_course_id AND cg.group_id = p_group_id);
$$;
REVOKE ALL ON FUNCTION private.is_course_group(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_schedule_template()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT private.is_course_group(NEW.course_id, NEW.group_id) THEN RAISE EXCEPTION 'Seçilən qrup bu fənnə təyin edilməyib.'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_schedule_template() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_course_schedule_template ON public.course_schedule_templates;
CREATE TRIGGER validate_course_schedule_template BEFORE INSERT OR UPDATE ON public.course_schedule_templates FOR EACH ROW EXECUTE FUNCTION private.validate_schedule_template();

CREATE OR REPLACE FUNCTION private.validate_lesson_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_template public.course_schedule_templates%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_confirmed THEN RAISE EXCEPTION 'Yeni dərs sessiyası təsdiqlənmiş vəziyyətdə yaradıla bilməz.'; END IF;
  IF NOT private.is_course_group(NEW.course_id, NEW.group_id) THEN RAISE EXCEPTION 'Sessiyanın qrupu bu fənnə təyin edilməyib.'; END IF;
  IF NEW.schedule_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.course_schedule_templates WHERE id = NEW.schedule_template_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Dərs cədvəli şablonu tapılmadı.'; END IF;
    IF v_template.course_id <> NEW.course_id OR v_template.group_id <> NEW.group_id OR v_template.teacher_id <> NEW.teacher_id THEN
      RAISE EXCEPTION 'Sessiya məlumatları cədvəl şablonu ilə uyğun deyil.';
    END IF;
  END IF;
  IF NEW.topic_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.course_topics ct WHERE ct.id = NEW.topic_id AND ct.course_id = NEW.course_id) THEN
    RAISE EXCEPTION 'Mövzu bu fənnə aid deyil.';
  END IF;
  IF NEW.lesson_date <> (NEW.starts_at AT TIME ZONE 'Asia/Baku')::date THEN RAISE EXCEPTION 'lesson_date başlanğıc vaxtının Bakı tarixi ilə uyğun olmalıdır.'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_lesson_session() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_course_lesson_session ON public.course_lesson_sessions;
CREATE TRIGGER validate_course_lesson_session BEFORE INSERT OR UPDATE ON public.course_lesson_sessions FOR EACH ROW EXECUTE FUNCTION private.validate_lesson_session();

CREATE OR REPLACE FUNCTION private.seed_session_students(p_session_id uuid, p_course_id uuid, p_group_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  INSERT INTO public.lesson_student_records (lesson_session_id, student_id, course_id)
  SELECT p_session_id, gm.user_id, p_course_id
  FROM public.group_members gm
  JOIN public.user_roles ur ON ur.user_id = gm.user_id AND ur.role = 'telebe'::public.app_role
  WHERE gm.group_id = p_group_id AND public.is_course_student(p_course_id, gm.user_id)
  ON CONFLICT (lesson_session_id, student_id) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION private.seed_session_students(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.seed_session_students_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN PERFORM private.seed_session_students(NEW.id, NEW.course_id, NEW.group_id); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.seed_session_students_trigger() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_seed_lesson_session_students ON public.course_lesson_sessions;
CREATE TRIGGER a_seed_lesson_session_students AFTER INSERT ON public.course_lesson_sessions FOR EACH ROW EXECUTE FUNCTION private.seed_session_students_trigger();

CREATE OR REPLACE FUNCTION private.guard_confirmed_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF OLD.is_confirmed THEN RAISE EXCEPTION 'Təsdiqlənmiş dərs sessiyası dəyişdirilə və ya silinə bilməz.'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.guard_confirmed_session() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_confirmed_lesson_session ON public.course_lesson_sessions;
CREATE TRIGGER guard_confirmed_lesson_session BEFORE UPDATE OR DELETE ON public.course_lesson_sessions FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_session();

CREATE OR REPLACE FUNCTION private.confirm_lesson_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_missing integer; v_total integer;
BEGIN
  IF NOT OLD.is_confirmed AND NEW.is_confirmed THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dekan'::public.app_role)
      OR (NEW.teacher_id = auth.uid() AND public.is_course_teacher(NEW.course_id, auth.uid()))) THEN
      RAISE EXCEPTION 'Bu dərs sessiyasını təsdiqləmək icazəniz yoxdur.';
    END IF;
    PERFORM private.seed_session_students(NEW.id, NEW.course_id, NEW.group_id);
    SELECT count(*), count(*) FILTER (WHERE attendance_status IS NULL) INTO v_total, v_missing
    FROM public.lesson_student_records WHERE lesson_session_id = NEW.id;
    IF v_total = 0 THEN RAISE EXCEPTION 'Sessiyanı təsdiqləmək üçün qrupda tələbə olmalıdır.'; END IF;
    IF v_missing > 0 THEN RAISE EXCEPTION 'Sessiyanı təsdiqləməzdən əvvəl bütün tələbələrin davamiyyətini qeyd edin.'; END IF;
    NEW.confirmed_at := now(); NEW.confirmed_by := auth.uid();
  ELSIF OLD.is_confirmed IS DISTINCT FROM NEW.is_confirmed THEN
    RAISE EXCEPTION 'Təsdiqlənmiş sessiyanı geri açmaq olmaz.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.confirm_lesson_session() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS confirm_lesson_session ON public.course_lesson_sessions;
CREATE TRIGGER confirm_lesson_session BEFORE UPDATE OF is_confirmed ON public.course_lesson_sessions FOR EACH ROW EXECUTE FUNCTION private.confirm_lesson_session();

CREATE OR REPLACE FUNCTION private.validate_lesson_student_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_confirmed boolean; v_type public.course_grading_type; v_group_id uuid;
BEGIN
  SELECT s.is_confirmed, s.group_id INTO v_confirmed, v_group_id
  FROM public.course_lesson_sessions s WHERE s.id = COALESCE(NEW.lesson_session_id, OLD.lesson_session_id);
  IF TG_OP IN ('UPDATE', 'DELETE') AND COALESCE(v_confirmed, false) THEN RAISE EXCEPTION 'Təsdiqlənmiş sessiyanın tələbə qeydi dəyişdirilə bilməz.'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = v_group_id AND gm.user_id = NEW.student_id)
     OR NOT public.is_course_student(NEW.course_id, NEW.student_id) THEN RAISE EXCEPTION 'Tələbə bu sessiyanın qrup/fənn tərkibində deyil.'; END IF;
  SELECT c.qiymetlendirme_novu INTO v_type FROM public.courses c WHERE c.id = NEW.course_id;
  IF v_type = 'meshgele'::public.course_grading_type AND NEW.lab_submitted IS NOT NULL THEN RAISE EXCEPTION 'Məşğələ tipli fənndə lab_submitted istifadə edilmir.'; END IF;
  IF v_type = 'laboratoriya'::public.course_grading_type AND NEW.grade IS NOT NULL THEN RAISE EXCEPTION 'Laboratoriya tipli fənndə gündəlik grade istifadə edilmir.'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_lesson_student_record() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_lesson_student_record ON public.lesson_student_records;
CREATE TRIGGER validate_lesson_student_record BEFORE INSERT OR UPDATE OR DELETE ON public.lesson_student_records FOR EACH ROW EXECUTE FUNCTION private.validate_lesson_student_record();

CREATE OR REPLACE FUNCTION private.protect_student_submission_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_is_staff boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  v_is_staff := public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dekan'::public.app_role)
    OR public.is_course_teacher(NEW.course_id, auth.uid()) OR public.is_course_tutor(NEW.course_id, auth.uid());
  IF auth.uid() = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.sira IS DISTINCT FROM OLD.sira OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.topic_id IS DISTINCT FROM OLD.topic_id THEN
      RAISE EXCEPTION 'Tələbə qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
    IF NEW.status = 'qiymetlendirilib'::public.assessment_submission_status THEN RAISE EXCEPTION 'Qiymətləndirilib statusunu yalnız səlahiyyətli əməkdaş təyin edə bilər.'; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.protect_student_submission_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_independent_work_student_fields ON public.independent_work_assessments;
CREATE TRIGGER protect_independent_work_student_fields BEFORE UPDATE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION private.protect_student_submission_fields();
DROP TRIGGER IF EXISTS protect_course_work_student_fields ON public.course_work_assessments;
CREATE TRIGGER protect_course_work_student_fields BEFORE UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.protect_student_submission_fields();

CREATE OR REPLACE FUNCTION private.validate_assessment_topic()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.topic_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.course_topics ct WHERE ct.id = NEW.topic_id AND ct.course_id = NEW.course_id) THEN
    RAISE EXCEPTION 'Seçilən mövzu bu fənnə aid deyil.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_assessment_topic() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_independent_work_topic ON public.independent_work_assessments;
CREATE TRIGGER validate_independent_work_topic BEFORE INSERT OR UPDATE ON public.independent_work_assessments FOR EACH ROW EXECUTE FUNCTION private.validate_assessment_topic();
DROP TRIGGER IF EXISTS validate_course_work_topic ON public.course_work_assessments;
CREATE TRIGGER validate_course_work_topic BEFORE INSERT OR UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.validate_assessment_topic();

CREATE OR REPLACE FUNCTION private.validate_course_work_enabled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = NEW.course_id AND c.kurs_isi_var) THEN RAISE EXCEPTION 'Bu fənn üçün kurs işi aktiv deyil.'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_course_work_enabled() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_course_work_enabled ON public.course_work_assessments;
CREATE TRIGGER validate_course_work_enabled BEFORE INSERT OR UPDATE ON public.course_work_assessments FOR EACH ROW EXECUTE FUNCTION private.validate_course_work_enabled();

CREATE OR REPLACE FUNCTION private.seed_assessment_slots(p_course_id uuid, p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_kurs_isi boolean;
BEGIN
  INSERT INTO public.independent_work_assessments(course_id, student_id, sira)
  VALUES (p_course_id, p_student_id, 1), (p_course_id, p_student_id, 2)
  ON CONFLICT (course_id, student_id, sira) DO NOTHING;
  INSERT INTO public.colloquium_assessments(course_id, student_id, sira)
  VALUES (p_course_id, p_student_id, 1), (p_course_id, p_student_id, 2), (p_course_id, p_student_id, 3)
  ON CONFLICT (course_id, student_id, sira) DO NOTHING;
  SELECT c.kurs_isi_var INTO v_kurs_isi FROM public.courses c WHERE c.id = p_course_id;
  IF COALESCE(v_kurs_isi, false) THEN
    INSERT INTO public.course_work_assessments(course_id, student_id, sira) VALUES (p_course_id, p_student_id, 1)
    ON CONFLICT (course_id, student_id) DO NOTHING;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION private.seed_assessment_slots(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.seed_course_slots_for_all_students(p_course_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN FOR r IN SELECT user_id FROM private.course_student_ids(p_course_id) LOOP PERFORM private.seed_assessment_slots(p_course_id, r.user_id); END LOOP; END; $$;
REVOKE ALL ON FUNCTION private.seed_course_slots_for_all_students(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.on_group_member_seed_ejournal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.id AS course_id FROM public.courses c WHERE c.group_id = NEW.group_id
    UNION SELECT DISTINCT cg.course_id FROM public.course_groups cg WHERE cg.group_id = NEW.group_id
  LOOP
    IF public.is_course_student(r.course_id, NEW.user_id) THEN
      PERFORM private.seed_assessment_slots(r.course_id, NEW.user_id);
      INSERT INTO public.lesson_student_records(lesson_session_id, student_id, course_id)
      SELECT s.id, NEW.user_id, s.course_id FROM public.course_lesson_sessions s
      WHERE s.course_id = r.course_id AND s.group_id = NEW.group_id AND NOT s.is_confirmed
      ON CONFLICT (lesson_session_id, student_id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.on_group_member_seed_ejournal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seed_ejournal_on_group_member ON public.group_members;
CREATE TRIGGER seed_ejournal_on_group_member AFTER INSERT OR UPDATE OF group_id, user_id ON public.group_members FOR EACH ROW EXECUTE FUNCTION private.on_group_member_seed_ejournal();

CREATE OR REPLACE FUNCTION private.on_course_group_seed_ejournal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT gm.user_id FROM public.group_members gm JOIN public.user_roles ur ON ur.user_id = gm.user_id AND ur.role = 'telebe'::public.app_role WHERE gm.group_id = NEW.group_id LOOP
    IF public.is_course_student(NEW.course_id, r.user_id) THEN PERFORM private.seed_assessment_slots(NEW.course_id, r.user_id); END IF;
  END LOOP;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.on_course_group_seed_ejournal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seed_ejournal_on_course_group ON public.course_groups;
CREATE TRIGGER seed_ejournal_on_course_group AFTER INSERT OR UPDATE OF course_id, group_id ON public.course_groups FOR EACH ROW EXECUTE FUNCTION private.on_course_group_seed_ejournal();

CREATE OR REPLACE FUNCTION private.on_course_student_status_seed_ejournal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN IF NEW.status = 'elave' THEN PERFORM private.seed_assessment_slots(NEW.course_id, NEW.user_id); END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.on_course_student_status_seed_ejournal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seed_ejournal_on_course_student_status ON public.course_student_status;
CREATE TRIGGER seed_ejournal_on_course_student_status AFTER INSERT OR UPDATE OF status, course_id, user_id ON public.course_student_status FOR EACH ROW EXECUTE FUNCTION private.on_course_student_status_seed_ejournal();

CREATE OR REPLACE FUNCTION private.on_course_config_seed_ejournal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_meaningful integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.kurs_isi_var AND NOT NEW.kurs_isi_var THEN
    SELECT count(*) INTO v_meaningful FROM public.course_work_assessments cw
    WHERE cw.course_id = NEW.id AND (cw.grade IS NOT NULL OR cw.file_url IS NOT NULL OR cw.submitted_at IS NOT NULL
      OR cw.topic_id IS NOT NULL OR NULLIF(btrim(cw.topic), '') IS NOT NULL OR cw.status <> 'gozleyir'::public.assessment_submission_status);
    IF v_meaningful > 0 THEN RAISE EXCEPTION 'Qiymət/təqdimetmə olan kurs işini söndürmək olmaz.'; END IF;
    DELETE FROM public.course_work_assessments WHERE course_id = NEW.id;
  END IF;
  PERFORM private.seed_course_slots_for_all_students(NEW.id);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.on_course_config_seed_ejournal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seed_ejournal_on_course_config ON public.courses;
CREATE TRIGGER seed_ejournal_on_course_config AFTER INSERT OR UPDATE OF group_id, kurs_isi_var ON public.courses FOR EACH ROW EXECUTE FUNCTION private.on_course_config_seed_ejournal();

CREATE OR REPLACE FUNCTION private.protect_course_ejournal_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.qiymetlendirme_novu IS DISTINCT FROM OLD.qiymetlendirme_novu OR NEW.kurs_isi_var IS DISTINCT FROM OLD.kurs_isi_var
     OR NEW.umumi_lab_sayi IS DISTINCT FROM OLD.umumi_lab_sayi OR NEW.umumi_ders_saati IS DISTINCT FROM OLD.umumi_ders_saati THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dekan'::public.app_role) OR public.is_course_tutor(OLD.id, auth.uid())) THEN
      RAISE EXCEPTION 'Elektron jurnal qiymətləndirmə tənzimləmələrini yalnız admin, dekan və tyutor dəyişə bilər.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.protect_course_ejournal_config() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_course_ejournal_config ON public.courses;
CREATE TRIGGER protect_course_ejournal_config BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION private.protect_course_ejournal_config();

DO $$ DECLARE c record; BEGIN FOR c IN SELECT id FROM public.courses LOOP PERFORM private.seed_course_slots_for_all_students(c.id); END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.academic_week_type(p_date date)
RETURNS public.academic_week_type LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_first public.academic_week_type; v_anchor date; v_monday date; v_weeks integer;
BEGIN
  SELECT birinci_hefte_novu, hefte_rotasiya_baslama_tarixi INTO v_first, v_anchor
  FROM public.system_settings ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
  IF v_first IS NULL OR v_anchor IS NULL THEN RETURN NULL; END IF;
  v_monday := p_date - (extract(isodow from p_date)::integer - 1);
  IF v_monday < v_anchor THEN RETURN NULL; END IF;
  v_weeks := ((v_monday - v_anchor) / 7)::integer;
  IF mod(v_weeks, 2) = 0 THEN RETURN v_first; END IF;
  RETURN CASE v_first WHEN 'ust'::public.academic_week_type THEN 'alt'::public.academic_week_type ELSE 'ust'::public.academic_week_type END;
END; $$;
REVOKE ALL ON FUNCTION public.academic_week_type(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academic_week_type(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_course_lesson_sessions(p_start_date date, p_end_date date, p_course_id uuid DEFAULT NULL, p_group_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_inserted integer := 0; v_count integer; v_rotation_ready boolean; t record; d date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autentifikasiya tələb olunur.'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN RAISE EXCEPTION 'Tarix aralığı yanlışdır.'; END IF;
  IF p_end_date - p_start_date > 370 THEN RAISE EXCEPTION 'Bir çağırışda maksimum 370 günlük sessiya generasiya edilə bilər.'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.system_settings ss WHERE ss.birinci_hefte_novu IS NOT NULL AND ss.hefte_rotasiya_baslama_tarixi IS NOT NULL) INTO v_rotation_ready;
  IF NOT v_rotation_ready AND EXISTS (
    SELECT 1 FROM public.course_schedule_templates x
    WHERE x.hefte_novu <> 'her_hefte'::public.schedule_week_type
      AND (p_course_id IS NULL OR x.course_id = p_course_id) AND (p_group_id IS NULL OR x.group_id = p_group_id)
      AND (public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) OR public.is_course_tutor(x.course_id, v_uid))
  ) THEN RAISE EXCEPTION 'Alt/üst həftə generasiyası üçün system_settings-də ilk həftə növü və Bazar ertəsi başlanğıc tarixi təyin edilməlidir.'; END IF;
  FOR t IN SELECT x.* FROM public.course_schedule_templates x
    WHERE (p_course_id IS NULL OR x.course_id = p_course_id) AND (p_group_id IS NULL OR x.group_id = p_group_id)
      AND (public.has_role(v_uid, 'admin'::public.app_role) OR public.has_role(v_uid, 'dekan'::public.app_role) OR public.is_course_tutor(x.course_id, v_uid))
  LOOP
    FOR d IN SELECT gs::date FROM generate_series(p_start_date, p_end_date, interval '1 day') gs LOOP
      IF extract(isodow from d)::integer = t.gun_nomresi
        AND (t.hefte_novu = 'her_hefte'::public.schedule_week_type OR public.academic_week_type(d)::text = t.hefte_novu::text) THEN
        INSERT INTO public.course_lesson_sessions(schedule_template_id, course_id, group_id, teacher_id, lesson_date, starts_at, ends_at)
        VALUES (t.id, t.course_id, t.group_id, t.teacher_id, d, ((d + t.baslangic_saat) AT TIME ZONE 'Asia/Baku'), ((d + t.bitme_saat) AT TIME ZONE 'Asia/Baku'))
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_count = ROW_COUNT; v_inserted := v_inserted + v_count;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_inserted;
END; $$;
REVOKE ALL ON FUNCTION public.generate_course_lesson_sessions(date, date, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_course_lesson_sessions(date, date, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.course_effective_total_hours(p_course_id uuid, p_student_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_override integer; v_hours integer;
BEGIN
  SELECT c.umumi_ders_saati INTO v_override FROM public.courses c WHERE c.id = p_course_id;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;
  IF p_student_id IS NOT NULL THEN
    SELECT count(*)::integer * 2 INTO v_hours FROM public.lesson_student_records r WHERE r.course_id = p_course_id AND r.student_id = p_student_id;
  ELSE
    SELECT COALESCE(max(x.cnt), 0)::integer * 2 INTO v_hours FROM (
      SELECT s.group_id, count(*)::integer AS cnt FROM public.course_lesson_sessions s WHERE s.course_id = p_course_id GROUP BY s.group_id
    ) x;
  END IF;
  RETURN COALESCE(v_hours, 0);
END; $$;
REVOKE ALL ON FUNCTION public.course_effective_total_hours(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_effective_total_hours(uuid, uuid) TO authenticated, service_role;
