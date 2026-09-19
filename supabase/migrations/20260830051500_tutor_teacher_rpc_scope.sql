-- Align teacher-removal RPC with the assigned-group tutor permission model and remove anon execution.

create or replace function public.remove_course_teacher(p_course_id uuid, p_teacher_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_future_sessions integer := 0;
  v_template_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.' using errcode = '42501';
  end if;

  if not (
    public.has_role(v_uid, 'admin'::public.app_role)
    or private.dekan_can_access_course(p_course_id)
    or public.is_course_tutor(p_course_id, v_uid)
  ) then
    raise exception 'Bu fənnin müəllimlərini idarə etmək icazəniz yoxdur.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.course_teachers ct
    where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id
  ) then
    return jsonb_build_object('removed', false, 'reason', 'not_found');
  end if;

  if exists (
    select 1 from public.course_lesson_sessions s
    where s.course_id = p_course_id
      and s.teacher_id = p_teacher_id
      and not s.is_confirmed
      and s.starts_at <= now()
      and s.ends_at > now()
  ) then
    raise exception 'Müəllimin hazırda aktiv dərs sessiyası var. Dərs bitdikdən sonra müəllimi fənndən çıxarın.';
  end if;

  select count(*)::integer into v_template_count
  from public.course_schedule_templates st
  where st.course_id = p_course_id and st.teacher_id = p_teacher_id;

  if v_template_count > 0 then
    raise exception 'Bu müəllim dərs cədvəli şablonunda istifadə olunur. Əvvəl cədvəldə müəllimi dəyişin və ya həmin şablonu silin.';
  end if;

  select count(*)::integer into v_future_sessions
  from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at > now();

  delete from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at > now();

  delete from public.course_teachers ct
  where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id;

  return jsonb_build_object(
    'removed', true,
    'removed_future_sessions', v_future_sessions,
    'preserved_history', true
  );
end;
$function$;

revoke all on function public.remove_course_teacher(uuid, uuid) from public;
revoke execute on function public.remove_course_teacher(uuid, uuid) from anon;
grant execute on function public.remove_course_teacher(uuid, uuid) to authenticated, service_role;

revoke all on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) from public;
revoke execute on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) from anon;
grant execute on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) to authenticated, service_role;
