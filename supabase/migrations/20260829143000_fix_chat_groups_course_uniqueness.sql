-- Chat groups are scoped by course + academic group + academic period.
-- The legacy UNIQUE(course_id) constraint prevented the same course from
-- having separate chat groups for different groups/semesters.

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_groups_course_group_period
  ON public.chat_groups (course_id, group_id, tedris_ili, semestr)
  WHERE course_id IS NOT NULL;

ALTER TABLE public.chat_groups
  DROP CONSTRAINT IF EXISTS chat_groups_course_id_key;
