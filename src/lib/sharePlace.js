import { toast } from 'sonner';
import { trackPlaceEvent } from '@/lib/trackPlace';

/** Public link to a place page. The server renders per-place title / description / image for link previews. */
export function placeShareUrl(origin, placeId) {
  return `${origin}/place/${encodeURIComponent(placeId)}`;
}

export function placeShareText(place) {
  const where = [place?.city].filter(Boolean).join(', ');
  return `${place?.name || 'מקום'}${where ? ` · ${where}` : ''} — מצאתי ב"מה יש פה"`;
}

/**
 * Shares a link to the place: the phone's share sheet when there is one, otherwise copies the link.
 * Returns 'shared' | 'copied' | 'cancelled' | 'failed'. `env` is injectable for tests.
 */
export async function sharePlaceLink(place, env = globalThis) {
  const url = placeShareUrl(env.location.origin, place.id);
  const nav = env.navigator;
  if (nav?.share) {
    try {
      await nav.share({ title: place.name, text: placeShareText(place), url });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      // fall through to copying
    }
  }
  try {
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Button handler: tracks the share and tells the user what happened. */
export async function handleSharePlace(place) {
  trackPlaceEvent(place.id, 'share');
  const result = await sharePlaceLink(place);
  if (result === 'copied') toast.success('הקישור למקום הועתק, אפשר להדביק ולשלוח');
  else if (result === 'failed') toast.error(`לא הצלחנו להעתיק. הקישור: ${placeShareUrl(window.location.origin, place.id)}`);
}
