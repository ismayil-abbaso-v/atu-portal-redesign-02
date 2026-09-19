create or replace function private.is_course_teacher(_course_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select _user_id is not null
    and public.has_role(_user_id, 'muellim'::public.app_role)
    and (
      exists (
        select 1
        from public.courses c
        where c.id = _course_id
          and c.muellim_id = _user_id
      )
      or exists (
        select 1
        from public.course_teachers ct
        where ct.course_id = _course_id
          and ct.muellim_id = _user_id
      )
    );
$function$;

create or replace function private.ejournal_is_course_teacher(p_course_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
as $function$
  select p_user_id is not null
    and public.has_role(p_user_id, 'muellim'::public.app_role)
    and exists (
      select 1
      from public.course_teachers ct
      where ct.course_id = p_course_id
        and ct.muellim_id = p_user_id
    );
$function$;

create or replace function private.enforce_assessment_write_scope()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
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

  if public.has_role(v_uid, 'muellim'::public.app_role)
     and private.ejournal_is_course_teacher(v_course_id, v_uid) then
    v_required_type := case tg_table_name
      when 'independent_work_assessments' then 'serbest_is'
      when 'colloquium_assessments' then 'kollokvium'
      else null
    end;

    if private.teacher_can_assess_course_at(v_course_id, v_uid, now(), v_required_type) then
      return new;
    end if;

    raise exception 'Qiymətləndirmə yalnız uyğun dərsin aktiv ±5 dəqiqəlik pəncərəsində aparıla bilər.';
  end if;

  raise exception 'Bu qiymətləndirmə sətrini dəyişmək icazəniz yoxdur.';
end;
$function$;

create or replace function private.protect_student_submission_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_uid uuid := auth.uid();
  v_legacy_prefix text;
  v_expected_prefix text;
  v_required_type text := null;
begin
  if v_uid is null or v_uid <> new.student_id or not public.has_role(v_uid, 'telebe'::public.app_role) then
    return new;
  end if;

  if public.has_role(v_uid, 'admin'::public.app_role) or public.has_role(v_uid, 'dekan'::public.app_role) then
    return new;
  end if;

  v_required_type := case tg_table_name
    when 'independent_work_assessments' then 'serbest_is'
    else null
  end;
  if public.has_role(v_uid, 'muellim'::public.app_role)
     and private.ejournal_is_course_teacher(new.course_id, v_uid)
     and private.teacher_can_assess_course_at(new.course_id, v_uid, now(), v_required_type) then
    return new;
  end if;

  if not public.is_course_student(new.course_id, v_uid) then
    raise exception 'Bu fənn üzrə təqdimat etmək icazəniz yoxdur.';
  end if;

  if new.grade is not null then
    raise exception 'Tələbə qiymət sahəsinə toxuna bilməz.';
  end if;

  if new.status = 'qiymetlendirilib'::public.assessment_submission_status then
    raise exception 'Qiymətləndirilib statusunu yalnız səlahiyyətli əməkdaş təyin edə bilər.';
  end if;

  if tg_op = 'UPDATE' then
    if new.course_id is distinct from old.course_id
       or new.student_id is distinct from old.student_id
       or new.sira is distinct from old.sira
       or new.grade is distinct from old.grade
       or new.topic is distinct from old.topic then
      raise exception 'Tələbə qiymət və sistem sahələrini dəyişə bilməz.';
    end if;

    if old.file_url is not null
       or old.submitted_at is not null
       or old.status <> 'gozleyir'::public.assessment_submission_status then
      raise exception 'Artıq təhvil vermisiniz.';
    end if;
  end if;

  if new.topic_id is null or new.file_url is null or new.submitted_at is null
     or new.status <> 'teqdim_edilib'::public.assessment_submission_status then
    raise exception 'Təqdimat üçün mövzu, fayl və təqdim edilmə vaxtı birlikdə yazılmalıdır.';
  end if;

  v_legacy_prefix := new.student_id::text || '/' || new.course_id::text || '/';
  v_expected_prefix := 'course-materials/' || new.course_id::text || '/student-submissions/' || new.student_id::text || '/';

  if position(v_legacy_prefix in new.file_url) = 1 then
    new.file_url := v_expected_prefix || substring(new.file_url from length(v_legacy_prefix) + 1);
  end if;

  if position(v_expected_prefix in new.file_url) <> 1 then
    raise exception 'Təqdimat fayl yolu tələbə və fənn qovluğuna uyğun deyil.';
  end if;

  return new;
end;
$function$;

revoke all on function private.is_course_teacher(uuid, uuid) from public, anon, authenticated;
revoke all on function private.ejournal_is_course_teacher(uuid, uuid) from public, anon, authenticated;
revoke all on function private.enforce_assessment_write_scope() from public, anon, authenticated;
revoke all on function private.protect_student_submission_fields() from public, anon, authenticated;
