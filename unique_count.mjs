import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(supabaseUrl, supabaseKey);

const mapLocation = (divisionStr) => {
    if (!divisionStr) return 'NARWAL';
    const lowerD = divisionStr.toLowerCase().replace(/\s+/g, '');
    if (lowerD.includes('channirama') || lowerD.includes('chhanirama')) return 'CHANNIRAMA';
    if (lowerD.includes('supwal') || lowerD.includes('smamsamba')) return 'SUPWAL';
    if (lowerD.includes('kathua') || lowerD.includes('smamkathua')) return 'KATHUA';
    if (lowerD.includes('jammu') || lowerD.includes('narwal') || lowerD.includes('narval')) return 'NARWAL';
    return divisionStr; // Default
};

async function run() {
    console.log("Fetching data from Supabase...");
    let allData = [];
    let start = 0;
    while (true) {
        const { data, error } = await supabase.from('tata_spare_inventory').select('part_no, division, qty').range(start, start + 9999);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        start += 10000;
    }
    console.log(`Total raw rows fetched: ${allData.length}`);

    // Grouping exactly like the app
    const groupedGlobal = new Map();
    const locationUniqueCounts = {
        'NARWAL': new Set(),
        'CHANNIRAMA': new Set(),
        'KATHUA': new Set(),
        'SUPWAL': new Set()
    };
    const locationRawCounts = {
        'NARWAL': 0,
        'CHANNIRAMA': 0,
        'KATHUA': 0,
        'SUPWAL': 0
    };

    allData.forEach(row => {
        const pn = String(row.part_no || '').trim().toUpperCase();
        if (!pn) return;
        
        const loc = mapLocation(row.division);
        
        // Count raw rows per location
        if (locationRawCounts[loc] !== undefined) {
            locationRawCounts[loc]++;
        } else {
            locationRawCounts[loc] = 1;
        }

        // Add to location's unique part set
        if (locationUniqueCounts[loc] !== undefined) {
            locationUniqueCounts[loc].add(pn);
        }

        // Add to global unique map
        if (!groupedGlobal.has(pn)) {
            groupedGlobal.set(pn, true);
        }
    });

    console.log("\n--- EXACT RAW ROWS (From Database) ---");
    for (const [loc, count] of Object.entries(locationRawCounts)) {
        console.log(`${loc}: ${count}`);
    }

    console.log("\n--- UNIQUE PART NUMBERS (What the App should display) ---");
    for (const [loc, set] of Object.entries(locationUniqueCounts)) {
        console.log(`${loc}: ${set.size}`);
    }
    
    console.log(`\nALL LOCATIONS COMBINED (Total Unique Parts): ${groupedGlobal.size}`);
}

run();
