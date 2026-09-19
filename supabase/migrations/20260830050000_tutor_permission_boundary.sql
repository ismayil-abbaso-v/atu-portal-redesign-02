-- Tutor permission boundary: assigned-group ownership is the only tutor authority.
-- Applied to production Supabase as migration: tutor_permission_boundary.

create or replace function private.is_course_tutor(_course_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select _user_id is not null
    and public.has_role(_user_id, 'tyutor'::public.app_role)
    and (
      exists (
        select 1 from public.courses c
        join public.groups g on g.id = c.group_id
        where c.id = _course_id and g.tyutor_id = _user_id
      )
      or exists (
        select 1 from public.course_groups cg
        join public.groups g on g.id = cg.group_id
        join public.system_settings ss on ss.singleton is true
        where cg.course_id = _course_id
          and g.tyutor_id = _user_id
          and cg.tedris_ili = ss.cari_tedris_ili
          and cg.semestr = case
            when lower(coalesce(ss.cari_semestr, '')) in ('payız','payiz','fall','autumn') then 1
            when lower(coalesce(ss.cari_semestr, '')) in ('yaz','spring') then 2
            else null
          end
      )
    );
$$;

create or replace function private.ejournal_is_course_group_tutor(p_course_id uuid, p_group_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = 'public', 'private' as $$
  select p_user_id is not null
    and public.has_role(p_user_id, 'tyutor'::public.app_role)
    and exists (
      select 1 from public.course_groups cg
      join public.groups g on g.id = cg.group_id
      join public.system_settings ss on ss.singleton is true
      where cg.course_id = p_course_id and cg.group_id = p_group_id and g.tyutor_id = p_user_id
        and cg.tedris_ili = ss.cari_tedris_ili
        and cg.semestr = case
          when lower(coalesce(ss.cari_semestr, '')) in ('payız','payiz','fall','autumn') then 1
          when lower(coalesce(ss.cari_semestr, '')) in ('yaz','spring') then 2
          else null
        end
    );
$$;

create or replace function private.ejournal_is_student_course_tutor(p_course_id uuid, p_student_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = 'public', 'private' as $$
  select p_user_id is not null
    and public.has_role(p_user_id, 'tyutor'::public.app_role)
    and exists (
      select 1 from public.group_members gm
      join public.groups g on g.id = gm.group_id
      join public.course_groups cg on cg.group_id = gm.group_id and cg.course_id = p_course_id
      join public.system_settings ss on ss.singleton is true
      where gm.user_id = p_student_id and g.tyutor_id = p_user_id
        and cg.tedris_ili = ss.cari_tedris_ili
        and cg.semestr = case
          when lower(coalesce(ss.cari_semestr, '')) in ('payız','payiz','fall','autumn') then 1
          when lower(coalesce(ss.cari_semestr, '')) in ('yaz','spring') then 2
          else null
        end
    );
$$;

-- Group structure is admin/dekan-write only. Tutor remains SELECT via the existing read policy.
drop policy if exists groups_update_managers on public.groups;
create policy groups_update_managers on public.groups for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(id))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_faculty(faculty_id));

drop policy if exists groups_delete_managers on public.groups;
create policy groups_delete_managers on public.groups for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(id));

drop policy if exists group_members_insert_managers on public.group_members;
create policy group_members_insert_managers on public.group_members for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (private.dekan_can_access_group(group_id) and private.dekan_can_access_user(user_id)));

drop policy if exists group_members_update_managers on public.group_members;
create policy group_members_update_managers on public.group_members for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (private.dekan_can_access_group(group_id) and private.dekan_can_access_user(user_id)));

drop policy if exists group_members_delete_managers on public.group_members;
create policy group_members_delete_managers on public.group_members for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id));

