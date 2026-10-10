-- 018: security audit run-1 fixes: F-01 user_tips self-approval, F-02 chat identity and lifetime, F-03 forged provenance fields, B-01 link fields in apply_place_changes.
-- F-01 user_tips can be self-approved; F-02 chat identity/lifetime is client-controlled;
-- F-03 regular users can forge importer provenance fields on places; B-01 apply_place_changes ignores link fields.

-- F-01 ------------------------------------------------------------------------------------------
ALTER TABLE public.user_tips
  ADD CONSTRAINT user_tips_content_len CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;

CREATE OR REPLACE FUNCTION public.guard_user_tips()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  IF TG_OP = 'INSERT' THEN
    new.status := 'pending';
    new.likes := 0;
  ELSE
    new.status := old.status;
    new.likes := old.likes;
    new.user_id := old.user_id;
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS user_tips_guard ON public.user_tips;
CREATE TRIGGER user_tips_guard BEFORE INSERT OR UPDATE ON public.user_tips
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_tips();

-- F-02 ------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_community_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  IF TG_OP = 'INSERT' THEN
    new.user_id := auth.uid();
    new.username := btrim(left(coalesce(new.username, ''), 40));
    IF new.username = '' OR new.username ~* '(admin|moderator|support|מנהל|מנהלת|מודרטור|מערכת|צוות)' THEN
      RAISE EXCEPTION 'reserved or empty username' USING ERRCODE = '42501';
    END IF;
    new.expires_at := least(coalesce(new.expires_at, now() + interval '5 minutes'), now() + interval '1 hour');
  ELSE
    new.user_id := old.user_id;
    new.username := old.username;
    new.expires_at := old.expires_at;
    new.created_at := old.created_at;
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS community_messages_guard ON public.community_messages;
CREATE TRIGGER community_messages_guard BEFORE INSERT OR UPDATE ON public.community_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_community_message();

-- F-03 ------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN new; END IF;
  IF TG_OP = 'INSERT' THEN
    new.status := 'pending';
    new.created_by_id := auth.uid()::text;
    IF TG_TABLE_NAME = 'places' THEN
      new.source := NULL;
      new.source_ref := NULL;
      new.source_license := NULL;
      new.image_credits := '{}'::jsonb;
    END IF;
  ELSE
    new.status := old.status;
    new.created_by_id := old.created_by_id;
    IF TG_TABLE_NAME = 'places' THEN
      new.source := old.source;
      new.source_ref := old.source_ref;
      new.source_license := old.source_license;
      new.image_credits := old.image_credits;
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- B-01 ------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_place_changes(p_place_id text, c jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.places SET
    short_description = CASE WHEN c ? 'short_description' THEN c->>'short_description' ELSE short_description END,
    description       = CASE WHEN c ? 'description'       THEN c->>'description'       ELSE description END,
    phone             = CASE WHEN c ? 'phone'             THEN c->>'phone'             ELSE phone END,
    opening_hours     = CASE WHEN c ? 'opening_hours'     THEN c->>'opening_hours'     ELSE opening_hours END,
    opening_schedule  = CASE WHEN c ? 'opening_schedule'  THEN NULLIF(c->'opening_schedule', 'null'::jsonb) ELSE opening_schedule END,
    images            = CASE WHEN c ? 'images'            THEN ARRAY(SELECT jsonb_array_elements_text(c->'images')) ELSE images END,
    kosher            = CASE WHEN c ? 'kosher'            THEN c->>'kosher'            ELSE kosher END,
    kosher_note       = CASE WHEN c ? 'kosher_note'       THEN c->>'kosher_note'       ELSE kosher_note END,
    price_level       = CASE WHEN c ? 'price_level'       THEN c->>'price_level'       ELSE price_level END,
    tags              = CASE WHEN c ? 'tags'              THEN ARRAY(SELECT jsonb_array_elements_text(c->'tags')) ELSE tags END,
    website           = CASE WHEN c ? 'website'           THEN c->>'website'           ELSE website END,
    instagram         = CASE WHEN c ? 'instagram'         THEN c->>'instagram'         ELSE instagram END,
    facebook          = CASE WHEN c ? 'facebook'          THEN c->>'facebook'          ELSE facebook END,
    updated_at        = now()
  WHERE id = p_place_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_place_changes(text, jsonb) FROM PUBLIC, anon, authenticated;
