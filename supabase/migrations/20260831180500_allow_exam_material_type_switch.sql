-- Keep course/group/period ownership immutable while allowing a teacher-owned
-- material to switch test <-> ticket using the same material ID. The new path
-- must already exist in the private bucket and must encode the new exam_type.

create or replace function private.enforce_exam_material_write_scope()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_privileged boolean := false;
begin
  if new.mime_type <> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     or lower(new.original_file_name) not like '%.docx'
     or new.file_size <= 0
     or new.file_size > 20971520 then
    raise exception using errcode = '23514', message = 'EXAM_MATERIAL_DOCX_REQUIRED';
  end if;

  if not private.exam_material_valid_path(
    new.file_path,
    new.course_id,
    new.group_id,
    new.academic_year,
    new.semester,
    new.exam_type,
    new.uploaded_by
  ) then
    raise exception using errcode = '23514', message = 'EXAM_MATERIAL_INVALID_PATH';
  end if;

  if not private.exam_material_storage_object_matches(new.file_path, new.mime_type, new.file_size) then
    raise exception using errcode = '23514', message = 'EXAM_MATERIAL_STORAGE_MISMATCH';
  end if;

  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  v_privileged := public.has_role(v_uid, 'admin'::public.app_role)
    or public.has_role(v_uid, 'dekan'::public.app_role);

  if v_privileged then
    new.updated_at := now();
    return new;
  end if;

  if not private.exam_material_teacher_can_manage(
    new.course_id,
    new.group_id,
    new.academic_year,
    new.semester,
    v_uid
  ) then
    raise exception using errcode = '42501', message = 'EXAM_MATERIAL_FORBIDDEN';
  end if;

  if tg_op = 'INSERT' then
    if new.uploaded_by is distinct from v_uid then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_UPLOADER_MISMATCH';
    end if;
    new.uploaded_at := now();
  else
    if old.uploaded_by is distinct from v_uid then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_OWNER_ONLY';
    end if;

    if new.id is distinct from old.id
       or new.course_id is distinct from old.course_id
       or new.group_id is distinct from old.group_id
       or new.academic_year is distinct from old.academic_year
       or new.semester is distinct from old.semester
       or new.uploaded_by is distinct from old.uploaded_by
       or new.uploaded_at is distinct from old.uploaded_at then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_IDENTITY_IMMUTABLE';
    end if;

    -- A path change is allowed only as part of a test/ticket type switch.
    -- The path validator above guarantees that the replacement object belongs
    -- to the same course/group/period/uploader and encodes the new exam_type.
    if new.exam_type is distinct from old.exam_type then
      if new.file_path is not distinct from old.file_path then
        raise exception using errcode = '42501', message = 'EXAM_MATERIAL_TYPE_PATH_REQUIRED';
      end if;
    elsif new.file_path is distinct from old.file_path then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_IDENTITY_IMMUTABLE';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function private.enforce_exam_material_write_scope() is
  'Validates private DOCX metadata/storage, exact teacher course-group scope and immutable period ownership. Test/ticket switches keep the material ID but require a fresh type-correct private Storage path.';
