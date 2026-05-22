-- =====================================================
-- Phase 3: Realtime, Storage Avatars
-- Applied via Supabase MCP on 2026-05-22
-- =====================================================

-- 1. Enable Realtime on projects and reports tables
ALTER PUBLICATION supabase_realtime ADD TABLE projects, reports;

-- 2. Set REPLICA IDENTITY FULL for DELETE event payloads
ALTER TABLE projects REPLICA IDENTITY FULL;
ALTER TABLE reports REPLICA IDENTITY FULL;
