-- Keep privileged row-relationship lookups in the unexposed private schema.
-- Public functions remain API-compatible but run as SECURITY INVOKER wrappers.

grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(select 1 from public.user_roles ur where ur.user_id=_user_id and ur.role=_role);
$$;

create or replace function private.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(select 1 from public.group_members gm where gm.group_id=_group_id and gm.user_id=_user_id);
$$;

create or replace function private.is_course_teacher(_course_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(select 1 from public.courses c where c.id=_course_id and c.muellim_id=_user_id)
      or exists(select 1 from public.course_teachers ct where ct.course_id=_course_id and ct.muellim_id=_user_id);
$$;

create or replace function private.is_course_student(_course_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
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
        and private.is_group_member(cg.group_id,_user_id)
        and cg.tedris_ili=ss.cari_tedris_ili
        and cg.semestr=case
          when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
          when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
          else null end
    )
  );
$$;

create or replace function private.is_course_tutor(_course_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(select 1 from public.courses c where c.id=_course_id and c.tyutor_id=_user_id)
  or exists(
    select 1
    from public.course_groups cg
    join public.groups g on g.id=cg.group_id and g.tyutor_id=_user_id
    join public.system_settings ss on ss.singleton is true
    where cg.course_id=_course_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case
        when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
        when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
        else null end
  );
$$;

create or replace function private.is_group_teacher(_group_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.course_groups cg
    join public.system_settings ss on ss.singleton is true
    join public.courses c on c.id=cg.course_id
    where cg.group_id=_group_id
      and cg.tedris_ili=ss.cari_tedris_ili
      and cg.semestr=case
        when lower(coalesce(ss.cari_semestr,'')) in ('payız','payiz','fall','autumn') then 1
        when lower(coalesce(ss.cari_semestr,'')) in ('yaz','spring') then 2
        else null end
      and (c.muellim_id=_user_id or exists(select 1 from public.course_teachers ct where ct.course_id=c.id and ct.muellim_id=_user_id))
  );
$$;

create or replace function private.is_tutor_of_student(_student_id uuid, _tutor_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(
    select 1 from public.group_members gm
    join public.groups g on g.id=gm.group_id
    where gm.user_id=_student_id and g.tyutor_id=_tutor_id
  );
$$;

create or replace function private.is_same_group_member(target_user_id uuid, viewer_user_id uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists(
    select 1 from public.group_members mine
    join public.group_members target on target.group_id=mine.group_id
    where mine.user_id=viewer_user_id and target.user_id=target_user_id
  );
$$;

-- RLS-safe chat lookup; this must bypass chat RLS to avoid recursive policies.
create or replace function private.chat_group_accessible(_chat_group_id uuid, _viewer uuid)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select _viewer is not null and exists(
    select 1
    from public.chat_groups cg
    left join public.system_settings ss on ss.singleton is true
    where cg.id=_chat_group_id and (
      private.has_role(_viewer,'admin'::public.app_role)
      or (private.has_role(_viewer,'dekan'::public.app_role) and private.dekan_can_access_group(cg.group_id))
      or private.is_course_teacher(cg.course_id,_viewer)
      or private.is_course_tutor(cg.course_id,_viewer)
      or (
        exists(select 1 from public.chat_group_members cgm where cgm.chat_group_id=cg.id and cgm.user_id=_viewer)
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

revoke all on function private.has_role(uuid,public.app_role) from public,anon;
revoke all on function private.is_group_member(uuid,uuid) from public,anon;
revoke all on function private.is_course_teacher(uuid,uuid) from public,anon;
revoke all on function private.is_course_student(uuid,uuid) from public,anon;
revoke all on function private.is_course_tutor(uuid,uuid) from public,anon;
revoke all on function private.is_group_teacher(uuid,uuid) from public,anon;
revoke all on function private.is_tutor_of_student(uuid,uuid) from public,anon;
revoke all on function private.is_same_group_member(uuid,uuid) from public,anon;
revoke all on function private.chat_group_accessible(uuid,uuid) from public,anon;
grant execute on function private.has_role(uuid,public.app_role), private.is_group_member(uuid,uuid), private.is_course_teacher(uuid,uuid), private.is_course_student(uuid,uuid), private.is_course_tutor(uuid,uuid), private.is_group_teacher(uuid,uuid), private.is_tutor_of_student(uuid,uuid), private.is_same_group_member(uuid,uuid), private.chat_group_accessible(uuid,uuid) to authenticated,service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.has_role($1,$2); $$;

create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_group_member($1,$2); $$;

create or replace function public.is_course_teacher(_course_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_course_teacher($1,$2); $$;

create or replace function public.is_course_student(_course_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_course_student($1,$2); $$;

create or replace function public.is_course_tutor(_course_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_course_tutor($1,$2); $$;

create or replace function public.is_group_teacher(_group_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_group_teacher($1,$2); $$;

create or replace function public.is_tutor_of_student(_student_id uuid, _tutor_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_tutor_of_student($1,$2); $$;

create or replace function public.is_same_group_member(target_user_id uuid, viewer_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_same_group_member($1,$2); $$;

create or replace function public.chat_group_accessible(_chat_group_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select private.chat_group_accessible($1,(select auth.uid())); $$;

create or replace function public.is_chat_member_for_file(path text,user_id uuid)
returns boolean
language plpgsql stable security invoker
set search_path=''
as $$
declare v_group_id uuid;
begin
  if (select auth.uid()) is null or user_id is distinct from (select auth.uid()) then return false; end if;
  begin v_group_id:=split_part(path,'/',1)::uuid;
  exception when others then return false; end;
  return private.chat_group_accessible(v_group_id,(select auth.uid()));
end;
$$;

-- Existing private e-journal helpers stay privileged and unexposed. The public surface becomes invoker-only.
grant execute on function private.ejournal_is_course_teacher(uuid,uuid), private.ejournal_is_course_group_tutor(uuid,uuid,uuid), private.ejournal_is_student_course_tutor(uuid,uuid,uuid), private.teacher_can_assess_course_at(uuid,uuid,timestamptz,text), private.teacher_can_grade_lesson_at(uuid,uuid,timestamptz), private.week_parity_from_anchor(date,date,public.academic_week_type), private.calculate_semester_score(uuid,uuid), private.calculate_semester_score_breakdown(uuid,uuid), private.has_ejournal_data(uuid,uuid), private.sync_exam_semester_score(uuid,uuid), private.seed_session_students(uuid,uuid,uuid) to authenticated,service_role;

alter function public.ejournal_is_course_teacher(uuid) security invoker;
alter function public.ejournal_is_course_group_tutor(uuid,uuid) security invoker;
alter function public.ejournal_is_student_course_tutor(uuid,uuid) security invoker;
alter function public.ejournal_can_assess_course_now(uuid,text) security invoker;
alter function public.get_week_parity(date) security invoker;
alter function public.can_grade_now(uuid,uuid) security invoker;
alter function public.calculate_semester_score(uuid,uuid) security invoker;
alter function public.semester_score_breakdown(uuid,uuid) security invoker;
alter function public.confirm_lesson_grading(uuid,text,jsonb) security invoker;

-- Auth session access genuinely needs elevated auth-schema privileges; hide that elevation in private RPCs.
create or replace function private.list_own_auth_sessions()
returns table(id text,session_id text,cihaz text,brauzer text,ip text,seher text,olke text,son_aktivlik timestamptz)
language sql security definer
set search_path=''
as $$
  select coalesce(l.id::text,s.id::text), s.id::text,
         coalesce(nullif(l.cihaz,''),nullif(s.user_agent,''),'Naməlum cihaz'),
         l.brauzer, coalesce(l.ip,s.ip::text), l.seher,l.olke,
         coalesce(l.son_aktivlik,s.updated_at,s.created_at)
  from auth.sessions s
  left join public.sessions_log l on l.session_id=s.id::text and l.user_id=(select auth.uid())
  where s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now())
  order by coalesce(l.son_aktivlik,s.updated_at,s.created_at) desc;
$$;

create or replace function private.revoke_own_auth_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare deleted_count integer;
begin
  if (select auth.uid()) is null then return false; end if;
  delete from auth.sessions where id=p_session_id and user_id=(select auth.uid());
  get diagnostics deleted_count=row_count;
  return deleted_count>0;
end;
$$;
revoke all on function private.list_own_auth_sessions() from public,anon;
revoke all on function private.revoke_own_auth_session(uuid) from public,anon;
grant execute on function private.list_own_auth_sessions(), private.revoke_own_auth_session(uuid) to authenticated,service_role;

create or replace function public.list_own_auth_sessions()
returns table(id text,session_id text,cihaz text,brauzer text,ip text,seher text,olke text,son_aktivlik timestamptz)
language sql security invoker set search_path=''
as $$ select * from private.list_own_auth_sessions(); $$;

create or replace function public.revoke_own_auth_session(p_session_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select private.revoke_own_auth_session($1); $$;

-- These public RPCs can safely honor normal RLS now that role/faculty policies are canonical.
alter function public.admin_dashboard_stats(timestamptz,timestamptz,text) security invoker;
alter function public.admin_distinct_faculties() security invoker;
alter function public.admin_list_users(text,public.app_role[],text,text,text,text,integer,integer) security invoker;
alter function public.admin_registration_trend(timestamptz,timestamptz,text,text) security invoker;
alter function public.admin_role_distribution(text) security invoker;
alter function public.admin_set_user_roles(uuid,public.app_role[]) security invoker;
alter function public.at_risk_students(uuid) security invoker;
alter function public.broadcast_notification(text,text,text,public.app_role,uuid) security invoker;
alter function public.mark_announcement_read(uuid) security invoker;
alter function public.set_profile_status(uuid,text) security invoker;
alter function public.unlock_lesson_session(uuid,text) security invoker;

-- Ensure API privileges remain explicit.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and not p.prorettype='pg_catalog.trigger'::regtype
  loop
    if r.sig::text in (
      'has_role(uuid,app_role)','is_group_member(uuid,uuid)','is_course_teacher(uuid,uuid)','is_course_student(uuid,uuid)',
      'is_course_tutor(uuid,uuid)','is_group_teacher(uuid,uuid)','is_tutor_of_student(uuid,uuid)','is_same_group_member(uuid,uuid)',
      'chat_group_accessible(uuid)','is_chat_member_for_file(text,uuid)','ejournal_is_course_teacher(uuid)',
      'ejournal_is_course_group_tutor(uuid,uuid)','ejournal_is_student_course_tutor(uuid,uuid)','ejournal_can_assess_course_now(uuid,text)',
      'get_week_parity(date)','can_grade_now(uuid,uuid)','calculate_semester_score(uuid,uuid)','semester_score_breakdown(uuid,uuid)',
      'confirm_lesson_grading(uuid,text,jsonb)','list_own_auth_sessions()','revoke_own_auth_session(uuid)',
      'admin_dashboard_stats(timestamp with time zone,timestamp with time zone,text)','admin_distinct_faculties()',
      'admin_list_users(text,app_role[],text,text,text,text,integer,integer)','admin_registration_trend(timestamp with time zone,timestamp with time zone,text,text)',
      'admin_role_distribution(text)','admin_set_user_roles(uuid,app_role[])','at_risk_students(uuid)',
      'broadcast_notification(text,text,text,app_role,uuid)','mark_announcement_read(uuid)','set_profile_status(uuid,text)','unlock_lesson_session(uuid,text)'
    ) then
      execute format('revoke all on function %s from public,anon',r.sig);
      execute format('grant execute on function %s to authenticated,service_role',r.sig);
    end if;
  end loop;
end $$;