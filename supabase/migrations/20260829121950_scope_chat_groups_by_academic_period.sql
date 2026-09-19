alter table public.chat_groups add column if not exists group_id uuid;
alter table public.chat_groups add column if not exists tedris_ili text;
alter table public.chat_groups add column if not exists semestr smallint;
alter table public.chat_groups add column if not exists arxivlenib boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='chat_groups_group_id_fkey' and conrelid='public.chat_groups'::regclass) then
    alter table public.chat_groups add constraint chat_groups_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='chat_groups_semestr_check' and conrelid='public.chat_groups'::regclass) then
    alter table public.chat_groups add constraint chat_groups_semestr_check check (semestr is null or semestr in (1,2));
  end if;
  if not exists (select 1 from pg_constraint where conname='chat_groups_course_scope_check' and conrelid='public.chat_groups'::regclass) then
    alter table public.chat_groups add constraint chat_groups_course_scope_check check (
      course_id is null or (group_id is not null and tedris_ili is not null and semestr is not null)
    ) not valid;
  end if;
end $$;

with mapped as (
  select distinct on (cgl.course_id)
    cgl.course_id,cgl.group_id,cgl.tedris_ili,cgl.semestr
  from public.course_groups cgl
  order by cgl.course_id,cgl.tedris_ili desc,cgl.semestr desc,cgl.id
)
update public.chat_groups cg
set group_id=m.group_id,tedris_ili=m.tedris_ili,semestr=m.semestr
from mapped m
where cg.course_id=m.course_id
  and (cg.group_id is null or cg.tedris_ili is null or cg.semestr is null);

alter table public.chat_groups validate constraint chat_groups_course_scope_check;
create unique index if not exists uq_chat_groups_course_group_period
  on public.chat_groups(course_id,group_id,tedris_ili,semestr)
  where course_id is not null;
create index if not exists idx_chat_groups_group_id on public.chat_groups(group_id);
create index if not exists idx_chat_groups_period on public.chat_groups(tedris_ili,semestr);
create index if not exists idx_chat_group_members_user_id on public.chat_group_members(user_id);
create index if not exists idx_chat_messages_chat_group_id on public.chat_messages(chat_group_id);
create index if not exists idx_chat_messages_gonderen_id on public.chat_messages(gonderen_id);

drop trigger if exists trigger_course_chat_group on public.courses;

create or replace function public.sync_course_group_members_to_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat_group_id uuid;
  v_course_name text;
