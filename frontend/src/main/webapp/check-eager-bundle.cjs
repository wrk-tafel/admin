#!/usr/bin/env node
// Fails the production build when the JavaScript a first visit has to download before anything
// renders grows past the ceilings below. Run as the second half of `npm run build-prod`, against the
// `dist/stats.json` that build writes.
//
// Why this exists next to `angular.json`'s `budgets` rather than as one more entry in them: the
// builder's `initial` classification is wrong for this application. Its chunk optimizer (rolldown,
// on by default from 3 lazy chunks up) re-derives which chunks the entry point pulls in and drops
// every transitively imported one on the floor, so `main.js`'s own static imports are reported as
// "Lazy chunk files" and counted towards no budget at all - while the browser fetches them before
// the login form appears. That is the whole of the gap: the `initial` budget bounds `main.js` plus
// the stylesheet, roughly a quarter of what is really loaded, and a dependency landing in one of
// those shared chunks grows the eager payload without tripping anything.
//
// Turning the optimizer off (`NG_BUILD_OPTIMIZE_CHUNKS=false`) does restore the classification, but
// it also stops the chunk merging: the same application then ships 17 eager script files instead of
// 6, which is the worse trade on the HTTP/1.1 connections production serves over. So the optimizer
// stays on and the accounting is done here instead.
//
// This checks scripts only. Stylesheets are classified correctly and stay covered by the `initial`
// budget in `angular.json`. What the browser really transfers, gzip and all, is asserted separately
// by the Lighthouse job (`lighthouserc.cjs`); this one is the deterministic build-time half.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Raw (uncompressed) bytes of every script statically reachable from the entry point, which is the
// same measure `angular.json`'s budgets use. The current payload is printed on every run; when it
// has come down for good, bring these down with it.
const MAX_EAGER_SCRIPT_BYTES_WARNING = 900 * 1024;
const MAX_EAGER_SCRIPT_BYTES_ERROR = 950 * 1024;

// Production serves over HTTP/1.1, where a browser opens at most six connections per origin and
// three of those are already spoken for by the application's permanent SSE streams. Splitting the
// eager payload into ever more files is therefore not free, however small each one gets.
const MAX_EAGER_SCRIPT_FILES = 8;

const statsPath = path.join(__dirname, 'dist', 'stats.json');
const outputDir = path.join(__dirname, 'dist', 'browser');

if (!fs.existsSync(statsPath)) {
  console.error(`No ${path.relative(__dirname, statsPath)} found - build with \`ng build --stats-json\` (see the \`build-prod\` script).`);
  process.exit(1);
}

const {outputs} = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const entry = Object.keys(outputs).find(file => /(^|[\\/])main-[^\\/]*\.js$/.test(file));
if (!entry) {
  console.error('No `main-*.js` entry point in the build stats - has the entry point been renamed?');
  process.exit(1);
}

// A `import-statement` edge is a plain `import ... from` in the emitted chunk, so everything reached
// this way is downloaded and evaluated before the entry point runs. A `dynamic-import` edge is a
// lazy route and is exactly what this must not follow.
const eager = new Set();
const queue = [entry];
while (queue.length > 0) {
  const file = queue.shift();
  if (eager.has(file) || !outputs[file]) {
    continue;
  }
  eager.add(file);
  for (const {path: imported, kind, external} of outputs[file].imports ?? []) {
    if (kind === 'import-statement' && !external) {
      queue.push(imported);
    }
  }
}

const files = [...eager]
  .map(file => {
    const contents = fs.readFileSync(path.join(outputDir, path.basename(file)));
    return {
      file: path.basename(file),
      rawBytes: contents.byteLength,
      gzipBytes: zlib.gzipSync(contents).byteLength
    };
  })
  .sort((a, b) => b.rawBytes - a.rawBytes);

const totalRaw = files.reduce((sum, {rawBytes}) => sum + rawBytes, 0);
const totalGzip = files.reduce((sum, {gzipBytes}) => sum + gzipBytes, 0);
const kb = bytes => `${(bytes / 1024).toFixed(2)} kB`;

console.log('\nEager script files (statically imported by the entry point, fetched before first render)');
for (const {file, rawBytes, gzipBytes} of files) {
  console.log(`  ${file.padEnd(24)} ${kb(rawBytes).padStart(11)} ${kb(gzipBytes).padStart(11)} gzip`);
}
console.log(`  ${`${files.length} files`.padEnd(24)} ${kb(totalRaw).padStart(11)} ${kb(totalGzip).padStart(11)} gzip\n`);

const failures = [];
if (totalRaw > MAX_EAGER_SCRIPT_BYTES_ERROR) {
  failures.push(`eager scripts exceeded maximum budget. Budget ${kb(MAX_EAGER_SCRIPT_BYTES_ERROR)} was not met by ${kb(totalRaw - MAX_EAGER_SCRIPT_BYTES_ERROR)} with a total of ${kb(totalRaw)}.`);
}
if (files.length > MAX_EAGER_SCRIPT_FILES) {
  failures.push(`eager scripts exceeded maximum file count. Budget ${MAX_EAGER_SCRIPT_FILES} files was not met by ${files.length - MAX_EAGER_SCRIPT_FILES} with a total of ${files.length}.`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`X [ERROR] ${failure}`);
  }
  process.exit(1);
}

if (totalRaw > MAX_EAGER_SCRIPT_BYTES_WARNING) {
  console.warn(`▲ [WARNING] eager scripts exceeded maximum budget. Budget ${kb(MAX_EAGER_SCRIPT_BYTES_WARNING)} was not met by ${kb(totalRaw - MAX_EAGER_SCRIPT_BYTES_WARNING)} with a total of ${kb(totalRaw)}.`);
}
