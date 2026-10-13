const fs = require('fs');

function applyFixes(filename) {
    let js = fs.readFileSync(filename, 'utf8');

    // Fix multiple event listeners for pagination
    const oldPrev = `  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
       if (currentPriceListPage > 0) {
          currentPriceListPage--;
          renderPriceList(currentPriceListPage);
       }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
       const totalPages = Math.ceil(filteredPriceList.length / PRICE_LIST_PAGE_SIZE);
       if (currentPriceListPage < totalPages - 1) {
          currentPriceListPage++;
          renderPriceList(currentPriceListPage);
       }
    });
  }`;
  
    const newPrev = `  if (prevBtn) {
    prevBtn.onclick = () => {
       if (currentPriceListPage > 0) {
          currentPriceListPage--;
          renderPriceList(currentPriceListPage);
       }
    };
  }
  
  if (nextBtn) {
    nextBtn.onclick = () => {
       const totalPages = Math.ceil(filteredPriceList.length / PRICE_LIST_PAGE_SIZE);
       if (currentPriceListPage < totalPages - 1) {
          currentPriceListPage++;
          renderPriceList(currentPriceListPage);
       }
    };
  }`;
  
    if (js.includes(oldPrev)) {
        js = js.replace(oldPrev, newPrev);
    }
    
    // Also disable next/prev buttons if on first/last page
    const pageInfoOld = `const totalPages = Math.max(1, Math.ceil(filteredPriceList.length / PRICE_LIST_PAGE_SIZE));
     pageInfo.textContent = \`Page \${page + 1} of \${totalPages}\`;`;
     
    const pageInfoNew = `const totalPages = Math.max(1, Math.ceil(filteredPriceList.length / PRICE_LIST_PAGE_SIZE));
     pageInfo.textContent = \`Page \${page + 1} of \${totalPages}\`;
     
     if (document.getElementById('price-prev-btn')) {
         document.getElementById('price-prev-btn').disabled = (page === 0);
         document.getElementById('price-prev-btn').style.opacity = (page === 0) ? '0.5' : '1';
     }
     if (document.getElementById('price-next-btn')) {
         document.getElementById('price-next-btn').disabled = (page >= totalPages - 1);
         document.getElementById('price-next-btn').style.opacity = (page >= totalPages - 1) ? '0.5' : '1';
     }`;
     
    if (js.includes(pageInfoOld)) {
        js = js.replace(pageInfoOld, pageInfoNew);
    }

    fs.writeFileSync(filename, js);
}

applyFixes('main.js');
applyFixes('main_debug.js');