-- Legacy attendance/notes are never tutor-writeable.
drop policy if exists attendance_insert_staff on public.attendance;
create policy attendance_insert_staff on public.attendance for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_teacher(course_id, (select auth.uid())));
drop policy if exists attendance_update_staff on public.attendance;
create policy attendance_update_staff on public.attendance for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_teacher(course_id, (select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_teacher(course_id, (select auth.uid())));
drop policy if exists attendance_delete_staff on public.attendance;
create policy attendance_delete_staff on public.attendance for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.is_course_teacher(course_id, (select auth.uid())));

drop policy if exists notes_insert_staff on public.notes;
create policy notes_insert_staff on public.notes for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_teacher(course_id, (select auth.uid()))));
drop policy if exists notes_update_staff on public.notes;
create policy notes_update_staff on public.notes for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_teacher(course_id, (select auth.uid()))))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_teacher(course_id, (select auth.uid()))));
drop policy if exists notes_delete_staff on public.notes;
create policy notes_delete_staff on public.notes for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or (course_id is not null and public.is_course_teacher(course_id, (select auth.uid()))));

-- Course ownership no longer trusts legacy courses.tyutor_id.
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or muellim_id = (select auth.uid())
  or public.is_course_teacher(id, (select auth.uid()))
  or public.is_course_tutor(id, (select auth.uid()))
  or public.is_course_student(id, (select auth.uid()))
);
drop policy if exists courses_delete_managers on public.courses;
create policy courses_delete_managers on public.courses for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(id));

-- Tutor may manage only course configuration inside an assigned group.
drop policy if exists course_groups_insert_managers on public.course_groups;
create policy course_groups_insert_managers on public.course_groups for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role)
      and exists(select 1 from public.groups g where g.id=group_id and g.tyutor_id=(select auth.uid()))
      and public.is_course_tutor(course_id,(select auth.uid())))
);
drop policy if exists course_groups_update_managers on public.course_groups;
create policy course_groups_update_managers on public.course_groups for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and exists(select 1 from public.groups g where g.id=group_id and g.tyutor_id=(select auth.uid())) and public.is_course_tutor(course_id,(select auth.uid()))))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and exists(select 1 from public.groups g where g.id=group_id and g.tyutor_id=(select auth.uid())) and public.is_course_tutor(course_id,(select auth.uid()))));
drop policy if exists course_groups_delete_managers on public.course_groups;
create policy course_groups_delete_managers on public.course_groups for delete to authenticated using (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and exists(select 1 from public.groups g where g.id=group_id and g.tyutor_id=(select auth.uid())) and public.is_course_tutor(course_id,(select auth.uid())))
);

drop policy if exists course_teachers_insert_managers on public.course_teachers;
create policy course_teachers_insert_managers on public.course_teachers for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.is_course_tutor(course_id,(select auth.uid())));
drop policy if exists course_teachers_update_managers on public.course_teachers;
create policy course_teachers_update_managers on public.course_teachers for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.is_course_tutor(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.is_course_tutor(course_id,(select auth.uid())));
drop policy if exists course_teachers_delete_managers on public.course_teachers;
create policy course_teachers_delete_managers on public.course_teachers for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.is_course_tutor(course_id,(select auth.uid())));

-- Course topics and files are course configuration, not student journal data.
drop policy if exists course_topics_insert_staff on public.course_topics;
create policy course_topics_insert_staff on public.course_topics for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid()))
);
drop policy if exists course_topics_update_staff on public.course_topics;
create policy course_topics_update_staff on public.course_topics for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())));
drop policy if exists course_topics_delete_staff on public.course_topics;
create policy course_topics_delete_staff on public.course_topics for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())));

drop policy if exists course_topic_files_insert_staff on public.course_topic_files;
create policy course_topic_files_insert_staff on public.course_topic_files for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id)
  or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid()))
);
drop policy if exists course_topic_files_update_staff on public.course_topic_files;
create policy course_topic_files_update_staff on public.course_topic_files for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())));
drop policy if exists course_topic_files_delete_staff on public.course_topic_files;
create policy course_topic_files_delete_staff on public.course_topic_files for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_course(course_id) or public.ejournal_is_course_teacher(course_id) or public.is_course_tutor(course_id,(select auth.uid())));

