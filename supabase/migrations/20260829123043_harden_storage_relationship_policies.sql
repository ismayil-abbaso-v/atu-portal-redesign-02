create or replace function private.storage_first_uuid(_name text)
returns uuid
language plpgsql
immutable
set search_path=pg_catalog,storage,pg_temp
as $$
begin
  return (storage.foldername(_name))[1]::uuid;
exception when others then return null;
end;
$$;

create or replace function private.staff_can_access_student(_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select _student_id is not null and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_user(_student_id)
    or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(_student_id,(select auth.uid())))
    or exists(
      select 1 from public.course_teachers ct
      where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,_student_id)
    )
  );
$$;

create or replace function private.dekan_can_access_transcript_folder(_folder text)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select public.has_role((select auth.uid()),'dekan'::public.app_role) and exists(
    select 1 from public.profiles p
    where (p.user_id::text=_folder or p.id::text=_folder)
      and private.dekan_can_access_user(p.user_id)
  );
$$;
revoke all on function private.storage_first_uuid(text) from public,anon;
revoke all on function private.staff_can_access_student(uuid) from public,anon;
revoke all on function private.dekan_can_access_transcript_folder(text) from public,anon;
grant execute on function private.storage_first_uuid(text),private.staff_can_access_student(uuid),private.dekan_can_access_transcript_folder(text) to authenticated;

-- Remove accidental permissive write access: these policies allowed every authenticated user to mutate library covers.
drop policy if exists library_covers_authenticated_insert on storage.objects;
drop policy if exists library_covers_authenticated_update on storage.objects;
drop policy if exists library_covers_authenticated_delete on storage.objects;

-- Announcement media: dean may upload, but can mutate/remove only their own uploaded objects; admin manages all.
drop policy if exists announcement_media_insert_managers on storage.objects;
drop policy if exists announcement_media_update_managers on storage.objects;
drop policy if exists announcement_media_delete_managers on storage.objects;
create policy announcement_media_insert_managers on storage.objects for insert to authenticated with check (
  bucket_id='announcement-media' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or public.has_role((select auth.uid()),'dekan'::public.app_role)
  )
);
create policy announcement_media_update_managers on storage.objects for update to authenticated
using (bucket_id='announcement-media' and (public.has_role((select auth.uid()),'admin'::public.app_role) or (public.has_role((select auth.uid()),'dekan'::public.app_role) and owner_id=(select auth.uid()::text))))
with check (bucket_id='announcement-media' and (public.has_role((select auth.uid()),'admin'::public.app_role) or (public.has_role((select auth.uid()),'dekan'::public.app_role) and owner_id=(select auth.uid()::text))));
create policy announcement_media_delete_managers on storage.objects for delete to authenticated
using (bucket_id='announcement-media' and (public.has_role((select auth.uid()),'admin'::public.app_role) or (public.has_role((select auth.uid()),'dekan'::public.app_role) and owner_id=(select auth.uid()::text))));

-- Course materials use the course id as the first path segment.
drop policy if exists course_materials_select on storage.objects;
create policy course_materials_select on storage.objects for select to authenticated using (
  bucket_id='course-materials' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_course(private.storage_first_uuid(name))
    or public.ejournal_is_course_teacher(private.storage_first_uuid(name))
    or public.is_course_tutor(private.storage_first_uuid(name),(select auth.uid()))
    or public.is_course_student(private.storage_first_uuid(name),(select auth.uid()))
  )
);

drop policy if exists course_materials_write on storage.objects;
create policy course_materials_write on storage.objects for all to authenticated
using (
  bucket_id='course-materials' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_course(private.storage_first_uuid(name))
    or (
      coalesce((storage.foldername(name))[2],'')<>'student-submissions'
      and (public.ejournal_is_course_teacher(private.storage_first_uuid(name)) or public.is_course_tutor(private.storage_first_uuid(name),(select auth.uid())))
    )
  )
)
with check (
  bucket_id='course-materials' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_course(private.storage_first_uuid(name))
    or (
      coalesce((storage.foldername(name))[2],'')<>'student-submissions'
      and (public.ejournal_is_course_teacher(private.storage_first_uuid(name)) or public.is_course_tutor(private.storage_first_uuid(name),(select auth.uid())))
    )
  )
);

drop policy if exists course_materials_student_submission_insert on storage.objects;
create policy course_materials_student_submission_insert on storage.objects for insert to authenticated with check (
  bucket_id='course-materials'
  and (storage.foldername(name))[2]='student-submissions'
  and (storage.foldername(name))[3]=(select auth.uid())::text
  and public.is_course_student(private.storage_first_uuid(name),(select auth.uid()))
);

-- Notes: path first segment is the student/owner UUID. Staff access follows actual academic relation, not role globally.
drop policy if exists note_files_select on storage.objects;
create policy note_files_select on storage.objects for select to authenticated using (
  bucket_id='note-files' and (
    private.storage_first_uuid(name)=(select auth.uid())
    or private.staff_can_access_student(private.storage_first_uuid(name))
  )
);
drop policy if exists note_files_write on storage.objects;
create policy note_files_write on storage.objects for all to authenticated
using (
  bucket_id='note-files' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(private.storage_first_uuid(name),(select auth.uid())))
    or exists(select 1 from public.course_teachers ct where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,private.storage_first_uuid(name)))
  )
)
with check (
  bucket_id='note-files' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(private.storage_first_uuid(name),(select auth.uid())))
    or exists(select 1 from public.course_teachers ct where ct.muellim_id=(select auth.uid()) and public.is_course_student(ct.course_id,private.storage_first_uuid(name)))
  )
);

-- Office documents: dean only sees students in own faculty; tutor only their students.
drop policy if exists office_files_select on storage.objects;
create policy office_files_select on storage.objects for select to authenticated using (
  bucket_id='office-files' and (
    private.storage_first_uuid(name)=(select auth.uid())
    or public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_user(private.storage_first_uuid(name))
    or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.is_tutor_of_student(private.storage_first_uuid(name),(select auth.uid())))
  )
);

-- Transcript storage supports both historical profile-id folders and user-id folders.
drop policy if exists transcripts_select on storage.objects;
create policy transcripts_select on storage.objects for select to authenticated using (
  bucket_id='transcripts' and (
    public.has_role((select auth.uid()),'admin'::public.app_role)
    or private.dekan_can_access_transcript_folder((storage.foldername(name))[1])
    or (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.id::text=(storage.foldername(name))[1])
  )
);
drop policy if exists transcripts_write on storage.objects;
create policy transcripts_write on storage.objects for all to authenticated
using (bucket_id='transcripts' and (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_transcript_folder((storage.foldername(name))[1])))
with check (bucket_id='transcripts' and (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_transcript_folder((storage.foldername(name))[1])));