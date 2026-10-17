/**
 * Black-box auth matrix for the browse daemon's HTTP surface.
 *
 * Drives buildFetchHandler(...).fetchLocal / fetchTunnel for every route the
 * daemon serves, on both surfaces, with no token, a wrong token, the root
 * token, a scoped token and the view-only SSE cookie. Denials assert the exact
 * status, body and content type the server returns; allowed credentials assert
 * that the response is not one of the gate denials (the handler was reached).
 *
 * This file is deliberately independent of how server.ts is organized: it was
 * written against the if-chain server and must pass unchanged against the
 * route-table server. Do not edit it to follow a refactor; a failing row here
 * means a route's observable auth behavior changed.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as crypto from 'crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildFetchHandler, GSTACK_EXTENSION_ID, type ServerConfig, type ServerHandle } from '../src/server';
import { __resetRegistry, __resetConnectRateLimit, createToken } from '../src/token-registry';
import { mintSseSessionToken, SSE_COOKIE_NAME } from '../src/sse-session-cookie';
import { BrowserManager } from '../src/browser-manager';
import { resolveConfig } from '../src/config';
import { usePrivateStateRoot } from '../../test/helpers/private-state-root';

usePrivateStateRoot();

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-route-blackbox-'));
const fixtureConfig = resolveConfig({ BROWSE_STATE_FILE: path.join(fixtureDir, 'state/browse.json') });

type Cred = 'none' | 'wrong' | 'root' | 'scoped' | 'sse-cookie';
const CREDS: Cred[] = ['none', 'wrong', 'root', 'scoped', 'sse-cookie'];

interface Denial { status: number; body: string; contentType: string }
const JSON_CT = 'application/json';
const json = (status: number, body: unknown): Denial => ({ status, body: JSON.stringify(body), contentType: JSON_CT });

const UNAUTHORIZED = json(401, { error: 'Unauthorized' });
const ROOT_REQUIRED = json(403, { error: 'Root token required' });
const FORBIDDEN = json(403, { error: 'Forbidden' });
const MINT_ROOT_ONLY = json(403, { error: 'Only the root token can mint sub-tokens' });
const TUNNEL_NOT_FOUND = json(404, { error: 'Not found' });
const TUNNEL_ROOT_REJECTED = json(403, {
  error: 'Root token rejected on tunnel surface',
  hint: 'Remote agents must pair via /connect to receive a scoped token.',
});
// A bare string Response carries no explicit Content-Type header until Bun serializes it.
const LOCAL_NOT_FOUND: Denial = { status: 404, body: 'Not found', contentType: '' };
const PICKER_ACCESS_DENIED: Denial = {
  status: 403, body: 'Access denied. Open the cookie picker from gstack.', contentType: 'text/plain',
};
const GATE_DENIALS = [UNAUTHORIZED, ROOT_REQUIRED, FORBIDDEN, MINT_ROOT_ONLY, TUNNEL_NOT_FOUND, TUNNEL_ROOT_REJECTED];

/**
 * How a route authenticates today, as observed from outside. `open` routes
 * admit every credential; the rest deny every credential except the listed
 * ones with the listed denial.
 */
type Policy =
  | { kind: 'open' }
  | { kind: 'deny'; allow: Cred[]; denial: Denial };

const OPEN: Policy = { kind: 'open' };
const ROOT_BEARER: Policy = { kind: 'deny', allow: ['root'], denial: UNAUTHORIZED };
const ROOT_TOKEN: Policy = { kind: 'deny', allow: ['root'], denial: ROOT_REQUIRED };
const SCOPED: Policy = { kind: 'deny', allow: ['root', 'scoped'], denial: UNAUTHORIZED };
const ROOT_OR_SSE_COOKIE: Policy = { kind: 'deny', allow: ['root', 'sse-cookie'], denial: UNAUTHORIZED };

interface RouteRow {
  method: string;
  path: string;
  /** Request body for every credential; keeps allowed calls on a cheap, side-effect-free branch. */
  body?: string;
  local: Policy;
  /** True for the two paths the tunnel surface admits (TUNNEL_PATHS). */
  tunnel?: 'connect' | 'command';
  /** SSE responses stream forever; the test cancels them after the status line. */
  stream?: boolean;
}

