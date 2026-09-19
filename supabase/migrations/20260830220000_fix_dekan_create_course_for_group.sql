create or replace function public.create_course_for_group(
  p_group_id uuid,
  p_ad text,
  p_kod text default null,
  p_kurs integer default null,
  p_muellim_id uuid default null,
  p_kredit integer default null,
  p_saat integer default null,
  p_muellim_icazeler jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_allowed boolean := false;
begin
  if v_user_id is null then
    raise exception 'İstifadəçi sessiyası tapılmadı.' using errcode = '42501';
  end if;

  select
    public.has_role(v_user_id, 'admin'::public.app_role)
    or (
      public.has_role(v_user_id, 'dekan'::public.app_role)
      and exists (
        select 1
        from public.groups g
        join public.faculties f on f.id = g.faculty_id
        join public.profiles p on p.user_id = v_user_id
        where g.id = p_group_id
          and lower(btrim(f.ad)) = lower(btrim(p.fakulte))
      )
    )
    or (
      public.has_role(v_user_id, 'tyutor'::public.app_role)
      and exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.tyutor_id = v_user_id
      )
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'Bu qrup üçün fənn yaratmaq icazəniz yoxdur.' using errcode = '42501';
  end if;

  if nullif(btrim(p_ad), '') is null then
    raise exception 'Fənn adını daxil edin.' using errcode = '22023';
  end if;
  if p_kurs is not null and (p_kurs < 1 or p_kurs > 4) then
    raise exception 'Kurs 1–4 aralığında olmalıdır.' using errcode = '22023';
  end if;
  if p_kredit is not null and p_kredit < 0 then
    raise exception 'Kredit sıfır və ya müsbət tam ədəd olmalıdır.' using errcode = '22023';
  end if;
  if p_saat is not null and p_saat < 0 then
    raise exception 'Saat sıfır və ya müsbət tam ədəd olmalıdır.' using errcode = '22023';
  end if;

  if p_muellim_id is not null
     and not public.has_role(p_muellim_id, 'muellim'::public.app_role) then
    raise exception 'Seçilmiş istifadəçi müəllim roluna malik deyil.' using errcode = '22023';
  end if;

  insert into public.courses (
    ad,
    kod,
    kurs,
    muellim_id,
    kredit,
    saat,
    group_id
  )
  values (
    btrim(p_ad),
    nullif(upper(btrim(p_kod)), ''),
    p_kurs,
    p_muellim_id,
    p_kredit,
    p_saat,
    p_group_id
  )
  returning id into v_course_id;

  -- courses.group_id üçün mövcud trigger course_groups əlaqəsini atomik şəkildə yaradır.
  if p_muellim_id is not null then
    insert into public.course_teachers (course_id, muellim_id, icazeler)
    values (v_course_id, p_muellim_id, coalesce(p_muellim_icazeler, '{}'::jsonb));
  end if;

  return v_course_id;
end;
$$;

revoke all on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) from public;
revoke all on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) from anon;
grant execute on function public.create_course_for_group(uuid, text, text, integer, uuid, integer, integer, jsonb) to authenticated;
