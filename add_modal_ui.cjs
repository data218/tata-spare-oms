const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Add background to thead
html = html.replace(
    '<table id="price-list-table" class="control-tower-table" style="width: 100%; border-collapse: collapse; min-width: 1000px;">\n              <thead>',
    '<table id="price-list-table" class="control-tower-table" style="width: 100%; border-collapse: collapse; min-width: 1000px;">\n              <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">'
);

// 2. Add custom Modal HTML just before the closing </body> tag
const modalHtml = `
  <!-- Custom Edit Price Modal -->
  <div id="edit-price-modal" class="modal-overlay hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; pointer-events: none;">
    <div class="modal-content" style="background: white; border-radius: 12px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: translateY(-20px); transition: transform 0.3s ease;">
      <h3 style="margin-top: 0; color: var(--text-primary); font-size: 1.2rem; margin-bottom: 8px;">Edit NDP Price</h3>
      <p id="edit-price-part-label" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">Part: <span style="font-weight: bold; color: var(--text-primary);"></span></p>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">New NDP Price (₹)</label>
        <input type="number" id="edit-price-input" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; outline: none; transition: border-color 0.2s;" placeholder="0.00">
      </div>
      
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="edit-price-cancel" class="btn btn-outline" style="padding: 8px 16px;">Cancel</button>
        <button id="edit-price-save" class="btn btn-primary" style="padding: 8px 16px; background: #3b82f6; border: none; color: white; border-radius: 6px; cursor: pointer;">Save Changes</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="edit-price-modal"')) {
    html = html.replace('</body>', modalHtml + '\n</body>');
}

fs.writeFileSync('dashboard.html', html);
