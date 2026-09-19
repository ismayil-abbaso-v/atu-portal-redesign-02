CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 180),
  summary text,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 12000),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','academic','opportunity','event','important')),
  image_url text,
  cta_url text,
  cta_label text,
  is_featured boolean NOT NULL DEFAULT false,
  priority smallint NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 100),
  audience_type text NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all','faculty','group')),
  audience_value text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_audience_value_check CHECK (
    audience_type = 'all' OR nullif(trim(audience_value), '') IS NOT NULL
  ),
  CONSTRAINT announcements_date_range_check CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS announcements_visibility_idx ON public.announcements (status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS announcements_order_idx ON public.announcements (is_featured DESC, priority DESC, starts_at DESC);
CREATE INDEX IF NOT EXISTS announcements_audience_idx ON public.announcements (audience_type, audience_value);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_read_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  open_count integer NOT NULL DEFAULT 1 CHECK (open_count > 0),
  PRIMARY KEY (announcement_id, user_id)
);
CREATE INDEX IF NOT EXISTS announcement_reads_user_idx ON public.announcement_reads (user_id, last_read_at DESC);

CREATE OR REPLACE FUNCTION public.set_announcement_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_announcement_updated_at();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_select_visible ON public.announcements;
CREATE POLICY announcements_select_visible ON public.announcements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan') OR (
    status = 'published' AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()) AND (
      audience_type = 'all'
      OR (audience_type = 'faculty' AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
          AND lower(trim(coalesce(p.fakulte, ''))) = lower(trim(coalesce(announcements.audience_value, '')))
      ))
      OR (audience_type = 'group' AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
          AND lower(trim(coalesce(p.qrup, ''))) = lower(trim(coalesce(announcements.audience_value, '')))
      ))
    )
  )
);

DROP POLICY IF EXISTS announcements_insert_managers ON public.announcements;
CREATE POLICY announcements_insert_managers ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));
DROP POLICY IF EXISTS announcements_update_managers ON public.announcements;
CREATE POLICY announcements_update_managers ON public.announcements FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));
DROP POLICY IF EXISTS announcements_delete_managers ON public.announcements;
CREATE POLICY announcements_delete_managers ON public.announcements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

DROP POLICY IF EXISTS announcement_reads_select ON public.announcement_reads;
CREATE POLICY announcement_reads_select ON public.announcement_reads FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));
DROP POLICY IF EXISTS announcement_reads_insert_self ON public.announcement_reads;
CREATE POLICY announcement_reads_insert_self ON public.announcement_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS announcement_reads_update_self ON public.announcement_reads;
CREATE POLICY announcement_reads_update_self ON public.announcement_reads FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_announcement_read(p_announcement_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = p_announcement_id AND a.status = 'published' AND a.starts_at <= now()
      AND (a.ends_at IS NULL OR a.ends_at >= now())
      AND (
        a.audience_type = 'all'
        OR (a.audience_type = 'faculty' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.user_id = v_user_id
            AND lower(trim(coalesce(p.fakulte, ''))) = lower(trim(coalesce(a.audience_value, '')))
        ))
        OR (a.audience_type = 'group' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.user_id = v_user_id
            AND lower(trim(coalesce(p.qrup, ''))) = lower(trim(coalesce(a.audience_value, '')))
        ))
      )
  ) THEN RAISE EXCEPTION 'Announcement is not visible for this user'; END IF;

  INSERT INTO public.announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, v_user_id)
  ON CONFLICT (announcement_id, user_id) DO UPDATE
  SET last_read_at = now(), open_count = public.announcement_reads.open_count + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_announcement_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_announcement_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_announcement_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs(user_id, emeliyyat, etrafli)
    VALUES (v_actor, 'elan_yaradildi', jsonb_build_object('announcement_id', NEW.id, 'title', NEW.title, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs(user_id, emeliyyat, etrafli)
    VALUES (v_actor, 'elan_yenilendi', jsonb_build_object('announcement_id', NEW.id, 'title', NEW.title, 'status', NEW.status, 'previous_status', OLD.status));
    RETURN NEW;
  ELSE
    INSERT INTO public.activity_logs(user_id, emeliyyat, etrafli)
    VALUES (v_actor, 'elan_silindi', jsonb_build_object('announcement_id', OLD.id, 'title', OLD.title, 'status', OLD.status));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_announcements ON public.announcements;
CREATE TRIGGER trg_activity_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.audit_announcement_change();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('announcement-media', 'announcement-media', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS announcement_media_insert_managers ON storage.objects;
CREATE POLICY announcement_media_insert_managers ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcement-media' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));
DROP POLICY IF EXISTS announcement_media_update_managers ON storage.objects;
CREATE POLICY announcement_media_update_managers ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'announcement-media' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')))
WITH CHECK (bucket_id = 'announcement-media' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));
DROP POLICY IF EXISTS announcement_media_delete_managers ON storage.objects;
CREATE POLICY announcement_media_delete_managers ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'announcement-media' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcement_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
  END IF;
END $$;
