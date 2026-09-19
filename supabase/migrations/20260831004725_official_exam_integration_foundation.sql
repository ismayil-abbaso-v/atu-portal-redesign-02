-- Prompt 1/3: Official exam integration foundation only.
-- This migration intentionally does NOT provision exams remotely and does NOT
-- write official results into the Digital Journal. It only adds mapping,
-- outbox and metadata-only audit infrastructure.

create table public.official_exam_links (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null,
  course_id uuid not null,
  group_id uuid not null,
  group_name_snapshot text not null,
  course_name_snapshot text not null,
  academic_year text not null,
  semester smallint not null,
  exam_type text not null,
  official_exam_id text,
  sync_status text not null default 'pending',
  last_error_code text,
  last_error_message text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_exam_links_material_fkey foreign key (material_id) references public.exam_materials(id) on delete cascade,
  constraint official_exam_links_course_fkey foreign key (course_id) references public.courses(id) on delete cascade,
  constraint official_exam_links_group_fkey foreign key (group_id) references public.groups(id) on delete cascade,
  constraint official_exam_links_material_key unique (material_id),
  constraint official_exam_links_group_name_nonempty check (btrim(group_name_snapshot) <> ''),
  constraint official_exam_links_course_name_nonempty check (btrim(course_name_snapshot) <> ''),
  constraint official_exam_links_academic_year_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  constraint official_exam_links_semester_check check (semester in (1, 2)),
  constraint official_exam_links_exam_type_check check (exam_type in ('test', 'ticket')),
  constraint official_exam_links_official_exam_id_check check (official_exam_id is null or btrim(official_exam_id) <> ''),
  constraint official_exam_links_sync_status_check check (sync_status in ('pending', 'processing', 'synced', 'retry', 'failed_permanent'))
);

create unique index official_exam_links_official_exam_id_uidx
  on public.official_exam_links (official_exam_id)
  where official_exam_id is not null;

-- The Official Portal models test/ticket as alternative values of one
-- official_exams.exam_type. There is no separate active-state column there,
-- so one non-permanently-failed official exam link is allowed per local scope.
create unique index official_exam_links_one_active_scope_uidx
  on public.official_exam_links (course_id, group_id, academic_year, semester)
  where sync_status <> 'failed_permanent';

create index official_exam_links_scope_idx
  on public.official_exam_links (course_id, group_id, academic_year, semester);

create table public.official_exam_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null,
  event_type text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_exam_sync_outbox_material_fkey foreign key (material_id) references public.exam_materials(id) on delete cascade,
  constraint official_exam_sync_outbox_event_type_check check (event_type in ('exam.provision', 'exam.update', 'semester_scores.updated')),
  constraint official_exam_sync_outbox_status_check check (status in ('pending', 'processing', 'synced', 'retry', 'failed_permanent')),
  constraint official_exam_sync_outbox_attempt_count_check check (attempt_count >= 0)
);

create index official_exam_sync_outbox_dispatch_idx
  on public.official_exam_sync_outbox (status, next_retry_at, created_at);
create index official_exam_sync_outbox_material_idx
  on public.official_exam_sync_outbox (material_id, created_at desc);

create table public.exam_integration_audit (
  id uuid primary key default gen_random_uuid(),
  direction text not null,
  event_type text not null,
  material_id uuid,
  official_exam_id text,
  source_result_id text,
  course_id uuid,
  group_id uuid,
  student_id uuid,
  status text not null,
  error_code text,
  attempt_number integer not null default 1,
  created_at timestamptz not null default now(),
  constraint exam_integration_audit_direction_check check (direction in ('outbound', 'inbound')),
  constraint exam_integration_audit_event_type_nonempty check (btrim(event_type) <> ''),
  constraint exam_integration_audit_status_nonempty check (btrim(status) <> ''),
  constraint exam_integration_audit_attempt_number_check check (attempt_number >= 1),
  constraint exam_integration_audit_official_exam_id_check check (official_exam_id is null or btrim(official_exam_id) <> ''),
  constraint exam_integration_audit_source_result_id_check check (source_result_id is null or btrim(source_result_id) <> '')
);

create index exam_integration_audit_created_idx
  on public.exam_integration_audit (created_at desc);
create index exam_integration_audit_official_exam_idx
  on public.exam_integration_audit (official_exam_id, created_at desc)
  where official_exam_id is not null;
create index exam_integration_audit_source_result_idx
  on public.exam_integration_audit (source_result_id, created_at desc)
  where source_result_id is not null;

create trigger official_exam_links_set_updated_at
before update on public.official_exam_links
for each row execute function public.update_updated_at_column();

create trigger official_exam_sync_outbox_set_updated_at
before update on public.official_exam_sync_outbox
for each row execute function public.update_updated_at_column();

alter table public.official_exam_links enable row level security;
alter table public.official_exam_sync_outbox enable row level security;
alter table public.exam_integration_audit enable row level security;

revoke all on table public.official_exam_links from anon, authenticated;
revoke all on table public.official_exam_sync_outbox from anon, authenticated;
revoke all on table public.exam_integration_audit from anon, authenticated;

grant select on table public.official_exam_links to authenticated;
grant select on table public.official_exam_sync_outbox to authenticated;
grant select on table public.exam_integration_audit to authenticated;
grant all on table public.official_exam_links to service_role;
grant all on table public.official_exam_sync_outbox to service_role;
grant all on table public.exam_integration_audit to service_role;

-- Teachers can only monitor mapping/sync state for courses assigned to them.
-- No authenticated role receives INSERT/UPDATE/DELETE grants.
create policy official_exam_links_read_scope
on public.official_exam_links
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'dekan'::public.app_role)
  or public.is_course_teacher(course_id, (select auth.uid()))
);

-- Queue internals and audit metadata remain management-only; workers use
-- service_role. Students and tutors receive no direct access.
create policy official_exam_sync_outbox_admin_read
on public.official_exam_sync_outbox
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'dekan'::public.app_role)
);

create policy exam_integration_audit_admin_read
on public.exam_integration_audit
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'dekan'::public.app_role)
);

comment on table public.official_exam_links is 'ATU material-to-Official-Portal mapping. Local course/group/period values are authoritative.';
comment on table public.official_exam_sync_outbox is 'Server-side outbound integration queue. Authenticated users have no mutation grants.';
comment on table public.exam_integration_audit is 'Metadata-only integration audit. Secrets, signatures, signed URLs, service-role tokens and full answer payloads must never be stored here.';
