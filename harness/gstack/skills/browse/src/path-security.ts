/**
 * Shared path validation — single source of truth for file path security.
 *
 * Previously duplicated across write-commands.ts, meta-commands.ts, and read-commands.ts.
 * All file I/O commands (screenshot, pdf, download, scrape, archive, eval) must
 * validate paths through these functions.
 *
 *   validateOutputPath(path)   — for writing files (screenshot, pdf, download, scrape, archive)
 *   validateReadPath(path)     — for reading files (eval)
 *   validateTempPath(path)     — for serving files to remote agents (GET /file, TEMP_DIR only)
 *
 * Security invariants:
 *   1. All paths resolved to absolute before checking
 *   2. Symlinks resolved to catch traversal via symlink inside safe dir
 *   3. SAFE_DIRECTORIES = [...TEMP_DIRS, cwd] for local commands (TEMP_DIRS =
 *      classic TEMP_DIR plus os.tmpdir(), which differ on macOS and under
 *      TMPDIR-honoring CI/sandbox environments)
 *   4. TEMP_ONLY = [TEMP_DIR] for remote file serving (prevents project file exfil)
 *   5. Safe directories and targets go through the same realpath (#3104):
 *      on Windows `fs.realpathSync` keeps an 8.3 short name such as
 *      C:\Users\BURCIN~1 while `fs.realpathSync.native` expands it, so mixing
 *      them rejected paths inside the temp dir. Resolved paths compare exactly;
 *      only a tail that does not exist yet is case-folded on Windows.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TEMP_DIR, TEMP_DIRS, isPathWithin } from './platform';

const realpath = fs.realpathSync.native;
const foldMissing = (component: string) => process.platform === 'win32' ? component.toLowerCase() : component;

/**
 * Resolve the longest existing prefix of `filePath` with the one realpath
 * function and append the missing tail, case-folded on Windows. Throws for
 * resolution errors other than ENOENT.
 */
export function resolveRealPath(filePath: string): string {
  const absolute = path.resolve(filePath);
  try {
    return realpath(absolute);
  } catch (err: any) {
    const parent = path.dirname(absolute);
    if (err?.code !== 'ENOENT' || parent === absolute) throw err;
    return path.join(resolveRealPath(parent), foldMissing(path.basename(absolute)));
  }
}

const resolveSafeDir = (dir: string) => {
  try { return resolveRealPath(dir); } catch { return path.resolve(dir); }
};

// Resolved like every target, so symlinks (macOS /tmp → /private/tmp) and
// Windows 8.3 names compare equal.
export const SAFE_DIRECTORIES = [...TEMP_DIRS, process.cwd()].map(resolveSafeDir);

const TEMP_ONLY = [TEMP_DIR].map(resolveSafeDir);

/**
 * Validate a file path for writing (screenshot, pdf, download, scrape, archive).
 *
 * Walks the path one component at a time the way the kernel will, resolving
 * every existing component (symlinks included) before applying the next, so
 * `link/../x` follows `link` first. A component that does not exist yet must
 * already sit inside a safe directory; a dangling symlink is rejected because
 * a write would create its target. Both the caller's spelling and its lexical
 * normalization are checked, since callers write with either.
 */
export function validateOutputPath(filePath: string): void {
  const reject = () => { throw new Error(`Path must be within: ${SAFE_DIRECTORIES.join(', ')}`); };
  for (const spelling of new Set([filePath, path.resolve(filePath)])) {
    const root = path.parse(spelling).root;
    let resolved = path.resolve(root || '.');
    for (const component of spelling.slice(root.length).split(process.platform === 'win32' ? /[\\/]+/ : /\/+/)) {
      if (!component || component === '.') continue;
      if (component === '..') {
        resolved = path.dirname(resolved);
        continue;
      }
      const next = path.join(resolved, component);
      try {
        fs.lstatSync(next);
      } catch (err: any) {
        resolved = path.join(resolved, foldMissing(component));
        if (err?.code === 'ENOENT' && SAFE_DIRECTORIES.some(dir => isPathWithin(resolved, dir))) continue;
        reject();
      }
      try {
        resolved = realpath(next);
      } catch {
        reject();
      }
    }
    if (!SAFE_DIRECTORIES.some(dir => isPathWithin(resolved, dir))) reject();
  }
}

/** Validate a file path for reading (eval command). */
export function validateReadPath(filePath: string): void {
  let realPath: string;
  try {
    realPath = resolveRealPath(filePath);
  } catch (err: any) {
    throw new Error(`Cannot resolve real path: ${filePath} (${err.code})`);
  }
  const isSafe = SAFE_DIRECTORIES.some(dir => isPathWithin(realPath, dir));
  if (!isSafe) {
    throw new Error(`Path must be within: ${SAFE_DIRECTORIES.join(', ')}`);
  }
}

/** Validate a file path for remote serving (GET /file). TEMP_DIR only, not cwd. */
export function validateTempPath(filePath: string): void {
  let realPath: string;
  try {
    realPath = realpath(path.resolve(filePath));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw new Error(`Cannot resolve path: ${filePath}`);
  }
  const isSafe = TEMP_ONLY.some(dir => isPathWithin(realPath, dir));
  if (!isSafe) {
    throw new Error(`Path must be within: ${TEMP_ONLY.join(', ')} (remote file serving is restricted to temp directory)`);
  }
}

/** Escape special regex metacharacters in a user-supplied string to prevent ReDoS. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
