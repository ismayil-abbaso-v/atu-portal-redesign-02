create or replace function private.teacher_has_course_permission(
  p_course_id uuid,
  p_teacher_id uuid,
  p_permission text default null
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
as $$
  select p_teacher_id is not null
     and exists (
       select 1
       from public.course_teachers ct
       where ct.course_id = p_course_id
         and ct.muellim_id = p_teacher_id
         and (
           p_permission is null
           or coalesce((ct.icazeler ->> p_permission)::boolean, false)
         )
     );
$$;

drop policy if exists group_members_select on public.group_members;
create policy group_members_select
on public.group_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or public.is_same_group_member(user_id, (select auth.uid()))
  or public.is_group_teacher(group_id, (select auth.uid()))
  or (
    public.has_role((select auth.uid()), 'tyutor'::public.app_role)
    and public.is_tutor_of_student(user_id, (select auth.uid()))
  )
);

drop policy if exists independent_work_assessments_insert on public.independent_work_assessments;
create policy independent_work_assessments_insert
on public.independent_work_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'serbest_is')
);

drop policy if exists independent_work_assessments_update on public.independent_work_assessments;
create policy independent_work_assessments_update
on public.independent_work_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'serbest_is')
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'serbest_is')
);

drop policy if exists course_work_assessments_insert on public.course_work_assessments;
create policy course_work_assessments_insert
on public.course_work_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), null)
);

drop policy if exists course_work_assessments_update on public.course_work_assessments;
create policy course_work_assessments_update
on public.course_work_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), null)
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or ((student_id = (select auth.uid())) and public.is_course_student(course_id, (select auth.uid())))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), null)
);

drop policy if exists colloquium_assessments_insert on public.colloquium_assessments;
create policy colloquium_assessments_insert
on public.colloquium_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'kollokvium')
);

drop policy if exists colloquium_assessments_update on public.colloquium_assessments;
create policy colloquium_assessments_update
on public.colloquium_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'kollokvium')
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id, student_id))
  or private.teacher_has_course_permission(course_id, (select auth.uid()), 'kollokvium')
);