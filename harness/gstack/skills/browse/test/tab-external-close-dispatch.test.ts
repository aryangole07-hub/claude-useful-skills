/**
 * #3167 through the real command dispatch (server.ts handleCommandInternal on
 * the module's own BrowserManager): after every tab is closed outside the CLI,
 * status and stop answer without opening a tab, other commands run on a new
 * tab and say so in one line, and a browser whose context is gone fails with
 * BROWSE_TAB_UNRECOVERABLE and the restart command while status and stop keep
 * working. Runs in a child process so `stop` and the module-level server state
 * never touch this test process.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let dir = '';
let steps: Record<string, { status: number; result: string; tabs: number }> = {};

const SCRIPT = (root: string) => `
import { __testInternals__ } from ${JSON.stringify(path.resolve(import.meta.dir, '../src/server.ts'))};
import { startTestServer } from ${JSON.stringify(path.resolve(import.meta.dir, 'test-server.ts'))};
const fixture = startTestServer(0);
const bm = __testInternals__.browserManager;
const run = (command, args = []) => __testInternals__.handleCommandInternal({ command, args }, null);
const closeEveryTab = async () => {
  while (bm.getTabCount() > 0) {
    const page = bm.getPage();
    const closed = new Promise(resolve => page.once('close', resolve));
    await page.close();
    await closed;
  }
};
const steps = {};
const record = async (name, command, args) => { const r = await run(command, args); steps[name] = { status: r.status, result: r.result, tabs: bm.getTabCount() }; };
await bm.launch();
await record('goto-first', 'goto', [fixture.url + '/basic.html']);
await closeEveryTab();
await record('status', 'status');
await record('text', 'text');
await record('text-again', 'text');
await closeEveryTab();
await record('goto', 'goto', [fixture.url + '/basic.html']);
await closeEveryTab();
await record('stop', 'stop');
await record('restart-check', 'tabs');
await bm.context.close();
await record('closed-text', 'text');
await record('closed-status', 'status');
await record('closed-stop', 'stop');
await Bun.write(${JSON.stringify(path.join(root, 'steps.json'))}, JSON.stringify(steps));
fixture.server.stop(true);
await Promise.race([bm.close(), Bun.sleep(3000)]);
process.exit(0);
`;

beforeAll(() => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'browse-external-close-')));
  fs.writeFileSync(path.join(dir, 'drive.ts'), SCRIPT(dir));
  const r = spawnSync(process.execPath, [path.join(dir, 'drive.ts')], {
    encoding: 'utf8', timeout: 90_000,
    env: { ...process.env, GSTACK_HOME: path.join(dir, 'state'), CHROMIUM_PROFILE: path.join(dir, 'profile'),
      BROWSE_STATE_FILE: path.join(dir, 'state', 'browse.json'), BROWSE_PARENT_PID: '0' },
  });
  if (!fs.existsSync(path.join(dir, 'steps.json'))) throw new Error(`driver failed (${r.status}): ${r.stderr.slice(-2000)}`);
  steps = JSON.parse(fs.readFileSync(path.join(dir, 'steps.json'), 'utf8'));
}, 120_000);
afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

const WARNING = '[browse] warning: every tab was closed outside browse, so this command ran on a new blank tab; open your page again with: browse goto <url>';

describe('external close of the last tab, through command dispatch (#3167)', () => {
  test('status answers without opening a tab', () => {
    expect(steps.status).toMatchObject({ status: 200, tabs: 0 });
    expect(steps.status.result).toContain('Status: healthy');
    expect(steps.status.result).toContain('Tabs: 0');
  });

  test('a text read after recovery runs on a new tab and shows the warning once', () => {
    expect(steps.text.status).toBe(200);
    expect(steps.text.tabs).toBe(1);
    expect(steps.text.result.split('\n')[0]).toBe(WARNING);
    expect(steps['text-again'].status).toBe(200);
    expect(steps['text-again'].result).not.toContain(WARNING);
  });

  test('goto after an external close navigates a new tab', () => {
    expect(steps.goto).toMatchObject({ status: 200, tabs: 1 });
    expect(steps.goto.result).toStartWith(`${WARNING}\n`);
    expect(steps.goto.result).toContain('basic.html');
  });

  test('stop answers without opening a tab', () => {
    expect(steps.stop).toMatchObject({ status: 200, result: 'Server stopped', tabs: 0 });
  });

  test('a closed context fails with the named error and restart command; status and stop still answer', () => {
    expect(steps['closed-text'].status).toBe(500);
    const error = JSON.parse(steps['closed-text'].result).error as string;
    expect(error).toContain('browse: every tab was closed outside browse and a new one could not be opened');
    expect(error).toContain('fix: run `browse restart`');
    expect(error).toContain('(BROWSE_TAB_UNRECOVERABLE)');
    expect(error).not.toContain('\n[');
    expect(steps['closed-status']).toMatchObject({ status: 200, tabs: 0 });
    expect(steps['closed-status'].result).toContain('Status: healthy');
    expect(steps['closed-stop']).toMatchObject({ status: 200, result: 'Server stopped' });
  });
});
