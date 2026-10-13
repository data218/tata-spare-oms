const fs = require('fs');

function addPagination(filename) {
    let js = fs.readFileSync(filename, 'utf8');

    // Make sure we always clear the table on any page load (for Prev/Next)
    js = js.replace('if (page === 0) tbody.innerHTML = \'\';', 'tbody.innerHTML = \'\';');
    
    // Replace the append logic with simple replacement for all pages
    const replaceTarget = `if (page === 0) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }`;
        
    const newTarget = `tbody.innerHTML = html;
  
  const pageInfo = document.getElementById('price-page-info');
  if (pageInfo) {
     const totalPages = Math.max(1, Math.ceil(filteredPriceList.length / PRICE_LIST_PAGE_SIZE));
     pageInfo.textContent = \`Page \${page + 1} of \${totalPages}\`;
  }`;

    js = js.replace(replaceTarget, newTarget);
    
    // Add pagination button listeners at the bottom of the file where search setup is
    if (!js.includes('document.getElementById(\\\'price-prev-btn\\\')')) {
        const listenerTarget = `  const searchInput = document.getElementById('price-list-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPriceListPage = 0;
      renderPriceList(0);
    });
  }`;
  
        const newListeners = `  const searchInput = document.getElementById('price-list-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPriceListPage = 0;
      renderPriceList(0);
    });
  }
  
  const prevBtn = document.getElementById('price-prev-btn');
  const nextBtn = document.getElementById('price-next-btn');
  
  if (prevBtn) {
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
  
        js = js.replace(listenerTarget, newListeners);
    }

    fs.writeFileSync(filename, js);
}

addPagination('main.js');
addPagination('main_debug.js');
