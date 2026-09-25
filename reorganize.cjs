const fs = require('fs');

const html = fs.readFileSync('dashboard.html', 'utf8');

// We need to extract the cards by searching for their headers.
function getCard(headerText, startSearchIndex = 0) {
    const headerRegex = new RegExp(`<h3[^>]*>.*?${headerText}.*?</h3>`, 's');
    const headerMatch = html.substring(startSearchIndex).match(headerRegex);
    if (!headerMatch) return null;
    
    const startIndex = html.lastIndexOf('<div class="settings-card"', startSearchIndex + headerMatch.index);
    
    // Find the matching end div for settings-card
    let depth = 0;
    let endIndex = startIndex;
    const tagRegex = /<(\/)?div[^>]*>/ig;
    tagRegex.lastIndex = startIndex;
    
    while (true) {
        const match = tagRegex.exec(html);
        if (!match) break;
        if (match[1]) {
            depth--;
        } else {
            depth++;
        }
        if (depth === 0) {
            endIndex = match.index + match[0].length;
            break;
        }
    }
    
    return {
        content: html.substring(startIndex, endIndex),
        startIndex,
        endIndex
    };
}

const cards = {
    claimsUpload: getCard('Upload Claims Data'),
    tataBi: getCard('Tata BI Portal Credentials'),
    dealerships: getCard('Dealership Locations'),
    fetchLive: getCard('Fetch Live Data'),
    priceList: getCard('Price List Management'),
    calculations: getCard('Dashboard Calculations'),
    inventoryUpload: getCard('Inventory Manual Upload'),
    consumptionUpload: getCard('Consumption Manual Upload'),
    userManagement: getCard('Dashboard User Management')
};

// Check if all cards were found
for (const [key, card] of Object.entries(cards)) {
    if (!card) {
        console.error(`Could not find card: ${key}`);
        process.exit(1);
    }
}

// Find the grid container
const gridStartStr = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px; align-items: start;">`;
const gridStartIndex = html.indexOf(gridStartStr);
if (gridStartIndex === -1) {
    console.error("Could not find grid start");
    process.exit(1);
}

// Find grid end (which is just before </div> <!-- End of view-settings -->)
const gridEndStr = `</div> <!-- End of view-settings -->`;
const gridEndIndex = html.indexOf(gridEndStr);
// Let's go backwards to find the exact end of the grid.
const viewSettingsContent = html.substring(gridStartIndex, gridEndIndex);

const newGrid = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; align-items: start;">
              
              <!-- Column 1: Data Management -->
              <div>
                <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="database" style="color: #3b82f6;"></i> Data Management
                </h3>
                
${cards.claimsUpload.content}
${cards.inventoryUpload.content}
${cards.consumptionUpload.content}
${cards.priceList.content}
              </div>

              <!-- Column 2: System Configuration -->
              <div>
                <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="settings" style="color: #f59e0b;"></i> System Configuration
                </h3>
                
${cards.tataBi.content}
${cards.dealerships.content}
${cards.fetchLive.content}
${cards.calculations.content}
              </div>

              <!-- Column 3: Access Control -->
              <div>
                <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="shield-check" style="color: #10b981;"></i> Security & Access
                </h3>
                
${cards.userManagement.content}
              </div>
              
            </div>`;

// Replace from gridStartIndex to the end of Column 2
// The end of Column 2 is marked by `</div> <!-- End of Column 2 -->`
const col2EndStr = `</div> <!-- End of Column 2 -->`;
const col2EndIndex = html.indexOf(col2EndStr, gridStartIndex) + col2EndStr.length;

let newHtml = html.substring(0, gridStartIndex) + newGrid + html.substring(col2EndIndex);

fs.writeFileSync('dashboard.html', newHtml, 'utf8');
console.log("Successfully reorganized settings!");
