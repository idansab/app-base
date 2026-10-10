-- 020: (1) self-service account deletion ("right to be forgotten"), (2) per-user rate limits on user-generated content.

-- 1. delete_my_account() ---------------------------------------------------------------------
-- Removes the caller's personal data and their auth user. Rows with a UUID foreign key to
-- auth.users (trips, place_owners, place_update_requests, profiles, user_tips) go through ON DELETE CASCADE.
-- Rows keyed by a TEXT user id are cleaned up here. Approved places are public content: they stay, anonymised.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- never leave the site without an admin
  IF public.is_admin() AND (SELECT count(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'last admin cannot delete the account' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.favorites WHERE user_id = uid::text;
  DELETE FROM public.tips WHERE created_by_id = uid::text;
  DELETE FROM public.reports WHERE created_by_id = uid::text;
  DELETE FROM public.places WHERE created_by_id = uid::text AND status <> 'approved';
  UPDATE public.places SET created_by_id = NULL WHERE created_by_id = uid::text;
  DELETE FROM public.community_messages WHERE user_id::text = uid::text;

  -- uploaded images live in place-images/places/<uid>/
  DELETE FROM storage.objects
   WHERE bucket_id = 'place-images' AND name LIKE 'places/' || uid::text || '/%';

  DELETE FROM auth.users WHERE id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- 2. rate limits -----------------------------------------------------------------------------
-- enforce_rate_limit(owner_column, max_rows, window): counts the caller's rows created in the window.
-- Service role / migrations (auth.uid() IS NULL) and admins are not limited.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  owner_col text := TG_ARGV[0];
  max_rows int := TG_ARGV[1]::int;
  win interval := TG_ARGV[2]::interval;
  recent int;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  EXECUTE format(
    'SELECT count(*) FROM %I.%I WHERE %I::text = $1 AND created_at > now() - $2',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, owner_col)
  INTO recent USING auth.uid()::text, win;
  IF recent >= max_rows THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
  END IF;
  RETURN new;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('tips',               'created_by_id', 10, '1 hour'),
    ('user_tips',          'user_id',       10, '1 hour'),
    ('reports',            'created_by_id', 10, '1 hour'),
    ('places',             'created_by_id', 10, '1 day'),
    ('community_messages', 'user_id',       20, '1 minute')
  ) AS t(tbl, col, max_rows, win)
  LOOP
    -- skip tables or columns that do not exist in this environment
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col)
       AND EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'created_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tbl || '_rate_limit', r.tbl);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit(%L, %L, %L)',
        r.tbl || '_rate_limit', r.tbl, r.col, r.max_rows, r.win);
    END IF;
  END LOOP;
END $$;
