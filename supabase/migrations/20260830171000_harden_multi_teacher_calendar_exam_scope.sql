-- Prompt 6: multi-teacher schedule/session visibility and teacher exam grading scope.
-- course_teachers remains the teacher assignment source of truth.

create or replace function private.teacher_can_grade_exam_score(
  p_course_id uuid,
  p_student_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_course_id is not null
     and p_student_id is not null
     and p_teacher_id is not null
     and public.has_role(p_teacher_id, 'muellim'::public.app_role)
     and private.is_course_teacher(p_course_id, p_teacher_id)
     and private.is_course_student(p_course_id, p_student_id);
$$;

revoke all on function private.teacher_can_grade_exam_score(uuid, uuid, uuid) from public;

-- Teachers only see their own concrete session/template rows. Students, tutors,
-- admins and deans keep their existing group/course visibility.
drop policy if exists course_lesson_sessions_select on public.course_lesson_sessions;
create policy course_lesson_sessions_select
on public.course_lesson_sessions
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    teacher_id = (select auth.uid())
    and public.ejournal_is_course_teacher(course_id)
  )
  or public.ejournal_is_course_group_tutor(course_id, group_id)
  or (
    public.is_course_student(course_id, (select auth.uid()))
    and public.is_group_member(group_id, (select auth.uid()))
  )
);

drop policy if exists course_schedule_templates_select on public.course_schedule_templates;
create policy course_schedule_templates_select
on public.course_schedule_templates
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_group(group_id)
  or (
    teacher_id = (select auth.uid())
    and public.ejournal_is_course_teacher(course_id)
  )
  or public.ejournal_is_course_group_tutor(course_id, group_id)
  or (
    public.is_course_student(course_id, (select auth.uid()))
    and public.is_group_member(group_id, (select auth.uid()))
  )
);

-- One score row per student/course/academic period. Existing NULL legacy periods
-- remain compatible because PostgreSQL UNIQUE treats NULL values as distinct.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exam_scores'::regclass
      and conname = 'exam_scores_course_student_period_unique'
  ) then
    alter table public.exam_scores
      add constraint exam_scores_course_student_period_unique
      unique (course_id, user_id, tedris_ili, semestr);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exam_scores'::regclass
      and conname = 'exam_scores_semester_score_range'
  ) then
    alter table public.exam_scores
      add constraint exam_scores_semester_score_range
      check (semestr_qiymeti is null or (semestr_qiymeti >= 0 and semestr_qiymeti <= 50));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exam_scores'::regclass
      and conname = 'exam_scores_exam_score_range'
  ) then
    alter table public.exam_scores
      add constraint exam_scores_exam_score_range
      check (imtahan_bali is null or (imtahan_bali >= 0 and imtahan_bali <= 50));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exam_scores'::regclass
      and conname = 'exam_scores_final_score_range'
  ) then
    alter table public.exam_scores
      add constraint exam_scores_final_score_range
      check (yekun_qiymet is null or (yekun_qiymet >= 0 and yekun_qiymet <= 100));
  end if;
end $$;

create or replace function private.enforce_teacher_exam_score_scope()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_semester_score numeric;
begin
  if v_uid is null then
    return new;
  end if;

  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'dekan'::public.app_role) then
    return new;
  end if;

  if not public.has_role(v_uid, 'muellim'::public.app_role) then
    raise exception 'İmtahan balını dəyişmək üçün müəllim səlahiyyəti tələb olunur.';
  end if;

  if new.course_id is null
     or not private.teacher_can_grade_exam_score(new.course_id, new.user_id, v_uid) then
    raise exception 'Tələbə bu müəllimin cari fənn qiymətləndirmə kontekstinə aid deyil.';
  end if;

  if tg_op = 'UPDATE' and (
    new.course_id is distinct from old.course_id
    or new.user_id is distinct from old.user_id
    or new.tedris_ili is distinct from old.tedris_ili
    or new.semestr is distinct from old.semestr
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Müəllim imtahan balı sətrinin fənn, tələbə və akademik period identifikatorlarını dəyişə bilməz.';
  end if;

  v_semester_score := private.calculate_semester_score(new.course_id, new.user_id);
  new.semestr_qiymeti := coalesce(
    v_semester_score,
    case when tg_op = 'UPDATE' then old.semestr_qiymeti else null end,
    0
  );
  new.yekun_qiymet := case
    when new.imtahan_bali is null then null
    else least(100::numeric, new.semestr_qiymeti + new.imtahan_bali)
  end;

  return new;
end;
$$;

revoke all on function private.enforce_teacher_exam_score_scope() from public;

drop trigger if exists zz_enforce_teacher_exam_score_scope on public.exam_scores;
create trigger zz_enforce_teacher_exam_score_scope
before insert or update on public.exam_scores
for each row execute function private.enforce_teacher_exam_score_scope();

-- Teacher exam grading is a real business rule in the existing system, but writes
-- are limited to assigned courses and current course students. Deletion is not a
-- teacher grading operation and remains admin-only.
drop policy if exists exam_scores_insert_staff on public.exam_scores;
create policy exam_scores_insert_staff
on public.exam_scores
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
);

drop policy if exists exam_scores_update_staff on public.exam_scores;
create policy exam_scores_update_staff
on public.exam_scores
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
);

drop policy if exists exam_scores_delete_staff on public.exam_scores;
create policy exam_scores_delete_staff
on public.exam_scores
for delete
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- The public semester-score RPC must not let a teacher probe unrelated student IDs.
create or replace function public.calculate_semester_score(p_course_id uuid, p_student_id uuid)
returns numeric
language plpgsql
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_score numeric;
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.';
  end if;

  if v_uid = p_student_id then
    if not public.is_course_student(p_course_id, v_uid) then
      raise exception 'Bu fənn üzrə məlumatı hesablamaq icazəniz yoxdur.';
    end if;
  elsif public.has_role(v_uid, 'admin'::public.app_role)
        or private.dekan_can_access_student_course(p_course_id, p_student_id)
        or (
          public.has_role(v_uid, 'muellim'::public.app_role)
          and private.teacher_can_view_student_course_data(p_course_id, p_student_id, v_uid)
        )
        or (
          public.has_role(v_uid, 'tyutor'::public.app_role)
          and public.is_course_tutor(p_course_id, v_uid)
          and public.is_course_student(p_course_id, p_student_id)
        ) then
    null;
  else
    raise exception 'Bu semestr balını hesablamaq üçün icazəniz yoxdur.';
  end if;

  v_score := private.calculate_semester_score(p_course_id, p_student_id);
  if v_score is null then
    return null;
  end if;

  if private.has_ejournal_data(p_course_id, p_student_id) then
    perform private.sync_exam_semester_score(p_course_id, p_student_id);
  end if;
  return v_score;
end;
$$;
