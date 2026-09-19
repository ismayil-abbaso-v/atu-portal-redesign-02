create or replace function private.enforce_teacher_session_grading_scope()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_dekan boolean := false;
  v_draft_save_session_id text := current_setting('app.ejournal_draft_save_session_id', true);
begin
  if v_uid is null then
    return new;
  end if;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);
  v_is_dekan := public.has_role(v_uid, 'dekan'::public.app_role);

  if v_is_admin or v_is_dekan then
    return new;
  end if;

  if v_uid = old.teacher_id and public.is_course_teacher(old.course_id, v_uid) then
    if new.id is distinct from old.id
       or new.schedule_template_id is distinct from old.schedule_template_id
       or new.course_id is distinct from old.course_id
       or new.group_id is distinct from old.group_id
       or new.teacher_id is distinct from old.teacher_id
       or new.dars_novu is distinct from old.dars_novu
       or new.lesson_date is distinct from old.lesson_date
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.created_at is distinct from old.created_at then
      raise exception 'Müəllim jurnal ekranından dərsin cədvəl/sistem identifikatorlarını dəyişə bilməz.' using errcode = '42501';
    end if;

    if (new.draft_saved_at is distinct from old.draft_saved_at
        or new.auto_finalize_enabled is distinct from old.auto_finalize_enabled)
       and v_draft_save_session_id is distinct from old.id::text then
      raise exception 'Jurnal qaralama metadata-sı yalnız doğrulanmış yadda-saxlama əməliyyatı ilə dəyişdirilə bilər.' using errcode = '42501';
    end if;

    if new.confirmed_at is distinct from old.confirmed_at
       or new.confirmed_by is distinct from old.confirmed_by
       or new.auto_confirmed is distinct from old.auto_confirmed
       or new.auto_confirmed_at is distinct from old.auto_confirmed_at then
      raise exception 'Jurnal təsdiq metadata-sı server tərəfindən idarə olunur.' using errcode = '42501';
    end if;

    if new.movzu is distinct from old.movzu
       or new.topic_id is distinct from old.topic_id
       or new.is_confirmed is distinct from old.is_confirmed then
      if not private.teacher_can_grade_lesson_at(old.id, v_uid, now()) then
        raise exception 'Mövzu, davamiyyət və qiymətləndirmə yalnız aktiv dərsin qiymətləndirmə pəncərəsində dəyişdirilə bilər.' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.save_lesson_grading_draft(p_lesson_id uuid, p_topic text, p_records jsonb)
returns boolean
language plpgsql
set search_path to ''
as $function$
declare
  v_uid uuid:=auth.uid(); v_session public.course_lesson_sessions%rowtype; v_lesson_type text;
  v_expected_count integer; v_payload_count integer; v_unique_count integer; v_item jsonb;
  v_student_id uuid; v_attendance text; v_grade numeric; v_lab_submitted boolean;
