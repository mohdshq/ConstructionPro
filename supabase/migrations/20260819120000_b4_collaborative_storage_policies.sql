-- ==============================================================================
-- B4: Collaborative Storage Policies & Project Access Helper
-- Buckets: drawings, report-photos
-- Path Structure: <projectId>/<filename>
-- ==============================================================================

-- 1. Helper Function: SECURITY DEFINER check for project access
CREATE OR REPLACE FUNCTION public.can_access_project(p_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = p_id
      AND pm.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = p_id
      AND p.user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_project(text) TO authenticated;


-- 2. SELECT: Project members and owners can read project media
DROP POLICY IF EXISTS "Project members can read project media" ON storage.objects;
CREATE POLICY "Project members can read project media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 3. INSERT: Project members and owners can upload project media
DROP POLICY IF EXISTS "Project members can upload project media" ON storage.objects;
CREATE POLICY "Project members can upload project media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 4. UPDATE: Project members and owners can update/upsert project media
DROP POLICY IF EXISTS "Project members can update project media" ON storage.objects;
CREATE POLICY "Project members can update project media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);

-- 5. DELETE: Project members and owners can delete project media
DROP POLICY IF EXISTS "Project members can delete project media" ON storage.objects;
CREATE POLICY "Project members can delete project media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND public.can_access_project((storage.foldername(name))[1])
);
