-- ==============================================================================
-- Ensure public.projects UPDATE and DELETE are strictly restricted to managers/owners
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view projects they are a member of" ON public.projects;
CREATE POLICY "Users can view projects they are a member of"
ON public.projects FOR SELECT
TO authenticated
USING ( public.can_access_project(id::text) OR user_id = (SELECT auth.uid()) );

DROP POLICY IF EXISTS "Owners and managers can update projects" ON public.projects;
CREATE POLICY "Owners and managers can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING ( public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()) )
WITH CHECK ( public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()) );

DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete projects" ON public.projects;
CREATE POLICY "Managers can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING ( public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()) );

-- Test Impersonation: Viewer vs Owner
DO $$
DECLARE
  v_uid text := 'f458e27e-13c0-4298-83db-60b16470f30e'; -- viewer on project 0516d9f7-342e-4305-8df8-525a6212998a
  owner_uid text := 'cdbff53b-6290-45ff-8966-dcbdc0b29273'; -- owner
  test_proj uuid := '0516d9f7-342e-4305-8df8-525a6212998a';
  can_select boolean;
  can_update boolean;
  can_delete boolean;
BEGIN
  RAISE NOTICE '=== IMPERSONATION TEST: VIEWER (f458e27e) ON PROJECTS ===';
  PERFORM set_config('request.jwt.claim.sub', v_uid, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1. SELECT
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj) INTO can_select;
  RAISE NOTICE 'VIEWER SELECT PROJECT: % (Expected: true)', can_select;

  -- 2. UPDATE (via SELECT for UPDATE / qualify check)
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj AND (public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()))) INTO can_update;
  RAISE NOTICE 'VIEWER CAN UPDATE PROJECT: % (Expected: false)', can_update;

  -- 3. DELETE (qualify check)
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj AND (public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()))) INTO can_delete;
  RAISE NOTICE 'VIEWER CAN DELETE PROJECT: % (Expected: false)', can_delete;

  RAISE NOTICE '=== IMPERSONATION TEST: OWNER (cdbff53b) ON PROJECTS ===';
  PERFORM set_config('request.jwt.claim.sub', owner_uid, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj) INTO can_select;
  RAISE NOTICE 'OWNER SELECT PROJECT: % (Expected: true)', can_select;

  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj AND (public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()))) INTO can_update;
  RAISE NOTICE 'OWNER CAN UPDATE PROJECT: % (Expected: true)', can_update;

  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = test_proj AND (public.can_manage_project(id::text) OR user_id = (SELECT auth.uid()))) INTO can_delete;
  RAISE NOTICE 'OWNER CAN DELETE PROJECT: % (Expected: true)', can_delete;
END $$;
