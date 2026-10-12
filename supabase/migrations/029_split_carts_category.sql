-- Split the old "עגלות קפה ואוכל" category: food trucks and coffee carts get their own
-- category ('carts'); everything else (restaurants, cafés...) stays in 'food' ("אוכל").
-- Cart-like = the importer labelled it a cart / food stand, or the name says so.
update public.places
set category = 'carts'
where category in ('food', 'coffee_food', 'cafe')
  and (
    short_description ~ '^עגלת (קפה|אוכל)'
    or 'עגלת אוכל' = any(tags)
    or 'עגלת קפה' = any(tags)
    or name ~* 'עגלת קפה|פוד ?טראק|food ?truck|coffee cart'
  );

-- Remaining old keys fold into 'food'.
update public.places set category = 'food' where category in ('coffee_food', 'cafe');
