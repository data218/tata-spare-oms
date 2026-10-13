const fs = require('fs');

function updateParseTataDate(filename) {
  let code = fs.readFileSync(filename, 'utf8');

  const oldFunc = `window.parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) return new Date(dateStr);
  
  const datePart = dateStr.split(' ')[0];
  if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
          if (parts[2].length === 4) return new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
          const monthMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
          if (parts[1] && monthMap[parts[1].toLowerCase()] !== undefined) {
              const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
              return new Date(year, monthMap[parts[1].toLowerCase()], parseInt(parts[0]));
          }
      }
  } else if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) {
          if (parts[2].length === 4) return new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
          return new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
  }
  return new Date(dateStr);
};`;

  const newFunc = `window.parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) return new Date(dateStr);
  
  // Excel numeric date as string (e.g., "46024.0001")
  if (/^\\d{5}(\\.\\d+)?$/.test(dateStr.trim())) {
      return new Date(Math.round((Number(dateStr.trim()) - 25569) * 86400 * 1000));
  }
  
  const datePart = dateStr.split(' ')[0];
  if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
          if (parts[2].length === 4) return new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
          const monthMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
          if (parts[1] && monthMap[parts[1].toLowerCase()] !== undefined) {
              const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
              return new Date(year, monthMap[parts[1].toLowerCase()], parseInt(parts[0]));
          }
      }
  } else if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) {
          if (parts[2].length === 4) return new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
          return new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
  }
  return new Date(dateStr);
};`;

  code = code.replace(oldFunc, newFunc);
  fs.writeFileSync(filename, code);
}

updateParseTataDate('main.js');
updateParseTataDate('main_debug.js');
