-- Bildirişlər üçün klik naviqasiyası:
-- 1) Admin/dekan tərəfindən konkret qrupa göndərilən bildirişə group_id metadata əlavə edilir.
-- 2) Qrup söhbətində yeni mesaj yarandıqda üzvlərə sosial bildiriş yaradılır.

-- ============================================================================
-- 1) ADMIN/DEKAN BROADCAST — naviqasiya metadata-sı
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
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin, elave_data)
    SELECT
      gm.user_id,
      p_tip,
      p_baslıq,
      p_metin,
      jsonb_build_object('group_id', p_hedef_qrup, 'source', 'admin_broadcast')
    FROM public.group_members gm
    WHERE gm.group_id = p_hedef_qrup;
  ELSIF p_hedef_rol IS NOT NULL THEN
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin, elave_data)
    SELECT
      ur.user_id,
      p_tip,
      p_baslıq,
      p_metin,
      jsonb_build_object('source', 'admin_broadcast', 'target_role', p_hedef_rol::text)
    FROM public.user_roles ur
    WHERE ur.role = p_hedef_rol;
  ELSE
    INSERT INTO public.notifications (profile_id, tip, baslıq, metin, elave_data)
    SELECT
      p.user_id,
      p_tip,
      p_baslıq,
      p_metin,
      jsonb_build_object('source', 'admin_broadcast')
    FROM public.profiles p;
  END IF;

  GET DIAGNOSTICS v_sayi = ROW_COUNT;
  RETURN v_sayi;
END; $$;

GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, public.app_role, uuid) TO authenticated;

-- ============================================================================
-- 2) QRUP SÖHBƏTİ — yeni mesaj üçün bildiriş
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
  v_message_preview text;
BEGIN
  IF NEW.chat_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(concat_ws(' ', p.ad, p.soyad)), '')
  INTO v_sender_name
  FROM public.profiles p
  WHERE p.user_id = NEW.gonderen_id;

  v_message_preview := NULLIF(btrim(NEW.metin), '');

  INSERT INTO public.notifications (
    profile_id,
    tip,
    baslıq,
    metin,
    elave_data
  )
  SELECT
    gm.user_id,
    'sosial',
    COALESCE(v_sender_name, 'Yeni mesaj'),
    COALESCE(v_message_preview, 'Sizə qrup söhbətində yeni mesaj göndərildi.'),
    jsonb_build_object(
      'chat_group_id', NEW.chat_group_id,
      'chat_message_id', NEW.id,
      'source', 'chat_message'
    )
  FROM public.chat_group_members gm
  LEFT JOIN public.notification_settings ns ON ns.profile_id = gm.user_id
  WHERE gm.chat_group_id = NEW.chat_group_id
    AND gm.user_id IS DISTINCT FROM NEW.gonderen_id
    AND COALESCE(ns.sosial, true) = true;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();
