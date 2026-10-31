import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuthApiHandler } from './authRoutes';
import { createAiChatHandler, createHealthHandler } from './runtimeMiddleware';

/**
 * Standalone Production HTTP Server for VidyutFlow (Item #7).
 *
 * Ensures `/api/health`, `/api/auth/*`, `/api/ai-chat`, FastAPI reverse proxying,
 * and compiled `dist/` SPA static assets work identically outside `vite dev`
 * (e.g. Docker Compose production container, Cloud Run, VM systemd service).
 */

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const FASTAPI_PREFIXES = [
  '/api/backend',
  '/api/v1',
  '/api/requests',
  '/api/notifications',
  '/api/system',
  '/api/erp',
  '/api/workflows',
  '/api/staff',
  '/api/assistant'
];

function applySecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
  );
}

function proxyToFastApi(req: IncomingMessage, res: ServerResponse, targetBase: string) {
  const rawUrl = req.url || '/';
  const rewrittenPath = rawUrl.startsWith('/api/backend')
    ? rawUrl.replace(/^\/api\/backend/, '') || '/'
    : rawUrl.replace(/^\/api/, '') || '/';
  const targetUrl = new URL(rewrittenPath, targetBase);
  const transport = targetUrl.protocol === 'https:' ? https : http;

  const proxyReq = transport.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host
      }
    },
    proxyRes => {
      res.statusCode = proxyRes.statusCode || 502;
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined) res.setHeader(k, v as string | string[]);
      }
      applySecurityHeaders(res);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', () => {
    if (!res.writableEnded) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ detail: 'Upstream FastAPI service unreachable' }));
    }
  });

  req.pipe(proxyReq);
}

export function createProductionRequestHandler(options?: {
  distDir?: string;
  fastApiTarget?: string;
}) {
  const distDir = options?.distDir || path.resolve(process.cwd(), 'dist');
  const fastApiTarget =
    options?.fastApiTarget || process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008';

  const healthHandler = createHealthHandler();
  const authHandler = createAuthApiHandler();
  const aiChatHandler = createAiChatHandler();

  return (req: IncomingMessage, res: ServerResponse) => {
    applySecurityHeaders(res);
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0];

    if (pathname === '/api/health' || pathname === '/api/health/') {
      healthHandler(req, res);
      return;
    }

    if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
      const subUrl = rawUrl.replace(/^\/api\/auth/, '') || '/';
      const origUrl = req.url;
      req.url = subUrl;
      Promise.resolve(authHandler(req, res, () => {
        req.url = origUrl;
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      })).catch(() => {
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
      return;
    }

    if (pathname === '/api/ai-chat' || pathname === '/api/ai-chat/') {
      void aiChatHandler(req, res);
      return;
    }

    if (FASTAPI_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      proxyToFastApi(req, res, fastApiTarget);
      return;
    }

    // Serve built SPA static files from dist/ with traversal protection
    const decodedPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const resolvedFile = path.resolve(distDir, '.' + decodedPath);
    if (!resolvedFile.startsWith(distDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    let fileToServe = resolvedFile;
    if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
      fileToServe = path.join(distDir, 'index.html');
    }

    if (!fs.existsSync(fileToServe)) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Static bundle not built yet. Run npm run build.' }));
      return;
    }

    const ext = path.extname(fileToServe).toLowerCase();
    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    if (fileToServe.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    fs.createReadStream(fileToServe).pipe(res);
  };
}

export function startProductionServer(port = Number(process.env.PORT) || 5173) {
  const server = http.createServer(createProductionRequestHandler());
  server.listen(port, '0.0.0.0', () => {
    console.log(`[VidyutFlow] Production server listening on http://0.0.0.0:${port}`);
  });
  return server;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  startProductionServer();
}
