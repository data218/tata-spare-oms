const fs = require('fs');
let js = fs.readFileSync('movement_entry.js', 'utf8');

// 1. Add elements
js = js.replace("const partSelect = document.getElementById('inout-part');", 
`const partSelect = document.getElementById('inout-part');
  const partList = document.getElementById('part-list');
  const partNameInput = document.getElementById('inout-part-name');`);

// 2. Update populateLocations
js = js.replace(`partSelect.innerHTML = '<option value="">Select Location First</option>';
    partSelect.disabled = true;
    availQtySpan.textContent = '-';`,
    `partSelect.value = '';
    partSelect.placeholder = 'Select Location First';
    partSelect.disabled = true;
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';`);

// 3. Update populateParts
js = js.replace(`function populateParts(location) {
    if (!location) {
      partSelect.innerHTML = '<option value="">Select Location First</option>';
      partSelect.disabled = true;
      availQtySpan.textContent = '-';
      return;
    }

    const parts = window.originalProcessedParts
      .filter(p => p.location === location)
      .map(p => p.partId)
      .sort();

    let htmlStr = '<option value="">Select Part Number</option>';
    parts.forEach(part => {
      htmlStr += \`<option value="\${part}">\${part}</option>\`;
    });
    partSelect.innerHTML = htmlStr;
    
    partSelect.disabled = false;
    availQtySpan.textContent = '-';
  }`, 
  `function populateParts(location) {
    if (!location) {
      partSelect.value = '';
      partSelect.placeholder = 'Select Location First';
      partSelect.disabled = true;
      if (partNameInput) partNameInput.value = '';
      availQtySpan.textContent = '-';
      return;
    }

    const parts = window.originalProcessedParts
      .filter(p => p.location === location)
      .map(p => p.partId)
      .sort();

    let htmlStr = '';
    parts.forEach(part => {
      htmlStr += \`<option value="\${part}">\`;
    });
    
    if (partList) partList.innerHTML = htmlStr;
    
    partSelect.value = '';
    partSelect.placeholder = 'Type to search...';
    partSelect.disabled = false;
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
  }`);
  
// 4. Update updateAvailableQty
js = js.replace(`function updateAvailableQty() {
    const loc = locSelect.value;
    const part = partSelect.value;
    if (!loc || !part) {
      availQtySpan.textContent = '-';
      return;
    }

    const item = window.originalProcessedParts.find(p => p.location === loc && p.partId === part);
    if (item) {
      availQtySpan.textContent = item.currentStock;
    } else {
      availQtySpan.textContent = '0';
    }
  }`,
  `function updateAvailableQty() {
    const loc = locSelect.value;
    const part = partSelect.value;
    if (!loc || !part) {
      availQtySpan.textContent = '-';
      if (partNameInput) partNameInput.value = '';
      return;
    }

    const item = window.originalProcessedParts.find(p => p.location === loc && p.partId === part);
    if (item) {
      availQtySpan.textContent = item.currentStock;
      if (partNameInput) partNameInput.value = item.description || 'N/A';
    } else {
      availQtySpan.textContent = '0';
      if (partNameInput) partNameInput.value = '';
    }
  }`);
  
// 5. Change event listener from 'change' to 'input' for partSelect
js = js.replace(`if (partSelect) {
    partSelect.addEventListener('change', () => {
      updateAvailableQty();
    });
  }`, 
  `if (partSelect) {
    partSelect.addEventListener('input', () => {
      updateAvailableQty();
    });
  }`);
  
// 6. Fix submission modal closing reset
js = js.replace(`modal.style.display = 'none';
    qtyInput.value = 1;`, 
    `modal.style.display = 'none';
    qtyInput.value = 1;
    partSelect.value = '';
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';`);

fs.writeFileSync('movement_entry.js', js);
console.log('updated');
