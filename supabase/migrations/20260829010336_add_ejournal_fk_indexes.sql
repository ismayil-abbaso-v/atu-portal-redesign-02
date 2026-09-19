-- Elektron Jurnal: Supabase performance advisor üçün FK indeksləri
CREATE INDEX IF NOT EXISTS idx_course_schedule_templates_group_id
  ON public.course_schedule_templates(group_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_templates_course_teacher
  ON public.course_schedule_templates(course_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_confirmed_by
  ON public.course_lesson_sessions(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_course_teacher
  ON public.course_lesson_sessions(course_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_sessions_topic_id
  ON public.course_lesson_sessions(topic_id);

CREATE INDEX IF NOT EXISTS idx_lesson_student_records_session_course
  ON public.lesson_student_records(lesson_session_id, course_id);

CREATE INDEX IF NOT EXISTS idx_independent_work_topic_id
  ON public.independent_work_assessments(topic_id);
CREATE INDEX IF NOT EXISTS idx_course_work_topic_id
  ON public.course_work_assessments(topic_id);
