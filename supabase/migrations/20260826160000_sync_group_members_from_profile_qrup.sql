create or replace function public.sync_profile_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.group_members
  where user_id = new.user_id;

  if nullif(trim(new.qrup), '') is not null then
    insert into public.group_members (group_id, user_id)
    select g.id, new.user_id
    from public.groups g
    where lower(trim(g.ad)) = lower(trim(new.qrup))
    limit 1
    on conflict (group_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_group_membership on public.profiles;
create trigger trg_sync_profile_group_membership
after insert or update of qrup on public.profiles
for each row execute function public.sync_profile_group_membership();

insert into public.group_members (group_id, user_id)
select g.id, p.user_id
from public.profiles p
join public.groups g on lower(trim(g.ad)) = lower(trim(p.qrup))
where nullif(trim(p.qrup), '') is not null
  and not exists (
    select 1 from public.group_members gm
    where gm.group_id = g.id and gm.user_id = p.user_id
  )
on conflict (group_id, user_id) do nothing;

delete from public.group_members gm
where not exists (
  select 1
  from public.profiles p
  join public.groups g on lower(trim(g.ad)) = lower(trim(p.qrup))
  where p.user_id = gm.user_id
    and g.id = gm.group_id
    and nullif(trim(p.qrup), '') is not null
);
