/**
 * Terminal (PTY) routes: session mint, re-attach, restart, dispose, lease
 * refresh from terminal-agent, and the pre-inject prompt-injection scan.
 * All are local-only: the tunnel surface 404s them by default-deny.
 */

import { json, jsonError, type RouteEntry } from './table';
import { mintPtySessionToken, buildPtySetCookie, revokePtySessionToken } from '../pty-session-cookie';
import { mintLease, validateLease, refreshLease, revokeLease } from '../pty-session-lease';
import { isSidecarAvailable, scanWithSidecar } from '../security-sidecar-client';
import { sanitizeReplacer } from '../sanitize';

async function readJsonOrNull(req: Request): Promise<any> {
  try { return await req.json(); } catch { return null; }
}

export const ptyRoutes: RouteEntry[] = [
  // ─── /pty-session — mint sessionId + lease + attachToken ─────────
  //
  // v1.44+ four-tuple shape:
  //   { terminalPort, sessionId, attachToken, leaseExpiresAt }
  //
  //  - sessionId    : stable, non-secret. Safe to log. Identifies "this
  //                   terminal" across re-attaches.
  //  - attachToken  : short-lived (30 min wall, single attach in practice
  //                   since the agent revokes on WS close). Bearer for
  //                   the /ws upgrade.
  //  - leaseExpiresAt: client-visible deadline for the lease. Re-attach
  //                   only works inside this window.
  //
  // The lease + attachToken are minted together so a successful
  // /pty-session is one round trip. Re-attach mints a fresh attachToken
  // for the SAME sessionId via /pty-session/reattach.
  {
    method: 'POST', path: '/pty-session', auth: 'root-bearer', surfaces: ['local'],
    handler: async (_req, _r, ctx) => {
      const port = ctx.terminal.readPort();
      if (!port) return jsonError(503, 'terminal-agent not ready');
      const lease = mintLease();
      const minted = mintPtySessionToken();
      const granted = await ctx.terminal.grantToken(minted.token, lease.sessionId);
      if (!granted) {
        revokePtySessionToken(minted.token);
        revokeLease(lease.sessionId);
        return jsonError(503, 'failed to grant terminal session');
      }
      return json({
        terminalPort: port,
        sessionId: lease.sessionId,
        attachToken: minted.token,
        leaseExpiresAt: lease.expiresAt,
        // Legacy alias — extensions still on the v1.43 wire shape keep
        // working. Drop after one minor release once dogfood confirms.
        ptySessionToken: minted.token,
        expiresAt: minted.expiresAt,
      }, { headers: { 'Set-Cookie': buildPtySetCookie(minted.token) } });
    },
  },

  // ─── /pty-session/reattach — mint fresh attachToken for existing sessionId
  //
  // Validates the lease (rejects unknown/expired sessionId with 410 Gone),
  // mints a fresh short-lived attachToken bound to the same sessionId, and
  // pushes it to the agent. The client opens a new WS with the new token;
  // the agent matches the sessionId binding and re-attaches to the existing
  // PtySession (kept alive for the 60s detach window).
  {
    method: 'POST', path: '/pty-session/reattach', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      const port = ctx.terminal.readPort();
      if (!port) return jsonError(503, 'terminal-agent not ready');
      const body = await readJsonOrNull(req);
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
      const v = sessionId ? validateLease(sessionId) : { ok: false as const };
      // 410 Gone — session window has closed (lease expired or never
      // existed). Client must fall back to /pty-session for a brand-new
      // session.
      if (!v.ok) return jsonError(410, 'lease expired or unknown');
      const minted = mintPtySessionToken();
      const granted = await ctx.terminal.grantToken(minted.token, sessionId!);
      if (!granted) {
        revokePtySessionToken(minted.token);
        return jsonError(503, 'failed to grant attach token');
      }
      return json({
        terminalPort: port,
        sessionId,
        attachToken: minted.token,
        leaseExpiresAt: v.ok ? v.expiresAt : 0,
      });
    },
  },

  // ─── /pty-restart — one-transaction kill + fresh mint ────────────
  //
  // The Restart button. Synchronously disposes the caller's existing
  // PtySession on the agent, revokes the old lease, mints a fresh
  // sessionId + lease + attachToken, and returns the new 4-tuple in
  // one response. Zero race window between kill and mint.
  {
    method: 'POST', path: '/pty-restart', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      const port = ctx.terminal.readPort();
      if (!port) return jsonError(503, 'terminal-agent not ready');
      const body = await readJsonOrNull(req);
      const oldSessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
      // Best-effort dispose. Missing/unknown sessionId is non-fatal —
      // the client may be doing a "restart from scratch" with no prior
      // session (e.g. ENDED state). The fresh mint always proceeds.
      if (oldSessionId) {
        await ctx.terminal.restartSession(oldSessionId);
        revokeLease(oldSessionId);
      }
      const lease = mintLease();
      const minted = mintPtySessionToken();
      const granted = await ctx.terminal.grantToken(minted.token, lease.sessionId);
      if (!granted) {
        revokePtySessionToken(minted.token);
        revokeLease(lease.sessionId);
        return jsonError(503, 'failed to grant terminal session');
      }
      return json({
        terminalPort: port,
        sessionId: lease.sessionId,
        attachToken: minted.token,
        leaseExpiresAt: lease.expiresAt,
      });
    },
  },

  // ─── /pty-dispose — explicit teardown (pagehide / browser quit) ──
  //
  // sendBeacon-compatible: accepts the auth token in the BODY so the
  // extension's pagehide handler can fire it without setting headers
  // (sendBeacon doesn't support custom headers). Without this, every
  // browser quit + sidebar close leaves a zombie PTY alive for the 60s
  // detach window.
  {
    method: 'POST', path: '/pty-dispose', auth: 'handler', surfaces: ['local'],
    handlerAuth: 'root token as Authorization: Bearer or as the JSON body authToken (sendBeacon); 401 Unauthorized otherwise',
    handler: async (req, _r, ctx) => {
      const body = await readJsonOrNull(req);
      const authTokenFromBody = typeof body?.authToken === 'string' ? body.authToken : null;
      const header = req.headers.get('authorization');
      const headerToken = header?.startsWith('Bearer ') ? header.slice(7) : null;
      if (!ctx.isRootTokenValue(headerToken) && !ctx.isRootTokenValue(authTokenFromBody)) {
        return jsonError(401, 'Unauthorized');
      }
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
      if (sessionId) {
        await ctx.terminal.restartSession(sessionId);
        revokeLease(sessionId);
      }
      return json({ ok: true });
    },
  },

  // ─── /internal/lease-refresh — loopback from terminal-agent on keepalive
  //
  // PTY-only idle reset: the headless daemon's idle timer must reset only
  // on active PTY usage, not on every passive SSE consumer. Terminal-agent
  // calls this endpoint (lazily, only when its cached lease is within 5 min
  // of expiry) on its 25s keepalive cycle. Refreshing the lease here also
  // bumps lastActivity so the daemon stays alive while a sidebar terminal
  // is actively in use. Bound to the root authToken so an external caller
  // can't refresh another user's lease. Body: {sessionId}.
  {
    method: 'POST', path: '/internal/lease-refresh', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      const body = await readJsonOrNull(req);
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
      const r = sessionId ? refreshLease(sessionId) : { ok: false as const };
      if (!r.ok) return jsonError(410, 'lease expired or unknown');
      ctx.resetIdleTimer();
      return json({ ok: true, expiresAt: r.expiresAt });
    },
  },

  // ─── /pty-inject-scan — pre-inject prompt-injection scan for the
  // extension's gstackInjectToTerminal callers. The extension routes
  // every page-derived text through this endpoint BEFORE writing to
  // the PTY (#1370). Sidecar absence degrades to L4 unavailable
  // (extension shows WARN + user confirm per D7).
  {
    method: 'POST', path: '/pty-inject-scan', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req) => {
      const reply = (body: unknown, status: number) => json(body, { status, replacer: sanitizeReplacer });
      // 64KB request cap. Defense against accidentally posting an
      // entire page DOM into the PTY path.
      const contentLength = Number(req.headers.get('content-length') || '0');
      if (contentLength > 64 * 1024) return reply({ error: 'payload-too-large', limit: 65536 }, 413);
      let body: { text?: unknown; origin?: unknown } = {};
      try {
        body = (await req.json()) as { text?: unknown; origin?: unknown };
      } catch {
        return reply({ error: 'malformed-json' }, 400);
      }
      const text = typeof body.text === 'string' ? body.text : '';
      if (text.length === 0) return reply({ error: 'missing-text' }, 400);

      // L1-L3 honest accounting:
      //   - URL blocklist forced to BLOCK in PTY context (override
      //     BROWSE_CONTENT_FILTER default — page-derived text in the
      //     REPL is a higher-risk surface than ordinary tool output).
      //   - L4 ML classifier via the sidecar when available.
      //   - L1-L3 envelope/datamarking is INFORMATIONAL only; the
      //     verdict is driven by the URL blocklist + L4.
      // See CLAUDE.md "Sidebar security stack".
      let verdict: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
      const reasons: string[] = [];

      // Quick URL-blocklist check: text containing a known bad-actor
      // domain → BLOCK.
      if (/(\bbit\.ly|\btinyurl\.com|\bdiscord\.gg)/i.test(text)) {
        verdict = 'BLOCK';
        reasons.push('url-blocklist');
      }

      const sidecarAvail = isSidecarAvailable();
      let l4: { available: boolean; verdict?: unknown; error?: string } = {
        available: sidecarAvail.available,
      };
      if (sidecarAvail.available && verdict !== 'BLOCK') {
        try {
          const { verdict: layerVerdict } = await scanWithSidecar(text, { timeoutMs: 5000 });
          l4 = { available: true, verdict: layerVerdict };
          // LayerSignal shape: { verdict: 'safe'|'suspicious'|'unsafe', ... }
          const lv = (layerVerdict as { verdict?: string })?.verdict;
          if (lv === 'unsafe') {
            verdict = 'BLOCK';
            reasons.push('l4-unsafe');
          } else if (lv === 'suspicious') {
            verdict = 'WARN';
            reasons.push('l4-suspicious');
          }
        } catch (err) {
          l4 = { available: false, error: err instanceof Error ? err.message : String(err) };
          // L4 failure during scan: degrade to WARN per D7.
          if (verdict === 'PASS') {
            verdict = 'WARN';
            reasons.push('l4-unavailable');
          }
        }
      } else if (!sidecarAvail.available && verdict === 'PASS') {
        verdict = 'WARN';
        reasons.push(`l4-unavailable:${sidecarAvail.reason ?? 'unknown'}`);
      }

      // BLOCK decisions are surfaced in the response shape; the extension
      // logs the BLOCK event into its own activity feed on receipt.
      return reply({ verdict, reasons, l4, datamark: '<untrusted-page-content>' }, 200);
    },
  },
];
