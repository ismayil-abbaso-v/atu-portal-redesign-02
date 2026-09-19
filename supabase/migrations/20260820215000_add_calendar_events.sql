-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslıq text NOT NULL,
  tesvir text,
  tarix date NOT NULL,
  baslangic_saat time NOT NULL,
  bitme_saat time NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  yaradan_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Telebe/tyutor can see their group's events or general ones, muellim can see their fənn events, admin/dekan see all.
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    yaradan_id = auth.uid() OR
    group_id IS NULL OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid()) OR
    (public.has_role(auth.uid(), 'muellim') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid()))
  );

-- INSERT policy: only tyutor (for their group), muellim (for their fənn), dekan, admin. Telebe cannot insert.
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND 
      group_id IS NOT NULL AND 
      EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid())
    ) OR
    (
      public.has_role(auth.uid(), 'muellim') AND
      course_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid())
    )
  );

-- UPDATE policy: only tyutor (for their group), muellim (for their fənn), dekan, admin. Telebe cannot update.
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    yaradan_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    (
      public.has_role(auth.uid(), 'tyutor') AND 
      group_id IS NOT NULL AND 
      EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid())
    ) OR
    (
      public.has_role(auth.uid(), 'muellim') AND
      course_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid())
    )
  );

-- DELETE policy: owner, dekan, admin
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    yaradan_id = auth.uid()
  );

-- updated_at trigger for calendar_events
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
