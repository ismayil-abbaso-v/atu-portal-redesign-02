-- Prompt 5: keep independent/course-work submission state consistent on every write.
-- The assessment tables remain the source of truth; this trigger only derives status
-- from grade + submission metadata so browser/API clients cannot create contradictory rows.

create or replace function private.normalize_assessment_submission_state()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
begin
  if (new.file_url is null) <> (new.submitted_at is null) then
    raise exception 'Təqdimat faylı və təqdim edilmə vaxtı birlikdə yazılmalıdır.';
  end if;

  if new.grade is not null then
    new.status := 'qiymetlendirilib'::public.assessment_submission_status;
  elsif new.file_url is not null then
    new.status := 'teqdim_edilib'::public.assessment_submission_status;
  else
    new.status := 'gozleyir'::public.assessment_submission_status;
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_assessment_submission_state() from public;

alter table public.independent_work_assessments
  drop constraint if exists independent_work_assessments_submission_state_check;
alter table public.independent_work_assessments
  add constraint independent_work_assessments_submission_state_check
  check (
    (grade is not null and status = 'qiymetlendirilib'::public.assessment_submission_status)
    or (grade is null and file_url is not null and submitted_at is not null and status = 'teqdim_edilib'::public.assessment_submission_status)
    or (grade is null and file_url is null and submitted_at is null and status = 'gozleyir'::public.assessment_submission_status)
  );

drop trigger if exists a_normalize_independent_work_submission_state on public.independent_work_assessments;
create trigger a_normalize_independent_work_submission_state
before insert or update of grade, file_url, submitted_at, status
on public.independent_work_assessments
for each row execute function private.normalize_assessment_submission_state();

alter table public.course_work_assessments
  drop constraint if exists course_work_assessments_submission_state_check;
alter table public.course_work_assessments
  add constraint course_work_assessments_submission_state_check
  check (
    (grade is not null and status = 'qiymetlendirilib'::public.assessment_submission_status)
    or (grade is null and file_url is not null and submitted_at is not null and status = 'teqdim_edilib'::public.assessment_submission_status)
    or (grade is null and file_url is null and submitted_at is null and status = 'gozleyir'::public.assessment_submission_status)
  );

drop trigger if exists a_normalize_course_work_submission_state on public.course_work_assessments;
create trigger a_normalize_course_work_submission_state
before insert or update of grade, file_url, submitted_at, status
on public.course_work_assessments
for each row execute function private.normalize_assessment_submission_state();
