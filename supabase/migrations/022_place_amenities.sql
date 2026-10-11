-- 022: practical facts about a place (wheelchair accessible, car access, organised parking).
-- A place lists only what is known: a key that is missing means "not stated", never "no".
-- Requires 010 (sanitize_place_changes) and 021 (apply_place_changes with name/address/add_images).

ALTER TABLE public.places ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_places_amenities ON public.places USING GIN (amenities);

-- owners, admins and visitor suggestions may all set amenities (validated here)
CREATE OR REPLACE FUNCTION public.sanitize_place_changes(c JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  allowed TEXT[] := ARRAY['short_description', 'description', 'phone', 'opening_hours', 'opening_schedule',
                          'images', 'kosher', 'kosher_note', 'price_level', 'tags', 'amenities'];
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

    ELSIF k = 'amenities' THEN
      IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) > 10 THEN RAISE EXCEPTION 'invalid amenities'; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
        IF jsonb_typeof(item) <> 'string' OR NOT (item #>> '{}') IN ('wheelchair', 'car_access', 'parking') THEN
          RAISE EXCEPTION 'invalid amenity';
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

-- applying a request writes the amenities too
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
    amenities         = CASE WHEN c ? 'amenities'         THEN ARRAY(SELECT jsonb_array_elements_text(c->'amenities')) ELSE amenities END,
    updated_at        = now()
  WHERE id = p_place_id;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_place_changes(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
