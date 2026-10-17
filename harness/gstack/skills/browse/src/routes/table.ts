/**
 * Browse route table: owns route entries, the one auth gate, the per-kind
 * denials, json()/jsonError() and the unmatched fallthrough. Moved from the
 * if-chain in server.ts buildFetchHandler; handlers live in routes/<area>.ts
 * and the ordered list is ROUTES in routes/index.ts. Add a route:
 *   { method: 'GET', path: '/thing', auth: 'root-bearer', surfaces: ['local'],
 *     handler: (req, r, ctx) => json({ ok: true }) }
 * A 'tunnel' surface also needs the TUNNEL_PATHS literal in server.ts.
 * Enforced by browse/test/server-route-dispatch-ratchet.test.ts.
 */

import type { BrowserManager } from '../browser-manager';
import type { TokenInfo } from '../token-registry';

/** Which HTTP listener accepted this request. */
export type Surface = 'local' | 'tunnel';

/**
 * The check the gate runs before a handler. `handler` means the gate admits
 * the request and the handler authenticates it itself; the entry's
 * `handlerAuth` says how (used only where today's denial differs from every
 * gate kind: POST /token, POST /pty-dispose and the /cookie-picker sub-router).
 */
export type AuthKind =
  | 'none'
  | 'root-bearer'
  | 'root-token'
  | 'scoped'
  | 'extension-origin'
  | 'root-or-sse-cookie'
  | 'handler';

type GatedKind = Exclude<AuthKind, 'none' | 'handler'>;

/** Every gate-level denial, defined once per auth kind. */
export const AUTH_DENIALS: Record<GatedKind, { status: number; error: string }> = {
  'root-bearer': { status: 401, error: 'Unauthorized' },
  'scoped': { status: 401, error: 'Unauthorized' },
  'root-or-sse-cookie': { status: 401, error: 'Unauthorized' },
  'root-token': { status: 403, error: 'Root token required' },
  'extension-origin': { status: 403, error: 'Forbidden' },
};

/**
 * What handlers may use instead of closing over buildFetchHandler locals.
 * Auth arrives as check functions; the raw root token is only
 * `bootstrapRootToken`, read by POST /extension-token (returns it) and
 * /cookie-picker* (passes it to its sub-router).
 */
export interface RouteContext {
  browserManager: BrowserManager;
  startTime: number;
  browsePort: number;
  /** Constant-time `Authorization: Bearer <cfg.authToken>` check. */
  validateAuth(req: Request): boolean;
  /** Bearer token equals the token registry's root token. */
  isRootRequest(req: Request): boolean;
  /** Root or scoped TokenInfo for the bearer token, or null. */
  getTokenInfo(req: Request): TokenInfo | null;
  /** The request carries a live view-only SSE session cookie. */
  hasSseCookie(req: Request): boolean;
  /** Origin is the pinned gstack extension and Host is loopback. */
  isPinnedExtensionRequest(req: Request): boolean;
  /** A token string (header or sendBeacon body) equals cfg.authToken. */
  isRootTokenValue(token: string | null): boolean;
  bootstrapRootToken: string;
  resetIdleTimer(): void;
  terminal: {
    readPort(): number | null;
    grantToken(token: string, sessionId?: string): Promise<boolean>;
    restartSession(sessionId: string): Promise<boolean>;
  };
  tunnel: {
    state(): { active: boolean; url: string | null; hasListener: boolean };
    close(): Promise<void>;
    resolveAuthtoken(): string | null;
    start(authtoken: string): Promise<{ ok: true; url: string } | { ok: false; stage: 'bind' | 'ngrok'; error: Error }>;
  };
  commands: {
    handle(body: any, tokenInfo: TokenInfo | null): Promise<Response>;
    handleInternal(
      body: any,
      tokenInfo: TokenInfo | null,
      opts: { skipRateCheck?: boolean; skipActivity?: boolean },
    ): Promise<{ status: number; result: string; json?: boolean }>;
  };
}

/** Per-request facts the dispatcher hands a handler. */
export interface RouteRequest {
  url: URL;
  surface: Surface;
  /** TokenInfo resolved by a 'scoped' gate; null for every other kind. */
  tokenInfo: TokenInfo | null;
}

export type RouteHandler = (req: Request, r: RouteRequest, ctx: RouteContext) => Promise<Response> | Response;

export interface RouteEntry {
  /** HTTP method, or '*' for any method. */
  method: string;
  path: string;
  /** Match every pathname starting with `path` (sub-routers). */
  prefix?: true;
  auth: AuthKind;
  surfaces: readonly Surface[];
  /** Required when auth is 'handler': where and how the handler authenticates. */
  handlerAuth?: string;
  handler: RouteHandler;
}

export function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string>; replacer?: (key: string, value: unknown) => unknown } = {},
): Response {
  return new Response(JSON.stringify(body, init.replacer as any), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, { status });
}

/** Runs an entry's auth kind. Returns the resolved TokenInfo, or the kind's denial. */
export function checkRouteAuth(auth: AuthKind, req: Request, ctx: RouteContext): { tokenInfo: TokenInfo | null } | Response {
  const admitted = { tokenInfo: null };
  switch (auth) {
    case 'none':
    case 'handler':
      return admitted;
    case 'root-bearer':
      return ctx.validateAuth(req) ? admitted : deny(auth);
    case 'root-or-sse-cookie':
      return ctx.validateAuth(req) || ctx.hasSseCookie(req) ? admitted : deny(auth);
    case 'root-token':
      return ctx.isRootRequest(req) ? admitted : deny(auth);
    case 'extension-origin':
      return ctx.isPinnedExtensionRequest(req) ? admitted : deny(auth);
    case 'scoped': {
      const tokenInfo = ctx.getTokenInfo(req);
      return tokenInfo ? { tokenInfo } : deny(auth);
    }
  }
}

function deny(auth: GatedKind): Response {
  const { status, error } = AUTH_DENIALS[auth];
  return jsonError(status, error);
}

/**
 * The declared fallthrough for a request no entry matches (unknown path, or a
 * known path with a method no entry accepts): the root-bearer check, then a
 * plain-text 404.
 */
export const UNMATCHED_ROUTE = {
  auth: 'root-bearer',
  handler: () => new Response('Not found', { status: 404 }),
} as const satisfies Pick<RouteEntry, 'auth' | 'handler'>;

export function findRoute(routes: readonly RouteEntry[], method: string, pathname: string, surface: Surface): RouteEntry | null {
  return routes.find(r =>
    r.surfaces.includes(surface)
    && (r.method === '*' || r.method === method)
    && (r.prefix ? pathname.startsWith(r.path) : pathname === r.path),
  ) ?? null;
}

export async function dispatchRoute(
  routes: readonly RouteEntry[],
  req: Request,
  url: URL,
  surface: Surface,
  ctx: RouteContext,
): Promise<Response> {
  const entry = findRoute(routes, req.method, url.pathname, surface) ?? UNMATCHED_ROUTE;
  const gate = checkRouteAuth(entry.auth, req, ctx);
  if (gate instanceof Response) return gate;
  return entry.handler(req, { url, surface, tokenInfo: gate.tokenInfo }, ctx);
}
