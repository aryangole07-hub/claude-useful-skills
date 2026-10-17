/**
 * GET /file — serve a downloaded file from the temp roots so remote agents
 * can retrieve screenshots, PDFs and media. Accepts root and scoped tokens.
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsonError, type RouteEntry } from './table';
import { validateTempPath } from '../path-security';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf', '.json': 'application/json',
  '.html': 'text/html', '.txt': 'text/plain', '.mhtml': 'message/rfc822',
};

export const fileRoutes: RouteEntry[] = [
  {
    method: 'GET', path: '/file', auth: 'scoped', surfaces: ['local'],
    handler: (_req, { url }, ctx) => {
      const filePath = url.searchParams.get('path');
      if (!filePath) return jsonError(400, 'Missing "path" query parameter');
      try {
        validateTempPath(filePath);
      } catch (err: any) {
        return jsonError(403, err.message);
      }
      if (!fs.existsSync(filePath)) return jsonError(404, 'File not found');
      const stat = fs.statSync(filePath);
      if (stat.size > 200 * 1024 * 1024) return jsonError(413, 'File too large (max 200MB)');
      const contentType = MIME_MAP[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      ctx.resetIdleTimer();
      return new Response(Bun.file(filePath), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(stat.size),
          'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
          'Cache-Control': 'no-cache',
        },
      });
    },
  },
];
