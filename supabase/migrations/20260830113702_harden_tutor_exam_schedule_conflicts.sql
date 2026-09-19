create or replace function private.exam_schedule_is_current_pair(
  p_group_id uuid,
  p_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
as $function$
  select exists (
    select 1
    from public.course_groups cg
    join public.groups g on g.id = cg.group_id
    join public.system_settings ss on ss.singleton is true
    where cg.group_id = p_group_id
      and cg.course_id = p_course_id
      and g.arxivlenib is false
      and cg.tedris_ili = ss.cari_tedris_ili
      and cg.semestr = case
        when lower(coalesce(ss.cari_semestr, '')) in ('payız', 'payiz', 'fall', 'autumn', '1', 'i') then 1
        when lower(coalesce(ss.cari_semestr, '')) in ('yaz', 'spring', '2', 'ii') then 2
        else null
      end
  );
$function$;

revoke all on function private.exam_schedule_is_current_pair(uuid, uuid) from public, anon;

drop trigger if exists trg_validate_exam_schedule_integrity on public.exam_schedule;
drop function if exists public.validate_exam_schedule_integrity();

create function public.validate_exam_schedule_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
begin
  new.otaq := btrim(new.otaq);

  if new.otaq is null or new.otaq = '' then
    raise exception using errcode = '23514', message = 'EXAM_ROOM_REQUIRED';
  end if;

  if not private.exam_schedule_is_current_pair(new.group_id, new.course_id) then
    raise exception using errcode = '23514', message = 'EXAM_COURSE_GROUP_SCOPE';
  end if;

  if exists (
    select 1
    from public.exam_schedule e
    where e.course_id = new.course_id
      and e.id is distinct from new.id
  ) then
    raise exception using errcode = '23505', message = 'EXAM_DUPLICATE_COURSE';
  end if;

  if exists (
    select 1
    from public.exam_schedule e
    where e.group_id = new.group_id
      and e.imtahan_tarixi = new.imtahan_tarixi
      and e.baslangic_saat = new.baslangic_saat
      and e.id is distinct from new.id
  ) then
    raise exception using errcode = '23505', message = 'EXAM_GROUP_TIME_CONFLICT';
  end if;

  if exists (
    select 1
    from public.exam_schedule e
    where e.imtahan_tarixi = new.imtahan_tarixi
      and e.baslangic_saat = new.baslangic_saat
      and lower(btrim(e.otaq)) = lower(new.otaq)
      and e.id is distinct from new.id
  ) then
    raise exception using errcode = '23505', message = 'EXAM_ROOM_TIME_CONFLICT';
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_exam_schedule_integrity() from public, anon, authenticated;

create trigger trg_validate_exam_schedule_integrity
before insert or update of group_id, course_id, imtahan_tarixi, baslangic_saat, otaq
on public.exam_schedule
for each row execute function public.validate_exam_schedule_integrity();

create unique index if not exists exam_schedule_one_per_course_uidx
  on public.exam_schedule (course_id);

create unique index if not exists exam_schedule_group_slot_uidx
  on public.exam_schedule (group_id, imtahan_tarixi, baslangic_saat);

create unique index if not exists exam_schedule_room_slot_uidx
  on public.exam_schedule (imtahan_tarixi, baslangic_saat, lower(btrim(otaq)));
