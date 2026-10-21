let lastFetchTime = 0;

export function toISODate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (!match) throw new Error('Consumption dates must use MM/DD/YYYY.');
  const [, month, day, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error('Invalid consumption date.');
  }
  return iso;
}

// Insert first, then replace only the requested date window. Never delete history
// outside the report. Roll back this upload if insertion or cancellation fails.
export async function replaceConsumptionPeriod(client, rows, fromDate, toDate, signal) {
  const from = toISODate(fromDate);
  const to = toISODate(toDate);
  if (from > to) throw new Error('From date must not be after to date.');
  if (!rows.length) return 0;
  signal?.throwIfAborted();
  lastFetchTime = Math.max(Date.now(), lastFetchTime + 1);
  const marker = new Date(lastFetchTime).toISOString();
  try {
    for (let i = 0; i < rows.length; i += 1000) {
      signal?.throwIfAborted();
      const batch = rows.slice(i, i + 1000).map((row) => ({ ...row, fetched_at: marker }));
      const { error } = await client.from('tata_consumption_data').insert(batch);
      if (error) throw error;
    }
    signal?.throwIfAborted();
    const { error } = await client.from('tata_consumption_data').delete()
      .gte('date', from).lte('date', to).neq('fetched_at', marker);
    if (error) throw error;
  } catch (error) {
    const { error: rollbackError } = await client.from('tata_consumption_data').delete().eq('fetched_at', marker);
    if (rollbackError) throw new Error(`${error.message}; upload cleanup failed: ${rollbackError.message}`);
    throw error;
  }
  return rows.length;
}
