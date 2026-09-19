-- Add UNIQUE constraint to public.attendance table
ALTER TABLE public.attendance ADD CONSTRAINT attendance_unique UNIQUE (user_id, course_id, tarix);

-- Add xeyr column to public.notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS xeyr integer;

-- Trigger function to populate xeyr sequentially per user_id
CREATE OR REPLACE FUNCTION public.populate_notes_xeyr()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.xeyr := COALESCE((SELECT MAX(xeyr) FROM public.notes WHERE user_id = NEW.user_id), 0) + 1;
  RETURN NEW;
END;
$$;

-- Create trigger BEFORE INSERT on notes
CREATE OR REPLACE TRIGGER trigger_populate_notes_xeyr
BEFORE INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.populate_notes_xeyr();

-- Populate existing notes with sequential numbers (just in case)
DO $$
DECLARE
  r RECORD;
  n integer;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.notes LOOP
    n := 1;
    UPDATE public.notes 
    SET xeyr = sub.num
    FROM (
      SELECT id, row_number() OVER (ORDER BY tarix ASC, created_at ASC) as num
      FROM public.notes
      WHERE user_id = r.user_id
    ) sub
    WHERE public.notes.id = sub.id;
  END LOOP;
END;
$$;

-- Create Storage bucket 'note-files'
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-files', 'note-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'note-files'
DROP POLICY IF EXISTS "note_files_select" ON storage.objects;
CREATE POLICY "note_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'note-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.notes n
        LEFT JOIN public.courses c ON c.id = n.course_id
        WHERE n.fayl_url = name AND (
          n.user_id = auth.uid() OR
          c.tyutor_id = auth.uid() OR
          c.muellim_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "note_files_insert" ON storage.objects;
CREATE POLICY "note_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'note-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      public.has_role(auth.uid(), 'tyutor') OR
      public.has_role(auth.uid(), 'muellim')
    )
  );

DROP POLICY IF EXISTS "note_files_delete" ON storage.objects;
CREATE POLICY "note_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'note-files' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      owner = auth.uid()
    )
  );
