/**
 * Append today's reading to records/daily-readings.csv — once per on-chain day.
 *
 * Run:  node scripts/record-reading.ts   (after a build; reads _site/summary.json)
 *
 * Two jobs. The commit this produces is what makes Cloudflare rebuild the
 * canonical site each morning (see .github/workflows/refresh.yml). And the file
 * itself is a public, append-only track record: git history shows when each
 * line was written, so the site's past readings cannot be improved in hindsight.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const FILE = 'records/daily-readings.csv';
const HEADER =
  'on_chain_date,recorded_at_utc,price_close_usd,cycle_percentile,cycle_label,raw_average,signals,' +
  'mayer_multiple,mvrv,mvrv_z,fear_greed,funding_bp_8h,funding_venue,hash_ribbon_pct,exchange_pct';

const s = JSON.parse(await readFile('_site/summary.json', 'utf8'));
const signal = (key: string) => s.signals.find((p: any) => p.key === key)?.reading ?? '';

await mkdir('records', { recursive: true });
const existing = await readFile(FILE, 'utf8').catch(() => HEADER + '\n');

if (existing.split('\n').some((line) => line.startsWith(s.onChainDataAsOf + ','))) {
  console.log(`${FILE} already has ${s.onChainDataAsOf}; nothing appended.`);
} else {
  const row = [
    s.onChainDataAsOf, s.generatedAt, Math.round(s.price.usd), s.cyclePosition.percentile,
    s.cyclePosition.label, s.cyclePosition.rawAverage, s.cyclePosition.signalsAveraged,
    signal('mayer'), s.valuation.mvrv, s.valuation.mvrvZScore, s.sentiment.fearGreedIndex ?? '',
    s.leverage.fundingRateBpPer8h ?? '', s.leverage.venue ?? '', s.network.hashRibbonSpreadPct ?? '',
    s.network.coinsOnExchangesPctOfSupply ?? '',
  ].join(',');
  await writeFile(FILE, existing.replace(/\n*$/, '\n') + row + '\n');
  console.log(`Appended ${s.onChainDataAsOf} to ${FILE}`);
}
