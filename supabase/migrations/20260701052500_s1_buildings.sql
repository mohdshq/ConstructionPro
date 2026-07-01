-- 20260701052500_s1_buildings.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS buildings JSONB DEFAULT '[]'::jsonb;
