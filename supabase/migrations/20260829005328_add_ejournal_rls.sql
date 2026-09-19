-- Elektron Jurnal: ilkin RLS və Data API icazələri

CREATE OR REPLACE FUNCTION private.protect_student_lesson_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_is_staff boolean;
BEGIN
  v_is_staff :=
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'dekan'::public.app_role)
    OR public.is_course_teacher(OLD.course_id, auth.uid())
    OR public.is_course_tutor(OLD.course_id, auth.uid());

  IF auth.uid() = OLD.student_id AND NOT v_is_staff THEN
    IF NEW.lesson_session_id IS DISTINCT FROM OLD.lesson_session_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status
       OR NEW.grade IS DISTINCT FROM OLD.grade THEN
      RAISE EXCEPTION 'Tələbə davamiyyət, qiymət və sistem sahələrini dəyişə bilməz.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_student_lesson_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_student_lesson_fields ON public.lesson_student_records;
CREATE TRIGGER protect_student_lesson_fields BEFORE UPDATE ON public.lesson_student_records
FOR EACH ROW EXECUTE FUNCTION private.protect_student_lesson_fields();

REVOKE ALL ON public.course_schedule_templates FROM anon;
REVOKE ALL ON public.course_lesson_sessions FROM anon;
REVOKE ALL ON public.lesson_student_records FROM anon;
REVOKE ALL ON public.independent_work_assessments FROM anon;
REVOKE ALL ON public.course_work_assessments FROM anon;
REVOKE ALL ON public.colloquium_assessments FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_schedule_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lesson_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lesson_student_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.independent_work_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.course_work_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.colloquium_assessments TO authenticated;

GRANT ALL ON public.course_schedule_templates TO service_role;
GRANT ALL ON public.course_lesson_sessions TO service_role;
GRANT ALL ON public.lesson_student_records TO service_role;
GRANT ALL ON public.independent_work_assessments TO service_role;
GRANT ALL ON public.course_work_assessments TO service_role;
GRANT ALL ON public.colloquium_assessments TO service_role;

GRANT USAGE ON TYPE public.course_grading_type TO authenticated, service_role;
GRANT USAGE ON TYPE public.schedule_week_type TO authenticated, service_role;
GRANT USAGE ON TYPE public.academic_week_type TO authenticated, service_role;
GRANT USAGE ON TYPE public.lesson_attendance_status TO authenticated, service_role;
GRANT USAGE ON TYPE public.assessment_submission_status TO authenticated, service_role;

DROP POLICY IF EXISTS course_schedule_templates_select ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_select ON public.course_schedule_templates FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
  OR (public.is_course_student(course_id, (SELECT auth.uid())) AND public.is_group_member(group_id, (SELECT auth.uid())))
);
DROP POLICY IF EXISTS course_schedule_templates_insert ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_insert ON public.course_schedule_templates FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS course_schedule_templates_update ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_update ON public.course_schedule_templates FOR UPDATE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS course_schedule_templates_delete ON public.course_schedule_templates;
CREATE POLICY course_schedule_templates_delete ON public.course_schedule_templates FOR DELETE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS course_lesson_sessions_select ON public.course_lesson_sessions;
CREATE POLICY course_lesson_sessions_select ON public.course_lesson_sessions FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
  OR (public.is_course_student(course_id, (SELECT auth.uid())) AND public.is_group_member(group_id, (SELECT auth.uid())))
);
DROP POLICY IF EXISTS course_lesson_sessions_insert ON public.course_lesson_sessions;
CREATE POLICY course_lesson_sessions_insert ON public.course_lesson_sessions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS course_lesson_sessions_update ON public.course_lesson_sessions;
CREATE POLICY course_lesson_sessions_update ON public.course_lesson_sessions FOR UPDATE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
  OR (teacher_id = (SELECT auth.uid()) AND public.is_course_teacher(course_id, (SELECT auth.uid())))
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
  OR (teacher_id = (SELECT auth.uid()) AND public.is_course_teacher(course_id, (SELECT auth.uid())))
);
DROP POLICY IF EXISTS course_lesson_sessions_delete ON public.course_lesson_sessions;
CREATE POLICY course_lesson_sessions_delete ON public.course_lesson_sessions FOR DELETE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS lesson_student_records_select ON public.lesson_student_records;
CREATE POLICY lesson_student_records_select ON public.lesson_student_records FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS lesson_student_records_insert ON public.lesson_student_records;
CREATE POLICY lesson_student_records_insert ON public.lesson_student_records FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS lesson_student_records_update ON public.lesson_student_records;
CREATE POLICY lesson_student_records_update ON public.lesson_student_records FOR UPDATE TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS independent_work_assessments_select ON public.independent_work_assessments;
CREATE POLICY independent_work_assessments_select ON public.independent_work_assessments FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS independent_work_assessments_insert ON public.independent_work_assessments;
CREATE POLICY independent_work_assessments_insert ON public.independent_work_assessments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS independent_work_assessments_update ON public.independent_work_assessments;
CREATE POLICY independent_work_assessments_update ON public.independent_work_assessments FOR UPDATE TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS course_work_assessments_select ON public.course_work_assessments;
CREATE POLICY course_work_assessments_select ON public.course_work_assessments FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS course_work_assessments_insert ON public.course_work_assessments;
CREATE POLICY course_work_assessments_insert ON public.course_work_assessments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS course_work_assessments_update ON public.course_work_assessments;
CREATE POLICY course_work_assessments_update ON public.course_work_assessments FOR UPDATE TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS colloquium_assessments_select ON public.colloquium_assessments;
CREATE POLICY colloquium_assessments_select ON public.colloquium_assessments FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS colloquium_assessments_insert ON public.colloquium_assessments;
CREATE POLICY colloquium_assessments_insert ON public.colloquium_assessments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);
DROP POLICY IF EXISTS colloquium_assessments_update ON public.colloquium_assessments;
CREATE POLICY colloquium_assessments_update ON public.colloquium_assessments FOR UPDATE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR public.is_course_teacher(course_id, (SELECT auth.uid()))
  OR public.is_course_tutor(course_id, (SELECT auth.uid()))
);

-- Həftə rotasiyası bütün authenticated rollara lazımdır; update/insert yenə mövcud admin policy-ləri ilə qorunur.
DROP POLICY IF EXISTS system_settings_select ON public.system_settings;
DROP POLICY IF EXISTS system_settings_select_admin_dekan ON public.system_settings;
DROP POLICY IF EXISTS system_settings_select_authenticated ON public.system_settings;
CREATE POLICY system_settings_select_authenticated ON public.system_settings FOR SELECT TO authenticated USING (true);
