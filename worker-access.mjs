import 'dotenv/config';
import {readWorkerSecrets,secretDirectory} from './src/location-secrets.js';
try {
  let identity;
  for(let attempt=0;attempt<10;attempt++){
    try { identity=readWorkerSecrets();break; }
    catch(error){if(!/identity not found/.test(error.message)||attempt===9)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
  }
  console.log('\nWorker setup code (keep private; do not post it in chat or screenshots):\n');
  console.log(identity.setupCode);
  console.log('\nEnter this code in Settings > Dealership Locations when testing/saving credentials.');
  console.log('Worker identity folder: '+secretDirectory());
} catch(error) {
  console.error(error.message);
  process.exitCode=1;
}
