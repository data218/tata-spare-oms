const fs = require('fs');
let reorder = fs.readFileSync('reorder.js', 'utf8');

// Replace the View button
reorder = reorder.replace(
  /<button class="btn btn-outline" onclick="window\.viewReorderReason\(this\)" data-reason="\$\{encodeURIComponent\(r\.reason\)\}" style="padding: 4px 8px; font-size: 0\.7rem; color: #3b82f6; border-color: #3b82f6;">View<\/button>/g,
  `<button class="btn btn-outline" onclick="window.viewReorderReason(this)" data-reason="\${encodeURIComponent(r.reason)}" data-part="\${r.partNo}" data-desc="\${encodeURIComponent(r.description)}" data-loc="\${r.location}" style="padding: 4px 8px; font-size: 0.7rem; color: #3b82f6; border-color: #3b82f6;">View</button>`
);

// Replace the viewReorderReason function
const newFunc = `window.viewReorderReason = function(btn) {
  const reason = decodeURIComponent(btn.getAttribute('data-reason'));
  const partNo = btn.getAttribute('data-part') || 'Unknown Part';
  const desc = decodeURIComponent(btn.getAttribute('data-desc') || '');
  const loc = btn.getAttribute('data-loc') || 'Unknown Location';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = \`
    <div style="background:white;padding:24px;border-radius:10px;max-width:500px;width:90%; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
      <button onclick="this.closest('div[style*=\\\\'position:fixed\\\\']').remove()" style="position:absolute;top:16px;right:16px;background:var(--card-bg);border:1px solid #e2e8f0;border-radius:50%;width:28px;height:28px;font-size:1.2rem;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">&times;</button>
      <h3 style="margin-top:0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; color: #0f172a; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        Recommendation Details
      </h3>
      <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
        <div style="font-weight: 700; font-size: 1.1rem; color: #0f172a;">\${partNo}</div>
        <div style="font-size: 0.9rem; color: #475569; margin-top: 2px;">\${desc}</div>
        <div style="font-size: 0.85rem; color: #64748b; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          \${loc}
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Reasoning</div>
        <p style="font-size:0.95rem;color:#334155;line-height:1.6;margin:0;">\${reason}</p>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
};`;

reorder = reorder.replace(/window\.viewReorderReason = function\(btn\) \{[\s\S]*?\n\};/m, newFunc);
fs.writeFileSync('reorder.js', reorder);
console.log('reorder.js updated');
