/**
 * Append-only log of tunnel-surface auth denials.
 *
 * Records every time a tunneled request is rejected by enforceTunnelPolicy
 * (root token sent over tunnel, missing scoped token, disallowed command, etc).
 * Gives operators visibility into who is actually probing their tunneled
 * daemons so the next security wave can be driven by real attack data.
 *
 * Design notes:
 * - Async via fs.promises.appendFile. NEVER appendFileSync — blocking the event
 *   loop on every denial during a flood is exactly what an attacker wants.
 *   (Prior learning: sync-audit-log-io, 10/10 confidence.)
 * - Rate-capped at 60 writes/minute globally. Excess denials are counted in
 *   memory but not written to disk — prevents disk DoS.
 * - Writes to ~/.gstack/security/attempts.jsonl, shared with the prompt-injection
 *   attempt log. File rotation is handled by the existing security pipeline.
 */
import { promises as fsp } from 'fs';
import * as path from 'path';
import { mkdirSecure } from './file-permissions';
import { resolveStateRoot } from '../../lib/state-root';

const RATE_CAP = 60; // writes per minute
const WINDOW_MS = 60_000;

const writeTimestamps: number[] = [];
let droppedSinceLastWrite = 0;
let ensuredDir: string | null = null;

async function ensureDir(dir: string): Promise<void> {
  if (ensuredDir === dir) return;
  try {
    // Sync mkdir is fine here — runs once per process at first denial. The
    // (OI)(CI) inheritance set on Windows means subsequent fsp.appendFile
    // writes pick up the owner-only ACL automatically.
    mkdirSecure(dir);
    ensuredDir = dir;
  } catch {
    // Swallow — log writes are best-effort. Failure to mkdir just means
    // subsequent appends will also fail and be caught below.
  }
}

export interface TunnelDenialEntry {
  reason: string;
  path: string;
  method: string;
  sourceIp: string;
}

export function logTunnelDenial(req: Request, url: URL, reason: string): void {
  const now = Date.now();
  // Drop stale timestamps
  while (writeTimestamps.length && writeTimestamps[0] < now - WINDOW_MS) {
    writeTimestamps.shift();
  }
  if (writeTimestamps.length >= RATE_CAP) {
    droppedSinceLastWrite += 1;
    return;
  }
  writeTimestamps.push(now);

  const sourceIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const entry: Record<string, unknown> = {
    ts: new Date(now).toISOString(),
    kind: 'tunnel_auth_denial',
    reason,
    path: url.pathname,
    method: req.method,
    sourceIp,
  };
  if (droppedSinceLastWrite > 0) {
    entry.droppedSinceLastWrite = droppedSinceLastWrite;
    droppedSinceLastWrite = 0;
  }

  // Fire and forget. Never await, never block the request path.
  void (async () => {
    try {
      const dir = path.join(resolveStateRoot(), 'security');
      await ensureDir(dir);
      await fsp.appendFile(path.join(dir, 'attempts.jsonl'), JSON.stringify(entry) + '\n');
    } catch {
      // Swallow — log writes are best-effort. If disk is full or ACLs block
      // us, we don't want to crash the server.
    }
  })();
}

// Test-only reset. Never called in production.
export function __resetTunnelDenialLog(): void {
  writeTimestamps.length = 0;
  droppedSinceLastWrite = 0;
  ensuredDir = null;
}
