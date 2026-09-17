import express from 'express';
import cors from 'cors';
import { fetchConsumptionData } from './src/consumption_scraper.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/api/fetch-data', async (req, res) => {
  const { fromDate, toDate } = req.body;
  
  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, error: 'fromDate and toDate are required (format MM/DD/YYYY)' });
  }

  console.log(`Received request to fetch data from ${fromDate} to ${toDate}`);
  
  try {
    // Run the scraper in the background. Note: this might take minutes.
    // For a production app, you'd use a job queue, but for local use this is fine.
    await fetchConsumptionData(fromDate, toDate);
    res.json({ success: true, message: 'Data fetched and synced successfully!' });
  } catch (error) {
    console.error('Error during fetch operation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward compatibility with existing sync logic if any
app.post('/api/sync', async (req, res) => {
    try {
        // Just run with a default or latest month if no dates provided
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const format = (d) => `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        
        await fetchConsumptionData(format(firstDay), format(date));
        res.json({ success: true, message: 'Synced latest month successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
});