begin
  if v_uid is null then raise exception 'Autentifikasiya tələb olunur.'; end if;
  select * into v_session from public.course_lesson_sessions where id=p_lesson_id for update;
  if not found then raise exception 'Dərs sessiyası tapılmadı.'; end if;
  if v_session.teacher_id<>v_uid or not public.is_course_teacher(v_session.course_id,v_uid) then raise exception 'Bu dərsi qiymətləndirmək icazəniz yoxdur.'; end if;
  if v_session.is_confirmed then raise exception 'Bu dərs artıq təsdiqlənib və kilidlənib.'; end if;
  if not private.teacher_can_grade_lesson_at(p_lesson_id,v_uid,pg_catalog.now()) then raise exception 'Dərs saatı aktiv deyil və ya bu dərs növü üçün icazəniz yoxdur.'; end if;
  if p_records is null or pg_catalog.jsonb_typeof(p_records)<>'array' then raise exception 'Tələbə siyahısı düzgün formatda deyil.'; end if;
  v_lesson_type:=lower(btrim(coalesce(v_session.dars_novu,'')));
  if v_lesson_type not in ('muhazire','mühazirə','seminar','tecrube','təcrübə','meshgele','məşğələ','laboratoriya') then raise exception 'Bu dərs növü gündəlik jurnal qiymətləndirməsi üçün dəstəklənmir.'; end if;
  perform private.seed_session_students(v_session.id,v_session.course_id,v_session.group_id);
  select count(*)::integer into v_expected_count from public.lesson_student_records where lesson_session_id=v_session.id;
  v_payload_count:=pg_catalog.jsonb_array_length(p_records);
  select count(distinct x.student_id)::integer into v_unique_count from (
    select nullif(item->>'student_id','')::uuid student_id from pg_catalog.jsonb_array_elements(p_records) item
  ) x;
  if v_expected_count=0 then raise exception 'Bu sessiyanın qrupunda tələbə yoxdur.'; end if;
  if v_payload_count<>v_expected_count or v_unique_count<>v_expected_count then raise exception 'Yadda saxlamaq üçün bütün tələbələr siyahıda yalnız bir dəfə olmalıdır.'; end if;
  if exists(select 1 from pg_catalog.jsonb_array_elements(p_records) item where not exists(
    select 1 from public.lesson_student_records r where r.lesson_session_id=v_session.id and r.student_id=nullif(item->>'student_id','')::uuid
  )) then raise exception 'Siyahıda bu dərsə aid olmayan tələbə var.'; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_records) loop
    v_student_id:=nullif(v_item->>'student_id','')::uuid; v_attendance:=v_item->>'attendance_status';
    if v_attendance not in ('iştirak edib','qayıb') then raise exception 'Bütün tələbələr üçün davamiyyət seçilməlidir.'; end if;
    v_grade:=null;
    if v_item?'grade' and pg_catalog.jsonb_typeof(v_item->'grade')<>'null' then v_grade:=(v_item->>'grade')::numeric; end if;
    if v_grade is not null and (v_grade<0 or v_grade>10) then raise exception 'Gündəlik qiymət 0-10 aralığında olmalıdır.'; end if;
    v_lab_submitted:=null;
    if v_item?'lab_submitted' and pg_catalog.jsonb_typeof(v_item->'lab_submitted')<>'null' then v_lab_submitted:=(v_item->>'lab_submitted')::boolean; end if;
    if v_attendance='qayıb' then v_grade:=null; if v_lesson_type='laboratoriya' then v_lab_submitted:=false; else v_lab_submitted:=null; end if; end if;
    if v_lesson_type in ('muhazire','mühazirə') then
      update public.lesson_student_records set attendance_status=v_attendance::public.lesson_attendance_status,grade=null,lab_submitted=null,updated_at=pg_catalog.now()
      where lesson_session_id=v_session.id and student_id=v_student_id;
    elsif v_lesson_type in ('seminar','tecrube','təcrübə','meshgele','məşğələ') then
      update public.lesson_student_records set attendance_status=v_attendance::public.lesson_attendance_status,grade=v_grade,lab_submitted=null,updated_at=pg_catalog.now()
      where lesson_session_id=v_session.id and student_id=v_student_id;
    elsif v_lesson_type='laboratoriya' then
      if v_attendance='iştirak edib' and v_lab_submitted is null then raise exception 'İştirak edən tələbə üçün laboratoriya təhvil statusu seçilməlidir.'; end if;
      update public.lesson_student_records set attendance_status=v_attendance::public.lesson_attendance_status,grade=v_grade,lab_submitted=v_lab_submitted,updated_at=pg_catalog.now()
      where lesson_session_id=v_session.id and student_id=v_student_id;
    end if;
  end loop;
  perform pg_catalog.set_config('app.ejournal_draft_save_session_id', v_session.id::text, true);
  update public.course_lesson_sessions
  set movzu=nullif(btrim(coalesce(p_topic,'')),''),draft_saved_at=pg_catalog.now(),auto_finalize_enabled=true,updated_at=pg_catalog.now()
  where id=v_session.id;
  return true;
end;
$function$;

create or replace function private.confirm_lesson_session()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
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
      select count(*), count(*) filter (where attendance_status is null) into v_total, v_missing
      from public.lesson_student_records where lesson_session_id = new.id;
      if v_total = 0 or v_missing > 0 then
        return null;
      end if;
      new.confirmed_at := coalesce(new.confirmed_at, now());
      new.confirmed_by := coalesce(new.confirmed_by, new.teacher_id);
      new.auto_confirmed := true;
      new.auto_confirmed_at := coalesce(new.auto_confirmed_at, now());
      return new;
    end if;

    if not (
      public.has_role(v_uid, 'admin'::public.app_role)
      or public.has_role(v_uid, 'dekan'::public.app_role)
      or (new.teacher_id = v_uid and public.is_course_teacher(new.course_id, v_uid) and private.teacher_can_grade_lesson_at(new.id, v_uid, now()))
    ) then raise exception 'Bu dərs sessiyasını yalnız aktiv dərs vaxtında təsdiqləyə bilərsiniz.'; end if;

    perform private.seed_session_students(new.id, new.course_id, new.group_id);
    select count(*), count(*) filter (where attendance_status is null) into v_total, v_missing
    from public.lesson_student_records where lesson_session_id = new.id;
    if v_total = 0 then raise exception 'Sessiyanı təsdiqləmək üçün qrupda tələbə olmalıdır.'; end if;
    if v_missing > 0 then raise exception 'Sessiyanı təsdiqləməzdən əvvəl bütün tələbələrin davamiyyətini qeyd edin.'; end if;

    new.confirmed_at := now();
    new.confirmed_by := v_uid;
    new.auto_confirmed := false;
    new.auto_confirmed_at := null;
  elsif old.is_confirmed and not new.is_confirmed then
    if v_unlock_id <> old.id::text or not (public.has_role(v_uid,'admin'::public.app_role) or public.has_role(v_uid,'dekan'::public.app_role)) then
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
$function$;

create or replace function private.auto_confirm_overdue_lesson_sessions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare v_count integer := 0;
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
$function$;