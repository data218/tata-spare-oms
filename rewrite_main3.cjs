const fs = require('fs');
let lines = fs.readFileSync('main.js', 'utf8').split('\n');
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

lines.splice(968, 70, replacement);
fs.writeFileSync('main.js', lines.join('\n'));
console.log('Success');
