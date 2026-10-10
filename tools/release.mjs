// Prepares a release:  node tools/release.mjs <version> "player-facing note" ["another note" ...]
// Version format: YYYY.MM.DD.N (N counts up within a day), e.g. 2026.10.10.15.
//  - sets APP_VERSION in js/version.js and "version" in version.json
//  - replaces the update notes (shown to players in the update pop-up)
//  - adds any new js/*.js to the "files" list
// then runs tools/check.mjs. Commit afterwards; the owner pushes (see CLAUDE.md).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [version, ...notes] = process.argv.slice(2);
if (!/^\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,4}$/.test(version || '') || !notes.length) {
  console.log('Usage: node tools/release.mjs 2026.10.10.15 "What changed, in words players understand"');
  process.exit(1);
}

const vjsPath = join(root, 'js/version.js');
writeFileSync(vjsPath, readFileSync(vjsPath, 'utf8').replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${version}'`));

// version.json keeps its hand-made layout: swap the version and notes, insert new files before js/version.js.
const vjPath = join(root, 'version.json');
let vj = readFileSync(vjPath, 'utf8');
vj = vj.replace(/"version": "[^"]+"/, `"version": "${version}"`);
const s = vj.indexOf('"notes"'), e = vj.indexOf('"files"');
vj = vj.slice(0, s) + `"notes": [\n${notes.map((n) => '    ' + JSON.stringify(n)).join(',\n')}\n  ],\n  ` + vj.slice(e);
for (const f of readdirSync(join(root, 'js')).filter((x) => x.endsWith('.js'))) {
  if (!vj.includes(`"js/${f}"`)) { vj = vj.replace('"js/version.js"', `"js/${f}", "js/version.js"`); console.log(`added js/${f} to version.json files`); }
}
writeFileSync(vjPath, vj);
JSON.parse(vj); // still valid
console.log(`version ${version}, ${notes.length} note(s)`);
execFileSync(process.execPath, [join(root, 'tools/check.mjs')], { stdio: 'inherit' });
