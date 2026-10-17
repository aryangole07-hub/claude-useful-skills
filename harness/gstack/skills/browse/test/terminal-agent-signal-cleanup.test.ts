import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GSTACK_EXTENSION_ID } from '../src/extension-id';
import { ownedGroupMembers, ptyGroupIdentity, reapOwnedGroup, type PtyGroupIdentity } from '../src/terminal-agent';
import { PTY_SHUTDOWN_GRACE_MS } from '../src/terminal-pty-lifecycle';

const AGENT_SCRIPT = path.join(import.meta.dir, '../src/terminal-agent.ts');
const EXT_ORIGIN = `chrome-extension://${GSTACK_EXTENSION_ID}`;
const linux = process.platform === 'linux';
// The agent's graceful shutdown is its SIGTERM/SIGINT handler (terminal-agent.ts
// cleanup). On Windows, Bun's subprocess.kill('SIGTERM') is TerminateProcess, so
// that handler never runs, and the PTY fixture is a bash shebang script that
// CreateProcess cannot launch: the signal-driven tests are POSIX-scoped.
const posixSignals = process.platform !== 'win32';

function waitForFile(file: string, timeoutMs = 5000): string {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return value;
    } catch {}
    Bun.sleepSync(25);
  }
  throw new Error(`timed out waiting for ${path.basename(file)}`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch (err: any) {
    return err?.code === 'EPERM';
  }
  // An orphan that was killed can linger as a zombie until its reaper runs.
  try { return !/^\d+ \(.*\) Z /s.test(fs.readFileSync(`/proc/${pid}/stat`, 'utf8')); } catch { return true; }
}

/** Start a real terminal-agent whose PTY runs `script`, open one session, and return the pids the script recorded. */
async function withAgent(script: string[], pidFiles: string[], body: (ctx: { agent: any; pids: number[]; stateDir: string }) => Promise<void>) {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-term-signal-'));
  const stateFile = path.join(stateDir, 'browse.json');
  const terminalCli = path.join(stateDir, 'terminal-cli');
  let agent: any;
  let ws: WebSocket | null = null;
  const pids: number[] = [];
  try {
    fs.writeFileSync(stateFile, JSON.stringify({ token: 'test-browse-token' }));
    fs.writeFileSync(terminalCli, ['#!/bin/bash', 'shift 2', ...script, ''].join('\n'));
    fs.chmodSync(terminalCli, 0o755);
    agent = Bun.spawn([process.execPath, 'run', AGENT_SCRIPT], {
      env: {
        ...process.env,
        BROWSE_STATE_FILE: stateFile,
        BROWSE_SERVER_PORT: '0',
        BROWSE_TERMINAL_BINARY: terminalCli,
        GSTACK_STATE_ROOT: stateDir,
        GSTACK_TEST_PID_DIR: stateDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const port = Number(waitForFile(path.join(stateDir, 'terminal-port')));
    const internalToken = waitForFile(path.join(stateDir, 'terminal-internal-token'));
    const attachToken = 'signal-cleanup-token-at-least-seventeen';
    const grant = await fetch(`http://127.0.0.1:${port}/internal/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${internalToken}` },
      body: JSON.stringify({ token: attachToken, sessionId: 'signal-cleanup-session' }),
    });
    expect(grant.status).toBe(200);
    ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { Origin: EXT_ORIGIN, Cookie: `gstack_pty=${attachToken}` } } as any);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('websocket did not open')), 5000);
      ws!.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      ws!.addEventListener('error', () => { clearTimeout(timer); reject(new Error('websocket failed')); });
    });
    ws.send(new Uint8Array([10]));
    for (const name of pidFiles) pids.push(Number(waitForFile(path.join(stateDir, name))));
    await body({ agent, pids, stateDir });
  } finally {
    try { ws?.close(); } catch {}
    try { agent?.kill?.('SIGKILL'); } catch {}
    for (const pid of pids) if (isAlive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    try { fs.rmSync(stateDir, { recursive: true, force: true }); } catch {}
  }
}

async function terminateAndWait(agent: any): Promise<number> {
  const started = Date.now();
  agent.kill('SIGTERM');
  await Promise.race([
    agent.exited,
    Bun.sleep(PTY_SHUTDOWN_GRACE_MS + 3000).then(() => { throw new Error('terminal-agent did not exit'); }),
  ]);
  return started;
}

/** Poll until every pid is dead or the deadline passes. */
async function allDeadBy(pids: number[], deadline: number): Promise<boolean> {
  while (Date.now() < deadline) {
    if (pids.every(pid => !isAlive(pid))) return true;
    await Bun.sleep(50);
  }
  return pids.every(pid => !isAlive(pid));
}

const HUP_IMMUNE_GRANDCHILD = `( trap '' INT TERM HUP; echo "$BASHPID" > "$GSTACK_TEST_PID_DIR/grandchild.pid"; while :; do sleep 1; done ) &`;

