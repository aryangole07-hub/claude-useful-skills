/**
 * Shared seams for behavioral browse route tests.
 *
 * makeServer() builds a real buildFetchHandler() instance over a temp state
 * dir; callRoute() runs one route-table entry's real handler against a stub
 * RouteContext, so a test can observe what the handler asks of the daemon
 * (terminal grants, tunnel probes, command dispatch) without a live
 * terminal-agent, ngrok or browser.
 */

import * as crypto from 'crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildFetchHandler, type ServerConfig, type ServerHandle } from '../src/server';
import { ROUTES } from '../src/routes';
import type { RouteContext, RouteEntry, Surface } from '../src/routes/table';
import { __resetRegistry, createToken, type ScopeCategory, type TokenInfo } from '../src/token-registry';
import { BrowserManager } from '../src/browser-manager';
import { resolveConfig } from '../src/config';

export interface TestServer {
  handle: ServerHandle;
  rootToken: string;
  local(urlPath: string, init?: RequestInit): Promise<Response>;
  tunnel(urlPath: string, init?: RequestInit): Promise<Response>;
  scopedToken(clientId?: string, scopes?: ScopeCategory[]): string;
  cleanup(): void;
}

export function makeServer(opts: { browserManager?: BrowserManager; beforeRoute?: ServerConfig['beforeRoute'] } = {}): TestServer {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-route-harness-'));
  __resetRegistry();
  const rootToken = 'route-harness-' + crypto.randomBytes(16).toString('hex');
  const handle = buildFetchHandler({
    authToken: rootToken,
    browsePort: 34567,
    config: resolveConfig({ BROWSE_STATE_FILE: path.join(dir, 'state/browse.json') }),
    browserManager: opts.browserManager ?? new BrowserManager(),
    ownsTerminalAgent: false,
    startTime: Date.now(),
    beforeRoute: opts.beforeRoute,
  });
  const request = (urlPath: string, init?: RequestInit) => new Request(`http://127.0.0.1:34567${urlPath}`, init);
  return {
    handle,
    rootToken,
    local: (urlPath, init) => handle.fetchLocal(request(urlPath, init), null),
    tunnel: (urlPath, init) => handle.fetchTunnel(request(urlPath, init), null),
    scopedToken: (clientId = 'harness-agent', scopes = ['read', 'write']) => createToken({ clientId, scopes }).token,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

const unexpected = (name: string) => () => { throw new Error(`route handler unexpectedly called ctx.${name}`); };

/** A RouteContext whose every dependency throws unless the test supplies it. */
export function stubRouteContext(overrides: Partial<RouteContext> = {}): RouteContext {
  return {
    browserManager: {} as BrowserManager,
    startTime: Date.now(),
    browsePort: 34567,
    validateAuth: () => true,
    isRootRequest: () => true,
    getTokenInfo: () => null,
    hasSseCookie: () => false,
    isPinnedExtensionRequest: () => false,
    isRootTokenValue: () => false,
    bootstrapRootToken: 'stub-root-token-0123456789',
    resetIdleTimer: unexpected('resetIdleTimer'),
    terminal: {
      readPort: unexpected('terminal.readPort'),
      grantToken: unexpected('terminal.grantToken'),
      restartSession: unexpected('terminal.restartSession'),
    },
    tunnel: {
      state: unexpected('tunnel.state'),
      close: unexpected('tunnel.close'),
      resolveAuthtoken: unexpected('tunnel.resolveAuthtoken'),
      start: unexpected('tunnel.start'),
    },
    commands: { handle: unexpected('commands.handle'), handleInternal: unexpected('commands.handleInternal') },
    ...overrides,
  };
}

export function routeEntry(method: string, urlPath: string, surface: Surface = 'local'): RouteEntry {
  const entry = ROUTES.find(r =>
    r.surfaces.includes(surface)
    && (r.method === '*' || r.method === method)
    && (r.prefix ? urlPath.startsWith(r.path) : urlPath === r.path));
  if (!entry) throw new Error(`no route-table entry for ${method} ${urlPath}`);
  return entry;
}

/** Runs one entry's real handler (the auth gate is not involved). */
export async function callRoute(
  method: string,
  urlPathAndQuery: string,
  ctx: RouteContext,
  init: { headers?: Record<string, string>; body?: unknown; surface?: Surface; tokenInfo?: TokenInfo | null } = {},
): Promise<Response> {
  const url = new URL(`http://127.0.0.1:34567${urlPathAndQuery}`);
  const body = init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
  const req = new Request(url, { method, headers: init.headers, body });
  const surface = init.surface ?? 'local';
  return routeEntry(method, url.pathname, surface).handler(req, { url, surface, tokenInfo: init.tokenInfo ?? null }, ctx);
}

/** A throwaway HTTP server standing in for an ngrok tunnel URL; records each request. */
export function fakeTunnel(connectStatus: number): { url: string; hits: string[]; stop(): void } {
  const hits: string[] = [];
  const srv = Bun.serve({
    port: 0, hostname: '127.0.0.1',
    fetch: (req) => {
      hits.push(`${req.method} ${new URL(req.url).pathname}`);
      return new Response('{}', { status: connectStatus });
    },
  });
  return { url: `http://127.0.0.1:${srv.port}`, hits, stop: () => srv.stop(true) };
}
