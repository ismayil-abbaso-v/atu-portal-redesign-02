create or replace function public.is_course_student(_course_id uuid,_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.course_student_status s
    where s.course_id=_course_id and s.user_id=_user_id and s.status='elave'
  ) or (
    not exists(select 1 from public.course_student_status s where s.course_id=_course_id and s.user_id=_user_id and s.status='kesilib')
    and exists(
      select 1
      from public.course_groups cg
      join public.system_settings ss on ss.singleton is true
      where cg.course_id=_course_id
        and public.is_group_member(cg.group_id,_user_id)
        and cg.tedris_ili=ss.cari_tedris_ili
        and cg.semestr=case
          when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
          when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
          else null end
    )
  );
$$;

create or replace function public.at_risk_students(p_group_id uuid)
returns table(user_id uuid,ad text,soyad text,course_id uuid,course_ad text,qayib_sayi bigint,qayib_limiti integer,telefon text,e_poct text,qrup text,fakulte text)
language plpgsql
stable
security definer
set search_path = public,private,pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Autentifikasiya tələb olunur.'; end if;
  if not public.has_role(v_uid,'admin'::public.app_role)
     and not private.dekan_can_access_group(p_group_id)
     and not public.is_group_teacher(p_group_id,v_uid)
     and not exists(select 1 from public.groups g where g.id=p_group_id and g.tyutor_id=v_uid) then
    raise exception 'Bu qrup üçün risk siyahısını görmək icazəniz yoxdur.';
  end if;

  return query
  with group_courses as (
    select distinct c.id course_id,c.ad course_ad
    from public.course_groups cg
    join public.courses c on c.id=cg.course_id
    join public.system_settings ss on ss.singleton is true
    where cg.group_id=p_group_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1 when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2 else null end
  ), students as (
    select gm.user_id,p.ad,p.soyad,p.telefon,p.e_poct,coalesce(p.qrup,g.ad) qrup,p.fakulte
    from public.group_members gm join public.groups g on g.id=gm.group_id join public.profiles p on p.user_id=gm.user_id
    where gm.group_id=p_group_id and exists(select 1 from public.user_roles ur where ur.user_id=gm.user_id and ur.role='telebe'::public.app_role)
  )
  select st.user_id,st.ad,st.soyad,gc.course_id,gc.course_ad,absences.qayib_sayi,
         public.absence_limit(hours.total_hours),st.telefon,st.e_poct,st.qrup,st.fakulte
  from students st cross join group_courses gc
  cross join lateral (
    select count(*) filter(where r.attendance_status='qayıb'::public.lesson_attendance_status)::bigint qayib_sayi
    from public.lesson_student_records r join public.course_lesson_sessions s on s.id=r.lesson_session_id and s.is_confirmed is true
    where r.student_id=st.user_id and r.course_id=gc.course_id and s.group_id=p_group_id
  ) absences
  cross join lateral (select public.course_effective_total_hours(gc.course_id,st.user_id) total_hours) hours
  where absences.qayib_sayi>public.absence_limit(hours.total_hours)
  order by st.soyad nulls last,st.ad nulls last,gc.course_ad;
end;
$$;

