// Checks the game before a commit:  node tools/check.mjs
//  1. every js/*.js parses as an ES module (node --check on a .mjs copy)
//  2. every js/*.js is listed in version.json "files" (the updater / service worker cache list)
//  3. every js/*.js has a <link rel="modulepreload"> in index.html, AFTER the import map
// Prints problems only; exits 1 if there are any.
import { readFileSync, readdirSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).sort();
const problems = [];

// 1. Syntax
const tmp = mkdtempSync(join(tmpdir(), 'gg3d-check-'));
for (const f of js) {
  const copy = join(tmp, f.replace(/\.js$/, '.mjs'));
  copyFileSync(join(root, 'js', f), copy);
  try { execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' }); } catch (e) {
    problems.push(`syntax: js/${f}\n${String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')}`);
  }
}
rmSync(tmp, { recursive: true, force: true });

// 2. version.json files list
const ver = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'));
for (const f of js) if (!ver.files.includes('js/' + f)) problems.push(`version.json: js/${f} is not in "files" (run tools/release.mjs, it adds it)`);
for (const f of ver.files) if (f.startsWith('js/') && !js.includes(f.slice(3))) problems.push(`version.json: lists ${f}, which doesn't exist`);

// 3. modulepreload lines (after the import map, or `three` stops resolving)
const html = readFileSync(join(root, 'index.html'), 'utf8');
const mapAt = html.indexOf('type="importmap"');
for (const f of js) {
  const at = html.indexOf(`<link rel="modulepreload" href="js/${f}">`);
  if (at < 0) problems.push(`index.html: no <link rel="modulepreload" href="js/${f}">`);
  else if (mapAt >= 0 && at < mapAt) problems.push(`index.html: the modulepreload for js/${f} is before the import map`);
}

// 4. version.js and version.json agree
const vjs = (readFileSync(join(root, 'js/version.js'), 'utf8').match(/APP_VERSION = '([^']+)'/) || [])[1];
if (vjs !== ver.version) problems.push(`version mismatch: js/version.js has ${vjs}, version.json has ${ver.version}`);

if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log(`OK: ${js.length} js files, version ${ver.version}`);
