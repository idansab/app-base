-- 017: website and social links for places (shown on the place page; owners can edit them).
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_links_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_links_check CHECK (
      (website   IS NULL OR (website   ~ '^https?://[^[:space:]<>"'']+$' AND char_length(website)   <= 300)) AND
      (instagram IS NULL OR (instagram ~ '^https?://[^[:space:]<>"'']+$' AND char_length(instagram) <= 300)) AND
      (facebook  IS NULL OR (facebook  ~ '^https?://[^[:space:]<>"'']+$' AND char_length(facebook)  <= 300))
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sanitize_place_changes(c jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed TEXT[] := ARRAY['short_description', 'description', 'phone', 'opening_hours', 'opening_schedule',
                          'images', 'kosher', 'kosher_note', 'price_level', 'tags',
                          'website', 'instagram', 'facebook'];
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
      max_len := CASE k
        WHEN 'description' THEN 2000 WHEN 'short_description' THEN 200
        WHEN 'phone' THEN 30 WHEN 'opening_hours' THEN 200 ELSE 100 END;
      IF jsonb_typeof(v) = 'string' AND char_length(v #>> '{}') > max_len THEN
        RAISE EXCEPTION '% is too long', k;
      END IF;
      result := result || jsonb_build_object(k, CASE WHEN jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') <> '' THEN to_jsonb(btrim(v #>> '{}')) ELSE 'null'::jsonb END);

    ELSIF k IN ('website', 'instagram', 'facebook') THEN
      IF jsonb_typeof(v) NOT IN ('string', 'null') THEN RAISE EXCEPTION 'invalid %', k; END IF;
      IF jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') <> ''
         AND (char_length(btrim(v #>> '{}')) > 300 OR btrim(v #>> '{}') !~ '^https?://[^[:space:]<>"'']+$') THEN
        RAISE EXCEPTION 'invalid %', k;
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
        IF jsonb_typeof(item) <> 'string'
           OR char_length(item #>> '{}') > 500
           OR NOT ((item #>> '{}') ~ '^https://[^/]+/storage/v1/object/public/place-images/[A-Za-z0-9._/-]+$'
                   OR (item #>> '{}') ~ '^https://(upload|thumb)\.wikimedia\.org/wikipedia/commons/[^[:space:]"''<>]+$') THEN
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
$function$;
