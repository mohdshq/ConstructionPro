ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'done';
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS ai_error text;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS ai_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.snags ADD COLUMN IF NOT EXISTS ai_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_snags_ai_pending
  ON public.snags (project_id, created_at)
  WHERE ai_status IN ('pending', 'running', 'failed');
