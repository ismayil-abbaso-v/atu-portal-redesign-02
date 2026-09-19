-- Backfill group faculty from a single unambiguous member faculty.
with inferred as (
  select g.id as group_id, min(f.id::text)::uuid as faculty_id
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  join public.profiles p on p.user_id = gm.user_id
  join public.faculties f on lower(btrim(f.ad)) = lower(btrim(p.fakulte))
  where g.faculty_id is null
  group by g.id
  having count(distinct lower(btrim(p.fakulte))) = 1
)
update public.groups g
set faculty_id = i.faculty_id
from inferred i
where g.id = i.group_id and g.faculty_id is null;

-- Preserve legacy office documents whose former owner no longer exists.
alter table public.office_files alter column sahib_id drop not null;
update public.office_files ofi
set sahib_id = null
where sahib_id is not null
  and not exists (select 1 from public.profiles p where p.user_id = ofi.sahib_id);

-- Add missing relational guarantees for user/profile references.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='profiles_user_id_auth_fkey' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_user_id_auth_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='user_roles_user_id_fkey' and conrelid='public.user_roles'::regclass) then
    alter table public.user_roles add constraint user_roles_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='group_members_user_id_fkey' and conrelid='public.group_members'::regclass) then
    alter table public.group_members add constraint group_members_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='groups_tyutor_id_fkey' and conrelid='public.groups'::regclass) then
    alter table public.groups add constraint groups_tyutor_id_fkey foreign key (tyutor_id) references public.profiles(user_id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='courses_muellim_id_fkey' and conrelid='public.courses'::regclass) then
    alter table public.courses add constraint courses_muellim_id_fkey foreign key (muellim_id) references public.profiles(user_id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='courses_tyutor_id_fkey' and conrelid='public.courses'::regclass) then
    alter table public.courses add constraint courses_tyutor_id_fkey foreign key (tyutor_id) references public.profiles(user_id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='course_teachers_muellim_id_fkey' and conrelid='public.course_teachers'::regclass) then
    alter table public.course_teachers add constraint course_teachers_muellim_id_fkey foreign key (muellim_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='course_student_status_user_id_fkey' and conrelid='public.course_student_status'::regclass) then
    alter table public.course_student_status add constraint course_student_status_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='exam_scores_user_id_fkey' and conrelid='public.exam_scores'::regclass) then
    alter table public.exam_scores add constraint exam_scores_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='attendance_user_id_fkey' and conrelid='public.attendance'::regclass) then
    alter table public.attendance add constraint attendance_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='notes_user_id_fkey' and conrelid='public.notes'::regclass) then
    alter table public.notes add constraint notes_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='library_books_elave_eden_id_fkey' and conrelid='public.library_books'::regclass) then
    alter table public.library_books add constraint library_books_elave_eden_id_fkey foreign key (elave_eden_id) references public.profiles(user_id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='office_files_sahib_id_fkey' and conrelid='public.office_files'::regclass) then
    alter table public.office_files add constraint office_files_sahib_id_fkey foreign key (sahib_id) references public.profiles(user_id) on delete set null;
  end if;
end $$;

-- FK/relationship indexes used by authorization and role-scoped queries.
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_groups_tyutor_id on public.groups(tyutor_id);
create index if not exists idx_groups_faculty_id on public.groups(faculty_id);
create index if not exists idx_courses_group_id on public.courses(group_id);
create index if not exists idx_courses_muellim_id on public.courses(muellim_id);
create index if not exists idx_courses_tyutor_id on public.courses(tyutor_id);
create index if not exists idx_course_teachers_muellim_id on public.course_teachers(muellim_id);
create index if not exists idx_course_student_status_user_id on public.course_student_status(user_id);
create index if not exists idx_exam_scores_course_id on public.exam_scores(course_id);
create index if not exists idx_exam_scores_user_id on public.exam_scores(user_id);
create index if not exists idx_attendance_course_id on public.attendance(course_id);
create index if not exists idx_attendance_user_id on public.attendance(user_id);
create index if not exists idx_notes_course_id on public.notes(course_id);
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_library_books_elave_eden_id on public.library_books(elave_eden_id);
create index if not exists idx_office_files_sahib_id on public.office_files(sahib_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);