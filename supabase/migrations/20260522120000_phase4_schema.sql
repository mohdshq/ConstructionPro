-- ==============================================================================
-- PHASE 4 SCHEMA: Team Sharing & Notifications
-- ==============================================================================

-- 1. Project Members Table
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 2. Activities Table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- e.g., 'created_report', 'added_drawing', 'joined_project'
    entity_type TEXT NOT NULL, -- e.g., 'report', 'drawing', 'project'
    entity_id UUID, -- Optional ID of the related entity
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 3. User Tokens (Push Notifications)
CREATE TABLE public.user_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    platform TEXT, -- 'ios', 'android', 'web'
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Calculations Table
CREATE TABLE public.calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- e.g., 'concrete', 'rebar', 'voltage'
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================================================

-- Project Members
-- Users can view members of projects they are a part of
CREATE POLICY "Users can view project members"
ON public.project_members FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);

-- Only owners and managers can add/remove members
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

-- Activities
-- Users can view activities for projects they are a member of
CREATE POLICY "Users can view activities"
ON public.activities FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);

-- Users can insert activities for projects they are a member of
CREATE POLICY "Users can insert activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);

-- User Tokens
-- Users can manage their own tokens
CREATE POLICY "Users can manage own tokens"
ON public.user_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Calculations
-- Users can view calculations for projects they are a member of
CREATE POLICY "Users can view calculations"
ON public.calculations FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);

-- Users can insert/update calculations for projects they are a member of
CREATE POLICY "Users can manage calculations"
ON public.calculations FOR ALL
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
)
WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);


-- ==============================================================================
-- UPDATE RLS ON EXISTING TABLES FOR TEAM SHARING
-- ==============================================================================

-- Projects
-- Drop the old policies
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;

-- Recreate policies for projects
CREATE POLICY "Users can view projects they are a member of"
ON public.projects FOR SELECT
TO authenticated
USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid() -- fallback for existing projects
);

CREATE POLICY "Owners and managers can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))
    OR user_id = auth.uid()
)
WITH CHECK (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))
    OR user_id = auth.uid()
);

CREATE POLICY "Owners can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
    OR user_id = auth.uid()
);

CREATE POLICY "Users can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Reports
DROP POLICY IF EXISTS "Users can CRUD own reports" ON public.reports;

CREATE POLICY "Users can view reports for their projects"
ON public.reports FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

CREATE POLICY "Users can manage reports for their projects"
ON public.reports FOR ALL
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
)
WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

-- Drawings
DROP POLICY IF EXISTS "Users can CRUD own drawings" ON public.drawings;

CREATE POLICY "Users can view drawings for their projects"
ON public.drawings FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

CREATE POLICY "Users can manage drawings for their projects"
ON public.drawings FOR ALL
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
)
WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

-- Drawing Folders
DROP POLICY IF EXISTS "Users can CRUD own folders" ON public.drawing_folders;

CREATE POLICY "Users can view drawing folders for their projects"
ON public.drawing_folders FOR SELECT
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

CREATE POLICY "Users can manage drawing folders for their projects"
ON public.drawing_folders FOR ALL
TO authenticated
USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
)
WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Auto-add project creator as 'owner' to project_members
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- Migrate existing projects to have members
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;
