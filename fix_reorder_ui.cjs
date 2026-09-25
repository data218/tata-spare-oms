const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');
// Find the thead above reorder-table-body
// Replace padding: 12px 16px; with padding: 8px 8px; font-size: 0.75rem;
// Actually, it's easier to use regex
const thRegex = /<th style="padding: 12px 16px;([^>]+)>(.*?)<\/th>/g;
// Wait, I only want to do it for the reorder table. Let's just do it globally for control-tower-table headers?
// It's safer to just run a replace block for the Reorder Management view.
let reorderSectionRegex = /<!-- REORDER MANAGEMENT VIEW -->[\s\S]*?id="reorder-table-body"/;
let match = dash.match(reorderSectionRegex);
if (match) {
  let section = match[0];
  section = section.replace(/padding:\s*12px\s*16px/g, 'padding: 8px 4px; font-size: 0.75rem');
  dash = dash.replace(match[0], section);
  fs.writeFileSync('dashboard.html', dash);
  console.log('dashboard.html updated');
}

let reorder = fs.readFileSync('reorder.js', 'utf8');
// Replace padding in reorder.js
reorder = reorder.replace(/padding:\s*12px\s*16px/g, 'padding: 8px 4px');
// Reduce font sizes slightly
reorder = reorder.replace(/font-size:\s*0\.85rem/g, 'font-size: 0.75rem');
reorder = reorder.replace(/font-size:\s*0\.9rem/g, 'font-size: 0.8rem');
reorder = reorder.replace(/font-size:\s*0\.75rem/g, 'font-size: 0.7rem');

// Add View function if not exists
if (!reorder.includes('window.viewReorderReason')) {
  reorder += `
window.viewReorderReason = function(btn) {
  const reason = decodeURIComponent(btn.getAttribute('data-reason'));
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = \`
    <div style="background:white;padding:24px;border-radius:8px;max-width:500px;width:90%;">
      <h3 style="margin-top:0;">Recommendation Details</h3>
      <p style="font-size:0.9rem;color:#475569;line-height:1.5;">\${reason}</p>
      <div style="text-align:right;margin-top:16px;">
        <button onclick="this.closest('div[style*=\\\\'position:fixed\\\\']').remove()" style="padding:8px 16px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
};
`;
}

// Update the View button html
reorder = reorder.replace(
  /<button class="btn btn-outline".*?>View<\/button>/g,
  `<button class="btn btn-outline" onclick="window.viewReorderReason(this)" data-reason="\${encodeURIComponent(r.reason)}" style="padding: 4px 8px; font-size: 0.7rem; color: #3b82f6; border-color: #3b82f6;">View</button>`
);

fs.writeFileSync('reorder.js', reorder);
console.log('reorder.js updated');
