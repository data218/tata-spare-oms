import { supabase } from './supabase.js';
document.addEventListener('DOMContentLoaded', () => {
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
  const partList = document.getElementById('part-list');
  const partNameInput = document.getElementById('inout-part-name');
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
    partSelect.addEventListener('input', () => {
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

  // --- Core Functions ---

  function populateLocations() {
    if (!window.originalProcessedParts) return;
    const locations = [...new Set(window.originalProcessedParts.map(p => p.location))].sort();
    
    let htmlStr = '<option value="">Select Location</option>';
    locations.forEach(loc => {
      if (loc) htmlStr += `<option value="${loc}">${loc}</option>`;
    });
    locSelect.innerHTML = htmlStr;
    
    partSelect.value = '';
    partSelect.placeholder = 'Select Location First';
    partSelect.disabled = true;
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
  }

  function populateParts(location) {
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
      htmlStr += `<option value="${part}">`;
    });
    
    if (partList) partList.innerHTML = htmlStr;
    
    partSelect.value = '';
    partSelect.placeholder = 'Type to search...';
    partSelect.disabled = false;
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
  }

  function updateAvailableQty() {
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
      if (partNameInput) partNameInput.value = item.model || 'N/A';
    } else {
      availQtySpan.textContent = '0';
      if (partNameInput) partNameInput.value = '';
    }
  }

  async function submitMovement() {
    const loc = locSelect.value;
    const part = partSelect.value;
    const type = typeSelect.value;
    const qty = parseInt(qtyInput.value, 10);
    const date = dateInput.value;

    errorMsg.style.display = 'none';

    if (!loc || !part || !qty || isNaN(qty) || qty <= 0) {
      errorMsg.textContent = 'Please fill all fields with valid data.';
      errorMsg.style.display = 'block';
      return;
    }

    const item = window.originalProcessedParts.find(p => p.location === loc && p.partId === part);
    if (!item) {
      errorMsg.textContent = 'Part not found in this location.';
      errorMsg.style.display = 'block';
      return;
    }

    if (type === 'OUT' && qty > item.currentStock) {
      errorMsg.textContent = `Insufficient stock! Available qty is ${item.currentStock}.`;
      errorMsg.style.display = 'block';
      return;
    }

    // Execute logic
    const oldStock = item.currentStock;
    if (type === 'IN') {
      item.currentStock += qty;
    } else {
      item.currentStock -= qty;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Saving...';
    
    try {
      // 1. Update inventory
      const { error: invErr } = await supabase
        .from('tata_spare_inventory')
        .update({ qty: item.currentStock })
        .eq('part_no', part)
        .eq('division', loc);
      if (invErr) throw invErr;

      // 2. Insert into movement_logs
      const { error: movErr } = await supabase
        .from('tata_movement_logs')
        .insert({
          part_id: part,
          location: loc,
          movement_type: type,
          qty: qty,
          reference: "Manual Entry"
        });
      if (movErr) throw movErr;
    } catch (e) {
      console.error(e);
      errorMsg.textContent = 'Failed to save to database: ' + e.message;
      errorMsg.style.display = 'block';
      item.currentStock = oldStock; // Revert local
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit Movement';
      return;
    }
    
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Movement';

    // Create synthetic movement record for the UI temporarily so it shows up instantly
    if (!window.consumptionData) window.consumptionData = [];
    const newRecord = {
      Date: date,
      MovementType: type,
      "Part ID": part,
      Location: loc,
      Qty: qty,
      Reference: "Manual Entry"
    };
    window.consumptionData.unshift(newRecord);

    // Refresh UI
    refreshAllDashboards();

    // Close and reset
    modal.style.display = 'none';
    qtyInput.value = 1;
    partSelect.value = '';
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
    
    // Show success toast or alert after giving browser time to hide the modal
    setTimeout(() => {
      alert(`Successfully logged ${type} for ${qty}x ${part} at ${loc}.`);
    }, 50);
  }

  function refreshAllDashboards() {
    // Re-render inventory view
    if (typeof window.renderInventoryTable === 'function') {
      try { window.renderInventoryTable(); } catch(e) { console.warn(e); }
    }
    // Re-render movement view
    if (typeof window.renderMovementTable === 'function') {
      try { window.renderMovementTable(); } catch(e) { console.warn(e); }
    }
    // Re-render management dashboard
    if (typeof window.oldRenderDashboardAnalytics === 'function') {
      try { window.oldRenderDashboardAnalytics(); } catch(e) { console.warn(e); }
    }
    if (typeof window.renderDashboardAnalytics === 'function') {
      try { window.renderDashboardAnalytics(); } catch(e) { console.warn(e); }
    }
  }

  // --- Bulk Upload Logic ---
  function downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      alert("Excel library is still loading, please try again in a moment.");
      return;
    }
    let samplePart1 = "PART-123";
    let sampleLoc1 = "Main Warehouse";
    let samplePart2 = "PART-456";
    let sampleLoc2 = "Service Center North";

    // Try to get real examples from the system data
    if (window.originalProcessedParts && window.originalProcessedParts.length > 1) {
      samplePart1 = window.originalProcessedParts[0].partId;
      sampleLoc1 = window.originalProcessedParts[0].location;
      samplePart2 = window.originalProcessedParts[1].partId;
      sampleLoc2 = window.originalProcessedParts[1].location;
    }

    const ws_data = [
      ["Date", "Movement", "Part ID", "Location", "Qty", "Reference"],
      ["2024-05-15", "IN", samplePart1, sampleLoc1, 50, "PO-8823"],
      ["2024-05-16", "OUT", samplePart2, sampleLoc2, 5, "WO-1099"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movements");
    XLSX.writeFile(wb, "IN_OUT_Template.xlsx");
  }

  function processBulkUpload() {
    if (typeof XLSX === 'undefined') {
      bulkError.textContent = "Excel library not loaded.";
      bulkError.style.display = 'block';
      return;
    }

    const file = bulkFileInput.files[0];
    if (!file) {
      bulkError.textContent = "Please select a file first.";
      bulkError.style.display = 'block';
      return;
    }

    bulkError.style.display = 'none';
    bulkSuccess.style.display = 'none';

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        rows.forEach((row, index) => {
          const date = row['Date'] || new Date().toISOString().split('T')[0];
          const type = row['Movement'] ? row['Movement'].toString().toUpperCase() : null;
          const part = row['Part ID'];
          const loc = row['Location'];
          const qty = parseInt(row['Qty'], 10);
          const ref = row['Reference'] || "Bulk Upload";

          if (!type || !part || !loc || isNaN(qty) || qty <= 0) {
            errorCount++;
            errors.push(`Row ${index + 2}: Missing or invalid data.`);
            return;
          }

          if (type !== 'IN' && type !== 'OUT') {
            errorCount++;
            errors.push(`Row ${index + 2}: MovementType must be IN or OUT.`);
            return;
          }

          const item = window.originalProcessedParts.find(p => p.location === loc && p.partId === part);
          if (!item) {
            errorCount++;
            errors.push(`Row ${index + 2}: Part ${part} not found in ${loc}.`);
            return;
          }

          if (type === 'OUT' && qty > item.currentStock) {
            errorCount++;
            errors.push(`Row ${index + 2}: Insufficient stock for ${part} in ${loc}. Required: ${qty}, Available: ${item.currentStock}.`);
            return;
          }

          // Process success
          if (type === 'IN') {
            item.currentStock += qty;
          } else {
            item.currentStock -= qty;
          }

          if (!window.consumptionData) window.consumptionData = [];
          window.consumptionData.unshift({
            Date: date,
            MovementType: type,
            "Part ID": part,
            Location: loc,
            Qty: qty,
            Reference: ref
          });

          successCount++;
        });

        refreshAllDashboards();

        if (errorCount === 0) {
           bulkSuccess.textContent = `Successfully processed ${successCount} movements!`;
           bulkSuccess.style.display = 'block';
           setTimeout(() => {
             modal.style.display = 'none';
           }, 2000);
        } else {
           bulkError.innerHTML = `Processed ${successCount} movements. Failed on ${errorCount} rows:<br>` + errors.join('<br>');
           bulkError.style.display = 'block';
        }

      } catch (err) {
        bulkError.textContent = "Error parsing file: " + err.message;
        bulkError.style.display = 'block';
      }
    };
    reader.readAsArrayBuffer(file);
  }
});
