
const https = require('https');
const req = https.request('https://crreoeautoqzcgtlwlsd.supabase.co/rest/v1/tata_spare_inventory?select=last_receipt', {
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8', 'Range': '0-50000' }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let data = JSON.parse(body);
    let futureDates = 0;
    data.forEach(r => {
      let lr = r.last_receipt;
      if (!lr) return;
      let d = new Date(lr); // THE OLD WAY
      if (!isNaN(d) && d > new Date()) {
         futureDates++;
      }
    });
    console.log('Total future dates using OLD WAY (new Date):', futureDates);
  });
});
req.end();

