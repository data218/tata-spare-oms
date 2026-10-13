
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');
    async function fetchTableData(tableName, locationFilter = null, columns = '*') {
  // 1. Get exact row count first (fast, head-only)
  let countQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (locationFilter) {
    countQuery = countQuery.eq('division', locationFilter);
  }
  
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    console.error(`Error counting ${tableName}:`, countErr);
    return [];
  }
  if (!count) return [];

  // 2. Fetch first chunk (asking for 100,000 rows) to detect Supabase's max-rows limit
  let firstQuery = supabase.from(tableName).select(columns).range(0, 99999);
  if (locationFilter) {
    firstQuery = firstQuery.eq('division', locationFilter);
  }
  const { data: firstData, error: firstErr } = await firstQuery;
  
  if (firstErr) {
    console.error(`Error fetching first chunk of ${tableName}:`, firstErr);
    return [];
  }
  if (!firstData || firstData.length === 0) return [];
  
  const tableData = [...firstData];
  const detectedLimit = firstData.length;
  
  // If we got everything, or if the count is within what we got, we are done! 100x faster!
  if (tableData.length >= count || detectedLimit < 1000) {
    return tableData;
  }
    async function run() {
        try {
            const data = await fetchTableData('tata_price_list', null, 'part_number, ndp, description, category');
            console.log('Got data length:', data.length);
        } catch (e) {
            console.error('Caught error:', e);
        }
    }
    run();
    