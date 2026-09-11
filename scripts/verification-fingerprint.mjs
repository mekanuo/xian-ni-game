import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/** Repository-specific production/verification input policy, not a Vite dependency
 * graph. Keep this versioned when build entrypoints or input roots change.
 * No file contents, timestamps, absolute paths or Git identity are retained.
 * Installed dependencies and process environment must be controlled by the caller.
 * QA evidence and fixtures are deliberately outside this source/tool policy: some
 * existing verification scripts generate fixtures. Their provenance needs a
 * separate read/write-aware policy; this module does not authenticate QA inputs.
 */
const POLICY = 'xian-ni-production-v1';
const REQUIRED_FILES = ['index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts'];
const REQUIRED_TREES = ['src', 'public', 'tests', 'scripts'];
const rootConfiguration = name => /^(?:tsconfig(?:\.[^.]+)*\.json|(?:vite|vitest)\.config\.(?:[cm]?[jt]s)|(?:postcss|tailwind)\.config\.(?:[cm]?[jt]s|json)|\.env(?:\..+)?|\.npmrc|\.nvmrc|\.node-version|\.browserslistrc|browserslist|npm-shrinkwrap\.json)$/.test(name);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const group = files => ({ files, sha256: hash(JSON.stringify(files.map(f => [f.path, f.bytes, f.sha256]))) });
const comparePaths = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

function validPath(path) {
  return typeof path === 'string' && path.length > 0 && !path.includes('\\') && !path.includes('\0') && !path.startsWith('/') && path.split('/').every(p => p && p !== '.' && p !== '..');
}
async function stat(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw Error(`Fingerprint refuses symbolic links: ${path}`);
  return info;
}
async function file(root, relative) {
  if (!validPath(relative)) throw Error(`Invalid fingerprint path: ${relative}`);
  const absolute = join(root, relative), before = await stat(absolute);
  if (!before.isFile()) throw Error(`Fingerprint input must be a regular file: ${relative}`);
  const bytes = await readFile(absolute), after = await stat(absolute);
  if (!after.isFile() || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || bytes.length !== after.size) throw Error(`Input changed during fingerprint capture: ${relative}`);
  return { path: relative, bytes: bytes.length, sha256: hash(bytes) };
}
async function tree(root, directory, prefix = '') {
  const absolute = join(root, directory);
  if (!(await stat(absolute)).isDirectory()) throw Error(`Fingerprint input must be a directory: ${directory}`);
  const files = [];
  for (const name of (await readdir(absolute)).sort()) {
    const diskRelative = directory ? `${directory}/${name}` : name;
    const manifestRelative = prefix ? `${prefix}/${name}` : name;
    const info = await stat(join(root, diskRelative));
    if (info.isDirectory()) files.push(...await tree(root, diskRelative, manifestRelative));
    else { const entry = await file(root, diskRelative); files.push({ ...entry, path: manifestRelative }); }
  }
  return files;
}

/** Capture only files present in this checkout. No Git/sparse-checkout traversal,
 * no network, and no build is performed. Missing required input roots fail closed;
 * optional configuration additions are discovered on every capture. Does not read
 * or require dist, so it can bind the candidate before tests/build begin.
 */
export async function captureVerificationInputs(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const inputPaths = new Set(REQUIRED_FILES);
  for (const name of await readdir(root)) if (rootConfiguration(name)) inputPaths.add(name);
  const inputs = [];
  for (const path of [...inputPaths].sort()) inputs.push(await file(root, path));
  for (const directory of REQUIRED_TREES) inputs.push(...await tree(root, directory, directory));
  inputs.sort(comparePaths);
  return group(inputs);
}

/** Capture inputs plus built output. Use captureVerificationInputs before running
 * tests/build, compare that group after building, then retain this full manifest
 * for the final verification and pre-publication checks. */
export async function captureVerificationFingerprint(repositoryRoot) {
  const root = resolve(repositoryRoot), inputs = await captureVerificationInputs(root);
  const dist = await tree(root, 'dist');
  if (!dist.some(entry => entry.path === 'index.html')) throw Error('Fingerprint requires dist/index.html from a production build');
  dist.sort(comparePaths);
  return { schemaVersion: 1, policy: POLICY, inputs, dist: group(dist) };
}

function validateManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.policy !== POLICY) throw Error('Unsupported verification fingerprint schema or policy');
  for (const name of ['inputs', 'dist']) {
    const value = manifest[name];
    if (!value || !Array.isArray(value.files) || !value.files.length || !/^[a-f0-9]{64}$/.test(value.sha256)) throw Error(`Invalid fingerprint ${name} manifest`);
    let previous;
    for (const entry of value.files) {
      if (!entry || !validPath(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256) || (previous !== undefined && previous >= entry.path)) throw Error(`Invalid, duplicate or unsorted fingerprint ${name} file`);
      previous = entry.path;
    }
    if (group(value.files).sha256 !== value.sha256) throw Error(`Fingerprint ${name} digest does not match its file manifest`);
  }
  for (const required of REQUIRED_FILES) if (!manifest.inputs.files.some(f => f.path === required)) throw Error(`Fingerprint omits required input: ${required}`);
  if (!manifest.dist.files.some(f => f.path === 'index.html')) throw Error('Fingerprint omits dist/index.html');
}
function differences(expected, current) {
  const prior = new Map(expected.files.map(f => [f.path, f])), next = new Map(current.files.map(f => [f.path, f]));
  const added = [], removed = [], changed = [];
  for (const [path, value] of next) {
    const old = prior.get(path);
    if (!old) added.push(path);
    else if (old.bytes !== value.bytes || old.sha256 !== value.sha256) changed.push(path);
  }
  for (const path of prior.keys()) if (!next.has(path)) removed.push(path);
  return { added, removed, changed };
}
/** Pure comparison; malformed/corrupt manifests throw instead of comparing equal. */
export function compareVerificationFingerprints(expected, current) {
  validateManifest(expected); validateManifest(current);
  const inputs = differences(expected.inputs, current.inputs), dist = differences(expected.dist, current.dist);
  return { ok: [...Object.values(inputs), ...Object.values(dist)].every(paths => paths.length === 0), inputs, dist };
}
/** Re-capture the checkout and dist, then reject changed input/output paths.
 * This checks byte identity only; the caller still must require a successful,
 * trustworthy verification report for this captured candidate. It is not a
 * signature, atomic filesystem snapshot, or proof that a build/test was run.
 */
export async function assertVerificationFingerprint(repositoryRoot, expected) {
  validateManifest(expected);
  const current = await captureVerificationFingerprint(repositoryRoot), difference = compareVerificationFingerprints(expected, current);
  if (!difference.ok) {
    const details = [];
    for (const name of ['inputs', 'dist']) for (const kind of ['added', 'removed', 'changed']) for (const path of difference[name][kind]) details.push(`${name} ${kind}: ${path}`);
    throw Error(`Verification fingerprint mismatch:\n${details.join('\n')}`);
  }
  return current;
}
