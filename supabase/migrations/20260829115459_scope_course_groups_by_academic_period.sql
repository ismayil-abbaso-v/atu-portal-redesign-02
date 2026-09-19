alter table public.course_groups
  add column if not exists tedris_ili text,
  add column if not exists semestr smallint;

alter table public.course_groups
  drop constraint if exists course_groups_semestr_check;
alter table public.course_groups
  add constraint course_groups_semestr_check
  check (semestr is null or semestr in (1, 2));

with inferred as (
  select
    cg.id,
    min(es.tedris_ili) filter (where es.tedris_ili is not null) as tedris_ili,
    min(es.semestr) filter (where es.semestr is not null) as semestr
  from public.course_groups cg
  join public.group_members gm on gm.group_id = cg.group_id
  join public.exam_scores es
    on es.course_id = cg.course_id
   and es.user_id = gm.user_id
   and es.tedris_ili is not null
   and es.semestr in (1, 2)
  group by cg.id
  having count(distinct (es.tedris_ili, es.semestr)) = 1
)
update public.course_groups cg
set tedris_ili = i.tedris_ili,
    semestr = i.semestr
from inferred i
where i.id = cg.id
  and (cg.tedris_ili is null or cg.semestr is null);

create or replace function private.set_course_group_academic_period()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_year text;
  v_semester_text text;
  v_semester smallint;
begin
  if new.tedris_ili is not null and new.semestr is not null then
    return new;
  end if;

  select ss.cari_tedris_ili, ss.cari_semestr
    into v_year, v_semester_text
  from public.system_settings ss
  where ss.singleton is true
  order by ss.updated_at desc nulls last, ss.created_at desc nulls last
  limit 1;

  v_semester := case
    when lower(coalesce(v_semester_text, '')) in ('payız', 'payiz', 'fall', 'autumn') then 1
    when lower(coalesce(v_semester_text, '')) in ('yaz', 'spring') then 2
    else null
  end;

  if nullif(btrim(coalesce(v_year, '')), '') is null or v_semester is null then
    raise exception 'Yeni fənn-qrup əlaqəsi üçün cari tədris ili və semestr system_settings-də təyin edilməlidir.';
  end if;

  new.tedris_ili := coalesce(new.tedris_ili, v_year);
  new.semestr := coalesce(new.semestr, v_semester);
  return new;
end;
$$;

revoke all on function private.set_course_group_academic_period() from public, anon, authenticated;

drop trigger if exists set_course_group_academic_period on public.course_groups;
create trigger set_course_group_academic_period
before insert on public.course_groups
for each row
execute function private.set_course_group_academic_period();

do $$
declare
  v_year text;
  v_semester_text text;
  v_semester smallint;
begin
  select ss.cari_tedris_ili, ss.cari_semestr
    into v_year, v_semester_text
  from public.system_settings ss
  where ss.singleton is true
  order by ss.updated_at desc nulls last, ss.created_at desc nulls last
  limit 1;

  v_semester := case
    when lower(coalesce(v_semester_text, '')) in ('payız', 'payiz', 'fall', 'autumn') then 1
    when lower(coalesce(v_semester_text, '')) in ('yaz', 'spring') then 2
    else null
  end;

  if exists (select 1 from public.course_groups where tedris_ili is null or semestr is null) then
    if nullif(btrim(coalesce(v_year, '')), '') is null or v_semester is null then
      raise exception 'course_groups backfill tamamlanmadı və cari akademik dövr təyin edilməyib.';
    end if;
    update public.course_groups
       set tedris_ili = coalesce(tedris_ili, v_year),
           semestr = coalesce(semestr, v_semester)
     where tedris_ili is null or semestr is null;
  end if;
end;
$$;

alter table public.course_groups
  alter column tedris_ili set not null,
  alter column semestr set not null;

create index if not exists idx_course_groups_period_group
  on public.course_groups(group_id, tedris_ili, semestr);
create index if not exists idx_course_groups_period_course
  on public.course_groups(course_id, tedris_ili, semestr);

comment on column public.course_groups.tedris_ili is 'Fənn-qrup əlaqəsinin aid olduğu akademik il, məsələn 2026-2027.';
comment on column public.course_groups.semestr is 'Akademik semestr: 1=Payız, 2=Yaz.';
