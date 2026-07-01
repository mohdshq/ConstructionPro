CREATE TABLE IF NOT EXISTS snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  building_id UUID,
  floor INTEGER,
  flat INTEGER,
  area_type TEXT NOT NULL DEFAULT 'unit',
  severity TEXT NOT NULL DEFAULT 'minor',
  trade TEXT,
  description TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  legacy_code TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snags_project ON snags(project_id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS snag_counter INTEGER DEFAULT 0;
