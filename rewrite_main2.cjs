const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// The output from Powershell might have BOM or CRLF. We normalize both strings to simplify replacement.
let targetRaw = fs.readFileSync('target.txt', 'utf16le');
if (targetRaw.charCodeAt(0) === 0xFEFF) {
  targetRaw = targetRaw.slice(1);
}
// fallback if it was utf8
if (targetRaw.includes('\0')) {
  targetRaw = targetRaw.replace(/\0/g, '');
} else {
  targetRaw = fs.readFileSync('target.txt', 'utf8');
}

// Convert both to arrays of lines trimmed
const mainLines = s.split('\n');
const targetLines = targetRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Find matching lines
let matchStart = -1;
let matchEnd = -1;

for (let i = 0; i < mainLines.length; i++) {
    if (mainLines[i].trim() === targetLines[0]) {
        let isMatch = true;
        for (let j = 0; j < targetLines.length; j++) {
            // skip empty lines in matching
            if (!mainLines[i+j] || mainLines[i+j].trim() !== targetLines[j]) {
                isMatch = false;
                break;
            }
        }
        if (isMatch) {
            matchStart = i;
            matchEnd = i + targetLines.length - 1;
            break;
        }
    }
}

if (matchStart === -1) {
    console.log('Could not find match');
    process.exit(1);
}

const replacement = `    try {
      const job = {
          status: 'pending',
          type,
          fromDate,
          toDate,
          targetLocation,
          logs: '<div>Starting background scraper... please wait and do not close this page.</div>'
      };
      
      await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(job) }, { onConflict: 'key' });
      
      let fetchChannel = supabase.channel('fetch_job_updates')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tata_bot_settings', filter: 'key=eq.fetch_job' }, async (payload) => {
              try {
                  const updatedJob = JSON.parse(payload.new.value);
                  statusDiv.innerHTML = updatedJob.logs || 'Processing...';
                  
                  const plain = (statusDiv.textContent || '').replace(/\\s+/g, ' ').trim();
                  
                  if (!window.__tataLocationAlerts) window.__tataLocationAlerts = new Set();
                  const sig = plain.slice(0, 90);
                  if (plain && !window.__tataLocationAlerts.has(sig)) {
                    window.__tataLocationAlerts.add(sig);
                    if (plain.includes('ERROR:') || plain.includes('FATAL ERROR:')) {
                      showLocationAlert('error', plain.replace(/^FATAL ERROR:\\s*/, '').replace(/^ERROR:\\s*/, ''));
                    } else if (/UPLOADED \\d+ ROWS/i.test(plain)) {
                      const loc = (plain.match(/^(.+?)\\s+(?:CONSUMPTION|INVENTORY)?\\s*DATA/i) || [])[1] || plain.split(' ')[0];
                      showLocationAlert('success', \`\${loc.trim().replace(/\\s+$/, '')} data fetched successfully\`);
                    } else if (plain.includes('successfully')) {
                      showLocationAlert('success', 'All requested scrapers finished successfully');
                    }
                  }

                  if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
                      if (updatedJob.status === 'completed') {
                          statusDiv.style.color = '#059669';
                          btn.innerHTML = '<i data-lucide="check"></i> Done!';
                          btn.style.background = '#059669';
                          lucide.createIcons();
                          
                          const newDateStr = new Date().toLocaleString();
                          await supabase.from('tata_bot_settings').upsert({ key: 'last_sync', value: newDateStr }, { onConflict: 'key' });
                          loadLastSync();
                          
                          const syncText = document.getElementById('last-updated-text');
                          if (syncText && typeof formatBeautifulDate === 'function') {
                            syncText.textContent = formatBeautifulDate(newDateStr);
                          }
                          
                          setTimeout(() => loadDataAndRender(), 1000);
                      } else {
                          statusDiv.style.color = '#ef4444';
                      }
                      
                      fetchChannel.unsubscribe();
                      setTimeout(() => resetBtn(), 5000);
                  }
              } catch(e) { console.error('Error processing realtime payload', e); }
          }).subscribe();
          
    } catch (err) {
      console.error('Error fetching data:', err);
      btn.innerHTML = '<i data-lucide="alert-triangle"></i> Error';
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'Failed to submit job to Supabase: ' + err.message;
      resetBtn();
    }`;

const newContent = mainLines.slice(0, matchStart).join('\\n') + '\\n' + replacement + '\\n' + mainLines.slice(matchEnd + 1).join('\\n');
fs.writeFileSync('main.js', newContent);
console.log('Success');
