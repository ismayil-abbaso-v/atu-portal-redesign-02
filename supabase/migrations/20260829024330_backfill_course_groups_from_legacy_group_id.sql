-- course_groups canonical tələbə-fənn əlaqəsi üçün legacy courses.group_id məlumatını backfill/sync et.

INSERT INTO public.course_groups (course_id, group_id)
SELECT c.id, c.group_id
FROM public.courses c
WHERE c.group_id IS NOT NULL
ON CONFLICT (course_id, group_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.sync_course_primary_group_to_course_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.group_id IS NOT NULL
     AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    DELETE FROM public.course_groups
    WHERE course_id = NEW.id
      AND group_id = OLD.group_id;
  END IF;

  IF NEW.group_id IS NOT NULL THEN
    INSERT INTO public.course_groups (course_id, group_id)
    VALUES (NEW.id, NEW.group_id)
    ON CONFLICT (course_id, group_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_course_primary_group_to_course_groups() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_course_primary_group_to_course_groups ON public.courses;
CREATE TRIGGER sync_course_primary_group_to_course_groups
AFTER INSERT OR UPDATE OF group_id ON public.courses
FOR EACH ROW
EXECUTE FUNCTION private.sync_course_primary_group_to_course_groups();
