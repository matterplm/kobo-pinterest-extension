// Pre-package sanity check. There is no build step — Chrome loads the source
// directly — so this is the only gate between an edit and a broken install.

import { readFileSync, existsSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`  ✗ ${message}`);
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

/* ------------------------------------------------------------- manifest -- */

console.log('\nmanifest');
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

const referenced = [
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap(entry => [...(entry.js || []), ...(entry.css || [])]),
  manifest.action.default_popup,
  manifest.options_page,
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon),
];

const missing = [...new Set(referenced)].filter(path => !existsSync(path));
missing.length ? missing.forEach(path => fail(`referenced but missing: ${path}`)) : pass(`${referenced.length} referenced files present`);

if (manifest.background.type !== 'module') {
  fail('background.service_worker uses ES imports and needs "type": "module"');
} else {
  pass('service worker declared as a module');
}

/* --------------------------------------------------------------- syntax -- */

console.log('\nsyntax');
const moduleFiles = ['lib', 'background', 'popup', 'options', 'scripts'];
const classicFiles = ['content'];

function jsIn(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .map(name => join(dir, name))
    .filter(path => statSync(path).isFile() && ['.js', '.mjs'].includes(extname(path)));
}

function checkSyntax(path, asModule) {
  const temp = `.check-tmp${asModule ? '.mjs' : '.js'}`;
  writeFileSync(temp, readFileSync(path));

  try {
    execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' });
    pass(path);
  } catch (error) {
    fail(`${path}\n${error.stderr?.toString().split('\n').slice(0, 4).join('\n')}`);
  } finally {
    unlinkSync(temp);
  }
}

moduleFiles.flatMap(jsIn).forEach(path => checkSyntax(path, true));
classicFiles.flatMap(jsIn).forEach(path => checkSyntax(path, false));

/* ----------------------------------------------------------- hardcoding -- */

console.log('\nhosts');
// Every API/app host must come from lib/config.js. A stray hardcoded host is
// exactly how v1 ended up talking to a decommissioned Cloudways box.
const offenders = [];
[...moduleFiles, ...classicFiles].flatMap(jsIn).forEach(path => {
  if (path === 'lib/config.js') return;

  const source = readFileSync(path, 'utf8');
  // w3.org is the SVG/XML namespace identifier, never a fetched host.
  const IGNORED = /^https?:\/\/(www\.)?(w3\.org|fonts\.(googleapis|gstatic)\.com)/i;
  const hosts = source.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) || [];

  hosts.filter(host => !IGNORED.test(host)).forEach(host => offenders.push(`${path}: ${host}`));
});

offenders.length ? offenders.forEach(fail) : pass('no hardcoded hosts outside lib/config.js');

/* ------------------------------------------------------ shadow-dom css -- */

// The sheet lives in a shadow root, so a class with no matching rule fails
// silently — it just renders unstyled. Cross-check both directions.
console.log('\nshadow-dom classes');
{
  const js = readFileSync('content/content-script.js', 'utf8');
  const css = readFileSync('content/styles.js', 'utf8');

  const used = new Set();
  const collect = (pattern, group = 1) => {
    for (const match of js.matchAll(pattern)) {
      match[group].split(/\s+/).filter(Boolean).forEach(name => used.add(name));
    }
  };

  collect(/el\(\s*'[a-z]+'\s*,\s*'([^']*)'/g);
  collect(/className\s*=\s*'([^']*)'/g);
  collect(/classList\.(?:add|toggle|remove)\('([^']+)'/g, 1);
  collect(/class="([^"]*)"/g);

  const defined = new Set([...css.matchAll(/\.([a-z][a-z0-9-]*)/g)].map(match => match[1]));
  const unstyled = [...used].filter(name => !defined.has(name)).sort();

  unstyled.length
    ? unstyled.forEach(name => fail(`.${name} is applied in the sheet but has no style rule`))
    : pass(`${used.size} classes all have style rules`);
}

/* ------------------------------------------------------- inline reset -- */

// `all: initial` in an inline style on the shadow host outranks the :host rule
// and silently resets font-family to a serif. It has caused the whole sheet to
// render in Times once already; this stops it coming back.
console.log('\ninline reset');
{
  // Strip comments first — the fix is documented in a comment that mentions the
  // very string being banned, and prose must not trip the guard.
  const source = readFileSync('content/content-script.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /all\s*:\s*initial/.test(source)
    ? fail('content-script.js sets `all: initial` — this resets font-family to a serif on the shadow host')
    : pass('no `all: initial` on the shadow host');
}

console.log(failures ? `\n${failures} problem(s) found\n` : '\nAll checks passed\n');
process.exit(failures ? 1 : 0);
