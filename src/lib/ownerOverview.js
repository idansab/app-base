const SEEN_KEY = 'owner_seen_at';

export const getSeenAt = (store = globalThis.localStorage) => {
  try {
    return store?.getItem(SEEN_KEY) || null;
  } catch {
    return null;
  }
};

export const markSeen = (now = new Date(), store = globalThis.localStorage) => {
  try {
    store?.setItem(SEEN_KEY, now.toISOString());
  } catch {
    // storage blocked: the badge simply stays until the next visit
  }
};

/** A decision (approved/rejected) made after the user last opened the page. */
export const isNewDecision = (row, seenAt) =>
  row.status !== 'pending' && !!row.reviewed_at && (!seenAt || new Date(row.reviewed_at) > new Date(seenAt));

/**
 * Decisions the user has not looked at yet: a claim that was approved/rejected or an update
 * request that was applied/rejected since the page was last opened.
 */
export function countUnseen(claims, requests, seenAt) {
  return [...(claims || []), ...(requests || [])].filter((row) => isNewDecision(row, seenAt)).length;
}

/** What the "My business" entry in Settings needs: only approved owners get the link. */
export const hasApprovedClaim = (claims) => (claims || []).some((c) => c.status === 'approved');
