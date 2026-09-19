-- Faza 11: Real-Time Bildiriş Sistemi
-- notifications + notification_settings cədvəlləri, RLS, sistemdaxili trigger-lər və admin broadcast RPC-i

-- ============================================================================
-- 1) CƏDVƏLLƏR
-- ============================================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tip text NOT NULL CHECK (
    tip IN ('sistem', 'tedbir', 'xeberdarliq', 'mukafat', 'shexsi', 'sosial', 'xususi_gun', 'elan')
  ),
  baslıq text NOT NULL,
  metin text,
  oxunub_mu boolean NOT NULL DEFAULT false,
  tarix timestamptz NOT NULL DEFAULT now(),
  elave_data jsonb
);

CREATE INDEX IF NOT EXISTS notifications_profile_id_tarix_idx
  ON public.notifications (profile_id, tarix DESC);
CREATE INDEX IF NOT EXISTS notifications_profile_id_oxunmamis_idx
  ON public.notifications (profile_id) WHERE oxunub_mu = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notification_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sistem boolean NOT NULL DEFAULT true,
  tedbir boolean NOT NULL DEFAULT true,
  xeberdarliq boolean NOT NULL DEFAULT true,
  mukafat boolean NOT NULL DEFAULT true,
  shexsi boolean NOT NULL DEFAULT true,
  sosial boolean NOT NULL DEFAULT true,
  xususi_gun boolean NOT NULL DEFAULT true,
  elan boolean NOT NULL DEFAULT true,
  e_poct_kanali boolean NOT NULL DEFAULT false,
  push_kanali boolean NOT NULL DEFAULT false
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) İCAZƏLƏR (GRANT) — "yalnız oxunub_mu sahəsi" tələbi sütun-səviyyəli GRANT ilə həyata keçirilir
-- ============================================================================

GRANT SELECT, INSERT ON public.notifications TO authenticated;
GRANT UPDATE (oxunub_mu) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

-- ============================================================================
-- 3) RLS SİYASƏTLƏRİ
-- ============================================================================

-- notifications: SELECT — yalnız öz bildirişləri
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- notifications: UPDATE — yalnız öz bildirişi (sütun məhdudiyyəti yuxarıdakı GRANT ilə təmin olunur)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- notifications: INSERT — yalnız admin/dekan (tətbiq-səviyyəli yoxlama ilə birgə).
-- Sistemdaxili trigger-lər SECURITY DEFINER olaraq işlədiyi üçün bu siyasətdən asılı deyil.
DROP POLICY IF EXISTS "notifications_insert_admin_dekan" ON public.notifications;
CREATE POLICY "notifications_insert_admin_dekan" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

-- notification_settings: hər kəs öz sətrini idarə edir
DROP POLICY IF EXISTS "notification_settings_own" ON public.notification_settings;
CREATE POLICY "notification_settings_own" ON public.notification_settings FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================================================
-- 4) handle_new_user() — yeni istifadəçi üçün defolt notification_settings sətri
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, ad, soyad, ata_adi, e_poct, istifadeci_adi)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'ad',
    NEW.raw_user_meta_data ->> 'soyad',
    NEW.raw_user_meta_data ->> 'ata_adi',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'istifadeci_adi', split_part(NEW.email,'@',1))
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'telebe')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.notification_settings (profile_id) VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Mövcud (trigger yaranmazdan əvvəlki) istifadəçilər üçün defolt sətirləri geriyə doldururuq
INSERT INTO public.notification_settings (profile_id)
SELECT p.user_id FROM public.profiles p
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- 5) BİLDİRİŞ YARADILMASI TRİGGER-LƏRİ (sistemdaxili avtomatik bildirişlər)
-- ============================================================================

-- 5.1) Yeni calendar_event yaradılanda aid qrupun üzvlərinə 'tedbir' tipli bildiriş
CREATE OR REPLACE FUNCTION public.notify_calendar_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin, elave_data)
    SELECT
      gm.user_id,
      'tedbir',
      'Yeni tədbir: ' || NEW.baslıq,
      'Tarix: ' || to_char(NEW.tarix, 'DD.MM.YYYY') || ', saat ' || to_char(NEW.baslangic_saat, 'HH24:MI'),
      jsonb_build_object('calendar_event_id', NEW.id)
    FROM public.group_members gm
    LEFT JOIN public.notification_settings ns ON ns.profile_id = gm.user_id
    WHERE gm.group_id = NEW.group_id
      AND COALESCE(ns.tedbir, true) = true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_notify_calendar_event ON public.calendar_events;
