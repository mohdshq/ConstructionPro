-- ==============================================================================
-- B4 Hardening, Drawings Authorization, Unified Storage Policies, & Cover Backfill
-- ==============================================================================

-- 1. Helper Function: can_manage_project(p_id text)
CREATE OR REPLACE FUNCTION public.can_manage_project(p_id text)
RETURNS boolean AS $$
BEGIN
  IF p_id IS NULL OR length(p_id) = 0 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = p_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.role IN ('owner', 'manager')
  ) OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = p_id
      AND p.user_id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.can_manage_project(text) TO authenticated;

-- 2. Avatars Bucket Configuration & Restored RLS Policies
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- 3. Public Drawings Table Policies (Restrict UPDATE & DELETE to Managers/Owners)
DROP POLICY IF EXISTS "Users can manage drawings for their projects" ON public.drawings;
DROP POLICY IF EXISTS "Users can view drawings for their projects" ON public.drawings;
DROP POLICY IF EXISTS "Members can view drawings" ON public.drawings;
DROP POLICY IF EXISTS "Members can insert drawings" ON public.drawings;
DROP POLICY IF EXISTS "Managers can update drawings" ON public.drawings;
DROP POLICY IF EXISTS "Managers can delete drawings" ON public.drawings;

CREATE POLICY "Members can view drawings"
ON public.drawings FOR SELECT TO authenticated
USING (
  is_project_member(project_id) OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Members can insert drawings"
ON public.drawings FOR INSERT TO authenticated
WITH CHECK (
  is_project_member(project_id) OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Managers can update drawings"
ON public.drawings FOR UPDATE TO authenticated
USING (
  is_project_manager(project_id) OR user_id = (SELECT auth.uid())
)
WITH CHECK (
  is_project_manager(project_id) OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Managers can delete drawings"
ON public.drawings FOR DELETE TO authenticated
USING (
  is_project_manager(project_id) OR user_id = (SELECT auth.uid())
);

-- 4. Clean Up Prior Conflicting Storage Policies on drawings & report-photos
DROP POLICY IF EXISTS "Project members can delete project media" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read project media" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update project media" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload project media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project drawings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project drawings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project report photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project report photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own drawings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own drawings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own report photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report photos" ON storage.objects;
DROP POLICY IF EXISTS "Unified read media" ON storage.objects;
DROP POLICY IF EXISTS "Unified upload media" ON storage.objects;
DROP POLICY IF EXISTS "Unified update report photos" ON storage.objects;
DROP POLICY IF EXISTS "Unified update drawings" ON storage.objects;
DROP POLICY IF EXISTS "Unified delete report photos" ON storage.objects;
DROP POLICY IF EXISTS "Unified delete drawings" ON storage.objects;

-- 5. Unified Depth-Guarded Storage Policies on drawings & report-photos

-- (a) SELECT (Members and uploaders can read)
CREATE POLICY "Unified read media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('drawings', 'report-photos')
  AND (
    -- Depth 1: [seg1] -> projectId/filename OR userId/filename
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_access_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    -- Depth 2: [seg1, seg2] -> legacy userId/projectId/filename
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_access_project((storage.foldername(name))[2])
      )
    )
  )
);

-- (b) INSERT (Members and uploaders can upload)
CREATE POLICY "Unified upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('drawings', 'report-photos')
  AND (
    -- Depth 1: [seg1] -> projectId/filename OR userId/filename
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_access_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    -- Depth 2: [seg1, seg2] -> legacy userId/projectId/filename
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_access_project((storage.foldername(name))[2])
      )
    )
  )
);

-- (c) UPDATE: report photos (members or owner)
CREATE POLICY "Unified update report photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
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

-- (d) UPDATE: drawings (restricted to managers, owners, or uploader)
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
);

-- (e) DELETE: report photos (members or owner)
CREATE POLICY "Unified delete report photos"
ON storage.objects FOR DELETE TO authenticated
USING (
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

-- (f) DELETE: drawings (restricted to managers, owners, or uploader)
CREATE POLICY "Unified delete drawings"
ON storage.objects FOR DELETE TO authenticated
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
);

-- 6. Backfill Legacy Cover Photos to ${projectId}/${filename} in report-photos
DO $$
DECLARE
  p RECORD;
  old_obj RECORD;
  new_name text;
  bare_filename text;
BEGIN
  FOR p IN (
    SELECT id, photo_url 
    FROM public.projects 
    WHERE photo_url LIKE '%/%'
  ) LOOP
    bare_filename := split_part(p.photo_url, '/', 2);
    new_name := p.id::text || '/' || bare_filename;

    -- Look up original object in storage.objects
    SELECT * INTO old_obj 
    FROM storage.objects 
    WHERE bucket_id = 'report-photos' AND name = p.photo_url;
    
    IF FOUND THEN
      -- Copy object to new location
      INSERT INTO storage.objects (
        bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version
      )
      VALUES (
        old_obj.bucket_id,
        new_name,
        old_obj.owner,
        now(),
        now(),
        now(),
        old_obj.metadata,
        old_obj.version
      )
      ON CONFLICT (bucket_id, name) DO NOTHING;

      -- Verify new object exists before rewriting projects row
      IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'report-photos' AND name = new_name) THEN
        UPDATE public.projects 
        SET photo_url = bare_filename 
        WHERE id = p.id;
        RAISE NOTICE 'BACKFILLED COVER: Project % -> % (row photo_url: %)', p.id, new_name, bare_filename;
      END IF;
    END IF;
  END LOOP;
END $$;
