// These helpers run inside the portal page via Puppeteer evaluate().
export function inventoryReportReady() {
  const expected = 'TM Spares Parts Inventory Export View - MIS Spares';
  const active = window.SiebelApp?.S_App?.GetActiveView?.()?.GetName?.();
  if (active && active !== expected) return false;
  const text = document.body?.innerText || '';
  return /Part\s*#/.test(text) && /Description/.test(text) && /\bQty\b/.test(text)
    && /Inventory Location/.test(text) && /Availability/.test(text);
}

export function clickInventoryViewLink() {
  const expected = 'TM Spares Parts Inventory Export View - MIS Spares';
  for (const link of document.querySelectorAll('a[onclick]')) {
    const action = link.getAttribute('onclick') || '';
    const match = /[?&]SWEView=([^&"']+)/.exec(action);
    if (!match) continue;
    let view;
    try { view = decodeURIComponent(match[1].replace(/\+/g, ' ')); } catch { continue; }
    if (view !== expected) continue;
    link.click();
    return true;
  }
  return false;
}

export function clickMisSparesScreen() {
  const link = [...document.querySelectorAll('a[onclick]')].find(link =>
    link.textContent.trim() === 'MIS - Spares' && /SWECmd=GotoPageTab/.test(link.getAttribute('onclick') || ''));
  if (!link) return false;
  link.click();
  return true;
}

export function clickInventoryTab() {
  const link = [...document.querySelectorAll('a')].find(link =>
    link.textContent.trim() === 'Spares Inventory' && link.getClientRects().length);
  if (!link) return false;
  link.click();
  return true;
}

export function clickInventoryControl(action) {
  for (const control of document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]')) {
    if (control.disabled || control.getAttribute('aria-disabled') === 'true' || !control.getClientRects().length) continue;
    const title = control.getAttribute('title') || '';
    // Siebel prefixes control titles with their applet. Never export receipts
    // or consumption just because they also have a Download to Excel button.
    if (!/^(?:Inventory Level|Spares Inventory|Spare Part Browser)\s*:/i.test(title)) continue;
    const label = (title.slice(title.indexOf(':') + 1)).trim();
    if (label.toLowerCase() !== action.toLowerCase()) continue;
    control.click();
    return true;
  }
  return false;
}

export function startInventoryExport() {
  const next = [...document.querySelectorAll('button, input[type="button"], input[type="submit"]')]
    .find(control => control.title === 'Export:Next' && !control.disabled
      && control.getAttribute('aria-disabled') !== 'true' && control.getClientRects().length);
  if (!next) return false;
  const dialog = next.closest('[role="dialog"], .ui-dialog') || document;
  const options = ['All Rows In Current Query', 'All', 'Tab Delimited Text File'].map(value =>
    [...dialog.querySelectorAll('input[type="radio"]')].find(input => input.value === value && !input.disabled));
  if (options.some(option => !option)) return false;
  for (const option of options) option.click();
  next.click();
  return true;
}
