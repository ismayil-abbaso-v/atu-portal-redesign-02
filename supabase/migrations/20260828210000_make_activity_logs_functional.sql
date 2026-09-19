CREATE INDEX IF NOT EXISTS activity_logs_emeliyyat_idx
  ON public.activity_logs (emeliyyat, created_at DESC);

CREATE OR REPLACE FUNCTION public.capture_activity_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  row_data jsonb;
  activity_name text;
  details jsonb;
BEGIN
  IF actor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  activity_name := CASE
    WHEN TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN 'profil_yenilendi'
    WHEN TG_TABLE_NAME = 'groups' AND TG_OP = 'INSERT' THEN 'qrup_yaradildi'
    WHEN TG_TABLE_NAME = 'groups' AND TG_OP = 'UPDATE' THEN 'qrup_yenilendi'
    WHEN TG_TABLE_NAME = 'groups' AND TG_OP = 'DELETE' THEN 'qrup_silindi'
    WHEN TG_TABLE_NAME = 'courses' AND TG_OP = 'INSERT' THEN 'fenn_yaradildi'
    WHEN TG_TABLE_NAME = 'courses' AND TG_OP = 'UPDATE' THEN 'fenn_yenilendi'
    WHEN TG_TABLE_NAME = 'courses' AND TG_OP = 'DELETE' THEN 'fenn_silindi'
    WHEN TG_TABLE_NAME = 'library_books' AND TG_OP = 'INSERT' THEN 'kitab_elave_edildi'
    WHEN TG_TABLE_NAME = 'library_books' AND TG_OP = 'UPDATE' THEN 'kitab_yenilendi'
    WHEN TG_TABLE_NAME = 'library_books' AND TG_OP = 'DELETE' THEN 'kitab_silindi'
    WHEN TG_TABLE_NAME = 'office_files' AND TG_OP = 'INSERT' THEN 'fayl_yuklendi'
    WHEN TG_TABLE_NAME = 'office_files' AND TG_OP = 'DELETE' THEN 'fayl_silindi'
    WHEN TG_TABLE_NAME = 'group_members' AND TG_OP = 'INSERT' THEN 'qrup_uzvu_elave_edildi'
    WHEN TG_TABLE_NAME = 'group_members' AND TG_OP = 'DELETE' THEN 'qrup_uzvu_silindi'
    WHEN TG_TABLE_NAME = 'course_teachers' AND TG_OP = 'INSERT' THEN 'muellim_teyin_edildi'
    WHEN TG_TABLE_NAME = 'course_teachers' AND TG_OP = 'UPDATE' THEN 'muellim_teyini_yenilendi'
    WHEN TG_TABLE_NAME = 'course_teachers' AND TG_OP = 'DELETE' THEN 'muellim_teyini_silindi'
    WHEN TG_TABLE_NAME = 'course_topics' AND TG_OP = 'INSERT' THEN 'movzu_elave_edildi'
    WHEN TG_TABLE_NAME = 'course_topics' AND TG_OP = 'UPDATE' THEN 'movzu_yenilendi'
    WHEN TG_TABLE_NAME = 'course_topics' AND TG_OP = 'DELETE' THEN 'movzu_silindi'
    WHEN TG_TABLE_NAME = 'user_roles' AND TG_OP = 'INSERT' THEN 'rol_elave_edildi'
    WHEN TG_TABLE_NAME = 'user_roles' AND TG_OP = 'UPDATE' THEN 'rol_yenilendi'
    WHEN TG_TABLE_NAME = 'user_roles' AND TG_OP = 'DELETE' THEN 'rol_silindi'
    WHEN TG_TABLE_NAME = 'system_settings' AND TG_OP = 'UPDATE' THEN 'sistem_tenzimlemesi_yenilendi'
    ELSE NULL
  END;

  IF activity_name IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  details := jsonb_build_object(
    'cedvel', TG_TABLE_NAME,
    'record_id', row_data ->> 'id',
    'db_operation', lower(TG_OP)
  );

  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      details := details || jsonb_build_object('target_user_id', row_data ->> 'user_id');
    WHEN 'groups' THEN
      details := details || jsonb_build_object('qrup', row_data ->> 'ad');
    WHEN 'courses' THEN
      details := details || jsonb_build_object('fenn', row_data ->> 'ad', 'kod', row_data ->> 'kod');
    WHEN 'library_books' THEN
      details := details || jsonb_build_object('kitab', row_data ->> 'ad', 'muellif', row_data ->> 'muellif');
    WHEN 'office_files' THEN
      details := details || jsonb_build_object('fayl', row_data ->> 'ad');
    WHEN 'group_members' THEN
      details := details || jsonb_build_object('group_id', row_data ->> 'group_id', 'target_user_id', row_data ->> 'user_id');
    WHEN 'course_teachers' THEN
      details := details || jsonb_build_object('course_id', row_data ->> 'course_id', 'target_user_id', row_data ->> 'muellim_id');
    WHEN 'course_topics' THEN
      details := details || jsonb_build_object('course_id', row_data ->> 'course_id', 'movzu', row_data ->> 'movzu');
    WHEN 'user_roles' THEN
      details := details || jsonb_build_object('target_user_id', row_data ->> 'user_id', 'role', row_data ->> 'role');
    ELSE
      NULL;
  END CASE;

  INSERT INTO public.activity_logs (user_id, emeliyyat, etrafli)
  VALUES (actor_id, activity_name, details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_profiles ON public.profiles;
CREATE TRIGGER trg_activity_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_groups ON public.groups;
CREATE TRIGGER trg_activity_groups
AFTER INSERT OR UPDATE OR DELETE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_courses ON public.courses;
CREATE TRIGGER trg_activity_courses
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_library_books ON public.library_books;
CREATE TRIGGER trg_activity_library_books
AFTER INSERT OR UPDATE OR DELETE ON public.library_books
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_office_files ON public.office_files;
CREATE TRIGGER trg_activity_office_files
AFTER INSERT OR DELETE ON public.office_files
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_group_members ON public.group_members;
CREATE TRIGGER trg_activity_group_members
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_course_teachers ON public.course_teachers;
CREATE TRIGGER trg_activity_course_teachers
AFTER INSERT OR UPDATE OR DELETE ON public.course_teachers
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_course_topics ON public.course_topics;
CREATE TRIGGER trg_activity_course_topics
AFTER INSERT OR UPDATE OR DELETE ON public.course_topics
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_user_roles ON public.user_roles;
CREATE TRIGGER trg_activity_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.capture_activity_audit();

DROP TRIGGER IF EXISTS trg_activity_system_settings ON public.system_settings;
CREATE TRIGGER trg_activity_system_settings
AFTER UPDATE ON public.system_settings
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.capture_activity_audit();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'activity_logs'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;
END $$;
