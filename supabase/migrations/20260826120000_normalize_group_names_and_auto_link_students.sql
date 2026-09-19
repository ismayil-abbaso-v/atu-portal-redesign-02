create or replace function public.normalize_group_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(p_name,'')), '\s+', '', 'g')), '');
$$;

create unique index if not exists groups_ad_normalized_unique_idx
on public.groups (public.normalize_group_name(ad));

create or replace function public.sync_profile_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  normalized text;
begin
  normalized := public.normalize_group_name(new.qrup);

  delete from public.group_members gm
  where gm.user_id = new.user_id
    and (normalized is null or gm.group_id not in (
      select g.id from public.groups g
      where public.normalize_group_name(g.ad) = normalized
    ));

  if normalized is not null then
    select g.id into gid
    from public.groups g
    where public.normalize_group_name(g.ad) = normalized
    order by g.created_at asc
    limit 1;

    if gid is not null then
      insert into public.group_members(group_id, user_id)
      values (gid, new.user_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_group_membership on public.profiles;
create trigger trg_sync_profile_group_membership
after insert or update of qrup, user_id on public.profiles
for each row execute function public.sync_profile_group_membership();

create or replace function public.sync_group_members_for_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members(group_id, user_id)
  select new.id, p.user_id
  from public.profiles p
  where public.normalize_group_name(p.qrup) = public.normalize_group_name(new.ad)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_sync_group_members_for_new_group on public.groups;
create trigger trg_sync_group_members_for_new_group
after insert or update of ad on public.groups
for each row execute function public.sync_group_members_for_new_group();

insert into public.group_members(group_id, user_id)
select g.id, p.user_id
from public.groups g
join public.profiles p
  on public.normalize_group_name(g.ad) = public.normalize_group_name(p.qrup)
on conflict do nothing;
