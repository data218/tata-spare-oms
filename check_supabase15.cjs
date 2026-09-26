
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

async function fetchTableData(tableName, locationFilter = null, columns = '*') {
  let countQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (locationFilter) { countQuery = countQuery.eq('location', locationFilter); }
  const { data: countData, error: countError } = await countQuery;
  console.log('Count error for', tableName, ':', countError);
  return countError;
}

async function run() {
  await fetchTableData('tata_price_list', null, 'part_number, ndp, description, category');
}
run();

