const fs = require('fs');

function applyFixes(filename) {
    let js = fs.readFileSync(filename, 'utf8');

    // 1. Add price-list-body to tableFilterConfigs
    if (!js.includes("'price-list-body': {")) {
        const target = `const tableFilterConfigs = {`;
        const inject = `const tableFilterConfigs = {
  'price-list-body': {
    getRows: () => window.masterPriceList || [],
    fields: {
      'Part Number': 'part_number',
      'Description': 'description',
      'Category': 'category',
      'NDP (₹)': 'ndp'
    },
    formatters: {
      ndp: (r) => Number(r.ndp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
    },
    render: (rows) => {
      // Re-apply search filter if any
      const searchVal = (document.getElementById('price-list-search')?.value || '').toLowerCase();
      if (searchVal) {
        filteredPriceList = rows.filter(p => 
          (p.part_number && p.part_number.toLowerCase().includes(searchVal)) || 
          (p.description && p.description.toLowerCase().includes(searchVal)) ||
          (p.category && p.category.toLowerCase().includes(searchVal))
        );
      } else {
        filteredPriceList = rows;
      }
      currentPriceListPage = 0;
      // We need to bypass the 'page === 0' search reset in renderPriceList, 
      // so we call a slightly modified inner logic or just reset search input?
      // Better: override filteredPriceList and call renderPriceList, BUT renderPriceList(0) resets filteredPriceList if we don't change it.
      // Wait, renderPriceList(0) re-reads from window.masterPriceList! 
    }
  },`;
        js = js.replace(target, inject);
    }
    
    // We need to modify renderPriceList to use a global filtered source if filters are active.
    // Let's modify renderPriceList to check window.tableFilterData['price-list-body']
    const renderTargetOld = `if (page === 0) {
    const searchVal = (document.getElementById('price-list-search')?.value || '').toLowerCase();
    let sourceData = window.masterPriceList || [];
    
    if (searchVal) {`;
    
    const renderTargetNew = `if (page === 0) {
    const searchVal = (document.getElementById('price-list-search')?.value || '').toLowerCase();
    // Use column-filtered data if available, else master
    let sourceData = (window.tableFilterData && window.tableFilterData['price-list-body']) ? window.tableFilterData['price-list-body'] : (window.masterPriceList || []);
    
    if (searchVal) {`;
    
    if (js.includes(renderTargetOld)) {
        js = js.replace(renderTargetOld, renderTargetNew);
    }
    
    // Update the config render to populate tableFilterData and call renderPriceList
    if (js.includes('// Better: override filteredPriceList')) {
       js = js.replace(
         `// Better: override filteredPriceList and call renderPriceList, BUT renderPriceList(0) resets filteredPriceList if we don't change it.\n      // Wait, renderPriceList(0) re-reads from window.masterPriceList! `,
         `if (!window.tableFilterData) window.tableFilterData = {};\n      window.tableFilterData['price-list-body'] = rows;\n      renderPriceList(0);`
       );
    }
    
    // 2. Add Modal wiring for Edit Price
    const promptTarget = `const newNdpStr = prompt(\`Enter new NDP for part \${partNo}:\`, oldNdp);
      
      if (newNdpStr !== null && newNdpStr.trim() !== '') {
        const newNdp = parseFloat(newNdpStr);
        if (isNaN(newNdp)) {
           alert('Invalid number');
           return;
        }
        
        try {
          const { error } = await supabase.from('tata_price_list').update({ ndp: newNdp }).eq('part_number', partNo);
          if (error) throw error;
          
          // Update local data
          const idx = window.masterPriceList.findIndex(p => p.part_number === partNo);
          if (idx > -1) window.masterPriceList[idx].ndp = newNdp;
          
          alert(\`NDP for \${partNo} successfully updated to ₹\${newNdp}\`);
          
          // Trigger a silent reload of dashboard logic if necessary
          if (typeof loadDashboardData === 'function') loadDashboardData(true);
          else renderPriceList(0); // At least refresh the list
          
        } catch (err) {
          alert('Error updating: ' + err.message);
        }
      }`;

    const modalLogic = `
      const modal = document.getElementById('edit-price-modal');
      const input = document.getElementById('edit-price-input');
      const label = document.getElementById('edit-price-part-label').querySelector('span');
      const cancelBtn = document.getElementById('edit-price-cancel');
      const saveBtn = document.getElementById('edit-price-save');
      
      if (modal && input && label && cancelBtn && saveBtn) {
        label.textContent = partNo;
        input.value = oldNdp;
        
        // Show modal
        modal.classList.remove('hidden');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        
        const closeModal = () => {
          modal.style.opacity = '0';
          modal.style.pointerEvents = 'none';
          modal.querySelector('.modal-content').style.transform = 'translateY(-20px)';
          setTimeout(() => modal.classList.add('hidden'), 300);
          
          cancelBtn.onclick = null;
          saveBtn.onclick = null;
        };
        
        cancelBtn.onclick = closeModal;
        
        saveBtn.onclick = async () => {
          const newNdpStr = input.value;
          if (newNdpStr !== null && newNdpStr.trim() !== '') {
            const newNdp = parseFloat(newNdpStr);
            if (isNaN(newNdp)) {
               alert('Invalid number');
               return;
            }
            
            // Show loading state on button
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
            
            try {
              const { error } = await supabase.from('tata_price_list').update({ ndp: newNdp }).eq('part_number', partNo);
              if (error) throw error;
              
              // Update local data
              const idx = window.masterPriceList.findIndex(p => p.part_number === partNo);
              if (idx > -1) window.masterPriceList[idx].ndp = newNdp;
              
              // If filtered view is active, update it there too
              if (window.tableFilterData && window.tableFilterData['price-list-body']) {
                 const fIdx = window.tableFilterData['price-list-body'].findIndex(p => p.part_number === partNo);
                 if (fIdx > -1) window.tableFilterData['price-list-body'][fIdx].ndp = newNdp;
              }
              
              // Trigger a silent reload of dashboard logic if necessary
              if (typeof loadDashboardData === 'function') loadDashboardData(true);
              else renderPriceList(currentPriceListPage);
              
              closeModal();
              
            } catch (err) {
              alert('Error updating: ' + err.message);
            } finally {
              saveBtn.textContent = originalText;
              saveBtn.disabled = false;
            }
          }
        };
      }`;
      
    if (js.includes(promptTarget)) {
        js = js.replace(promptTarget, modalLogic);
    }

    fs.writeFileSync(filename, js);
}

applyFixes('main.js');
applyFixes('main_debug.js');
