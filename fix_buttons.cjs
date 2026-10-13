const fs = require('fs');

function fixButtons(filename) {
    let js = fs.readFileSync(filename, 'utf8');

    const oldButtons = `<td style="text-align: right;">
        <button class="btn btn-primary btn-edit-price" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" data-part="\${p.part_number}" data-ndp="\${p.ndp}">Edit</button>
        <button class="btn btn-remove-price" style="padding: 4px 8px; font-size: 12px; background-color: #ef4444; color: white;" data-part="\${p.part_number}">Remove</button>
      </td>`;
      
    const newButtons = `<td style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn-edit-price" style="padding: 6px 12px; font-size: 0.75rem; font-weight: 500; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'" data-part="\${p.part_number}" data-ndp="\${p.ndp}">Edit</button>
        <button class="btn-remove-price" style="padding: 6px 12px; font-size: 0.75rem; font-weight: 500; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#dc2626'" onmouseout="this.style.backgroundColor='#ef4444'" data-part="\${p.part_number}">Remove</button>
      </td>`;

    if (js.includes('<button class="btn btn-primary btn-edit-price"')) {
        js = js.replace(oldButtons, newButtons);
    }
    
    // While here, ensure markFilterHeaders is called when loading dashboard data for price list
    const markFiltersOld = `if (typeof window.filterReorderData === 'function') window.filterReorderData();`;
    const markFiltersNew = `if (typeof window.filterReorderData === 'function') window.filterReorderData();
    if (typeof window.markFilterHeaders === 'function') window.markFilterHeaders();`;
    
    if (js.includes(markFiltersOld) && !js.includes(markFiltersNew)) {
        // Wait, markFilterHeaders should be called when table structure is built.
        // It's usually called by `initDashboardData()` or similar. Let's see if we can just call it in renderPriceList.
    }
    
    // Add markFilterHeaders call inside renderPriceList (first time it renders)
    if (!js.includes('window.markFilterHeaders()')) {
        js = js.replace('tbody.innerHTML = html;', 'tbody.innerHTML = html;\n  if (page === 0 && typeof window.markFilterHeaders === \'function\') window.markFilterHeaders();');
    }

    fs.writeFileSync(filename, js);
}

fixButtons('main.js');
fixButtons('main_debug.js');
