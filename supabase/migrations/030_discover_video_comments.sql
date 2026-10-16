-- 030: comments on "Discover" videos.
--  * Everyone can read the comments of approved videos; signed-in users can comment on them.
--  * The author's name is set on the server, never by the client: "בעל העסק" for the video's
--    uploader or an approved owner of its place, otherwise the part of the email before the @.
--  * Authors delete their own comments; admins delete any comment.
-- Requires 005 (is_admin), 009 (place_owners), 028 (discover_videos).

CREATE TABLE IF NOT EXISTS public.discover_video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.discover_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 300),
  author_name TEXT NOT NULL DEFAULT '',
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discover_video_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_discover_comments_video ON public.discover_video_comments(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discover_comments_user ON public.discover_video_comments(user_id);

DROP POLICY IF EXISTS "discover_comments_select" ON public.discover_video_comments;
DROP POLICY IF EXISTS "discover_comments_insert" ON public.discover_video_comments;
DROP POLICY IF EXISTS "discover_comments_delete" ON public.discover_video_comments;

CREATE POLICY "discover_comments_select" ON public.discover_video_comments FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.discover_videos v WHERE v.id = video_id AND v.status = 'approved')
  );
CREATE POLICY "discover_comments_insert" ON public.discover_video_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.discover_videos v WHERE v.id = video_id AND v.status = 'approved')
  );
CREATE POLICY "discover_comments_delete" ON public.discover_video_comments FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());
-- no UPDATE policy: comments cannot be edited

-- Fills in who wrote the comment; the client's values for these columns are ignored.
CREATE OR REPLACE FUNCTION public.enforce_discover_comment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_place TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    new.user_id := auth.uid();
  END IF;
  new.body := btrim(new.body);
  new.created_at := now();

  SELECT owner_id, place_id INTO v_owner, v_place FROM public.discover_videos WHERE id = new.video_id;
  -- COALESCE: built-in videos have no uploader (owner_id is null)
  new.is_owner := COALESCE(new.user_id = v_owner, false) OR EXISTS (
    SELECT 1 FROM public.place_owners
    WHERE user_id = new.user_id AND place_id = v_place AND status = 'approved'
  );

  IF new.is_owner THEN
    new.author_name := 'בעל העסק';
  ELSE
    SELECT NULLIF(split_part(email, '@', 1), '') INTO new.author_name FROM auth.users WHERE id = new.user_id;
    new.author_name := COALESCE(new.author_name, 'משתמש');
  END IF;
  RETURN new;
END;
$$;
-- trigger only: not callable through the API
REVOKE ALL ON FUNCTION public.enforce_discover_comment_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_discover_comment_insert ON public.discover_video_comments;
CREATE TRIGGER trg_discover_comment_insert BEFORE INSERT ON public.discover_video_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_discover_comment_insert();

-- Same function as in 020, repeated here because 020 is not applied on every environment.
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

-- At most 10 comments per user in 10 minutes (admins are not limited)
DROP TRIGGER IF EXISTS discover_video_comments_rate_limit ON public.discover_video_comments;
CREATE TRIGGER discover_video_comments_rate_limit BEFORE INSERT ON public.discover_video_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', '10', '10 minutes');
