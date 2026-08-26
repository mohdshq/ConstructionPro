-- ==============================================================================
-- B4: Add Office MIME types to drawings bucket
-- ==============================================================================

UPDATE storage.buckets
SET allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'drawings';

DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT id, public, file_size_limit, allowed_mime_types
  INTO rec
  FROM storage.buckets
  WHERE id = 'drawings';
  
  RAISE NOTICE 'UPDATED_BUCKET: % | PUBLIC: % | SIZE_LIMIT: % | MIMES: %',
    rec.id, rec.public, rec.file_size_limit, rec.allowed_mime_types;
END $$;
