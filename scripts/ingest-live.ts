/**
 * Fast-tier refresh — write data/live.json.
 *
 * Run:  node scripts/ingest-live.ts
 *
 * Cheap enough to run every minute: four small requests, ~1 KB out. Contrast
 * with scripts/ingest.ts, which pulls 5,700 days and should run once a day
 * because that is how often the on-chain metrics it fetches actually change.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fetchLive } from '../lib/sources/live.ts';

const live = await fetchLive();

await mkdir('data', { recursive: true });
await writeFile('data/live.json', JSON.stringify(live));

console.log(
  `live.json  ${live.fetchedAt}  ` +
  `price ${live.price == null ? 'n/a' : '$' + live.price.toLocaleString('en-US')}  ` +
  `funding ${live.fundingRate == null ? 'n/a' : (live.fundingRate * 1e4).toFixed(2) + 'bp'}`,
);
