create or replace function public.admin_distinct_faculties()
returns table(fakulte text)
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
begin
  if public.has_role((select auth.uid()),'admin'::public.app_role) then
    return query select distinct p.fakulte from public.profiles p where p.fakulte is not null and p.fakulte<>'' order by p.fakulte;
  elsif public.has_role((select auth.uid()),'dekan'::public.app_role) then
    return query select private.current_user_faculty_name() where private.current_user_faculty_name() is not null;
  else raise exception 'İcazə yoxdur'; end if;
end;
$$;

create or replace function public.admin_list_users(p_axtaris text default null,p_rollar public.app_role[] default null,p_status text default null,p_fakulte text default null,p_sort_sutun text default 'created_at',p_sort_istiqamet text default 'desc',p_limit integer default 20,p_offset integer default 0)
returns table(user_id uuid,ad text,soyad text,ata_adi text,istifadeci_adi text,avatar_url text,telefon text,e_poct text,cins text,fin_kodu text,dogum_tarixi date,qebul_ili integer,bitirme_ili integer,ixtisas text,fakulte text,qrup text,sheher text,dim_bali numeric,tehsil_novu text,sosial_veziyyet text,tehsil_haqqi numeric,tehsil_haqqi_statusu text,esd_istifadeci boolean,status text,rollar public.app_role[],umumi_say bigint)
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
declare v_scope text;
begin
  if public.has_role((select auth.uid()),'admin'::public.app_role) then v_scope:=nullif(p_fakulte,'');
  elsif public.has_role((select auth.uid()),'dekan'::public.app_role) then
    v_scope:=private.current_user_faculty_name();
    if v_scope is null then raise exception 'Dekan üçün fakültə təyin edilməyib'; end if;
    if p_fakulte is not null and p_fakulte<>'' and lower(btrim(p_fakulte))<>lower(btrim(v_scope)) then raise exception 'Başqa fakültəyə giriş icazəsi yoxdur'; end if;
  else raise exception 'İcazə yoxdur'; end if;

  return query with filtrli as (
    select p.user_id,p.ad,p.soyad,p.ata_adi,p.istifadeci_adi,p.avatar_url,p.telefon,p.e_poct,p.cins,p.fin_kodu,p.dogum_tarixi,p.qebul_ili,p.bitirme_ili,p.ixtisas,p.fakulte,p.qrup,p.sheher,p.dim_bali,p.tehsil_novu,p.sosial_veziyyet,p.tehsil_haqqi,p.tehsil_haqqi_statusu,p.esd_istifadeci,p.status,p.created_at,coalesce(r.rollar,array[]::public.app_role[]) rollar
    from public.profiles p
    left join (select ur.user_id,array_agg(ur.role order by ur.role) rollar from public.user_roles ur group by ur.user_id) r on r.user_id=p.user_id
    where (p_axtaris is null or p_axtaris='' or p.ad ilike '%'||p_axtaris||'%' or p.soyad ilike '%'||p_axtaris||'%' or p.istifadeci_adi ilike '%'||p_axtaris||'%' or p.e_poct ilike '%'||p_axtaris||'%')
      and (p_status is null or p.status=p_status)
      and (v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope)))
      and (p_rollar is null or coalesce(r.rollar,array[]::public.app_role[]) && p_rollar)
  )
  select f.user_id,f.ad,f.soyad,f.ata_adi,f.istifadeci_adi,f.avatar_url,f.telefon,f.e_poct,f.cins,f.fin_kodu,f.dogum_tarixi,f.qebul_ili,f.bitirme_ili,f.ixtisas,f.fakulte,f.qrup,f.sheher,f.dim_bali,f.tehsil_novu,f.sosial_veziyyet,f.tehsil_haqqi,f.tehsil_haqqi_statusu,f.esd_istifadeci,f.status,f.rollar,count(*) over()
  from filtrli f
  order by
    case when p_sort_sutun='ad' and p_sort_istiqamet='asc' then f.ad end asc nulls last,
    case when p_sort_sutun='ad' and p_sort_istiqamet='desc' then f.ad end desc nulls last,
    case when p_sort_sutun='soyad' and p_sort_istiqamet='asc' then f.soyad end asc nulls last,
    case when p_sort_sutun='soyad' and p_sort_istiqamet='desc' then f.soyad end desc nulls last,
    case when p_sort_sutun='qebul_ili' and p_sort_istiqamet='asc' then f.qebul_ili end asc nulls last,
    case when p_sort_sutun='qebul_ili' and p_sort_istiqamet='desc' then f.qebul_ili end desc nulls last,
    f.created_at desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(coalesce(p_offset,0),0);
end;
$$;

create or replace function public.admin_role_distribution(p_fakulte text default null)
returns table(role public.app_role,say bigint)
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
declare v_scope text;
begin
  if public.has_role((select auth.uid()),'admin'::public.app_role) then v_scope:=nullif(p_fakulte,'');
  elsif public.has_role((select auth.uid()),'dekan'::public.app_role) then v_scope:=private.current_user_faculty_name();
  else raise exception 'İcazə yoxdur'; end if;
  return query select ur.role,count(*) from public.user_roles ur join public.profiles p on p.user_id=ur.user_id where v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope)) group by ur.role order by count(*) desc;
end;
$$;

