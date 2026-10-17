/**
 * Route-table contract tests (stubbed handlers).
 *
 * Every entry in ROUTES runs through the real dispatcher and auth gate with a
 * stub RouteContext and stub handlers, on every surface it declares, with no
 * token, a wrong token, the root token, a scoped token, the SSE cookie and the
 * pinned extension Origin. Denials assert the exact status and body each auth
 * kind returned at 96764e8; admitted credentials assert the handler ran.
 *
 * Real-handler coverage for the same routes lives in
 * server-route-auth-blackbox.test.ts (every route, both surfaces, through
 * buildFetchHandler), plus the route-specific suites (extension-token,
 * pair-agent-e2e, server-pty-lease-routes, pty-inject-scan, dual-listener).
 */

import { describe, test, expect } from 'bun:test';
import * as crypto from 'crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ROUTES } from '../src/routes';
import {
  dispatchRoute, findRoute, UNMATCHED_ROUTE,
  type AuthKind, type RouteContext, type RouteEntry, type Surface,
} from '../src/routes/table';
import { buildFetchHandler, __testInternals__ } from '../src/server';
import { __resetRegistry } from '../src/token-registry';
import { BrowserManager } from '../src/browser-manager';
import { resolveConfig } from '../src/config';
import { usePrivateStateRoot } from '../../test/helpers/private-state-root';

usePrivateStateRoot();

type Cred = 'none' | 'wrong' | 'root' | 'scoped' | 'sse-cookie' | 'extension-origin';
const CREDS: Cred[] = ['none', 'wrong', 'root', 'scoped', 'sse-cookie', 'extension-origin'];

const ROOT = 'stub-root-token-0123456789';
const SCOPED = 'stub-scoped-token-0123456789';
const COOKIE = 'stub-sse-cookie';

function credHeaders(cred: Cred): Record<string, string> {
  switch (cred) {
    case 'none': return {};
    case 'wrong': return { Authorization: 'Bearer stub-wrong-token-0123456789' };
    case 'root': return { Authorization: `Bearer ${ROOT}` };
    case 'scoped': return { Authorization: `Bearer ${SCOPED}` };
    case 'sse-cookie': return { Cookie: `gstack_sse=${COOKIE}` };
    case 'extension-origin': return { Origin: 'pinned-extension', Host: '127.0.0.1:34567' };
  }
}

const ROOT_INFO = { clientId: 'root', scopes: ['admin'] } as any;
const SCOPED_INFO = { clientId: 'stub-agent', scopes: ['read'] } as any;

function stubContext(): RouteContext {
  const bearer = (req: Request) => req.headers.get('authorization');
  const unused = () => { throw new Error('stub handlers never reach the context'); };
  return {
    browserManager: {} as any,
    startTime: 0,
    browsePort: 34567,
    validateAuth: (req) => bearer(req) === `Bearer ${ROOT}`,
    isRootRequest: (req) => bearer(req) === `Bearer ${ROOT}`,
    getTokenInfo: (req) => bearer(req) === `Bearer ${ROOT}` ? ROOT_INFO : bearer(req) === `Bearer ${SCOPED}` ? SCOPED_INFO : null,
    hasSseCookie: (req) => req.headers.get('cookie') === `gstack_sse=${COOKIE}`,
    isPinnedExtensionRequest: (req) => req.headers.get('origin') === 'pinned-extension',
    isRootTokenValue: (token) => token === ROOT,
    bootstrapRootToken: ROOT,
    resetIdleTimer: unused,
    terminal: { readPort: unused, grantToken: unused, restartSession: unused },
    tunnel: { state: unused, close: unused, resolveAuthtoken: unused, start: unused },
    commands: { handle: unused, handleInternal: unused },
  };
}

const REACHED = 'stub-handler-reached';
function stubbed(routes: readonly RouteEntry[]): RouteEntry[] {
  return routes.map(r => ({
    ...r,
    handler: (_req, { tokenInfo }) => new Response(JSON.stringify({ reached: REACHED, tokenInfo }), { status: 299 }),
  }));
}

