create extension if not exists pg_cron with schema extensions;

alter table public.course_lesson_sessions
  add column if not exists draft_saved_at timestamptz,
  add column if not exists auto_confirmed boolean not null default false,
  add column if not exists auto_confirmed_at timestamptz,
  add column if not exists auto_finalize_enabled boolean not null default false;

alter table public.course_lesson_sessions
  alter column auto_finalize_enabled set default false;

update public.course_lesson_sessions
set auto_finalize_enabled = (draft_saved_at is not null)
where is_confirmed = false;

alter table public.course_lesson_sessions
  drop constraint if exists course_lesson_sessions_auto_confirmation_check;
alter table public.course_lesson_sessions
  add constraint course_lesson_sessions_auto_confirmation_check
  check (
    (not auto_confirmed and auto_confirmed_at is null)
    or (auto_confirmed and is_confirmed and auto_confirmed_at is not null)
  );

-- Teachers can edit only inside the actual lesson interval. Past and future
-- sessions stay strictly read-only from the database layer as well as the UI.
create or replace function private.grade_time_window_contains(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_now timestamptz
)
returns boolean
language sql
immutable
set search_path to 'public','private'
as $$
  select p_starts_at is not null
    and p_ends_at is not null
    and p_now is not null
    and p_now >= p_starts_at
    and p_now < p_ends_at;
$$;

-- Draft save is intentionally different from confirmation. Attendance is
-- mandatory for every student, while a daily grade / lab result is optional.
create or replace function public.save_lesson_grading_draft(
  p_lesson_id uuid,
  p_topic text,
  p_records jsonb
)
returns boolean
language plpgsql
security invoker
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.course_lesson_sessions%rowtype;
  v_grading_type public.course_grading_type;
  v_expected_count integer;
  v_payload_count integer;
  v_unique_count integer;
  v_item jsonb;
  v_student_id uuid;
  v_attendance text;
  v_grade numeric;
  v_lab_submitted boolean;
begin
  if v_uid is null then raise exception 'Autentifikasiya tələb olunur.'; end if;

  select * into v_session
  from public.course_lesson_sessions
  where id = p_lesson_id
  for update;

  if not found then raise exception 'Dərs sessiyası tapılmadı.'; end if;
  if v_session.teacher_id <> v_uid or not public.is_course_teacher(v_session.course_id, v_uid) then
    raise exception 'Bu dərsi qiymətləndirmək icazəniz yoxdur.';
  end if;
  if v_session.is_confirmed then raise exception 'Bu dərs artıq təsdiqlənib və kilidlənib.'; end if;
  if not private.teacher_can_grade_lesson_at(p_lesson_id, v_uid, now()) then
    raise exception 'Dərs saatı aktiv deyil.';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'Tələbə siyahısı düzgün formatda deyil.';
  end if;

  select qiymetlendirme_novu into v_grading_type
  from public.courses
  where id = v_session.course_id;
  if v_grading_type is null then raise exception 'Fənnin qiymətləndirmə növü təyin edilməyib.'; end if;

  perform private.seed_session_students(v_session.id, v_session.course_id, v_session.group_id);

  select count(*)::integer into v_expected_count
  from public.lesson_student_records
  where lesson_session_id = v_session.id;

  v_payload_count := jsonb_array_length(p_records);
  select count(distinct x.student_id)::integer into v_unique_count
  from (
    select nullif(item ->> 'student_id','')::uuid as student_id
    from jsonb_array_elements(p_records) item
  ) x;

  if v_expected_count = 0 then raise exception 'Bu sessiyanın qrupunda tələbə yoxdur.'; end if;
  if v_payload_count <> v_expected_count or v_unique_count <> v_expected_count then
    raise exception 'Yadda saxlamaq üçün bütün tələbələr siyahıda yalnız bir dəfə olmalıdır.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_records) item
    where not exists (
      select 1
      from public.lesson_student_records r
      where r.lesson_session_id = v_session.id
        and r.student_id = nullif(item ->> 'student_id','')::uuid
    )
  ) then
    raise exception 'Siyahıda bu dərsə aid olmayan tələbə var.';
  end if;

  for v_item in select value from jsonb_array_elements(p_records)
  loop
    v_student_id := nullif(v_item ->> 'student_id','')::uuid;
    v_attendance := v_item ->> 'attendance_status';
    if v_attendance not in ('iştirak edib','qayıb') then
      raise exception 'Bütün tələbələr üçün davamiyyət seçilməlidir.';
    end if;

    v_grade := null;
    if v_item ? 'grade' and jsonb_typeof(v_item -> 'grade') <> 'null' then
      v_grade := (v_item ->> 'grade')::numeric;
    end if;

    v_lab_submitted := null;
    if v_item ? 'lab_submitted' and jsonb_typeof(v_item -> 'lab_submitted') <> 'null' then
      v_lab_submitted := (v_item ->> 'lab_submitted')::boolean;
    end if;

    if v_attendance = 'qayıb' then
      v_grade := null;
      v_lab_submitted := false;
    end if;

    if v_grading_type = 'meshgele'::public.course_grading_type then
      if v_grade is not null and (v_grade < 0 or v_grade > 10) then
        raise exception 'Gündəlik qiymət 0-10 aralığında olmalıdır.';
      end if;
      update public.lesson_student_records
      set attendance_status = v_attendance::public.lesson_attendance_status,
          grade = v_grade,
          lab_submitted = null,
          updated_at = now()
      where lesson_session_id = v_session.id and student_id = v_student_id;
    elsif v_grading_type = 'laboratoriya'::public.course_grading_type then
      update public.lesson_student_records
      set attendance_status = v_attendance::public.lesson_attendance_status,
          grade = null,
          lab_submitted = v_lab_submitted,
          updated_at = now()
      where lesson_session_id = v_session.id and student_id = v_student_id;
    else
      raise exception 'Dəstəklənməyən qiymətləndirmə növü.';
    end if;
  end loop;

  update public.course_lesson_sessions
  set movzu = nullif(btrim(coalesce(p_topic,'')),''),
      draft_saved_at = now(),
      auto_finalize_enabled = true,
      updated_at = now()
  where id = v_session.id;

  return true;
