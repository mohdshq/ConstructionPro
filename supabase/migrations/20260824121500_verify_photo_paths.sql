DO $$
DECLARE
  rec RECORD;
  obj_exists boolean;
BEGIN
  RAISE NOTICE '=== DEFECT 1 DATA LAYER PROOF: STORAGE OBJECTS IN report-photos ===';
  FOR rec IN 
    SELECT id, name, photo_url 
    FROM public.projects 
    WHERE photo_url IS NOT NULL 
    ORDER BY created_at DESC 
  LOOP
    -- Compute exact remotePath: projectId/photo_url
    SELECT EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'report-photos' 
        AND name = (rec.id::text || '/' || rec.photo_url)
    ) INTO obj_exists;

    RAISE NOTICE 'Project: "%" (ID: %) -> photo_url: % | Expected Storage Path: % | Object Exists in S3 bucket: %', 
      rec.name, rec.id, rec.photo_url, (rec.id::text || '/' || rec.photo_url), obj_exists;
  END LOOP;
END $$;
