
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');

async function fetchTableData(tableName, locationFilter = null, columns = '*') {
  let countQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (locationFilter) { countQuery = countQuery.eq('location', locationFilter); }
  const { count } = await countQuery;
  const totalPages = Math.ceil(count / 100000);
  let dataArr = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * 100000;
    const to = from + 100000 - 1;
    let query = supabase.from(tableName).select(columns).range(from, to);
    if (locationFilter) { query = query.eq('location', locationFilter); }
    const { data } = await query;
    if (data) { dataArr = dataArr.concat(data); }
  }
  return dataArr;
}

async function run() {
  const [inventory, priceList] = await Promise.all([
    fetchTableData('tata_spare_inventory', null, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
    fetchTableData('tata_price_list', null, 'part_number, ndp, description, category')
  ]);
  
  const grouped = new Map();
  inventory.forEach(row => {
    const pn = row.part_no || row.part_number;
    const key = pn + '_' + Math.random();
    
    const priceRow = priceList.find(p => p.part_number === pn);
    let ndp = priceRow ? (parseFloat(priceRow.ndp) || 0) : 0;
    let qty = parseFloat(row.qty) || 0;
    
    grouped.set(key, { pn, currentStock: qty, ndpPrice: ndp, stockValue: qty * ndp });
  });
  
  let totalStock = 0;
  let zeros = 0;
  let validStock = 0;
  let validValues = 0;
  for (let p of grouped.values()) {
    totalStock += p.stockValue;
    if (p.stockValue === 0) zeros++;
    if (p.currentStock > 0) validStock++;
    if (p.stockValue > 0) validValues++;
  }
  console.log('Total Stock Value:', totalStock, 'Zeros:', zeros, 'Total Items:', grouped.size);
  console.log('Stock > 0:', validStock, 'StockValue > 0:', validValues);
}
run();

