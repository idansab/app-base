-- 025: guards for places a signed-in visitor inserts straight into the table (policy places_insert only checks that the
-- user is signed in). The "share a place" form checks these in the browser; the database must not rely on that.
--   * the position must be inside Israel (a missing or zero position used to be replaced by Jerusalem in the form)
--   * a structured opening schedule must be valid (same rules as the admin editor, see valid_schedule() in migration 010)
-- Every existing row satisfies both (checked before adding).
-- Requires 010 (valid_schedule).

ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_position_in_israel;
ALTER TABLE public.places ADD CONSTRAINT places_position_in_israel CHECK (
  lat BETWEEN 29.4 AND 33.4 AND lng BETWEEN 34.2 AND 35.95
);

ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_opening_schedule_valid;
ALTER TABLE public.places ADD CONSTRAINT places_opening_schedule_valid CHECK (public.valid_schedule(opening_schedule));
