/**
 * Regression (#3167): closing the last tab outside the CLI (for example, the
 * user closing the headed Chromium window) must not wedge the daemon.
 *
 * The page 'close' handler removes the tab and leaves activeTabId at 0, so
 * getActiveSession() threw "No active page" for every later command,
 * including status and stop. closeTab() already opens a blank tab for the
 * last-tab case; ensureActiveTab() restores one for the external path before
 * each command runs.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BrowserManager } from '../src/browser-manager';

// Per-file Chromium profile, scoped via hooks (see commands.test.ts).
const ORIGINAL_CHROMIUM_PROFILE = process.env.CHROMIUM_PROFILE;
let profileDir: string | undefined;
let bm: BrowserManager;

beforeAll(async () => {
  profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-test-profile-'));
  process.env.CHROMIUM_PROFILE = profileDir;
  bm = new BrowserManager();
  await bm.launch();
});

afterAll(async () => {
  await bm?.close();
  if (ORIGINAL_CHROMIUM_PROFILE === undefined) delete process.env.CHROMIUM_PROFILE;
  else process.env.CHROMIUM_PROFILE = ORIGINAL_CHROMIUM_PROFILE;
  if (profileDir) {
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
});

const closeEveryTabExternally = async () => {
  // Close the Playwright pages directly, bypassing closeTab(), the way a
  // user closing the window does.
  while (bm.getTabCount() > 0) {
    const page = bm.getPage();
    const closed = new Promise<void>((resolve) => page.once('close', () => resolve()));
    await page.close();
    await closed;
  }
};

describe('external close of the last tab', () => {
  test('leaves no active session until a tab is restored', async () => {
    await bm.ensureActiveTab();
    await closeEveryTabExternally();

    expect(bm.getTabCount()).toBe(0);
    expect(() => bm.getActiveSession()).toThrow('No active page');

    await bm.ensureActiveTab();

    expect(bm.getTabCount()).toBe(1);
    expect(bm.getActiveSession().page.isClosed()).toBe(false);
  });

  test('concurrent commands restore exactly one tab', async () => {
    await closeEveryTabExternally();

    await Promise.all([bm.ensureActiveTab(), bm.ensureActiveTab(), bm.ensureActiveTab()]);

    expect(bm.getTabCount()).toBe(1);
  });

  test('keeps the existing active tab when one is open', async () => {
    await bm.ensureActiveTab();
    const before = bm.getActiveSession();

    await bm.ensureActiveTab();

    expect(bm.getActiveSession()).toBe(before);
    expect(bm.getTabCount()).toBe(1);
  });
});
