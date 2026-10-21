import { parseNumber, quantityTotals } from './inventory-math.js';

// One prominent figure, with the other known units in small separate chips.
// Unclassified quantities stay in the tooltip and data notes, not a mixed total.
export function renderQuantityKpi(element, parts, field = 'currentStock', preferredUnit = 'EA') {
  if (!element) return;
  const totals = new Map();
  for (const part of parts) {
    const unit = part.uom || 'UNKNOWN';
    totals.set(unit, (totals.get(unit) || 0) + parseNumber(typeof field === 'function' ? field(part) : part[field]));
  }
  const known = [...totals].filter(([unit, qty]) => unit !== 'UNKNOWN' && qty !== 0);
  known.sort(([a], [b]) => (a === preferredUnit ? -1 : b === preferredUnit ? 1 : a.localeCompare(b)));
  element.replaceChildren();
  element.classList.add('quantity-kpi');
  element.title = quantityTotals(parts, field);
  const append = (parent, [unit, qty]) => {
    const number = document.createElement('span');
    number.textContent = qty.toLocaleString('en-IN', { maximumFractionDigits: 3 });
    const label = document.createElement('small');
    label.textContent = unit === 'EA' ? 'pcs' : unit;
    parent.append(number, label);
  };
  const primary = document.createElement('span');
  primary.className = 'quantity-primary';
  if (known.length) append(primary, known[0]);
  else primary.textContent = totals.get('UNKNOWN') ? '—' : '0';
  element.append(primary);
  if (known.length > 1) {
    const secondary = document.createElement('span');
    secondary.className = 'quantity-secondary';
    for (const value of known.slice(1)) {
      const chip = document.createElement('span');
      chip.className = 'quantity-chip';
      append(chip, value);
      secondary.append(chip);
    }
    element.append(secondary);
  }
}

export function openMetricDetails(id, titleText, definition, details = []) {
  document.getElementById(id)?.close();
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'reorder-kpi-dialog';
  const title = document.createElement('h3');
  title.id = id + '-title';
  title.textContent = titleText;
  dialog.setAttribute('aria-labelledby',title.id);
  dialog.append(title);
  for (const text of [definition,...details]) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    dialog.append(paragraph);
  }
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'btn btn-outline'; close.textContent = 'Close';
  close.onclick = () => dialog.close();
  dialog.append(close);
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
  document.body.append(dialog);
  dialog.showModal();
}