CREATE TRIGGER trigger_notify_calendar_event
AFTER INSERT ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_event();

-- 5.2) exam_scores UPDATE olub yekun_qiymet doldurulanda tələbəyə 'sistem' tipli bildiriş
CREATE OR REPLACE FUNCTION public.notify_exam_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_aktiv boolean;
BEGIN
  IF NEW.yekun_qiymet IS NOT NULL AND NEW.yekun_qiymet IS DISTINCT FROM OLD.yekun_qiymet THEN
    SELECT COALESCE(ns.sistem, true) INTO v_aktiv
    FROM public.notification_settings ns
    WHERE ns.profile_id = NEW.user_id;

    IF COALESCE(v_aktiv, true) THEN
      INSERT INTO public.notifications (profile_id, tip, baslıq, metin, elave_data)
      VALUES (
        NEW.user_id,
        'sistem',
        'Yeni qiymətiniz əlavə olundu',
        'Yekun qiymətiniz: ' || NEW.yekun_qiymet,
        jsonb_build_object('exam_score_id', NEW.id, 'course_id', NEW.course_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_notify_exam_score ON public.exam_scores;
CREATE TRIGGER trigger_notify_exam_score
AFTER UPDATE ON public.exam_scores
FOR EACH ROW EXECUTE FUNCTION public.notify_exam_score();

-- 5.3) chat_messages üçün funksiya strukturu — QƏSDƏN heç bir trigger-ə bağlanmayıb.
-- Hər mesaj üçün ayrıca bildiriş yaratmaq spam yaradar; bu, gələcək fazada
-- "offline istifadəçi + parametrlər açıqdır" məntiqi əlavə olunduqdan sonra aktivləşdiriləcək.
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- QEYD: Struktur hazırdır, lakin trigger qoşulmayıb (bax yuxarıdakı izah).
  -- Aktivləşdiriləndə: yalnız offline/parametri açıq üzvlərə 'sosial' tipli bildiriş yaradılmalıdır.
  RETURN NEW;
END; $$;

-- ============================================================================
-- 6) ADMIN BROADCAST FUNKSİYASI
-- ============================================================================

CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_tip text,
  p_baslıq text,
  p_metin text,
  p_hedef_rol public.app_role DEFAULT NULL,
  p_hedef_qrup uuid DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sayi integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')) THEN
    RAISE EXCEPTION 'Yalnız admin və ya dekan bildiriş göndərə bilər.' USING ERRCODE = '42501';
  END IF;

  IF p_tip NOT IN ('sistem', 'tedbir', 'xeberdarliq', 'mukafat', 'shexsi', 'sosial', 'xususi_gun', 'elan') THEN
    RAISE EXCEPTION 'Yanlış bildiriş tipi: %', p_tip;
  END IF;

  IF p_baslıq IS NULL OR btrim(p_baslıq) = '' THEN
    RAISE EXCEPTION 'Başlıq boş ola bilməz.';
  END IF;

  IF p_hedef_qrup IS NOT NULL THEN
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin)
    SELECT gm.user_id, p_tip, p_baslıq, p_metin
    FROM public.group_members gm
    WHERE gm.group_id = p_hedef_qrup;
  ELSIF p_hedef_rol IS NOT NULL THEN
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin)
    SELECT ur.user_id, p_tip, p_baslıq, p_metin
    FROM public.user_roles ur
    WHERE ur.role = p_hedef_rol;
  ELSE
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin)
    SELECT p.user_id, p_tip, p_baslıq, p_metin
    FROM public.profiles p;
  END IF;

  GET DIAGNOSTICS v_sayi = ROW_COUNT;
  RETURN v_sayi;
END; $$;

GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, public.app_role, uuid) TO authenticated;

-- ============================================================================
-- 7) REALTIME
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
