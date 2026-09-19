-- PROMPT 4: server-authoritative teacher daily journal workflow.
-- Keep lesson editability bound to the real session interval and the assigned
-- teacher/lesson-type permission while supporting attendance-only lectures,
-- optional grades for seminar/practice/lab, and explicit lab hand-in status.

create or replace function private.lesson_permission_key(p_lesson_type text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_lesson_type, '')))
    when 'muhazire' then 'muhazire'
    when 'mühazirə' then 'muhazire'
    when 'seminar' then 'seminar'
    when 'laboratoriya' then 'laboratoriya'
    when 'tecrube' then 'tecrube'
    when 'təcrübə' then 'tecrube'
    when 'meshgele' then 'tecrube'
    when 'məşğələ' then 'tecrube'
    when 'serbest_is' then 'serbest_is'
    when 'sərbəst iş' then 'serbest_is'
    when 'kollokvium' then 'kollokvium'
    else null
  end;
$$;

create or replace function private.teacher_can_grade_lesson_at(
  p_lesson_id uuid,
  p_teacher_id uuid,
  p_now timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(p_teacher_id, 'muellim'::public.app_role)
    and exists (
      select 1
      from public.course_lesson_sessions s
      join public.course_teachers ct
        on ct.course_id = s.course_id
       and ct.muellim_id = p_teacher_id
      where s.id = p_lesson_id
        and s.teacher_id = p_teacher_id
        and private.lesson_permission_key(s.dars_novu) is not null
        and coalesce(
          (ct.icazeler ->> private.lesson_permission_key(s.dars_novu))::boolean,
          false
        )
        and private.grade_time_window_contains(s.starts_at, s.ends_at, p_now)
    );
$$;

create or replace function public.ejournal_server_now()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.now();
$$;

revoke all on function public.ejournal_server_now() from public, anon;
grant execute on function public.ejournal_server_now() to authenticated;

create or replace function private.validate_lesson_student_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_course_id uuid;
  v_student_id uuid;
  v_session_course_id uuid;
  v_confirmed boolean;
  v_group_id uuid;
  v_lesson_type text;
begin
  if TG_OP = 'DELETE' then
    v_session_id := OLD.lesson_session_id;
    v_course_id := OLD.course_id;
    v_student_id := OLD.student_id;
  else
    v_session_id := NEW.lesson_session_id;
    v_course_id := NEW.course_id;
    v_student_id := NEW.student_id;
  end if;

  select s.is_confirmed, s.group_id, s.course_id, lower(btrim(coalesce(s.dars_novu, '')))
    into v_confirmed, v_group_id, v_session_course_id, v_lesson_type
  from public.course_lesson_sessions s
  where s.id = v_session_id;

  if not found then
    raise exception 'Dərs sessiyası tapılmadı.';
  end if;

  if coalesce(v_confirmed, false) then
    raise exception 'Təsdiqlənmiş sessiyanın tələbə qeydi dəyişdirilə bilməz.';
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  if v_course_id is distinct from v_session_course_id then
    raise exception 'Tələbə qeydi sessiyanın fənni ilə uyğun deyil.';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = v_group_id
      and gm.user_id = v_student_id
  ) or not public.is_course_student(v_course_id, v_student_id) then
    raise exception 'Tələbə bu sessiyanın qrup/fənn tərkibində deyil.';
  end if;

  if NEW.grade is not null and (NEW.grade < 0 or NEW.grade > 10) then
    raise exception 'Gündəlik qiymət 0-10 aralığında olmalıdır.';
  end if;

  if NEW.attendance_status::text = 'qayıb' then
    if NEW.grade is not null then
      raise exception 'Qayıb tələbəyə gündəlik qiymət yazıla bilməz.';
    end if;
    if NEW.lab_submitted is true then
      raise exception 'İştirak etməyən tələbə laboratoriya işini təhvil vermiş kimi qeyd edilə bilməz.';
    end if;
  end if;

  if v_lesson_type in ('muhazire', 'mühazirə') then
    if NEW.grade is not null then
      raise exception 'Mühazirə sessiyasında gündəlik qiymət istifadə edilmir.';
    end if;
    if NEW.lab_submitted is not null then
      raise exception 'Mühazirə sessiyasında laboratoriya statusu istifadə edilmir.';
    end if;
  elsif v_lesson_type in ('seminar', 'tecrube', 'təcrübə', 'meshgele', 'məşğələ') then
    if NEW.lab_submitted is not null then
      raise exception 'Bu dərs növündə laboratoriya statusu istifadə edilmir.';
    end if;
  elsif v_lesson_type = 'laboratoriya' then
    if NEW.attendance_status::text = 'iştirak edib' and NEW.lab_submitted is null then
      raise exception 'İştirak edən tələbə üçün laboratoriya təhvil statusu seçilməlidir.';
    end if;
  end if;

  return NEW;
