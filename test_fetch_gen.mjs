import fs from 'fs';
const js = fs.readFileSync('main.js', 'utf8');
const lines = js.split('\n');
const start = lines.findIndex(l => l.includes('async function fetchTableData('));
const end = lines.findIndex((l, i) => i > start && l.trim() === 'return tableData;' && lines[i+1].trim() === '}');
if (start !== -1 && end !== -1) {
    const code = lines.slice(start, end + 2).join('\n');
    let finalCode = `
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');
    ` + code + `
    async function run() {
        try {
            const data = await fetchTableData('tata_price_list', null, 'part_number, ndp, description, category');
            console.log('Got data length:', data.length);
        } catch (e) {
            console.error('Caught error:', e);
        }
    }
    run();
    `;
    fs.writeFileSync('test_fetch2.mjs', finalCode);
    console.log('Saved test_fetch2.mjs');
} else {
    console.log('Not found');
}
