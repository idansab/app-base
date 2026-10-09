-- 013: where a place came from (for correct attribution, re-imports without duplicates, and removal).
--   source          e.g. 'osm'
--   source_ref      the id in that source, e.g. 'node/123456'
--   source_license  e.g. 'ODbL' (OpenStreetMap contributors)
-- UNIQUE (source, source_ref) makes an import idempotent: re-running it can never create duplicates.
-- Manually created places keep source NULL (NULLs never conflict).

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_ref TEXT,
  ADD COLUMN IF NOT EXISTS source_license TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_source_ref_key') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_source_ref_key UNIQUE (source, source_ref);
  END IF;
END $$;
