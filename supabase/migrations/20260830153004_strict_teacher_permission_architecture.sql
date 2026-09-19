-- Teacher role security boundary: course_teachers is the only teacher assignment source of truth.
-- Preserve legacy courses.muellim_id for compatibility/display, but never grant teacher access from it.

create or replace function private.is_course_teacher(_course_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select _user_id is not null
    and public.has_role(_user_id, 'muellim'::public.app_role)
    and exists (
      select 1
      from public.course_teachers ct
      where ct.course_id = _course_id
        and ct.muellim_id = _user_id
    );
$function$;

create or replace function private.ejournal_is_course_teacher(p_course_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_course_teacher(p_course_id, p_user_id);
$function$;

create or replace function private.teacher_can_access_group(p_group_id uuid, p_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_teacher_id is not null
    and public.has_role(p_teacher_id, 'muellim'::public.app_role)
    and exists (
      select 1
      from public.course_groups cg
      join public.course_teachers ct on ct.course_id = cg.course_id
      where cg.group_id = p_group_id
        and ct.muellim_id = p_teacher_id
    );
$function$;

create or replace function private.teacher_can_view_student_course_data(
  p_course_id uuid,
  p_student_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_course_teacher(p_course_id, p_teacher_id)
    and private.is_course_student(p_course_id, p_student_id)
    and exists (
      select 1
      from public.course_groups cg
      join public.group_members gm on gm.group_id = cg.group_id
      where cg.course_id = p_course_id
        and gm.user_id = p_student_id
    );
$function$;

create or replace function private.teacher_can_grade_assessment(
  p_course_id uuid,
  p_student_id uuid,
  p_teacher_id uuid,
  p_permission text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.teacher_can_view_student_course_data(p_course_id, p_student_id, p_teacher_id)
    and private.teacher_has_course_permission(p_course_id, p_teacher_id, p_permission);
$function$;

revoke all on function private.is_course_teacher(uuid, uuid) from public, anon;
revoke all on function private.ejournal_is_course_teacher(uuid, uuid) from public, anon;
revoke all on function private.teacher_can_access_group(uuid, uuid) from public, anon;
revoke all on function private.teacher_can_view_student_course_data(uuid, uuid, uuid) from public, anon;
revoke all on function private.teacher_can_grade_assessment(uuid, uuid, uuid, text) from public, anon;

grant execute on function private.is_course_teacher(uuid, uuid) to authenticated;
grant execute on function private.ejournal_is_course_teacher(uuid, uuid) to authenticated;
grant execute on function private.teacher_can_access_group(uuid, uuid) to authenticated;
grant execute on function private.teacher_can_view_student_course_data(uuid, uuid, uuid) to authenticated;
grant execute on function private.teacher_can_grade_assessment(uuid, uuid, uuid, text) to authenticated;

-- Defense in depth for SECURITY DEFINER / RPC paths: an assessment target must belong to
-- the teacher's assigned course and one of that course's course_groups.
create or replace function private.enforce_assessment_write_scope()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $function$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid := new.course_id;
  v_student_id uuid := new.student_id;
  v_required_type text := null;
begin
  if v_uid is null then
    return new;
  end if;

  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'dekan'::public.app_role) then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    new.course_id is distinct from old.course_id
    or new.student_id is distinct from old.student_id
    or new.sira is distinct from old.sira
  ) then
    raise exception 'Qiymətləndirmə sətrinin fənn/tələbə/sıra sahələri dəyişdirilə bilməz.';
  end if;

  if tg_table_name in ('independent_work_assessments', 'course_work_assessments')
     and v_uid = v_student_id
     and public.has_role(v_uid, 'telebe'::public.app_role)
     and public.is_course_student(v_course_id, v_uid) then
    return new;
  end if;

  if public.has_role(v_uid, 'muellim'::public.app_role) then
    v_required_type := case tg_table_name
      when 'independent_work_assessments' then 'serbest_is'
      when 'colloquium_assessments' then 'kollokvium'
      else null
    end;

    if not private.teacher_can_grade_assessment(
      v_course_id,
      v_student_id,
      v_uid,
      v_required_type
    ) then
      raise exception 'Tələbə bu müəllimin fənn/qrup qiymətləndirmə kontekstinə aid deyil və ya tələb olunan icazə yoxdur.';
    end if;

    if private.teacher_can_assess_course_at(v_course_id, v_uid, now(), v_required_type) then
      return new;
    end if;

    raise exception 'Qiymətləndirmə yalnız uyğun dərsin aktiv qiymətləndirmə pəncərəsində aparıla bilər.';
  end if;

  raise exception 'Bu qiymətləndirmə sətrini dəyişmək icazəniz yoxdur.';
end;
$function$;

-- courses.muellim_id is deliberately absent from the teacher SELECT branch.
drop policy if exists courses_select on public.courses;
create policy courses_select
on public.courses
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_course(id)
  or public.is_course_teacher(id, (select auth.uid()))
  or public.is_course_tutor(id, (select auth.uid()))
  or public.is_course_student(id, (select auth.uid()))
);

-- Journal records: retain student/admin/dekan/tutor behavior; teacher visibility and writes
-- additionally require the target student to belong to the teacher's course-group context.
drop policy if exists lesson_student_records_select on public.lesson_student_records;
create policy lesson_student_records_select
on public.lesson_student_records
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  or public.ejournal_is_student_course_tutor(course_id, student_id)
);

drop policy if exists lesson_student_records_insert on public.lesson_student_records;
create policy lesson_student_records_insert
on public.lesson_student_records
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    public.can_grade_now(lesson_session_id, (select auth.uid()))
    and private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  )
);

