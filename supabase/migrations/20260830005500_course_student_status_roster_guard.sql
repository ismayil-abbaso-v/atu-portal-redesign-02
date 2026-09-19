create or replace function private.student_belongs_to_course_group(_course_id uuid, _student_id uuid)
returns boolean
language sql
stable security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.user_id = _student_id
      and gm.group_id in (
        select c.group_id
        from public.courses c
        where c.id = _course_id and c.group_id is not null
        union
        select cg.group_id
        from public.course_groups cg
        where cg.course_id = _course_id
      )
  );
$$;

create or replace function private.course_student_status_roster_guard()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.student_belongs_to_course_group(new.course_id, new.user_id) then
    raise exception 'Tələbə bu fənnin bağlı olduğu qrupların üzvü deyil.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_course_student_status_roster_guard on public.course_student_status;
create trigger trg_course_student_status_roster_guard
before insert or update of course_id, user_id on public.course_student_status
for each row execute function private.course_student_status_roster_guard();
