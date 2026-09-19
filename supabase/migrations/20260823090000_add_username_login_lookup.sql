-- Giriş səhifəsində tələbələrin (və digər istifadəçilərin) e-poçt əvəzinə
-- "istifadəçi adı" ilə daxil ola bilməsi üçün: hələ giriş etməmiş (anon)
-- istifadəçinin daxil etdiyi istifadəçi adına uyğun e-poçtu tapan funksiya.
--
-- Təhlükəsizlik: SECURITY DEFINER olsa da, funksiya YALNIZ e-poçt ünvanını
-- qaytarır — heç bir başqa profil sahəsi (ad, telefon və s.) ifşa olunmur.
-- Bu, brauzerdəki Supabase Auth çağırışının (signInWithPassword) tələb
-- etdiyi e-poçtu əldə etmək üçün ilkin addımdır.

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_istifadeci_adi text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT e_poct
  FROM public.profiles
  WHERE e_poct IS NOT NULL
    AND lower(istifadeci_adi) = lower(trim(p_istifadeci_adi))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
