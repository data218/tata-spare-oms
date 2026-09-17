const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/consumption_scraper.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert location fetching at the top of fetchConsumptionData
content = content.replace(
    /async function fetchConsumptionData\(fromDate, toDate\) {[\s\S]*?console\.log\(`Starting Puppeteer/,
    `async function fetchConsumptionData(fromDate, toDate) {
    if (!fromDate || !toDate) {
        throw new Error("fromDate and toDate are required.");
    }

    console.log('Fetching locations from Supabase...');
    const { data: locations, error: locError } = await supabase.from('tata_locations').select('*');
    if (locError) {
        throw new Error('Failed to fetch locations: ' + locError.message);
    }
    if (!locations || locations.length === 0) {
        throw new Error('No locations found in tata_locations table. Please add a location in Settings.');
    }

    console.log('Clearing old data from Supabase once before processing locations...');
    const { error: deleteError } = await supabase.from('tata_consumption_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
        console.error('Warning: Failed to delete old data.', deleteError.message);
    } else {
        console.log('Old data removed successfully.');
    }

    for (const location of locations) {
        console.log(\`Starting Puppeteer for Tata Motors BI (Location: \${location.location_name}, Date Range: \${fromDate} to \${toDate})...\`);`
);

// 2. Remove the old delete logic inside the CSV parser since we moved it outside
content = content.replace(
    /console\.log\('Clearing old data from Supabase\.\.\.'\);[\s\S]*?console\.log\('Old data removed successfully\.'\);\s*\}/,
    `console.log('Old data already cleared. Proceeding to parse.');`
);

// 3. Remove old credential fetching logic
content = content.replace(
    /console\.log\('Fetching bot credentials from Supabase\.\.\.'\);[\s\S]*?console\.log\(\`Logging in as: \$\{botUser\}\`\);/,
    `let botUser = location.username;
        let botPass = location.password;
        console.log(\`Logging in as: \${botUser} for location \${location.location_name}\`);`
);

// 4. Inject location into results.push
content = content.replace(
    /results\.push\(\{/,
    `results.push({\n                            location: location.location_name,`
);

// 5. Ensure the try-catch block and browser launch are correctly closed for the loop
content = content.replace(
    /finally \{\s*console\.log\('Closing browser\.\.\.'\);\s*await browser\.close\(\);\s*\}/,
    `finally {\n        console.log('Closing browser...');\n        await browser.close();\n    }\n    } // End of locations loop`
);

// Fix potential indentation / missing braces for the replaced parts if any.
fs.writeFileSync(filePath, content);
console.log('Successfully refactored consumption_scraper.js');
