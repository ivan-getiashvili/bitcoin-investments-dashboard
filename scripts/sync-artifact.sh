#!/usr/bin/env bash
# Mirror the deployed page back into dist/dashboard.html, so the Artifact can be
# republished from the exact bytes that are live on GitHub Pages.
#
# Usage:  bash scripts/sync-artifact.sh
#
# Why fetch instead of using the local build: GitHub Actions runs its own data
# fetch on the runner, so a locally built file would differ from the deployed
# one by whatever the price did in between. Downloading what is actually live
# makes the two publications identical rather than merely similar.
#
# Run this AFTER a push has finished deploying — it waits for the run itself.
set -euo pipefail

URL="https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/"
OUT="dist/dashboard.html"
export PATH="/opt/homebrew/bin:$PATH"

echo "Waiting for the latest workflow run to finish…"
run_id=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run_id" --exit-status --interval 5 >/dev/null 2>&1 || {
  echo "The deploy failed — not mirroring a broken page. Check: gh run view $run_id --log-failed" >&2
  exit 1
}
echo "Deploy succeeded (run $run_id)."

# Pages can serve the previous version for a few seconds after the run reports
# success, so poll until the deployed copy stops changing.
echo "Fetching the live page…"
mkdir -p dist
prev=""
for attempt in $(seq 1 12); do
  curl -fsSL --max-time 30 "$URL" -o "$OUT.tmp"
  now=$(shasum -a 256 "$OUT.tmp" | cut -d' ' -f1)
  if [ "$now" = "$prev" ]; then break; fi
  prev="$now"
  sleep 5
done

# Never overwrite a good artifact with a broken download. Check structure, not
# copy: an earlier version grepped the page headline and started refusing to
# mirror the day that headline was reworded.
test -s "$OUT.tmp" || { echo "Downloaded page is empty — aborting." >&2; exit 1; }
bytes=$(wc -c < "$OUT.tmp")
[ "$bytes" -gt 100000 ] || { echo "Downloaded page is only $bytes bytes — aborting." >&2; exit 1; }
grep -q '<title>' "$OUT.tmp" || { echo "Downloaded page has no <title> — aborting." >&2; exit 1; }
grep -q 'const DATA = {' "$OUT.tmp" || { echo "Downloaded page has no data blob — aborting." >&2; exit 1; }
grep -q '"mvrv"' "$OUT.tmp" || { echo "Downloaded page has no metric data — aborting." >&2; exit 1; }

mv "$OUT.tmp" "$OUT"
echo
echo "Mirrored $(wc -c < "$OUT" | tr -d ' ') bytes into $OUT"
echo "sha256:  $(shasum -a 256 "$OUT" | cut -d' ' -f1)"
echo
echo "Now republish the Artifact from $OUT to keep every copy identical."