/** Denials exactly as the if-chain server returned them for each gate-level check at 96764e8. */
const EXPECTED_DENIAL: Record<Exclude<AuthKind, 'none' | 'handler'>, { status: number; body: string }> = {
  'root-bearer': { status: 401, body: '{"error":"Unauthorized"}' },
  'scoped': { status: 401, body: '{"error":"Unauthorized"}' },
  'root-or-sse-cookie': { status: 401, body: '{"error":"Unauthorized"}' },
  'root-token': { status: 403, body: '{"error":"Root token required"}' },
  'extension-origin': { status: 403, body: '{"error":"Forbidden"}' },
};

const ADMITTED: Record<AuthKind, Cred[]> = {
  'none': CREDS,
  'handler': CREDS,
  'root-bearer': ['root'],
  'root-token': ['root'],
  'scoped': ['root', 'scoped'],
  'root-or-sse-cookie': ['root', 'sse-cookie'],
  'extension-origin': ['extension-origin'],
};

/** Every route the daemon serves, with the auth kind and surfaces a security review signed off on. */
const EXPECTED_ROUTES: Array<[method: string, path: string, auth: AuthKind, surfaces: Surface[]]> = [
  ['GET', '/connect', 'none', ['local', 'tunnel']],
  ['POST', '/connect', 'none', ['local', 'tunnel']],
  ['*', '/cookie-picker*', 'handler', ['local']],
  ['*', '/welcome', 'none', ['local']],
  ['POST', '/extension-token', 'extension-origin', ['local']],
  ['*', '/health', 'none', ['local']],
  ['POST', '/pty-session', 'root-bearer', ['local']],
  ['POST', '/pty-session/reattach', 'root-bearer', ['local']],
  ['POST', '/pty-restart', 'root-bearer', ['local']],
  ['POST', '/pty-dispose', 'handler', ['local']],
  ['POST', '/internal/lease-refresh', 'root-bearer', ['local']],
  ['POST', '/pty-inject-scan', 'root-bearer', ['local']],
  ['POST', '/token', 'handler', ['local']],
  ['DELETE', '/token/*', 'root-token', ['local']],
  ['GET', '/agents', 'root-token', ['local']],
  ['POST', '/pair', 'root-token', ['local']],
  ['POST', '/tunnel/start', 'root-token', ['local']],
  ['POST', '/sse-session', 'root-bearer', ['local']],
  ['*', '/refs', 'root-bearer', ['local']],
  ['*', '/activity/stream', 'root-or-sse-cookie', ['local']],
  ['*', '/activity/history', 'root-bearer', ['local']],
  ['POST', '/batch', 'scoped', ['local']],
  ['GET', '/file', 'scoped', ['local']],
  ['POST', '/command', 'scoped', ['local', 'tunnel']],
  ['POST', '/inspector/pick', 'root-bearer', ['local']],
  ['GET', '/inspector', 'root-bearer', ['local']],
  ['POST', '/inspector/apply', 'root-bearer', ['local']],
  ['POST', '/inspector/reset', 'root-bearer', ['local']],
  ['GET', '/inspector/history', 'root-bearer', ['local']],
  ['GET', '/memory', 'root-bearer', ['local']],
  ['GET', '/inspector/events', 'root-bearer', ['local']],
];

const routeKey = (r: RouteEntry) => `${r.method} ${r.path}${r.prefix ? '*' : ''}`;
const requestPath = (r: RouteEntry) => r.prefix ? `${r.path}${r.path.endsWith('/') ? 'probe' : '/probe'}` : r.path;
const requestMethod = (r: RouteEntry) => r.method === '*' ? 'GET' : r.method;

