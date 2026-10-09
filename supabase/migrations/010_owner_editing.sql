-- 010: owners edit their place.
--   * during the beta (direct_edit entitlement) an approved owner's changes are applied immediately
--   * otherwise the changes become a request that an admin reviews field by field
-- Every change goes through owner_update_place(); owners never get UPDATE on public.places.
-- Requires 009 (is_place_owner, place_entitlements) and 005 (is_admin).

-- ---------------------------------------------------------------------------
-- Validation of an opening schedule (mirrors src/lib/openingHours.js validateSchedule)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.valid_schedule(s JSONB)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d INT;
  r JSONB;
  ranges JSONB;
BEGIN
  IF s IS NULL OR jsonb_typeof(s) = 'null' THEN RETURN TRUE; END IF;
  IF jsonb_typeof(s) <> 'object' THEN RETURN FALSE; END IF;
  IF s ? 'note' AND (jsonb_typeof(s->'note') <> 'string' OR char_length(s->>'note') > 100) THEN RETURN FALSE; END IF;
  IF s->>'type' = 'always' THEN RETURN TRUE; END IF;
  IF s->>'type' <> 'weekly' OR jsonb_typeof(s->'days') <> 'object' THEN RETURN FALSE; END IF;

  FOR d IN 0..6 LOOP
    ranges := s->'days'->(d::text);
    IF ranges IS NULL OR jsonb_typeof(ranges) <> 'array' OR jsonb_array_length(ranges) > 2 THEN RETURN FALSE; END IF;
    FOR r IN SELECT * FROM jsonb_array_elements(ranges) LOOP
      IF jsonb_typeof(r) <> 'array' OR jsonb_array_length(r) <> 2 THEN RETURN FALSE; END IF;
      IF jsonb_typeof(r->0) <> 'string' OR jsonb_typeof(r->1) <> 'string' THEN RETURN FALSE; END IF;
      IF NOT (r->>0) ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RETURN FALSE; END IF;
      IF NOT ((r->>1) ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (r->>1) = '24:00') THEN RETURN FALSE; END IF;
      IF (r->>0) = (r->>1) THEN RETURN FALSE; END IF;
    END LOOP;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Which fields an owner may change, and how they are validated. Raises on anything else.
