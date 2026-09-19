drop policy if exists courses_update_managers on public.courses;

create policy courses_update_managers
on public.courses
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or public.is_course_tutor(id, (select auth.uid()))
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or (
    group_id is not null
    and private.dekan_can_access_group(group_id)
  )
  or public.is_course_tutor(id, (select auth.uid()))
);
