/**
 * start-dev.mjs — runs Vite + local API server at the same time.
 *
 * Usage:  npm run dev:full
 *
 * This is equivalent to opening two terminals and running:
 *   Terminal 1: node server.mjs
 *   Terminal 2: npx vite
 *
 * Vite proxies /api/* → http://localhost:3000 so the "Fetch" buttons
 * in the dashboard go to the local server which can reach the Tata portal.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const colors = {
  server: '\x1b[36m', // cyan
  worker: '\x1b[33m', // yellow
  vite:   '\x1b[35m', // magenta
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
};

function prefix(tag, color) {
  return (data) => {
    String(data).split('\n').forEach((line) => {
      if (line.trim()) process.stdout.write(`${color}[${tag}]${colors.reset} ${line}\n`);
    });
  };
}

console.log(`${colors.bold}Starting Tata OMS in development mode...${colors.reset}`);
console.log('');

// Start the local API server (port 3000)
const apiServer = spawn('node', [join(__dirname, 'server.mjs')], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env },
});

apiServer.stdout.on('data', prefix('server', colors.server));
apiServer.stderr.on('data', prefix('server', colors.server));

// Start the background scraper worker as well. The API only ever queues a job
// in Supabase, so without this the "Fetch" buttons would report success while
// nothing actually scraped.
const worker = spawn('node', [join(__dirname, 'local-worker.mjs')], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env },
});

worker.stdout.on('data', prefix('worker', colors.worker));
worker.stderr.on('data', prefix('worker', colors.worker));

// Give the API server 1.5s to start before starting Vite, so port 3000 is ready
await new Promise((r) => setTimeout(r, 1500));

// Start Vite dev server (port 5173)
const vite = spawn('npx', ['vite'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env },
});

vite.stdout.on('data', prefix('vite', colors.vite));
vite.stderr.on('data', prefix('vite', colors.vite));

// If either process exits, kill both and exit
function killAll(code) {
  apiServer.kill();
  worker.kill();
  vite.kill();
  process.exit(code ?? 0);
}

apiServer.on('exit', (code) => { console.log(`\n[server] exited (${code})`); killAll(code); });
worker.on('exit', (code) => { console.log(`\n[worker] exited (${code})`); killAll(code); });
vite.on('exit', (code) => { console.log(`\n[vite] exited (${code})`); killAll(code); });

// Ctrl+C → clean up both children
process.on('SIGINT', () => killAll(0));
process.on('SIGTERM', () => killAll(0));
