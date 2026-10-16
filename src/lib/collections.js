// Curated, shareable lists of places ("collections"), linked from social posts.
// Each social post points to its own collection page so visitors see exactly the places from the post.
// Photo credits are required by the Wikimedia Commons licenses of the places' images.

export const COLLECTIONS = {
  springs: {
    slug: 'springs',
    title: '5 מעיינות שעוד לא היית בהם',
    subtitle: 'מהגולן ועד הנגב. שמרו לסופ״ש',
    description: '5 מעיינות פחות מוכרים מהגולן ועד הנגב, עם ניווט ל-Waze בלחיצה.',
    places: [
      { id: '83fcf903-612f-4417-bcaf-0f6a2363f530', credit: 'צילום: שי רוה · CC BY-SA 4.0 · ויקישיתוף' },
      { id: '444e18a3-5775-4fa1-930a-0ab55fd0e67a', credit: 'צילום: ד״ר אבישי טייכר · CC BY 2.5 · פיקיויקי' },
      { id: '1c0f2df6-bf08-4562-bbbe-0a8483f690b6', credit: 'צילום: Alpha12 · CC BY-SA 4.0 · ויקישיתוף' },
      { id: '392ad2e8-562b-494c-9e7b-51a06929d0e8', credit: 'צילום: ד״ר אבישי טייכר · CC BY-SA 4.0 · ויקישיתוף' },
      { id: '883d4c74-d13d-4c25-b32e-ad39b1ea21d5', credit: 'צילום: ekeidar · CC BY-SA 3.0 · ויקישיתוף' },
    ],
  },
  'winter-streams': {
    slug: 'winter-streams',
    title: '3 נחלים שמתעוררים רק בחורף',
    subtitle: 'שמרו לגשם הבא. ובזמן שיטפון לא נכנסים לערוצי נחלים',
    description: 'מפל התנור, מפל סער ונחל צין: מקומות שבאמת שווה לראות אחרי גשם, ואיפה לצפות בשיטפון בבטחה.',
    places: [
      { id: 'feae4dc8-5879-4995-9c07-2729bf0355ee', credit: 'צילום: GorALexeY · CC BY-SA 4.0 · ויקישיתוף' },
      { id: 'ea100b3f-3a31-43e3-a96f-64af208dc926', credit: 'צילום: GorALexeY · CC BY-SA 4.0 · ויקישיתוף' },
      { id: '36', credit: 'צילום: GorALexeY · CC BY-SA 4.0 · ויקישיתוף' },
    ],
  },
};

export const getCollection = (slug) => (Object.hasOwn(COLLECTIONS, slug) ? COLLECTIONS[slug] : null);

/** Puts fetched places back in the collection's order, attaching each one's credit; drops ids that came back missing. */
export function orderCollectionPlaces(collection, places) {
  const byId = new Map((places || []).map((p) => [String(p.id), p]));
  return collection.places
    .map((entry) => (byId.has(entry.id) ? { ...byId.get(entry.id), credit: entry.credit } : null))
    .filter(Boolean);
}

export const collectionPath = (slug) => `/list/${encodeURIComponent(slug)}`;
