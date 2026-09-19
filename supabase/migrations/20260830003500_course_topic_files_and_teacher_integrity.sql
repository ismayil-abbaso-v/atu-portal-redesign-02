begin;

create table if not exists public.course_topic_files (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.course_topics(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  category text not null default 'primary' check (category in ('primary','seminar','teqdimat','diger')),
  file_url text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (topic_id, file_url)
);

create index if not exists course_topic_files_topic_id_idx on public.course_topic_files(topic_id);
create index if not exists course_topic_files_course_id_idx on public.course_topic_files(course_id);

alter table public.course_topic_files enable row level security;

drop policy if exists course_topic_files_select on public.course_topic_files;
create policy course_topic_files_select on public.course_topic_files
for select to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
  or public.is_course_teacher(course_id, (select auth.uid()))
  or public.is_course_tutor(course_id, (select auth.uid()))
  or public.is_course_student(course_id, (select auth.uid()))
);

drop policy if exists course_topic_files_insert_staff on public.course_topic_files;
create policy course_topic_files_insert_staff on public.course_topic_files
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id)
);

drop policy if exists course_topic_files_update_staff on public.course_topic_files;
create policy course_topic_files_update_staff on public.course_topic_files
for update to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id)
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id)
);

drop policy if exists course_topic_files_delete_staff on public.course_topic_files;
create policy course_topic_files_delete_staff on public.course_topic_files
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id)
);

create or replace function private.course_topic_file_course_guard()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (
    select 1 from public.course_topics t
    where t.id = new.topic_id and t.course_id = new.course_id
  ) then
    raise exception 'Mövzu və fənn uyğun deyil.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_course_topic_file_course_guard on public.course_topic_files;
create trigger trg_course_topic_file_course_guard
before insert or update of topic_id, course_id on public.course_topic_files
for each row execute function private.course_topic_file_course_guard();

insert into public.course_topic_files (topic_id, course_id, category, file_url, file_name)
select
  t.id,
  t.course_id,
  case when t.fayl_kateqoriyasi in ('seminar','teqdimat','diger') then t.fayl_kateqoriyasi else 'primary' end,
  t.fayl_url,
  coalesce(nullif(regexp_replace(t.fayl_url, '^.*/', ''), ''), 'fayl')
from public.course_topics t
where t.fayl_url is not null
on conflict (topic_id, file_url) do nothing;

insert into public.course_teachers (course_id, muellim_id, icazeler)
select c.id, c.muellim_id,
  '{"muhazire":true,"seminar":true,"laboratoriya":false,"serbest_is":true,"kollokvium":true,"tecrube":false}'::jsonb
from public.courses c
where c.muellim_id is not null
  and not exists (
    select 1 from public.course_teachers ct
    where ct.course_id = c.id and ct.muellim_id = c.muellim_id
  )
on conflict (course_id, muellim_id) do nothing;

update public.courses c
set muellim_id = (
  select ct.muellim_id from public.course_teachers ct
  where ct.course_id = c.id
  order by ct.created_at, ct.id
  limit 1
)
where c.muellim_id is null
  and exists (select 1 from public.course_teachers ct where ct.course_id = c.id);

create or replace function private.sync_course_primary_teacher_from_join()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_course_id uuid;
  v_next_teacher uuid;
begin
  v_course_id := coalesce(new.course_id, old.course_id);

  if tg_op = 'INSERT' then
    update public.courses
      set muellim_id = coalesce(muellim_id, new.muellim_id)
    where id = new.course_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.courses c
      where c.id = old.course_id and c.muellim_id = old.muellim_id
    ) then
      select ct.muellim_id into v_next_teacher
      from public.course_teachers ct
      where ct.course_id = old.course_id
      order by ct.created_at, ct.id
      limit 1;

      update public.courses
      set muellim_id = v_next_teacher
      where id = old.course_id;
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_course_primary_teacher_insert on public.course_teachers;
create trigger trg_sync_course_primary_teacher_insert
after insert on public.course_teachers
for each row execute function private.sync_course_primary_teacher_from_join();

drop trigger if exists trg_sync_course_primary_teacher_delete on public.course_teachers;
create trigger trg_sync_course_primary_teacher_delete
after delete on public.course_teachers
for each row execute function private.sync_course_primary_teacher_from_join();

create or replace function private.clamp_teacher_permissions_to_active_lesson_types()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.aktiv_dars_novleri is distinct from old.aktiv_dars_novleri then
    update public.course_teachers ct
    set icazeler = ct.icazeler || jsonb_build_object(
      'muhazire', case when coalesce((new.aktiv_dars_novleri->>'muhazire')::boolean,false) then coalesce((ct.icazeler->>'muhazire')::boolean,false) else false end,
      'seminar', case when coalesce((new.aktiv_dars_novleri->>'seminar')::boolean,false) then coalesce((ct.icazeler->>'seminar')::boolean,false) else false end,
      'laboratoriya', case when coalesce((new.aktiv_dars_novleri->>'laboratoriya')::boolean,false) then coalesce((ct.icazeler->>'laboratoriya')::boolean,false) else false end,
      'serbest_is', case when coalesce((new.aktiv_dars_novleri->>'serbest_is')::boolean,false) then coalesce((ct.icazeler->>'serbest_is')::boolean,false) else false end,
      'kollokvium', case when coalesce((new.aktiv_dars_novleri->>'kollokvium')::boolean,false) then coalesce((ct.icazeler->>'kollokvium')::boolean,false) else false end,
      'tecrube', case when coalesce((new.aktiv_dars_novleri->>'tecrube')::boolean,false) then coalesce((ct.icazeler->>'tecrube')::boolean,false) else false end
    )
    where ct.course_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clamp_teacher_permissions on public.courses;
create trigger trg_clamp_teacher_permissions
after update of aktiv_dars_novleri on public.courses
for each row execute function private.clamp_teacher_permissions_to_active_lesson_types();

commit;
