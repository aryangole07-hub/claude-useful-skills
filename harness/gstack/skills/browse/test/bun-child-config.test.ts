/**
 * #3085: `--config=NUL` panicked Bun 1.3.10 on Windows at flag parsing, and the
 * terminal-agent respawn loop turned that into a crash window every few
 * seconds. Every Bun child browse spawns now takes its `--config` from
 * emptyBunConfig(): /dev/null on POSIX, and on Windows a zero-byte bunfig in a
 * private directory that is re-checked before each spawn.
 */
import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { emptyBunConfig } from '../src/bun-child-config';
import { bunChildFlags } from '../src/terminal-agent-control';

const SRC = path.resolve(import.meta.dir, '../src');
const SPAWN_SITES = ['terminal-agent-control.ts', 'cookie-import-native.ts', 'cookie-import-native-worker.ts', 'cli.ts'];

describe('#3085 empty Bun config for spawned children', () => {
  test('POSIX keeps /dev/null', () => {
    expect(emptyBunConfig('linux')).toBe('/dev/null');
    expect(emptyBunConfig('darwin')).toBe('/dev/null');
  });

  test('Windows gets a zero-byte bunfig in a private directory, reused while it stays empty', () => {
    const file = emptyBunConfig('win32');
    expect(path.basename(file)).toBe('bunfig.toml');
    expect(path.basename(path.dirname(file))).toStartWith('gstack-bunfig-');
    expect(fs.lstatSync(file).isFile()).toBe(true);
    expect(fs.statSync(file).size).toBe(0);
    expect(emptyBunConfig('win32')).toBe(file);
  });

  test('a bunfig that gained content or was swapped for a link is replaced before the next spawn', () => {
    const tampered = emptyBunConfig('win32');
    fs.writeFileSync(tampered, '[test]\npreload = ["./evil.ts"]\n');
    const fresh = emptyBunConfig('win32');
    expect(fresh).not.toBe(tampered);
    expect(fs.statSync(fresh).size).toBe(0);

    if (process.platform === 'win32') return;
    fs.rmSync(fresh);
    fs.symlinkSync(tampered, fresh);
    const third = emptyBunConfig('win32');
    expect(third).not.toBe(fresh);
    expect(fs.lstatSync(third).isFile()).toBe(true);
    expect(fs.statSync(third).size).toBe(0);
  });

  test("a child started with the helper's config ignores the project's bunfig preload", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-bunfig-project-'));
    try {
      fs.writeFileSync(path.join(project, 'preload.ts'), 'console.log("PRELOAD_RAN");\n');
      fs.writeFileSync(path.join(project, 'bunfig.toml'), 'preload = ["./preload.ts"]\n');
      fs.writeFileSync(path.join(project, 'probe.ts'), 'console.log("PROBE_RAN");\n');
      const run = (flags: string[]) => Bun.spawnSync([process.execPath, 'run', ...flags, 'probe.ts'], { cwd: project, stdout: 'pipe', stderr: 'pipe', timeout: 30_000 }).stdout.toString();
      expect(run(['--no-env-file'])).toContain('PRELOAD_RAN');
      for (const platform of ['win32', process.platform] as NodeJS.Platform[]) {
        const out = run(['--no-env-file', `--config=${emptyBunConfig(platform)}`]);
        expect(out).toContain('PROBE_RAN');
        expect(out).not.toContain('PRELOAD_RAN');
      }
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test('bunChildFlags builds the config flag from the helper on every call', () => {
    expect(bunChildFlags()).toEqual(['--no-env-file', `--config=${emptyBunConfig()}`]);
  });

  test('no spawn passes NUL, and every --config goes through the helper', () => {
    for (const file of SPAWN_SITES) {
      const source = fs.readFileSync(path.join(SRC, file), 'utf8');
      expect(source).not.toMatch(/['"`]NUL['"`]|=NUL\b/);
      for (const flag of source.match(/['"`]--config=[^'"`]*/g) ?? []) {
        expect(`${file}: ${flag}`).toBe(`${file}: ${flag.slice(0, 1)}--config=\${emptyBunConfig()}`);
      }
    }
    const spawned = SPAWN_SITES.map(file => fs.readFileSync(path.join(SRC, file), 'utf8'));
    expect(spawned.filter(source => source.includes('${emptyBunConfig()}')).length).toBe(3);
    expect(spawned.filter(source => source.includes('...bunChildFlags()')).length).toBe(2);
  });
});
