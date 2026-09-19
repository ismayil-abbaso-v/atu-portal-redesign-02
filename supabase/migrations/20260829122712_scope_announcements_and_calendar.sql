create or replace function private.dekan_can_target_announcement(_audience_type text,_audience_value text,_created_by uuid default null)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role)
    and (_created_by is null or _created_by=(select auth.uid()))
    and (
      (_audience_type='faculty' and lower(btrim(coalesce(_audience_value,'')))=lower(btrim(coalesce(private.current_user_faculty_name(),''))))
      or (_audience_type='group' and exists(
        select 1 from public.groups g
        where lower(btrim(g.ad))=lower(btrim(coalesce(_audience_value,'')))
          and g.faculty_id=private.current_user_faculty_id()
      ))
    );
$$;

create or replace function private.dekan_can_manage_announcement(_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select exists(
    select 1 from public.announcements a
    where a.id=_announcement_id
      and private.dekan_can_target_announcement(a.audience_type,a.audience_value,a.created_by)
  );
$$;
revoke all on function private.dekan_can_target_announcement(text,text,uuid) from public,anon;
revoke all on function private.dekan_can_manage_announcement(uuid) from public,anon;
grant execute on function private.dekan_can_target_announcement(text,text,uuid) to authenticated;
grant execute on function private.dekan_can_manage_announcement(uuid) to authenticated;

-- Dean can author only faculty/group announcements inside their own faculty; university-wide announcements stay admin-only.
drop policy if exists announcements_select_visible on public.announcements;
create policy announcements_select_visible on public.announcements for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_manage_announcement(id)
  or (
    status='published' and starts_at<=now() and (ends_at is null or ends_at>=now())
    and (
      audience_type='all'
      or (audience_type='faculty' and exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and lower(btrim(coalesce(p.fakulte,'')))=lower(btrim(coalesce(announcements.audience_value,'')))))
      or (audience_type='group' and exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and lower(btrim(coalesce(p.qrup,'')))=lower(btrim(coalesce(announcements.audience_value,'')))))
    )
  )
);

drop policy if exists announcements_insert_managers on public.announcements;
create policy announcements_insert_managers on public.announcements for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_target_announcement(audience_type,audience_value,created_by)
);
drop policy if exists announcements_update_managers on public.announcements;
create policy announcements_update_managers on public.announcements for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_manage_announcement(id))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_target_announcement(audience_type,audience_value,created_by));
drop policy if exists announcements_delete_managers on public.announcements;
create policy announcements_delete_managers on public.announcements for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_manage_announcement(id));

drop policy if exists announcement_reads_select on public.announcement_reads;
create policy announcement_reads_select on public.announcement_reads for select to authenticated using (
  user_id=(select auth.uid())
  or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_manage_announcement(announcement_id)
);
drop policy if exists announcement_reads_insert_self on public.announcement_reads;
create policy announcement_reads_insert_self on public.announcement_reads for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists announcement_reads_update_self on public.announcement_reads;
create policy announcement_reads_update_self on public.announcement_reads for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- Calendar: admin manages all; dean manages only own-faculty group events; tutor manages own group.
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or yaradan_id=(select auth.uid())
  or group_id is null
  or exists(select 1 from public.group_members gm where gm.group_id=calendar_events.group_id and gm.user_id=(select auth.uid()))
  or exists(select 1 from public.groups g where g.id=calendar_events.group_id and g.tyutor_id=(select auth.uid()))
  or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid())))
);
drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and group_id is not null and exists(select 1 from public.groups g where g.id=calendar_events.group_id and g.tyutor_id=(select auth.uid())))
);
drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events for update to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and group_id is not null and exists(select 1 from public.groups g where g.id=calendar_events.group_id and g.tyutor_id=(select auth.uid())))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and group_id is not null and exists(select 1 from public.groups g where g.id=calendar_events.group_id and g.tyutor_id=(select auth.uid())))
);
drop policy if exists calendar_events_delete on public.calendar_events;
create policy calendar_events_delete on public.calendar_events for delete to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and group_id is not null and exists(select 1 from public.groups g where g.id=calendar_events.group_id and g.tyutor_id=(select auth.uid())))
);

create index if not exists idx_announcements_created_by on public.announcements(created_by);
create index if not exists idx_announcements_updated_by on public.announcements(updated_by);
create index if not exists idx_calendar_events_course_id on public.calendar_events(course_id);
create index if not exists idx_calendar_events_group_id on public.calendar_events(group_id);
create index if not exists idx_calendar_events_yaradan_id on public.calendar_events(yaradan_id);
create index if not exists idx_course_topics_course_id on public.course_topics(course_id);
create index if not exists idx_exam_schedule_yaradan_id on public.exam_schedule(yaradan_id);
create index if not exists idx_exam_schedule_group_id on public.exam_schedule(group_id);
create index if not exists idx_exam_schedule_course_id on public.exam_schedule(course_id);