describe('route table declarations', () => {
  test('the table is exactly the reviewed route inventory, auth kinds and surfaces', () => {
    const describe = (method: string, p: string, auth: AuthKind, surfaces: readonly Surface[]) =>
      `${method} ${p} auth=${auth} surfaces=${surfaces.join(',')}`;
    const actual = ROUTES.map(r => describe(r.method, `${r.path}${r.prefix ? '*' : ''}`, r.auth, r.surfaces)).sort();
    const expected = EXPECTED_ROUTES.map(([m, p, a, s]) => describe(m, p, a, s)).sort();
    expect(actual).toEqual(expected);
  });

  test('every route declares an auth kind and at least one surface; only handler-auth routes carry handlerAuth', () => {
    const kinds = new Set<AuthKind>(['none', 'root-bearer', 'root-token', 'scoped', 'extension-origin', 'root-or-sse-cookie', 'handler']);
    for (const r of ROUTES) {
      expect(kinds.has(r.auth), routeKey(r)).toBe(true);
      expect(r.surfaces.length, routeKey(r)).toBeGreaterThan(0);
      expect(typeof r.handler, routeKey(r)).toBe('function');
      if (r.auth === 'handler') expect(r.handlerAuth?.length ?? 0, routeKey(r)).toBeGreaterThan(20);
      else expect(r.handlerAuth, routeKey(r)).toBeUndefined();
    }
  });

  test('no two entries claim the same method and path', () => {
    const keys = ROUTES.map(routeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('the tunnel-surface paths in the table equal the TUNNEL_PATHS literal', () => {
    const tableTunnelPaths = new Set(ROUTES.filter(r => r.surfaces.includes('tunnel')).map(r => r.path));
    expect([...tableTunnelPaths].sort()).toEqual([...__testInternals__.tunnelPaths].sort());
    expect(findRoute(ROUTES, 'GET', '/connect', 'tunnel')?.auth).toBe('none');
  });
});

describe('route table auth matrix (stubbed handlers)', () => {
  const ctx = stubContext();
  const routes = stubbed(ROUTES);
  for (const route of routes) {
    for (const surface of route.surfaces) {
      for (const cred of CREDS) {
        test(`${surface} ${routeKey(route)} with ${cred}`, async () => {
          const url = new URL(`http://127.0.0.1:34567${requestPath(route)}`);
          const req = new Request(url, { method: requestMethod(route), headers: credHeaders(cred) });
          const resp = await dispatchRoute(routes, req, url, surface, ctx);
          const body = await resp.text();
          if (ADMITTED[route.auth].includes(cred)) {
            expect(resp.status).toBe(299);
            const parsed = JSON.parse(body);
            expect(parsed.reached).toBe(REACHED);
            if (route.auth === 'scoped') expect(parsed.tokenInfo).toEqual(cred === 'root' ? ROOT_INFO : SCOPED_INFO);
            return;
          }
          const denial = EXPECTED_DENIAL[route.auth as keyof typeof EXPECTED_DENIAL];
          expect({ status: resp.status, body }).toEqual(denial);
          expect(resp.headers.get('content-type')).toBe('application/json');
        });
      }
    }
  }

  test('a local-only entry is not matched on the tunnel surface', () => {
    for (const r of ROUTES.filter(r => !r.surfaces.includes('tunnel'))) {
      expect(findRoute(ROUTES, requestMethod(r), requestPath(r), 'tunnel'), routeKey(r)).toBeNull();
    }
  });

  for (const [method, pathname] of [['GET', '/no-such-route'], ['GET', '/command'], ['PUT', '/token'], ['GET', '/token/x']]) {
    test(`unmatched ${method} ${pathname}: root-bearer check, then plain-text 404`, async () => {
      expect(UNMATCHED_ROUTE.auth).toBe('root-bearer');
      const url = new URL(`http://127.0.0.1:34567${pathname}`);
      for (const cred of CREDS) {
        const resp = await dispatchRoute(routes, new Request(url, { method, headers: credHeaders(cred) }), url, 'local', ctx);
        const body = await resp.text();
        if (cred === 'root') expect({ status: resp.status, body }).toEqual({ status: 404, body: 'Not found' });
        else expect({ status: resp.status, body }).toEqual(EXPECTED_DENIAL['root-bearer']);
      }
    });
  }
});

describe('tunnel surface rejects the root token on every tunnel route', () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-route-table-'));
  const config = resolveConfig({ BROWSE_STATE_FILE: path.join(fixtureDir, 'state/browse.json') });
  for (const route of ROUTES.filter(r => r.surfaces.includes('tunnel'))) {
    test(`${routeKey(route)}`, async () => {
      __resetRegistry();
      const authToken = 'route-table-' + crypto.randomBytes(16).toString('hex');
      const handle = buildFetchHandler({
        authToken, browsePort: 34567, config, browserManager: new BrowserManager(),
        ownsTerminalAgent: false, startTime: Date.now(),
      });
      const resp = await handle.fetchTunnel(new Request(`http://127.0.0.1:34567${route.path}`, {
        method: route.method, headers: { Authorization: `Bearer ${authToken}` },
      }), null);
      expect(resp.status).toBe(403);
      expect((await resp.json() as { error: string }).error).toBe('Root token rejected on tunnel surface');
    });
  }
});
