-- 028: "Discover" videos managed in the database (was a static list in src/lib/discoverVideos.js).
--  * Admins add / edit / reorder / hide / delete any video.
--  * Approved business owners upload videos for their own place; they start 'pending' and
--    appear in the feed only after an admin approves them.
-- Requires 005 (is_admin), 006 (admin_audit_log), 009 (place_owners).

CREATE TABLE IF NOT EXISTS public.discover_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT REFERENCES public.places(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 60),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 200),
  video_url TEXT NOT NULL,
  poster_url TEXT,
  storage_path TEXT,   -- null for built-in videos served from /discover/
  poster_path TEXT,
  duration_seconds NUMERIC(5,1) CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 60),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  review_note TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.discover_videos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_discover_videos_feed ON public.discover_videos(status, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discover_videos_owner ON public.discover_videos(owner_id);

-- True when the signed-in user is an approved owner of the given place (or of any place when null)
CREATE OR REPLACE FUNCTION public.is_approved_owner(p_place_id TEXT DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.place_owners
    WHERE user_id = auth.uid() AND status = 'approved'
      AND (p_place_id IS NULL OR place_id = p_place_id)
  );
$$;
REVOKE ALL ON FUNCTION public.is_approved_owner(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_owner(TEXT) TO authenticated;

DROP POLICY IF EXISTS "discover_select" ON public.discover_videos;
DROP POLICY IF EXISTS "discover_insert" ON public.discover_videos;
DROP POLICY IF EXISTS "discover_update" ON public.discover_videos;
DROP POLICY IF EXISTS "discover_delete" ON public.discover_videos;

CREATE POLICY "discover_select" ON public.discover_videos FOR SELECT
  USING (status = 'approved' OR owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "discover_insert" ON public.discover_videos FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (owner_id = auth.uid() AND place_id IS NOT NULL AND public.is_approved_owner(place_id))
  );
CREATE POLICY "discover_update" ON public.discover_videos FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "discover_delete" ON public.discover_videos FOR DELETE
  USING (public.is_admin() OR owner_id = auth.uid());

-- Owners can never choose their own status/order; at most 3 live videos per place.
CREATE OR REPLACE FUNCTION public.enforce_discover_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN new;
  END IF;
  new.owner_id := auth.uid();
  new.status := 'pending';
  new.sort_order := 100;
  new.review_note := NULL;
  new.reviewed_by := NULL;
  new.reviewed_at := NULL;
  IF (SELECT count(*) FROM public.discover_videos
      WHERE place_id = new.place_id AND status IN ('pending', 'approved')) >= 3 THEN
    RAISE EXCEPTION 'too many videos for this place' USING ERRCODE = 'check_violation';
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS trg_discover_insert ON public.discover_videos;
CREATE TRIGGER trg_discover_insert BEFORE INSERT ON public.discover_videos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_discover_insert();

-- Admin moderation + deletes are written to the audit log
CREATE OR REPLACE FUNCTION public.log_discover_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN COALESCE(new, old);
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'delete', 'discover_video', old.id::text, jsonb_build_object('title', old.title, 'status', old.status));
  ELSIF new.status IS DISTINCT FROM old.status THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'moderate', 'discover_video', new.id::text,
            jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status, 'note', new.review_note));
  END IF;
  RETURN COALESCE(new, old);
END;
$$;
DROP TRIGGER IF EXISTS trg_discover_log ON public.discover_videos;
CREATE TRIGGER trg_discover_log AFTER UPDATE OR DELETE ON public.discover_videos
  FOR EACH ROW EXECUTE FUNCTION public.log_discover_change();

-- The four videos that shipped with the app
INSERT INTO public.discover_videos (title, description, video_url, poster_url, status, sort_order)
SELECT * FROM (VALUES
  ('עוד פעם סופש ואין מה לעשות?', 'עגלות קפה, מעיינות, מסלולים ואטרקציות במקום אחד. מסננים לפתוח עכשיו, כשר, נגיש וחניה.', '/discover/weekend.mp4', '/discover/weekend.jpg', 'approved', 10),
  ('לכל דבר אפליקציה אחרת?', 'אצלנו הכול במקום אחד: קפה, טבע, חיי לילה, תרבות ואטרקציות. ומסלולים מהקהילה לשכפל ולשתף.', '/discover/everything.mp4', '/discover/everything.jpg', 'approved', 20),
  ('מה יש פה? כל מה שיש באזור', 'עגלות קפה, מעיינות, מסלולי הליכה, תרבות ובילוי, עם טיפים מהקהילה וניווט ל-Waze בלחיצה.', '/discover/area-b.mp4', '/discover/area-b.jpg', 'approved', 30),
  ('כל מה שיש באזור', 'מגלים מה יש מסביב: קפה, טבע, תרבות ובילוי, עם ניווט בלחיצה.', '/discover/area-a.mp4', '/discover/area-a.jpg', 'approved', 40)
) AS v(title, description, video_url, poster_url, status, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.discover_videos WHERE video_url LIKE '/discover/%');

-- ---------------------------------------------------------------------------
-- Storage: public bucket, owners upload into their own folder, 40MB per file
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('discover-videos', 'discover-videos', true, 41943040,
        ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 41943040,
      allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg'];

DROP POLICY IF EXISTS "discover_upload_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "discover_delete_own_or_admin" ON storage.objects;
CREATE POLICY "discover_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'discover-videos'
    AND (storage.foldername(name))[1] = 'owners'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_approved_owner(NULL)
  );
CREATE POLICY "discover_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'discover-videos'
    AND (public.is_admin() OR (
      (storage.foldername(name))[1] = 'owners' AND (storage.foldername(name))[2] = auth.uid()::text))
  );