begin
  select c.ad into v_course_name from public.courses c where c.id=new.course_id;

  insert into public.chat_groups(ad,course_id,group_id,tedris_ili,semestr,dogrulanmis,arxivlenib)
  values (coalesce(v_course_name,'Fənn söhbəti'),new.course_id,new.group_id,new.tedris_ili,new.semestr,true,false)
  on conflict (course_id,group_id,tedris_ili,semestr) where course_id is not null
  do update set ad=excluded.ad
  returning id into v_chat_group_id;

  insert into public.chat_group_members(chat_group_id,user_id)
  select v_chat_group_id,gm.user_id from public.group_members gm where gm.group_id=new.group_id
  on conflict (chat_group_id,user_id) do nothing;

  insert into public.chat_group_members(chat_group_id,user_id)
  select v_chat_group_id,ct.muellim_id from public.course_teachers ct where ct.course_id=new.course_id
  on conflict (chat_group_id,user_id) do nothing;

  insert into public.chat_group_members(chat_group_id,user_id)
  select v_chat_group_id,c.muellim_id from public.courses c where c.id=new.course_id and c.muellim_id is not null
  on conflict (chat_group_id,user_id) do nothing;

  insert into public.chat_group_members(chat_group_id,user_id)
  select v_chat_group_id,g.tyutor_id from public.groups g where g.id=new.group_id and g.tyutor_id is not null
  on conflict (chat_group_id,user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_course_group_sync on public.course_groups;
create trigger trigger_course_group_sync
after insert or update of course_id,group_id,tedris_ili,semestr on public.course_groups
for each row execute function public.sync_course_group_members_to_chat();

create or replace function public.sync_new_group_member_to_chats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_group_members(chat_group_id,user_id)
  select cg.id,new.user_id
  from public.chat_groups cg
  join public.system_settings ss on ss.singleton is true
  where cg.group_id=new.group_id
    and cg.tedris_ili=ss.cari_tedris_ili
    and cg.semestr=case
      when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
      when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
      else null end
    and not cg.arxivlenib
  on conflict (chat_group_id,user_id) do nothing;
  return new;
end;
$$;

create or replace function public.chat_group_accessible(_chat_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_groups cg
    left join public.system_settings ss on ss.singleton is true
    where cg.id=_chat_group_id
      and (
        public.has_role((select auth.uid()),'admin'::public.app_role)
        or public.is_course_teacher(cg.course_id,(select auth.uid()))
        or public.is_course_tutor(cg.course_id,(select auth.uid()))
        or (
          exists(select 1 from public.chat_group_members cgm where cgm.chat_group_id=cg.id and cgm.user_id=(select auth.uid()))
          and (
            cg.course_id is null
            or (
              cg.tedris_ili=ss.cari_tedris_ili
              and cg.semestr=case
                when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
                when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
                else null end
              and not cg.arxivlenib
            )
          )
        )
      )
  );
$$;
revoke all on function public.chat_group_accessible(uuid) from public,anon;
grant execute on function public.chat_group_accessible(uuid) to authenticated,service_role;

drop policy if exists chat_groups_select on public.chat_groups;
create policy chat_groups_select on public.chat_groups for select to authenticated
using (
  public.has_role((select auth.uid()),'admin'::public.app_role)
  or public.is_course_teacher(course_id,(select auth.uid()))
  or public.is_course_tutor(course_id,(select auth.uid()))
  or public.chat_group_accessible(id)
);

drop policy if exists chat_group_members_select on public.chat_group_members;
create policy chat_group_members_select on public.chat_group_members for select to authenticated
using (public.chat_group_accessible(chat_group_id));

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select to authenticated
using (public.chat_group_accessible(chat_group_id));

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
with check (gonderen_id=(select auth.uid()) and public.chat_group_accessible(chat_group_id));

drop policy if exists chat_groups_insert on public.chat_groups;
drop policy if exists chat_groups_update on public.chat_groups;
drop policy if exists chat_groups_delete on public.chat_groups;
create policy chat_groups_insert on public.chat_groups for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role));
create policy chat_groups_update on public.chat_groups for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role))
with check (public.has_role((select auth.uid()),'admin'::public.app_role));
create policy chat_groups_delete on public.chat_groups for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role));

drop policy if exists chat_group_members_insert on public.chat_group_members;
drop policy if exists chat_group_members_delete on public.chat_group_members;
create policy chat_group_members_insert on public.chat_group_members for insert to authenticated
with check (public.has_role((select auth.uid()),'admin'::public.app_role));
create policy chat_group_members_delete on public.chat_group_members for delete to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role));

create or replace function public.is_chat_member_for_file(path text,user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_group_id uuid;
begin
  if (select auth.uid()) is null or user_id is distinct from (select auth.uid()) then return false; end if;
  begin v_group_id := split_part(path,'/',1)::uuid;
  exception when others then return false; end;
  return public.chat_group_accessible(v_group_id);
end;
$$;
revoke all on function public.is_chat_member_for_file(text,uuid) from public,anon;
grant execute on function public.is_chat_member_for_file(text,uuid) to authenticated,service_role;

create or replace view public.chat_group_last_message
with (security_invoker=true)
as
select distinct on (m.chat_group_id)
  m.chat_group_id,m.id as message_id,m.metin,m.fayl_url,m.fayl_novu,m.gonderen_id,m.created_at
from public.chat_messages m
order by m.chat_group_id,m.created_at desc;
grant select on public.chat_group_last_message to authenticated,service_role;