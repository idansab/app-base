-- 031: every user has a public display name, chosen at signup, and it is the only identity shown on what
-- they write or upload. The email is never shown publicly.
--  * profiles.display_name, validated by clean_display_name() (mirrored in src/lib/displayName.js).
--  * Signup copies raw_user_meta_data->>'display_name' into the profile; existing users set it with set_display_name().
--  * The server fills the name in: Discover comments (replaces the email-before-@ name), community chat messages
--    (the client's username is ignored), and "צולם ע״י" credits for photos users upload to place-images.
--  * Comments, chat and community suggestions need a display name (HINT 'display_name_required'), so the
--    client can ask for one first.
--  * Admin list of update requests returns the display name next to the email.
-- Requires 005 (is_admin, profiles grants), 021 (suggest_place_update), 024 (enforce_moderation), 030 (comments).
-- NOTE: the project reference in the regular expression is this project's. Change it for another environment.

-- Trimmed, inner whitespace collapsed; NULL when not acceptable.
CREATE OR REPLACE FUNCTION public.clean_display_name(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN n IS NULL OR char_length(n) NOT BETWEEN 2 AND 30 THEN NULL
    WHEN n ~ '[@[:cntrl:]]' THEN NULL                        -- no emails, no control characters
    WHEN n !~ '[^[:space:][:digit:][:punct:]]' THEN NULL     -- needs at least one letter
    WHEN n ~* '(admin|moderator|support|מנהל|מודרטור|מערכת|צוות|בעל העסק|בעלת העסק)' THEN NULL
    ELSE n
  END
  FROM (SELECT btrim(regexp_replace(p, '\s+', ' ', 'g')) AS n) s;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_valid
  CHECK (display_name IS NULL OR display_name = public.clean_display_name(display_name));

-- Signup: the name the person typed (an invalid one is left empty and asked again in the app)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (new.id, 'user', public.clean_display_name(new.raw_user_meta_data->>'display_name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- The caller sets their own name; it also updates the name on their earlier Discover comments.
CREATE OR REPLACE FUNCTION public.set_display_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v TEXT := public.clean_display_name(p_name);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501';
  END IF;
  IF v IS NULL THEN
    RAISE EXCEPTION 'invalid display name' USING ERRCODE = '22023', HINT = 'invalid_display_name';
  END IF;
  INSERT INTO public.profiles (id, role, display_name) VALUES (auth.uid(), 'user', v)
  ON CONFLICT (id) DO UPDATE SET display_name = v, updated_at = now();
  UPDATE public.discover_video_comments SET author_name = v WHERE user_id = auth.uid() AND NOT is_owner;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.set_display_name(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_display_name(TEXT) TO authenticated;

-- Discover comments: the display name instead of the part of the email before the @
CREATE OR REPLACE FUNCTION public.enforce_discover_comment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_place TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    new.user_id := auth.uid();
  END IF;
  new.body := btrim(new.body);
  new.created_at := now();

  SELECT owner_id, place_id INTO v_owner, v_place FROM public.discover_videos WHERE id = new.video_id;
  -- COALESCE: built-in videos have no uploader (owner_id is null)
  new.is_owner := COALESCE(new.user_id = v_owner, false) OR EXISTS (
    SELECT 1 FROM public.place_owners
    WHERE user_id = new.user_id AND place_id = v_place AND status = 'approved'
  );

  IF new.is_owner THEN
    new.author_name := 'בעל העסק';
  ELSE
    SELECT display_name INTO new.author_name FROM public.profiles WHERE id = new.user_id;
    IF new.author_name IS NULL THEN
      RAISE EXCEPTION 'display name required' USING ERRCODE = 'P0001', HINT = 'display_name_required';
    END IF;
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_discover_comment_insert() FROM PUBLIC, anon, authenticated;

-- Comments already written show an email name: replace it (nobody has a display name yet, so 'משתמש')
UPDATE public.discover_video_comments c
   SET author_name = COALESCE((SELECT display_name FROM public.profiles p WHERE p.id = c.user_id), 'משתמש')
 WHERE NOT c.is_owner;

-- Community chat: the display name, whatever the client sent
CREATE OR REPLACE FUNCTION public.guard_community_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  IF TG_OP = 'INSERT' THEN
    new.user_id := auth.uid();
    SELECT display_name INTO v_name FROM public.profiles WHERE id = auth.uid();
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'display name required' USING ERRCODE = 'P0001', HINT = 'display_name_required';
    END IF;
    new.username := v_name;
    new.expires_at := least(coalesce(new.expires_at, now() + interval '5 minutes'), now() + interval '1 hour');
  ELSE
    new.user_id := old.user_id;
    new.username := old.username;
    new.expires_at := old.expires_at;
    new.created_at := old.created_at;
  END IF;
  RETURN new;
END;
$$;

-- Community suggestions (edits, photos, reports): same as 021, plus the display-name requirement
CREATE OR REPLACE FUNCTION public.suggest_place_update(p_place_id TEXT, p_kind TEXT, p_changes JSONB DEFAULT '{}'::jsonb, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean JSONB := '{}'::jsonb;
  note TEXT := NULLIF(btrim(p_note), '');
  request_id UUID;
  item JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND display_name IS NOT NULL) THEN
    RAISE EXCEPTION 'display name required' USING ERRCODE = 'P0001', HINT = 'display_name_required';
  END IF;
  IF p_kind NOT IN ('edit', 'photos', 'report') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.places WHERE id = p_place_id AND status = 'approved') THEN
    RAISE EXCEPTION 'place not found';
  END IF;
  IF note IS NOT NULL AND char_length(note) > 500 THEN
    RAISE EXCEPTION 'note is too long';
  END IF;
  IF (SELECT count(*) FROM public.place_update_requests
       WHERE user_id = auth.uid() AND source = 'community' AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
  END IF;

  IF p_kind = 'report' THEN
    IF note IS NULL OR char_length(note) < 5 THEN RAISE EXCEPTION 'a short explanation is required'; END IF;
  ELSE
    clean := public.sanitize_suggestion_changes(p_changes);
    IF p_kind = 'photos' THEN
      IF (SELECT array_agg(k) FROM jsonb_object_keys(clean) k) <> ARRAY['add_images'] THEN
        RAISE EXCEPTION 'photos only';
      END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(clean->'add_images') LOOP
        IF position('/place-images/places/' || auth.uid()::text || '/' IN (item #>> '{}')) = 0 THEN
          RAISE EXCEPTION 'invalid image';
        END IF;
      END LOOP;
    ELSIF clean ? 'add_images' THEN
      RAISE EXCEPTION 'use kind photos for images';
    END IF;
  END IF;

  DELETE FROM public.place_update_requests
   WHERE place_id = p_place_id AND user_id = auth.uid() AND status = 'pending' AND source = 'community' AND kind = p_kind;
  INSERT INTO public.place_update_requests (place_id, user_id, changes, note, source, kind)
  VALUES (p_place_id, auth.uid(), clean, note, 'community', p_kind)
  RETURNING id INTO request_id;
  RETURN jsonb_build_object('request_id', request_id);
END;
$$;
REVOKE ALL ON FUNCTION public.suggest_place_update(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_place_update(TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Photo credit: an image in a user's own upload folder (places/<uid>/..., enforced by the storage policy of 019)
-- is credited to that user's display name, unless the uploader is an admin. Runs after places_enforce_moderation
-- and places_sync_images (triggers fire in name order), so it also covers photos a visitor added that an admin approved.
CREATE OR REPLACE FUNCTION public.credit_uploaded_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  own_upload CONSTANT text := '^https://gsbbtrknnkdihdlojwbd\.supabase\.co/storage/v1/object/public/place-images/places/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/';
  u TEXT;
  v_uploader UUID;
  v_name TEXT;
BEGIN
  new.image_credits := COALESCE(new.image_credits, '{}'::jsonb);
  FOREACH u IN ARRAY COALESCE(new.images, '{}'::text[]) LOOP
    CONTINUE WHEN new.image_credits ? u;
    v_uploader := (substring(u FROM own_upload))::uuid;
    CONTINUE WHEN v_uploader IS NULL;
    SELECT display_name INTO v_name FROM public.profiles WHERE id = v_uploader AND role <> 'admin';
    CONTINUE WHEN v_name IS NULL;
    new.image_credits := new.image_credits || jsonb_build_object(u, jsonb_build_object('author', v_name, 'source', 'user'));
  END LOOP;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_uploaded_images() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS places_upload_credits ON public.places;
CREATE TRIGGER places_upload_credits BEFORE INSERT OR UPDATE OF images ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.credit_uploaded_images();

-- Admin list of update requests: + display_name
DROP FUNCTION IF EXISTS public.admin_list_update_requests();
CREATE FUNCTION public.admin_list_update_requests()
RETURNS TABLE (
  id UUID, place_id TEXT, place_name TEXT, user_id UUID, email TEXT,
  changes JSONB, note TEXT, status TEXT, applied_fields TEXT[],
  created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, review_note TEXT, current_place JSONB,
  source TEXT, kind TEXT, display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.id, r.place_id, p.name, r.user_id, u.email::text,
           r.changes, r.note, r.status, r.applied_fields,
           r.created_at, r.reviewed_at, r.review_note, to_jsonb(p),
           r.source, r.kind, pr.display_name
    FROM public.place_update_requests r
    JOIN public.places p ON p.id = r.place_id
    LEFT JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN public.profiles pr ON pr.id = r.user_id
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC
    LIMIT 300;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_update_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_update_requests() TO authenticated;
