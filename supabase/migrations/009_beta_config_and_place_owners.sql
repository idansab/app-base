-- 009: beta period configuration + place ownership (claims approved by an admin).
-- During the beta every approved owner gets the paid capabilities for free. Afterwards
-- place_entitlements() is the single place where paid plans plug in.

-- ---------------------------------------------------------------------------
-- app_config: key/value settings. No policies on purpose: only the SECURITY DEFINER
-- functions below read or write it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_config FROM anon, authenticated;

-- Default: free for everyone until the end of 2026 (Israel time). Changeable by an admin.
INSERT INTO public.app_config (key, value)
VALUES ('beta', jsonb_build_object('ends_at', '2026-12-31T23:59:59+02:00', 'everyone_pro', true))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.beta_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE((value->>'everyone_pro')::boolean, false)
            AND now() < (value->>'ends_at')::timestamptz
     FROM public.app_config WHERE key = 'beta'),
    false);
$$;
REVOKE ALL ON FUNCTION public.beta_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beta_active() TO anon, authenticated;

-- Public: what the UI may show ("free until ...")
CREATE OR REPLACE FUNCTION public.public_beta_info()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'active', public.beta_active(),
    'ends_at', (SELECT value->>'ends_at' FROM public.app_config WHERE key = 'beta'),
    'everyone_pro', COALESCE((SELECT (value->>'everyone_pro')::boolean FROM public.app_config WHERE key = 'beta'), false)
  );
$$;
REVOKE ALL ON FUNCTION public.public_beta_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_beta_info() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_beta(p_ends_at TIMESTAMPTZ, p_everyone_pro BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_value JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF p_ends_at IS NULL THEN
    RAISE EXCEPTION 'ends_at is required';
  END IF;

  SELECT value INTO old_value FROM public.app_config WHERE key = 'beta';

  INSERT INTO public.app_config (key, value, updated_at, updated_by)
  VALUES ('beta', jsonb_build_object('ends_at', p_ends_at, 'everyone_pro', p_everyone_pro), now(), auth.uid())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'config_change', 'app_config', 'beta',
          jsonb_build_object('from', old_value, 'to', jsonb_build_object('ends_at', p_ends_at, 'everyone_pro', p_everyone_pro)));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_beta(TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_beta(TIMESTAMPTZ, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- place_owners: "I own this business" claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  relation TEXT NOT NULL DEFAULT 'owner' CHECK (relation IN ('owner', 'manager', 'employee')),
  contact_name TEXT CHECK (contact_name IS NULL OR char_length(contact_name) <= 100),
  contact_phone TEXT CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 30),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  UNIQUE (place_id, user_id)
);
ALTER TABLE public.place_owners ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_place_owners_status ON public.place_owners(status);
CREATE INDEX IF NOT EXISTS idx_place_owners_user ON public.place_owners(user_id);

DROP POLICY IF EXISTS "owners_select" ON public.place_owners;
DROP POLICY IF EXISTS "owners_insert" ON public.place_owners;
DROP POLICY IF EXISTS "owners_update" ON public.place_owners;
DROP POLICY IF EXISTS "owners_delete" ON public.place_owners;

CREATE POLICY "owners_select" ON public.place_owners FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "owners_insert" ON public.place_owners FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "owners_update" ON public.place_owners FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owners_delete" ON public.place_owners FOR DELETE
  USING (public.is_admin() OR (user_id = auth.uid() AND status = 'pending'));

-- Claims are always created pending and owned by the caller; review fields are admin-only.
CREATE OR REPLACE FUNCTION public.enforce_owner_claim()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN new;
  END IF;

  IF TG_OP = 'INSERT' AND NOT public.is_admin() THEN
    new.user_id := auth.uid();
    new.status := 'pending';
    new.reviewed_by := NULL;
    new.reviewed_at := NULL;
    new.review_note := NULL;
    IF (SELECT count(*) FROM public.place_owners WHERE user_id = new.user_id AND status = 'pending') >= 5 THEN
      RAISE EXCEPTION 'too many pending claims';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND new.status IS DISTINCT FROM old.status THEN
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS place_owners_enforce ON public.place_owners;
CREATE TRIGGER place_owners_enforce BEFORE INSERT OR UPDATE ON public.place_owners
  FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_claim();

CREATE OR REPLACE FUNCTION public.log_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN COALESCE(new, old);
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'delete', 'place_owners', old.id::text, jsonb_build_object('place_id', old.place_id, 'status', old.status));
    RETURN old;
  END IF;
  IF new.status IS DISTINCT FROM old.status THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'status_change', 'place_owners', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'place_id', new.place_id, 'user_id', new.user_id));
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.log_owner_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS place_owners_audit ON public.place_owners;
CREATE TRIGGER place_owners_audit AFTER UPDATE OR DELETE ON public.place_owners
  FOR EACH ROW EXECUTE FUNCTION public.log_owner_change();

-- Admin queue with the data the review needs (email lives in auth.users)
CREATE OR REPLACE FUNCTION public.admin_list_owner_claims()
RETURNS TABLE (
  id UUID, place_id TEXT, place_name TEXT, user_id UUID, email TEXT,
  relation TEXT, contact_name TEXT, contact_phone TEXT, note TEXT,
  status TEXT, created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, review_note TEXT
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
    SELECT o.id, o.place_id, p.name, o.user_id, u.email::text,
           o.relation, o.contact_name, o.contact_phone, o.note,
           o.status, o.created_at, o.reviewed_at, o.review_note
    FROM public.place_owners o
    JOIN public.places p ON p.id = o.place_id
    LEFT JOIN auth.users u ON u.id = o.user_id
    ORDER BY (o.status = 'pending') DESC, o.created_at DESC
    LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_owner_claims() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_owner_claims() TO authenticated;

-- ---------------------------------------------------------------------------
-- Entitlements: the single place that answers "what may this user do on this place?"
-- Paid plans will be added here after the beta; the client and RPCs only ask this.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_place_owner(p_place_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.place_owners
    WHERE place_id = p_place_id AND user_id = auth.uid() AND status = 'approved'
  );
$$;
REVOKE ALL ON FUNCTION public.is_place_owner(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_place_owner(TEXT) TO authenticated;

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
    -- paid capability: direct edit without admin approval
    'direct_edit', public.is_place_owner(p_place_id) AND public.beta_active(),
    'max_images', 5
  );
$$;
REVOKE ALL ON FUNCTION public.place_entitlements(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_entitlements(TEXT) TO authenticated;
