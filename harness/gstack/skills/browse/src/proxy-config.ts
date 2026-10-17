/**
 * Parse + validate proxy config from CLI flags and environment.
 *
 * Used by:
 *   cli.ts    — to resolve the proxy (resolveProxy), detect cred-mixing and
 *               daemon-mismatch, and forward to server
 *   server.ts — to spawn the bridge and pass proxy to chromium.launch
 *
 * Proxy precedence (#915): --proxy, then BROWSE_PROXY_URL, then HTTPS_PROXY,
 * HTTP_PROXY and ALL_PROXY (upper case first, then lower case), then direct.
 * BROWSE_PROXY_URL=direct opts out of the standard variables.
 *
 * Cred policy (D9): if BOTH the URL embeds creds AND the env vars
 * BROWSE_PROXY_USER/PASS are set, refuse with a clear error. No silent
 * override — debugging confusion is worse than a one-time setup error.
 */

import { createHash } from 'crypto';
import type { UpstreamConfig } from './socks-bridge';

export interface ParsedProxyConfig {
  /** Original scheme: 'socks5' | 'http' | 'https' */
  scheme: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  userId?: string;
  password?: string;
  /** True if creds are present (from URL or env). */
  hasAuth: boolean;
}

export class ProxyConfigError extends Error {
  constructor(public readonly hint: string, message: string) {
    super(message);
    this.name = 'ProxyConfigError';
  }
}

/**
 * Parse the BROWSE_PROXY_URL string and merge env-supplied creds.
 *
 * @throws ProxyConfigError on malformed URL, unsupported scheme, or
 *   ambiguous credentials (set in both URL and env).
 */
export function parseProxyConfig(opts: {
  proxyUrl: string;
  envUser?: string;
  envPass?: string;
  /** Where proxyUrl came from, named in the cred-mixing hint. */
  source?: string;
}): ParsedProxyConfig {
  let url: URL;
  try {
    url = new URL(opts.proxyUrl);
  } catch {
    throw new ProxyConfigError(
      'expected scheme://[user:pass@]host:port',
      `invalid proxy URL — could not parse`,
    );
  }

  // socks5h (remote DNS) is what Chromium's socks5 already does.
  const scheme = url.protocol === 'socks5h:' ? 'socks5' : url.protocol.replace(':', '');
  if (scheme !== 'socks5' && scheme !== 'http' && scheme !== 'https') {
    throw new ProxyConfigError(
      'use socks5://, http://, or https://',
      `unsupported proxy scheme '${scheme}'`,
    );
  }

  if (!url.hostname) {
    throw new ProxyConfigError(
      'expected scheme://[user:pass@]host:port',
      `invalid proxy URL — missing host`,
    );
  }

  const port = url.port
    ? parseInt(url.port, 10)
    : (scheme === 'http' ? 80 : scheme === 'https' ? 443 : 1080);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new ProxyConfigError(
      'expected scheme://[user:pass@]host:port',
      `invalid proxy URL — bad port`,
    );
  }

  const urlHasUser = !!url.username;
  const urlHasPass = !!url.password;
  const envHasUser = !!opts.envUser;
  const envHasPass = !!opts.envPass;
  const urlHasCreds = urlHasUser || urlHasPass;
  const envHasCreds = envHasUser || envHasPass;

  // D9 (codex correction): refuse on mixed sources. Silent override is a
  // debugging trap — when a stale BROWSE_PROXY_USER from a prior session
  // wins over a fresh --proxy URL, the user can't tell why.
  if (urlHasCreds && envHasCreds) {
    throw new ProxyConfigError(
      `unset BROWSE_PROXY_USER/PASS or remove user:pass@ from ${opts.source ?? '--proxy'}`,
      `proxy creds set in both env (BROWSE_PROXY_USER) and URL — pick one source`,
    );
  }

  let userId: string | undefined;
  let password: string | undefined;
  if (urlHasCreds) {
    userId = decodeURIComponent(url.username);
    password = url.password ? decodeURIComponent(url.password) : undefined;
  } else if (envHasCreds) {
    userId = opts.envUser;
    password = opts.envPass;
  }

  return {
    scheme: scheme as 'socks5' | 'http' | 'https',
    host: url.hostname,
    port,
    ...(userId ? { userId } : {}),
    ...(password ? { password } : {}),
    hasAuth: !!(userId || password),
  };
}

