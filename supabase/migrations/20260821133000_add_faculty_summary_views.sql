-- Faza: Fakültə İcmalı
-- Dekan üçün fakültə-səviyyəli statistik görünüşlər və status dəyişmə RPC-si.

CREATE OR REPLACE VIEW public.group_performance_view AS
WITH attendance_agg AS (
  SELECT
    c.group_id,
    avg(CASE WHEN lower(a.statusu) IN ('var', 'iştirak etdi', 'present', 'prezent') THEN 100.0 ELSE 0.0 END) AS attendance_pct
  FROM public.courses c
  JOIN public.attendance a ON a.course_id = c.id
  WHERE c.group_id IS NOT NULL
  GROUP BY c.group_id
),
score_agg AS (
  SELECT c.group_id, avg(es.yekun_qiymet) AS avg_final_grade
  FROM public.courses c
  JOIN public.exam_scores es ON es.course_id = c.id
  WHERE c.group_id IS NOT NULL AND es.yekun_qiymet IS NOT NULL
  GROUP BY c.group_id
)
SELECT
  g.id AS group_id,
  g.ad AS group_ad,
  g.tyutor_id,
  COALESCE(f.fakulte, 'Təyin edilməyib') AS fakulte,
  COUNT(DISTINCT gm.user_id)::integer AS student_count,
  round(COALESCE(aa.attendance_pct, 0)::numeric, 2) AS avg_attendance_pct,
  round(COALESCE(sa.avg_final_grade, 0)::numeric, 2) AS avg_final_grade
FROM public.groups g
LEFT JOIN public.group_members gm ON gm.group_id = g.id
LEFT JOIN public.profiles f ON f.user_id = gm.user_id
LEFT JOIN attendance_agg aa ON aa.group_id = g.id
LEFT JOIN score_agg sa ON sa.group_id = g.id
WHERE NOT COALESCE(g.arxivlenib, false)
GROUP BY g.id, g.ad, g.tyutor_id, f.fakulte, aa.attendance_pct, sa.avg_final_grade;

CREATE OR REPLACE VIEW public.tutor_performance_view AS
SELECT
  g.tyutor_id AS tutor_id,
  COALESCE(t.fakulte, 'Təyin edilməyib') AS fakulte,
  COUNT(DISTINCT g.id)::integer AS group_count,
  COUNT(DISTINCT gm.user_id)::integer AS student_count,
  round(COALESCE(avg(gpv.avg_attendance_pct), 0)::numeric, 2) AS avg_attendance_pct,
  round(COALESCE(avg(gpv.avg_final_grade), 0)::numeric, 2) AS avg_final_grade,
  COALESCE(string_agg(DISTINCT g.ad, ', ' ORDER BY g.ad), '') AS group_names
FROM public.groups g
LEFT JOIN public.profiles t ON t.user_id = g.tyutor_id
LEFT JOIN public.group_members gm ON gm.group_id = g.id
LEFT JOIN public.group_performance_view gpv ON gpv.group_id = g.id
WHERE g.tyutor_id IS NOT NULL AND NOT COALESCE(g.arxivlenib, false)
GROUP BY g.tyutor_id, t.fakulte;

CREATE OR REPLACE VIEW public.faculty_attendance_trend_view AS
WITH aylar AS (
  SELECT date_trunc('month', current_date) - (interval '1 month' * s) AS ay
  FROM generate_series(0, 5) AS s
), fakulte_tələbələri AS (
  SELECT DISTINCT p.fakulte, p.user_id
  FROM public.profiles p
  WHERE p.fakulte IS NOT NULL
), davamiyyət AS (
  SELECT
    ft.fakulte,
    date_trunc('month', a.tarix::timestamp) AS ay,
    avg(CASE WHEN lower(a.statusu) IN ('var', 'iştirak etdi', 'present', 'prezent') THEN 100.0 ELSE 0.0 END) AS attendance_pct
  FROM fakulte_tələbələri ft
  JOIN public.attendance a ON a.user_id = ft.user_id
  WHERE a.tarix >= (date_trunc('month', current_date) - interval '5 months')::date
  GROUP BY ft.fakulte, date_trunc('month', a.tarix::timestamp)
)
SELECT
  f.fakulte,
  a.ay,
  round(COALESCE(d.attendance_pct, 0)::numeric, 2) AS avg_attendance_pct
FROM (SELECT DISTINCT fakulte FROM fakulte_tələbələri) f
CROSS JOIN aylar a
LEFT JOIN davamiyyət d ON d.fakulte = f.fakulte AND d.ay = a.ay;

-- faculty_stats mövcud view-dan istifadə etmək üçün təhlükəsiz status dəyişmə RPC-si.
CREATE OR REPLACE FUNCTION public.set_profile_status(_user_id uuid, _status text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')) THEN
    RAISE EXCEPTION 'Bu əməliyyata icazəniz yoxdur';
  END IF;

  IF _status NOT IN ('AKTİV', 'PASSİV') THEN
    RAISE EXCEPTION 'Status düzgün deyil';
  END IF;

  UPDATE public.profiles
  SET status = _status, updated_at = now()
  WHERE user_id = _user_id
  RETURNING * INTO result;

  IF result.user_id IS NULL THEN
    RAISE EXCEPTION 'İstifadəçi tapılmadı';
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_status(uuid, text) TO authenticated;
