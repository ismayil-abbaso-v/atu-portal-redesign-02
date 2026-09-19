-- Prompt 1/3 regression checks for the ATU-side integration foundation.
-- Safe to run repeatedly: this file performs assertions only.

do $$
declare
  v_count integer;
  v_relrowsecurity boolean;
  v_indexdef text;
  v_bucket_public boolean;
  v_bucket_limit bigint;
  v_bucket_mimes text[];
begin
  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('official_exam_links', 'official_exam_sync_outbox', 'exam_integration_audit')
    and c.relkind = 'r';
  if v_count <> 3 then
    raise exception 'Integration tables missing: expected 3, found %', v_count;
  end if;

  for v_relrowsecurity in
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('official_exam_links', 'official_exam_sync_outbox', 'exam_integration_audit')
  loop
    if not v_relrowsecurity then
      raise exception 'RLS must be enabled on every integration table';
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.official_exam_links'::regclass
      and contype = 'u'
      and conname = 'official_exam_links_material_key'
  ) then
    raise exception 'material_id UNIQUE is missing';
  end if;

  select pg_get_indexdef(indexrelid) into v_indexdef
  from pg_index
  where indexrelid = 'public.official_exam_links_official_exam_id_uidx'::regclass;
  if v_indexdef is null or v_indexdef not ilike '%UNIQUE%' or v_indexdef not ilike '%official_exam_id%' then
    raise exception 'official_exam_id partial UNIQUE is missing';
  end if;

  select pg_get_indexdef(indexrelid) into v_indexdef
  from pg_index
  where indexrelid = 'public.official_exam_links_one_active_scope_uidx'::regclass;
  if v_indexdef is null
     or v_indexdef not ilike '%course_id%'
     or v_indexdef not ilike '%group_id%'
     or v_indexdef not ilike '%academic_year%'
     or v_indexdef not ilike '%semester%'
     or v_indexdef not ilike '%failed_permanent%' then
    raise exception 'active official-exam scope UNIQUE is missing or malformed';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.official_exam_sync_outbox'::regclass
      and conname = 'official_exam_sync_outbox_event_type_check'
      and pg_get_constraintdef(oid, true) like '%exam.provision%'
      and pg_get_constraintdef(oid, true) like '%exam.update%'
      and pg_get_constraintdef(oid, true) like '%semester_scores.updated%'
  ) then
    raise exception 'outbox event enum/check is incomplete';
  end if;

  if has_table_privilege('authenticated', 'public.official_exam_links', 'INSERT')
     or has_table_privilege('authenticated', 'public.official_exam_links', 'UPDATE')
     or has_table_privilege('authenticated', 'public.official_exam_links', 'DELETE')
     or has_table_privilege('authenticated', 'public.official_exam_sync_outbox', 'INSERT')
     or has_table_privilege('authenticated', 'public.official_exam_sync_outbox', 'UPDATE')
     or has_table_privilege('authenticated', 'public.official_exam_sync_outbox', 'DELETE')
     or has_table_privilege('authenticated', 'public.exam_integration_audit', 'INSERT')
     or has_table_privilege('authenticated', 'public.exam_integration_audit', 'UPDATE')
     or has_table_privilege('authenticated', 'public.exam_integration_audit', 'DELETE') then
    raise exception 'authenticated must not mutate integration internals';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'official_exam_links'
      and policyname = 'official_exam_links_read_scope'
      and cmd = 'SELECT'
      and qual like '%is_course_teacher%'
  ) then
    raise exception 'teacher scoped read-only mapping policy is missing';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('official_exam_links', 'official_exam_sync_outbox', 'exam_integration_audit')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'authenticated' = any(roles)
  ) then
    raise exception 'authenticated mutation RLS policy unexpectedly exists';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'exam_scores'
      and pn.nspname = 'private'
      and p.proname = 'enforce_teacher_exam_score_scope'
  ) then
    raise exception 'existing teacher exam-score write guard is missing';
  end if;

  select public, file_size_limit, allowed_mime_types
  into v_bucket_public, v_bucket_limit, v_bucket_mimes
  from storage.buckets
  where id = 'exam-materials';

  if v_bucket_public is distinct from false then
    raise exception 'exam-materials bucket must stay private';
  end if;
  if v_bucket_limit is distinct from 20971520 then
    raise exception 'exam-materials bucket must keep 20 MiB limit';
  end if;
  if v_bucket_mimes is null
     or not ('application/vnd.openxmlformats-officedocument.wordprocessingml.document' = any(v_bucket_mimes)) then
    raise exception 'exam-materials bucket must remain DOCX-only';
  end if;
end
$$;