/** Convert a ParsedProxyConfig to the UpstreamConfig shape socks-bridge wants. */
export function toUpstreamConfig(cfg: ParsedProxyConfig): UpstreamConfig {
  return {
    host: cfg.host,
    port: cfg.port,
    ...(cfg.userId ? { userId: cfg.userId } : {}),
    ...(cfg.password ? { password: cfg.password } : {}),
  };
}

/**
 * Compute a stable hash of (proxyUrl + headed flag) for daemon-mismatch
 * detection (D2). The hash is deterministic across CLI invocations on the
 * same machine and survives daemon restarts via the state file.
 *
 * NEVER include resolved creds — the hash compares config intent, not
 * specific credential values, and we don't want creds in any persisted form.
 */
export function computeConfigHash(opts: {
  proxyUrl: string | null | undefined;
  headed: boolean;
  /** Bypass rules derived from NO_PROXY (resolveProxy's noProxyRules). */
  noProxyRules?: string | null;
}): string {
  const proxyKey = canonicalizeProxyUrl(opts.proxyUrl);
  const input = JSON.stringify({
    proxy: proxyKey,
    headed: opts.headed,
    ...(proxyKey && opts.noProxyRules ? { noProxy: opts.noProxyRules } : {}),
  });
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Strip creds from a proxy URL for hashing. Returns null for empty input. */
function canonicalizeProxyUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    u.username = '';
    u.password = '';
    return `${u.protocol}//${u.host}`;
  } catch {
    return '<unparseable>';
  }
}

export const STANDARD_PROXY_VARS = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy'] as const;
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
export const PROXY_TROUBLESHOOTING = 'https://github.com/garrytan/gstack/blob/main/BROWSER.md#proxy-from-environment';

export interface ResolvedProxy {
  /** Proxy URL with resolved creds embedded, or null for a direct connection. */
  url: string | null;
  /** '--proxy' or the env var the proxy came from; null when direct. */
  source: string | null;
  /** NO_PROXY translated to Chromium bypass rules (sorted, comma-separated), or null. */
  noProxyRules: string | null;
  /** Rules Chromium receives: noProxyRules plus loopback; null when direct. */
  bypass: string | null;
  /** Set when a standard proxy variable was ignored because it does not parse. */
  warning: string | null;
}

/**
 * Translate a curl-style NO_PROXY list to Chromium bypass rules: `example.com`
 * and `.example.com` cover the domain and its subdomains, `*` bypasses all,
 * CIDR blocks and `host:port` pass through, and bare IPv6 gets brackets.
 * Loopback names are left out: withLoopbackBypass always adds them, and the
 * CLI appends them to NO_PROXY for its own daemon calls (#494).
 */
export function noProxyToChromiumRules(noProxy: string | undefined): string[] {
  const rules = new Set<string>();
  for (const raw of (noProxy ?? '').toLowerCase().split(/[\s,]+/)) {
    if (!raw) continue;
    if (raw === '*' || raw.includes('/')) { rules.add(raw); continue; }
    let host = raw;
    let port = '';
    const bracket = raw.match(/^(\[[0-9a-f:.]+\])(:\d+)?$/);
    if (bracket) [host, port] = [bracket[1], bracket[2] ?? ''];
    else if (raw.split(':').length > 2) {
      if (!/^[0-9a-f:.]+$/.test(raw)) continue;
      host = `[${raw}]`;
    }
    else if (raw.includes(':')) [host, port] = [raw.slice(0, raw.lastIndexOf(':')), raw.slice(raw.lastIndexOf(':'))];
    if (port && !/^:\d+$/.test(port)) continue;
    if (!port && LOOPBACK_HOSTS.includes(host)) continue;
    if (host.startsWith('*.')) { rules.add(host + port); continue; }
    host = host.replace(/^\./, '');
    if (!host) continue;
    rules.add(host + port);
    if (!host.startsWith('[') && !/^\d+(\.\d+){3}$/.test(host)) rules.add(`*.${host}${port}`);
  }
  return [...rules].sort();
}

