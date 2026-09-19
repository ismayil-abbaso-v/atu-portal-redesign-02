-- Historical exam results must survive profile deletion, but active links must be referentially valid.
alter table public.exam_detailed_results alter column student_id drop not null;

-- Safely relink legacy rows when the stored username uniquely identifies a current profile.
with matches as (
  select e.id, min(p.user_id::text)::uuid as new_user_id
  from public.exam_detailed_results e
  join public.profiles p
    on public.normalize_group_name(p.istifadeci_adi)=public.normalize_group_name(e.student_username)
  where e.student_id is not null
    and not exists(select 1 from public.profiles oldp where oldp.user_id=e.student_id)
  group by e.id
  having count(distinct p.user_id)=1
)
update public.exam_detailed_results e
set student_id=m.new_user_id
from matches m
where e.id=m.id;

-- Preserve any future historical result if a profile is removed.
update public.exam_detailed_results e
set student_id=null
where e.student_id is not null
  and not exists(select 1 from public.profiles p where p.user_id=e.student_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.exam_detailed_results'::regclass
      and conname='exam_detailed_results_student_id_fkey'
  ) then
    alter table public.exam_detailed_results
      add constraint exam_detailed_results_student_id_fkey
      foreign key(student_id) references public.profiles(user_id) on delete set null;
  end if;
end $$;

create index if not exists idx_exam_detailed_results_student_id
  on public.exam_detailed_results(student_id);