end;
$$;

create or replace function public.save_lesson_grading_draft(
  p_lesson_id uuid,
  p_topic text,
  p_records jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.course_lesson_sessions%rowtype;
  v_lesson_type text;
  v_expected_count integer;
  v_payload_count integer;
  v_unique_count integer;
  v_item jsonb;
  v_student_id uuid;
  v_attendance text;
  v_grade numeric;
  v_lab_submitted boolean;
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.';
  end if;

  select * into v_session
  from public.course_lesson_sessions
  where id = p_lesson_id
  for update;

  if not found then
    raise exception 'Dərs sessiyası tapılmadı.';
  end if;
  if v_session.teacher_id <> v_uid or not public.is_course_teacher(v_session.course_id, v_uid) then
    raise exception 'Bu dərsi qiymətləndirmək icazəniz yoxdur.';
  end if;
  if v_session.is_confirmed then
    raise exception 'Bu dərs artıq təsdiqlənib və kilidlənib.';
  end if;
  if not private.teacher_can_grade_lesson_at(p_lesson_id, v_uid, pg_catalog.now()) then
    raise exception 'Dərs saatı aktiv deyil və ya bu dərs növü üçün icazəniz yoxdur.';
  end if;
  if p_records is null or pg_catalog.jsonb_typeof(p_records) <> 'array' then
    raise exception 'Tələbə siyahısı düzgün formatda deyil.';
  end if;

  v_lesson_type := lower(btrim(coalesce(v_session.dars_novu, '')));
  if v_lesson_type not in ('muhazire','mühazirə','seminar','tecrube','təcrübə','meshgele','məşğələ','laboratoriya') then
    raise exception 'Bu dərs növü gündəlik jurnal qiymətləndirməsi üçün dəstəklənmir.';
  end if;

  perform private.seed_session_students(v_session.id, v_session.course_id, v_session.group_id);

  select count(*)::integer into v_expected_count
  from public.lesson_student_records
  where lesson_session_id = v_session.id;

  v_payload_count := pg_catalog.jsonb_array_length(p_records);
  select count(distinct x.student_id)::integer into v_unique_count
  from (
    select nullif(item ->> 'student_id', '')::uuid as student_id
    from pg_catalog.jsonb_array_elements(p_records) item
  ) x;

  if v_expected_count = 0 then
    raise exception 'Bu sessiyanın qrupunda tələbə yoxdur.';
  end if;
  if v_payload_count <> v_expected_count or v_unique_count <> v_expected_count then
    raise exception 'Yadda saxlamaq üçün bütün tələbələr siyahıda yalnız bir dəfə olmalıdır.';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_records) item
    where not exists (
      select 1
      from public.lesson_student_records r
      where r.lesson_session_id = v_session.id
        and r.student_id = nullif(item ->> 'student_id', '')::uuid
    )
  ) then
    raise exception 'Siyahıda bu dərsə aid olmayan tələbə var.';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_records)
  loop
    v_student_id := nullif(v_item ->> 'student_id', '')::uuid;
    v_attendance := v_item ->> 'attendance_status';
    if v_attendance not in ('iştirak edib', 'qayıb') then
      raise exception 'Bütün tələbələr üçün davamiyyət seçilməlidir.';
    end if;

    v_grade := null;
    if v_item ? 'grade' and pg_catalog.jsonb_typeof(v_item -> 'grade') <> 'null' then
      v_grade := (v_item ->> 'grade')::numeric;
    end if;
    if v_grade is not null and (v_grade < 0 or v_grade > 10) then
      raise exception 'Gündəlik qiymət 0-10 aralığında olmalıdır.';
    end if;

    v_lab_submitted := null;
    if v_item ? 'lab_submitted' and pg_catalog.jsonb_typeof(v_item -> 'lab_submitted') <> 'null' then
      v_lab_submitted := (v_item ->> 'lab_submitted')::boolean;
    end if;

    if v_attendance = 'qayıb' then
      v_grade := null;
      if v_lesson_type = 'laboratoriya' then
        v_lab_submitted := false;
      else
        v_lab_submitted := null;
      end if;
    end if;

    if v_lesson_type in ('muhazire', 'mühazirə') then
      update public.lesson_student_records
      set attendance_status = v_attendance::public.lesson_attendance_status,
          grade = null,
          lab_submitted = null,
          updated_at = pg_catalog.now()
      where lesson_session_id = v_session.id
        and student_id = v_student_id;
    elsif v_lesson_type in ('seminar', 'tecrube', 'təcrübə', 'meshgele', 'məşğələ') then
      update public.lesson_student_records
      set attendance_status = v_attendance::public.lesson_attendance_status,
          grade = v_grade,
          lab_submitted = null,
          updated_at = pg_catalog.now()
      where lesson_session_id = v_session.id
        and student_id = v_student_id;
    elsif v_lesson_type = 'laboratoriya' then
      if v_attendance = 'iştirak edib' and v_lab_submitted is null then
        raise exception 'İştirak edən tələbə üçün laboratoriya təhvil statusu seçilməlidir.';
      end if;
      update public.lesson_student_records
      set attendance_status = v_attendance::public.lesson_attendance_status,
          grade = v_grade,
          lab_submitted = v_lab_submitted,
          updated_at = pg_catalog.now()
      where lesson_session_id = v_session.id
        and student_id = v_student_id;
    end if;
  end loop;

  update public.course_lesson_sessions
  set movzu = nullif(btrim(coalesce(p_topic, '')), ''),
      draft_saved_at = pg_catalog.now(),
      auto_finalize_enabled = true,
      updated_at = pg_catalog.now()
  where id = v_session.id;

  return true;
