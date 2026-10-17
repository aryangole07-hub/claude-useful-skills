/**
 * Scoped-token administration: mint (POST /token), revoke (the /token/*
 * sub-router, DELETE /token/:clientId) and list (GET /agents). Root-only.
 */

import { json, jsonError, type RouteEntry } from './table';
import { createToken, revokeToken, listTokens, InvalidScopeError, ReservedClientIdError } from '../token-registry';

export const tokenRoutes: RouteEntry[] = [
  // ─── /token — mint scoped tokens (root-only) ──────────────────
  {
    method: 'POST', path: '/token', auth: 'handler', surfaces: ['local'],
    handlerAuth: 'root token (token registry); 403 "Only the root token can mint sub-tokens" otherwise',
    handler: async (req, _r, ctx) => {
      if (!ctx.isRootRequest(req)) return jsonError(403, 'Only the root token can mint sub-tokens');
      try {
        const tokenBody = await req.json() as any;
        if (!tokenBody.clientId) return jsonError(400, 'Missing clientId');
        const session = createToken({
          clientId: tokenBody.clientId,
          scopes: tokenBody.scopes,
          domains: tokenBody.domains,
          tabPolicy: tokenBody.tabPolicy,
          rateLimit: tokenBody.rateLimit,
          expiresSeconds: tokenBody.expiresSeconds,
        });
        return json({
          token: session.token,
          expires: session.expiresAt,
          scopes: session.scopes,
          agent: session.clientId,
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

  // ─── /token/:clientId — revoke a scoped token (root-only) ─────
  {
    method: 'DELETE', path: '/token/', prefix: true, auth: 'root-token', surfaces: ['local'],
    handler: (_req, { url }, ctx) => {
      // decodeURIComponent so CLI-encoded names (spaces, UTF-8) round-trip.
      let clientId: string;
      try {
        clientId = decodeURIComponent(url.pathname.slice('/token/'.length));
      } catch {
        return jsonError(400, 'Malformed client ID encoding');
      }
      const revoked = revokeToken(clientId);
      // Release tabs UNCONDITIONALLY: ownership outlives the token (it clears
      // only on tab close), so a client whose token already expired can still
      // own tabs. Gating release on a revoke hit would orphan that ownership
      // and let a same-name re-pair inherit an authenticated tab.
      const tabsReleased = ctx.browserManager.releaseClientTabs(clientId).length;
      if (!revoked && tabsReleased === 0) return jsonError(404, `Agent "${clientId}" not found`);
      console.log(`[browse] Revoked ${revoked} token(s), released ${tabsReleased} tab(s) for: ${clientId}`);
      return json({ revoked: clientId, tokens_deleted: revoked, tabs_released: tabsReleased });
    },
  },

  // ─── /agents — list connected agents (root-only) ──────────────
  {
    method: 'GET', path: '/agents', auth: 'root-token', surfaces: ['local'],
    handler: () => {
      // includeSetup: pending (unexchanged) setup keys are live grants the
      // operator must be able to see — without them, revoking a paired-but-
      // never-connected agent "works" while the list shows nothing.
      const agents = listTokens({ includeSetup: true }).map(t => ({
        clientId: t.clientId,
        scopes: t.scopes,
        domains: t.domains,
        expiresAt: t.expiresAt,
        commandCount: t.commandCount,
        createdAt: t.createdAt,
        pending: t.type === 'setup',
      }));
      return json({ agents });
    },
  },
];
