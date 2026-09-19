-- The public login flow uses Supabase Auth / Edge Functions and does not need direct Data API table access.
-- Keep the anonymous DB role at zero privilege; authenticated users rely on explicit grants + RLS.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Remove inherited PUBLIC execute from application functions and make intended execution explicit.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure sig, p.prorettype='pg_catalog.trigger'::regtype as is_trigger,
           p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
  loop
    execute format('revoke all on function %s from public',r.sig);
    execute format('revoke all on function %s from anon',r.sig);

    if not r.is_trigger then
      if r.sig::text in ('get_email_by_username(text)','get_user_id_by_username(text)') then
        execute format('revoke all on function %s from authenticated',r.sig);
        execute format('grant execute on function %s to service_role',r.sig);
      else
        execute format('grant execute on function %s to authenticated,service_role',r.sig);
      end if;
    else
      execute format('revoke all on function %s from authenticated',r.sig);
    end if;
  end loop;
end $$;