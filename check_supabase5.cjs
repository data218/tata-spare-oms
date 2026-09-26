
const https = require('https');
const parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(dateStr);
  const datePart = dateStr.split(' ')[0];
  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) {
      return new Date(y, d - 1, m);
    }
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};

const req = https.request('https://crreoeautoqzcgtlwlsd.supabase.co/rest/v1/tata_spare_inventory?select=last_receipt&limit=10000', {
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8' }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let data = JSON.parse(body);
    let decDates = [];
    data.forEach(r => {
      let lr = r.last_receipt;
      if (!lr) return;
      let d = parseTataDate(lr);
      if (d && !isNaN(d) && d.getFullYear() === 2026 && d.getMonth() === 11) {
         decDates.push(lr);
      }
    });
    console.log('Found Dec dates:', decDates.slice(0, 10));
  });
});
req.end();

