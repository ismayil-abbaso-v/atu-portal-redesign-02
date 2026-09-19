-- Elektron jurnal biznes məntiqi üçün DB səviyyəli deterministik testlər.
-- Transaction sonda rollback edilir; production məlumatı dəyişmir.
BEGIN;

DO $$
DECLARE
  v numeric;
BEGIN
  v := private.semester_score_formula(
    'meshgele'::public.course_grading_type, false, 64, 4,
    10, 8, 9, 5, 4, 8, 0, NULL, 0
  );
  IF v <> 43.55 THEN
    RAISE EXCEPTION 'Formula test 1: expected 43.55, got %', v;
  END IF;

  v := private.semester_score_formula(
    'laboratoriya'::public.course_grading_type, true, 80, 5,
    7, 8, 9, 5, 5, 0, 8, 10, 9
  );
  IF v <> 43.75 THEN
    RAISE EXCEPTION 'Formula test 2: expected 43.75, got %', v;
  END IF;

  v := private.semester_score_formula(
    'meshgele'::public.course_grading_type, false, 80, 0,
    10, 10, 10, 5, 5, 10, 0, NULL, 0
  );
  IF v <> 50.00 THEN
    RAISE EXCEPTION 'Formula test 3: expected 50.00, got %', v;
  END IF;

  IF public.absence_limit(64) <> 8
     OR public.absence_limit(63) <> 7
     OR public.absence_limit(0) <> 0 THEN
    RAISE EXCEPTION 'absence_limit tests failed';
  END IF;

  IF NOT private.grade_time_window_contains(
    '2026-09-14 10:00+04'::timestamptz,
    '2026-09-14 11:30+04'::timestamptz,
    '2026-09-14 09:55+04'::timestamptz
  ) THEN
    RAISE EXCEPTION 'grade window -5 boundary failed';
  END IF;

  IF NOT private.grade_time_window_contains(
    '2026-09-14 10:00+04'::timestamptz,
    '2026-09-14 11:30+04'::timestamptz,
    '2026-09-14 11:35+04'::timestamptz
  ) THEN
    RAISE EXCEPTION 'grade window +5 boundary failed';
  END IF;

  IF private.grade_time_window_contains(
    '2026-09-14 10:00+04'::timestamptz,
    '2026-09-14 11:30+04'::timestamptz,
    '2026-09-14 09:54:59+04'::timestamptz
  ) THEN
    RAISE EXCEPTION 'grade window outside boundary failed';
  END IF;
END $$;

UPDATE public.system_settings
SET birinci_hefte_novu = 'ust'::public.academic_week_type,
    hefte_rotasiya_baslama_tarixi = '2026-09-14'::date
WHERE id = (
  SELECT id
  FROM public.system_settings
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
);

DO $$
BEGIN
  IF public.get_week_parity('2026-09-14') <> 'ust'::public.academic_week_type THEN
    RAISE EXCEPTION 'week parity offset 0 failed';
  END IF;
  IF public.get_week_parity('2026-09-17') <> 'ust'::public.academic_week_type THEN
    RAISE EXCEPTION 'week parity same-week failed';
  END IF;
  IF public.get_week_parity('2026-09-21') <> 'alt'::public.academic_week_type THEN
    RAISE EXCEPTION 'week parity offset 1 failed';
  END IF;
  IF public.get_week_parity('2026-09-28') <> 'ust'::public.academic_week_type THEN
    RAISE EXCEPTION 'week parity offset 2 failed';
  END IF;
END $$;

ROLLBACK;
