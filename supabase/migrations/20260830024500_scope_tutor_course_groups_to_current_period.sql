drop policy if exists course_groups_select on public.course_groups;
create policy course_groups_select
on public.course_groups
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or public.is_course_teacher(course_id, (select auth.uid()))
  or (
    public.is_course_tutor(course_id, (select auth.uid()))
    and tedris_ili = (
      select ss.cari_tedris_ili
      from public.system_settings ss
      where ss.singleton is true
      limit 1
    )
    and semestr = (
      select case
        when lower(coalesce(ss.cari_semestr, '')) in ('payız','payiz','fall','autumn') then 1
        when lower(coalesce(ss.cari_semestr, '')) in ('yaz','spring') then 2
        else null
      end
      from public.system_settings ss
      where ss.singleton is true
      limit 1
    )
  )
  or (
    public.is_group_member(group_id, (select auth.uid()))
    and tedris_ili = (
      select ss.cari_tedris_ili
      from public.system_settings ss
      where ss.singleton is true
      limit 1
    )
    and semestr = (
      select case
        when lower(coalesce(ss.cari_semestr, '')) in ('payız','payiz','fall','autumn') then 1
        when lower(coalesce(ss.cari_semestr, '')) in ('yaz','spring') then 2
        else null
      end
      from public.system_settings ss
      where ss.singleton is true
      limit 1
    )
  )
);
