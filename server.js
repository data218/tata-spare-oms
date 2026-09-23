import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// SSE Clients list
let clients = [];

// Helper to broadcast status to all connected frontend clients
function broadcastStatus(message) {
  const data = JSON.stringify({ message, timestamp: new Date().toISOString() });
  clients.forEach(client => client.res.write(`data: ${data}\n\n`));
}

// SSE Endpoint
app.get('/api/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  
  // Send an initial connected message
  res.write(`data: ${JSON.stringify({ message: "Connected to live status stream...", timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

app.post('/api/fetch-data', async (req, res) => {
  const { fromDate, toDate, type, targetLocation } = req.body;
  
  if (type === 'consumption' && (!fromDate || !toDate)) {
    return res.status(400).json({ success: false, error: 'fromDate and toDate are required (format MM/DD/YYYY)' });
  }

  broadcastStatus(`Received manual fetch request for: ${type || 'all'}`);
  
  try {
    // Send immediate response so the frontend doesn't timeout while scraping happens in the background
    res.json({ success: true, message: 'Background fetch started. Listening for live updates.' });
    
    // Fire and forget
    let tasks = [];
    if (type === 'consumption' || type === 'all') {
        tasks.push(fetchConsumptionData(fromDate, toDate, broadcastStatus));
    }
    if (type === 'inventory' || type === 'all') {
        tasks.push(fetchInventoryData(broadcastStatus, targetLocation));
    }

    Promise.all(tasks).then((results) => {
        const allMessages = results.flat().filter(Boolean).join('<br>');
        broadcastStatus(`<strong>All requested scrapers finished successfully!</strong><br><br>${allMessages}`);
    }).catch(error => {
        console.error('Error during fetch operation:', error);
        broadcastStatus(`FATAL ERROR: ${error.message}`);
    });
  } catch (error) {
    console.error('Error initiating fetch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup Automated Cron Job (10:00 AM every day)
cron.schedule('0 10 * * *', async () => {
  console.log('Running automated 10 AM data fetch...');
  broadcastStatus("Starting automated 10 AM data fetch...");
  
  // Calculate dates: Jan 1st 2026 to D-1 (yesterday)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const format = (d) => `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  
  const fromDate = '01/01/2026';
  const toDate = format(yesterday);
  
  try {
    await Promise.all([
      fetchConsumptionData(fromDate, toDate, broadcastStatus),
      fetchInventoryData(broadcastStatus)
    ]);
    broadcastStatus("Automated 10 AM fetch completed successfully!");
  } catch (error) {
    console.error('Automated fetch failed:', error);
    broadcastStatus(`Automated fetch ERROR: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
  console.log('Automated 10 AM background cron job is scheduled.');
});
