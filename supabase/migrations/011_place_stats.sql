-- 011: anonymous per-place statistics (views, calls, navigation, shares, favorites).
--   * events are written only through track_place_event(); the table itself is closed
--   * a random per-browser-session id (never tied to a user, no IP is stored) lets us count
--     "one view per visitor per 30 minutes" instead of raw page loads
--   * stats are readable by the place's approved owner and by admins
-- Requires 009 (is_place_owner, place_entitlements) and 005 (is_admin).

CREATE TABLE IF NOT EXISTS public.place_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('view', 'call', 'navigate', 'share', 'favorite')),
  session_id TEXT NOT NULL CHECK (char_length(session_id) BETWEEN 8 AND 64),
  bucket BIGINT NOT NULL,                      -- 30-minute window, for de-duplication
  day DATE NOT NULL,                           -- Israel calendar day, for reporting
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (place_id, event, session_id, bucket)
);
ALTER TABLE public.place_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.place_events FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_place_events_place_day ON public.place_events (place_id, day);
CREATE INDEX IF NOT EXISTS idx_place_events_day ON public.place_events (day);

-- Public entry point. Invalid input and non-countable traffic are ignored silently so a
-- tracking problem can never surface as an error on the page.
CREATE OR REPLACE FUNCTION public.track_place_event(p_place_id TEXT, p_event TEXT, p_session TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event IS NULL OR p_event NOT IN ('view', 'call', 'navigate', 'share', 'favorite') THEN RETURN; END IF;
  IF p_session IS NULL OR char_length(p_session) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.places WHERE id = p_place_id AND status = 'approved') THEN RETURN; END IF;

  -- the owner and the admins looking at the page must not inflate their own numbers
  IF auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_place_owner(p_place_id)) THEN RETURN; END IF;

  INSERT INTO public.place_events (place_id, event, session_id, bucket, day)
  VALUES (p_place_id, p_event, p_session,
          floor(extract(epoch FROM now()) / 1800)::bigint,
          (now() AT TIME ZONE 'Asia/Jerusalem')::date)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.track_place_event(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_place_event(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Daily series + totals for the last p_days days and for the period before it (for comparison)
CREATE OR REPLACE FUNCTION public.place_stats(p_place_id TEXT, p_days INT DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d INT := LEAST(GREATEST(COALESCE(p_days, 30), 1), 90);
  today DATE := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_place_owner(p_place_id)) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'days_count', d,
    'days', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'day', g::date,
               'view', COALESCE(c.v, 0), 'call', COALESCE(c.c, 0), 'navigate', COALESCE(c.n, 0),
               'share', COALESCE(c.s, 0), 'favorite', COALESCE(c.f, 0)) ORDER BY g), '[]'::jsonb)
      FROM generate_series(today - (d - 1), today, interval '1 day') g
      LEFT JOIN (
        SELECT day,
               count(*) FILTER (WHERE event = 'view') v,
               count(*) FILTER (WHERE event = 'call') c,
               count(*) FILTER (WHERE event = 'navigate') n,
               count(*) FILTER (WHERE event = 'share') s,
               count(*) FILTER (WHERE event = 'favorite') f
        FROM public.place_events
        WHERE place_id = p_place_id AND day >= today - (d - 1)
        GROUP BY day
      ) c ON c.day = g::date
    ),
    'totals', (
      SELECT jsonb_build_object(
        'view', count(*) FILTER (WHERE event = 'view'), 'call', count(*) FILTER (WHERE event = 'call'),
        'navigate', count(*) FILTER (WHERE event = 'navigate'), 'share', count(*) FILTER (WHERE event = 'share'),
        'favorite', count(*) FILTER (WHERE event = 'favorite'))
      FROM public.place_events WHERE place_id = p_place_id AND day >= today - (d - 1)
    ),
    'previous', (
      SELECT jsonb_build_object(
        'view', count(*) FILTER (WHERE event = 'view'), 'call', count(*) FILTER (WHERE event = 'call'),
        'navigate', count(*) FILTER (WHERE event = 'navigate'), 'share', count(*) FILTER (WHERE event = 'share'),
        'favorite', count(*) FILTER (WHERE event = 'favorite'))
      FROM public.place_events WHERE place_id = p_place_id AND day BETWEEN today - (2 * d - 1) AND today - d
    ),
    'favorites_total', (SELECT count(*) FROM public.favorites WHERE place_id = p_place_id)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.place_stats(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_stats(TEXT, INT) TO authenticated;

-- Admin dashboard: most viewed places in the last p_days days
CREATE OR REPLACE FUNCTION public.admin_top_places(p_days INT DEFAULT 7, p_limit INT DEFAULT 5)
RETURNS TABLE (place_id TEXT, place_name TEXT, views BIGINT, actions BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d INT := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
  today DATE := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.name,
           count(*) FILTER (WHERE e.event = 'view'),
           count(*) FILTER (WHERE e.event IN ('call', 'navigate', 'share', 'favorite'))
    FROM public.place_events e
    JOIN public.places p ON p.id = e.place_id
    WHERE e.day >= today - (d - 1)
    GROUP BY p.id, p.name
    ORDER BY 3 DESC, 4 DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_top_places(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_top_places(INT, INT) TO authenticated;

-- Owners can see their stats whether or not the beta is running (stats are not a paid feature yet)
CREATE OR REPLACE FUNCTION public.place_entitlements(p_place_id TEXT)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_owner', public.is_place_owner(p_place_id),
    'beta_active', public.beta_active(),
    'direct_edit', public.is_place_owner(p_place_id) AND public.beta_active(),
    'stats', public.is_place_owner(p_place_id),
    'max_images', 5
  );
$$;
