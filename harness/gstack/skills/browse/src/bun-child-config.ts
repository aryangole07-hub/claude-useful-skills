/**
 * The `--config` file for every Bun child browse spawns (#3085). The child
 * runs in the user's project, where Bun would otherwise load that project's
 * bunfig.toml, whose preload runs code. POSIX passes /dev/null. Windows has no
 * /dev/null and `--config=NUL` panicked Bun 1.3.10 while parsing the flag, so
 * Windows gets an empty bunfig created exclusively in a private directory and
 * re-checked to be a zero-byte regular file before each spawn; anything else
 * is replaced, so the file cannot become a preload vector.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let emptyConfig: string | null = null;

function isEmptyRegularFile(file: string): boolean {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && stat.size === 0;
  } catch {
    return false;
  }
}

export function emptyBunConfig(platform: NodeJS.Platform = process.platform): string {
  if (platform !== 'win32') return '/dev/null';
  if (emptyConfig && isEmptyRegularFile(emptyConfig)) return emptyConfig;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-bunfig-'));
  const file = path.join(dir, 'bunfig.toml');
  fs.closeSync(fs.openSync(file, 'wx', 0o600));
  if (!isEmptyRegularFile(file)) throw new Error(`empty Bun config ${file} is not a zero-byte file`);
  process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  emptyConfig = file;
  return file;
}
