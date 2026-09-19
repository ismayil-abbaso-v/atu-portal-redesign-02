-- Teacher exam access is monitoring-only.
-- Teachers may read results for their assigned course/student scope, but may
-- never INSERT/UPDATE/DELETE exam_scores. External/service ingestion remains
-- available because service-role writes do not rely on authenticated RLS.

create or replace function private.enforce_teacher_exam_score_scope()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Server/service operations do not carry an authenticated user id.
  if v_uid is null then
    return new;
  end if;

  -- Preserve privileged administrative workflows. RLS remains the outer gate.
  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'dekan'::public.app_role) then
    return new;
  end if;

  if public.has_role(v_uid, 'muellim'::public.app_role) then
    raise exception using
      errcode = '42501',
      message = 'Müəllim imtahan nəticələrini dəyişə bilməz; bu bölmə yalnız monitorinq üçündür.';
  end if;

  raise exception using
    errcode = '42501',
    message = 'İmtahan nəticələrini dəyişmək səlahiyyətiniz yoxdur.';
end;
$$;

revoke all on function private.enforce_teacher_exam_score_scope() from public;

-- Keep the semester-score calculator readable by teachers without allowing its
-- historical sync side effect to write exam_scores in a teacher session.
create or replace function public.calculate_semester_score(
  p_course_id uuid,
  p_student_id uuid
)
returns numeric
language plpgsql
set search_path to 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_score numeric;
  v_is_teacher boolean := false;
begin
  if v_uid is null then
    raise exception 'Autentifikasiya tələb olunur.';
  end if;

  v_is_teacher := public.has_role(v_uid, 'muellim'::public.app_role);

  if v_uid = p_student_id then
    if not public.is_course_student(p_course_id, v_uid) then
      raise exception 'Bu fənn üzrə məlumatı hesablamaq icazəniz yoxdur.';
    end if;
  elsif public.has_role(v_uid, 'admin'::public.app_role)
        or private.dekan_can_access_student_course(p_course_id, p_student_id)
        or (
          v_is_teacher
          and private.teacher_can_view_student_course_data(p_course_id, p_student_id, v_uid)
        )
        or (
          public.has_role(v_uid, 'tyutor'::public.app_role)
          and public.is_course_tutor(p_course_id, v_uid)
          and public.is_course_student(p_course_id, p_student_id)
        ) then
    null;
  else
    raise exception 'Bu semestr balını hesablamaq üçün icazəniz yoxdur.';
  end if;

  v_score := private.calculate_semester_score(p_course_id, p_student_id);
  if v_score is null then
    return null;
  end if;

  -- A teacher call is strictly read-only. Materialized score synchronization is
  -- still handled by the existing server-side journal/assessment triggers.
  if not v_is_teacher and private.has_ejournal_data(p_course_id, p_student_id) then
    perform private.sync_exam_semester_score(p_course_id, p_student_id);
  end if;

  return v_score;
end;
$$;

revoke all on function public.calculate_semester_score(uuid, uuid) from public;
grant execute on function public.calculate_semester_score(uuid, uuid) to authenticated;

-- Defense in depth: a teacher must not be able to call the private synchronizer
-- directly from an authenticated session. Trigger-driven synchronization remains
-- valid because it executes with pg_trigger_depth() > 0.
create or replace function private.sync_exam_semester_score(
  p_course_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_uid uuid := auth.uid();
  v_score numeric;
  v_year text;
  v_semester_text text;
  v_semester smallint;
  v_score_id uuid;
begin
  if v_uid is not null
     and pg_trigger_depth() = 0
     and public.has_role(v_uid, 'muellim'::public.app_role)
     and not public.has_role(v_uid, 'admin'::public.app_role)
     and not public.has_role(v_uid, 'dekan'::public.app_role) then
    raise exception using
      errcode = '42501',
      message = 'Müəllim imtahan nəticələrini sinxronlaşdıra bilməz; yalnız monitorinq icazəsi var.';
  end if;

  if not private.has_ejournal_data(p_course_id, p_student_id) then return; end if;
  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.qiymetlendirme_novu is not null
  ) then return; end if;

  v_score := private.calculate_semester_score(p_course_id, p_student_id);
  if v_score is null then return; end if;

  select ss.cari_tedris_ili, ss.cari_semestr
    into v_year, v_semester_text
  from public.system_settings ss
  order by ss.updated_at desc nulls last, ss.created_at desc nulls last
  limit 1;

  v_semester := case lower(btrim(coalesce(v_semester_text, '')))
    when 'payız' then 1 when 'payiz' then 1 when 'fall' then 1 when '1' then 1 when 'i' then 1
    when 'yaz' then 2 when 'spring' then 2 when '2' then 2 when 'ii' then 2
    else null
  end;

  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || ':' || p_course_id::text || ':' || coalesce(v_year,'') || ':' || coalesce(v_semester::text,''),
    0
  ));

  select es.id into v_score_id
  from public.exam_scores es
  where es.user_id = p_student_id
    and es.course_id = p_course_id
    and (v_year is null or es.tedris_ili = v_year)
    and (v_semester is null or es.semestr = v_semester)
  order by es.created_at desc
  limit 1;

  if v_score_id is null then
    insert into public.exam_scores(user_id, course_id, semestr_qiymeti, tedris_ili, semestr, yekun_qiymet)
    values (p_student_id, p_course_id, v_score, v_year, v_semester, null);
  else
    update public.exam_scores es
    set semestr_qiymeti = v_score,
        yekun_qiymet = case
          when es.imtahan_bali is null then null
          else least(100::numeric, v_score + es.imtahan_bali)
        end
    where es.id = v_score_id;
  end if;
end;
$$;

revoke all on function private.sync_exam_semester_score(uuid, uuid) from public;
grant execute on function private.sync_exam_semester_score(uuid, uuid) to authenticated;

-- Teachers keep SELECT access only for students that belong to their assigned
-- course context. All authenticated result writes are now admin-only.
drop policy if exists exam_scores_select on public.exam_scores;
create policy exam_scores_select
on public.exam_scores
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
  or private.dekan_can_access_student_course(course_id, user_id)
  or public.is_course_tutor(course_id, (select auth.uid()))
  or (
    public.has_role((select auth.uid()), 'muellim'::public.app_role)
    and private.teacher_can_view_student_course_data(course_id, user_id, (select auth.uid()))
  )
);

drop policy if exists exam_scores_insert_staff on public.exam_scores;
create policy exam_scores_insert_staff
on public.exam_scores
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists exam_scores_update_staff on public.exam_scores;
create policy exam_scores_update_staff
on public.exam_scores
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
);

-- DELETE was already admin-only; recreate it here so this migration is the
-- single explicit source of truth for exam_scores mutations.
drop policy if exists exam_scores_delete_staff on public.exam_scores;
create policy exam_scores_delete_staff
on public.exam_scores
for delete
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
);
