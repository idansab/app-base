-- 008: place gallery (up to 5 images), structured opening hours, kosher info.
-- Additive and backwards compatible: image_url and opening_hours keep working.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS opening_schedule JSONB,
  ADD COLUMN IF NOT EXISTS kosher TEXT,
  ADD COLUMN IF NOT EXISTS kosher_note TEXT;

-- kosher: NULL = unknown, otherwise 'kosher' | 'not_kosher'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_kosher_check') THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_kosher_check CHECK (kosher IS NULL OR kosher IN ('kosher', 'not_kosher'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_images_max_5') THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_images_max_5 CHECK (cardinality(images) <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_opening_schedule_type') THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_opening_schedule_type
      CHECK (opening_schedule IS NULL OR opening_schedule->>'type' IN ('always', 'weekly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_kosher_note_len') THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_kosher_note_len CHECK (kosher_note IS NULL OR char_length(kosher_note) <= 100);
  END IF;
END $$;

-- Keep image_url (the cover) and images in sync, whichever one a writer sets:
--   * images changed/non-empty  -> image_url = images[1]
--   * only image_url set (old clients, contribute form, server.js) -> images = {image_url}
CREATE OR REPLACE FUNCTION public.sync_place_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF cardinality(new.images) = 0 AND new.image_url IS NOT NULL AND new.image_url <> '' THEN
      new.images := ARRAY[new.image_url];
    END IF;
  ELSE
    IF new.images IS DISTINCT FROM old.images THEN
      NULL; -- images is the source of truth, handled below
    ELSIF new.image_url IS DISTINCT FROM old.image_url THEN
      -- legacy writer changed only the cover
      IF new.image_url IS NULL OR new.image_url = '' THEN
        new.images := COALESCE(new.images[2:], '{}');
      ELSE
        new.images := ARRAY[new.image_url] || COALESCE(new.images[2:], '{}');
      END IF;
    END IF;
  END IF;

  new.images := COALESCE(new.images, '{}');
  new.image_url := CASE WHEN cardinality(new.images) > 0 THEN new.images[1] ELSE NULL END;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS places_sync_images ON public.places;
CREATE TRIGGER places_sync_images
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.sync_place_images();

-- Backfill gallery from the existing cover image
UPDATE public.places
SET images = ARRAY[image_url]
WHERE cardinality(images) = 0 AND image_url IS NOT NULL AND image_url <> '';

-- Open spaces are always open. Anything else is converted by an admin (the editor
-- suggests a schedule parsed from the old text).
UPDATE public.places
SET opening_schedule = '{"type": "always"}'::jsonb
WHERE opening_schedule IS NULL
  AND trim(opening_hours) IN ('שטח פתוח', 'פתוח 24 שעות', 'פתוח 24/7', '24/7', '24 שעות', 'פתוח תמיד');