describe('terminal-agent shutdown reaps its PTY process groups (#3147)', () => {
  test.skipIf(!posixSignals)('SIGTERM reaps every active PTY child before terminal-agent exits', async () => {
    await withAgent([
      'echo "$$" > "$GSTACK_TEST_PID_DIR/pty-child.pid"',
      "trap '' INT TERM HUP",
      'while :; do sleep 1; done',
    ], ['pty-child.pid'], async ({ agent, pids }) => {
      expect(isAlive(pids[0]!)).toBe(true);
      await terminateAndWait(agent);
      expect(isAlive(pids[0]!)).toBe(false);
    });
  }, 15_000);

  test.skipIf(!linux)('a HUP-immune grandchild is dead within the grace period plus one second', async () => {
    await withAgent([
      'echo "$$" > "$GSTACK_TEST_PID_DIR/pty-child.pid"',
      HUP_IMMUNE_GRANDCHILD,
      "trap '' INT TERM HUP",
      'while :; do sleep 1; done',
    ], ['pty-child.pid', 'grandchild.pid'], async ({ agent, pids }) => {
      expect(pids.every(isAlive)).toBe(true);
      const started = await terminateAndWait(agent);
      expect(await allDeadBy(pids, started + PTY_SHUTDOWN_GRACE_MS + 1000)).toBe(true);
    });
  }, 15_000);

  test.skipIf(!linux)('a descendant that survives its early-exiting leader is still reaped at shutdown', async () => {
    await withAgent([
      HUP_IMMUNE_GRANDCHILD,
      'while [ ! -s "$GSTACK_TEST_PID_DIR/grandchild.pid" ]; do sleep 0.05; done',
      'echo "$$" > "$GSTACK_TEST_PID_DIR/pty-child.pid"',
      'exit 0',
    ], ['pty-child.pid', 'grandchild.pid'], async ({ agent, pids }) => {
      const [leader, grandchild] = pids as [number, number];
      expect(await allDeadBy([leader], Date.now() + 3000)).toBe(true);
      expect(isAlive(grandchild)).toBe(true);
      const started = await terminateAndWait(agent);
      expect(await allDeadBy([grandchild], started + PTY_SHUTDOWN_GRACE_MS + 1000)).toBe(true);
    });
  }, 20_000);

  test.skipIf(!linux)('a session that already completed before shutdown still has its group reaped', async () => {
    await withAgent([
      HUP_IMMUNE_GRANDCHILD,
      'while [ ! -s "$GSTACK_TEST_PID_DIR/grandchild.pid" ]; do sleep 0.05; done',
      'exec 0<&- 1>&- 2>&-',
      'echo "$$" > "$GSTACK_TEST_PID_DIR/pty-child.pid"',
      'exit 0',
    ], ['pty-child.pid', 'grandchild.pid'], async ({ agent, pids }) => {
      const [leader, grandchild] = pids as [number, number];
      expect(await allDeadBy([leader], Date.now() + 3000)).toBe(true);
      // Past the drain grace the session is complete and disposed; its delayed group reap is still pending.
      await Bun.sleep(PTY_SHUTDOWN_GRACE_MS + 300);
      expect(isAlive(grandchild)).toBe(true);
      const started = await terminateAndWait(agent);
      expect(await allDeadBy([grandchild], started + PTY_SHUTDOWN_GRACE_MS + 1000)).toBe(true);
    });
  }, 25_000);
});

describe('PTY process-group ownership', () => {
  /** A fake /proc: pid → [state, pgrp, session, starttime]. */
  function fakeProc(rows: Record<number, [string, number, number, number]>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-fake-proc-'));
    for (const [pid, [state, pgrp, session, start]] of Object.entries(rows)) {
      fs.mkdirSync(path.join(root, pid));
      const fields = [state, '1', String(pgrp), String(session), ...Array(15).fill('0'), String(start)];
      fs.writeFileSync(path.join(root, pid, 'stat'), `${pid} (a b) ${fields.join(' ')} 0 0\n`);
    }
    fs.mkdirSync(path.join(root, 'self'));
    return root;
  }

  test('identity requires a session and group leader', () => {
    const proc = fakeProc({ 100: ['S', 100, 100, 5000], 200: ['S', 150, 150, 5000] });
    try {
      expect(ptyGroupIdentity(100, proc)).toEqual({ pgid: 100, sid: 100, startTime: 5000 });
      expect(ptyGroupIdentity(200, proc)).toBeNull();
      expect(ptyGroupIdentity(300, proc)).toBeNull();
    } finally { fs.rmSync(proc, { recursive: true, force: true }); }
  });

  test('after the leader exits, only same-group same-session descendants are signalled; a foreign group never is', () => {
    const id: PtyGroupIdentity = { pgid: 100, sid: 100, startTime: 5000 };
    const proc = fakeProc({
      101: ['S', 100, 100, 5100],
      102: ['Z', 100, 100, 5200],
      103: ['S', 300, 300, 5300],
      104: ['S', 104, 100, 5400],
      105: ['S', 100, 999, 5500],
    });
    const signalled: number[] = [];
    try {
      expect(reapOwnedGroup(id, proc, pid => { signalled.push(pid); })).toBe(1);
      expect(signalled).toEqual([101]);
    } finally { fs.rmSync(proc, { recursive: true, force: true }); }
  });

  test('a reused leader PID (another start time) means nothing is signalled', () => {
    const id: PtyGroupIdentity = { pgid: 100, sid: 100, startTime: 5000 };
    const proc = fakeProc({ 100: ['S', 100, 100, 9000], 101: ['S', 100, 100, 9100] });
    const signalled: number[] = [];
    try {
      expect(ownedGroupMembers(id, proc)).toEqual([]);
      expect(reapOwnedGroup(id, proc, pid => { signalled.push(pid); })).toBe(0);
      expect(signalled).toEqual([]);
    } finally { fs.rmSync(proc, { recursive: true, force: true }); }
  });
});
