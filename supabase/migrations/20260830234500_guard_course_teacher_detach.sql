begin;

create or replace function private.prepare_course_teacher_detach()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_template_count integer := 0;
begin
  if exists (
    select 1
    from public.course_lesson_sessions s
    where s.course_id = old.course_id
      and s.teacher_id = old.muellim_id
      and not s.is_confirmed
      and s.starts_at <= now()
      and s.ends_at > now()
  ) then
    raise exception 'Müəllimin hazırda aktiv dərs sessiyası var. Dərs bitdikdən sonra müəllimi fənndən çıxarın.';
  end if;

  select count(*)::integer
    into v_template_count
  from public.course_schedule_templates st
  where st.course_id = old.course_id
    and st.teacher_id = old.muellim_id;

  if v_template_count > 0 then
    raise exception 'Bu müəllim dərs cədvəli şablonunda istifadə olunur. Əvvəl cədvəldə müəllimi dəyişin və ya həmin şablonu silin.';
  end if;

  -- Future unconfirmed sessions have not happened yet and must not remain
  -- assigned to a teacher who is no longer attached to the course.
  delete from public.course_lesson_sessions s
  where s.course_id = old.course_id
    and s.teacher_id = old.muellim_id
    and not s.is_confirmed
    and s.starts_at > now();

  return old;
end;
$$;

drop trigger if exists a_prepare_course_teacher_detach on public.course_teachers;
create trigger a_prepare_course_teacher_detach
before delete on public.course_teachers
for each row execute function private.prepare_course_teacher_detach();

commit;
