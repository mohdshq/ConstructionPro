-- ==============================================================================
-- Revert Direct SQL Cover Backfill & Restrict Report Photo UPDATE/DELETE
-- ==============================================================================

-- 1. Restore projects.photo_url to original legacy paths
UPDATE public.projects
SET photo_url = 'cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_1780307021264_u6ky3c.jpg'
WHERE id = '0516d9f7-342e-4305-8df8-525a6212998a';

UPDATE public.projects
SET photo_url = 'cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_1779449049420_vu9kbr.jpg'
WHERE id = '5f9d2540-711b-45e1-87f6-eb1ad278cacb';

UPDATE public.projects
SET photo_url = 'cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_1782719353109_1vww1n.jpg'
WHERE id = '9c8d27df-d1d9-4b67-b1e4-40361dc269b2';

UPDATE public.projects
SET photo_url = 'cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_1782713621876_iebydw.jpg'
WHERE id = '09cd5c33-e4c9-4d32-aced-b47ac588d317';

UPDATE public.projects
SET photo_url = 'cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_1782720404571_87q7cu.jpg'
WHERE id = 'a95a26d2-84e4-4da6-adc4-cb8fbec25eda';

-- 2. Fix Report Photos UPDATE/DELETE Policies (Restrict to Managers/Owners/Uploader)
DROP POLICY IF EXISTS "Unified update report photos" ON storage.objects;
CREATE POLICY "Unified update report photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
);

DROP POLICY IF EXISTS "Unified delete report photos" ON storage.objects;
CREATE POLICY "Unified delete report photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND (
        public.can_manage_project((storage.foldername(name))[1])
        OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 2
      AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR public.can_manage_project((storage.foldername(name))[2])
      )
    )
  )
);