create or replace function public.calculate_semester_score(p_course_id uuid,p_student_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_score numeric;
begin
  if v_uid is null then raise exception 'Autentifikasiya tələb olunur.'; end if;
  if v_uid=p_student_id then
    if not public.is_course_student(p_course_id,v_uid) then raise exception 'Bu fənn üzrə məlumatı hesablamaq icazəniz yoxdur.'; end if;
  elsif not public.has_role(v_uid,'admin'::public.app_role)
        and not private.dekan_can_access_student_course(p_course_id,p_student_id)
        and not public.is_course_teacher(p_course_id,v_uid)
        and not public.is_course_tutor(p_course_id,v_uid) then
    raise exception 'Bu semestr balını hesablamaq üçün icazəniz yoxdur.';
  end if;
  v_score:=private.calculate_semester_score(p_course_id,p_student_id);
  if v_score is null then return null; end if;
  if private.has_ejournal_data(p_course_id,p_student_id) then perform private.sync_exam_semester_score(p_course_id,p_student_id); end if;
  return v_score;
end;
$$;

create or replace function public.semester_score_breakdown(p_course_id uuid,p_student_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_student_id uuid:=coalesce(p_student_id,auth.uid());
begin
  if v_uid is null or v_student_id is null then raise exception 'Autentifikasiya tələb olunur.'; end if;
  if v_student_id=v_uid then
    if not public.is_course_student(p_course_id,v_uid) then raise exception 'Bu fənn üzrə məlumatı görmək icazəniz yoxdur.'; end if;
  elsif not (public.has_role(v_uid,'admin'::public.app_role)
          or private.dekan_can_access_student_course(p_course_id,v_student_id)
          or public.is_course_teacher(p_course_id,v_uid)
          or public.is_course_tutor(p_course_id,v_uid)) then
    raise exception 'Bu tələbənin semestr məlumatını görmək icazəniz yoxdur.';
  end if;
  return private.calculate_semester_score_breakdown(p_course_id,v_student_id);
end;
$$;

create or replace function public.unlock_lesson_session(p_lesson_id uuid,p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public,private,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_session public.course_lesson_sessions%rowtype;
begin
  if v_uid is null then raise exception 'Autentifikasiya tələb olunur.'; end if;
  if length(btrim(coalesce(p_reason,'')))<3 then raise exception 'Kilidi açma səbəbi ən azı 3 simvol olmalıdır.'; end if;
  select * into v_session from public.course_lesson_sessions where id=p_lesson_id for update;
  if not found then raise exception 'Dərs sessiyası tapılmadı.'; end if;
  if not public.has_role(v_uid,'admin'::public.app_role) and not private.dekan_can_access_group(v_session.group_id) then
    raise exception 'Sessiyanın kilidini yalnız səlahiyyətli admin və ya fakültə dekanı aça bilər.';
  end if;
  if not v_session.is_confirmed then raise exception 'Sessiya artıq açıqdır.'; end if;
  perform set_config('app.ejournal_unlock_session_id',p_lesson_id::text,true);
  update public.course_lesson_sessions set is_confirmed=false,confirmed_at=null,confirmed_by=null where id=p_lesson_id;
  insert into public.activity_logs(user_id,emeliyyat,etrafli)
  values(v_uid,'jurnal_sessiyasi_kilidi_acildi',jsonb_build_object('cedvel','course_lesson_sessions','record_id',p_lesson_id,'course_id',v_session.course_id,'group_id',v_session.group_id,'teacher_id',v_session.teacher_id,'lesson_date',v_session.lesson_date,'sebeb',btrim(p_reason),'evvelki_confirmed_at',v_session.confirmed_at,'evvelki_confirmed_by',v_session.confirmed_by));
  return true;
end;
$$;

-- E-journal sessions/templates are group-scoped for deans.
drop policy if exists course_schedule_templates_select on public.course_schedule_templates;
create policy course_schedule_templates_select on public.course_schedule_templates for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_course_group_tutor(course_id,group_id)
  or (public.is_course_student(course_id,(select auth.uid())) and public.is_group_member(group_id,(select auth.uid())))
);
drop policy if exists course_schedule_templates_insert on public.course_schedule_templates;
create policy course_schedule_templates_insert on public.course_schedule_templates for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);
drop policy if exists course_schedule_templates_update on public.course_schedule_templates;
create policy course_schedule_templates_update on public.course_schedule_templates for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)));
drop policy if exists course_schedule_templates_delete on public.course_schedule_templates;
create policy course_schedule_templates_delete on public.course_schedule_templates for delete to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);

drop policy if exists course_lesson_sessions_select on public.course_lesson_sessions;
create policy course_lesson_sessions_select on public.course_lesson_sessions for select to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_course_group_tutor(course_id,group_id)
  or (public.is_course_student(course_id,(select auth.uid())) and public.is_group_member(group_id,(select auth.uid())))
);
drop policy if exists course_lesson_sessions_insert on public.course_lesson_sessions;
create policy course_lesson_sessions_insert on public.course_lesson_sessions for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);
drop policy if exists course_lesson_sessions_update on public.course_lesson_sessions;
create policy course_lesson_sessions_update on public.course_lesson_sessions for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)) or (teacher_id=(select auth.uid()) and public.ejournal_is_course_teacher(course_id) and public.can_grade_now(id,(select auth.uid()))))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id)) or (teacher_id=(select auth.uid()) and public.ejournal_is_course_teacher(course_id)));
drop policy if exists course_lesson_sessions_delete on public.course_lesson_sessions;
create policy course_lesson_sessions_delete on public.course_lesson_sessions for delete to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_group(group_id)
  or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_course_group_tutor(course_id,group_id))
);

