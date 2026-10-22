// Tata exports and spreadsheet uploads use both labels for the department/store.
export function readInventoryDepartment(row) {
  const entries = Object.entries(row).map(([key,value]) => [key.toLowerCase().replace(/[^a-z0-9]/g,''),value]);
  const aliases = ['inventoryindicator','inventorylocation','inventoryi'];
  for (const alias of aliases) {
    const match = entries.find(([key,value]) => key === alias && String(value ?? '').trim());
    if (match) return String(match[1]).trim();
  }
  for (const [key,value] of entries) {
    if (key.length >= 10 && aliases.slice(0,2).some(alias => alias.startsWith(key) || key.startsWith(alias)) && String(value ?? '').trim()) return String(value).trim();
  }
  return '';
}

export function validateInventoryDepartments(rows) {
  const stocked = rows.filter(row => Number(String(row.qty ?? 0).replace(/,/g,'')) > 0 && !/reserv|transit/i.test(row.availability || ''));
  if (stocked.length && stocked.every(row => !String(row.inventory_indicator || '').trim())) {
    throw new Error('Inventory Location / Inventory Indicator is missing for all stocked rows. Include the store column and upload the complete location report. Existing data has been kept.');
  }
}
