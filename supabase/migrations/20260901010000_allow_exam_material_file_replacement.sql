-- Allow a teacher to replace an existing DOCX with a freshly uploaded object
-- while preserving the material's real identity and ownership scope.
--
-- Replacement objects intentionally use a new UUID path so downstream consumers 
-- cannot receive a stale Storage/CDN object. The path validator and storage
-- integrity check below still require the new object to belong to the exact same
-- course/group/period/uploader scope and to exist with matching DOCX metadata.

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

    -- These columns define the material's identity and ownership scope.
    -- File path/type/name/MIME/size are replacement metadata and may change,
    -- subject to the path and Storage-object validation above.
    if new.id is distinct from old.id
       or new.course_id is distinct from old.course_id
       or new.group_id is distinct from old.group_id
       or new.academic_year is distinct from old.academic_year
       or new.semester is distinct from old.semester
       or new.uploaded_by is distinct from old.uploaded_by
       or new.uploaded_at is distinct from old.uploaded_at then
      raise exception using errcode = '42501', message = 'EXAM_MATERIAL_IDENTITY_IMMUTABLE';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function private.enforce_exam_material_write_scope() is
  'Validates private DOCX metadata/storage and exact teacher scope. Replacements and test/ticket switches retain the material ID but use a fresh, scope-correct Storage path.';