-- Student-centric assessment rows.
drop policy if exists course_student_status_select on public.course_student_status;
create policy course_student_status_select on public.course_student_status for select to authenticated using (
  user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id)
  or public.is_course_teacher(course_id,(select auth.uid())) or public.is_course_tutor(course_id,(select auth.uid()))
);
drop policy if exists course_student_status_write on public.course_student_status;
create policy course_student_status_write on public.course_student_status for all to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,user_id) or public.is_course_teacher(course_id,(select auth.uid())));

-- Repeat the same dean faculty boundary for each assessment table.
drop policy if exists lesson_student_records_select on public.lesson_student_records;
create policy lesson_student_records_select on public.lesson_student_records for select to authenticated using (
  student_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
  or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_student_course_tutor(course_id,student_id)
);
drop policy if exists lesson_student_records_insert on public.lesson_student_records;
create policy lesson_student_records_insert on public.lesson_student_records for insert to authenticated with check (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
  or public.can_grade_now(lesson_session_id,(select auth.uid())) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid())))
);
drop policy if exists lesson_student_records_update on public.lesson_student_records;
create policy lesson_student_records_update on public.lesson_student_records for update to authenticated
using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or public.can_grade_now(lesson_session_id,(select auth.uid())) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))))
with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or public.can_grade_now(lesson_session_id,(select auth.uid())) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))));
drop policy if exists lesson_student_records_delete on public.lesson_student_records;
create policy lesson_student_records_delete on public.lesson_student_records for delete to authenticated using (
  public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id)
);

-- Independent work.
drop policy if exists independent_work_assessments_select on public.independent_work_assessments;
create policy independent_work_assessments_select on public.independent_work_assessments for select to authenticated using (student_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_student_course_tutor(course_id,student_id));
drop policy if exists independent_work_assessments_insert on public.independent_work_assessments;
create policy independent_work_assessments_insert on public.independent_work_assessments for insert to authenticated with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'serbest_is')));
drop policy if exists independent_work_assessments_update on public.independent_work_assessments;
create policy independent_work_assessments_update on public.independent_work_assessments for update to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'serbest_is'))) with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'serbest_is')));
drop policy if exists independent_work_assessments_delete on public.independent_work_assessments;
create policy independent_work_assessments_delete on public.independent_work_assessments for delete to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id));

-- Course work.
drop policy if exists course_work_assessments_select on public.course_work_assessments;
create policy course_work_assessments_select on public.course_work_assessments for select to authenticated using (student_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_student_course_tutor(course_id,student_id));
drop policy if exists course_work_assessments_insert on public.course_work_assessments;
create policy course_work_assessments_insert on public.course_work_assessments for insert to authenticated with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,null)));
drop policy if exists course_work_assessments_update on public.course_work_assessments;
create policy course_work_assessments_update on public.course_work_assessments for update to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,null))) with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (student_id=(select auth.uid()) and public.is_course_student(course_id,(select auth.uid()))) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,null)));
drop policy if exists course_work_assessments_delete on public.course_work_assessments;
create policy course_work_assessments_delete on public.course_work_assessments for delete to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id));

-- Colloquium.
drop policy if exists colloquium_assessments_select on public.colloquium_assessments;
create policy colloquium_assessments_select on public.colloquium_assessments for select to authenticated using (student_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or public.ejournal_is_course_teacher(course_id) or public.ejournal_is_student_course_tutor(course_id,student_id));
drop policy if exists colloquium_assessments_insert on public.colloquium_assessments;
create policy colloquium_assessments_insert on public.colloquium_assessments for insert to authenticated with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'kollokvium')));
drop policy if exists colloquium_assessments_update on public.colloquium_assessments;
create policy colloquium_assessments_update on public.colloquium_assessments for update to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'kollokvium'))) with check (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id) or (public.has_role((select auth.uid()),'tyutor'::public.app_role) and public.ejournal_is_student_course_tutor(course_id,student_id)) or (public.ejournal_is_course_teacher(course_id) and public.ejournal_can_assess_course_now(course_id,'kollokvium')));
drop policy if exists colloquium_assessments_delete on public.colloquium_assessments;
create policy colloquium_assessments_delete on public.colloquium_assessments for delete to authenticated using (public.has_role((select auth.uid()),'admin'::public.app_role) or private.dekan_can_access_student_course(course_id,student_id));