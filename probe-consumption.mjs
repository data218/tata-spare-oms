import { fetchConsumptionData } from './src/consumption_scraper.js';

const from = process.argv[2] || '09/01/2026';
const to = process.argv[3] || '09/03/2026';

try {
  const rows = await fetchConsumptionData(from, to, (m) => console.log('  >', m));
  console.log('\n=== SUCCESS: rows inserted =', rows, '===');
} catch (e) {
  console.log('\n=== FAILED ===');
  console.log(e.message);
  process.exitCode = 1;
}
