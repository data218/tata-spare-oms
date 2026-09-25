// movement_entry.js

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnOpenModal = document.getElementById('btn-open-inout-modal');
  const btnCloseModal = document.getElementById('btn-close-inout-modal');
  const modal = document.getElementById('inout-entry-modal');
  
  const btnOpenBulk = document.getElementById('btn-open-bulk-inout');
  const btnCloseBulk = document.getElementById('btn-close-bulk-modal');
  const bulkModal = document.getElementById('inout-bulk-modal');
  
  const locSelect = document.getElementById('inout-location');
  const partSelect = document.getElementById('inout-part');
  const typeSelect = document.getElementById('inout-type');
  const qtyInput = document.getElementById('inout-qty');
  const dateInput = document.getElementById('inout-date');
  const availQtySpan = document.getElementById('inout-available-qty');
  const errorMsg = document.getElementById('inout-error-msg');
  const btnSubmit = document.getElementById('btn-submit-inout');
  
  const btnDownloadTemplate = document.getElementById('btn-download-inout-template');
  const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');
  const bulkFileInput = document.getElementById('inout-bulk-file');
  const bulkError = document.getElementById('inout-bulk-error');
  const bulkSuccess = document.getElementById('inout-bulk-success');

  // Set today as default date
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  // Event Listeners for Single Entry Modal
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      populateLocations();
      modal.style.display = 'flex';
      errorMsg.style.display = 'none';
      availQtySpan.textContent = '-';
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

  // Event Listeners for Bulk Modal
  if (btnOpenBulk) {
    btnOpenBulk.addEventListener('click', () => {
      bulkModal.style.display = 'flex';
      bulkError.style.display = 'none';
      bulkSuccess.style.display = 'none';
      bulkFileInput.value = '';
    });
  }

  if (btnCloseBulk) {
    btnCloseBulk.addEventListener('click', () => {
      bulkModal.style.display = 'none';
    });
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
    
    locSelect.innerHTML = '<option value="">Select Location</option>';
    locations.forEach(loc => {
      if (loc) locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
    });
    partSelect.innerHTML = '<option value="">Select Location First</option>';
    partSelect.disabled = true;
    availQtySpan.textContent = '-';
  }

  function populateParts(location) {
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

    partSelect.innerHTML = '<option value="">Select Part Number</option>';
    parts.forEach(part => {
      partSelect.innerHTML += `<option value="${part}">${part}</option>`;
    });
    partSelect.disabled = false;
    availQtySpan.textContent = '-';
  }

  function updateAvailableQty() {
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
  }

  function submitMovement() {
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
    if (type === 'IN') {
      item.currentStock += qty;
    } else {
      item.currentStock -= qty;
    }

    // Create synthetic movement record for the Movement Table
    if (!window.consumptionData) window.consumptionData = [];
    const newRecord = {
      Date: date,
      MovementType: type,
      "Part ID": part,
      Location: loc,
      Qty: qty,
      Reference: "Manual Entry"
    };
    
    // Add to the front so it shows up at the top
    window.consumptionData.unshift(newRecord);

    // Refresh UI
    refreshAllDashboards();

    // Close and reset
    modal.style.display = 'none';
    qtyInput.value = 1;
    // Show success toast or alert
    alert(`Successfully logged ${type} for ${qty}x ${part} at ${loc}.`);
  }

  function refreshAllDashboards() {
    // Re-render inventory view
    if (typeof window.renderInventoryTable === 'function') {
      window.renderInventoryTable();
    }
    // Re-render movement view
    if (typeof window.renderMovementTable === 'function') {
      window.renderMovementTable();
    }
    // Re-render management dashboard
    if (typeof window.oldRenderDashboardAnalytics === 'function') {
      window.oldRenderDashboardAnalytics(); // The old one we renamed
    }
    if (typeof window.renderDashboardAnalytics === 'function') {
      window.renderDashboardAnalytics(); // The new one from management_dashboard.js
    }
  }

  // --- Bulk Upload Logic ---
  function downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      alert("Excel library is still loading, please try again in a moment.");
      return;
    }
    const ws_data = [
      ["Date", "MovementType", "Part ID", "Location", "Qty", "Reference"],
      ["2024-05-15", "IN", "PART-123", "Main Warehouse", 50, "PO-8823"],
      ["2024-05-16", "OUT", "PART-456", "Service Center North", 5, "WO-1099"]
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
    reader.onload = function(e) {
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
          const type = row['MovementType'] ? row['MovementType'].toString().toUpperCase() : null;
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
             bulkModal.style.display = 'none';
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
