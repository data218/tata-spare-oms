const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// We will add a small text to the "last-updated-text" to show movement logs count
const target = `  const updatedEl = document.getElementById('last-updated-text');
  if (updatedEl && rawInventoryData.inventory && rawInventoryData.inventory.length > 0) {
    // Grab the updated_at from the first row (they should all be similar from the bulk insert)
    const latestDateStr = rawInventoryData.inventory[0].updated_at || rawInventoryData.inventory[0].fetched_at;
    if (latestDateStr) {
      updatedEl.textContent = formatBeautifulDate(latestDateStr);
    } else {
      updatedEl.textContent = 'Unknown';
    }
  } else if (updatedEl) {
    updatedEl.textContent = 'No data available';
  }`;

const replacement = `  const updatedEl = document.getElementById('last-updated-text');
  if (updatedEl && rawInventoryData.inventory && rawInventoryData.inventory.length > 0) {
    const latestDateStr = rawInventoryData.inventory[0].updated_at || rawInventoryData.inventory[0].fetched_at;
    if (latestDateStr) {
      updatedEl.textContent = formatBeautifulDate(latestDateStr) + ' | Logs: ' + (rawInventoryData.movementLogs ? rawInventoryData.movementLogs.length : 0);
    } else {
      updatedEl.textContent = 'Unknown';
    }
  } else if (updatedEl) {
    updatedEl.textContent = 'No data available';
  }`;

s = s.replace(target, replacement);
fs.writeFileSync('main.js', s);
console.log('main.js updated with UI debug.');
