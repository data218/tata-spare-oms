import { fetchInventoryData } from './src/inventory_scraper.js';

try {
  const messages = await fetchInventoryData(console.log, 'ALL');
  console.log('=== RUN COMPLETE ===');
  for (const m of messages) console.log(m);
} catch (e) {
  console.error('FATAL:', e && e.message ? e.message : e);
  process.exitCode = 1;
}