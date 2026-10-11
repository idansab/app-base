-- 026: community trips. A trip stays private until its owner publishes it; a published trip is visible to everyone
-- (also to visitors who are not signed in, through a shared link), and signed-in users can bookmark it.
-- Published trips appear at once; an admin can hide (or delete) a trip. The owner's account is never exposed:
-- the public sees only the name the author typed when publishing.
-- Requires 003 (trips), 005 (is_admin), 010 (nothing else).

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS is_public    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_name  TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Shape of a trip, enforced by the database (trips are inserted straight from the browser)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.valid_trip_order(p TEXT)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  j JSONB;
  item JSONB;
  seen TEXT[] := '{}';
BEGIN
  BEGIN
    j := p::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  IF jsonb_typeof(j) <> 'array' OR jsonb_array_length(j) NOT BETWEEN 1 AND 12 THEN RETURN FALSE; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(j) LOOP
    IF jsonb_typeof(item) <> 'string' OR char_length(item #>> '{}') > 64 THEN RETURN FALSE; END IF;
    IF (item #>> '{}') = ANY (seen) THEN RETURN FALSE; END IF;
    seen := seen || (item #>> '{}');
  END LOOP;
  RETURN TRUE;
END;
$$;

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_title_len;
ALTER TABLE public.trips ADD CONSTRAINT trips_title_len CHECK (char_length(btrim(title)) BETWEEN 2 AND 80);
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_description_len;
ALTER TABLE public.trips ADD CONSTRAINT trips_description_len CHECK (description IS NULL OR char_length(description) <= 500);
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_author_len;
ALTER TABLE public.trips ADD CONSTRAINT trips_author_len CHECK (author_name IS NULL OR char_length(btrim(author_name)) BETWEEN 1 AND 40);
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_places_order_valid;
ALTER TABLE public.trips ADD CONSTRAINT trips_places_order_valid CHECK (public.valid_trip_order(places_order));

-- ---------------------------------------------------------------------------
-- Who may read the TABLE: your own trips and admins. Other people's published trips are read only through
-- community_trip() / community_trips() / saved_trips() below, which never return the owner's user_id.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own trips" ON public.trips;
DROP POLICY IF EXISTS "Admins can read all trips" ON public.trips;
DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- used by the bookmark policy: RLS would hide other people's trips from the policy's own subquery
CREATE OR REPLACE FUNCTION public.is_public_trip(p_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.trips WHERE id = p_id AND is_public AND NOT hidden) $$;
REVOKE ALL ON FUNCTION public.is_public_trip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_trip(TEXT) TO authenticated;

DROP POLICY IF EXISTS "trips_admin_update" ON public.trips;
DROP POLICY IF EXISTS "trips_admin_delete" ON public.trips;
CREATE POLICY "trips_admin_update" ON public.trips FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "trips_admin_delete" ON public.trips FOR DELETE USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Guard: owners cannot un-hide their trip or change its owner, publishing is rate limited,
-- and the publish date is set by the server
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trips_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;

  IF TG_OP = 'INSERT' THEN
    new.hidden := false;
    new.user_id := auth.uid();
    IF (SELECT count(*) FROM public.trips WHERE user_id = auth.uid() AND created_at > now() - interval '1 day') >= 20 THEN
      RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
    END IF;
  ELSE
    new.hidden := old.hidden;
    new.user_id := old.user_id;
  END IF;

  IF new.is_public THEN
    IF TG_OP = 'INSERT' OR NOT old.is_public THEN
      IF (SELECT count(*) FROM public.trips WHERE user_id = auth.uid() AND is_public AND published_at > now() - interval '1 day') >= 5 THEN
        RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
      END IF;
      new.published_at := now();
    ELSE
      new.published_at := old.published_at;
    END IF;
    new.author_name := COALESCE(NULLIF(btrim(new.author_name), ''), 'מטייל/ת מהקהילה');
  ELSE
    new.published_at := NULL;
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS trips_guard ON public.trips;
CREATE TRIGGER trips_guard BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.trips_guard();

-- ---------------------------------------------------------------------------
-- Bookmarks: save a trip somebody else built (the author may keep editing it; the bookmark follows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_saves (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id    TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);
ALTER TABLE public.trip_saves ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trip_saves_trip ON public.trip_saves(trip_id);

DROP POLICY IF EXISTS "trip_saves_select" ON public.trip_saves;
DROP POLICY IF EXISTS "trip_saves_insert" ON public.trip_saves;
DROP POLICY IF EXISTS "trip_saves_delete" ON public.trip_saves;
CREATE POLICY "trip_saves_select" ON public.trip_saves FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "trip_saves_insert" ON public.trip_saves FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_public_trip(trip_id)
    AND (SELECT count(*) FROM public.trip_saves s WHERE s.user_id = auth.uid()) < 200
  );
CREATE POLICY "trip_saves_delete" ON public.trip_saves FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public listing. Never returns the owner's account, only the name typed at publishing.
-- Open to visitors who are not signed in, so a shared link works for everybody.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.community_trips(INT);
CREATE FUNCTION public.community_trips(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id TEXT, title TEXT, description TEXT, places_order TEXT, duration_hours NUMERIC,
  author_name TEXT, published_at TIMESTAMPTZ, saves_count BIGINT, saved_by_me BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.description, t.places_order, t.duration_hours::numeric, t.author_name, t.published_at,
         (SELECT count(*) FROM public.trip_saves s WHERE s.trip_id = t.id),
         COALESCE((SELECT true FROM public.trip_saves s WHERE s.trip_id = t.id AND s.user_id = auth.uid()), false)
  FROM public.trips t
  WHERE t.is_public AND NOT t.hidden
  ORDER BY t.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
$$;
REVOKE ALL ON FUNCTION public.community_trips(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_trips(INT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.community_trip(TEXT);
CREATE FUNCTION public.community_trip(p_id TEXT)
RETURNS TABLE (
  id TEXT, title TEXT, description TEXT, places_order TEXT, duration_hours NUMERIC,
  author_name TEXT, published_at TIMESTAMPTZ, saves_count BIGINT, saved_by_me BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.description, t.places_order, t.duration_hours::numeric, t.author_name, t.published_at,
         (SELECT count(*) FROM public.trip_saves s WHERE s.trip_id = t.id),
         COALESCE((SELECT true FROM public.trip_saves s WHERE s.trip_id = t.id AND s.user_id = auth.uid()), false)
  FROM public.trips t
  WHERE t.id = p_id AND t.is_public AND NOT t.hidden
$$;
REVOKE ALL ON FUNCTION public.community_trip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_trip(TEXT) TO anon, authenticated;

-- The trips I bookmarked (only the ones that are still public and visible).
DROP FUNCTION IF EXISTS public.saved_trips();
CREATE FUNCTION public.saved_trips()
RETURNS TABLE (
  id TEXT, title TEXT, description TEXT, places_order TEXT, duration_hours NUMERIC,
  author_name TEXT, published_at TIMESTAMPTZ, saves_count BIGINT, saved_by_me BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.description, t.places_order, t.duration_hours::numeric, t.author_name, t.published_at,
         (SELECT count(*) FROM public.trip_saves c WHERE c.trip_id = t.id),
         true
  FROM public.trip_saves s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.user_id = auth.uid() AND t.is_public AND NOT t.hidden
  ORDER BY s.created_at DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.saved_trips() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.saved_trips() TO authenticated;
