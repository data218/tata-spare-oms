// Stage the full location snapshot before removing the previous version.
// Movement history is a separate ledger and must survive stock uploads.
let lastSnapshotTime = 0;
export async function replaceInventorySnapshot(client, rows, location, onProgress = () => {}) {
  if (!rows.length) throw new Error('No inventory rows to upload.');
  if (rows.some(row => row.division !== location)) throw new Error('Inventory rows must belong to the selected location.');
  lastSnapshotTime = Math.max(Date.now(),lastSnapshotTime+1);
  const marker = new Date(lastSnapshotTime).toISOString();
  try {
    for (let offset = 0; offset < rows.length; offset += 1000) {
      const batch = rows.slice(offset, offset + 1000).map(row => ({...row,fetched_at:marker}));
      const {error} = await client.from('tata_spare_inventory').insert(batch);
      if (error) throw error;
      onProgress(Math.min(offset+1000, rows.length));
    }
    const {error} = await client.from('tata_spare_inventory').delete().eq('division',location).neq('fetched_at',marker);
    if (error) throw error;
  } catch (error) {
    const {error:cleanupError} = await client.from('tata_spare_inventory').delete().eq('division',location).eq('fetched_at',marker);
    if (cleanupError) throw new Error(`${error.message}. Upload cleanup also failed: ${cleanupError.message}`);
    throw error instanceof Error ? error : new Error(error.message || String(error));
  }
}
