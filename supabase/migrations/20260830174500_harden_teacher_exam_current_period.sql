-- Prompts 1/6 completion: teachers may grade exam scores only for the current
-- academic year/semester. Historical exam results stay readable but immutable.

create or replace function private.teacher_exam_period_is_current(
  p_tedris_ili text,
  p_semestr smallint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.system_settings ss
    where ss.singleton = true
      and nullif(btrim(ss.cari_tedris_ili), '') = nullif(btrim(p_tedris_ili), '')
      and p_semestr = case lower(btrim(coalesce(ss.cari_semestr, '')))
        when 'payız' then 1
        when 'payiz' then 1
        when 'fall' then 1
        when 'autumn' then 1
        when 'güz' then 1
        when '1' then 1
        when 'i' then 1
        when 'yaz' then 2
        when 'spring' then 2
        when 'bahar' then 2
        when '2' then 2
        when 'ii' then 2
        else null
      end
  );
$$;

revoke all on function private.teacher_exam_period_is_current(text, smallint) from public;
grant execute on function private.teacher_exam_period_is_current(text, smallint) to authenticated;

create or replace function private.enforce_teacher_exam_score_scope()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_semester_score numeric;
begin
  if v_uid is null then
    return new;
  end if;

  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'dekan'::public.app_role) then
    return new;
  end if;

  if not public.has_role(v_uid, 'muellim'::public.app_role) then
    raise exception 'İmtahan balını dəyişmək üçün müəllim səlahiyyəti tələb olunur.';
  end if;

  if new.course_id is null
     or not private.teacher_can_grade_exam_score(new.course_id, new.user_id, v_uid) then
    raise exception 'Tələbə bu müəllimin cari fənn qiymətləndirmə kontekstinə aid deyil.';
  end if;

  if not private.teacher_exam_period_is_current(new.tedris_ili, new.semestr) then
    raise exception 'Keçmiş və ya cari olmayan akademik periodun imtahan nəticəsi müəllim üçün read-only-dır.';
  end if;

  if tg_op = 'UPDATE' and (
    new.course_id is distinct from old.course_id
    or new.user_id is distinct from old.user_id
    or new.tedris_ili is distinct from old.tedris_ili
    or new.semestr is distinct from old.semestr
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Müəllim imtahan balı sətrinin fənn, tələbə və akademik period identifikatorlarını dəyişə bilməz.';
  end if;

  v_semester_score := private.calculate_semester_score(new.course_id, new.user_id);
  new.semestr_qiymeti := coalesce(
    v_semester_score,
    case when tg_op = 'UPDATE' then old.semestr_qiymeti else null end,
    0
  );
  new.yekun_qiymet := case
    when new.imtahan_bali is null then null
    else least(100::numeric, new.semestr_qiymeti + new.imtahan_bali)
  end;

  return new;
end;
$$;

revoke all on function private.enforce_teacher_exam_score_scope() from public;

-- Period-aware RLS prevents historical rows from even becoming teacher update
-- candidates. Admin behavior remains unchanged.
drop policy if exists exam_scores_insert_staff on public.exam_scores;
create policy exam_scores_insert_staff
on public.exam_scores
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
    and private.teacher_exam_period_is_current(tedris_ili, semestr)
  )
);

drop policy if exists exam_scores_update_staff on public.exam_scores;
create policy exam_scores_update_staff
on public.exam_scores
for update
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
    and private.teacher_exam_period_is_current(tedris_ili, semestr)
  )
)
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or (
    private.teacher_can_grade_exam_score(course_id, user_id, (select auth.uid()))
    and private.teacher_exam_period_is_current(tedris_ili, semestr)
  )
);
