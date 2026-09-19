-- FAZA 9.2: Admin Panel — İstifadəçilər idarəetməsi
-- Qeyd: public.has_role() FAZA 2-dən, public.handle_new_user() trigger-i (auth.users -> profiles +
-- defolt 'telebe' rolu) mövcud sxemdən mövcuddur, burada yenidən yaradılmır.

-- 1) profiles cədvəlinə əlavə sütunlar (mövcudları pozmadan)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ixtisas text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qebul_ili integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bitirme_ili integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tehsil_haqqi numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS esd_istifadeci boolean NOT NULL DEFAULT false;

-- 2) Dekan üçün YALNIZ status sütununu dəyişə bilmə qaydası.
--    Postgres-də bütün authenticated istifadəçilər eyni DB roluna sahibdir (RLS row-level-dir,
--    column-level DEYİL), ona görə sütun-səviyyəli məhdudiyyət BEFORE UPDATE trigger ilə həyata
--    keçirilir. admin və öz-profilini-redaktə-edən istifadəçi məhdudiyyətsiz qalır (mövcud davranış
--    qorunur), YALNIZ dekan başqasının profilini redaktə edəndə status-dan başqa heç nə dəyişə bilməz.
CREATE OR REPLACE FUNCTION public.restrict_dekan_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'dekan') THEN
    IF NEW.ad IS DISTINCT FROM OLD.ad OR NEW.soyad IS DISTINCT FROM OLD.soyad OR
       NEW.ata_adi IS DISTINCT FROM OLD.ata_adi OR NEW.dogum_tarixi IS DISTINCT FROM OLD.dogum_tarixi OR
       NEW.cins IS DISTINCT FROM OLD.cins OR NEW.fin_kodu IS DISTINCT FROM OLD.fin_kodu OR
       NEW.e_poct IS DISTINCT FROM OLD.e_poct OR NEW.telefon IS DISTINCT FROM OLD.telefon OR
       NEW.sheher IS DISTINCT FROM OLD.sheher OR NEW.istifadeci_adi IS DISTINCT FROM OLD.istifadeci_adi OR
       NEW.bolme IS DISTINCT FROM OLD.bolme OR NEW.fakulte IS DISTINCT FROM OLD.fakulte OR
       NEW.qrup IS DISTINCT FROM OLD.qrup OR NEW.sinif IS DISTINCT FROM OLD.sinif OR
       NEW.tedris_ili IS DISTINCT FROM OLD.tedris_ili OR NEW.tehsil_novu IS DISTINCT FROM OLD.tehsil_novu OR
       NEW.dim_bali IS DISTINCT FROM OLD.dim_bali OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url OR
       NEW.sosial_veziyyet IS DISTINCT FROM OLD.sosial_veziyyet OR NEW.ixtisas IS DISTINCT FROM OLD.ixtisas OR
       NEW.qebul_ili IS DISTINCT FROM OLD.qebul_ili OR NEW.bitirme_ili IS DISTINCT FROM OLD.bitirme_ili OR
       NEW.tehsil_haqqi IS DISTINCT FROM OLD.tehsil_haqqi OR
       NEW.esd_istifadeci IS DISTINCT FROM OLD.esd_istifadeci
    THEN
      RAISE EXCEPTION 'Dekan yalnız istifadəçinin statusunu dəyişə bilər';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_dekan_profile_update ON public.profiles;
CREATE TRIGGER trg_restrict_dekan_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.restrict_dekan_profile_update();

-- Dekan-a bütün profilləri UPDATE etməyə İCAZƏ verən policy (yuxarıdakı trigger sütunları
-- məhdudlaşdırır). Mövcud "profiles_update_own" (admin + öz-profili) toxunulmaz qalır.
DROP POLICY IF EXISTS "profiles_update_dekan" ON public.profiles;
CREATE POLICY "profiles_update_dekan" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'dekan'))
  WITH CHECK (public.has_role(auth.uid(), 'dekan'));

