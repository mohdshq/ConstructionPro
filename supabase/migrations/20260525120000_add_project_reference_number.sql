-- Migration: Add reference_number to projects
-- Purpose: Support project reference numbers like "PRJ-2026-001"
--          for cross-referencing with client systems, POs, and invoices.
-- Date: 2026-05-25

ALTER TABLE public.projects
  ADD COLUMN reference_number TEXT
  CHECK (reference_number IS NULL OR char_length(reference_number) <= 50);

COMMENT ON COLUMN public.projects.reference_number IS
  'Optional human-readable project reference (e.g., PRJ-2026-001, 25-0142). Not unique; for display only.';
