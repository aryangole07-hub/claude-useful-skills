/**
 * #3104: safe directories and target paths go through one realpath function.
 * On Windows `fs.realpathSync` keeps an 8.3 short temp dir (C:\Users\BURCIN~1)
 * while `fs.realpathSync.native` expands it, so a make-pdf target inside the
 * temp dir was rejected. Each case runs the validator in a child process whose
 * temp environment is the alias under test, the way the daemon computes its
 * safe directories once at startup. On POSIX the fixture lives under /var/tmp
 * because /tmp is always a safe directory there.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const VALIDATOR = path.resolve(import.meta.dir, '../src/path-security.ts');
const WIN = process.platform === 'win32';
let root = '';

beforeAll(() => {
  root = fs.realpathSync.native(fs.mkdtempSync(path.join(WIN ? os.tmpdir() : path.join(path.sep, 'var', 'tmp'), 'gstack-realpath-')));
  fs.mkdirSync(path.join(root, 'cwd'));
  fs.mkdirSync(path.join(root, 'Long Temp Directory'));
});

afterAll(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

function validate(tempDir: string, checks: Array<['output' | 'read', string]>): string[] {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  if (WIN) Object.assign(env, { TEMP: tempDir, TMP: tempDir });
  else env.TMPDIR = tempDir;
  const script = `
    const v = require(${JSON.stringify(VALIDATOR)});
    for (const [kind, target] of ${JSON.stringify(checks)}) {
      try { (kind === 'output' ? v.validateOutputPath : v.validateReadPath)(target); console.log('OK'); }
      catch (e) { console.log('REJECT ' + e.message); }
    }`;
  const result = Bun.spawnSync([process.execPath, '-e', script], { cwd: path.join(root, 'cwd'), env, stdout: 'pipe', stderr: 'pipe', timeout: 30_000 });
  expect(result.stderr.toString()).toBe('');
  return result.stdout.toString().trim().split(/\r?\n/);
}

function shortPath(dir: string): string {
  const result = Bun.spawnSync(['powershell', '-NoProfile', '-NonInteractive', '-Command',
    `(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:GSTACK_LONG_DIR).ShortPath`], {
    env: { ...process.env, GSTACK_LONG_DIR: dir }, stdout: 'pipe', stderr: 'pipe', timeout: 30_000,
  });
  return result.stdout.toString().trim();
}

describe('#3104 one realpath for safe dirs and targets', () => {
  test('a temp dir reached through an alias accepts outputs and reads inside it', () => {
    const real = path.join(root, 'Long Temp Directory');
    let alias = path.join(root, 'alias');
    if (WIN) {
      alias = shortPath(real);
      if (!alias || alias.toLowerCase() === real.toLowerCase()) {
        console.log(`[skip] 8.3 short names are disabled on this volume (${real}); the alias case cannot be built`);
        return;
      }
    } else {
      fs.symlinkSync(real, alias);
    }
    const work = path.join(alias, 'gstack-render-browse-probe');
    fs.mkdirSync(work);
    fs.writeFileSync(path.join(work, 'pdf-0.json'), '{}');
    expect(validate(alias, [
      ['output', path.join(work, 'artifact-0.pdf')],
      ['output', path.join(work, 'new-dir', 'artifact-1.pdf')],
      ['read', path.join(work, 'pdf-0.json')],
      ['read', path.join(work, 'missing-dir', 'payload.json')],
      ['output', path.join(root, 'outside.pdf')],
    ])).toEqual(['OK', 'OK', 'OK', 'OK', expect.stringMatching(/^REJECT Path must be within: /)]);
  });

  test('a missing temp dir matches a target that differs only in case on Windows, and only there', () => {
    const missing = path.join(root, 'Missing-Temp');
    const [result] = validate(missing, [['output', path.join(root, 'missing-temp', 'artifact.pdf')]]);
    if (WIN) expect(result).toBe('OK');
    else expect(result).toMatch(/^REJECT Path must be within: /);
  });

  test('existing components compare exactly after resolution', () => {
    const [result] = validate(path.join(root, 'Long Temp Directory'), [['output', path.join(root, 'Long Temp Directory-evil', 'x.pdf')]]);
    expect(result).toMatch(/^REJECT Path must be within: /);
  });
});
