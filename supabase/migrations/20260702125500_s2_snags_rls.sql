ALTER TABLE public.snags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view snags for their projects" ON public.snags;
CREATE POLICY "Users can view snags for their projects" ON public.snags FOR SELECT TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Users can manage snags for their projects" ON public.snags;
CREATE POLICY "Users can manage snags for their projects" ON public.snags FOR ALL TO authenticated
USING ( public.is_project_member(project_id) OR user_id = auth.uid() )
WITH CHECK ( public.is_project_member(project_id) OR user_id = auth.uid() );
