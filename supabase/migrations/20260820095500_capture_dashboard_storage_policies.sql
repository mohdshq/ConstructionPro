-- ==============================================================================
-- Capture Dashboard Storage Policies for Legacy Media Readability
-- Idempotent against production and fresh staging databases
-- ==============================================================================

-- 1. Users can view project drawings
DROP POLICY IF EXISTS "Users can view project drawings" ON storage.objects;
CREATE POLICY "Users can view project drawings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'drawings'
  AND (
    ((SELECT auth.uid())::text = (storage.foldername(name))[1])
    OR is_project_member(((storage.foldername(name))[2])::uuid)
  )
);

-- 2. Users can upload project drawings
DROP POLICY IF EXISTS "Users can upload project drawings" ON storage.objects;
CREATE POLICY "Users can upload project drawings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'drawings'
  AND (
    ((SELECT auth.uid())::text = (storage.foldername(name))[1])
    OR is_project_member(((storage.foldername(name))[2])::uuid)
  )
);

-- 3. Users can view project report photos
DROP POLICY IF EXISTS "Users can view project report photos" ON storage.objects;
CREATE POLICY "Users can view project report photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    ((SELECT auth.uid())::text = (storage.foldername(name))[1])
    OR is_project_member(((storage.foldername(name))[2])::uuid)
  )
);

-- 4. Users can upload project report photos
DROP POLICY IF EXISTS "Users can upload project report photos" ON storage.objects;
CREATE POLICY "Users can upload project report photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND (
    ((SELECT auth.uid())::text = (storage.foldername(name))[1])
    OR is_project_member(((storage.foldername(name))[2])::uuid)
  )
);

-- Verification Notice for Functions prosecdef
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT proname, prosecdef 
    FROM pg_proc 
    WHERE proname IN ('is_project_member', 'is_project_manager', 'can_access_project')
    ORDER BY proname
  ) LOOP
    RAISE NOTICE 'FUNCTION_AUDIT: % | PROSECDEF: %', rec.proname, rec.prosecdef;
  END LOOP;
END $$;
