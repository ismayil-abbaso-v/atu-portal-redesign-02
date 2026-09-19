alter table public.courses
  add column if not exists otaqlar jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_otaqlar_object_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_otaqlar_object_check
      check (jsonb_typeof(otaqlar) = 'object');
  end if;
end
$$;
