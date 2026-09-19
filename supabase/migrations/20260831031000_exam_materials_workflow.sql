-- Secure exam-material domain. This migration intentionally does not touch
-- exam_scores, exam_detailed_results, or the official exam-result sync path.

create table if not exists public.exam_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  academic_year text not null,
  semester smallint not null check (semester in (1, 2)),
  exam_type text not null check (exam_type in ('test', 'ticket')),
  file_path text not null unique,
  original_file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_materials_academic_year_format check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  constraint exam_materials_docx_name check (lower(original_file_name) like '%.docx'),
  constraint exam_materials_docx_mime check (mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  constraint exam_materials_one_active_per_type unique (course_id, group_id, academic_year, semester, exam_type)
);

create index if not exists exam_materials_group_period_idx
  on public.exam_materials(group_id, academic_year, semester);
create index if not exists exam_materials_course_period_idx
  on public.exam_materials(course_id, academic_year, semester);
create index if not exists exam_materials_uploaded_by_idx
  on public.exam_materials(uploaded_by);

alter table public.exam_materials enable row level security;

create or replace function private.exam_material_semester_number(p_value text)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_value, '')))
    when 'payız' then 1 when 'payiz' then 1 when 'fall' then 1 when 'autumn' then 1 when 'güz' then 1 when '1' then 1 when 'i' then 1
    when 'yaz' then 2 when 'spring' then 2 when 'bahar' then 2 when '2' then 2 when 'ii' then 2
    else null
  end::smallint;
$$;

create or replace function private.exam_material_current_pair(
  p_course_id uuid,
  p_group_id uuid,
  p_academic_year text,
  p_semester smallint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_groups cg
    join public.groups g on g.id = cg.group_id
    join public.system_settings ss on ss.singleton = true
    where cg.course_id = p_course_id
      and cg.group_id = p_group_id
      and cg.tedris_ili = p_academic_year
      and cg.semestr = p_semester
      and g.arxivlenib is false
      and nullif(btrim(ss.cari_tedris_ili), '') = nullif(btrim(p_academic_year), '')
      and private.exam_material_semester_number(ss.cari_semestr) = p_semester
  );
$$;

