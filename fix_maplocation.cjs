const fs = require('fs');

function fixFile(filename) {
    let s = fs.readFileSync(filename, 'utf8');
    
    // Fix mapLocation
    const oldMap = `const d = dealerName.toLowerCase();`;
    const newMap = `const d = dealerName.toLowerCase().replace(/\\s+/g, '');`;
    s = s.replace(oldMap, newMap);
    
    if (filename === 'main.js') {
        // Fix precedence in inventory.forEach
        const oldPrecedence = `const loc = row.location_1 || row.division || 'Narwal';`;
        const newPrecedence = `const loc = row.division || row.location_1 || 'Narwal';`;
        s = s.replace(oldPrecedence, newPrecedence);
        
        // Let's also check if the same precedence is elsewhere
        const oldPrecedence2 = `const loc = row.location_1 || row.division || row.dealer_name || 'Narwal';`;
        const newPrecedence2 = `const loc = row.division || row.location_1 || row.dealer_name || 'Narwal';`;
        s = s.replace(oldPrecedence2, newPrecedence2);
    }
    
    fs.writeFileSync(filename, s);
    console.log(`${filename} updated.`);
}

fixFile('main.js');
fixFile('movement.js');
