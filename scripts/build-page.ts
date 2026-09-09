/**
 * Bake data/btc.json into page/template.html → dist/dashboard.html
 *
 * Run:  node scripts/ingest.ts && node scripts/build-page.ts
 *
 * The output is fully self-contained: no API calls at view time, which is what
 * makes it hostable anywhere (and what lets it run as a published Artifact,
 * where outbound requests are blocked by policy).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const template = await readFile('page/template.html', 'utf8');
const data = await readFile('data/btc.json', 'utf8');

const MARKER = '/*__DATA__*/null';
if (!template.includes(MARKER)) {
  throw new Error(`page/template.html is missing the ${MARKER} placeholder`);
}

// `</script>` inside a JSON string would close the surrounding script tag early.
const safe = data.replace(/<\//g, '<\\/');
const html = template.replace(MARKER, safe);

await mkdir('dist', { recursive: true });
await writeFile('dist/dashboard.html', html);

console.log(`Wrote dist/dashboard.html (${(html.length / 1024).toFixed(0)} KB)`);
