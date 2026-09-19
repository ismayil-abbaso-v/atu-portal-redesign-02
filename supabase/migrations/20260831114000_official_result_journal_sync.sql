-- Prompt 3/3: Official result -> ATU detailed result + Digital Journal exam score.
-- Legacy receive-exam-result callbacks remain supported in the Edge Function;
-- this migration adds the course-aware, HMAC-authenticated transaction path.

alter table public.exam_detailed_results
  add column if not exists official_exam_id text,
  add column if not exists source_material_id uuid,
  add column if not exists course_id uuid,
  add column if not exists group_id uuid,
  add column if not exists academic_year text,
  add column if not exists semester smallint,
  add column if not exists event_type text,
  add column if not exists result_updated_at timestamptz,
  add column if not exists official_payload_hash text,
  add column if not exists sync_source text not null default 'legacy',
  add column if not exists canonical_total_score numeric,
  add column if not exists semester_snapshot_mismatch boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'exam_detailed_results_material_fkey'
  ) then
    alter table public.exam_detailed_results
      add constraint exam_detailed_results_material_fkey
      foreign key (source_material_id) references public.exam_materials(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'exam_detailed_results_course_fkey'
  ) then
    alter table public.exam_detailed_results
      add constraint exam_detailed_results_course_fkey
      foreign key (course_id) references public.courses(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'exam_detailed_results_group_fkey'
  ) then
    alter table public.exam_detailed_results
      add constraint exam_detailed_results_group_fkey
      foreign key (group_id) references public.groups(id) on delete set null;
  end if;
end $$;

alter table public.exam_detailed_results
  drop constraint if exists exam_detailed_results_semester_check,
  drop constraint if exists exam_detailed_results_event_type_check,
  drop constraint if exists exam_detailed_results_payload_hash_check,
  drop constraint if exists exam_detailed_results_sync_source_check;

alter table public.exam_detailed_results
  add constraint exam_detailed_results_semester_check
    check (semester is null or semester in (1, 2)),
  add constraint exam_detailed_results_event_type_check
    check (event_type is null or event_type in ('result.created', 'result.updated')),
  add constraint exam_detailed_results_payload_hash_check
    check (official_payload_hash is null or official_payload_hash ~ '^[0-9a-f]{64}$'),
  add constraint exam_detailed_results_sync_source_check
    check (sync_source in ('legacy', 'official_hmac'));

create index if not exists exam_detailed_results_official_exam_idx
  on public.exam_detailed_results (official_exam_id, synced_at desc)
  where official_exam_id is not null;
create index if not exists exam_detailed_results_course_period_idx
  on public.exam_detailed_results (course_id, group_id, academic_year, semester)
  where course_id is not null;

alter table public.exam_integration_audit
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.exam_integration_audit
  drop constraint if exists exam_integration_audit_direction_check;
alter table public.exam_integration_audit
  add constraint exam_integration_audit_direction_check
  check (direction in ('outbound', 'inbound', 'official_to_atu'));

comment on column public.exam_integration_audit.details is
  'Metadata-only details such as old/new exam score and semester comparison. Never store full answers, secrets, signatures or signed URLs here.';

-- Server-only secret lookup. Runtime environment variable ATU_OFFICIAL_RESULT_SECRET
-- remains preferred; this Vault fallback lets the canonical Edge Function stay
-- fully server-side without exposing the HMAC secret to browser code.
create or replace function public.get_atu_official_result_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = 'ATU_OFFICIAL_RESULT_SECRET'
  order by ds.updated_at desc nulls last, ds.created_at desc
  limit 1;
$$;

revoke all on function public.get_atu_official_result_secret() from public, anon, authenticated;
grant execute on function public.get_atu_official_result_secret() to service_role;

