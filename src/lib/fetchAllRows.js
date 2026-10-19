// The Supabase API returns at most 1000 rows per request, so a plain select silently drops the rest.

export const PAGE_SIZE = 1000;

/**
 * Loads every row of a query by paging through it with .range().
 * `makeQuery` returns a fresh query builder each call; give it an .order() on a unique column
 * so pages don't overlap or skip rows. Throws the first Supabase error.
 */
export async function fetchAllRows(makeQuery, pageSize = PAGE_SIZE) {
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
}
