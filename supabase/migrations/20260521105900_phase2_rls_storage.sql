-- =====================================================
-- Phase 2: RLS Fixes, Profile Trigger, Storage Buckets
-- Applied via Supabase MCP on 2026-05-21
-- =====================================================

-- 1. Fix RLS policies: Add WITH CHECK and TO authenticated
-- -------------------------------------------------------

-- Projects
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;
CREATE POLICY "Users can CRUD own projects" ON public.projects
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Reports
DROP POLICY IF EXISTS "Users can CRUD own reports" ON public.reports;
CREATE POLICY "Users can CRUD own reports" ON public.reports
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Drawing Folders
DROP POLICY IF EXISTS "Users can CRUD own folders" ON public.drawing_folders;
CREATE POLICY "Users can CRUD own folders" ON public.drawing_folders
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Drawings
DROP POLICY IF EXISTS "Users can CRUD own drawings" ON public.drawings;
CREATE POLICY "Users can CRUD own drawings" ON public.drawings
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- 2. Auto-create profile on signup
-- --------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Storage Buckets
-- ------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('report-photos', 'report-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('drawings', 'drawings', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- 4. Storage RLS Policies
-- -----------------------

-- report-photos
CREATE POLICY "Users can upload own report photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own report photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-photos' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own report photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own report photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-photos' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- drawings
CREATE POLICY "Users can upload own drawings" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'drawings' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own drawings" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'drawings' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own drawings" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'drawings' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own drawings" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'drawings' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- avatars (public read)
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);
