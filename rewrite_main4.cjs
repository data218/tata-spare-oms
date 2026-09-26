const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

const oldBlock = `      let fetchChannel = supabase.channel('fetch_job_updates')
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
          }).subscribe();`;

const newBlock = `      let pollInterval = setInterval(async () => {
          try {
              const { data } = await supabase.from('tata_bot_settings').select('value').eq('key', 'fetch_job');
              if (data && data.length > 0) {
                  const updatedJob = JSON.parse(data[0].value);
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
                      clearInterval(pollInterval);
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
                      
                      setTimeout(() => resetBtn(), 5000);
                  }
              }
          } catch(e) { console.error('Polling error', e); }
      }, 1000);`;

if (s.includes(oldBlock)) {
    s = s.replace(oldBlock, newBlock);
    fs.writeFileSync('main.js', s);
    console.log('Successfully replaced block in main.js');
} else {
    console.log('Could not find old block in main.js');
}
