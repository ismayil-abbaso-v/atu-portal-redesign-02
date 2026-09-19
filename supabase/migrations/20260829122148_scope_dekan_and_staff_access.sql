-- Canonical faculty-scoping helpers live outside the exposed Data API schema.
create or replace function private.current_user_faculty_id()
returns uuid
language sql
stable
security definer
set search_path = public,private
as $$
  select f.id
  from public.profiles p
  join public.faculties f on lower(btrim(f.ad))=lower(btrim(p.fakulte))
  where p.user_id=(select auth.uid())
  limit 1;
$$;

create or replace function private.current_user_faculty_name()
returns text
language sql
stable
security definer
set search_path = public,private
as $$
  select f.ad from public.faculties f where f.id=private.current_user_faculty_id();
$$;

create or replace function private.dekan_can_access_faculty(_faculty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role)
     and _faculty_id is not null
     and _faculty_id=private.current_user_faculty_id();
$$;

create or replace function private.dekan_can_access_group(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role)
     and exists(select 1 from public.groups g where g.id=_group_id and g.faculty_id=private.current_user_faculty_id());
$$;

create or replace function private.dekan_can_access_user(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role)
     and exists(
       select 1 from public.profiles p
       join public.faculties f on lower(btrim(f.ad))=lower(btrim(p.fakulte))
       where p.user_id=_user_id and f.id=private.current_user_faculty_id()
     );
$$;

create or replace function private.dekan_can_access_course(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role)
     and exists(
       select 1
       from public.courses c
       where c.id=_course_id and (
         (c.group_id is not null and exists(select 1 from public.groups g where g.id=c.group_id and g.faculty_id=private.current_user_faculty_id()))
         or exists(
           select 1 from public.course_groups cg
           join public.groups g on g.id=cg.group_id
           where cg.course_id=c.id and g.faculty_id=private.current_user_faculty_id()
         )
       )
     );
$$;

create or replace function private.dekan_can_access_student_course(_course_id uuid,_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,private
as $$
  select private.dekan_can_access_user(_student_id) and private.dekan_can_access_course(_course_id);
$$;

revoke all on function private.current_user_faculty_id() from public,anon;
revoke all on function private.current_user_faculty_name() from public,anon;
revoke all on function private.dekan_can_access_faculty(uuid) from public,anon;
revoke all on function private.dekan_can_access_group(uuid) from public,anon;
revoke all on function private.dekan_can_access_user(uuid) from public,anon;
revoke all on function private.dekan_can_access_course(uuid) from public,anon;
revoke all on function private.dekan_can_access_student_course(uuid,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_faculty_id() to authenticated;
grant execute on function private.current_user_faculty_name() to authenticated;
grant execute on function private.dekan_can_access_faculty(uuid) to authenticated;
grant execute on function private.dekan_can_access_group(uuid) to authenticated;
grant execute on function private.dekan_can_access_user(uuid) to authenticated;
grant execute on function private.dekan_can_access_course(uuid) to authenticated;
grant execute on function private.dekan_can_access_student_course(uuid,uuid) to authenticated;

-- Profiles and role management: dean scope is strictly own faculty.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (
  user_id=(select auth.uid())
  or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_user(user_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(user_id,(select auth.uid())))
  or exists(select 1 from public.course_teachers ct where ct.muellim_id=profiles.user_id and (public.is_course_teacher(ct.course_id,(select auth.uid())) or public.is_course_tutor(ct.course_id,(select auth.uid())) or public.is_course_student(ct.course_id,(select auth.uid()))))
  or exists(select 1 from public.course_teachers ct where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,profiles.user_id))
);

drop policy if exists profiles_update_dekan on public.profiles;
create policy profiles_update_dekan on public.profiles for update to authenticated
using (private.dekan_can_access_user(user_id))
with check (private.dekan_can_access_user(user_id));

drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select to authenticated using (
  user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_user(user_id)
);
drop policy if exists roles_write_dekan_student on public.user_roles;
create policy roles_write_dekan_student on public.user_roles for all to authenticated
using (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role)
with check (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role);

-- Faculty/group hierarchy.
drop policy if exists faculties_select_admin_dekan on public.faculties;
create policy faculties_select_admin_dekan on public.faculties for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_faculty(id)
);

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(id)
  or tyutor_id=(select auth.uid())
  or public.is_group_member(id,(select auth.uid()))
  or public.is_group_teacher(id,(select auth.uid()))
);
drop policy if exists groups_write_admin on public.groups;
create policy groups_write_admin on public.groups for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(id)
  or tyutor_id=(select auth.uid())
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_faculty(faculty_id)
  or tyutor_id=(select auth.uid())
);

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated using (
  user_id=(select auth.uid())
  or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or exists(select 1 from public.groups g where g.id=group_members.group_id and g.tyutor_id=(select auth.uid()))
);
drop policy if exists group_members_write on public.group_members;
create policy group_members_write on public.group_members for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or exists(select 1 from public.groups g where g.id=group_members.group_id and g.tyutor_id=(select auth.uid()))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (private.dekan_can_access_group(group_id) and private.dekan_can_access_user(user_id))
  or exists(select 1 from public.groups g where g.id=group_members.group_id and g.tyutor_id=(select auth.uid()))
);

-- Course hierarchy.
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or muellim_id=(select auth.uid()) or tyutor_id=(select auth.uid())
  or public.is_course_teacher(id,(select auth.uid()))
  or public.is_course_tutor(id,(select auth.uid()))
  or public.is_course_student(id,(select auth.uid()))
);
drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or tyutor_id=(select auth.uid())
  or (public.has_role((select auth.uid()),'muellim'::public.app_role) and muellim_id=(select auth.uid()))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or tyutor_id=(select auth.uid())
  or (public.has_role((select auth.uid()),'muellim'::public.app_role) and muellim_id=(select auth.uid()))
);

