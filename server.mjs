/**
 * Local development Express server.
 *
 * Vite proxies /api/* → http://localhost:3000 (see vite.config.js).
 * This file provides that server so the "Fetch Inventory" and
 * "Fetch Consumption" buttons in the dashboard actually trigger the
 * Puppeteer scrapers on THIS machine (which can reach the Tata portal)
 * instead of Vercel (whose IPs are blocked by Cloudflare).
 *
 * Usage:
 *   node server.mjs        (start the API server on port 3000)
 *
 * Or use: npm run dev:full  (starts BOTH Vite + this server together)
 */

import express from 'express';
import { createServer } from 'http';
import handler from './api/_server.js';

const PORT = process.env.PORT || 3000;

const app = express();

// Parse JSON bodies (the fetch buttons POST JSON)
app.use(express.json());

// Route ALL /api/* requests through the shared handler from api/_server.js
// This keeps the logic 100% identical between local and Vercel.
app.use('/api', async (req, res) => {
  // Restore the full /api/... path that _server.js expects
  req.url = '/api' + req.url;
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[server] Unhandled error in handler:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Tata OMS local API server is running.' });
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log('');
  console.log('=============================================================');
  console.log(`✅  Tata OMS Local API Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('   Fetch buttons in the dashboard will now work!');
  console.log('   Keep this terminal open while using the app.');
  console.log('');
  console.log('   Routes handled:');
  console.log('     POST /api/sync    → trigger inventory / consumption fetch');
  console.log('     POST /api/cancel  → cancel a running job');
  console.log('     GET  /api/status  → get current job status');
  console.log('     POST /api/queue   → internal unit hand-off');
  console.log('     POST /api/cron    → daily cron trigger');
  console.log('     GET  /api/health  → runtime health check');
  console.log('=============================================================');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error('   Another server may already be running.');
    console.error('   Kill it with:  npx kill-port 3000');
    console.error('   Then re-run:   node server.mjs\n');
  } else {
    console.error('[server] Server error:', err);
  }
  process.exit(1);
});
