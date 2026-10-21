// Page by the indexed primary key. Counts, large responses and deep offsets
// make refreshes unnecessarily expensive on the shared Supabase database.
export async function readDashboardTable(client, table, {
  columns = '*', location = null, pageSize = 1000, minPageSize = 250,
  maxRetries = 2, onProgress = () => {},
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const selected = columns === '*' || columns.split(',').some(c => c.trim() === 'id')
    ? columns : `id,${columns}`;
  const rows = [];
  let cursor = null;
  while (true) {
    let result;
    for (let attempt = 0; ; attempt++) {
      try {
        let query = client.from(table).select(selected).order('id').limit(pageSize);
        if (location) query = query.eq('division', location);
        if (cursor !== null) query = query.gt('id', cursor);
        result = await query;
      } catch (error) {
        result = { error };
      }
      if (!result.error) break;
      const { error } = result;
      const retryable = ['57014', 'PGRST003'].includes(error.code)
        || /timeout|timed out|fetch failed|failed to fetch|network/i.test(error.message || '');
      if (!retryable || attempt >= maxRetries) {
        throw new Error(`Unable to load ${table}: ${error.message || 'database request failed'}`);
      }
      pageSize = Math.max(minPageSize, Math.floor(pageSize / 2));
      await wait(250 * (attempt + 1));
    }
    if (!Array.isArray(result.data)) throw new Error(`Unable to load ${table}: missing page data`);
    if (!result.data.length) return rows;
    const next = result.data.at(-1).id;
    if (next == null || next === cursor) throw new Error(`Unable to load ${table}: invalid page cursor`);
    rows.push(...result.data);
    cursor = next;
    onProgress(rows.length);
    // Read until an empty page: the API can cap responses below our limit.
  }
}
