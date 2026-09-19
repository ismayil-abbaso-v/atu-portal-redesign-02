-- FAZA 9.0: Admin Panel ümumi təməli
-- system_settings: tək-sətir konvensiyası ilə sistem tənzimləmələri (FAZA 9.6-da tam istifadə olunacaq)
-- Qeyd: public.has_role() funksiyası FAZA 2-dən mövcuddur, burada yenidən yaradılmır.

CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universitet_adi text,
  elaqe_e_poct text,
  cari_tedris_ili text,
  cari_semestr text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));
CREATE POLICY "system_settings_update_admin" ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tək-sətir konvensiyası: defolt sətri əlavə et
INSERT INTO public.system_settings (universitet_adi, elaqe_e_poct, cari_tedris_ili, cari_semestr)
VALUES ('Azərbaycan Texniki Universiteti', 'info@atu.edu.az', '2025-2026', 'Payız');
