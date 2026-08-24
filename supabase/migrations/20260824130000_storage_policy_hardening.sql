-- ==============================================================================
-- Storage Policy Hardening & Bucket Splitting
-- (1) Add WITH CHECK to storage UPDATE policies (drawings, report-photos, avatars)
-- (2) Split "Unified upload media" by bucket (drawings -> can_manage_project, report-photos -> can_access_project)
-- (3) Commented draft for private pdfs bucket policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Hardened UPDATE Policies with WITH CHECK (prevent cross-project renames)
-- ------------------------------------------------------------------------------

-- (a) Avatars UPDATE: user can only update and keep object within own folder
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- (b) Drawings UPDATE: managers/owners only, with WITH CHECK
DROP POLICY IF EXISTS "Unified update drawings" ON storage.objects;
CREATE POLICY "Unified update drawings"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'drawings'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'drawings'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
);

-- (c) Report Photos UPDATE: managers/owners/uploader with WITH CHECK
DROP POLICY IF EXISTS "Unified update report photos" ON storage.objects;
CREATE POLICY "Unified update report photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'report-photos'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
);

-- ------------------------------------------------------------------------------
-- 2. Split "Unified upload media" into Drawings (Managers) and Photos (Members)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Unified upload media" ON storage.objects;
DROP POLICY IF EXISTS "Unified upload drawings" ON storage.objects;
DROP POLICY IF EXISTS "Unified upload report photos" ON storage.objects;

-- (a) Drawings INSERT: Only Managers / Owners / Uploader
CREATE POLICY "Unified upload drawings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'drawings'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
);

-- (b) Report Photos INSERT: All Project Members & Uploader
CREATE POLICY "Unified upload report photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_access_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_access_project((storage.foldername(name))[2])
      )
    )
  )
);

-- ------------------------------------------------------------------------------
-- 3. [DRAFT/COMMENTED] PDF Bucket Hardening (Make Private & Scope Policies)
-- ------------------------------------------------------------------------------
-- UPDATE storage.buckets SET public = false WHERE id = 'pdfs';
--
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Project members can read pdfs" ON storage.objects;
-- CREATE POLICY "Project members can read pdfs"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (
--   bucket_id = 'pdfs'
--   AND (
--     (
--       array_length(storage.foldername(name), 1) = 1
--       AND (
--         public.can_access_project((storage.foldername(name))[1])
--         OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
--       )
--     )
--     OR
--     (
--       array_length(storage.foldername(name), 1) = 2
--       AND (
--         (storage.foldername(name))[1] = (SELECT auth.uid())::text
--         OR public.can_access_project((storage.foldername(name))[2])
--       )
--     )
--   )
-- );
--
-- DROP POLICY IF EXISTS "Project members can upload pdfs" ON storage.objects;
-- CREATE POLICY "Project members can upload pdfs"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'pdfs'
--   AND (
--     (
--       array_length(storage.foldername(name), 1) = 1
--       AND (
--         public.can_access_project((storage.foldername(name))[1])
--         OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
--       )
--     )
--     OR
--     (
--       array_length(storage.foldername(name), 1) = 2
--       AND (
--         (storage.foldername(name))[1] = (SELECT auth.uid())::text
--         OR public.can_access_project((storage.foldername(name))[2])
--       )
--     )
--   )
-- );
