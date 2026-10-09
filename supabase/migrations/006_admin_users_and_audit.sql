-- 006: admin user management + audit log. Requires 005 (public.is_admin).

-- ---------------------------------------------------------------------------
-- Audit log (admins can read; rows are written only by the functions below)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.admin_audit_log(created_at DESC);

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM anon, authenticated;

-- Log every moderation (status) change and every delete made by an admin
CREATE OR REPLACE FUNCTION public.log_moderation_change()
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
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, old.id,
            jsonb_build_object('status', old.status));
    RETURN old;
  END IF;

  IF new.status IS DISTINCT FROM old.status THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'status_change', TG_TABLE_NAME, new.id,
            jsonb_build_object('from', old.status, 'to', new.status));
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.log_moderation_change() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['places', 'tips', 'reports'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_audit', t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.log_moderation_change()', t || '_audit', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- User management RPCs (the client never touches auth.users directly)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
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
    SELECT u.id, u.email::text, p.role, u.created_at, u.last_sign_in_at
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    ORDER BY u.created_at DESC
    LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target UUID, new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF target = auth.uid() THEN
    RAISE EXCEPTION 'you cannot change your own role';
  END IF;

  SELECT role INTO old_role FROM public.profiles WHERE id = target;
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = NOW() WHERE id = target;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'role_change', 'profiles', target::text,
          jsonb_build_object('from', old_role, 'to', new_role));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
