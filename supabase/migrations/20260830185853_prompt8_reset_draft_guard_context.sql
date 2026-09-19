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
  perform pg_catalog.set_config('app.ejournal_draft_save_session_id', '', true);
  return true;
end;
$function$;