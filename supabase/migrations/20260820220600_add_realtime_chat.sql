-- Create chat_groups table
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  dogrulanmis boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_groups_course_id_key UNIQUE (course_id)
);

-- Create chat_group_members table
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_group_id uuid REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  qosulma_tarixi timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_group_members_unique UNIQUE (chat_group_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_group_id uuid REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  gonderen_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  metin text,
  fayl_url text,
  fayl_novu text CHECK (fayl_novu IN ('sekil', 'video', 'ses', 'fayl') OR fayl_novu IS NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and grant permissions
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

GRANT ALL ON public.chat_groups TO service_role;
GRANT ALL ON public.chat_group_members TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- RLS policies for chat_groups
CREATE POLICY "chat_groups_select" ON public.chat_groups FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.chat_group_members cgm WHERE cgm.chat_group_id = id AND cgm.user_id = auth.uid())
  );

CREATE POLICY "chat_groups_insert" ON public.chat_groups FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

CREATE POLICY "chat_groups_update" ON public.chat_groups FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

CREATE POLICY "chat_groups_delete" ON public.chat_groups FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

-- RLS policies for chat_group_members
CREATE POLICY "chat_group_members_select" ON public.chat_group_members FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    chat_group_id IN (SELECT cgm.chat_group_id FROM public.chat_group_members cgm WHERE cgm.user_id = auth.uid())
  );

CREATE POLICY "chat_group_members_insert" ON public.chat_group_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

CREATE POLICY "chat_group_members_delete" ON public.chat_group_members FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

-- RLS policies for chat_messages
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.chat_group_members cgm WHERE cgm.chat_group_id = chat_group_id AND cgm.user_id = auth.uid())
  );

CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    gonderen_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.chat_group_members cgm WHERE cgm.chat_group_id = chat_group_id AND cgm.user_id = auth.uid())
  );

-- Helper function to extract chat_group_id from storage file path and verify membership
CREATE OR REPLACE FUNCTION public.is_chat_member_for_file(path text, user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group_id uuid;
BEGIN
  BEGIN
    v_group_id := (split_part(path, '/', 1))::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE chat_group_id = v_group_id AND user_id = $2
  );
END;
$$;

-- Create Storage bucket 'chat-files'
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'chat-files'
DROP POLICY IF EXISTS "chat_files_select" ON storage.objects;
CREATE POLICY "chat_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      owner = auth.uid() OR
      public.is_chat_member_for_file(name, auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_files_insert" ON storage.objects;
CREATE POLICY "chat_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      public.is_chat_member_for_file(name, auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_files_delete" ON storage.objects;
CREATE POLICY "chat_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      owner = auth.uid()
    )
  );

-- Create secure view to get last message of each chat group
CREATE OR REPLACE VIEW public.chat_group_last_message AS
SELECT DISTINCT ON (m.chat_group_id)
  m.chat_group_id,
  m.id AS message_id,
  m.metin,
  m.fayl_url,
  m.fayl_novu,
  m.gonderen_id,
  m.created_at
FROM public.chat_messages m
WHERE 
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'dekan') OR
  EXISTS (
    SELECT 1 FROM public.chat_group_members cgm 
    WHERE cgm.chat_group_id = m.chat_group_id AND cgm.user_id = auth.uid()
  )
ORDER BY m.chat_group_id, m.created_at DESC;

GRANT SELECT ON public.chat_group_last_message TO authenticated;

-- Trigger functions for auto creation/sync of chat groups and memberships
CREATE OR REPLACE FUNCTION public.create_chat_group_for_course()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_chat_group_id uuid;
BEGIN
  INSERT INTO public.chat_groups (ad, course_id, dogrulanmis)
  VALUES (NEW.ad, NEW.id, true)
  RETURNING id INTO new_chat_group_id;

  -- Add the course teacher to the chat group if present
  IF NEW.muellim_id IS NOT NULL THEN
    INSERT INTO public.chat_group_members (chat_group_id, user_id)
    VALUES (new_chat_group_id, NEW.muellim_id)
    ON CONFLICT (chat_group_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_course_chat_group
AFTER INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.create_chat_group_for_course();

CREATE OR REPLACE FUNCTION public.sync_course_group_members_to_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chat_group_id uuid;
  v_student RECORD;
BEGIN
  SELECT id INTO v_chat_group_id FROM public.chat_groups WHERE course_id = NEW.course_id;

  IF v_chat_group_id IS NOT NULL THEN
    FOR v_student IN SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id LOOP
      INSERT INTO public.chat_group_members (chat_group_id, user_id)
      VALUES (v_chat_group_id, v_student.user_id)
      ON CONFLICT (chat_group_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_course_group_sync
AFTER INSERT ON public.course_groups
FOR EACH ROW
EXECUTE FUNCTION public.sync_course_group_members_to_chat();

CREATE OR REPLACE FUNCTION public.sync_new_group_member_to_chats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cg RECORD;
  v_chat_group_id uuid;
BEGIN
  FOR v_cg IN SELECT course_id FROM public.course_groups WHERE group_id = NEW.group_id LOOP
    SELECT id INTO v_chat_group_id FROM public.chat_groups WHERE course_id = v_cg.course_id;
    IF v_chat_group_id IS NOT NULL THEN
      INSERT INTO public.chat_group_members (chat_group_id, user_id)
      VALUES (v_chat_group_id, NEW.user_id)
      ON CONFLICT (chat_group_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_group_member_sync
AFTER INSERT ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_new_group_member_to_chats();

-- Backfill script to populate existing courses, teachers, and group members into chat tables
DO $$
DECLARE
  v_course RECORD;
  v_chat_group_id uuid;
  v_student RECORD;
BEGIN
  FOR v_course IN SELECT * FROM public.courses LOOP
    -- Create chat group if not exists
    INSERT INTO public.chat_groups (ad, course_id, dogrulanmis)
    VALUES (v_course.ad, v_course.id, true)
    ON CONFLICT (course_id) DO NOTHING;

    SELECT id INTO v_chat_group_id FROM public.chat_groups WHERE course_id = v_course.id;

    IF v_chat_group_id IS NOT NULL THEN
      -- Add teacher
      IF v_course.muellim_id IS NOT NULL THEN
        INSERT INTO public.chat_group_members (chat_group_id, user_id)
        VALUES (v_chat_group_id, v_course.muellim_id)
        ON CONFLICT (chat_group_id, user_id) DO NOTHING;
      END IF;

      -- Add all students who take this course via course_groups -> group_members
      FOR v_student IN 
        SELECT DISTINCT gm.user_id 
        FROM public.course_groups cg
        JOIN public.group_members gm ON gm.group_id = cg.group_id
        WHERE cg.course_id = v_course.id
      LOOP
        INSERT INTO public.chat_group_members (chat_group_id, user_id)
        VALUES (v_chat_group_id, v_student.user_id)
        ON CONFLICT (chat_group_id, user_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- Enable Realtime for chat_messages table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
