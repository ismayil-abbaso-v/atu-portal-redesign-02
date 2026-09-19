-- Elektron jurnal: müəllim öz fənnindəki tələbələrin ad/soyadını görə bilsin.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dekan'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'tyutor'::public.app_role)
    AND public.is_tutor_of_student(user_id, (SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1
    FROM public.course_teachers ct
    WHERE ct.muellim_id = profiles.user_id
      AND (
        public.is_course_teacher(ct.course_id, (SELECT auth.uid()))
        OR public.is_course_tutor(ct.course_id, (SELECT auth.uid()))
        OR public.is_course_student(ct.course_id, (SELECT auth.uid()))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.course_teachers ct
    WHERE ct.muellim_id = (SELECT auth.uid())
      AND public.is_course_teacher(ct.course_id, (SELECT auth.uid()))
      AND public.is_course_student(ct.course_id, profiles.user_id)
  )
);