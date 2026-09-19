-- Elektron Jurnal risk siyahısı regression testi.
-- Production datasını dəyişmir; yalnız funksiyanın təsdiqlənmiş sessiyaları
-- mənbə kimi saxladığını yoxlayır.

BEGIN;

DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'at_risk_students'
  LIMIT 1;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'public.at_risk_students(uuid) tapılmadı.';
  END IF;

  IF v_definition NOT ILIKE '%is_confirmed IS TRUE%' THEN
    RAISE EXCEPTION 'Risk siyahısı yalnız təsdiqlənmiş dərs sessiyalarını saymır.';
  END IF;

  RAISE NOTICE 'Risk siyahısı yalnız təsdiqlənmiş qayıbları hesablayır.';
END
$$;

ROLLBACK;
