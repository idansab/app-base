-- 007: one admin-only RPC that feeds the dashboard charts.
-- Needs SECURITY DEFINER because admins cannot read other users' favorites through RLS.

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'signups_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'count', COALESCE(c.n, 0)) ORDER BY d), '[]'::jsonb)
      FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') AS d
      LEFT JOIN (
        SELECT created_at::date AS day, count(*) AS n
        FROM public.profiles
        WHERE created_at >= CURRENT_DATE - 13
        GROUP BY 1
      ) c ON c.day = d::date
    ),
    'top_places', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT p.id, p.name, count(f.id) AS count
        FROM public.favorites f
        JOIN public.places p ON p.id = f.place_id
        GROUP BY p.id, p.name
        ORDER BY count(f.id) DESC
        LIMIT 5
      ) t
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT category, count(*) AS count
        FROM public.places
        WHERE status = 'approved'
        GROUP BY category
      ) t
    ),
    'favorites_total', (SELECT count(*) FROM public.favorites)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