drop policy if exists course_groups_select on public.course_groups;
create policy course_groups_select on public.course_groups for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or public.is_course_teacher(course_id,(select auth.uid()))
  or public.is_course_tutor(course_id,(select auth.uid()))
  or (
    public.is_group_member(group_id,(select auth.uid()))
    and tedris_ili=(select ss.cari_tedris_ili from public.system_settings ss where ss.singleton is true limit 1)
    and semestr=(select case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end from public.system_settings ss where ss.singleton is true limit 1)
  )
);
drop policy if exists course_groups_write on public.course_groups;
create policy course_groups_write on public.course_groups for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);

drop policy if exists course_teachers_select on public.course_teachers;
create policy course_teachers_select on public.course_teachers for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id)
  or muellim_id=(select auth.uid()) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_student(course_id,(select auth.uid()))
);
drop policy if exists course_teachers_write on public.course_teachers;
create policy course_teachers_write on public.course_teachers for all to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id));

drop policy if exists course_topics_select on public.course_topics;
create policy course_topics_select on public.course_topics for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id)
  or public.is_course_teacher(course_id,(select auth.uid())) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_student(course_id,(select auth.uid()))
);
drop policy if exists course_topics_write on public.course_topics;
create policy course_topics_write on public.course_topics for all to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id));

-- Legacy academic rows.
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated using (
  user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id,user_id)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
);
drop policy if exists exam_scores_select on public.exam_scores;
create policy exam_scores_select on public.exam_scores for select to authenticated using (
  user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id,user_id)
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
);
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select to authenticated using (
  user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role)
  or (course_id is not null and private.dekan_can_access_student_course(course_id,user_id))
  or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid())))
  or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid())))
);

-- Exam detail/schedule scope: no global tutor/teacher visibility.
drop policy if exists exam_detailed_results_select on public.exam_detailed_results;
create policy exam_detailed_results_select on public.exam_detailed_results for select to authenticated using (
  student_id=(select auth.uid())
  or public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_user(student_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(student_id,(select auth.uid())))
);

drop policy if exists exam_sync_attempts_select on public.exam_sync_attempts;
create policy exam_sync_attempts_select on public.exam_sync_attempts for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(
    select 1 from public.profiles p
    where public.normalize_group_name(p.istifadeci_adi)=public.normalize_group_name(exam_sync_attempts.student_username_normalized)
      and (private.dekan_can_access_user(p.user_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(p.user_id,(select auth.uid()))))
  )
);

drop policy if exists exam_schedule_select on public.exam_schedule;
create policy exam_schedule_select on public.exam_schedule for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or exists(select 1 from public.groups g where g.id=exam_schedule.group_id and g.tyutor_id=(select auth.uid()))
  or public.is_course_teacher(course_id,(select auth.uid()))
  or exists(select 1 from public.group_members gm where gm.group_id=exam_schedule.group_id and gm.user_id=(select auth.uid()))
);
drop policy if exists exam_schedule_insert on public.exam_schedule;
create policy exam_schedule_insert on public.exam_schedule for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and exists(select 1 from public.groups g where g.id=exam_schedule.group_id and g.tyutor_id=(select auth.uid())))
);
drop policy if exists exam_schedule_update on public.exam_schedule;
create policy exam_schedule_update on public.exam_schedule for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or yaradan_id=(select auth.uid()))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and exists(select 1 from public.groups g where g.id=exam_schedule.group_id and g.tyutor_id=(select auth.uid()))));
drop policy if exists exam_schedule_delete on public.exam_schedule;
create policy exam_schedule_delete on public.exam_schedule for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or yaradan_id=(select auth.uid()));

-- Dean document/transcript/log visibility is faculty scoped.
drop policy if exists activity_logs_select_admin_dekan on public.activity_logs;
create policy activity_logs_select_admin_dekan on public.activity_logs for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_user(user_id)
);
drop policy if exists office_files_select on public.office_files;
create policy office_files_select on public.office_files for select to authenticated using (
  sahib_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role)
  or (sahib_id is not null and private.dekan_can_access_user(sahib_id))
  or (sahib_id is not null and public.is_tutor_of_student(sahib_id,(select auth.uid())))
);
drop policy if exists transcripts_select_own_or_admin on public.transcripts;
create policy transcripts_select_own_or_admin on public.transcripts for select to authenticated using (
  profile_id in (select p.id from public.profiles p where p.user_id=(select auth.uid()))
  or public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id))
);
drop policy if exists transcripts_write_admin on public.transcripts;
create policy transcripts_write_admin on public.transcripts for all to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id))
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id))
);

drop policy if exists notifications_insert_admin_dekan on public.notifications;
create policy notifications_insert_admin_dekan on public.notifications for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_user(profile_id)
);

-- Chat helper now includes dean access only inside own faculty.
create or replace function public.chat_group_accessible(_chat_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_groups cg
    left join public.system_settings ss on ss.singleton is true
    where cg.id=_chat_group_id and (
      public.has_role((select auth.uid()),'admin'::public.app_role)
      or private.dekan_can_access_group(cg.group_id)
      or public.is_course_teacher(cg.course_id,(select auth.uid()))
      or public.is_course_tutor(cg.course_id,(select auth.uid()))
      or (
        exists(select 1 from public.chat_group_members cgm where cgm.chat_group_id=cg.id and cgm.user_id=(select auth.uid()))
        and (cg.course_id is null or (cg.tedris_ili=ss.cari_tedris_ili and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end and not cg.arxivlenib))
      )
    )
  );
$$;