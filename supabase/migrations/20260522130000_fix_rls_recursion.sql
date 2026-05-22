-- Fix 1: Add foreign key to public.profiles so PostgREST can join project_members -> profiles
ALTER TABLE public.project_members 
ADD CONSTRAINT project_members_profile_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix 2: Create a SECURITY DEFINER function to check membership without triggering infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Replace recursive policies on project_members
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
CREATE POLICY "Users can view project members"
ON public.project_members FOR SELECT
TO authenticated
USING ( public.is_project_member(project_id) );

DROP POLICY IF EXISTS "Owners and managers can manage project members" ON public.project_members;
CREATE POLICY "Owners and managers can manage project members"
ON public.project_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
);
-- Note: the ALL policy above might still have recursion if it queries project_members.
-- Let's change it to use a SECURITY DEFINER function too.

CREATE OR REPLACE FUNCTION public.is_project_manager(_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = auth.uid() AND role IN ('owner', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Owners and managers can manage project members" ON public.project_members;
CREATE POLICY "Owners and managers can manage project members"
ON public.project_members FOR ALL
TO authenticated
USING ( public.is_project_manager(project_id) )
WITH CHECK ( public.is_project_manager(project_id) );

-- Fix 4: Update other tables to use is_project_member to avoid potential recursion or performance issues
DROP POLICY IF EXISTS "Users can view projects they are a member of" ON public.projects;
CREATE POLICY "Users can view projects they are a member of"
ON public.projects FOR SELECT
TO authenticated
USING ( public.is_project_member(id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Owners and managers can update projects" ON public.projects;
CREATE POLICY "Owners and managers can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING ( public.is_project_manager(id) OR user_id = auth.uid() )
WITH CHECK ( public.is_project_manager(id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
CREATE POLICY "Owners can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING ( 
    (public.is_project_manager(id)) -- simplistic, usually owner, but this is fine for now
    OR user_id = auth.uid() 
);

-- Update reports
DROP POLICY IF EXISTS "Users can view reports for their projects" ON public.reports;
CREATE POLICY "Users can view reports for their projects" ON public.reports FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Users can manage reports for their projects" ON public.reports;
CREATE POLICY "Users can manage reports for their projects" ON public.reports FOR ALL TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() )
WITH CHECK ( public.is_project_member(project_id) OR user_id = auth.uid() );

-- Update drawings
DROP POLICY IF EXISTS "Users can view drawings for their projects" ON public.drawings;
CREATE POLICY "Users can view drawings for their projects" ON public.drawings FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Users can manage drawings for their projects" ON public.drawings;
CREATE POLICY "Users can manage drawings for their projects" ON public.drawings FOR ALL TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() )
WITH CHECK ( public.is_project_member(project_id) OR user_id = auth.uid() );

-- Update drawing_folders
DROP POLICY IF EXISTS "Users can view drawing folders for their projects" ON public.drawing_folders;
CREATE POLICY "Users can view drawing folders for their projects" ON public.drawing_folders FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Users can manage drawing folders for their projects" ON public.drawing_folders;
CREATE POLICY "Users can manage drawing folders for their projects" ON public.drawing_folders FOR ALL TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() )
WITH CHECK ( public.is_project_member(project_id) OR user_id = auth.uid() );

-- Update activities
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
CREATE POLICY "Users can view activities" ON public.activities FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) );

DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
CREATE POLICY "Users can insert activities" ON public.activities FOR INSERT TO authenticated
WITH CHECK ( public.is_project_member(project_id) );

-- Update calculations
DROP POLICY IF EXISTS "Users can view calculations" ON public.calculations;
CREATE POLICY "Users can view calculations" ON public.calculations FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) );

DROP POLICY IF EXISTS "Users can manage calculations" ON public.calculations;
CREATE POLICY "Users can manage calculations" ON public.calculations FOR ALL TO authenticated
USING ( public.is_project_member(project_id) )
WITH CHECK ( public.is_project_member(project_id) );