/**
 * Chromium bypass rules for a proxied session: the NO_PROXY rules plus
 * loopback. Naming loopback also stops Playwright from adding `<-loopback>`,
 * which would send localhost through the proxy.
 */
export function withLoopbackBypass(rules: string[]): string {
  return [...new Set([...rules, ...LOOPBACK_HOSTS])].join(',');
}

/**
 * The daemon's view of the proxy the CLI resolved: BROWSE_PROXY_URL ('direct'
 * means none), its source, and the bypass rules (computed from NO_PROXY when
 * a caller other than the CLI set only BROWSE_PROXY_URL).
 */
export function serverProxyEnv(env: NodeJS.ProcessEnv): { url: string | undefined; source: string; bypass: string } {
  return {
    url: env.BROWSE_PROXY_URL === 'direct' ? undefined : env.BROWSE_PROXY_URL || undefined,
    source: env.BROWSE_PROXY_SOURCE || 'BROWSE_PROXY_URL',
    bypass: env.BROWSE_PROXY_BYPASS || withLoopbackBypass(noProxyToChromiumRules(env.NO_PROXY || env.no_proxy)),
  };
}

/**
 * Resolve the proxy for this invocation (#915). Env URLs go through
 * parseProxyConfig, so the cred policy applies. A standard variable that does
 * not parse (curl-style `host:port`, an unsupported scheme) is ignored with a
 * warning instead of failing every command; --proxy and BROWSE_PROXY_URL are
 * explicit browse settings and still fail closed.
 */
export function resolveProxy(flagUrl: string | null, env: NodeJS.ProcessEnv): ResolvedProxy {
  const direct = (warning: string | null = null): ResolvedProxy => ({ url: null, source: null, noProxyRules: null, bypass: null, warning });
  let source: string;
  let raw: string;
  if (flagUrl) {
    [source, raw] = ['--proxy', flagUrl];
  } else if (env.BROWSE_PROXY_URL) {
    if (env.BROWSE_PROXY_URL === 'direct') return direct();
    [source, raw] = ['BROWSE_PROXY_URL', env.BROWSE_PROXY_URL];
  } else {
    const name = STANDARD_PROXY_VARS.find(key => env[key]);
    if (!name) return direct();
    [source, raw] = [name, env[name]!];
    try {
      parseProxyConfig({ proxyUrl: raw });
    } catch (err) {
      if (!(err instanceof ProxyConfigError)) throw err;
      return direct(`${source} is not a proxy URL browse can use (${err.message}; ${err.hint}), so browse connects directly. ` +
        `fix: export ${source}=http://host:port (or socks5://), or set BROWSE_PROXY_URL=direct to silence this. see ${PROXY_TROUBLESHOOTING}`);
    }
  }
  const parsed = parseProxyConfig({ proxyUrl: raw, envUser: env.BROWSE_PROXY_USER, envPass: env.BROWSE_PROXY_PASS, source });
  const url = new URL(raw);
  if (url.protocol === 'socks5h:') url.protocol = 'socks5:';
  url.username = parsed.userId ? encodeURIComponent(parsed.userId) : '';
  url.password = parsed.password ? encodeURIComponent(parsed.password) : '';
  const rules = noProxyToChromiumRules(env.NO_PROXY || env.no_proxy);
  return {
    url: url.toString(),
    source,
    noProxyRules: rules.length ? rules.join(',') : null,
    bypass: withLoopbackBypass(rules),
    warning: null,
  };
}
