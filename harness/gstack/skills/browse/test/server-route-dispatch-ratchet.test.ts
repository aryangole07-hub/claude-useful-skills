/**
 * Ratchet (b): browse routes are dispatched only by the route table.
 *
 * Scans buildFetchHandler's listener code (browse/src/server.ts) and the
 * route modules (browse/src/routes/*.ts) for pathname comparisons. Every one
 * must be the table's matcher or the tunnel-surface filter, listed with a
 * reason in browse/test/fixtures/route-dispatch-allowlist.json (keyed on file
 * plus matched line text, never line numbers). terminal-agent.ts, cli.ts and
 * memory-command.ts are separate listeners and out of scope. Also checks that
 * every table entry declares auth and surfaces and that gstack registers no
 * beforeRoute overlay of its own (overlays are for embedders).
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ROUTES } from '../src/routes';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const ALLOWLIST_PATH = 'browse/test/fixtures/route-dispatch-allowlist.json';

interface AllowEntry { file: string; match: string; reason?: string }
interface Violation { file: string; line: number; text: string }

const PATHNAME_DISPATCH = /\bpathname\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*(?:url\.)?pathname\b|\bpathname\.startsWith\(|\.has\(\s*(?:url\.)?pathname\s*\)/;
const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*)/;

export function scanRouteDispatch(files: Array<{ file: string; source: string }>, allowlist: AllowEntry[]): Violation[] {
  const allowed = new Set(allowlist.map(e => `${e.file}\0${e.match}`));
  const violations: Violation[] = [];
  for (const { file, source } of files) {
    source.split('\n').forEach((raw, i) => {
      if (COMMENT_LINE.test(raw) || !PATHNAME_DISPATCH.test(raw)) return;
      const text = raw.trim();
      if (!allowed.has(`${file}\0${text}`)) violations.push({ file, line: i + 1, text });
    });
  }
  return violations;
}

export function formatViolations(violations: Violation[]): string {
  return [
    'Route dispatch outside the browse route table:',
    ...violations.map(v => `  ${v.file}:${v.line}  ${v.text}`),
    'Rule: every browse HTTP route is dispatched by the route table, because an inline pathname check bypasses the one auth gate and the declared surfaces.',
    'Fix: add a route-table entry with auth and surfaces (shape in browse/src/routes/table.ts) instead of comparing url.pathname.',
    `Allowlist: ${ALLOWLIST_PATH} — only for the tunnel-surface filter and the table's own matcher; every entry needs a reason.`,
  ].join('\n');
}

function entriesWithoutReason(allowlist: AllowEntry[]): AllowEntry[] {
  return allowlist.filter(e => typeof e.reason !== 'string' || e.reason.trim().length === 0);
}

function listenerSources(): Array<{ file: string; source: string }> {
  const routeDir = path.join(ROOT, 'browse/src/routes');
  const files = ['browse/src/server.ts', ...fs.readdirSync(routeDir).filter(f => f.endsWith('.ts')).map(f => `browse/src/routes/${f}`)];
  return files.map(file => ({ file, source: fs.readFileSync(path.join(ROOT, file), 'utf-8') }));
}

const ALLOWLIST: AllowEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, ALLOWLIST_PATH), 'utf-8'));

describe('ratchet (b): route dispatch goes through the table', () => {
  test('no pathname comparison outside the table matcher and the tunnel filter', () => {
    const violations = scanRouteDispatch(listenerSources(), ALLOWLIST);
    if (violations.length) throw new Error(formatViolations(violations));
  });

  test('every allowlist entry carries a reason and still matches a line', () => {
    const missing = entriesWithoutReason(ALLOWLIST);
    if (missing.length) throw new Error(`Allowlist entries without a reason in ${ALLOWLIST_PATH}:\n${missing.map(e => `  ${e.file}  ${e.match}`).join('\n')}`);
    const sources = new Map(listenerSources().map(s => [s.file, s.source.split('\n').map(l => l.trim())]));
    for (const e of ALLOWLIST) expect(sources.get(e.file)?.includes(e.match), `${e.file}  ${e.match}`).toBe(true);
  });

  test('every table entry declares auth and surfaces', () => {
    for (const r of ROUTES) {
      expect(typeof r.auth, `${r.method} ${r.path}`).toBe('string');
      expect(Array.isArray(r.surfaces) && r.surfaces.length > 0, `${r.method} ${r.path}`).toBe(true);
    }
  });

  test('gstack registers no beforeRoute overlay of its own', () => {
    const code = fs.readFileSync(path.join(ROOT, 'browse/src/server.ts'), 'utf-8')
      .split('\n').filter(l => !COMMENT_LINE.test(l)).join('\n');
    expect(code).not.toMatch(/\bbeforeRoute\s*:/);
  });
});

describe('ratchet (b) self-test', () => {
  const planted = {
    file: 'browse/src/routes/planted.ts',
    source: [
      "import { json } from './table';",
      'export function sneaky(url: URL) {',
      "  if (url.pathname === '/backdoor') return json({ ok: true });",
      '}',
    ].join('\n'),
  };

  test('a planted inline route fails with file:line, the Fix, and the allowlist path', () => {
    const violations = scanRouteDispatch([planted], ALLOWLIST);
    expect(violations).toEqual([{ file: planted.file, line: 3, text: "if (url.pathname === '/backdoor') return json({ ok: true });" }]);
    const message = formatViolations(violations);
    expect(message).toContain("browse/src/routes/planted.ts:3  if (url.pathname === '/backdoor')");
    expect(message).toContain('Fix: add a route-table entry with auth and surfaces');
    expect(message).toContain(ALLOWLIST_PATH);
  });

  test('startsWith and Set.has dispatch are caught too; comments are not', () => {
    const source = [
      "// url.pathname === '/documented' in a comment",
      "if (url.pathname.startsWith('/prefix')) {}",
      'if (PATHS.has(url.pathname)) {}',
    ].join('\n');
    expect(scanRouteDispatch([{ file: 'x.ts', source }], []).map(v => v.line)).toEqual([2, 3]);
  });

  test('allowlist entries are keyed on text, so inserting a line above one still passes', () => {
    const entry = { file: 'browse/src/server.ts', match: 'const allowed = TUNNEL_PATHS.has(url.pathname);', reason: 'tunnel filter' };
    const shifted = { file: entry.file, source: `// new line\nconst x = 1;\n    ${entry.match}\n` };
    expect(scanRouteDispatch([shifted], [entry])).toEqual([]);
  });

  test('an allowlist entry without a reason is rejected', () => {
    expect(entriesWithoutReason([{ file: 'a.ts', match: 'x' }, { file: 'b.ts', match: 'y', reason: ' ' }, { file: 'c.ts', match: 'z', reason: 'ok' }]))
      .toEqual([{ file: 'a.ts', match: 'x' }, { file: 'b.ts', match: 'y', reason: ' ' }]);
  });
});
