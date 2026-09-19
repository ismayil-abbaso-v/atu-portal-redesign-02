begin;

-- Historical lesson sessions must preserve who taught the lesson even after that
-- person is removed from the current course-teacher assignment list. Active
-- assignment validity is still enforced by private.validate_lesson_session().
alter table public.course_lesson_sessions
  drop constraint if exists course_lesson_sessions_teacher_fkey;

alter table public.course_lesson_sessions
  add constraint course_lesson_sessions_teacher_fkey
  foreign key (teacher_id)
  references public.profiles(user_id)
  on update cascade
  on delete restrict;

create or replace function public.remove_course_teacher(
  p_course_id uuid,
  p_teacher_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_future_sessions integer := 0;
  v_template_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.';
  end if;

  if not (
    public.has_role(v_uid, 'admin'::public.app_role)
    or private.dekan_can_access_course(p_course_id)
  ) then
    raise exception 'Bu fənnin müəllimlərini idarə etmək icazəniz yoxdur.';
  end if;

  if not exists (
    select 1
    from public.course_teachers ct
    where ct.course_id = p_course_id
      and ct.muellim_id = p_teacher_id
  ) then
    return jsonb_build_object('removed', false, 'reason', 'not_found');
  end if;

  if exists (
    select 1
    from public.course_lesson_sessions s
    where s.course_id = p_course_id
      and s.teacher_id = p_teacher_id
      and not s.is_confirmed
      and s.starts_at <= now()
      and s.ends_at > now()
  ) then
    raise exception 'Müəllimin hazırda aktiv dərs sessiyası var. Dərs bitdikdən sonra müəllimi fənndən çıxarın.';
  end if;

  select count(*)::integer
    into v_template_count
  from public.course_schedule_templates st
  where st.course_id = p_course_id
    and st.teacher_id = p_teacher_id;

  if v_template_count > 0 then
    raise exception 'Bu müəllim dərs cədvəli şablonunda istifadə olunur. Əvvəl cədvəldə müəllimi dəyişin və ya həmin şablonu silin.';
  end if;

  select count(*)::integer
    into v_future_sessions
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
  where ct.course_id = p_course_id
    and ct.muellim_id = p_teacher_id;

  return jsonb_build_object(
    'removed', true,
    'removed_future_sessions', v_future_sessions,
    'preserved_history', true
  );
end;
$$;

revoke all on function public.remove_course_teacher(uuid, uuid) from public;
grant execute on function public.remove_course_teacher(uuid, uuid) to authenticated;

commit;