const ROUTES: RouteRow[] = [
  { method: 'GET', path: '/connect', local: OPEN, tunnel: 'connect' },
  { method: 'POST', path: '/connect', body: '{}', local: OPEN, tunnel: 'connect' },
  { method: 'GET', path: '/cookie-picker', local: { kind: 'deny', allow: [], denial: PICKER_ACCESS_DENIED } },
  { method: 'GET', path: '/cookie-picker/imported', local: ROOT_BEARER },
  { method: 'OPTIONS', path: '/cookie-picker/imported', local: OPEN },
  { method: 'GET', path: '/welcome', local: OPEN },
  { method: 'POST', path: '/extension-token', local: { kind: 'deny', allow: [], denial: FORBIDDEN } },
  { method: 'GET', path: '/health', local: OPEN },
  { method: 'POST', path: '/pty-session', local: ROOT_BEARER },
  { method: 'POST', path: '/pty-session/reattach', body: '{}', local: ROOT_BEARER },
  { method: 'POST', path: '/pty-restart', body: '{}', local: ROOT_BEARER },
  { method: 'POST', path: '/pty-dispose', body: '{}', local: ROOT_BEARER },
  { method: 'POST', path: '/internal/lease-refresh', body: '{}', local: ROOT_BEARER },
  { method: 'POST', path: '/pty-inject-scan', local: ROOT_BEARER },
  { method: 'POST', path: '/token', body: 'not json', local: { kind: 'deny', allow: ['root'], denial: MINT_ROOT_ONLY } },
  { method: 'DELETE', path: '/token/matrix-nobody', local: ROOT_TOKEN },
  { method: 'GET', path: '/agents', local: ROOT_TOKEN },
  { method: 'POST', path: '/pair', body: 'not json', local: ROOT_TOKEN },
  { method: 'POST', path: '/tunnel/start', local: ROOT_TOKEN },
  { method: 'POST', path: '/sse-session', local: ROOT_BEARER },
  { method: 'GET', path: '/refs', local: ROOT_BEARER },
  { method: 'GET', path: '/activity/stream', local: ROOT_OR_SSE_COOKIE, stream: true },
  { method: 'GET', path: '/activity/history', local: ROOT_BEARER },
  { method: 'POST', path: '/batch', body: '{"commands":[]}', local: SCOPED },
  { method: 'GET', path: '/file', local: SCOPED },
  { method: 'POST', path: '/command', body: '{"command":"__matrix_unknown__"}', local: SCOPED, tunnel: 'command' },
  { method: 'POST', path: '/inspector/pick', body: '{}', local: ROOT_BEARER },
  { method: 'GET', path: '/inspector', local: ROOT_BEARER },
  { method: 'POST', path: '/inspector/apply', body: '{}', local: ROOT_BEARER },
  { method: 'POST', path: '/inspector/reset', local: ROOT_BEARER },
  { method: 'GET', path: '/inspector/history', local: ROOT_BEARER },
  // /memory and /inspector/events sit behind the blanket root-bearer check, so
  // the SSE cookie their handlers mention never reaches them today.
  { method: 'GET', path: '/memory', local: ROOT_BEARER },
  { method: 'GET', path: '/inspector/events', local: ROOT_BEARER, stream: true },
];

/** Requests no route accepts: unknown paths and known paths with a method no route takes. */
const UNMATCHED: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/no-such-route' },
  { method: 'POST', path: '/no-such-route' },
  { method: 'GET', path: '/command' },
  { method: 'GET', path: '/pty-session' },
  { method: 'PUT', path: '/token' },
  { method: 'GET', path: '/token/someone' },
  { method: 'GET', path: '/inspector/pick' },
  { method: 'POST', path: '/inspector' },
  { method: 'PUT', path: '/connect' },
  { method: 'DELETE', path: '/command' },
];

let handle: ServerHandle;
let rootToken = '';
let scopedToken = '';
let sseCookie = '';
const savedPairAgent = process.env.GSTACK_PAIR_AGENT;

beforeAll(() => {
  // /tunnel/start's allowed branch must stop at the consent gate, never ngrok.
  process.env.GSTACK_PAIR_AGENT = 'off';
  __resetRegistry();
  rootToken = 'route-blackbox-' + crypto.randomBytes(16).toString('hex');
  const cfg: ServerConfig = {
    authToken: rootToken,
    browsePort: 34567,
    config: fixtureConfig,
    browserManager: new BrowserManager(),
    ownsTerminalAgent: false,
    startTime: Date.now(),
  };
  handle = buildFetchHandler(cfg);
  scopedToken = createToken({ clientId: 'matrix-agent', scopes: ['read', 'write'] }).token;
  sseCookie = mintSseSessionToken().token;
});

