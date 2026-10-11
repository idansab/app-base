-- 027: visitors can report content (defamation, copyright, privacy) through the feedback inbox.
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_kind_check;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_kind_check CHECK (kind IN ('idea', 'bug', 'praise', 'other', 'report'));

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_message TEXT, p_kind TEXT DEFAULT 'other', p_contact TEXT DEFAULT NULL, p_page TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT := btrim(COALESCE(p_message, ''));
BEGIN
  IF char_length(msg) < 5 OR char_length(msg) > 2000 THEN
    RAISE EXCEPTION 'message must be 5 to 2000 characters';
  END IF;
  IF p_kind NOT IN ('idea', 'bug', 'praise', 'other', 'report') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;
  IF auth.uid() IS NOT NULL THEN
    IF (SELECT count(*) FROM public.feedback WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 5 THEN
      RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
    END IF;
  ELSIF (SELECT count(*) FROM public.feedback WHERE user_id IS NULL AND created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = 'P0001', HINT = 'too_many_requests';
  END IF;

  INSERT INTO public.feedback (user_id, kind, message, contact, page)
  VALUES (auth.uid(), p_kind, msg, NULLIF(left(btrim(COALESCE(p_contact, '')), 200), ''), NULLIF(left(btrim(COALESCE(p_page, '')), 200), ''));
END;
$$;
REVOKE ALL ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
