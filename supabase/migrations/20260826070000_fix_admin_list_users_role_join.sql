-- Fix admin_list_users after the Excel schema migration.
-- The output column user_id is also a PL/pgSQL variable, so user_roles.user_id
-- must be explicitly qualified to avoid 42702 "column reference user_id is ambiguous".
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
  user_id uuid, ad text, soyad text, ata_adi text, istifadeci_adi text,
  avatar_url text, telefon text, e_poct text, cins text, fin_kodu text,
  dogum_tarixi date, qebul_ili integer, bitirme_ili integer, ixtisas text,
  fakulte text, qrup text, sheher text, dim_bali numeric, tehsil_novu text,
  sosial_veziyyet text, tehsil_haqqi numeric, tehsil_haqqi_statusu text,
  esd_istifadeci boolean, status text, rollar public.app_role[], umumi_say bigint
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
      p.user_id, p.ad, p.soyad, p.ata_adi, p.istifadeci_adi, p.avatar_url,
      p.telefon, p.e_poct, p.cins, p.fin_kodu, p.dogum_tarixi, p.qebul_ili,
      p.bitirme_ili, p.ixtisas, p.fakulte, p.qrup, p.sheher, p.dim_bali,
      p.tehsil_novu, p.sosial_veziyyet, p.tehsil_haqqi,
      p.tehsil_haqqi_statusu, p.esd_istifadeci, p.status, p.created_at,
      COALESCE(r.rollar, ARRAY[]::public.app_role[]) AS rollar
    FROM public.profiles p
    LEFT JOIN (
      SELECT ur.user_id, array_agg(ur.role ORDER BY ur.role) AS rollar
      FROM public.user_roles ur
      GROUP BY ur.user_id
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
    f.user_id, f.ad, f.soyad, f.ata_adi, f.istifadeci_adi, f.avatar_url,
    f.telefon, f.e_poct, f.cins, f.fin_kodu, f.dogum_tarixi, f.qebul_ili,
    f.bitirme_ili, f.ixtisas, f.fakulte, f.qrup, f.sheher, f.dim_bali,
    f.tehsil_novu, f.sosial_veziyyet, f.tehsil_haqqi,
    f.tehsil_haqqi_statusu, f.esd_istifadeci, f.status, f.rollar,
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

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, public.app_role[], text, text, text, text, integer, integer) FROM anon, public;
