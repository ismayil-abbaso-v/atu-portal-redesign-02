create or replace function public.is_course_tutor(_course_id uuid,_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(select 1 from public.courses c where c.id=_course_id and c.tyutor_id=_user_id)
  or exists(
    select 1
    from public.course_groups cg
    join public.groups g on g.id=cg.group_id and g.tyutor_id=_user_id
    join public.system_settings ss on ss.singleton is true
    where cg.course_id=_course_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end
  );
$$;

create or replace function public.is_group_teacher(_group_id uuid,_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.course_groups cg
    join public.system_settings ss on ss.singleton is true
    join public.courses c on c.id=cg.course_id
    where cg.group_id=_group_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end
      and (c.muellim_id=_user_id or exists(select 1 from public.course_teachers ct where ct.course_id=c.id and ct.muellim_id=_user_id))
  );
$$;

create or replace function private.ejournal_is_course_group_tutor(p_course_id uuid,p_group_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select p_user_id is not null
    and exists(
      select 1
      from public.course_groups cg
      join public.system_settings ss on ss.singleton is true
      where cg.course_id=p_course_id and cg.group_id=p_group_id
        and cg.tedris_ili=ss.cari_tedris_ili
        and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end
    )
    and (
      exists(select 1 from public.courses c where c.id=p_course_id and c.tyutor_id=p_user_id)
      or exists(select 1 from public.groups g where g.id=p_group_id and g.tyutor_id=p_user_id)
    );
$$;

create or replace function private.ejournal_is_student_course_tutor(p_course_id uuid,p_student_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select p_user_id is not null and exists(
    select 1
    from public.group_members gm
    join public.groups g on g.id=gm.group_id
    join public.course_groups cg on cg.group_id=gm.group_id and cg.course_id=p_course_id
    join public.system_settings ss on ss.singleton is true
    where gm.user_id=p_student_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end
      and (g.tyutor_id=p_user_id or exists(select 1 from public.courses c where c.id=p_course_id and c.tyutor_id=p_user_id))
  );
$$;