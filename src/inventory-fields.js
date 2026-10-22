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
