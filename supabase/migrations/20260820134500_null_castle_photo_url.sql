-- Null out photo_url for project Castle (0ddf3676-de1d-4d96-a8e7-f7f55b13cb7c)
-- The referenced storage object was lost during local reset/sign-out before upload completed.
UPDATE public.projects
SET photo_url = NULL
WHERE id = '0ddf3676-de1d-4d96-a8e7-f7f55b13cb7c';