afterAll(() => {
  if (savedPairAgent === undefined) delete process.env.GSTACK_PAIR_AGENT;
  else process.env.GSTACK_PAIR_AGENT = savedPairAgent;
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

function credHeaders(cred: Cred): Record<string, string> {
  switch (cred) {
    case 'none': return {};
    case 'wrong': return { Authorization: `Bearer ${'w'.repeat(rootToken.length)}` };
    case 'root': return { Authorization: `Bearer ${rootToken}` };
    case 'scoped': return { Authorization: `Bearer ${scopedToken}` };
    case 'sse-cookie': return { Cookie: `${SSE_COOKIE_NAME}=${sseCookie}` };
  }
}

async function call(
  surface: 'local' | 'tunnel',
  method: string,
  urlPath: string,
  headers: Record<string, string>,
  body?: string,
  stream = false,
): Promise<{ status: number; body: string; contentType: string }> {
  __resetConnectRateLimit();
  const req = new Request(`http://127.0.0.1:34567${urlPath}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
  const resp = surface === 'local' ? await handle.fetchLocal(req, null) : await handle.fetchTunnel(req, null);
  const contentType = resp.headers.get('content-type') ?? '';
  if (stream && resp.status === 200) {
    await resp.body?.cancel();
    return { status: resp.status, body: '<stream>', contentType };
  }
  return { status: resp.status, body: await resp.text(), contentType };
}

function expectDenial(got: { status: number; body: string; contentType: string }, want: Denial): void {
  expect({ status: got.status, body: got.body }).toEqual({ status: want.status, body: want.body });
  expect(got.contentType).toBe(want.contentType);
}

function expectReached(got: { status: number; body: string }): void {
  for (const d of GATE_DENIALS) {
    expect(got.status === d.status && got.body === d.body, `gate denial ${d.status} ${d.body}`).toBe(false);
  }
}

function tunnelPolicy(route: RouteRow): Policy | Denial {
  if (route.tunnel === 'connect') return OPEN;
  if (route.tunnel === 'command') return { kind: 'deny', allow: ['scoped'], denial: UNAUTHORIZED };
  return TUNNEL_NOT_FOUND;
}

describe('browse route auth matrix (black-box)', () => {
  for (const route of ROUTES) {
    for (const cred of CREDS) {
      test(`local ${route.method} ${route.path} with ${cred}`, async () => {
        const got = await call('local', route.method, route.path, credHeaders(cred), route.body, route.stream);
        const p = route.local;
        if (p.kind === 'open' || p.allow.includes(cred)) expectReached(got);
        else expectDenial(got, p.denial);
      });

      test(`tunnel ${route.method} ${route.path} with ${cred}`, async () => {
        const got = await call('tunnel', route.method, route.path, credHeaders(cred), route.body, route.stream);
        const p = tunnelPolicy(route);
        if ('status' in p) return expectDenial(got, p);
        if (cred === 'root') return expectDenial(got, TUNNEL_ROOT_REJECTED);
        if (p.kind === 'open' || p.allow.includes(cred)) expectReached(got);
        else expectDenial(got, p.denial);
      });
    }
  }

  test('POST /pty-dispose accepts the root token in the body (sendBeacon path)', async () => {
    const got = await call('local', 'POST', '/pty-dispose', {}, JSON.stringify({ authToken: rootToken }));
    expect(got.status).toBe(200);
    expect(JSON.parse(got.body)).toEqual({ ok: true });
    const wrong = await call('local', 'POST', '/pty-dispose', {}, JSON.stringify({ authToken: 'w'.repeat(rootToken.length) }));
    expectDenial(wrong, UNAUTHORIZED);
  });

  test('POST /extension-token releases the token only to the pinned Origin on a loopback Host', async () => {
    const origin = `chrome-extension://${GSTACK_EXTENSION_ID}`;
    const ok = await call('local', 'POST', '/extension-token', { Origin: origin, Host: '127.0.0.1:34567' });
    expect(ok.status).toBe(200);
    expect(JSON.parse(ok.body)).toEqual({ token: rootToken });
    expectDenial(await call('local', 'POST', '/extension-token', { Origin: 'chrome-extension://someone-else', Host: '127.0.0.1:34567' }), FORBIDDEN);
    expectDenial(await call('local', 'POST', '/extension-token', { Origin: origin, Host: 'evil.example:34567' }), FORBIDDEN);
    expectDenial(await call('tunnel', 'POST', '/extension-token', { Origin: origin, Host: '127.0.0.1:34567' }), TUNNEL_NOT_FOUND);
  });

  for (const row of UNMATCHED) {
    for (const cred of CREDS) {
      test(`unmatched local ${row.method} ${row.path} with ${cred}`, async () => {
        const got = await call('local', row.method, row.path, credHeaders(cred), row.method === 'GET' ? undefined : '{}');
        expectDenial(got, cred === 'root' ? LOCAL_NOT_FOUND : UNAUTHORIZED);
      });

      test(`unmatched tunnel ${row.method} ${row.path} with ${cred}`, async () => {
        const got = await call('tunnel', row.method, row.path, credHeaders(cred), row.method === 'GET' ? undefined : '{}');
        const onTunnelPath = row.path === '/connect' || row.path === '/command';
        if (!onTunnelPath) return expectDenial(got, TUNNEL_NOT_FOUND);
        if (cred === 'root') return expectDenial(got, TUNNEL_ROOT_REJECTED);
        expectDenial(got, UNAUTHORIZED);
      });
    }
  }
});
