
const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if(k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const req = https.request(env.SUPABASE_URL + '/rest/v1/tata_spare_inventory?select=last_receipt&limit=1000', {
  headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let data = JSON.parse(body);
    let counts = {};
    data.forEach(r => {
      let lr = r.last_receipt;
      if (!lr) return;
      let month = lr.split('/')[1] || lr.split('-')[1];
      counts[month] = (counts[month] || 0) + 1;
      if (lr.includes('/12/2026') || lr.includes('/11/2026') || lr.includes('/10/2026')) {
         console.log('FUTURE DATE:', lr);
      }
    });
    console.log('Months count:', counts);
  });
});
req.end();

