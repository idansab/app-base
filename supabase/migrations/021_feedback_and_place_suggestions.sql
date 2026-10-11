-- 021: (1) feedback from visitors, (2) place suggestions (edit / photos / report) from signed-in users.
-- Suggestions reuse place_update_requests (migration 010): an admin reviews them field by field and can
-- accept only some of them (e.g. just the photos). Nothing a visitor sends changes a place until an admin accepts it.
-- Requires 005 (is_admin), 006 (admin_audit_log), 010.

-- ---------------------------------------------------------------------------
-- 1. place_update_requests: who it came from and what kind it is
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_update_requests
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'owner' CHECK (source IN ('owner', 'community')),
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'edit' CHECK (kind IN ('edit', 'photos', 'report'));

-- one open request per user, place, source and kind: a new submission replaces the old one
DROP INDEX IF EXISTS public.uniq_pending_update_request;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_update_request
  ON public.place_update_requests (place_id, user_id, source, kind) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. What a visitor may suggest (identity fields included, unlike owners). Raises on anything else.
--    add_images = photos to ADD to the gallery (never replaces it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_suggestion_changes(c JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  common JSONB := c - 'name' - 'address' - 'add_images';
  result JSONB := '{}'::jsonb;
  item JSONB;
BEGIN
  IF c IS NULL OR jsonb_typeof(c) <> 'object' OR c = '{}'::jsonb THEN
    RAISE EXCEPTION 'no changes';
  END IF;

  -- text, hours, price, kosher and tags follow the owner rules
  IF common <> '{}'::jsonb THEN
    IF common ? 'images' OR common ? 'opening_schedule' THEN RAISE EXCEPTION 'field not allowed'; END IF;
    result := public.sanitize_place_changes(common);
  END IF;

  IF c ? 'name' THEN
    IF jsonb_typeof(c->'name') <> 'string' OR char_length(btrim(c->>'name')) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'invalid name';
    END IF;
    result := result || jsonb_build_object('name', btrim(c->>'name'));
  END IF;

  IF c ? 'address' THEN
    IF jsonb_typeof(c->'address') <> 'string' OR char_length(btrim(c->>'address')) NOT BETWEEN 3 AND 200 THEN
      RAISE EXCEPTION 'invalid address';
    END IF;
    result := result || jsonb_build_object('address', btrim(c->>'address'));
  END IF;

  IF c ? 'add_images' THEN
    IF jsonb_typeof(c->'add_images') <> 'array' OR jsonb_array_length(c->'add_images') NOT BETWEEN 1 AND 3 THEN
      RAISE EXCEPTION 'between 1 and 3 images';
    END IF;
    FOR item IN SELECT * FROM jsonb_array_elements(c->'add_images') LOOP
      -- only files uploaded to our own bucket
      IF jsonb_typeof(item) <> 'string'
         OR char_length(item #>> '{}') > 500
         OR NOT (item #>> '{}') ~ '^https://[^/]+/storage/v1/object/public/place-images/[A-Za-z0-9._/-]+$' THEN
        RAISE EXCEPTION 'invalid image';
      END IF;
    END LOOP;
    result := result || jsonb_build_object('add_images', c->'add_images');
  END IF;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. apply_place_changes: also name, address and add_images (merged, no duplicates, at most 5 in total)
--    (owners can never reach name/address/add_images: sanitize_place_changes does not allow them)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_place_changes(p_place_id TEXT, c JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.places SET
    name              = CASE WHEN c ? 'name'              THEN c->>'name'              ELSE name END,
    address           = CASE WHEN c ? 'address'           THEN c->>'address'           ELSE address END,
    short_description = CASE WHEN c ? 'short_description' THEN c->>'short_description' ELSE short_description END,
    description       = CASE WHEN c ? 'description'       THEN c->>'description'       ELSE description END,
    phone             = CASE WHEN c ? 'phone'             THEN c->>'phone'             ELSE phone END,
    opening_hours     = CASE WHEN c ? 'opening_hours'     THEN c->>'opening_hours'     ELSE opening_hours END,
    opening_schedule  = CASE WHEN c ? 'opening_schedule'  THEN NULLIF(c->'opening_schedule', 'null'::jsonb) ELSE opening_schedule END,
    images            = CASE
                          WHEN c ? 'images' THEN ARRAY(SELECT jsonb_array_elements_text(c->'images'))
                          WHEN c ? 'add_images' THEN COALESCE((
                            SELECT array_agg(u ORDER BY first_pos)
                            FROM (
                              SELECT u, min(pos) AS first_pos
                              FROM unnest(COALESCE(images, '{}'::text[]) || ARRAY(SELECT jsonb_array_elements_text(c->'add_images')))
                                   WITH ORDINALITY AS t(u, pos)
                              GROUP BY u ORDER BY min(pos) LIMIT 5
                            ) merged
                          ), '{}'::text[])
                          ELSE images END,
    kosher            = CASE WHEN c ? 'kosher'            THEN c->>'kosher'            ELSE kosher END,
    kosher_note       = CASE WHEN c ? 'kosher_note'       THEN c->>'kosher_note'       ELSE kosher_note END,
    price_level       = CASE WHEN c ? 'price_level'       THEN c->>'price_level'       ELSE price_level END,
    tags              = CASE WHEN c ? 'tags'              THEN ARRAY(SELECT jsonb_array_elements_text(c->'tags')) ELSE tags END,
    updated_at        = now()
  WHERE id = p_place_id;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_place_changes(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Owner path: a new owner submission only replaces the owner's own pending request
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_update_place(p_place_id TEXT, p_changes JSONB, p_note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean JSONB;
  request_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_place_owner(p_place_id) THEN
    RAISE EXCEPTION 'not an approved owner of this place' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'note is too long';
  END IF;

  clean := public.sanitize_place_changes(p_changes);

  IF (public.place_entitlements(p_place_id)->>'direct_edit')::boolean THEN
    PERFORM public.apply_place_changes(p_place_id, clean);
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'owner_edit', 'places', p_place_id, jsonb_build_object('fields', (SELECT jsonb_agg(k) FROM jsonb_object_keys(clean) k)));
    RETURN jsonb_build_object('applied', true);
  END IF;

  DELETE FROM public.place_update_requests
   WHERE place_id = p_place_id AND user_id = auth.uid() AND status = 'pending' AND source = 'owner';
  INSERT INTO public.place_update_requests (place_id, user_id, changes, note, source, kind)
  VALUES (p_place_id, auth.uid(), clean, NULLIF(btrim(p_note), ''), 'owner', 'edit')
  RETURNING id INTO request_id;
  RETURN jsonb_build_object('applied', false, 'request_id', request_id);
END;
$$;
REVOKE ALL ON FUNCTION public.owner_update_place(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_place(TEXT, JSONB, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. The entry point for signed-in visitors. Always becomes a request for an admin.
--    p_kind: 'edit' (corrections), 'photos' ({add_images: [...]}), 'report' (a wrong / closed place; note required)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suggest_place_update(
  p_place_id TEXT, p_kind TEXT, p_changes JSONB DEFAULT '{}'::jsonb, p_note TEXT DEFAULT NULL)
RETURNS jsonb
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
      -- photos must come from the sender's own upload folder (places/<user id>/...)
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

-- ---------------------------------------------------------------------------
-- 6. Admin: list (now with source and kind) and apply (visitor suggestions use their own sanitizer)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_update_requests();
CREATE FUNCTION public.admin_list_update_requests()
RETURNS TABLE (
  id UUID, place_id TEXT, place_name TEXT, user_id UUID, email TEXT,
  changes JSONB, note TEXT, status TEXT, applied_fields TEXT[],
  created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, review_note TEXT, current_place JSONB,
  source TEXT, kind TEXT
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
           r.source, r.kind
    FROM public.place_update_requests r
    JOIN public.places p ON p.id = r.place_id
    LEFT JOIN auth.users u ON u.id = r.user_id
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC
    LIMIT 300;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_update_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_update_requests() TO authenticated;

-- p_fields = the fields the admin accepted; NULL accepts everything in the request
CREATE OR REPLACE FUNCTION public.admin_apply_update_request(p_request_id UUID, p_fields TEXT[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.place_update_requests;
  accepted JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO req FROM public.place_update_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR req.status <> 'pending' THEN
    RAISE EXCEPTION 'request is not pending';
  END IF;
  IF req.kind = 'report' THEN
    RAISE EXCEPTION 'a report has nothing to apply: close it or edit the place';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO accepted
  FROM jsonb_each(req.changes)
  WHERE p_fields IS NULL OR key = ANY (p_fields);

  IF accepted = '{}'::jsonb THEN
    RAISE EXCEPTION 'no fields selected';
  END IF;

  IF req.source = 'community' THEN
    PERFORM public.apply_place_changes(req.place_id, public.sanitize_suggestion_changes(accepted));
  ELSE
    PERFORM public.apply_place_changes(req.place_id, public.sanitize_place_changes(accepted));
  END IF;

  UPDATE public.place_update_requests
     SET status = 'approved', applied_fields = ARRAY(SELECT jsonb_object_keys(accepted))
   WHERE id = p_request_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'apply_request', 'places', req.place_id,
          jsonb_build_object('request_id', p_request_id, 'source', req.source, 'fields', (SELECT jsonb_agg(k) FROM jsonb_object_keys(accepted) k)));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_apply_update_request(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_update_request(UUID, TEXT[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Feedback from anyone (also visitors who are not signed in). Only an admin can read it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('idea', 'bug', 'praise', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  contact TEXT CHECK (contact IS NULL OR char_length(contact) <= 200),
  page TEXT CHECK (page IS NULL OR char_length(page) <= 200),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status, created_at DESC);

DROP POLICY IF EXISTS "feedback_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_update" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete" ON public.feedback;
-- no INSERT policy: feedback is only created by submit_feedback()
CREATE POLICY "feedback_select" ON public.feedback FOR SELECT USING (public.is_admin());
CREATE POLICY "feedback_update" ON public.feedback FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "feedback_delete" ON public.feedback FOR DELETE USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_message TEXT, p_kind TEXT DEFAULT 'other', p_contact TEXT DEFAULT NULL, p_page TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT := btrim(COALESCE(p_message, ''));
BEGIN
  IF char_length(msg) < 5 OR char_length(msg) > 2000 THEN
    RAISE EXCEPTION 'message must be 5 to 2000 characters';
  END IF;
  IF p_kind NOT IN ('idea', 'bug', 'praise', 'other') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;
  -- rate limits: 5 per hour per signed-in user, 60 per hour for everyone else together
  IF auth.uid() IS NOT NULL THEN
    IF (SELECT count(*) FROM public.feedback WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 5 THEN
      RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
    END IF;
  ELSIF (SELECT count(*) FROM public.feedback WHERE user_id IS NULL AND created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
  END IF;

  INSERT INTO public.feedback (user_id, kind, message, contact, page)
  VALUES (auth.uid(), p_kind, msg, NULLIF(left(btrim(COALESCE(p_contact, '')), 200), ''), NULLIF(left(btrim(COALESCE(p_page, '')), 200), ''));
END;
$$;
REVOKE ALL ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