end;
$$;

revoke all on function public.save_lesson_grading_draft(uuid, text, jsonb) from public, anon;
grant execute on function public.save_lesson_grading_draft(uuid, text, jsonb) to authenticated;

create or replace function public.confirm_lesson_grading(
  p_lesson_id uuid,
  p_topic text,
  p_records jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.';
  end if;

  perform public.save_lesson_grading_draft(p_lesson_id, p_topic, p_records);

  update public.course_lesson_sessions
  set is_confirmed = true,
      updated_at = pg_catalog.now()
  where id = p_lesson_id
    and teacher_id = v_uid
    and is_confirmed = false;

  if not found then
    raise exception 'Dərs təsdiqlənmədi.';
  end if;

  return true;
end;
$$;

revoke all on function public.confirm_lesson_grading(uuid, text, jsonb) from public, anon;
grant execute on function public.confirm_lesson_grading(uuid, text, jsonb) to authenticated;

create or replace function private.enforce_lesson_record_write_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_changed boolean := false;
  v_session_id uuid;
  v_student_submission boolean := false;
begin
  if TG_OP = 'INSERT' then
    v_session_id := NEW.lesson_session_id;
    v_changed := NEW.attendance_status is not null
      or NEW.grade is not null
      or NEW.lab_submitted is not null
      or NEW.file_url is not null;
    v_student_submission := v_uid = NEW.student_id
      and public.has_role(v_uid, 'telebe'::public.app_role)
      and NEW.attendance_status is null
      and NEW.grade is null
      and NEW.lab_submitted is true
      and NEW.file_url is not null;
  else
    v_session_id := NEW.lesson_session_id;
    v_changed := NEW.attendance_status is distinct from OLD.attendance_status
      or NEW.grade is distinct from OLD.grade
      or NEW.lab_submitted is distinct from OLD.lab_submitted
      or NEW.file_url is distinct from OLD.file_url;
    v_student_submission := v_uid = OLD.student_id
      and public.has_role(v_uid, 'telebe'::public.app_role)
      and NEW.lesson_session_id is not distinct from OLD.lesson_session_id
      and NEW.student_id is not distinct from OLD.student_id
      and NEW.course_id is not distinct from OLD.course_id
      and NEW.attendance_status is not distinct from OLD.attendance_status
      and NEW.grade is not distinct from OLD.grade
      and (NEW.lab_submitted is distinct from OLD.lab_submitted or NEW.file_url is distinct from OLD.file_url);
  end if;

  if not v_changed or v_uid is null then
    return NEW;
  end if;

  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'dekan'::public.app_role) then
    return NEW;
  end if;

  if v_student_submission then
    return NEW;
  end if;

  if not private.teacher_can_grade_lesson_at(v_session_id, v_uid, pg_catalog.now()) then
    raise exception 'Qiymət və davamiyyət yalnız dərsin real başlanğıc-bitmə intervalında, sessiyanın müəllimi və course_teachers icazəsi uyğun olduqda dəyişdirilə bilər.';
  end if;

  return NEW;
end;
$$;
