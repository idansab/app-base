export const MAX_PLACE_IMAGES = 5;

/**
 * The gallery of a place: the new `images` list, falling back to the legacy single
 * `image_url` (which older rows / writers may still use). Never returns blanks.
 */
export function getPlaceImages(place) {
  if (!place) return [];
  const fromList = Array.isArray(place.images) ? place.images : [];
  const list = fromList.length > 0 ? fromList : Array.isArray(place.image_url) ? place.image_url : [place.image_url];
  return list.filter((url) => typeof url === 'string' && url.trim() !== '').slice(0, MAX_PLACE_IMAGES);
}
