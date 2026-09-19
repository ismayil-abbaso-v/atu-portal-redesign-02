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
  if tg_table_name = 'course_work_assessments'
     and not exists (
       select 1 from public.courses c
       where c.id = v_course_id and coalesce(c.kurs_isi_var, false) = true
     ) then
    raise exception 'Bu fənn üçün kurs işi aktiv deyil.' using errcode = '23514';
  end if;

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