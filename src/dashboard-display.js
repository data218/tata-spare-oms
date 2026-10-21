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
