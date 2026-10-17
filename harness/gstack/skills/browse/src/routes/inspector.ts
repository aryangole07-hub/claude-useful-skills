/**
 * CSS inspector routes and the in-memory inspector state they share: pick,
 * read, apply, reset, history and the inspector SSE stream.
 *
 * GET /inspector/events is root-bearer: it sat behind the if-chain's blanket
 * root-bearer check, so the SSE cookie its handler also accepted never reached
 * it. The declaration keeps that behavior.
 */

import { json, jsonError, type RouteEntry } from './table';
import { inspectElement, modifyStyle, resetModifications, getModificationHistory, type InspectorResult } from '../cdp-inspector';
import { createSseEndpoint } from '../sse-helpers';

let inspectorData: InspectorResult | null = null;
let inspectorTimestamp = 0;

type InspectorSubscriber = (event: any) => void;
const inspectorSubscribers = new Set<InspectorSubscriber>();

/** Diagnostic accessor used by the $B memory snapshot. */
export function getInspectorSubscriberCount(): number {
  return inspectorSubscribers.size;
}

/** Drops every inspector SSE subscriber (daemon shutdown). */
export function clearInspectorSubscribers(): void {
  inspectorSubscribers.clear();
}

function emitInspectorEvent(event: any): void {
  for (const notify of inspectorSubscribers) {
    queueMicrotask(() => {
      try { notify(event); } catch (err: any) {
        console.error('[browse] Inspector event subscriber threw:', err.message);
      }
    });
  }
}

export const inspectorRoutes: RouteEntry[] = [
  // POST /inspector/pick — receive element pick from extension, run CDP inspection
  {
    method: 'POST', path: '/inspector/pick', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      const body = await req.json();
      const { selector, activeTabUrl } = body;
      if (!selector) return jsonError(400, 'Missing selector');
      try {
        const page = ctx.browserManager.getPage();
        const result = await inspectElement(page, selector);
        inspectorData = result;
        inspectorTimestamp = Date.now();
        // Also store on browserManager for CLI access
        (ctx.browserManager as any)._inspectorData = result;
        (ctx.browserManager as any)._inspectorTimestamp = inspectorTimestamp;
        emitInspectorEvent({ type: 'pick', selector, timestamp: inspectorTimestamp });
        return json(result);
      } catch (err: any) {
        return jsonError(500, err.message);
      }
    },
  },

  // GET /inspector — return latest inspector data
  {
    method: 'GET', path: '/inspector', auth: 'root-bearer', surfaces: ['local'],
    handler: () => {
      if (!inspectorData) return json({ data: null });
      const stale = inspectorTimestamp > 0 && (Date.now() - inspectorTimestamp > 60000);
      return json({ data: inspectorData, timestamp: inspectorTimestamp, stale });
    },
  },

  // POST /inspector/apply — apply a CSS modification
  {
    method: 'POST', path: '/inspector/apply', auth: 'root-bearer', surfaces: ['local'],
    handler: async (req, _r, ctx) => {
      const body = await req.json();
      const { selector, property, value } = body;
      if (!selector || !property || value === undefined) return jsonError(400, 'Missing selector, property, or value');
      try {
        const page = ctx.browserManager.getPage();
        const mod = await modifyStyle(page, selector, property, value);
        emitInspectorEvent({ type: 'apply', modification: mod, timestamp: Date.now() });
        return json(mod);
      } catch (err: any) {
        return jsonError(500, err.message);
      }
    },
  },

  // POST /inspector/reset — clear all modifications
  {
    method: 'POST', path: '/inspector/reset', auth: 'root-bearer', surfaces: ['local'],
    handler: async (_req, _r, ctx) => {
      try {
        const page = ctx.browserManager.getPage();
        await resetModifications(page);
        emitInspectorEvent({ type: 'reset', timestamp: Date.now() });
        return json({ ok: true });
      } catch (err: any) {
        return jsonError(500, err.message);
      }
    },
  },

  // GET /inspector/history — return modification list
  {
    method: 'GET', path: '/inspector/history', auth: 'root-bearer', surfaces: ['local'],
    handler: () => json({ history: getModificationHistory() }),
  },

  // GET /inspector/events — SSE for inspector state changes
  {
    method: 'GET', path: '/inspector/events', auth: 'root-bearer', surfaces: ['local'],
    handler: (req) => {
      // Cleanup contract (abort + enqueue-fail + heartbeat-fail, idempotent)
      // lives in createSseEndpoint; sanitizeReplacer is applied to every
      // JSON.stringify inside the helper.
      return createSseEndpoint(req, {
        initialReplay: inspectorData
          ? (send) => send('state', { data: inspectorData, timestamp: inspectorTimestamp })
          : undefined,
        subscribe: (notify) => {
          inspectorSubscribers.add(notify);
          return () => inspectorSubscribers.delete(notify);
        },
        liveEventName: 'inspector',
      });
    },
  },
];
