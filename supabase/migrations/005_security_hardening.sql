-- 005: Security hardening (idempotent).
--  * RLS enabled on every public table
--  * server-side admin check (public.is_admin) used by all admin policies
--  * profiles.role can no longer be changed by the owner (privilege escalation fix)
--  * moderation state (status / created_by_id) enforced by triggers, not by the client
--  * reports table + place-images bucket created
--  * SECURITY DEFINER functions locked down

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Lock down trigger / event-trigger functions (they are not meant to be RPC-callable)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (new.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.community_messages WHERE expires_at < NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.delete_expired_messages() FROM PUBLIC, anon, authenticated;

-- Moderation guard: for signed-in end users, new content is always 'pending',
-- owned by the caller, and only admins may change status / ownership.
-- auth.uid() IS NULL means service role / migrations / import scripts -> untouched.
CREATE OR REPLACE FUNCTION public.enforce_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN new;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new.status := 'pending';
    new.created_by_id := auth.uid()::text;
  ELSE
    new.status := old.status;
    new.created_by_id := old.created_by_id;
  END IF;
  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles: owner may read, nobody but an admin may change roles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Defense in depth: the API roles never get to write profiles directly
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------------
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.places;
DROP POLICY IF EXISTS "Allow public read places" ON public.places;
DROP POLICY IF EXISTS "Public can read approved places" ON public.places;
DROP POLICY IF EXISTS "Users can create places" ON public.places;
DROP POLICY IF EXISTS "Users can update own places" ON public.places;
DROP POLICY IF EXISTS "places_select" ON public.places;
DROP POLICY IF EXISTS "places_insert" ON public.places;
DROP POLICY IF EXISTS "places_update" ON public.places;
DROP POLICY IF EXISTS "places_delete" ON public.places;

CREATE POLICY "places_select" ON public.places FOR SELECT USING (
  status = 'approved'
  OR created_by_id = auth.uid()::text
  OR public.is_admin()
);
CREATE POLICY "places_insert" ON public.places FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "places_update" ON public.places FOR UPDATE
  USING (public.is_admin() OR (created_by_id = auth.uid()::text AND status = 'pending'))
  WITH CHECK (public.is_admin() OR created_by_id = auth.uid()::text);
CREATE POLICY "places_delete" ON public.places FOR DELETE
  USING (public.is_admin());

DROP TRIGGER IF EXISTS places_enforce_moderation ON public.places;
CREATE TRIGGER places_enforce_moderation
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation();

CREATE INDEX IF NOT EXISTS idx_places_created_by ON public.places(created_by_id);

-- ---------------------------------------------------------------------------
-- tips (new tips are pending until an admin approves them)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Public can read approved tips" ON public.tips;
DROP POLICY IF EXISTS "Users can create tips" ON public.tips;
DROP POLICY IF EXISTS "tips_select" ON public.tips;
DROP POLICY IF EXISTS "tips_insert" ON public.tips;
DROP POLICY IF EXISTS "tips_update" ON public.tips;
DROP POLICY IF EXISTS "tips_delete" ON public.tips;

CREATE POLICY "tips_select" ON public.tips FOR SELECT USING (
  status = 'approved'
  OR created_by_id = auth.uid()::text
  OR public.is_admin()
);
CREATE POLICY "tips_insert" ON public.tips FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND char_length(content) BETWEEN 1 AND 2000);
CREATE POLICY "tips_update" ON public.tips FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "tips_delete" ON public.tips FOR DELETE
  USING (public.is_admin() OR created_by_id = auth.uid()::text);

DROP TRIGGER IF EXISTS tips_enforce_moderation ON public.tips;
CREATE TRIGGER tips_enforce_moderation
  BEFORE INSERT OR UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation();

-- ---------------------------------------------------------------------------
-- reports (table was referenced by the app but never created)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  status TEXT DEFAULT 'pending',
  created_by_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reports_place_id ON public.reports(place_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;
DROP POLICY IF EXISTS "reports_delete" ON public.reports;

CREATE POLICY "reports_select" ON public.reports FOR SELECT USING (
  status = 'approved'
  OR created_by_id = auth.uid()::text
  OR public.is_admin()
);
CREATE POLICY "reports_insert" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reports_update" ON public.reports FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "reports_delete" ON public.reports FOR DELETE
  USING (public.is_admin() OR created_by_id = auth.uid()::text);

DROP TRIGGER IF EXISTS reports_enforce_moderation ON public.reports;
CREATE TRIGGER reports_enforce_moderation
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation();

-- ---------------------------------------------------------------------------
-- favorites (RLS was OFF in production although policies existed)
-- ---------------------------------------------------------------------------
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON public.favorites;

CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING (auth.uid()::text = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.favorites'::regclass AND contype = 'u'
  ) THEN
    ALTER TABLE public.favorites
      ADD CONSTRAINT favorites_place_user_key UNIQUE (place_id, user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- trips: admins may moderate, owners keep their policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all trips" ON public.trips;
CREATE POLICY "Admins can read all trips" ON public.trips
  FOR SELECT USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- community_messages: signed-in only, hide expired, bounded length, admin moderation
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read messages" ON public.community_messages;
DROP POLICY IF EXISTS "Authenticated can read live messages" ON public.community_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON public.community_messages;

CREATE POLICY "Authenticated can read live messages" ON public.community_messages
  FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Admins can delete messages" ON public.community_messages
  FOR DELETE USING (public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_messages_content_len'
  ) THEN
    ALTER TABLE public.community_messages
      ADD CONSTRAINT community_messages_content_len
      CHECK (char_length(content) BETWEEN 1 AND 500) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- user_tips: legacy table (the app uses `tips`); let admins moderate it as well
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create tips" ON public.user_tips;
CREATE POLICY "Users can create tips" ON public.user_tips FOR INSERT
  WITH CHECK (user_id = auth.uid()::text AND status = 'pending');
DROP POLICY IF EXISTS "Admins can manage user_tips" ON public.user_tips;
CREATE POLICY "Admins can manage user_tips" ON public.user_tips
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: place-images bucket (5MB, images only), uploads by signed-in users,
-- deletes by admins
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('place-images', 'place-images', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "place_images_admin_delete" ON storage.objects;
CREATE POLICY "place_images_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'place-images' AND public.is_admin());
