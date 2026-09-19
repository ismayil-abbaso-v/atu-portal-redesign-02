-- ATU Portal: Excel user import/export schema alignment
-- "Təhsil haqqı" in the supplied XLSX is a status (e.g. ödənişli / dövlət sifarişi),
-- while the existing numeric tehsil_haqqi column is kept for real monetary amounts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tehsil_haqqi_statusu text;

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
       NEW.tehsil_haqqi_statusu IS DISTINCT FROM OLD.tehsil_haqqi_statusu OR
       NEW.esd_istifadeci IS DISTINCT FROM OLD.esd_istifadeci
    THEN
      RAISE EXCEPTION 'Dekan yalnız istifadəçinin statusunu dəyişə bilər';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer);
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
  tehsil_novu text,
  sosial_veziyyet text,
  tehsil_haqqi numeric,
  tehsil_haqqi_statusu text,
  esd_istifadeci boolean,
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
      p.sheher, p.dim_bali, p.tehsil_novu, p.sosial_veziyyet, p.tehsil_haqqi,
      p.tehsil_haqqi_statusu, p.esd_istifadeci, p.status, p.created_at,
      COALESCE(r.rollar, ARRAY[]::public.app_role[]) AS rollar
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, array_agg(role ORDER BY role) AS rollar FROM public.user_roles GROUP BY user_id
    ) r ON r.user_id = p.user_id
    WHERE
      (p_axtaris IS NULL OR p_axtaris = '' OR p.ad ILIKE '%' || p_axtaris || '%' OR
       p.soyad ILIKE '%' || p_axtaris || '%' OR p.istifadeci_adi ILIKE '%' || p_axtaris || '%' OR
       p.e_poct ILIKE '%' || p_axtaris || '%')
      AND (p_status IS NULL OR p.status = p_status)
      AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)
      AND (p_rollar IS NULL OR COALESCE(r.rollar, ARRAY[]::public.app_role[]) && p_rollar)
  )
  SELECT
    f.user_id, f.ad, f.soyad, f.ata_adi, f.istifadeci_adi, f.avatar_url, f.telefon, f.e_poct,
    f.cins, f.fin_kodu, f.dogum_tarixi, f.qebul_ili, f.bitirme_ili, f.ixtisas, f.fakulte, f.qrup,
    f.sheher, f.dim_bali, f.tehsil_novu, f.sosial_veziyyet, f.tehsil_haqqi,
    f.tehsil_haqqi_statusu, f.esd_istifadeci, f.status, f.rollar, count(*) OVER() AS umumi_say
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

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer) FROM anon, public;
