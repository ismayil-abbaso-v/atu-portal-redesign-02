do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.course_topics'::regclass
      and conname = 'course_topics_id_course_unique'
  ) then
    alter table public.course_topics
      add constraint course_topics_id_course_unique unique (id, course_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.course_topic_files'::regclass
      and conname = 'course_topic_files_topic_course_fkey'
  ) then
    alter table public.course_topic_files
      add constraint course_topic_files_topic_course_fkey
      foreign key (topic_id, course_id)
      references public.course_topics(id, course_id)
      on delete cascade;
  end if;
end;
$$;

create or replace function private.guard_course_teacher_identity()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if new.course_id is distinct from old.course_id
     or new.muellim_id is distinct from old.muellim_id then
    raise exception 'Müəllim təyinatının fənn və istifadəçi identifikatoru dəyişdirilə bilməz. Yeni təyinat yaradın.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_course_teacher_identity on public.course_teachers;
create trigger guard_course_teacher_identity
before update of course_id, muellim_id on public.course_teachers
for each row execute function private.guard_course_teacher_identity();

create or replace function public.course_teacher_detach_impact(
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
  v_templates integer := 0;
  v_future integer := 0;
  v_active integer := 0;
  v_confirmed integer := 0;
  v_past_unconfirmed integer := 0;
  v_primary boolean := false;
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
    return jsonb_build_object('exists', false);
  end if;

  select count(*)::integer into v_templates
  from public.course_schedule_templates st
  where st.course_id = p_course_id and st.teacher_id = p_teacher_id;

  select
    count(*) filter (where s.is_confirmed)::integer,
    count(*) filter (where not s.is_confirmed and s.starts_at > now())::integer,
    count(*) filter (where not s.is_confirmed and s.starts_at <= now() and s.ends_at > now())::integer,
    count(*) filter (where not s.is_confirmed and s.ends_at <= now())::integer
  into v_confirmed, v_future, v_active, v_past_unconfirmed
  from public.course_lesson_sessions s
  where s.course_id = p_course_id and s.teacher_id = p_teacher_id;

  select (c.muellim_id = p_teacher_id)
  into v_primary
  from public.courses c
  where c.id = p_course_id;

  return jsonb_build_object(
    'exists', true,
    'schedule_templates', v_templates,
    'future_unconfirmed_sessions', v_future,
    'active_sessions', v_active,
    'confirmed_history_sessions', v_confirmed,
    'past_unconfirmed_sessions', v_past_unconfirmed,
    'is_primary', coalesce(v_primary, false),
    'requires_reassignment', (v_templates > 0 or v_future > 0),
    'blocked_by_active_session', (v_active > 0)
  );
end;
$$;

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
  v_templates integer := 0;
  v_future integer := 0;
  v_active integer := 0;
  v_new_primary uuid;
  v_was_primary boolean := false;
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

  select count(*)::integer into v_active
  from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at <= now()
    and s.ends_at > now();

  if v_active > 0 then
    raise exception 'Müəllimin hazırda aktiv dərs sessiyası var. Dərs bitdikdən sonra yenidən cəhd edin.' using errcode = '55000';
  end if;

  select count(*)::integer into v_templates
  from public.course_schedule_templates st
  where st.course_id = p_course_id and st.teacher_id = p_teacher_id;

  select count(*)::integer into v_future
  from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at > now();

  if v_templates > 0 or v_future > 0 then
    raise exception 'Bu müəllim planlanmış dərslərdə istifadə olunur. Əvvəl başqa müəllimə yenidən təyin edin.' using errcode = '55000';
  end if;

  select (c.muellim_id = p_teacher_id)
  into v_was_primary
  from public.courses c
  where c.id = p_course_id;

  delete from public.course_teachers ct
  where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id;

  if coalesce(v_was_primary, false) then
    select ct.muellim_id into v_new_primary
    from public.course_teachers ct
    where ct.course_id = p_course_id
    order by ct.created_at, ct.id
    limit 1;

    update public.courses
    set muellim_id = v_new_primary
    where id = p_course_id;
  end if;

  return jsonb_build_object(
    'removed', true,
    'preserved_history', true,
    'new_primary_teacher_id', v_new_primary
  );
end;
$$;

create or replace function public.reassign_and_remove_course_teacher(
  p_course_id uuid,
  p_teacher_id uuid,
  p_replacement_teacher_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_permissions jsonb;
  v_templates integer := 0;
  v_future integer := 0;
  v_active integer := 0;
  v_was_primary boolean := false;
  v_missing_type text;
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

  if p_replacement_teacher_id is null or p_replacement_teacher_id = p_teacher_id then
    raise exception 'Əvəzləyici müəllim seçilməlidir.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.course_teachers ct
    where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id
  ) then
    raise exception 'Çıxarılacaq müəllim bu fənnə təyin edilməyib.' using errcode = 'P0002';
  end if;

  select ct.icazeler into v_permissions
  from public.course_teachers ct
  where ct.course_id = p_course_id and ct.muellim_id = p_replacement_teacher_id;

  if v_permissions is null then
    raise exception 'Əvəzləyici müəllim əvvəlcə bu fənnə əlavə edilməlidir.' using errcode = '22023';
  end if;

  select count(*)::integer into v_active
  from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at <= now()
    and s.ends_at > now();

  if v_active > 0 then
    raise exception 'Müəllimin hazırda aktiv dərs sessiyası var. Dərs bitdikdən sonra yenidən cəhd edin.' using errcode = '55000';
  end if;

  select x.dars_novu into v_missing_type
  from (
    select distinct st.dars_novu
    from public.course_schedule_templates st
    where st.course_id = p_course_id and st.teacher_id = p_teacher_id
    union
    select distinct s.dars_novu
    from public.course_lesson_sessions s
    where s.course_id = p_course_id
      and s.teacher_id = p_teacher_id
      and not s.is_confirmed
      and s.starts_at > now()
  ) x
  where x.dars_novu is not null
    and not coalesce((v_permissions ->> x.dars_novu)::boolean, false)
  limit 1;

  if v_missing_type is not null then
    raise exception 'Əvəzləyici müəllimin % dərs növü üçün icazəsi yoxdur.', v_missing_type using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.course_schedule_templates src
    join public.course_schedule_templates dst
      on dst.course_id = src.course_id
     and dst.group_id = src.group_id
     and dst.teacher_id = p_replacement_teacher_id
     and dst.gun_nomresi = src.gun_nomresi
     and dst.baslangic_saat = src.baslangic_saat
     and dst.hefte_novu = src.hefte_novu
     and dst.id <> src.id
    where src.course_id = p_course_id
      and src.teacher_id = p_teacher_id
  ) then
    raise exception 'Əvəzləyici müəllimin eyni dərs cədvəli slotunda artıq təyinatı var.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.course_lesson_sessions src
    join public.course_lesson_sessions dst
      on dst.course_id = src.course_id
     and dst.group_id = src.group_id
     and dst.teacher_id = p_replacement_teacher_id
     and dst.starts_at = src.starts_at
     and dst.id <> src.id
    where src.course_id = p_course_id
      and src.teacher_id = p_teacher_id
      and not src.is_confirmed
      and src.starts_at > now()
  ) then
    raise exception 'Əvəzləyici müəllimin eyni vaxtda artıq planlanmış dərs sessiyası var.' using errcode = '23505';
  end if;

  select count(*)::integer into v_templates
  from public.course_schedule_templates st
  where st.course_id = p_course_id and st.teacher_id = p_teacher_id;

  select count(*)::integer into v_future
  from public.course_lesson_sessions s
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at > now();

  update public.course_schedule_templates st
  set teacher_id = p_replacement_teacher_id,
      updated_at = now()
  where st.course_id = p_course_id and st.teacher_id = p_teacher_id;

  update public.course_lesson_sessions s
  set teacher_id = p_replacement_teacher_id,
      updated_at = now()
  where s.course_id = p_course_id
    and s.teacher_id = p_teacher_id
    and not s.is_confirmed
    and s.starts_at > now();

  select (c.muellim_id = p_teacher_id)
  into v_was_primary
  from public.courses c
  where c.id = p_course_id;

  if coalesce(v_was_primary, false) then
    update public.courses
    set muellim_id = p_replacement_teacher_id
    where id = p_course_id;
  end if;

  delete from public.course_teachers ct
  where ct.course_id = p_course_id and ct.muellim_id = p_teacher_id;

  return jsonb_build_object(
    'removed', true,
    'replacement_teacher_id', p_replacement_teacher_id,
    'reassigned_schedule_templates', v_templates,
    'reassigned_future_sessions', v_future,
    'preserved_history', true,
    'primary_teacher_updated', coalesce(v_was_primary, false)
  );
end;
$$;

create or replace function public.set_course_primary_teacher(
  p_course_id uuid,
  p_teacher_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
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
    raise exception 'Əsas müəllim yalnız bu fənnə təyin edilmiş müəllimlərdən seçilə bilər.' using errcode = '22023';
  end if;

  update public.courses
  set muellim_id = p_teacher_id
  where id = p_course_id;

  return p_teacher_id;
end;
$$;

drop policy if exists course_teachers_delete_managers on public.course_teachers;
create policy course_teachers_delete_managers
on public.course_teachers
for delete
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(course_id)
);

revoke all on function public.course_teacher_detach_impact(uuid, uuid) from public, anon;
revoke all on function public.remove_course_teacher(uuid, uuid) from public, anon;
revoke all on function public.reassign_and_remove_course_teacher(uuid, uuid, uuid) from public, anon;
revoke all on function public.set_course_primary_teacher(uuid, uuid) from public, anon;

grant execute on function public.course_teacher_detach_impact(uuid, uuid) to authenticated, service_role;
grant execute on function public.remove_course_teacher(uuid, uuid) to authenticated, service_role;
grant execute on function public.reassign_and_remove_course_teacher(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.set_course_primary_teacher(uuid, uuid) to authenticated, service_role;
