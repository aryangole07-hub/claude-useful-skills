/**
 * Activity feed routes: the SSE session cookie mint, the activity SSE stream
 * and the REST history. None reset the idle timer.
 */

import { json, type RouteEntry } from './table';
import { subscribe, getActivityAfter, getActivityHistory, getSubscriberCount } from '../activity';
import { createSseEndpoint } from '../sse-helpers';
import { mintSseSessionToken, buildSseSetCookie, SSE_COOKIE_NAME } from '../sse-session-cookie';

export const activityRoutes: RouteEntry[] = [
  // ─── SSE session cookie mint (auth required) ──────────────────
  //
  // Issues a short-lived view-only token in an HttpOnly SameSite=Strict
  // cookie so EventSource calls can authenticate without putting the
  // root token in a URL. It is not a scoped token and cannot be used
  // against /command. The extension calls this once at bootstrap with the
  // root Bearer header, then opens EventSource with `withCredentials: true`
  // which sends the cookie back automatically.
  {
    method: 'POST', path: '/sse-session', auth: 'root-bearer', surfaces: ['local'],
    handler: () => {
      const minted = mintSseSessionToken();
      return json({
        expiresAt: minted.expiresAt,
        cookie: SSE_COOKIE_NAME,
      }, { headers: { 'Set-Cookie': buildSseSetCookie(minted.token) } });
    },
  },

  // Activity stream — SSE. Auth: Bearer header OR view-only SSE session
  // cookie (EventSource can't send Authorization headers). The ?token= query
  // param is NO LONGER accepted — URLs leak to logs/referer/history.
  {
    method: '*', path: '/activity/stream', auth: 'root-or-sse-cookie', surfaces: ['local'],
    handler: (req, { url }) => {
      const afterId = parseInt(url.searchParams.get('after') || '0', 10);
      // Cleanup contract (abort + enqueue-fail + heartbeat-fail, all
      // idempotent) lives in createSseEndpoint; sanitizeReplacer is applied
      // to every JSON.stringify inside the helper, so page-content-derived
      // fields stay surrogate-safe per the CLAUDE.md egress invariant.
      return createSseEndpoint(req, {
        initialReplay: (send) => {
          const { entries, gap, gapFrom, availableFrom } = getActivityAfter(afterId);
          if (gap) send('gap', { gapFrom, availableFrom });
          for (const entry of entries) send('activity', entry);
        },
        subscribe,
        liveEventName: 'activity',
      });
    },
  },

  // Activity history — REST
  {
    method: '*', path: '/activity/history', auth: 'root-bearer', surfaces: ['local'],
    handler: (_req, { url }) => {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const { entries, totalAdded } = getActivityHistory(limit);
      return json({ entries, totalAdded, subscribers: getSubscriberCount() });
    },
  },
];
