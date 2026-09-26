
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');
async function fetchTableData(tableName, columns = '*') {
  const { count } = await supabase.from(tableName).select('id', { count: 'exact', head: true });
  let dataArr = [];
  for (let page = 0; page < Math.ceil(count / 100000); page++) {
    const { data } = await supabase.from(tableName).select(columns).range(page * 100000, page * 100000 + 99999);
    if (data) dataArr = dataArr.concat(data);
  }
  return dataArr;
}
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
    if (m > 12 && d <= 12) { return new Date(y, d - 1, m); }
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};
async function run() {
  const [inventory, priceList] = await Promise.all([
    fetchTableData('tata_spare_inventory', 'part_no, division, qty, last_receipt, availability, location_1'),
    fetchTableData('tata_price_list', 'part_number, ndp')
  ]);
  const grouped = new Map();
  inventory.forEach(row => {
    const pn = row.part_no || row.part_number;
    const key = row.id ? row.id : (pn + '_' + Math.random());
    const priceRow = priceList.find(p => p.part_number === pn);
    let ndp = priceRow ? (parseFloat(priceRow.ndp) || 0) : 0;
    let existing = grouped.get(key) || { pn, currentStock: 0, ndpPrice: ndp, last_receipt: row.last_receipt || '', ageingDays: -1, loc: row.division || row.location_1 || 'Narwal' };
    
    const avail = (row.availability || '').toLowerCase();
    if (avail.includes('on hand')) existing.currentStock += row.qty;
    else if (avail.includes('transit') || avail.includes('reserv')) {} // ignore
    else existing.currentStock += row.qty;
    
    if (row.last_receipt && (!existing.last_receipt || parseTataDate(row.last_receipt) > parseTataDate(existing.last_receipt))) {
      existing.last_receipt = row.last_receipt;
    }
    grouped.set(key, existing);
  });
  
  const now = new Date();
  let ppniParts = 0, totalPPNIValue = 0;
  let locSums = {}, yearSums = {}, monthSums = {};
  for (let p of grouped.values()) {
    p.stockValue = p.ndpPrice * p.currentStock;
    if (p.currentStock > 0 && p.last_receipt) {
      const lrDate = parseTataDate(p.last_receipt);
      if (lrDate && !isNaN(lrDate)) { p.ageingDays = Math.floor((now - lrDate) / 86400000); }
    }
    if (p.currentStock > 0 && p.ageingDays > 180) {
      ppniParts++;
      totalPPNIValue += p.stockValue;
      
      const loc = p.loc.toUpperCase().includes('CHANNI') ? 'Channi Rama' : (p.loc.toUpperCase().includes('KATHUA') ? 'Kathua' : (p.loc.toUpperCase().includes('SUPWAL') ? 'Supwal' : 'Narwal'));
      locSums[loc] = (locSums[loc] || 0) + p.stockValue;
      
      const d = parseTataDate(p.last_receipt);
      const yr = d.getFullYear();
      yearSums[yr] = (yearSums[yr] || 0) + p.stockValue;
      
      const ym = yr + '-' + String(d.getMonth()+1).padStart(2, '0');
      monthSums[ym] = (monthSums[ym] || 0) + p.stockValue;
    }
  }
  console.log('PPNI Count:', ppniParts, 'Total Value:', totalPPNIValue);
  console.log('Location Sums:', locSums);
  console.log('Year Sums:', Object.keys(yearSums).sort().map(y => y + ': ' + yearSums[y]));
  console.log('Month Sums:', Object.keys(monthSums).sort().slice(-12).map(m => m + ': ' + monthSums[m]));
}
run();

