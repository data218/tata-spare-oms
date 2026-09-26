const fs = require('fs');
let js = fs.readFileSync('movement_entry.js', 'utf8');

// Replace the old event listener logic at the top
const newTop = `document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnOpenModal = document.getElementById('btn-open-inout-modal');
  const btnCloseModal = document.getElementById('btn-close-inout-modal');
  const modal = document.getElementById('inout-entry-modal');
  
  // Tabs
  const tabSingle = document.getElementById('tab-single-entry');
  const tabBulk = document.getElementById('tab-bulk-upload');
  const secSingle = document.getElementById('inout-single-section');
  const secBulk = document.getElementById('inout-bulk-section');
  
  // Single Entry Elements
  const locSelect = document.getElementById('inout-location');
  const partSelect = document.getElementById('inout-part');
  const typeSelect = document.getElementById('inout-type');
  const qtyInput = document.getElementById('inout-qty');
  const dateInput = document.getElementById('inout-date');
  const availQtySpan = document.getElementById('inout-available-qty');
  const errorMsg = document.getElementById('inout-error-msg');
  const btnSubmit = document.getElementById('btn-submit-inout');
  
  // Bulk Upload Elements
  const btnDownloadTemplate = document.getElementById('btn-download-inout-template');
  const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');
  const bulkFileInput = document.getElementById('inout-bulk-file');
  const bulkError = document.getElementById('inout-bulk-error');
  const bulkSuccess = document.getElementById('inout-bulk-success');

  // Set today as default date
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  // Tab switching logic
  if (tabSingle && tabBulk) {
    tabSingle.addEventListener('click', () => {
      secSingle.style.display = 'grid';
      secBulk.style.display = 'none';
      tabSingle.style.borderBottom = '2px solid #3b82f6';
      tabSingle.style.color = '#3b82f6';
      tabBulk.style.borderBottom = '2px solid transparent';
      tabBulk.style.color = '#64748b';
    });
    
    tabBulk.addEventListener('click', () => {
      secSingle.style.display = 'none';
      secBulk.style.display = 'block';
      tabBulk.style.borderBottom = '2px solid #3b82f6';
      tabBulk.style.color = '#3b82f6';
      tabSingle.style.borderBottom = '2px solid transparent';
      tabSingle.style.color = '#64748b';
    });
  }

  // Event Listeners for Modal
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      populateLocations();
      modal.style.display = 'flex';
      errorMsg.style.display = 'none';
      bulkError.style.display = 'none';
      bulkSuccess.style.display = 'none';
      availQtySpan.textContent = '-';
      if (tabSingle) tabSingle.click(); // Reset to single tab
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  if (locSelect) {
    locSelect.addEventListener('change', () => {
      populateParts(locSelect.value);
    });
  }

  if (partSelect) {
    partSelect.addEventListener('change', () => {
      updateAvailableQty();
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', submitMovement);
  }

  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', downloadTemplate);
  }

  if (btnSubmitBulk) {
    btnSubmitBulk.addEventListener('click', processBulkUpload);
  }

  // --- Core Functions ---`;

const coreFunctionsStart = js.indexOf('  // --- Core Functions ---');
if (coreFunctionsStart > -1) {
  js = newTop + js.substring(coreFunctionsStart + 27);
  
  // also fix the timeout closing bulkModal -> modal
  js = js.replace("bulkModal.style.display = 'none';", "modal.style.display = 'none';");
  
  fs.writeFileSync('movement_entry.js', js);
  console.log('Updated movement_entry.js');
} else {
  console.log('Could not find core functions marker');
}