create or replace function private.exam_material_teacher_can_manage(
  p_course_id uuid,
  p_group_id uuid,
  p_academic_year text,
  p_semester smallint,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_teacher_id is not null
    and public.has_role(p_teacher_id, 'muellim'::public.app_role)
    and exists (
      select 1 from public.course_teachers ct
      where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id
    )
    and private.exam_material_current_pair(p_course_id, p_group_id, p_academic_year, p_semester);
$$;

create or replace function private.exam_material_can_read(
  p_course_id uuid,
  p_group_id uuid,
  p_academic_year text,
  p_semester smallint,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    public.has_role(p_user_id, 'admin'::public.app_role)
    or private.dekan_can_access_group(p_group_id)
    or (
      public.has_role(p_user_id, 'muellim'::public.app_role)
      and exists (select 1 from public.course_teachers ct where ct.course_id = p_course_id and ct.muellim_id = p_user_id)
      and exists (
        select 1 from public.course_groups cg
        where cg.course_id = p_course_id and cg.group_id = p_group_id
          and cg.tedris_ili = p_academic_year and cg.semestr = p_semester
      )
    )
    or (
      public.has_role(p_user_id, 'tyutor'::public.app_role)
      and exists (select 1 from public.groups g where g.id = p_group_id and g.tyutor_id = p_user_id and g.arxivlenib is false)
      and exists (
        select 1 from public.course_groups cg
        where cg.course_id = p_course_id and cg.group_id = p_group_id
          and cg.tedris_ili = p_academic_year and cg.semestr = p_semester
      )
    )
    or (
      public.has_role(p_user_id, 'telebe'::public.app_role)
      and exists (select 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id)
      and exists (
        select 1 from public.course_groups cg
        where cg.course_id = p_course_id and cg.group_id = p_group_id
          and cg.tedris_ili = p_academic_year and cg.semestr = p_semester
      )
      and exists (
        select 1 from public.system_settings ss
        where ss.singleton = true
          and nullif(btrim(ss.cari_tedris_ili), '') = nullif(btrim(p_academic_year), '')
          and private.exam_material_semester_number(ss.cari_semestr) = p_semester
      )
    )
  );
$$;

create or replace function private.exam_material_valid_path(
  p_name text,
  p_course_id uuid,
  p_group_id uuid,
  p_academic_year text,
  p_semester smallint,
  p_exam_type text,
  p_uploader uuid
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(p_name, '/', 1) = p_academic_year
    and split_part(p_name, '/', 2) = p_semester::text
    and split_part(p_name, '/', 3) = p_group_id::text
    and split_part(p_name, '/', 4) = p_course_id::text
    and split_part(p_name, '/', 5) = p_exam_type
    and split_part(p_name, '/', 6) = p_uploader::text
    and split_part(p_name, '/', 7) ~* '^[0-9a-f-]{36}\.docx$'
    and split_part(p_name, '/', 8) = '';
$$;

create or replace function private.exam_material_storage_teacher_can_write(p_name text, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_year text;
  v_semester smallint;
  v_group uuid;
  v_course uuid;
  v_type text;
  v_uploader uuid;
begin
  if p_user_id is null or lower(p_name) not like '%.docx' then return false; end if;
  begin
    v_year := split_part(p_name, '/', 1);
    v_semester := split_part(p_name, '/', 2)::smallint;
    v_group := split_part(p_name, '/', 3)::uuid;
    v_course := split_part(p_name, '/', 4)::uuid;
    v_type := split_part(p_name, '/', 5);
    v_uploader := split_part(p_name, '/', 6)::uuid;
  exception when others then
    return false;
  end;
  if v_type not in ('test', 'ticket') or v_uploader <> p_user_id then return false; end if;
  return private.exam_material_valid_path(p_name, v_course, v_group, v_year, v_semester, v_type, v_uploader)
    and private.exam_material_teacher_can_manage(v_course, v_group, v_year, v_semester, p_user_id);
end;
$$;

create or replace function private.exam_material_storage_can_read(p_name text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exam_materials em
    where em.file_path = p_name
      and private.exam_material_can_read(em.course_id, em.group_id, em.academic_year, em.semester, p_user_id)
  );
$$;

create or replace function private.enforce_exam_material_write_scope()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_privileged boolean := false;
begin
  if new.mime_type <> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     or lower(new.original_file_name) not like '%.docx'
     or new.file_size <= 0 or new.file_size > 20971520 then
    raise exception using errcode = '23514', message = 'EXAM_MATERIAL_DOCX_REQUIRED';
  end if;

  if not private.exam_material_valid_path(
    new.file_path, new.course_id, new.group_id, new.academic_year, new.semester, new.exam_type, new.uploaded_by
  ) then
    raise exception using errcode = '23514', message = 'EXAM_MATERIAL_INVALID_PATH';
  end if;

  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  v_privileged := public.has_role(v_uid, 'admin'::public.app_role) or public.has_role(v_uid, 'dekan'::public.app_role);
  if v_privileged then
    new.updated_at := now();
    return new;
  end if;

  if not private.exam_material_teacher_can_manage(new.course_id, new.group_id, new.academic_year, new.semester, v_uid) then
    raise exception using errcode = '42501', message = 'EXAM_MATERIAL_FORBIDDEN';
  end if;

  if tg_op = 'INSERT' then
    if new.uploaded_by is distinct from v_uid then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_UPLOADER_MISMATCH';
    end if;
    new.uploaded_at := now();
  else
    if old.uploaded_by is distinct from v_uid then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_OWNER_ONLY';
    end if;
    if new.id is distinct from old.id
       or new.course_id is distinct from old.course_id
       or new.group_id is distinct from old.group_id
       or new.academic_year is distinct from old.academic_year
       or new.semester is distinct from old.semester
       or new.exam_type is distinct from old.exam_type
       or new.file_path is distinct from old.file_path
       or new.uploaded_by is distinct from old.uploaded_by
       or new.uploaded_at is distinct from old.uploaded_at then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_IDENTITY_IMMUTABLE';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_exam_material_write_scope on public.exam_materials;
create trigger trg_enforce_exam_material_write_scope
before insert or update on public.exam_materials
for each row execute function private.enforce_exam_material_write_scope();

revoke all on table public.exam_materials from anon, authenticated;
grant select, insert, update, delete on table public.exam_materials to authenticated;

revoke all on function private.exam_material_semester_number(text) from public;
revoke all on function private.exam_material_current_pair(uuid, uuid, text, smallint) from public;
revoke all on function private.exam_material_teacher_can_manage(uuid, uuid, text, smallint, uuid) from public;
revoke all on function private.exam_material_can_read(uuid, uuid, text, smallint, uuid) from public;
revoke all on function private.exam_material_valid_path(text, uuid, uuid, text, smallint, text, uuid) from public;
revoke all on function private.exam_material_storage_teacher_can_write(text, uuid) from public;
revoke all on function private.exam_material_storage_can_read(text, uuid) from public;
revoke all on function private.enforce_exam_material_write_scope() from public;
grant execute on function private.exam_material_storage_teacher_can_write(text, uuid) to authenticated;
grant execute on function private.exam_material_storage_can_read(text, uuid) to authenticated;

drop policy if exists exam_materials_select on public.exam_materials;
create policy exam_materials_select on public.exam_materials
for select to authenticated
using (private.exam_material_can_read(course_id, group_id, academic_year, semester, (select auth.uid())));

drop policy if exists exam_materials_insert on public.exam_materials;
create policy exam_materials_insert on public.exam_materials
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    uploaded_by = (select auth.uid())
    and private.exam_material_teacher_can_manage(course_id, group_id, academic_year, semester, (select auth.uid()))
  )
);

drop policy if exists exam_materials_update on public.exam_materials;
create policy exam_materials_update on public.exam_materials
for update to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    uploaded_by = (select auth.uid())
    and private.exam_material_teacher_can_manage(course_id, group_id, academic_year, semester, (select auth.uid()))
  )
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    uploaded_by = (select auth.uid())
    and private.exam_material_teacher_can_manage(course_id, group_id, academic_year, semester, (select auth.uid()))
  )
);

drop policy if exists exam_materials_delete on public.exam_materials;
create policy exam_materials_delete on public.exam_materials
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    uploaded_by = (select auth.uid())
    and private.exam_material_teacher_can_manage(course_id, group_id, academic_year, semester, (select auth.uid()))
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-materials',
  'exam-materials',
  false,
  20971520,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists exam_materials_storage_select on storage.objects;
create policy exam_materials_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'exam-materials'
  and private.exam_material_storage_can_read(name, (select auth.uid()))
);

drop policy if exists exam_materials_storage_insert on storage.objects;
create policy exam_materials_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'exam-materials'
  and private.exam_material_storage_teacher_can_write(name, (select auth.uid()))
);

drop policy if exists exam_materials_storage_update on storage.objects;
create policy exam_materials_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'exam-materials'
  and private.exam_material_storage_teacher_can_write(name, (select auth.uid()))
)
with check (
  bucket_id = 'exam-materials'
  and private.exam_material_storage_teacher_can_write(name, (select auth.uid()))
);

drop policy if exists exam_materials_storage_delete on storage.objects;
create policy exam_materials_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'exam-materials'
  and private.exam_material_storage_teacher_can_write(name, (select auth.uid()))
);