-- Identity fields (name, address, coordinates, category, status) stay admin-only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_place_changes(c JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  allowed TEXT[] := ARRAY['short_description', 'description', 'phone', 'opening_hours', 'opening_schedule',
                          'images', 'kosher', 'kosher_note', 'price_level', 'tags'];
  k TEXT;
  v JSONB;
  item JSONB;
  result JSONB := '{}'::jsonb;
  max_len INT;
BEGIN
  IF c IS NULL OR jsonb_typeof(c) <> 'object' OR c = '{}'::jsonb THEN
    RAISE EXCEPTION 'no changes';
  END IF;

  FOR k, v IN SELECT * FROM jsonb_each(c) LOOP
    IF NOT k = ANY (allowed) THEN
      RAISE EXCEPTION 'field not allowed: %', k;
    END IF;

    IF k IN ('short_description', 'description', 'phone', 'opening_hours', 'kosher_note') THEN
      IF jsonb_typeof(v) NOT IN ('string', 'null') THEN RAISE EXCEPTION 'invalid %', k; END IF;
      -- (a CASE ... THEN inside an IF condition would end the condition early, so compute it first)
      max_len := CASE k
        WHEN 'description' THEN 2000 WHEN 'short_description' THEN 200
        WHEN 'phone' THEN 30 WHEN 'opening_hours' THEN 200 ELSE 100 END;
      IF jsonb_typeof(v) = 'string' AND char_length(v #>> '{}') > max_len THEN
        RAISE EXCEPTION '% is too long', k;
      END IF;
      result := result || jsonb_build_object(k, CASE WHEN jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') <> '' THEN to_jsonb(btrim(v #>> '{}')) ELSE 'null'::jsonb END);

    ELSIF k = 'kosher' THEN
      IF NOT (jsonb_typeof(v) = 'null' OR v #>> '{}' IN ('kosher', 'not_kosher')) THEN RAISE EXCEPTION 'invalid kosher'; END IF;
      result := result || jsonb_build_object(k, v);

    ELSIF k = 'price_level' THEN
      IF jsonb_typeof(v) <> 'string' OR v #>> '{}' NOT IN ('free', 'budget', 'moderate', 'expensive') THEN
        RAISE EXCEPTION 'invalid price_level';
      END IF;
      result := result || jsonb_build_object(k, v);

    ELSIF k = 'opening_schedule' THEN
      IF NOT public.valid_schedule(v) THEN RAISE EXCEPTION 'invalid opening_schedule'; END IF;
      result := result || jsonb_build_object(k, v);

    ELSIF k = 'images' THEN
      IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) > 5 THEN RAISE EXCEPTION 'at most 5 images'; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
        -- only files uploaded to our own bucket: no hot-linked or tracking images
        IF jsonb_typeof(item) <> 'string'
           OR char_length(item #>> '{}') > 500
           OR NOT (item #>> '{}') ~ '^https://[^/]+/storage/v1/object/public/place-images/[A-Za-z0-9._/-]+$' THEN
          RAISE EXCEPTION 'invalid image';
        END IF;
      END LOOP;
      result := result || jsonb_build_object(k, v);

    ELSIF k = 'tags' THEN
      IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) > 10 THEN RAISE EXCEPTION 'at most 10 tags'; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
        IF jsonb_typeof(item) <> 'string' OR char_length(item #>> '{}') > 30 THEN RAISE EXCEPTION 'invalid tag'; END IF;
      END LOOP;
      result := result || jsonb_build_object(k, v);
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal: apply an already sanitized change set to a place (explicit columns only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_place_changes(p_place_id TEXT, c JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.places SET
    short_description = CASE WHEN c ? 'short_description' THEN c->>'short_description' ELSE short_description END,
    description       = CASE WHEN c ? 'description'       THEN c->>'description'       ELSE description END,
    phone             = CASE WHEN c ? 'phone'             THEN c->>'phone'             ELSE phone END,
    opening_hours     = CASE WHEN c ? 'opening_hours'     THEN c->>'opening_hours'     ELSE opening_hours END,
    opening_schedule  = CASE WHEN c ? 'opening_schedule'  THEN NULLIF(c->'opening_schedule', 'null'::jsonb) ELSE opening_schedule END,
    images            = CASE WHEN c ? 'images'            THEN ARRAY(SELECT jsonb_array_elements_text(c->'images')) ELSE images END,
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
-- Requests (used when the owner has no direct-edit entitlement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  changes JSONB NOT NULL,
  applied_fields TEXT[],
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 500)
);
ALTER TABLE public.place_update_requests ENABLE ROW LEVEL SECURITY;
-- one open request per user and place: a new submission replaces the old one
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_update_request
  ON public.place_update_requests (place_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON public.place_update_requests(status);

DROP POLICY IF EXISTS "update_requests_select" ON public.place_update_requests;
DROP POLICY IF EXISTS "update_requests_update" ON public.place_update_requests;
DROP POLICY IF EXISTS "update_requests_delete" ON public.place_update_requests;
-- no INSERT policy: requests are only created by owner_update_place()
CREATE POLICY "update_requests_select" ON public.place_update_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "update_requests_update" ON public.place_update_requests FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "update_requests_delete" ON public.place_update_requests FOR DELETE
  USING (public.is_admin() OR (user_id = auth.uid() AND status = 'pending'));

CREATE OR REPLACE FUNCTION public.stamp_update_request_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND new.status IS DISTINCT FROM old.status THEN
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS update_requests_stamp ON public.place_update_requests;
CREATE TRIGGER update_requests_stamp BEFORE UPDATE ON public.place_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_update_request_review();

-- ---------------------------------------------------------------------------
-- The single entry point for owners
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
   WHERE place_id = p_place_id AND user_id = auth.uid() AND status = 'pending';
  INSERT INTO public.place_update_requests (place_id, user_id, changes, note)
  VALUES (p_place_id, auth.uid(), clean, NULLIF(btrim(p_note), ''))
  RETURNING id INTO request_id;
  RETURN jsonb_build_object('applied', false, 'request_id', request_id);
END;
$$;
REVOKE ALL ON FUNCTION public.owner_update_place(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_place(TEXT, JSONB, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list with the current place data (for the before/after view) and apply
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_update_requests()
RETURNS TABLE (
  id UUID, place_id TEXT, place_name TEXT, user_id UUID, email TEXT,
  changes JSONB, note TEXT, status TEXT, applied_fields TEXT[],
  created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, review_note TEXT, current_place JSONB
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
           r.created_at, r.reviewed_at, r.review_note, to_jsonb(p)
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

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO accepted
  FROM jsonb_each(req.changes)
  WHERE p_fields IS NULL OR key = ANY (p_fields);

  IF accepted = '{}'::jsonb THEN
    RAISE EXCEPTION 'no fields selected';
  END IF;

  PERFORM public.apply_place_changes(req.place_id, public.sanitize_place_changes(accepted));

  UPDATE public.place_update_requests
     SET status = 'approved', applied_fields = ARRAY(SELECT jsonb_object_keys(accepted))
   WHERE id = p_request_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'apply_request', 'places', req.place_id,
          jsonb_build_object('request_id', p_request_id, 'fields', (SELECT jsonb_agg(k) FROM jsonb_object_keys(accepted) k)));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_apply_update_request(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_update_request(UUID, TEXT[]) TO authenticated;

-- Rejections are logged like other moderation decisions
CREATE OR REPLACE FUNCTION public.log_update_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_admin() AND new.status = 'rejected' AND old.status <> 'rejected' THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'status_change', 'place_update_requests', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'place_id', new.place_id));
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.log_update_request_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS update_requests_audit ON public.place_update_requests;
CREATE TRIGGER update_requests_audit AFTER UPDATE ON public.place_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_update_request_change();
