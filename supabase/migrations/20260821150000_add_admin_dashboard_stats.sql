-- FAZA 9.1: Admin Panel — İdarəetmə Paneli (statistik dashboard)
--
-- Qeyd: Tapşırıqda "CREATE VIEW admin_dashboard_stats" tövsiyə olunurdu, lakin dashboard
-- tarix aralığı VƏ fakültə üzrə DİNAMİK filtrlənməlidir — sadə VIEW parametr qəbul edə bilmir.
-- Ona görə eyni performans məqsədini (bir sorğuda YIĞCAM aggregate) SECURITY DEFINER
-- FUNKSİYALARI ilə həyata keçiririk (mövcud has_role/broadcast_notification konvensiyasına
-- uyğun). Hər funksiya daxilində admin/dekan yoxlaması edilir — icazəsiz çağırış xəta qaytarır.
--
-- Qeyd: "groups" və "courses" cədvəllərində fakultə sütunu YOXDUR, ona görə fakültə filtri
-- yalnız profiles-əsaslı göstəricilərə (ümumi istifadəçilər, tələbələr, müəllimlər,
-- qeydiyyat trendi, rol bölgüsü) tətbiq olunur; qruplar/fənlər/kitablar yalnız tarix aralığı
-- ilə filtrlənir.

-- 1) Əsas 6 statistik göstərici (kartlar): ümumi istifadəçilər, tələbələr, müəllimlər,
--    qruplar, fənlər, kitablar — seçilmiş dövrdə YARADILANLAR + fakültə filtri.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(
  p_start timestamptz,
  p_end timestamptz,
  p_fakulte text DEFAULT NULL
)
RETURNS TABLE (
  total_istifadeciler bigint,
  telebeler bigint,
  muellimler bigint,
  qruplar bigint,
  fenler bigint,
  kitablar bigint
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
  SELECT
    (SELECT count(*) FROM public.profiles p
      WHERE p.created_at >= p_start AND p.created_at < p_end
        AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)),
    (SELECT count(*) FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'telebe'::public.app_role
      WHERE p.created_at >= p_start AND p.created_at < p_end
        AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)),
    (SELECT count(*) FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'muellim'::public.app_role
      WHERE p.created_at >= p_start AND p.created_at < p_end
        AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)),
    (SELECT count(*) FROM public.groups g
      WHERE g.created_at >= p_start AND g.created_at < p_end),
    (SELECT count(*) FROM public.courses c
      WHERE c.created_at >= p_start AND c.created_at < p_end),
    (SELECT count(*) FROM public.library_books b
      WHERE b.elave_olunma_tarixi >= p_start AND b.elave_olunma_tarixi < p_end);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz, text) FROM anon, public;

-- 2) "Qeydiyyatları" xətti qrafiki üçün: seçilmiş dövrdə gün/həftə/ay üzrə profiles.created_at COUNT.
CREATE OR REPLACE FUNCTION public.admin_registration_trend(
  p_start timestamptz,
  p_end timestamptz,
  p_fakulte text DEFAULT NULL,
  p_granularity text DEFAULT 'week'
)
RETURNS TABLE (bucket timestamptz, say bigint)
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
  SELECT
    date_trunc(
      CASE WHEN p_granularity IN ('day', 'week', 'month') THEN p_granularity ELSE 'week' END,
      p.created_at
    ) AS bucket,
    count(*) AS say
  FROM public.profiles p
  WHERE p.created_at >= p_start AND p.created_at < p_end
    AND (p_fakulte IS NULL OR p.fakulte = p_fakulte)
  GROUP BY 1
  ORDER BY 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_registration_trend(timestamptz, timestamptz, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_registration_trend(timestamptz, timestamptz, text, text) FROM anon, public;

-- 3) "İstifadəçilər" donut qrafiki üçün: rol üzrə bölgü (cari, fakültə filtri ilə).
CREATE OR REPLACE FUNCTION public.admin_role_distribution(p_fakulte text DEFAULT NULL)
RETURNS TABLE (role public.app_role, say bigint)
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
  SELECT ur.role, count(*) AS say
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE p_fakulte IS NULL OR p.fakulte = p_fakulte
  GROUP BY ur.role
  ORDER BY count(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_role_distribution(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_role_distribution(text) FROM anon, public;

-- 4) Fakültə filtri Select-i üçün: profiles.fakulte-dəki unikal dəyərlər.
CREATE OR REPLACE FUNCTION public.admin_distinct_faculties()
RETURNS TABLE (fakulte text)
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
  SELECT DISTINCT p.fakulte FROM public.profiles p
  WHERE p.fakulte IS NOT NULL AND p.fakulte <> ''
  ORDER BY p.fakulte;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_distinct_faculties() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_distinct_faculties() FROM anon, public;

-- Qeyd (FAZA 9.5 üçün TODO): activity_logs cədvəli yaradıldıqdan sonra bura əlavə olunacaq:
--   * admin_active_now_count() — son 5 dəqiqədə fəal istifadəçi sayı ("N aktiv" badge-i)
--   * admin_today_logs_count() — bugünkü loqların sayı (stat kart)
--   * admin_top_active_users(p_start, p_end, limit) — ən aktiv istifadəçilər (GROUP BY user_id COUNT DESC)
--   * admin_today_sessions_count() — bugünkü sessiya sayğacı
--   * admin_recent_activity(limit) — son fəaliyyət lenti
-- Hazırkı FAZA 9.1-də bu göstəricilər frontend-də "—" / boş vəziyyət kimi göstərilir.
