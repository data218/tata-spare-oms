
const https = require('https');
const req = https.request('https://crreoeautoqzcgtlwlsd.supabase.co/rest/v1/tata_spare_inventory?select=qty&limit=50000', {
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8' }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let data = JSON.parse(body);
    let totalQty = 0;
    let nonZero = 0;
    data.forEach(r => {
      let q = parseFloat(r.qty) || 0;
      totalQty += q;
      if (q > 0) nonZero++;
    });
    console.log('Total Qty:', totalQty, 'Non-Zero rows:', nonZero);
  });
});
req.end();

