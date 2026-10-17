/**
 * POST /tunnel/start — start the ngrok tunnel on demand (root-only).
 *
 * Dual-listener model: binds a SECOND Bun.serve listener on an ephemeral
 * 127.0.0.1 port dedicated to tunnel traffic, then points ngrok.forward() at
 * THAT port. The local listener (which serves /extension-token,
 * /cookie-picker, /inspector/*, welcome, etc.) is never exposed to ngrok.
 * Hard fail if the tunnel listener bind fails — NEVER fall back to the local
 * port, which would silently defeat the whole security property.
 */

import { json, jsonError, type RouteEntry } from './table';
import { isPairAgentEnabled } from '../config';

export const tunnelRoutes: RouteEntry[] = [
  {
    method: 'POST', path: '/tunnel/start', auth: 'root-token', surfaces: ['local'],
    handler: async (_req, _r, ctx) => {
      if (!isPairAgentEnabled()) {
        // Consent-on-first-use: the /pair-agent skill asks once and sets the
        // key; a direct API caller gets the same hint instead of a tunnel.
        return jsonError(403, 'pair-agent is off (tunnel exposes this browser beyond the machine)', {
          hint: 'enable once with: gstack-config set pair_agent on — or run /pair-agent, which asks for consent and sets it',
        });
      }
      const tunnel = ctx.tunnel.state();
      if (tunnel.active && tunnel.url && tunnel.hasListener) {
        // Verify tunnel is still alive before returning cached URL.
        // Probe GET /connect (the only unauth-reachable path on the tunnel
        // surface); /health is NOT tunnel-reachable under dual-listener.
        try {
          const probe = await fetch(`${tunnel.url}/connect`, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
            signal: AbortSignal.timeout(5000),
          });
          if (probe.ok) return json({ url: tunnel.url, already_active: true });
        } catch {}
        // Tunnel is dead — tear down cleanly before restarting
        console.warn('[browse] Cached tunnel is dead, restarting...');
        await ctx.tunnel.close();
      }

      // 1) Resolve ngrok authtoken from env / .gstack / native config
      const authtoken = ctx.tunnel.resolveAuthtoken();
      if (!authtoken) {
        return jsonError(400, 'No ngrok authtoken found', { hint: 'Run: ngrok config add-authtoken YOUR_TOKEN' });
      }

      // 2) Bind the tunnel listener + open ngrok via the shared startTunnel
      //    helper (hard-fails the bind, cleans up both ngrok and the Bun
      //    listener on any post-bind failure).
      const started = await ctx.tunnel.start(authtoken);
      if (!started.ok) {
        return jsonError(500, started.stage === 'bind'
          ? `Failed to bind tunnel listener: ${started.error.message}`
          : `Failed to open ngrok tunnel: ${started.error.message}`);
      }
      return json({ url: started.url });
    },
  },
];
