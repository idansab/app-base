-- 019: security audit F-04. Signed-in users may only upload into their own folder of the place-images bucket:
-- places/<their user id>/<file>. (Existing files stay readable: the bucket is public.)
DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
CREATE POLICY "place_images_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'place-images'
    AND (storage.foldername(name))[1] = 'places'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