end;
$$;

grant execute on function public.save_lesson_grading_draft(uuid,text,jsonb) to authenticated;

-- Manual confirmation still requires a complete attendance list. The cron
-- worker uses a private flag and can finalize an already saved draft when the
-- lesson ends, preserving whatever optional grade/lab values the teacher left.
create or replace function private.confirm_lesson_session()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $$
declare
  v_missing integer;
  v_total integer;
  v_unlock_id text := current_setting('app.ejournal_unlock_session_id', true);
  v_auto text := current_setting('app.ejournal_auto_confirm', true);
  v_uid uuid := auth.uid();
begin
  if not old.is_confirmed and new.is_confirmed then
    if v_auto = '1' then
      perform private.seed_session_students(new.id, new.course_id, new.group_id);
      new.confirmed_at := coalesce(new.confirmed_at, now());
      new.confirmed_by := coalesce(new.confirmed_by, new.teacher_id);
      new.auto_confirmed := true;
      new.auto_confirmed_at := coalesce(new.auto_confirmed_at, now());
      return new;
    end if;

    if not (
      public.has_role(v_uid, 'admin'::public.app_role)
      or public.has_role(v_uid, 'dekan'::public.app_role)
      or (
        new.teacher_id = v_uid
        and public.is_course_teacher(new.course_id, v_uid)
        and private.teacher_can_grade_lesson_at(new.id, v_uid, now())
      )
    ) then
      raise exception 'Bu dərs sessiyasını yalnız aktiv dərs vaxtında təsdiqləyə bilərsiniz.';
    end if;

    perform private.seed_session_students(new.id, new.course_id, new.group_id);
    select count(*), count(*) filter (where attendance_status is null)
      into v_total, v_missing
    from public.lesson_student_records
    where lesson_session_id = new.id;

    if v_total = 0 then raise exception 'Sessiyanı təsdiqləmək üçün qrupda tələbə olmalıdır.'; end if;
    if v_missing > 0 then raise exception 'Sessiyanı təsdiqləməzdən əvvəl bütün tələbələrin davamiyyətini qeyd edin.'; end if;

    new.confirmed_at := now();
    new.confirmed_by := v_uid;
    new.auto_confirmed := false;
    new.auto_confirmed_at := null;
  elsif old.is_confirmed and not new.is_confirmed then
    if v_unlock_id <> old.id::text
       or not (public.has_role(v_uid,'admin'::public.app_role) or public.has_role(v_uid,'dekan'::public.app_role)) then
      raise exception 'Təsdiqlənmiş sessiyanı yalnız admin/dekan auditli kilid-açma əməliyyatı ilə geri aça bilər.';
    end if;
    new.confirmed_at := null;
    new.confirmed_by := null;
    new.auto_confirmed := false;
    new.auto_confirmed_at := null;
  elsif old.is_confirmed is distinct from new.is_confirmed then
    raise exception 'Təsdiq vəziyyəti dəyişdirilə bilməz.';
  end if;
  return new;
end;
$$;

create or replace function private.auto_confirm_overdue_lesson_sessions()
returns integer
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_count integer := 0;
begin
  perform set_config('app.ejournal_auto_confirm','1',true);
  update public.course_lesson_sessions
  set is_confirmed = true,
      updated_at = now()
  where is_confirmed = false
    and auto_finalize_enabled = true
    and draft_saved_at is not null
    and ends_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.auto_confirm_overdue_lesson_sessions() from public;

select cron.unschedule(jobid)
from cron.job
where jobname = 'auto-confirm-teacher-journals';

select cron.schedule(
  'auto-confirm-teacher-journals',
  '* * * * *',
  $$select private.auto_confirm_overdue_lesson_sessions();$$
);
