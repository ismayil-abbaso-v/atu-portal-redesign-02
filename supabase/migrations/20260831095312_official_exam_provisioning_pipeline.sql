-- Prompt 2/3: asynchronous ATU -> Official Portal provisioning pipeline.
-- Secrets and fresh signed URLs remain server-side only.

alter table public.official_exam_links
  drop constraint if exists official_exam_links_sync_status_check;
alter table public.official_exam_links
  add constraint official_exam_links_sync_status_check
  check (sync_status in ('pending','processing','synced','partial','retry','failed_permanent'));

alter table public.official_exam_links
  add column if not exists matched_student_count integer not null default 0,
  add column if not exists unmatched_student_count integer not null default 0;
alter table public.official_exam_links
  drop constraint if exists official_exam_links_matched_student_count_check,
  drop constraint if exists official_exam_links_unmatched_student_count_check;
alter table public.official_exam_links
  add constraint official_exam_links_matched_student_count_check check (matched_student_count >= 0),
  add constraint official_exam_links_unmatched_student_count_check check (unmatched_student_count >= 0);

create unique index if not exists official_exam_sync_outbox_one_open_event_uidx
  on public.official_exam_sync_outbox(material_id,event_type)
  where status in ('pending','processing','retry');

create table if not exists private.official_exam_worker_auth (
  singleton boolean primary key default true check (singleton),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);
revoke all on table private.official_exam_worker_auth from public, anon, authenticated;
grant all on table private.official_exam_worker_auth to service_role;

do $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'official_exam_worker_token'
  order by created_at desc
  limit 1;

  if v_token is null then
    v_token := encode(gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      v_token,
      'official_exam_worker_token',
      'Internal token for ATU official exam outbox worker. Never expose to clients.'
    );
  end if;

  insert into private.official_exam_worker_auth(singleton,token_hash,updated_at)
  values (true, encode(digest(v_token,'sha256'),'hex'), now())
  on conflict (singleton) do update
    set token_hash = excluded.token_hash,
        updated_at = now();
end $$;

create or replace function public.verify_official_exam_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public, private, extensions, pg_temp
as $$
  select exists (
    select 1
    from private.official_exam_worker_auth a
    where a.singleton = true
      and a.token_hash = encode(digest(coalesce(p_token,''),'sha256'),'hex')
  );
$$;
revoke all on function public.verify_official_exam_worker_token(text) from public, anon, authenticated;
grant execute on function public.verify_official_exam_worker_token(text) to service_role;

create or replace function public.claim_official_exam_outbox(p_limit integer default 5)
returns table(id uuid, material_id uuid, event_type text, attempt_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.official_exam_sync_outbox o
    where o.status = 'pending'
       or (o.status = 'retry' and coalesce(o.next_retry_at, now()) <= now())
    order by coalesce(o.next_retry_at, o.created_at), o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,5),20))
  ), updated as (
    update public.official_exam_sync_outbox o
       set status = 'processing',
           attempt_count = o.attempt_count + 1,
           next_retry_at = null,
           updated_at = now()
      from candidates c
     where o.id = c.id
     returning o.id, o.material_id, o.event_type, o.attempt_count
  )
  select u.id,u.material_id,u.event_type,u.attempt_count from updated u;
end;
$$;
revoke all on function public.claim_official_exam_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_official_exam_outbox(integer) to service_role;

create or replace function public.official_semester_score_export(
  p_course_id uuid,
  p_group_id uuid,
  p_academic_year text,
  p_semester smallint
)
returns table(user_id uuid, student_username text, semester_score numeric)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  r record;
  v_score numeric;
begin
  if p_academic_year !~ '^[0-9]{4}-[0-9]{4}$' or p_semester not in (1,2) then
    raise exception using errcode='22023', message='PERIOD_MISMATCH';
  end if;

  if not exists (
    select 1 from public.course_groups cg
    where cg.course_id=p_course_id and cg.group_id=p_group_id
      and cg.tedris_ili=p_academic_year and cg.semestr=p_semester
  ) then
    raise exception using errcode='22023', message='COURSE_GROUP_SCOPE_MISMATCH';
  end if;

  for r in
    select gm.user_id, lower(btrim(p.istifadeci_adi)) as username
    from public.group_members gm
    join public.profiles p on p.user_id=gm.user_id
    where gm.group_id=p_group_id
      and p.status='AKTİV'
      and public.is_course_student(p_course_id,gm.user_id)
    order by lower(btrim(p.istifadeci_adi))
  loop
    if r.username is null or r.username='' then
      raise exception using errcode='22023', message='STUDENT_USERNAME_MISSING';
    end if;

    v_score := private.calculate_semester_score(p_course_id,r.user_id);
    if v_score is null then
      select es.semestr_qiymeti into v_score
      from public.exam_scores es
      where es.user_id=r.user_id
        and es.course_id=p_course_id
        and es.tedris_ili=p_academic_year
        and es.semestr=p_semester
      order by es.created_at desc
      limit 1;
    end if;

    if v_score is null then
      raise exception using errcode='22023', message='SEMESTER_SCORE_MISSING';
    end if;
    if v_score < 0 or v_score > 50 then
      raise exception using errcode='22023', message='INVALID_SCORE';
    end if;

    user_id := r.user_id;
    student_username := r.username;
    semester_score := v_score;
    return next;
  end loop;
