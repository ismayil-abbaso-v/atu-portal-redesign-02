-- Elektron Jurnal yekun audit testi
-- Supabase SQL Editor / psql ilə işlədilə bilər. Heç bir production data dəyişmir.

BEGIN;

DO $$
DECLARE
  v_table text;
  v_policy_count integer;
  v_total numeric;
  v_view text;
BEGIN
  -- 1) Bütün yeni cədvəllərdə RLS aktiv olmalıdır.
  FOREACH v_table IN ARRAY ARRAY[
    'course_schedule_templates',
    'course_lesson_sessions',
    'lesson_student_records',
    'independent_work_assessments',
    'course_work_assessments',
    'colloquium_assessments'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS aktiv deyil: %', v_table;
    END IF;

    SELECT count(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table;

    IF v_policy_count <> 4 THEN
      RAISE EXCEPTION '% üçün SELECT/INSERT/UPDATE/DELETE policy sayı 4 deyil: %', v_table, v_policy_count;
    END IF;
  END LOOP;

  -- 2) Təsdiq kilidi və tələbə grade qoruması DB trigger səviyyəsində olmalıdır.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.course_lesson_sessions'::regclass
      AND tgname = 'guard_confirmed_lesson_session'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Təsdiqlənmiş sessiya kilidi trigger-i yoxdur.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.independent_work_assessments'::regclass
      AND tgname = 'protect_independent_work_student_fields'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.course_work_assessments'::regclass
      AND tgname = 'protect_course_work_student_fields'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.lesson_student_records'::regclass
      AND tgname = 'protect_student_lesson_fields'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Tələbə submission/grade qoruma trigger-lərindən biri yoxdur.';
  END IF;

  -- 3) Konkret formul nümunəsi:
  -- a=8,b=9,c=7,d=4,e=5,məşğələ_orta=8.5,l=64,m=3 => 42.66
  v_total := (private.semester_score_components(
    'meshgele'::public.course_grading_type,
    false,
    64,
    3,
    8, 9, 7,
    4, 5,
    8.5,
    0, NULL, 0
  )->>'total')::numeric;

  IF v_total <> 42.66 THEN
    RAISE EXCEPTION 'Formula audit nəticəsi 42.66 deyil: %', v_total;
  END IF;

  -- 4) ÜST/ALT rotasiyası növbəti həftədə çevrilməlidir.
  IF private.week_parity_from_anchor('2026-09-14', '2026-09-14', 'ust'::public.academic_week_type) <> 'ust'::public.academic_week_type
     OR private.week_parity_from_anchor('2026-09-21', '2026-09-14', 'ust'::public.academic_week_type) <> 'alt'::public.academic_week_type
     OR private.week_parity_from_anchor('2026-09-28', '2026-09-14', 'ust'::public.academic_week_type) <> 'ust'::public.academic_week_type THEN
    RAISE EXCEPTION 'ÜST/ALT rotasiya hesablaması yanlışdır.';
  END IF;

  -- 5) Müəllim qiymətləndirmə pəncərəsi ±5 dəqiqə sərhədlərini dəqiq saxlamalıdır.
  IF NOT private.grade_time_window_contains(
    '2026-09-14 10:00:00+04'::timestamptz,
    '2026-09-14 11:30:00+04'::timestamptz,
    '2026-09-14 09:55:00+04'::timestamptz
  ) OR NOT private.grade_time_window_contains(
    '2026-09-14 10:00:00+04'::timestamptz,
    '2026-09-14 11:30:00+04'::timestamptz,
    '2026-09-14 11:35:00+04'::timestamptz
  ) OR private.grade_time_window_contains(
    '2026-09-14 10:00:00+04'::timestamptz,
    '2026-09-14 11:30:00+04'::timestamptz,
    '2026-09-14 11:35:01+04'::timestamptz
  ) THEN
    RAISE EXCEPTION '±5 dəqiqə grading window hesablaması yanlışdır.';
  END IF;

  -- 6) Sərbəst iş üçün üçüncü slot DB constraint ilə mümkün olmamalıdır.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.independent_work_assessments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%sira%'
      AND pg_get_constraintdef(oid) ILIKE '%1%'
      AND pg_get_constraintdef(oid) ILIKE '%2%'
  ) THEN
    RAISE EXCEPTION 'Sərbəst iş sira=1/2 constraint-i tapılmadı.';
  END IF;

  -- 7) Köhnə dashboard view-ları yeni təsdiqlənmiş jurnal mənbəyini istifadə etməlidir.
  SELECT pg_get_viewdef('public.faculty_stats'::regclass, true) INTO v_view;
  IF v_view NOT ILIKE '%lesson_student_records%' OR v_view NOT ILIKE '%course_lesson_sessions%' THEN
    RAISE EXCEPTION 'faculty_stats yeni jurnal davamiyyətini istifadə etmir.';
  END IF;

  SELECT pg_get_viewdef('public.group_stats'::regclass, true) INTO v_view;
  IF v_view NOT ILIKE '%lesson_student_records%' OR v_view NOT ILIKE '%course_lesson_sessions%' THEN
    RAISE EXCEPTION 'group_stats yeni jurnal davamiyyətini istifadə etmir.';
  END IF;

  -- 8) View-lar caller RLS-i saxlamalıdır.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='faculty_stats'
      AND 'security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[]))
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='group_stats'
      AND 'security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'Stats view-lardan biri security_invoker deyil.';
  END IF;

  -- 9) Storage submission policy-ləri mövcud olmalıdır.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='course_materials_student_submission_insert'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='course_materials_select'
  ) THEN
    RAISE EXCEPTION 'Elektron jurnal Storage policy-ləri natamamdır.';
  END IF;

  RAISE NOTICE 'Elektron jurnal struktur/formula/RLS audit testləri uğurla keçdi.';
END
$$;

ROLLBACK;
