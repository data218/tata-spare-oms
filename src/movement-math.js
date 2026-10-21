import { canonicalUnit, normalizeLocation, parseNumber, parseTataDate, toBaseQuantity } from './inventory-math.js';

// The ledger contains recorded consumption/returns and manual entries only.
// A stock snapshot cannot reconstruct historical receipts.
export function buildMovementTransactions({consumption = [], movementLogs = [], priceList = []}, now = new Date()) {
  const prices = new Map(priceList.map(p => [String(p.part_number || '').trim().toUpperCase(), p]));
  const transactions = [];
  const issues = {unknownUnits:0, missingPrices:0, undated:0, future:0, invalid:0};
  function append(row, source, index) {
    const manual = source === 'manual';
    const partNo = String(manual ? row.part_id || '' : row.part_no || row.part_number || '').trim().toUpperCase();
    const rawQty = parseNumber(manual ? row.qty : row.sold_qty);
    const direction = manual ? String(row.movement_type || '').toUpperCase() : rawQty < 0 ? 'IN' : 'OUT';
    if (!partNo || !rawQty || !['IN','OUT'].includes(direction) || (manual && rawQty < 0)) {issues.invalid++;return;}
    const date = parseTataDate(row.date);
    if (date && date > now) {issues.future++;return;}
    if (!date) issues.undated++;
    const price = prices.get(partNo);
    const uom = canonicalUnit(price?.uom);
    const ndp = parseNumber(price?.ndp);
    const unitKnown = uom !== 'UNKNOWN';
    const priceKnown = ndp > 0;
    const qty = Math.abs(manual ? rawQty : toBaseQuantity(rawQty, uom));
    if (!unitKnown) issues.unknownUnits++;
    if (!priceKnown) issues.missingPrices++;
    transactions.push({id:`${manual ? 'MANUAL' : 'CONSUMPTION'}-${row.id || index}`, date, direction,
      type:manual ? 'MANUAL' : rawQty < 0 ? 'RETURN' : 'CONSUMPTION', source,
      partNo, description:price?.description || row.part_desc || '',
      location:normalizeLocation(manual ? row.location : row.division || row.dealer),
      qty, uom, unitKnown, value:unitKnown && priceKnown ? qty * ndp : null,
      reference:manual ? row.reference || '' : row.invoice_no || row.order_num || '',
      ndp:priceKnown ? ndp : null});
  }
  consumption.forEach((row,i) => append(row,'consumption',i));
  movementLogs.forEach((row,i) => append(row,'manual',i));
  transactions.sort((a,b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return {transactions,issues};
}

export function summarizeMovements(rows) {
  const units = new Map();
  let inValue = 0, outValue = 0, unpriced = 0, pricedIn = 0, pricedOut = 0;
  for (const row of rows) {
    if (row.value == null) unpriced++;
    else if (row.direction === 'IN') {inValue += row.value;pricedIn++;}
    else {outValue += row.value;pricedOut++;}
    if (row.uom === 'UNKNOWN' || !row.uom) continue;
    if (!units.has(row.uom)) units.set(row.uom,{uom:row.uom,inQty:0,outQty:0,netQty:0});
    const unit = units.get(row.uom);
    if (row.direction === 'IN') unit.inQty += row.qty; else unit.outQty += row.qty;
    unit.netQty = unit.inQty - unit.outQty;
  }
  return {units:[...units.values()],inValue,outValue,netValue:inValue-outValue,unpriced,pricedIn,pricedOut};
}

export function groupMovements(rows, by = 'location') {
  const groups = new Map();
  for (const row of rows) {
    if (!row.unitKnown) continue;
    const name = by === 'location' ? row.location : row.partNo;
    const key = JSON.stringify([name,row.uom]);
    if (!groups.has(key)) groups.set(key,{name,description:row.description,uom:row.uom,rows:[]});
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map(g => {const totals=summarizeMovements(g.rows);return {...g,...totals,...totals.units[0],count:g.rows.length};});
}