-- 2b) user_roles cədvəli əvvəllər YALNIZ SELECT GRANT-ına sahib idi (yazma tamamilə service_role-a
--     həsr olunmuşdu). "İstifadəçini Redaktə Et" formu admin tərəfindən birbaşa
--     supabase.from('user_roles') ilə rol dəyişə bilsin deyə, digər cədvəllərdəki
--     GRANT+RLS konvensiyasına uyğun YALNIZ admin üçün yazma icazəsi əlavə edirik.
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "roles_write_admin" ON public.user_roles;
CREATE POLICY "roles_write_admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) admin_list_users: axtarış + süzgəc + sıralama + server-side pagination + rol aqreqasiyası
--    tək sorğuda (SECURITY DEFINER, admin_dashboard_stats konvensiyasına uyğun).
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_axtaris text DEFAULT NULL,
  p_rollar public.app_role[] DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_fakulte text DEFAULT NULL,
  p_sort_sutun text DEFAULT 'created_at',
  p_sort_istiqamet text DEFAULT 'desc',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  ad text,
  soyad text,
  ata_adi text,
  istifadeci_adi text,
  avatar_url text,
  telefon text,
  e_poct text,
  cins text,
  fin_kodu text,
  dogum_tarixi date,
  qebul_ili integer,
  bitirme_ili integer,
  ixtisas text,
  fakulte text,
  qrup text,
  sheher text,
  dim_bali numeric,
  status text,
  rollar public.app_role[],
  umumi_say bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')) THEN
    RAISE EXCEPTION 'İcazə yoxdur';
  END IF;

  RETURN QUERY
  WITH filtrli AS (
    SELECT
      p.user_id, p.ad, p.soyad, p.ata_adi, p.istifadeci_adi, p.avatar_url, p.telefon, p.e_poct,
      p.cins, p.fin_kodu, p.dogum_tarixi, p.qebul_ili, p.bitirme_ili, p.ixtisas, p.fakulte, p.qrup,
      p.sheher, p.dim_bali, p.status, p.created_at,
      COALESCE(r.rollar, ARRAY[]::public.app_role[]) AS rollar
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, array_agg(role) AS rollar FROM public.user_roles GROUP BY user_id
    ) r ON r.user_id = p.user_id
    WHERE
      (p_axtaris IS NULL OR p_axtaris = '' OR
        p.ad ILIKE '%' || p_axtaris || '%' OR
        p.soyad ILIKE '%' || p_axtaris || '%' OR
        p.istifadeci_adi ILIKE '%' || p_axtaris || '%' OR
        p.e_poct ILIKE '%' || p_axtaris || '%')
      AND (p_status IS NULL OR p.status = p_status)
      AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)
      AND (p_rollar IS NULL OR COALESCE(r.rollar, ARRAY[]::public.app_role[]) && p_rollar)
  )
  SELECT
    f.user_id, f.ad, f.soyad, f.ata_adi, f.istifadeci_adi, f.avatar_url, f.telefon, f.e_poct,
    f.cins, f.fin_kodu, f.dogum_tarixi, f.qebul_ili, f.bitirme_ili, f.ixtisas, f.fakulte, f.qrup,
    f.sheher, f.dim_bali, f.status, f.rollar,
    count(*) OVER() AS umumi_say
  FROM filtrli f
  ORDER BY
    CASE WHEN p_sort_sutun = 'ad' AND p_sort_istiqamet = 'asc' THEN f.ad END ASC NULLS LAST,
    CASE WHEN p_sort_sutun = 'ad' AND p_sort_istiqamet = 'desc' THEN f.ad END DESC NULLS LAST,
    CASE WHEN p_sort_sutun = 'soyad' AND p_sort_istiqamet = 'asc' THEN f.soyad END ASC NULLS LAST,
    CASE WHEN p_sort_sutun = 'soyad' AND p_sort_istiqamet = 'desc' THEN f.soyad END DESC NULLS LAST,
    CASE WHEN p_sort_sutun = 'qebul_ili' AND p_sort_istiqamet = 'asc' THEN f.qebul_ili END ASC NULLS LAST,
    CASE WHEN p_sort_sutun = 'qebul_ili' AND p_sort_istiqamet = 'desc' THEN f.qebul_ili END DESC NULLS LAST,
    f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(
  text, public.app_role[], text, text, text, text, integer, integer
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(
  text, public.app_role[], text, text, text, text, integer, integer
) FROM anon, public;

-- 4) 'avatars' Storage bucket-i (profil şəkilləri, ictimai oxuna bilər, YALNIZ admin yükləyə bilər —
--    "Şəkli dəyiş" indi bu fazada YALNIZ admin-panel üzərindən mövcuddur).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_admin" ON storage.objects;
CREATE POLICY "avatars_insert_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "avatars_update_admin" ON storage.objects;
CREATE POLICY "avatars_update_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "avatars_delete_admin" ON storage.objects;
CREATE POLICY "avatars_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));
