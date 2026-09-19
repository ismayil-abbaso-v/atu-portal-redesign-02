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
as $function$
  select p_teacher_id is not null
     and public.has_role(p_teacher_id, 'muellim'::public.app_role)
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
$function$;

create or replace function private.teacher_can_grade_lesson_at(
  p_lesson_id uuid,
  p_teacher_id uuid,
  p_now timestamptz
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
as $function$
  select public.has_role(p_teacher_id, 'muellim'::public.app_role)
    and exists (
      select 1
      from public.course_lesson_sessions s
      join public.course_teachers ct
        on ct.course_id = s.course_id
       and ct.muellim_id = p_teacher_id
      where s.id = p_lesson_id
        and s.teacher_id = p_teacher_id
        and s.dars_novu is not null
        and coalesce((ct.icazeler ->> s.dars_novu)::boolean, false)
        and private.grade_time_window_contains(s.starts_at, s.ends_at, p_now)
    );
$function$;
