-- Built-in-only immutable helper gets an explicit safe search path.
create or replace function public.normalize_group_name(p_name text)
returns text
language sql
immutable
set search_path = pg_catalog,pg_temp
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(p_name,'')), '\s+', '', 'g')), '');
$$;

-- Remove implicit PUBLIC/anon access from every privileged public function.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature,p.prorettype='pg_catalog.trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public',r.signature);
    execute format('revoke all on function %s from anon',r.signature);
    if r.is_trigger then
      execute format('revoke all on function %s from authenticated',r.signature);
      execute format('revoke all on function %s from service_role',r.signature);
    else
      execute format('grant execute on function %s to authenticated',r.signature);
      execute format('grant execute on function %s to service_role',r.signature);
    end if;
  end loop;
end $$;

-- Username-to-identity mapping is server-side only. The public login page uses an Edge Function,
-- and exam sync also uses the service-role Edge Function.
revoke all on function public.get_email_by_username(text) from authenticated;
revoke all on function public.get_user_id_by_username(text) from authenticated;
grant execute on function public.get_email_by_username(text) to service_role;
grant execute on function public.get_user_id_by_username(text) to service_role;

-- Keep normal SQL helper explicitly available where RLS and app code need it.
revoke all on function public.normalize_group_name(text) from public,anon;
grant execute on function public.normalize_group_name(text) to authenticated,service_role;