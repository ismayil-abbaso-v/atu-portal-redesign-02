create or replace function public.list_linkable_courses_for_group(
  p_group_id uuid,
  p_query text default null,
  p_limit integer default 30
)
returns table(id uuid, ad text, kod text)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_user_id is null then
    raise exception 'İstifadəçi sessiyası tapılmadı.' using errcode = '42501';
  end if;

  select
    public.has_role(v_user_id, 'admin'::public.app_role)
    or private.dekan_can_access_group(p_group_id)
    or (
      public.has_role(v_user_id, 'tyutor'::public.app_role)
      and exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.tyutor_id = v_user_id
          and g.arxivlenib is false
      )
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'Bu qrup üçün fənn seçmək icazəniz yoxdur.' using errcode = '42501';
  end if;

  return query
  select c.id, c.ad, c.kod
  from public.courses c
  where c.group_id is null
    and not exists (
      select 1
      from public.course_groups cg
      where cg.course_id = c.id
    )
    and (
      nullif(btrim(coalesce(p_query, '')), '') is null
      or c.ad ilike '%' || replace(replace(replace(btrim(p_query), '%', ''), '_', ''), ',', '') || '%'
      or coalesce(c.kod, '') ilike '%' || replace(replace(replace(btrim(p_query), '%', ''), '_', ''), ',', '') || '%'
    )
  order by c.ad
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
end;
$$;

create or replace function public.link_unassigned_course_to_group(
  p_group_id uuid,
  p_course_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean := false;
  v_existing_group uuid;
begin
  if v_user_id is null then
    raise exception 'İstifadəçi sessiyası tapılmadı.' using errcode = '42501';
  end if;

  select
    public.has_role(v_user_id, 'admin'::public.app_role)
    or private.dekan_can_access_group(p_group_id)
    or (
      public.has_role(v_user_id, 'tyutor'::public.app_role)
      and exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.tyutor_id = v_user_id
          and g.arxivlenib is false
      )
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'Bu qrup üçün fənn bağlamaq icazəniz yoxdur.' using errcode = '42501';
  end if;

  select c.group_id
    into v_existing_group
  from public.courses c
  where c.id = p_course_id
  for update;

  if not found then
    raise exception 'Fənn tapılmadı.' using errcode = 'P0002';
  end if;

  if v_existing_group is not null
     or exists (select 1 from public.course_groups cg where cg.course_id = p_course_id) then
    raise exception 'Bu fənn artıq başqa qrup üçün istifadə olunur. Mövcud course instance paylaşılmır; yeni fənn yaradın.' using errcode = '23505';
  end if;

  update public.courses
  set group_id = p_group_id
  where id = p_course_id;

  return p_course_id;
end;
$$;

revoke all on function public.list_linkable_courses_for_group(uuid, text, integer) from public, anon;
revoke all on function public.link_unassigned_course_to_group(uuid, uuid) from public, anon;
grant execute on function public.list_linkable_courses_for_group(uuid, text, integer) to authenticated, service_role;
grant execute on function public.link_unassigned_course_to_group(uuid, uuid) to authenticated, service_role;
