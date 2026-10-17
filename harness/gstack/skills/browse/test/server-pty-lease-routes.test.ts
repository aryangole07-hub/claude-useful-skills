import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { stubRouteContext, callRoute } from './route-test-harness';
import { mintLease, validateLease } from '../src/pty-session-lease';
import { validatePtySessionToken } from '../src/pty-session-cookie';
import type { RouteContext } from '../src/routes/table';

// Server-side route behavior for the v1.44 lease + restart + dispose +
// lease-refresh wiring. The routes reach the terminal-agent only through
// RouteContext.terminal, so a stub records every grant and restart the
// daemon would send over loopback. The loopback helpers themselves
// (grantPtyToken / restartPtySession in server.ts) keep source tripwires.

const SERVER_TS = path.resolve(import.meta.path, '..', '..', 'src', 'server.ts');
const ROOT = 'lease-routes-root-token-0123456789';

function terminalContext(port: number | null = 4242, granted = true) {
  const grants: Array<{ token: string; sessionId?: string }> = [];
  const restarts: string[] = [];
  let idleResets = 0;
  const ctx = stubRouteContext({
    isRootTokenValue: (token) => token === ROOT,
    resetIdleTimer: () => { idleResets++; },
    terminal: {
      readPort: () => port,
      grantToken: async (token, sessionId) => { grants.push({ token, sessionId }); return granted; },
      restartSession: async (sessionId) => { restarts.push(sessionId); return true; },
    },
  });
  return { ctx, grants, restarts, idleResets: () => idleResets };
}

async function post(ctx: RouteContext, route: string, body?: unknown, headers?: Record<string, string>) {
  const resp = await callRoute('POST', route, ctx, { body, headers });
  return { status: resp.status, body: await resp.json() as any, headers: resp.headers };
}

