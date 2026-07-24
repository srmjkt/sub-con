// Simple test runner script. Run with `tsx` or `ts-node` if available.
import { normalizeRecord } from '../src/lib/pusiknas/client';
import sample from '../src/lib/pusiknas/sample_responses/sample.json';

function assert(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function run() {
  console.log('Running pusiknas tests...');
  const arr = sample as any[];
  assert(Array.isArray(arr), 'sample should be an array');
  const norm = normalizeRecord(arr[0]);
  console.log('Normalized first record:', norm);
  assert(norm.count === 13400, `expected count 13400 got ${norm.count}`);
  console.log('OK');
}

run().catch(e => { console.error(e); process.exit(1); });
