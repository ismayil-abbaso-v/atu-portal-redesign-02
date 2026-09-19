-- Final Prompt 8 security audit hardening.
-- 1) Exam grading is never a tutor capability.
-- 2) course_teachers / legacy primary teacher can only point at real muellim-role users.
-- 3) Students may submit their own lab file, but cannot mutate attendance/grade fields.

create or replace function private.guard_course_teacher_role()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
begin
  if new.muellim_id is not null
     and not public.has_role(new.muellim_id, 'muellim'::public.app_role) then
    raise exception using errcode = '23514', message = 'COURSE_TEACHER_ROLE_REQUIRED';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_course_teacher_role() from public, anon, authenticated;

drop trigger if exists guard_course_teacher_role on public.course_teachers;
create trigger guard_course_teacher_role
before insert or update of muellim_id on public.course_teachers
for each row execute function private.guard_course_teacher_role();

drop trigger if exists guard_course_primary_teacher_role on public.courses;
create trigger guard_course_primary_teacher_role
before insert or update of muellim_id on public.courses
for each row execute function private.guard_course_teacher_role();

-- Tutor must never write exam grades, even if the account somehow appears in
-- a legacy teacher relation. A real muellim role plus course assignment is required.
drop policy if exists exam_scores_insert_staff on public.exam_scores;
create policy exam_scores_insert_staff on public.exam_scores
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'muellim'::public.app_role)
    and public.is_course_teacher(course_id, (select auth.uid()))
  )
);

drop policy if exists exam_scores_update_staff on public.exam_scores;
create policy exam_scores_update_staff on public.exam_scores
for update to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'muellim'::public.app_role)
    and public.is_course_teacher(course_id, (select auth.uid()))
  )
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'muellim'::public.app_role)
    and public.is_course_teacher(course_id, (select auth.uid()))
  )
);

drop policy if exists exam_scores_delete_staff on public.exam_scores;
create policy exam_scores_delete_staff on public.exam_scores
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'muellim'::public.app_role)
    and public.is_course_teacher(course_id, (select auth.uid()))
  )
);

-- Students do not create daily journal rows. Those rows are seeded/managed by
-- staff. This removes the broad self-insert path that could forge grade data.
drop policy if exists lesson_student_records_insert on public.lesson_student_records;
create policy lesson_student_records_insert on public.lesson_student_records
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or public.can_grade_now(lesson_session_id, (select auth.uid()))
);

-- Keep the existing student lab-submission UX, but restrict a self-update to
-- a one-way file submission. Attendance, grade and row identity are immutable.
create or replace function private.guard_student_lesson_record_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_staff_allowed boolean := false;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  v_staff_allowed :=
    public.has_role(v_uid, 'admin'::public.app_role)
    or private.dekan_can_access_student_course(old.course_id, old.student_id)
    or public.can_grade_now(old.lesson_session_id, v_uid);

  if v_staff_allowed then
    return new;
  end if;

  if old.student_id <> v_uid then
    raise exception using errcode = '42501', message = 'LESSON_RECORD_UPDATE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
     or new.student_id is distinct from old.student_id
     or new.course_id is distinct from old.course_id
     or new.lesson_session_id is distinct from old.lesson_session_id
     or new.attendance_status is distinct from old.attendance_status
     or new.grade is distinct from old.grade
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'STUDENT_ACADEMIC_FIELDS_READ_ONLY';
  end if;

  if coalesce(old.lab_submitted, false)
     or nullif(btrim(coalesce(old.file_url, '')), '') is not null then
    raise exception using errcode = '42501', message = 'LAB_SUBMISSION_ALREADY_EXISTS';
  end if;

  if new.lab_submitted is not true
     or nullif(btrim(coalesce(new.file_url, '')), '') is null then
    raise exception using errcode = '23514', message = 'LAB_SUBMISSION_FILE_REQUIRED';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_student_lesson_record_update() from public, anon, authenticated;

drop trigger if exists guard_student_lesson_record_update on public.lesson_student_records;
create trigger guard_student_lesson_record_update
before update on public.lesson_student_records
for each row execute function private.guard_student_lesson_record_update();