create or replace function public.apply_official_exam_result(
  p_payload jsonb,
  p_answers jsonb,
  p_payload_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_link public.official_exam_links%rowtype;
  v_existing public.exam_detailed_results%rowtype;
  v_score_row public.exam_scores%rowtype;
  v_student_id uuid;
  v_source_result_id uuid;
  v_source_result_text text;
  v_official_exam_id text;
  v_source_material_id uuid;
  v_source_course_id uuid;
  v_source_group_id uuid;
  v_event_type text;
  v_exam_type text;
  v_group_name text;
  v_course_name text;
  v_academic_year text;
  v_semester smallint;
  v_username text;
  v_current_score numeric;
  v_snapshot_score numeric;
  v_official_total numeric;
  v_local_semester numeric;
  v_final_score numeric;
  v_old_exam_score numeric;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_result_updated_at timestamptz;
  v_is_duplicate boolean := false;
  v_snapshot_mismatch boolean := false;
  v_error_code text := 'DATABASE_ERROR';
  v_error_message text := 'Official result transaction failed.';
  v_http_status integer := 500;
  v_detailed_id uuid;
begin
  -- Basic contract validation is repeated here as defense in depth; the Edge
  -- Function also validates strict JSON number types before invoking this RPC.
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    v_error_code := 'INVALID_PAYLOAD'; v_error_message := 'Payload must be an object.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  if p_payload->>'integration_version' <> '1' then
    v_error_code := 'INVALID_INTEGRATION_VERSION'; v_error_message := 'Unsupported integration version.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  v_event_type := p_payload->>'event_type';
  if v_event_type not in ('result.created', 'result.updated') then
    v_error_code := 'INVALID_EVENT_TYPE'; v_error_message := 'Unsupported result event type.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  v_source_result_text := btrim(coalesce(p_payload->>'source_result_id', ''));
  if v_source_result_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_error_code := 'INVALID_PAYLOAD'; v_error_message := 'source_result_id must be a UUID.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  v_source_result_id := v_source_result_text::uuid;

  if lower(btrim(coalesce(p_idempotency_key, ''))) <> lower(v_source_result_text) then
    v_error_code := 'INVALID_IDEMPOTENCY_KEY'; v_error_message := 'Idempotency key must equal source_result_id.'; v_http_status := 409;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    v_error_code := 'INVALID_PAYLOAD_HASH'; v_error_message := 'Payload hash is invalid.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  v_official_exam_id := btrim(coalesce(p_payload->>'official_exam_id', ''));
  begin
    v_source_material_id := (p_payload->>'source_material_id')::uuid;
    v_source_course_id := (p_payload->>'source_course_id')::uuid;
    v_source_group_id := (p_payload->>'source_group_id')::uuid;
    v_semester := (p_payload->>'semester')::smallint;
    v_started_at := (p_payload->>'exam_started_at')::timestamptz;
    v_completed_at := (p_payload->>'exam_completed_at')::timestamptz;
    v_result_updated_at := (p_payload->>'result_updated_at')::timestamptz;
  exception when others then
    v_error_code := 'INVALID_PAYLOAD'; v_error_message := 'One or more identifiers/timestamps are invalid.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end;

  v_exam_type := p_payload->>'exam_type';
  v_group_name := p_payload->>'group_name';
  v_course_name := p_payload->>'course_name';
  v_academic_year := p_payload->>'academic_year';
  v_username := lower(btrim(coalesce(p_payload->>'student_username', '')));

  if v_official_exam_id = '' or v_username = '' or v_group_name is null or v_course_name is null
     or v_academic_year !~ '^[0-9]{4}-[0-9]{4}$' or v_semester not in (1, 2)
     or v_exam_type not in ('test', 'ticket') then
    v_error_code := 'INVALID_PAYLOAD'; v_error_message := 'Required result metadata is missing or invalid.'; v_http_status := 400;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  if jsonb_typeof(p_payload->'current_score') <> 'number'
     or jsonb_typeof(p_payload->'semester_score_snapshot') <> 'number'
     or jsonb_typeof(p_payload->'total_score') <> 'number' then
    v_error_code := 'INVALID_SCORE'; v_error_message := 'Scores must be JSON numbers.'; v_http_status := 422;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  v_current_score := (p_payload->>'current_score')::numeric;
  v_snapshot_score := (p_payload->>'semester_score_snapshot')::numeric;
  v_official_total := (p_payload->>'total_score')::numeric;
  if v_current_score < 0 or v_current_score > 50
     or v_snapshot_score < 0 or v_snapshot_score > 50
     or v_official_total < 0 or v_official_total > 100 then
    v_error_code := 'INVALID_SCORE'; v_error_message := 'Score is outside the accepted range.'; v_http_status := 422;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  -- official_exam_id is authoritative for lookup; all source scope fields must
  -- then agree with the local mapping. Never trust source_course_id directly.
  select l.* into v_link
  from public.official_exam_links l
  where l.official_exam_id = v_official_exam_id
  for update;

  if not found then
    v_error_code := 'MAPPING_MISMATCH'; v_error_message := 'Official exam mapping was not found.'; v_http_status := 409;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  if v_link.material_id <> v_source_material_id
     or v_link.course_id <> v_source_course_id
     or v_link.group_id <> v_source_group_id
     or v_link.academic_year <> v_academic_year
     or v_link.semester <> v_semester
     or v_link.exam_type <> v_exam_type
     or v_link.group_name_snapshot <> v_group_name
     or v_link.course_name_snapshot <> v_course_name then
    v_error_code := 'MAPPING_MISMATCH'; v_error_message := 'Payload scope does not match the local official exam mapping.'; v_http_status := 409;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  v_student_id := private.get_user_id_by_username(v_username);
  if v_student_id is null then
    v_error_code := 'STUDENT_NOT_FOUND'; v_error_message := 'Student was not found.'; v_http_status := 404;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = v_link.group_id and gm.user_id = v_student_id
  ) then
    v_error_code := 'STUDENT_GROUP_MISMATCH'; v_error_message := 'Student is not a member of the mapped group.'; v_http_status := 409;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    v_source_result_id::text || ':' || v_student_id::text || ':' || v_link.course_id::text || ':' || v_link.academic_year || ':' || v_link.semester::text,
    0
  ));

  select r.* into v_existing
  from public.exam_detailed_results r
  where r.source_result_id = v_source_result_id
  for update;

  if found then
    if v_existing.sync_source = 'official_hmac' then
      if v_existing.official_exam_id is distinct from v_official_exam_id
         or v_existing.source_material_id is distinct from v_link.material_id
         or v_existing.course_id is distinct from v_link.course_id
         or v_existing.group_id is distinct from v_link.group_id
         or v_existing.academic_year is distinct from v_link.academic_year
         or v_existing.semester is distinct from v_link.semester
         or v_existing.student_id is distinct from v_student_id then
        v_error_code := 'IDEMPOTENCY_CONFLICT'; v_error_message := 'source_result_id is already bound to another scope.'; v_http_status := 409;
        raise exception using errcode = 'P0001', message = v_error_code;
      end if;

      if v_existing.official_payload_hash = p_payload_hash then
        v_is_duplicate := true;
      elsif v_event_type <> 'result.updated' then
        v_error_code := 'IDEMPOTENCY_CONFLICT'; v_error_message := 'A changed payload requires result.updated.'; v_http_status := 409;
        raise exception using errcode = 'P0001', message = v_error_code;
      elsif v_existing.result_updated_at is not null and v_result_updated_at < v_existing.result_updated_at then
        v_error_code := 'STALE_RESULT_UPDATE'; v_error_message := 'Result update is older than the stored result.'; v_http_status := 409;
        raise exception using errcode = 'P0001', message = v_error_code;
      elsif v_existing.result_updated_at is not null and v_result_updated_at = v_existing.result_updated_at then
        v_error_code := 'IDEMPOTENCY_CONFLICT'; v_error_message := 'Same result version arrived with a different body.'; v_http_status := 409;
        raise exception using errcode = 'P0001', message = v_error_code;
      end if;
    elsif v_existing.student_id is not null and v_existing.student_id <> v_student_id then
      v_error_code := 'IDEMPOTENCY_CONFLICT'; v_error_message := 'Legacy row belongs to another student.'; v_http_status := 409;
      raise exception using errcode = 'P0001', message = v_error_code;
    end if;
  end if;

  -- Resolve the local semester score from ATU's canonical calculation first;
  -- only fall back to the already-materialized exact-period row when the
  -- canonical calculator is unavailable. The Official snapshot never writes it.
  select es.* into v_score_row
  from public.exam_scores es
  where es.user_id = v_student_id
    and es.course_id = v_link.course_id
    and es.tedris_ili = v_link.academic_year
    and es.semestr = v_link.semester
  for update;

  v_local_semester := private.calculate_semester_score(v_link.course_id, v_student_id);
  if v_local_semester is null and v_score_row.id is not null then
    v_local_semester := v_score_row.semestr_qiymeti;
  end if;
  if v_local_semester is null then
    v_error_code := 'SEMESTER_SCORE_MISSING'; v_error_message := 'Local canonical semester score is unavailable.'; v_http_status := 409;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  if v_local_semester < 0 or v_local_semester > 50 then
    v_error_code := 'LOCAL_SEMESTER_INVALID'; v_error_message := 'Local semester score is outside the accepted range.'; v_http_status := 500;
    raise exception using errcode = 'P0001', message = v_error_code;
  end if;
  v_snapshot_mismatch := v_local_semester <> v_snapshot_score;

  if v_score_row.id is null then
    insert into public.exam_scores(
      user_id, course_id, semestr_qiymeti, imtahan_bali, yekun_qiymet, tedris_ili, semestr
    ) values (
      v_student_id, v_link.course_id, v_local_semester, v_current_score,
      least(100::numeric, v_local_semester + v_current_score),
      v_link.academic_year, v_link.semester
    )
    returning * into v_score_row;
    v_old_exam_score := null;
  else
    v_old_exam_score := v_score_row.imtahan_bali;
    update public.exam_scores es
    set semestr_qiymeti = v_local_semester,
        imtahan_bali = v_current_score,
        yekun_qiymet = least(100::numeric, v_local_semester + v_current_score)
    where es.id = v_score_row.id
    returning * into v_score_row;
  end if;

  -- Read the post-trigger values. enforce_ejournal_semester_score may have
  -- refreshed semestr_qiymeti/yekun_qiymet from canonical journal data.
  select es.* into v_score_row from public.exam_scores es where es.id = v_score_row.id;
  v_local_semester := v_score_row.semestr_qiymeti;
  v_final_score := v_score_row.yekun_qiymet;
  v_snapshot_mismatch := v_local_semester <> v_snapshot_score;

  insert into public.exam_detailed_results(
    source_result_id,
    student_id,
    student_username,
    exam_name,
    exam_type,
    total_questions,
    correct_count,
    wrong_count,
    unanswered_count,
    percentage,
    current_score,
    semester_score_snapshot,
    total_score,
    answers_data,
    exam_started_at,
    exam_completed_at,
    synced_at,
    official_exam_id,
    source_material_id,
    course_id,
    group_id,
    academic_year,
    semester,
    event_type,
    result_updated_at,
    official_payload_hash,
    sync_source,
    canonical_total_score,
    semester_snapshot_mismatch
  ) values (
    v_source_result_id,
    v_student_id,
    v_username,
    v_link.course_name_snapshot,
    v_link.exam_type,
    (p_payload->>'total_questions')::integer,
    (p_payload->>'correct_count')::integer,
    (p_payload->>'wrong_count')::integer,
    (p_payload->>'unanswered_count')::integer,
    (p_payload->>'percentage')::numeric,
    v_current_score,
    v_snapshot_score,
    v_official_total,
    coalesce(p_answers, '[]'::jsonb),
    v_started_at,
    v_completed_at,
    now(),
    v_official_exam_id,
    v_link.material_id,
    v_link.course_id,
    v_link.group_id,
    v_link.academic_year,
    v_link.semester,
    v_event_type,
    v_result_updated_at,
    p_payload_hash,
    'official_hmac',
    v_final_score,
    v_snapshot_mismatch
  )
  on conflict (source_result_id) do update set
    student_id = excluded.student_id,
    student_username = excluded.student_username,
    exam_name = excluded.exam_name,
    exam_type = excluded.exam_type,
    total_questions = excluded.total_questions,
    correct_count = excluded.correct_count,
    wrong_count = excluded.wrong_count,
    unanswered_count = excluded.unanswered_count,
    percentage = excluded.percentage,
    current_score = excluded.current_score,
    semester_score_snapshot = excluded.semester_score_snapshot,
    total_score = excluded.total_score,
    answers_data = excluded.answers_data,
    exam_started_at = excluded.exam_started_at,
    exam_completed_at = excluded.exam_completed_at,
    synced_at = excluded.synced_at,
    official_exam_id = excluded.official_exam_id,
    source_material_id = excluded.source_material_id,
    course_id = excluded.course_id,
    group_id = excluded.group_id,
    academic_year = excluded.academic_year,
    semester = excluded.semester,
    event_type = excluded.event_type,
    result_updated_at = excluded.result_updated_at,
    official_payload_hash = excluded.official_payload_hash,
    sync_source = excluded.sync_source,
    canonical_total_score = excluded.canonical_total_score,
    semester_snapshot_mismatch = excluded.semester_snapshot_mismatch
  returning id into v_detailed_id;

  insert into public.exam_integration_audit(
    direction, event_type, material_id, official_exam_id, source_result_id,
    course_id, group_id, student_id, status, error_code, details
  ) values (
    'official_to_atu', v_event_type, v_link.material_id, v_official_exam_id, v_source_result_id::text,
    v_link.course_id, v_link.group_id, v_student_id,
    case when v_snapshot_mismatch then 'success_warning' when v_is_duplicate then 'idempotent' else 'success' end,
    case when v_snapshot_mismatch then 'SEMESTER_SNAPSHOT_MISMATCH' else null end,
    jsonb_build_object(
      'old_exam_score', v_old_exam_score,
      'new_exam_score', v_score_row.imtahan_bali,
      'local_semester_score', v_local_semester,
      'semester_score_snapshot', v_snapshot_score,
      'canonical_final_score', v_final_score,
      'duplicate', v_is_duplicate
    )
  );

  return jsonb_build_object(
    'success', true,
    'status', case when v_is_duplicate then 'idempotent' when v_event_type = 'result.updated' then 'updated' else 'created' end,
    'source_result_id', v_source_result_id,
    'official_exam_id', v_official_exam_id,
    'detailed_result_id', v_detailed_id,
    'course_id', v_link.course_id,
    'group_id', v_link.group_id,
    'student_id', v_student_id,
    'exam_score', v_score_row.imtahan_bali,
    'semester_score', v_local_semester,
    'final_score', v_final_score,
    'semester_snapshot_mismatch', v_snapshot_mismatch
  );
