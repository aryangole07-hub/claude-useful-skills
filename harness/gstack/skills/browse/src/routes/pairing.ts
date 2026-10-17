/**
 * Pair-agent ceremony routes: the /connect alive probe and setup-key
 * exchange (the only unauthenticated tunnel endpoints) and root-only /pair.
 */

import { json, jsonError, type RouteEntry } from './table';
import {
  checkConnectRateLimit, exchangeSetupKey, createSetupKey, revokeToken, revokeSetupKeys,
  getClientSession, grantReducesAccess, assertValidClientId, assertValidTokenOptions,
  DEFAULT_PAIR_SCOPES, InvalidScopeError, ReservedClientIdError, type ScopeCategory,
} from '../token-registry';

export const pairingRoutes: RouteEntry[] = [
  // GET /connect — alive probe. Unauth on both surfaces. Used by /pair and
  // /tunnel/start to detect dead ngrok tunnels via the tunnel URL, since
  // /health is not tunnel-reachable under the dual-listener design.
  //
  // Shares the same rate limit as POST /connect — otherwise a tunnel caller
  // can probe unlimited GETs, which makes the endpoint a free
  // daemon-enumeration surface.
  {
    method: 'GET', path: '/connect', auth: 'none', surfaces: ['local', 'tunnel'],
    handler: () => {
      if (!checkConnectRateLimit()) return jsonError(429, 'Rate limited');
      return json({ alive: true });
    },
  },

  // ─── /connect — setup key exchange for /pair-agent ceremony ────
  {
    method: 'POST', path: '/connect', auth: 'none', surfaces: ['local', 'tunnel'],
    handler: async (req) => {
      if (!checkConnectRateLimit()) return jsonError(429, 'Too many connection attempts. Wait 1 minute.');
      try {
        const connectBody = await req.json() as { setup_key?: string };
        if (!connectBody.setup_key) return jsonError(400, 'Missing setup_key');
        const session = exchangeSetupKey(connectBody.setup_key);
        if (!session) return jsonError(401, 'Invalid, expired, or already-used setup key');
        console.log(`[browse] Remote agent connected: ${session.clientId} (scopes: ${session.scopes.join(',')})`);
        return json({
          token: session.token,
          expires: session.expiresAt,
          scopes: session.scopes,
          agent: session.clientId,
        });
      } catch {
        return jsonError(400, 'Invalid request body');
      }
    },
  },

  // ─── /pair — create setup key for pair-agent ceremony (root-only) ───
  {
    method: 'POST', path: '/pair', auth: 'root-token', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      try {
        const pairBody = await req.json() as any;
        // Reject a reserved/invalid clientId up front (createSetupKey enforces
        // it too, but this makes the 400 unambiguous and skips the teardown).
        if (pairBody.clientId !== undefined) assertValidClientId(pairBody.clientId);
        // Default: DEFAULT_PAIR_SCOPES (full page access). The trust boundary
        // is the pairing ceremony itself, not the scope. --control adds
        // browser-wide destructive commands (stop, restart, disconnect).
        // --restrict limits scope — but can never grant control: that scope
        // stays behind the explicit control flag.
        if (!pairBody.control && !pairBody.admin
            && Array.isArray(pairBody.scopes) && pairBody.scopes.includes('control')) {
          return jsonError(400, 'The control scope requires the control flag (--control); it cannot be granted via a scopes list.');
        }
        const scopes = pairBody.control || pairBody.admin
          ? [...DEFAULT_PAIR_SCOPES, 'control' as const]
          : ((pairBody.scopes || [...DEFAULT_PAIR_SCOPES]) as ScopeCategory[]);
        // D1: a re-pair supersedes prior grants. ALWAYS drop stale setup keys
        // so a superseded broad key can never be exchanged — this closes the
        // shadow-key hole where a narrowing re-pair before the agent connects
        // would otherwise leave the old broad key live. Revoke the live
        // SESSION only when the new grant actually reduces access, so a
        // broaden/refresh never strands a working agent mid-task. Compare
        // against the resolved grant (not raw pairBody) so dropping 'control'
        // or a default re-pair is classified correctly. Revoke runs BEFORE
        // createSetupKey — revokeToken deletes all of a clientId's tokens, so
        // minting first would nuke the fresh key.
        const grant = {
          scopes: [...scopes] as ScopeCategory[],
          domains: pairBody.domains as string[] | undefined,
          rateLimit: pairBody.rateLimit ?? 10,
          tabPolicy: 'own-only' as const,
        };
        // Validate BEFORE any revoke (createSetupKey validates too, but that
        // runs after the teardown below). A bad scope or negative rateLimit
        // must 400 without knocking a live session offline — otherwise a
        // reducing re-pair with a typo (--restrict red) destroys the session
        // and mints no replacement.
        assertValidTokenOptions(grant.scopes, grant.rateLimit);
        const priorSession = pairBody.clientId ? getClientSession(pairBody.clientId) : null;
        let superseded: { tokens_deleted: number; tabs_released: number } | undefined;
        if (priorSession && grantReducesAccess(priorSession, grant)) {
          const tokensDeleted = revokeToken(pairBody.clientId);
          const tabsReleased = ctx.browserManager.releaseClientTabs(pairBody.clientId).length;
          superseded = { tokens_deleted: tokensDeleted, tabs_released: tabsReleased };
          console.log(`[browse] Superseded ${tokensDeleted} token(s), released ${tabsReleased} tab(s) for reducing re-pair: ${pairBody.clientId}`);
        } else if (pairBody.clientId) {
          revokeSetupKeys(pairBody.clientId);
          // No live session, but tab ownership outlives token expiry: free any
          // tabs orphaned by an expired session so this re-pair can't inherit
          // an earlier incarnation's authenticated pages (mirrors DELETE
          // /token's unconditional release). A live-session broaden keeps its
          // tabs — the working agent still owns them.
          if (!priorSession) ctx.browserManager.releaseClientTabs(pairBody.clientId);
        }
        const setupKey = createSetupKey({
          clientId: pairBody.clientId,
          scopes: [...scopes],
          domains: pairBody.domains,
          rateLimit: pairBody.rateLimit,
        });
        // Verify tunnel is actually alive before reporting it (ngrok may have died externally).
        // Probe via GET /connect — under dual-listener /health is NOT on the tunnel allowlist,
        // so the old probe would return 404 and always mark the tunnel as dead.
        let verifiedTunnelUrl: string | null = null;
        const tunnel = ctx.tunnel.state();
        if (tunnel.active && tunnel.url) {
          try {
            const probe = await fetch(`${tunnel.url}/connect`, {
              method: 'GET',
              headers: { 'ngrok-skip-browser-warning': 'true' },
              signal: AbortSignal.timeout(5000),
            });
            if (probe.ok) {
              verifiedTunnelUrl = tunnel.url;
            } else {
              console.warn(`[browse] Tunnel probe failed (HTTP ${probe.status}), marking tunnel as dead`);
              await ctx.tunnel.close();
            }
          } catch {
            console.warn('[browse] Tunnel probe timed out or unreachable, marking tunnel as dead');
            await ctx.tunnel.close();
          }
        }
        return json({
          setup_key: setupKey.token,
          expires_at: setupKey.expiresAt,
          scopes: setupKey.scopes,
          tunnel_url: verifiedTunnelUrl,
          server_url: `http://127.0.0.1:${ctx.browsePort}`,
          ...(superseded ? { superseded } : {}),
        });
      } catch (err) {
        // Name the caller's typo (bad scope, negative rateLimit, reserved
        // clientId) instead of hiding it behind the generic body error.
        if (err instanceof InvalidScopeError || err instanceof ReservedClientIdError) {
          return jsonError(400, err.message);
        }
        return jsonError(400, 'Invalid request body');
      }
    },
  },
];