drop policy if exists lesson_student_records_update on public.lesson_student_records;
create policy lesson_student_records_update
on public.lesson_student_records
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    public.can_grade_now(lesson_session_id, (select auth.uid()))
    and private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  )
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    public.can_grade_now(lesson_session_id, (select auth.uid()))
    and private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  )
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
);

-- Independent work.
drop policy if exists independent_work_assessments_select on public.independent_work_assessments;
create policy independent_work_assessments_select
on public.independent_work_assessments
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  or public.ejournal_is_student_course_tutor(course_id, student_id)
);

drop policy if exists independent_work_assessments_insert on public.independent_work_assessments;
create policy independent_work_assessments_insert
on public.independent_work_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'serbest_is')
);

drop policy if exists independent_work_assessments_update on public.independent_work_assessments;
create policy independent_work_assessments_update
on public.independent_work_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'serbest_is')
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'serbest_is')
);

-- Colloquium.
drop policy if exists colloquium_assessments_select on public.colloquium_assessments;
create policy colloquium_assessments_select
on public.colloquium_assessments
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  or public.ejournal_is_student_course_tutor(course_id, student_id)
);

drop policy if exists colloquium_assessments_insert on public.colloquium_assessments;
create policy colloquium_assessments_insert
on public.colloquium_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'kollokvium')
);

drop policy if exists colloquium_assessments_update on public.colloquium_assessments;
create policy colloquium_assessments_update
on public.colloquium_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'kollokvium')
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), 'kollokvium')
);

-- Course work has no dedicated icazeler key in the current business model; any strict
-- course_teachers assignment may assess it, while validate_course_work_enabled still applies.
drop policy if exists course_work_assessments_select on public.course_work_assessments;
create policy course_work_assessments_select
on public.course_work_assessments
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or private.teacher_can_view_student_course_data(course_id, student_id, (select auth.uid()))
  or public.ejournal_is_student_course_tutor(course_id, student_id)
);

drop policy if exists course_work_assessments_insert on public.course_work_assessments;
create policy course_work_assessments_insert
on public.course_work_assessments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), null)
);

drop policy if exists course_work_assessments_update on public.course_work_assessments;
create policy course_work_assessments_update
on public.course_work_assessments
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), null)
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, student_id)
  or (
    student_id = (select auth.uid())
    and public.is_course_student(course_id, (select auth.uid()))
  )
  or private.teacher_can_grade_assessment(course_id, student_id, (select auth.uid()), null)
);