end;
$$;
revoke all on function public.official_semester_score_export(uuid,uuid,text,smallint) from public, anon, authenticated;
grant execute on function public.official_semester_score_export(uuid,uuid,text,smallint) to service_role;

create or replace function private.enqueue_official_material_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_event text;
begin
  v_event := case when tg_op='INSERT' then 'exam.provision' else 'exam.update' end;
  insert into public.official_exam_sync_outbox(material_id,event_type,status)
  values (new.id,v_event,'pending')
  on conflict do nothing;
  return new;
end;
$$;

create or replace function private.enqueue_official_semester_score_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.course_id is null or new.tedris_ili is null or new.semestr is null then
    return new;
  end if;
  if tg_op='UPDATE' and new.semestr_qiymeti is not distinct from old.semestr_qiymeti then
    return new;
  end if;

  insert into public.official_exam_sync_outbox(material_id,event_type,status)
  select l.material_id,'semester_scores.updated','pending'
  from public.official_exam_links l
  join public.group_members gm on gm.group_id=l.group_id and gm.user_id=new.user_id
  where l.course_id=new.course_id
    and l.academic_year=new.tedris_ili
    and l.semester=new.semestr
    and l.official_exam_id is not null
    and l.sync_status in ('synced','partial','retry')
  on conflict do nothing;
  return new;
end;
$$;

create or replace function private.enqueue_official_schedule_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid := coalesce(new.course_id,old.course_id);
  v_group_id uuid := coalesce(new.group_id,old.group_id);
begin
  insert into public.official_exam_sync_outbox(material_id,event_type,status)
  select l.material_id,'exam.update','pending'
  from public.official_exam_links l
  where l.course_id=v_course_id
    and l.group_id=v_group_id
    and l.official_exam_id is not null
    and l.sync_status in ('synced','partial','retry')
  on conflict do nothing;
  return coalesce(new,old);
end;
$$;

create or replace function private.dispatch_official_exam_worker()
returns trigger
language plpgsql
security definer
set search_path = public, private, vault, net, pg_temp
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='official_exam_worker_token'
  order by created_at desc
  limit 1;
  if v_token is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://tdxrpbrcgricqqfdytyg.supabase.co/functions/v1/process-official-exam-outbox',
    body := jsonb_build_object('limit',1),
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-atu-worker-token',v_token
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function private.enqueue_official_material_change() from public, anon, authenticated;
revoke all on function private.enqueue_official_semester_score_refresh() from public, anon, authenticated;
revoke all on function private.enqueue_official_schedule_refresh() from public, anon, authenticated;
revoke all on function private.dispatch_official_exam_worker() from public, anon, authenticated;

drop trigger if exists exam_materials_enqueue_official_insert on public.exam_materials;
create trigger exam_materials_enqueue_official_insert
after insert on public.exam_materials
for each row execute function private.enqueue_official_material_change();

drop trigger if exists exam_materials_enqueue_official_update on public.exam_materials;
create trigger exam_materials_enqueue_official_update
after update of file_path,original_file_name,mime_type,file_size,exam_type on public.exam_materials
for each row execute function private.enqueue_official_material_change();

drop trigger if exists exam_scores_enqueue_official_semester_refresh on public.exam_scores;
create trigger exam_scores_enqueue_official_semester_refresh
after insert or update of semestr_qiymeti on public.exam_scores
for each row execute function private.enqueue_official_semester_score_refresh();

drop trigger if exists exam_schedule_enqueue_official_refresh on public.exam_schedule;
create trigger exam_schedule_enqueue_official_refresh
after insert or update or delete on public.exam_schedule
for each row execute function private.enqueue_official_schedule_refresh();

drop trigger if exists official_exam_outbox_dispatch_worker on public.official_exam_sync_outbox;
create trigger official_exam_outbox_dispatch_worker
after insert on public.official_exam_sync_outbox
for each row execute function private.dispatch_official_exam_worker();

select cron.unschedule('official-exam-outbox-worker')
where exists (select 1 from cron.job where jobname='official-exam-outbox-worker');
select cron.schedule(
  'official-exam-outbox-worker',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://tdxrpbrcgricqqfdytyg.supabase.co/functions/v1/process-official-exam-outbox',
    body := jsonb_build_object('limit',5),
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-atu-worker-token',(
        select decrypted_secret from vault.decrypted_secrets
        where name='official_exam_worker_token'
        order by created_at desc limit 1
      )
    ),
    timeout_milliseconds := 50000
  );
  $cron$
);
