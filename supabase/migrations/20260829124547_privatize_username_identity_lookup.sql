create or replace function private.get_email_by_username(p_istifadeci_adi text)
returns text
language sql stable security definer
set search_path=''
as $$
  select p.e_poct
  from public.profiles p
  where p.e_poct is not null
    and lower(p.istifadeci_adi)=lower(trim(p_istifadeci_adi))
  limit 1;
$$;

create or replace function private.get_user_id_by_username(p_istifadeci_adi text)
returns uuid
language sql stable security definer
set search_path=''
as $$
  select p.user_id
  from public.profiles p
  where lower(p.istifadeci_adi)=lower(trim(p_istifadeci_adi))
  limit 1;
$$;

revoke all on function private.get_email_by_username(text), private.get_user_id_by_username(text) from public,anon,authenticated;
grant execute on function private.get_email_by_username(text), private.get_user_id_by_username(text) to service_role;

create or replace function public.get_email_by_username(p_istifadeci_adi text)
returns text
language sql stable security invoker
set search_path=''
as $$ select private.get_email_by_username($1); $$;

create or replace function public.get_user_id_by_username(p_istifadeci_adi text)
returns uuid
language sql stable security invoker
set search_path=''
as $$ select private.get_user_id_by_username($1); $$;

revoke all on function public.get_email_by_username(text), public.get_user_id_by_username(text) from public,anon,authenticated;
grant execute on function public.get_email_by_username(text), public.get_user_id_by_username(text) to service_role;