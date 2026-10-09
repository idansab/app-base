-- 012: more context for reviewing ownership claims (admin only).
--   place_phone      the business's PUBLIC phone: call this one, not the claimant's
--   other_owners     approved owners that already exist on the same place
--   user_claims      how many claims the same person has filed (any status)
--   reviewed_by_email  who made the decision
-- The result shape changes, so the function is dropped and recreated.

DROP FUNCTION IF EXISTS public.admin_list_owner_claims();

CREATE FUNCTION public.admin_list_owner_claims()
RETURNS TABLE (
  id UUID, place_id TEXT, place_name TEXT, place_phone TEXT, user_id UUID, email TEXT,
  relation TEXT, contact_name TEXT, contact_phone TEXT, note TEXT,
  status TEXT, created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, reviewed_by_email TEXT, review_note TEXT,
  other_owners INT, user_claims INT
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
    SELECT o.id, o.place_id, p.name, p.phone, o.user_id, u.email::text,
           o.relation, o.contact_name, o.contact_phone, o.note,
           o.status, o.created_at, o.reviewed_at, ru.email::text, o.review_note,
           (SELECT count(*)::int FROM public.place_owners x
             WHERE x.place_id = o.place_id AND x.status = 'approved' AND x.id <> o.id),
           (SELECT count(*)::int FROM public.place_owners y WHERE y.user_id = o.user_id)
    FROM public.place_owners o
    JOIN public.places p ON p.id = o.place_id
    LEFT JOIN auth.users u ON u.id = o.user_id
    LEFT JOIN auth.users ru ON ru.id = o.reviewed_by
    ORDER BY (o.status = 'pending') DESC, o.created_at DESC
    LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_owner_claims() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_owner_claims() TO authenticated;