create or replace function public.admin_registration_trend(p_start timestamptz,p_end timestamptz,p_fakulte text default null,p_granularity text default 'week')
returns table(bucket timestamptz,say bigint)
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
declare v_scope text;
begin
  if public.has_role((select auth.uid()),'admin'::public.app_role) then v_scope:=nullif(p_fakulte,'');
  elsif public.has_role((select auth.uid()),'dekan'::public.app_role) then v_scope:=private.current_user_faculty_name();
  else raise exception 'İcazə yoxdur'; end if;
  return query select date_trunc(case when p_granularity in ('day','week','month') then p_granularity else 'week' end,p.created_at),count(*) from public.profiles p where p.created_at>=p_start and p.created_at<p_end and (v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope))) group by 1 order by 1;
end;
$$;

create or replace function public.admin_dashboard_stats(p_start timestamptz,p_end timestamptz,p_fakulte text default null)
returns table(total_istifadeciler bigint,telebeler bigint,muellimler bigint,qruplar bigint,fenler bigint,kitablar bigint)
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
declare v_scope text; v_faculty_id uuid;
begin
  if public.has_role((select auth.uid()),'admin'::public.app_role) then
    v_scope:=nullif(p_fakulte,'');
    if v_scope is not null then select f.id into v_faculty_id from public.faculties f where lower(btrim(f.ad))=lower(btrim(v_scope)) limit 1; end if;
  elsif public.has_role((select auth.uid()),'dekan'::public.app_role) then
    v_scope:=private.current_user_faculty_name(); v_faculty_id:=private.current_user_faculty_id();
  else raise exception 'İcazə yoxdur'; end if;

  return query select
    (select count(*) from public.profiles p where p.created_at>=p_start and p.created_at<p_end and (v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope)))),
    (select count(*) from public.profiles p join public.user_roles ur on ur.user_id=p.user_id and ur.role='telebe'::public.app_role where p.created_at>=p_start and p.created_at<p_end and (v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope)))),
    (select count(*) from public.profiles p join public.user_roles ur on ur.user_id=p.user_id and ur.role='muellim'::public.app_role where p.created_at>=p_start and p.created_at<p_end and (v_scope is null or lower(btrim(p.fakulte))=lower(btrim(v_scope)))),
    (select count(*) from public.groups g where g.created_at>=p_start and g.created_at<p_end and (v_faculty_id is null or g.faculty_id=v_faculty_id)),
    (select count(distinct c.id) from public.courses c where c.created_at>=p_start and c.created_at<p_end and (v_faculty_id is null or exists(select 1 from public.course_groups cg join public.groups g on g.id=cg.group_id where cg.course_id=c.id and g.faculty_id=v_faculty_id) or exists(select 1 from public.groups g where g.id=c.group_id and g.faculty_id=v_faculty_id))),
    (select count(*) from public.library_books b where b.elave_olunma_tarixi>=p_start and b.elave_olunma_tarixi<p_end);
end;
$$;

create or replace function public.set_profile_status(_user_id uuid,_status text)
returns public.profiles
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare result public.profiles;
begin
  if not public.has_role((select auth.uid()),'admin'::public.app_role) and not private.dekan_can_access_user(_user_id) then raise exception 'Bu əməliyyata icazəniz yoxdur'; end if;
  if _status not in ('AKTİV','PASSİV') then raise exception 'Status düzgün deyil'; end if;
  update public.profiles set status=_status,updated_at=now() where user_id=_user_id returning * into result;
  if result.user_id is null then raise exception 'İstifadəçi tapılmadı'; end if;
  return result;
end;
$$;

create or replace function public.broadcast_notification(p_tip text,"p_baslıq" text,p_metin text,p_hedef_rol public.app_role default null,p_hedef_qrup uuid default null)
returns integer
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare v_sayi integer; v_uid uuid:=auth.uid(); v_admin boolean; v_dekan boolean;
begin
  v_admin:=public.has_role(v_uid,'admin'::public.app_role); v_dekan:=public.has_role(v_uid,'dekan'::public.app_role);
  if not (v_admin or v_dekan) then raise exception 'Yalnız admin və ya dekan bildiriş göndərə bilər.' using errcode='42501'; end if;
  if p_tip not in ('sistem','tedbir','xeberdarliq','mukafat','shexsi','sosial','xususi_gun','elan') then raise exception 'Yanlış bildiriş tipi: %',p_tip; end if;
  if "p_baslıq" is null or btrim("p_baslıq")='' then raise exception 'Başlıq boş ola bilməz.'; end if;
  if p_hedef_qrup is not null then
    if v_dekan and not private.dekan_can_access_group(p_hedef_qrup) then raise exception 'Başqa fakültənin qrupuna bildiriş göndərmək olmaz'; end if;
    insert into public.notifications(profile_id,tip,baslıq,metin,elave_data)
    select gm.user_id,p_tip,"p_baslıq",p_metin,jsonb_build_object('group_id',p_hedef_qrup,'source','admin_broadcast') from public.group_members gm where gm.group_id=p_hedef_qrup;
  elsif p_hedef_rol is not null then
    insert into public.notifications(profile_id,tip,baslıq,metin,elave_data)
    select ur.user_id,p_tip,"p_baslıq",p_metin,jsonb_build_object('source','admin_broadcast','target_role',p_hedef_rol::text)
    from public.user_roles ur where ur.role=p_hedef_rol and (v_admin or private.dekan_can_access_user(ur.user_id));
  else
    insert into public.notifications(profile_id,tip,baslıq,metin,elave_data)
    select p.user_id,p_tip,"p_baslıq",p_metin,jsonb_build_object('source','admin_broadcast') from public.profiles p where v_admin or private.dekan_can_access_user(p.user_id);
  end if;
  get diagnostics v_sayi=row_count; return v_sayi;
end;
$$;