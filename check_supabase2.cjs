
const https = require('https');
const req = https.request('https://crreoeautoqzcgtlwlsd.supabase.co/rest/v1/tata_spare_inventory?select=last_receipt&limit=1000', {
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8' }
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
      if (lr.includes('/12/2026') || lr.includes('/11/2026') || lr.includes('/10/2026') || lr.includes('2026-12') || lr.includes('2026-11')) {
         console.log('FUTURE DATE:', lr);
      }
    });
    console.log('Months count:', counts);
  });
});
req.end();

