import cron from 'node-cron';
import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Background worker starting...');
console.log('Automated 10 AM background cron job is scheduled.');

let isProcessing = false;

// Job Polling Loop
setInterval(async () => {
    if (isProcessing) return;
    try {
        const { data } = await supabase.from('tata_bot_settings').select('*').eq('key', 'fetch_job');
        if (data && data.length > 0) {
            const job = JSON.parse(data[0].value);
            if (job.status === 'pending') {
                isProcessing = true;
                console.log(`Starting job: ${job.type}`);
                
                job.status = 'processing';
                // Do not clear logs so the initial 'Starting...' message remains
                await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(job) }, { onConflict: 'key' });
                
                const broadcastStatus = async (msg) => {
                    console.log(msg);
                    const timestamp = new Date().toISOString();
                    try {
                        const { data } = await supabase.from('tata_bot_settings').select('value').eq('key', 'fetch_job');
                        if (data && data.length > 0) {
                            const currentJob = JSON.parse(data[0].value);
                            currentJob.logs = (currentJob.logs || '') + `<div>${timestamp} - ${msg}</div>`;
                            await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(currentJob) }, { onConflict: 'key' });
                        }
                    } catch(e) { console.error('Log sync error:', e); }
                };
                
                try {
                    let tasks = [];
                    if (job.type === 'consumption' || job.type === 'all') {
                        tasks.push(fetchConsumptionData(job.fromDate, job.toDate, broadcastStatus));
                    }
                    if (job.type === 'inventory' || job.type === 'all') {
                        tasks.push(fetchInventoryData(broadcastStatus, job.targetLocation));
                    }
                    
                    const results = await Promise.all(tasks);
                    const allMessages = results.flat().filter(Boolean).join('<br>');
                    await broadcastStatus(`<strong>All requested scrapers finished successfully!</strong><br><br>${allMessages}`);
                    
                    const { data: finalData } = await supabase.from('tata_bot_settings').select('value').eq('key', 'fetch_job');
                    if (finalData && finalData.length > 0) {
                        const finalJob = JSON.parse(finalData[0].value);
                        finalJob.status = 'completed';
                        if (!finalJob.logs) finalJob.logs = '<div>Finished successfully!</div>';
                        await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(finalJob) }, { onConflict: 'key' });
                    }
                } catch (err) {
                    await broadcastStatus(`FATAL ERROR: ${err.message}`);
                    const { data: finalData } = await supabase.from('tata_bot_settings').select('value').eq('key', 'fetch_job');
                    if (finalData && finalData.length > 0) {
                        const finalJob = JSON.parse(finalData[0].value);
                        finalJob.status = 'failed';
                        if (!finalJob.logs) finalJob.logs = `<div>FATAL ERROR: ${err.message}</div>`;
                        await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(finalJob) }, { onConflict: 'key' });
                    }
                }
                isProcessing = false;
            }
        }
    } catch (e) {
        console.error('Polling error:', e);
        isProcessing = false;
    }
}, 3000);

// Setup Automated Cron Job (10:00 AM every day)
cron.schedule('0 10 * * *', async () => {
  console.log('Running automated 10 AM data fetch...');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const format = (d) => `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  
  const fromDate = '01/01/2026';
  const toDate = format(yesterday);
  
  // Submit job to queue
  const job = {
    status: 'pending',
    type: 'all',
    fromDate,
    toDate,
    targetLocation: 'ALL',
    logs: ''
  };
  await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(job) }, { onConflict: 'key' });
  console.log('Automated job added to queue.');
});
