-- Prompt 5: exact course/group roster for teacher bulk assessment UI.
-- SECURITY INVOKER keeps profile/group RLS active; is_course_student is the
-- authoritative course membership helper from the existing permission model.

create or replace function public.teacher_assessment_roster(
  p_course_id uuid,
  p_group_id uuid
)
returns table (
  user_id uuid,
  ad text,
  soyad text,
  istifadeci_adi text
)
language sql
stable
security invoker
set search_path = 'public', 'private', 'pg_temp'
as $$
  select p.user_id, p.ad, p.soyad, p.istifadeci_adi
  from public.group_members gm
  join public.profiles p on p.user_id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_course_teacher(p_course_id, auth.uid())
    and exists (
      select 1
      from public.course_groups cg
      where cg.course_id = p_course_id
        and cg.group_id = p_group_id
    )
    and public.is_course_student(p_course_id, gm.user_id)
  order by
    coalesce(p.soyad, '') collate "az-x-icu",
    coalesce(p.ad, '') collate "az-x-icu",
    p.user_id;
$$;

revoke all on function public.teacher_assessment_roster(uuid, uuid) from public;
grant execute on function public.teacher_assessment_roster(uuid, uuid) to authenticated;
