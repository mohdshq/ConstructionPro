-- ============================================================================
-- Make public.reports RLS role-aware.
--
-- Defect: "Users can manage reports for their projects" was FOR ALL gated on
-- is_project_member(project_id), which ignores role. Every viewer therefore had
-- INSERT/UPDATE/DELETE on all reports in their projects.
--
-- Fix: split into per-command policies. Reads stay open to all members; writes
-- require can_manage_project(), which admits project_members rows with role
-- 'owner'/'manager' AND projects.user_id owners (so owners without a member
-- row are not locked out).
--
-- Note: reports.project_id is uuid; the helpers take text, hence ::text.
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage reports for their projects" ON public.reports;
DROP POLICY IF EXISTS "Users can view reports for their projects" ON public.reports;
DROP POLICY IF EXISTS "Users can CRUD own reports" ON public.reports;

CREATE POLICY "Members can view project reports"
ON public.reports FOR SELECT TO authenticated
USING (
  public.can_access_project(project_id::text)
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Managers can insert project reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(project_id::text)
);

CREATE POLICY "Managers can update project reports"
ON public.reports FOR UPDATE TO authenticated
USING (
  public.can_manage_project(project_id::text)
)
WITH CHECK (
  public.can_manage_project(project_id::text)
);

CREATE POLICY "Managers can delete project reports"
ON public.reports FOR DELETE TO authenticated
USING (
  public.can_manage_project(project_id::text)
);
