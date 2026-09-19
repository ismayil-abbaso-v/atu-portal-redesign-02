
CREATE TYPE public.app_role AS ENUM ('admin','dekan','tyutor','telebe');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  ad text,
  soyad text,
  ata_adi text,
  dogum_tarixi date,
  cins text,
  fin_kodu text,
  e_poct text,
  telefon text,
  sheher text,
  unvan text,
  istifadeci_adi text UNIQUE,
  bolme text,
  fakulte text,
  qrup text,
  sinif text,
  tedris_ili text,
  tehsil_novu text,
  dim_bali numeric,
  avatar_url text,
  status text NOT NULL DEFAULT 'AKTİV',
  sosial_veziyyet text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  tyutor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  tyutor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.exam_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  semestr_qiymeti numeric DEFAULT 0,
  imtahan_bali numeric,
  yekun_qiymet numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_scores TO authenticated;
GRANT ALL ON public.exam_scores TO service_role;
ALTER TABLE public.exam_scores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  tarix date NOT NULL DEFAULT current_date,
  statusu text NOT NULL DEFAULT 'var',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  tarix date NOT NULL DEFAULT current_date,
  movzu text,
  fayl_url text,
  kesilmezlik text,
  qeyd text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan') OR public.has_role(auth.uid(),'tyutor'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan'));

CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_write_admin" ON public.groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR tyutor_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR tyutor_id = auth.uid());

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan')
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid()));
CREATE POLICY "group_members_write" ON public.group_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid()));

CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_write" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR tyutor_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR tyutor_id = auth.uid());

CREATE POLICY "exam_scores_select" ON public.exam_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));
CREATE POLICY "exam_scores_write" ON public.exam_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));
CREATE POLICY "attendance_write" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));

CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dekan')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));
CREATE POLICY "notes_write" ON public.notes FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tyutor_id = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- new user -> profile + telebe role
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
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