-- Tutor is read-only in the professional journal.
drop policy if exists course_lesson_sessions_insert on public.course_lesson_sessions;
create policy course_lesson_sessions_insert on public.course_lesson_sessions for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id));
drop policy if exists course_lesson_sessions_update on public.course_lesson_sessions;
create policy course_lesson_sessions_update on public.course_lesson_sessions for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (teacher_id=(select auth.uid()) and public.ejournal_is_course_teacher(course_id) and public.can_grade_now(id,(select auth.uid()))))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (teacher_id=(select auth.uid()) and public.ejournal_is_course_teacher(course_id)));
drop policy if exists course_lesson_sessions_delete on public.course_lesson_sessions;
create policy course_lesson_sessions_delete on public.course_lesson_sessions for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id));

-- Tutor branches are deliberately absent from assessment writes.
drop policy if exists independent_work_assessments_insert on public.independent_work_assessments;
create policy independent_work_assessments_insert on public.independent_work_assessments for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
  or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid())))
  or private.teacher_has_course_permission(course_id,(select auth.uid()),'serbest_is')
);
drop policy if exists independent_work_assessments_update on public.independent_work_assessments;
create policy independent_work_assessments_update on public.independent_work_assessments for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or private.teacher_has_course_permission(course_id,(select auth.uid()),'serbest_is'))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or private.teacher_has_course_permission(course_id,(select auth.uid()),'serbest_is'));

drop policy if exists course_work_assessments_insert on public.course_work_assessments;
create policy course_work_assessments_insert on public.course_work_assessments for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
  or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid())))
  or private.teacher_has_course_permission(course_id,(select auth.uid()),null)
);
drop policy if exists course_work_assessments_update on public.course_work_assessments;
create policy course_work_assessments_update on public.course_work_assessments for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or private.teacher_has_course_permission(course_id,(select auth.uid()),null))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or private.teacher_has_course_permission(course_id,(select auth.uid()),null));

drop policy if exists colloquium_assessments_insert on public.colloquium_assessments;
create policy colloquium_assessments_insert on public.colloquium_assessments for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
  or private.teacher_has_course_permission(course_id,(select auth.uid()),'kollokvium')
);
drop policy if exists colloquium_assessments_update on public.colloquium_assessments;
create policy colloquium_assessments_update on public.colloquium_assessments for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or private.teacher_has_course_permission(course_id,(select auth.uid()),'kollokvium'))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or private.teacher_has_course_permission(course_id,(select auth.uid()),'kollokvium'));

-- Assigned tutor manages exam schedule for that exact group/course pair.
drop policy if exists exam_schedule_select on public.exam_schedule;
create policy exam_schedule_select on public.exam_schedule for select to authenticated using (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
  or public.is_course_teacher(course_id,(select auth.uid())) or public.is_group_member(group_id,(select auth.uid()))
);
drop policy if exists exam_schedule_insert on public.exam_schedule;
create policy exam_schedule_insert on public.exam_schedule for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);
drop policy if exists exam_schedule_update on public.exam_schedule;
create policy exam_schedule_update on public.exam_schedule for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));
drop policy if exists exam_schedule_delete on public.exam_schedule;
create policy exam_schedule_delete on public.exam_schedule for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()), 'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));

-- Student note-file writes are teacher/admin only; tutor may still use course-material policies through strict is_course_tutor().
drop policy if exists note_files_write on storage.objects;
create policy note_files_write on storage.objects for all to authenticated
using (bucket_id='note-files' and (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(select 1 from public.course_teachers ct where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,private.storage_first_uuid(storage.objects.name)))
))
with check (bucket_id='note-files' and (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or exists(select 1 from public.course_teachers ct where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,private.storage_first_uuid(storage.objects.name)))
));
