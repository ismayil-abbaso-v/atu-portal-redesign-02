drop policy if exists attendance_write on public.attendance;
create policy attendance_write on public.attendance for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
);

drop policy if exists exam_scores_write on public.exam_scores;
create policy exam_scores_write on public.exam_scores for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
);

drop policy if exists notes_write on public.notes;
create policy notes_write on public.notes for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid())))
  or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid())))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid())))
  or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid())))
);

-- Course metadata is managed by admin/dean or assigned tutor. Teachers manage topics, lessons and assessments instead.
drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or public.is_course_tutor(id,(select auth.uid()))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or public.is_course_tutor(id,(select auth.uid()))
);

-- A dean may query grading availability only for their own faculty's lesson.
create or replace function public.can_grade_now(p_lesson_id uuid,p_teacher_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_group_id uuid;
begin
  if v_uid is null then return false; end if;
  if v_uid<>p_teacher_id and not public.has_role(v_uid,'admin'::public.app_role) then
    select s.group_id into v_group_id from public.course_lesson_sessions s where s.id=p_lesson_id;
    if not private.dekan_can_access_group(v_group_id) then return false; end if;
  end if;
  return private.teacher_can_grade_lesson_at(p_lesson_id,p_teacher_id,now());
end;
$$;