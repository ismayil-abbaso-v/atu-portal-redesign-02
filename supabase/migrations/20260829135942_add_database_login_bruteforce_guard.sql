create table if not exists private.login_attempts (
  account_key text primary key,
  user_id uuid null,
  failed_attempts smallint not null default 0,
  last_failed_at timestamptz null,
  locked_until timestamptz null,
  updated_at timestamptz not null default now(),
  constraint login_attempts_account_key_check check (length(account_key) = 64),
  constraint login_attempts_failed_attempts_check check (failed_attempts between 0 and 10)
);

create table if not exists private.login_attempt_reservations (
  attempt_id uuid primary key,
  account_key text not null references private.login_attempts(account_key) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists login_attempt_reservations_account_key_idx
  on private.login_attempt_reservations(account_key, created_at);

alter table private.login_attempts enable row level security;
alter table private.login_attempt_reservations enable row level security;

revoke all on table private.login_attempts from public, anon, authenticated, service_role;
revoke all on table private.login_attempt_reservations from public, anon, authenticated, service_role;

create or replace function private.resolve_login_account(p_identifier text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identifier text := lower(btrim(coalesce(p_identifier, '')));
  v_user_id uuid;
  v_email text;
  v_material text;
  v_key text;
begin
  if v_identifier = '' or length(v_identifier) > 255 then
    return jsonb_build_object('account_key', null, 'user_id', null, 'email', null);
  end if;

  select p.user_id, coalesce(u.email, p.e_poct)
    into v_user_id, v_email
  from public.profiles p
  left join auth.users u on u.id = p.user_id
  where lower(btrim(p.istifadeci_adi)) = v_identifier
  limit 1;

  if v_user_id is null then
    select u.id, u.email
      into v_user_id, v_email
    from auth.users u
    where lower(btrim(u.email)) = v_identifier
    limit 1;
  end if;

  if v_user_id is not null then
    v_material := 'user:' || v_user_id::text;
  else
    v_material := 'identifier:' || v_identifier;
    v_email := null;
  end if;

  v_key := encode(extensions.digest(convert_to(v_material, 'UTF8'), 'sha256'), 'hex');

  return jsonb_build_object(
    'account_key', v_key,
    'user_id', v_user_id,
    'email', v_email
  );
end;
$$;

create or replace function private.login_guard_begin(p_identifier text, p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_resolved jsonb;
  v_key text;
  v_user_id uuid;
  v_email text;
  v_failed smallint;
  v_last_failed timestamptz;
  v_locked_until timestamptz;
  v_active_reservations integer;
begin
  if p_attempt_id is null then
    return jsonb_build_object('allowed', false, 'code', 'INVALID_REQUEST');
  end if;

  v_resolved := private.resolve_login_account(p_identifier);
  v_key := v_resolved ->> 'account_key';
  v_email := v_resolved ->> 'email';

  if v_key is null then
    return jsonb_build_object('allowed', false, 'code', 'INVALID_REQUEST');
  end if;

  if nullif(v_resolved ->> 'user_id', '') is not null then
    v_user_id := (v_resolved ->> 'user_id')::uuid;
  end if;

  insert into private.login_attempts(account_key, user_id)
  values (v_key, v_user_id)
  on conflict (account_key) do update
    set user_id = coalesce(excluded.user_id, private.login_attempts.user_id);

  select a.failed_attempts, a.last_failed_at, a.locked_until
    into v_failed, v_last_failed, v_locked_until
  from private.login_attempts a
  where a.account_key = v_key
  for update;

  delete from private.login_attempt_reservations r
  where r.account_key = v_key
    and r.created_at < v_now - interval '5 minutes';

  if (v_locked_until is not null and v_locked_until <= v_now)
     or (v_locked_until is null and v_last_failed is not null and v_last_failed <= v_now - interval '1 hour') then
    update private.login_attempts
       set failed_attempts = 0,
           last_failed_at = null,
           locked_until = null,
           updated_at = v_now
     where account_key = v_key;
    delete from private.login_attempt_reservations where account_key = v_key;
    v_failed := 0;
    v_last_failed := null;
    v_locked_until := null;
  end if;

  if v_locked_until is not null and v_locked_until > v_now then
    return jsonb_build_object(
      'allowed', false,
      'code', 'ACCOUNT_LOCKED',
      'remaining_attempts', 0,
      'locked_until', v_locked_until
    );
  end if;

  select count(*)::integer
    into v_active_reservations
  from private.login_attempt_reservations r
  where r.account_key = v_key;

  if v_failed + v_active_reservations >= 10 then
    return jsonb_build_object(
      'allowed', false,
      'code', 'TRY_AGAIN',
      'remaining_attempts', greatest(0, 10 - v_failed)
    );
  end if;

  insert into private.login_attempt_reservations(attempt_id, account_key, created_at)
  values (p_attempt_id, v_key, v_now);

  return jsonb_build_object(
    'allowed', true,
    'code', 'OK',
    'email', v_email,
    'remaining_attempts', greatest(0, 10 - v_failed)
  );
end;
$$;

create or replace function private.login_guard_failure(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_failed smallint;
  v_new_failed smallint;
  v_locked_until timestamptz;
begin
  select r.account_key
    into v_key
  from private.login_attempt_reservations r
  where r.attempt_id = p_attempt_id
  for update;

  if v_key is null then
    return jsonb_build_object('processed', false, 'code', 'STALE_ATTEMPT');
  end if;

  select a.failed_attempts
    into v_failed
  from private.login_attempts a
  where a.account_key = v_key
  for update;

  if not found then
    delete from private.login_attempt_reservations where attempt_id = p_attempt_id;
    return jsonb_build_object('processed', false, 'code', 'STALE_ATTEMPT');
  end if;

  delete from private.login_attempt_reservations where attempt_id = p_attempt_id;

  v_new_failed := least(10, v_failed + 1);
  if v_new_failed >= 10 then
    v_locked_until := v_now + interval '1 hour';
  else
    v_locked_until := null;
  end if;

  update private.login_attempts
     set failed_attempts = v_new_failed,
         last_failed_at = v_now,
         locked_until = v_locked_until,
         updated_at = v_now
   where account_key = v_key;

  if v_locked_until is not null then
    return jsonb_build_object(
      'processed', true,
      'code', 'ACCOUNT_LOCKED',
      'remaining_attempts', 0,
      'locked_until', v_locked_until
    );
  end if;

  return jsonb_build_object(
    'processed', true,
    'code', 'INVALID_CREDENTIALS',
    'remaining_attempts', 10 - v_new_failed,
    'locked_until', null
  );
end;
$$;

create or replace function private.login_guard_success(p_attempt_id uuid, p_identifier text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_resolved jsonb;
  v_key text;
begin
  v_resolved := private.resolve_login_account(p_identifier);
  v_key := v_resolved ->> 'account_key';

  if v_key is null then
    return jsonb_build_object('processed', false);
  end if;

  perform 1
  from private.login_attempts a
  where a.account_key = v_key
  for update;

  delete from private.login_attempt_reservations where account_key = v_key;
  delete from private.login_attempts where account_key = v_key;

  return jsonb_build_object('processed', true, 'remaining_attempts', 10);
end;
$$;

create or replace function public.login_guard_begin(p_identifier text, p_attempt_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.login_guard_begin($1, $2);
$$;

create or replace function public.login_guard_failure(p_attempt_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.login_guard_failure($1);
$$;

create or replace function public.login_guard_success(p_attempt_id uuid, p_identifier text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.login_guard_success($1, $2);
$$;

revoke all on function private.resolve_login_account(text) from public, anon, authenticated;
revoke all on function private.login_guard_begin(text, uuid) from public, anon, authenticated;
revoke all on function private.login_guard_failure(uuid) from public, anon, authenticated;
revoke all on function private.login_guard_success(uuid, text) from public, anon, authenticated;

grant execute on function private.resolve_login_account(text) to service_role;
grant execute on function private.login_guard_begin(text, uuid) to service_role;
grant execute on function private.login_guard_failure(uuid) to service_role;
grant execute on function private.login_guard_success(uuid, text) to service_role;

revoke all on function public.login_guard_begin(text, uuid) from public, anon, authenticated;
revoke all on function public.login_guard_failure(uuid) from public, anon, authenticated;
revoke all on function public.login_guard_success(uuid, text) from public, anon, authenticated;
grant execute on function public.login_guard_begin(text, uuid) to service_role;
grant execute on function public.login_guard_failure(uuid) to service_role;
grant execute on function public.login_guard_success(uuid, text) to service_role;
