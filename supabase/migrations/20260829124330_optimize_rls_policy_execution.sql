-- RLS planner cleanup: avoid per-row auth.uid() calls, split ALL policies so SELECT
-- does not evaluate duplicate permissive policies, and merge overlapping role policies.

-- profiles: merge same-group visibility and admin/dean/self updates.
drop policy if exists profiles_select_same_group on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_user(user_id)
  or public.is_same_group_member(user_id, (select auth.uid()))
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.is_tutor_of_student(user_id, (select auth.uid())))
  or exists (
    select 1 from public.course_teachers ct
    where ct.muellim_id = profiles.user_id
      and (
        public.is_course_teacher(ct.course_id, (select auth.uid()))
        or public.is_course_tutor(ct.course_id, (select auth.uid()))
        or public.is_course_student(ct.course_id, (select auth.uid()))
      )
  )
  or exists (
    select 1 from public.course_teachers ct
    where ct.muellim_id = (select auth.uid())
      and public.is_course_student(ct.course_id, profiles.user_id)
  )
);

drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_dekan on public.profiles;
create policy profiles_update_authorized on public.profiles
for update to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_user(user_id)
)
with check (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_user(user_id)
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- group_members: merge same-group SELECT and split management writes.
drop policy if exists group_members_select_same_group on public.group_members;
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or public.is_same_group_member(user_id, (select auth.uid()))
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.tyutor_id = (select auth.uid()))
);

drop policy if exists group_members_write on public.group_members;
create policy group_members_insert_managers on public.group_members
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (private.dekan_can_access_group(group_id) and private.dekan_can_access_user(user_id))
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.tyutor_id = (select auth.uid()))
);
create policy group_members_update_managers on public.group_members
for update to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.tyutor_id = (select auth.uid()))
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (private.dekan_can_access_group(group_id) and private.dekan_can_access_user(user_id))
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.tyutor_id = (select auth.uid()))
);
create policy group_members_delete_managers on public.group_members
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.tyutor_id = (select auth.uid()))
);

-- Generic helper to keep write predicates identical across academic tables is intentionally
-- expressed as separate policies: FOR ALL would also add a second SELECT policy.
drop policy if exists attendance_write on public.attendance;
create policy attendance_insert_staff on public.attendance for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));
create policy attendance_update_staff on public.attendance for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));
create policy attendance_delete_staff on public.attendance for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));

drop policy if exists exam_scores_write on public.exam_scores;
create policy exam_scores_insert_staff on public.exam_scores for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));
create policy exam_scores_update_staff on public.exam_scores for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));
create policy exam_scores_delete_staff on public.exam_scores for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_tutor(course_id,(select auth.uid())) or public.is_course_teacher(course_id,(select auth.uid())));

drop policy if exists notes_write on public.notes;
create policy notes_insert_staff on public.notes for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid()))) or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid()))));
create policy notes_update_staff on public.notes for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid()))) or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid()))))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid()))) or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid()))));
create policy notes_delete_staff on public.notes for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_tutor(course_id,(select auth.uid()))) or (course_id is not null and public.is_course_teacher(course_id,(select auth.uid()))));

-- course_groups
drop policy if exists course_groups_write on public.course_groups;
create policy course_groups_insert_managers on public.course_groups for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));
create policy course_groups_update_managers on public.course_groups for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));
create policy course_groups_delete_managers on public.course_groups for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));

-- course_student_status
drop policy if exists course_student_status_write on public.course_student_status;
create policy course_student_status_insert_staff on public.course_student_status for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())));
create policy course_student_status_update_staff on public.course_student_status for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())));
create policy course_student_status_delete_staff on public.course_student_status for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())));

-- course_teachers
drop policy if exists course_teachers_write on public.course_teachers;
create policy course_teachers_insert_managers on public.course_teachers for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id));
create policy course_teachers_update_managers on public.course_teachers for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id));
create policy course_teachers_delete_managers on public.course_teachers for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id));

-- course_topics
drop policy if exists course_topics_write on public.course_topics;
create policy course_topics_insert_staff on public.course_topics for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id));
create policy course_topics_update_staff on public.course_topics for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id));
create policy course_topics_delete_staff on public.course_topics for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id));

-- courses
drop policy if exists courses_write on public.courses;
create policy courses_insert_managers on public.courses for insert to authenticated
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or (
    public.has_role((select auth.uid()),'tyutor'::public.app_role)
    and group_id is not null
    and exists (select 1 from public.groups g where g.id=courses.group_id and g.tyutor_id=(select auth.uid()))
  )
);
create policy courses_update_managers on public.courses for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(id) or public.is_course_tutor(id,(select auth.uid())))
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (group_id is not null and private.dekan_can_access_group(group_id))
  or public.is_course_tutor(id,(select auth.uid()))
);
create policy courses_delete_managers on public.courses for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_course(id) or public.is_course_tutor(id,(select auth.uid())));