describe('server: PTY lease routes (v1.44+ Commit 2)', () => {
  test('1. /pty-session returns the 4-tuple shape (sessionId, attachToken, leaseExpiresAt)', async () => {
    const t = terminalContext();
    const resp = await post(t.ctx, '/pty-session');
    expect(resp.status).toBe(200);
    expect(resp.body.terminalPort).toBe(4242);
    expect(validateLease(resp.body.sessionId).ok).toBe(true);
    expect(resp.body.leaseExpiresAt).toBeGreaterThan(Date.now());
    // The attach token is granted to the agent bound to the new sessionId.
    expect(t.grants).toEqual([{ token: resp.body.attachToken, sessionId: resp.body.sessionId }]);
    expect(validatePtySessionToken(resp.body.attachToken)).toBe(true);
    // Backward compat: legacy ptySessionToken alias preserved for one release.
    expect(resp.body.ptySessionToken).toBe(resp.body.attachToken);
    expect(resp.headers.get('set-cookie')).toContain(resp.body.attachToken);

    const notReady = await post(terminalContext(null).ctx, '/pty-session');
    expect(notReady).toMatchObject({ status: 503, body: { error: 'terminal-agent not ready' } });
    const refused = terminalContext(4242, false);
    const failed = await post(refused.ctx, '/pty-session');
    expect(failed).toMatchObject({ status: 503, body: { error: 'failed to grant terminal session' } });
    // A refused grant revokes both the token and the lease it minted.
    expect(validatePtySessionToken(refused.grants[0].token)).toBe(false);
    expect(validateLease(refused.grants[0].sessionId!).ok).toBe(false);
  });

  test('2. /pty-session/reattach validates lease + mints fresh attachToken', async () => {
    const t = terminalContext();
    // Validate-first: rejects unknown/expired sessionId with 410 Gone so
    // the client knows to fall back to a fresh /pty-session.
    expect(await post(t.ctx, '/pty-session/reattach', { sessionId: 'no-such-session' }))
      .toMatchObject({ status: 410, body: { error: 'lease expired or unknown' } });
    expect(await post(t.ctx, '/pty-session/reattach', {})).toMatchObject({ status: 410 });
    expect(t.grants).toEqual([]);
    // Mint fresh token bound to SAME sessionId.
    const lease = mintLease();
    const resp = await post(t.ctx, '/pty-session/reattach', { sessionId: lease.sessionId });
    expect(resp.status).toBe(200);
    expect(resp.body.sessionId).toBe(lease.sessionId);
    expect(t.grants).toEqual([{ token: resp.body.attachToken, sessionId: lease.sessionId }]);
  });

  test('3. /pty-restart is one transaction — dispose + revoke + fresh mint', async () => {
    const t = terminalContext();
    const old = mintLease();
    const resp = await post(t.ctx, '/pty-restart', { sessionId: old.sessionId });
    // Disposes the old session on the agent and revokes its lease...
    expect(t.restarts).toEqual([old.sessionId]);
    expect(validateLease(old.sessionId).ok).toBe(false);
    // ...then returns a fresh 4-tuple from the same handler, so the client
    // doesn't need a separate /pty-session round-trip.
    expect(resp.status).toBe(200);
    expect(resp.body.sessionId).not.toBe(old.sessionId);
    expect(validateLease(resp.body.sessionId).ok).toBe(true);
    expect(t.grants).toEqual([{ token: resp.body.attachToken, sessionId: resp.body.sessionId }]);
    expect(resp.body.leaseExpiresAt).toBeGreaterThan(Date.now());
    // Missing sessionId is non-fatal: no dispose, fresh mint still happens.
    const fresh = terminalContext();
    expect((await post(fresh.ctx, '/pty-restart', {})).status).toBe(200);
    expect(fresh.restarts).toEqual([]);
  });

  test('4. /pty-dispose accepts body-token (sendBeacon-compatible)', async () => {
    // sendBeacon can't set custom headers, so the route MUST accept the
    // auth token in the request body — and both paths must match the root
    // token, never just trust a body-supplied value.
    const lease = mintLease();
    const t = terminalContext();
    expect(await post(t.ctx, '/pty-dispose', { authToken: ROOT, sessionId: lease.sessionId }))
      .toMatchObject({ status: 200, body: { ok: true } });
    expect(t.restarts).toEqual([lease.sessionId]);
    expect(validateLease(lease.sessionId).ok).toBe(false);
    expect(await post(t.ctx, '/pty-dispose', {}, { Authorization: `Bearer ${ROOT}` })).toMatchObject({ status: 200 });
    for (const [body, headers] of [
      [{ authToken: 'not-the-root-token', sessionId: 'x' }, undefined],
      [{ sessionId: 'x' }, { Authorization: 'Bearer not-the-root-token' }],
      [{ sessionId: 'x' }, undefined],
    ] as const) {
      expect(await post(t.ctx, '/pty-dispose', body, headers as any)).toMatchObject({ status: 401, body: { error: 'Unauthorized' } });
    }
    expect(t.restarts).toEqual([lease.sessionId]);
  });

  test('5. /internal/lease-refresh resets the daemon idle timer (T6)', async () => {
    const t = terminalContext();
    // Refresh failure (unknown / expired) MUST 410, not 200, so the agent
    // knows to close the WS and force a clean re-auth.
    expect(await post(t.ctx, '/internal/lease-refresh', { sessionId: 'no-such-session' }))
      .toMatchObject({ status: 410, body: { error: 'lease expired or unknown' } });
    expect(t.idleResets()).toBe(0);
    const lease = mintLease();
    const resp = await post(t.ctx, '/internal/lease-refresh', { sessionId: lease.sessionId });
    expect(resp.status).toBe(200);
    expect(resp.body.ok).toBe(true);
    expect(resp.body.expiresAt).toBeGreaterThanOrEqual(lease.expiresAt);
    expect(t.idleResets()).toBe(1);
  });

  test('6. grantPtyToken loopback carries sessionId binding', () => {
    const src = fs.readFileSync(SERVER_TS, 'utf-8');
    expect(src).toMatch(/grantPtyToken\(token: string, sessionId\?: string\)/);
    expect(src).toContain('sessionId ? { token, sessionId } : { token }');
  });

  test('7. restartPtySession helper exists and POSTs the agent /internal/restart', () => {
    const src = fs.readFileSync(SERVER_TS, 'utf-8');
    expect(src).toMatch(/async function restartPtySession\(sessionId: string\)/);
    expect(src).toContain('/internal/restart');
    expect(src).toContain('JSON.stringify({ sessionId })');
  });
});

function sliceBetween(source: string, start: string, end: string): string {
  const i = source.indexOf(start);
  if (i === -1) throw new Error(`marker not found: ${start}`);
  const j = source.indexOf(end, i + start.length);
  if (j === -1) throw new Error(`end marker not found: ${end}`);
  return source.slice(i, j);
}
