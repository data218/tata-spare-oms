const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// I will insert console logs into main.js temporarily to see what it is doing.
const target = `  // Apply manual movement logs
  movementLogs.forEach(log => {
    const loc = mapLocation(log.location);
    const key = log.part_id + '_' + loc;
    const existing = grouped.get(key);`;

const replacement = `  // Apply manual movement logs
  console.log('Total movement logs fetched:', movementLogs.length);
  movementLogs.forEach(log => {
    const loc = mapLocation(log.location);
    const key = log.part_id + '_' + loc;
    const existing = grouped.get(key);
    if (log.part_id === '288954409901') {
       console.log('Found log for part 288954409901:', log);
       console.log('Mapped loc:', loc, 'Key:', key);
       console.log('Existing object before:', existing ? existing.currentStock : 'NOT FOUND');
    }`;

s = s.replace(target, replacement);

const target2 = `        existing.currentStock += Number(log.qty) || 0;
      } else if (log.movement_type === 'OUT') {`;

const replacement2 = `        existing.currentStock += Number(log.qty) || 0;
        if (log.part_id === '288954409901') console.log('After IN, currentStock is:', existing.currentStock);
      } else if (log.movement_type === 'OUT') {`;

s = s.replace(target2, replacement2);

fs.writeFileSync('main_debug.js', s);
console.log('Debug main.js created.');