-- groups
drop policy if exists groups_write_admin on public.groups;
create policy groups_insert_managers on public.groups for insert to authenticated
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or private.dekan_can_access_faculty(faculty_id)
);
create policy groups_update_managers on public.groups for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(id) or tyutor_id=(select auth.uid()))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_faculty(faculty_id) or tyutor_id=(select auth.uid()));
create policy groups_delete_managers on public.groups for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(id) or tyutor_id=(select auth.uid()));

-- faculties
drop policy if exists faculties_write_admin on public.faculties;
create policy faculties_insert_admin on public.faculties for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role));
create policy faculties_update_admin on public.faculties for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role))
with check (public.has_role((select auth.uid()),'admin'::public.app_role));
create policy faculties_delete_admin on public.faculties for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role));

-- transcripts
drop policy if exists transcripts_write_admin on public.transcripts;
create policy transcripts_insert_managers on public.transcripts for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id)));
create policy transcripts_update_managers on public.transcripts for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id)))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id)));
create policy transcripts_delete_managers on public.transcripts for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or exists(select 1 from public.profiles p where p.id=transcripts.profile_id and private.dekan_can_access_user(p.user_id)));

-- user_roles: one policy per write action, combining admin and dean-student cases.
drop policy if exists roles_write_dekan_student on public.user_roles;
drop policy if exists roles_write_admin_insert on public.user_roles;
drop policy if exists roles_write_admin_update on public.user_roles;
drop policy if exists roles_write_admin_delete on public.user_roles;
create policy roles_write_insert on public.user_roles for insert to authenticated
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role)
);
create policy roles_write_update on public.user_roles for update to authenticated
using (
  (public.has_role((select auth.uid()),'admin'::public.app_role) and not (user_id=(select auth.uid()) and role='admin'::public.app_role))
  or (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role)
)
with check (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role)
);
create policy roles_write_delete on public.user_roles for delete to authenticated
using (
  (public.has_role((select auth.uid()),'admin'::public.app_role) and not (user_id=(select auth.uid()) and role='admin'::public.app_role))
  or (private.dekan_can_access_user(user_id) and role='telebe'::public.app_role)
);

-- Remaining planner warnings: replace direct auth.uid() expressions.
drop policy if exists activity_logs_insert_self on public.activity_logs;
create policy activity_logs_insert_self on public.activity_logs for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists library_books_insert on public.library_books;
create policy library_books_insert on public.library_books for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or public.has_role((select auth.uid()),'dekan'::public.app_role));
drop policy if exists library_books_update on public.library_books;
create policy library_books_update on public.library_books for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or public.has_role((select auth.uid()),'dekan'::public.app_role))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or public.has_role((select auth.uid()),'dekan'::public.app_role));
drop policy if exists library_books_delete on public.library_books;
create policy library_books_delete on public.library_books for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or public.has_role((select auth.uid()),'dekan'::public.app_role));

drop policy if exists notification_settings_own on public.notification_settings;
create policy notification_settings_own on public.notification_settings for all to authenticated
using (profile_id=(select auth.uid()))
with check (profile_id=(select auth.uid()));

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
using (profile_id=(select auth.uid()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using (profile_id=(select auth.uid())) with check (profile_id=(select auth.uid()));

drop policy if exists office_files_insert on public.office_files;
create policy office_files_insert on public.office_files for insert to authenticated
with check (sahib_id=(select auth.uid()));
drop policy if exists office_files_update on public.office_files;
create policy office_files_update on public.office_files for update to authenticated
using (sahib_id=(select auth.uid())) with check (sahib_id=(select auth.uid()));
drop policy if exists office_files_delete on public.office_files;
create policy office_files_delete on public.office_files for delete to authenticated
using (sahib_id=(select auth.uid()));

drop policy if exists sessions_log_insert_own on public.sessions_log;
create policy sessions_log_insert_own on public.sessions_log for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists sessions_log_select_own on public.sessions_log;
create policy sessions_log_select_own on public.sessions_log for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists sessions_log_update_own on public.sessions_log;
create policy sessions_log_update_own on public.sessions_log for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists sessions_log_delete_own on public.sessions_log;
create policy sessions_log_delete_own on public.sessions_log for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists system_settings_insert_admin on public.system_settings;
create policy system_settings_insert_admin on public.system_settings for insert to authenticated with check (public.has_role((select auth.uid()),'admin'::public.app_role));
drop policy if exists system_settings_update_admin on public.system_settings;
create policy system_settings_update_admin on public.system_settings for update to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role)) with check (public.has_role((select auth.uid()),'admin'::public.app_role));
drop policy if exists system_settings_delete_admin on public.system_settings;
create policy system_settings_delete_admin on public.system_settings for delete to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role));

-- Remove only the duplicate copies introduced by later hardening migrations; keep the older canonical indexes.
drop index if exists public.idx_groups_faculty_id;
drop index if exists public.idx_office_files_sahib_id;