export const MIN_QUERY = 2;
export const MAX_QUERY = 50;

/** Trim, collapse whitespace and cap the length of what the user typed. */
export const normalizeQuery = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);

/** Escape LIKE wildcards so "100%" or "a_b" is searched literally. */
export const escapeLike = (text) => String(text ?? '').replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** The pattern for an ILIKE "contains" search, or null when the query is too short to search. */
export function containsPattern(text) {
  const query = normalizeQuery(text);
  return query.length >= MIN_QUERY ? `%${escapeLike(query)}%` : null;
}
