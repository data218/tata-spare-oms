// Shared units and arithmetic. Database quantities stay unchanged; L/KG prices
// use millilitre/gram source quantities, as used by the Tata reports.
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/,/g, '').replace(/^₹\s*|^Rs\.?\s*/i, '');
  const result = Number(text);
  return Number.isFinite(result) ? result : 0;
}
export function parseTataDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const text = String(value).trim();
  if (typeof value === 'number' || /^\d{5}(?:\.\d+)?$/.test(text)) {
    const date = new Date(Math.round((Number(value) - 25569) * 86400000));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text); return Number.isFinite(date.getTime()) ? date : null;
  }
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(text);
  if (!match) return null;
  let [, day, month, year, hour = '0', minute = '0', second = '0', ampm] = match;
  day = Number(day); month = Number(month); year = Number(year); if (year < 100) year += 2000;
  if (month > 12 && day <= 12) [day, month] = [month, day];
  hour = Number(hour); if (ampm) hour = hour % 12 + (ampm.toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(year, month - 1, day, hour, Number(minute), Number(second));
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
export function normalizeLocation(value) {
  const text = String(value || '').toUpperCase().replace(/\s+/g, '');
  for (const [location, aliases] of Object.entries({CHANNIRAMA:['CHANNIRAMA','CHHANIRAMA'],SUPWAL:['SUPWAL','SMAMSAMBA'],KATHUA:['KATHUA','SMAMKATHUA'],NARWAL:['NARWAL','NARVAL','JAMMU'],REASI:['REASI'],LAMBHERI:['LAMBHERI'],POONCH:['POONCH']})) {
    if (aliases.some(alias => text.includes(alias))) return location;
  }
  return text || 'UNKNOWN';
}
export function canonicalUnit(uom) {
  const unit = String(uom || '').trim().toUpperCase();
  if (['L','LTR','LITRE','LITER','LITRES','LITERS'].includes(unit)) return 'L';
  if (['KG','KGS','KILOGRAM','KILOGRAMS'].includes(unit)) return 'KG';
  return unit || 'UNKNOWN';
}
export const quantityDivisor = (uom) => ['L','KG'].includes(canonicalUnit(uom)) ? 1000 : 1;
export const toBaseQuantity = (quantity, uom) => parseNumber(quantity) / quantityDivisor(uom);
export const roundOrderQuantity = (quantity, uom) => Math.max(0, Math.ceil(Math.max(0, quantity) * (['L','KG'].includes(canonicalUnit(uom)) ? 1000 : 1) - 1e-9)) / (['L','KG'].includes(canonicalUnit(uom)) ? 1000 : 1);
export function reorderMetrics(part) {
  const averageDaily = Math.max(0, parseNumber(part.consumption6mRolling)) / 180;
  const leadTime = 7, safetyDays = 7;
  const demand = averageDaily * leadTime;
  const safetyStock = averageDaily * safetyDays;
  const reorderPoint = demand + safetyStock;
  const available = parseNumber(part.currentStock) - parseNumber(part.reserved);
  const netRequirement = reorderPoint - available - parseNumber(part.inTransit);
  return {averageDaily,leadTime,safetyDays,demand,safetyStock,reorderPoint,available,netRequirement,
    orderQty:part.unitKnown === false ? null : roundOrderQuantity(netRequirement, part.uom)};
}
export function isLubePart(category, description = '') {
  if (/lube|lubricant|^oil$/i.test(category || '')) return true;
  // A part containing the word "oil" is not necessarily oil (filters, seals,
  // pumps and sensors must remain pieces, not be counted as lubricant).
  if (/\b(?:filter|seal|pump|sensor|cap|pipe|hose|cooler|dipstick|pan|sump|gasket|switch|labour)\b/i.test(description)) return false;
  return /\b(?:oil|grease|coolant|atf|def)\b|15w\s*40|mobil/i.test(description);
}
export function stockDepartment(indicator) {
  const text = String(indicator || '').trim().toUpperCase();
  const compact = text.replace(/[^A-Z0-9]/g,'');
  if (compact.includes('BODYSHOP') || compact === 'BS') return 'bodyshop';
  if (compact.includes('WPACS')) return 'wpacs';
  if (compact.includes('WORKSHOP') || compact === 'WS') return 'workshop';
  if (compact.startsWith('TMPCPARTS') && /JAMMU|CHANNIRAMA|SMAMSAMBA|KATHUA|SUPWAL|NARWAL|NARVAL|LAMBHERI|POONCH|REASI/.test(compact)) return 'workshop';
  return 'unassigned';
}
export function quantityTotals(parts, field = 'currentStock') {
  const totals = new Map();
  for (const part of parts) totals.set(part.uom || 'UNKNOWN', (totals.get(part.uom || 'UNKNOWN') || 0) + parseNumber(typeof field === 'function' ? field(part) : part[field]));
  return [...totals].filter(([, qty]) => qty !== 0).map(([unit, qty]) => `${qty.toLocaleString('en-IN', {maximumFractionDigits:3})} ${unit === 'EA' ? 'pcs' : unit === 'UNKNOWN' ? '(unit unknown)' : unit}`).join(' + ') || '0';
}
const partKey = (part, location) => JSON.stringify([String(part || '').trim().toUpperCase(), normalizeLocation(location)]);
const latestDate = (a, b) => { const first = parseTataDate(a), second = parseTataDate(b); return second && (!first || second > first) ? b : a; };
export function processInventoryData({inventory = [], consumption = [], priceList = [], movementLogs = []}, now = new Date()) {
  const prices = new Map(priceList.map(row => [String(row.part_number || '').trim().toUpperCase(), row]));
  const grouped = new Map();
  const locationSnapshots = new Map();
  const make = (number, location, description = '', category = '') => {
    const key = partKey(number, location);
    if (!grouped.has(key)) {
      const id = String(number || '').trim().toUpperCase(), price = prices.get(id) || {};
      const uom = canonicalUnit(price.uom), ndp = parseNumber(price.ndp);
      const model = price.description || description || 'Unknown';
      const normalizeDescription = value => String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
      const mismatch = Boolean(price.description && description && !normalizeDescription(price.description).startsWith(normalizeDescription(description)) && !normalizeDescription(description).startsWith(normalizeDescription(price.description)));
      grouped.set(key, {partId:id,location:normalizeLocation(location),model,description:model,uom,
        sourceDescription:description,descriptionMismatch:mismatch,
        productCategory:((['L','KG'].includes(uom) && isLubePart(price.category || category, model)) || /lubes|lubricant/i.test(price.category || category)) ? 'LUBRICANT' : (category || price.category || 'Uncategorized').toUpperCase(),
        ndpPrice:ndp > 0 ? ndp : null,priceKnown:ndp > 0,unitKnown:uom !== 'UNKNOWN',currentStock:0,reserved:0,inTransit:0,
        stockValue:null,min:0,consumption30d:0,consumption6mRolling:0,last_receipt:'',last_issue:'',lastConsumption:'',snapshotAt:null,
        subStock:{workshop:0,bodyshop:0,wpacs:0,unassigned:0},unreconciledMovements:0});
    }
    return grouped.get(key);
  };
  for (const row of inventory) {
    if (!row.part_no && !row.part_number) continue;
    const part = make(row.part_no || row.part_number, row.division || row.location_1, row.description, row.product_category);
    const qty = toBaseQuantity(row.qty, part.uom), availability = String(row.availability || '').toLowerCase();
    if (availability.includes('transit')) part.inTransit += qty;
    else if (availability.includes('reserv')) part.reserved += qty;
    else {
      part.currentStock += qty;
      part.subStock[stockDepartment(row.inventory_indicator)] += qty;
    }
    part.min = Math.max(part.min, toBaseQuantity(row.min, part.uom));
    part.last_receipt = latestDate(part.last_receipt, row.last_receipt);
    part.last_issue = latestDate(part.last_issue, row.last_issue);
    const fetched = parseTataDate(row.fetched_at); if (fetched && (!part.snapshotAt || fetched > part.snapshotAt)) part.snapshotAt = fetched;
    if (fetched && (!locationSnapshots.has(part.location) || fetched > locationSnapshots.get(part.location))) locationSnapshots.set(part.location, fetched);
  }
  const day = 86400000, cutoff30 = now.getTime() - 30 * day, cutoff180 = now.getTime() - 180 * day;
  for (const row of consumption) {
    if (!row.part_no && !row.part_number) continue;
    const part = make(row.part_no || row.part_number, row.division, row.part_desc, row.product_category);
    const date = parseTataDate(row.date); if (!date || date > now) continue;
    const qty = toBaseQuantity(row.sold_qty, part.uom);
    if (date.getTime() >= cutoff30) part.consumption30d += qty;
    if (date.getTime() >= cutoff180) part.consumption6mRolling += qty;
    part.lastConsumption = latestDate(part.lastConsumption, row.date);
  }
  // A part absent from a known location's stock export has zero snapshot stock.
  // Its newly recorded receipt can still be applied after that location's snapshot.
  for (const part of grouped.values()) if (!part.snapshotAt) part.snapshotAt = locationSnapshots.get(part.location) || null;
  for (const row of movementLogs) {
    const part = make(row.part_id, row.location), date = parseTataDate(row.date);
    if (!part.snapshotAt) part.snapshotAt = locationSnapshots.get(part.location) || null;
    if (!date || !part.snapshotAt || date <= part.snapshotAt) {part.unreconciledMovements++;continue;}
    // Manual entry forms store the entered amount in the same canonical unit as the displayed stock.
    const qty = parseNumber(row.qty) * (row.movement_type === 'IN' ? 1 : -1);
    part.currentStock += qty; part.subStock.unassigned += qty;
    part.last_issue = latestDate(part.last_issue, row.date);
  }
  for (const part of grouped.values()) {
    part.available = part.currentStock - part.reserved;
    part.stockValue = part.priceKnown && part.unitKnown ? part.currentStock * part.ndpPrice : null;
    const receipt = parseTataDate(part.last_receipt);
    part.ageingDays = receipt && receipt <= now && part.currentStock > 0 ? Math.floor((now - receipt) / day) : null;
    const movement = parseTataDate(latestDate(latestDate(part.last_receipt, part.last_issue), part.lastConsumption));
    part.nonMovingDays = movement && movement <= now && part.currentStock > 0 ? Math.floor((now - movement) / day) : null;
    const daily = part.consumption6mRolling / 180;
    part.sourceMinimum = part.min;
    part.min = daily * 7;
    part.demand = daily * 7;
  }
  return [...grouped.values()];
}
export function summarizeInventory(parts) {
  return parts.reduce((s,p)=>{s.stockValue+=p.stockValue||0;s.reservedValue+=(p.priceKnown&&p.unitKnown?p.reserved*p.ndpPrice:0);s.availableValue+=(p.priceKnown&&p.unitKnown?p.available*p.ndpPrice:0);s.missingPrices+=p.currentStock>0&&!p.priceKnown?1:0;s.unknownUnits+=p.currentStock>0&&!p.unitKnown?1:0;s.unknownAge+=p.currentStock>0&&p.ageingDays==null?1:0;s.missingDepartments+=Math.abs(p.subStock?.unassigned||0)>1e-9?1:0;s.descriptionMismatches+=p.descriptionMismatch?1:0;s.unreconciledMovements+=p.unreconciledMovements||0;return s;},{stockValue:0,reservedValue:0,availableValue:0,missingPrices:0,unknownUnits:0,unknownAge:0,missingDepartments:0,descriptionMismatches:0,unreconciledMovements:0});
}
