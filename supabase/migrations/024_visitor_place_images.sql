-- 024: security. A signed-in visitor inserts places straight into the table (policy places_insert only checks
-- that they are signed in). Anything they put in `images` / `image_url` is public once an admin approves the place,
-- so a hot-linked image from any website (tracking pixel, inappropriate content) could go live unnoticed.
-- For non-admins the moderation trigger now keeps only photos from our own place-images bucket;
-- images that are already on a place (Wikimedia, Unsplash, ...) stay when a visitor or owner edits something else.
-- Admins and server scripts (no signed-in user) are not affected.
-- Requires 005 (enforce_moderation + trigger) and 013/014 (source, image_credits).
-- NOTE: the project reference in the regular expression is this project's. Change it for another environment.

CREATE OR REPLACE FUNCTION public.enforce_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  own_bucket CONSTANT text := '^https://gsbbtrknnkdihdlojwbd\.supabase\.co/storage/v1/object/public/place-images/[A-Za-z0-9._/-]+$';
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  IF TG_OP = 'INSERT' THEN
    new.status := 'pending';
    new.created_by_id := auth.uid()::text;
    IF TG_TABLE_NAME = 'places' THEN
      new.source := NULL;
      new.source_ref := NULL;
      new.source_license := NULL;
      new.image_credits := '{}'::jsonb;
      new.images := ARRAY(SELECT u FROM unnest(COALESCE(new.images, '{}'::text[])) AS u WHERE u ~ own_bucket);
      IF new.image_url IS NOT NULL AND new.image_url !~ own_bucket THEN
        new.image_url := NULL;
      END IF;
    END IF;
  ELSE
    new.status := old.status;
    new.created_by_id := old.created_by_id;
    IF TG_TABLE_NAME = 'places' THEN
      new.source := old.source;
      new.source_ref := old.source_ref;
      new.source_license := old.source_license;
      new.image_credits := old.image_credits;
      new.images := ARRAY(
        SELECT u FROM unnest(COALESCE(new.images, '{}'::text[])) AS u
        WHERE u ~ own_bucket OR u = ANY (COALESCE(old.images, '{}'::text[]))
      );
      IF new.image_url IS NOT NULL AND new.image_url !~ own_bucket AND new.image_url IS DISTINCT FROM old.image_url THEN
        new.image_url := old.image_url;
      END IF;
    END IF;
  END IF;
  RETURN new;
END;
$function$;
