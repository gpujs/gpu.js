// Compares a TAP run against the known-failures baseline.
// Usage: node compare-test-failures.js <tap-output-file> <baseline-file>
//
// The suite has platform-dependent failures on Mesa/llvmpipe (mostly
// float-packing precision in 'unsigned precision' modes) that predate CI —
// see .github/known-test-failures.txt. This script fails the build only on
// failures that are not in that baseline, so regressions are caught without
// the noise of the pre-existing set. Lines in the baseline that no longer
// fail are reported as candidates for removal.
const fs = require('fs');

const [tapFile, baselineFile] = process.argv.slice(2);
const tap = fs.readFileSync(tapFile, 'utf8');

if (!/^# (pass|fail)\s+\d+$/m.test(tap)) {
  console.error('Test run did not complete (no TAP summary found)');
  process.exit(1);
}

const failed = new Set();
for (const line of tap.split('\n')) {
  const match = line.match(/^not ok \d+ (.*)$/);
  if (match) failed.add(match[1].trim());
}

const baseline = new Set(
  fs.readFileSync(baselineFile, 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))
);

const newFailures = [...failed].filter(name => !baseline.has(name));
const fixed = [...baseline].filter(name => !failed.has(name));

console.log(`${failed.size} failures (${baseline.size} in baseline)`);
if (fixed.length) {
  console.log(`\n${fixed.length} baseline entries did not fail this run (flaky or fixed - remove from baseline if consistent):`);
  fixed.forEach(name => console.log(`  - ${name}`));
}
if (newFailures.length) {
  console.error(`\n${newFailures.length} NEW failures not in the baseline:`);
  newFailures.forEach(name => console.error(`  ! ${name}`));
  process.exit(1);
}
console.log('\nNo new failures.');