exception when others then
  -- PL/pgSQL exception blocks roll back all writes in the protected block;
  -- the failure audit below is therefore recorded without partial score/result writes.
  begin
    insert into public.exam_integration_audit(
      direction, event_type, material_id, official_exam_id, source_result_id,
      course_id, group_id, student_id, status, error_code, details
    ) values (
      'official_to_atu', coalesce(v_event_type, 'result.unknown'),
      case when v_link.id is not null then v_link.material_id else v_source_material_id end,
      nullif(v_official_exam_id, ''),
      nullif(v_source_result_text, ''),
      case when v_link.id is not null then v_link.course_id else v_source_course_id end,
      case when v_link.id is not null then v_link.group_id else v_source_group_id end,
      v_student_id,
      'failed', v_error_code,
      jsonb_build_object('message', v_error_message)
    );
  exception when others then
    null;
  end;
  return jsonb_build_object(
    'success', false,
    'error_code', v_error_code,
    'message', v_error_message,
    'http_status', v_http_status
  );
end;
$$;

revoke all on function public.apply_official_exam_result(jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.apply_official_exam_result(jsonb, jsonb, text, text) to service_role;

comment on function public.apply_official_exam_result(jsonb, jsonb, text, text) is
  'Atomic service-role-only Official Portal result callback transaction. Validates local mapping/group membership and writes existing exam_detailed_results + exam_scores; teacher/student/tutor write permissions are unchanged.';
