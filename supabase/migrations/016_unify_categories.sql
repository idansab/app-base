-- 016: the site has five categories: food, nature, nightlife, shopping, culture.
-- Older / finer-grained values are folded into them.
UPDATE public.places SET category = 'food'   WHERE category IN ('cafe', 'coffee_food');
UPDATE public.places SET category = 'nature' WHERE category IN ('hiking', 'view', 'beach', 'family', 'trips', 'other');
