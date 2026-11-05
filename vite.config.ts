import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import nodePath from 'path';
import { defineConfig, Plugin } from 'vite';
import {
  SERVER_GEMINI_TIMEOUT_MS,
  resetAiMiddlewareStateForTests,
  setCustomGeminiGeneratorForTests,
  CustomGeminiGenerator,
  attachVidyutServerMiddlewares
} from './src/server/runtimeMiddleware';

export {
  SERVER_GEMINI_TIMEOUT_MS,
  resetAiMiddlewareStateForTests,
  setCustomGeminiGeneratorForTests
};
export type { CustomGeminiGenerator };

export function vidyutMitraAiPlugin(): Plugin {
  return {
    name: 'vidyut-mitra-ai-plugin',
    configureServer(server) {
      attachVidyutServerMiddlewares(server.middlewares);
    },
    configurePreviewServer(server) {
      attachVidyutServerMiddlewares(server.middlewares);
    }
  };
}

import net from 'net';

const FASTAPI_TARGET = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008';

let _upstreamCached: boolean | null = null;
let _upstreamLastCheck = 0;

function isUpstreamReachable(targetUrlStr: string): Promise<boolean> {
  const now = Date.now();
  if (_upstreamCached !== null && now - _upstreamLastCheck < 3000) {
    return Promise.resolve(_upstreamCached);
  }
  return new Promise(resolve => {
    try {
      const parsed = new URL(targetUrlStr);
      const port = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);
      const host = parsed.hostname;
      const sock = net.createConnection(port, host, () => {
        sock.destroy();
        _upstreamCached = true;
        _upstreamLastCheck = Date.now();
        resolve(true);
      });
      sock.on('error', () => {
        _upstreamCached = false;
        _upstreamLastCheck = Date.now();
        resolve(false);
      });
      sock.setTimeout(60, () => {
        sock.destroy();
        _upstreamCached = false;
        _upstreamLastCheck = Date.now();
        resolve(false);
      });
    } catch {
      _upstreamCached = false;
      _upstreamLastCheck = Date.now();
      resolve(false);
    }
  });
}

async function fastApiBypassHandler(req: any, res: any) {
  const reachable = await isUpstreamReachable(FASTAPI_TARGET);
  if (!reachable) {
    if (res && !res.headersSent && !res.writableEnded) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'Upstream FastAPI service unreachable' }));
    }
    return false;
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), vidyutMitraAiPlugin()],
    resolve: {
      alias: {
        '@': nodePath.resolve(process.cwd(), '.')
      }
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/backend': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/backend/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/notifications': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/requests': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/evidence': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/directory': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/system': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/erp': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/workflows': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/staff': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/v1': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/billing': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/transformers': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/transformer-analytics': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/transformer-policies': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        },
        '/api/assistant': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: fastApiBypassHandler
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3000,
      allowedHosts: true
    },
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const norm = id.replace(/\\/g, '/');
            if (norm.includes('node_modules/recharts') || norm.includes('node_modules/d3-')) {
              return 'vendor-recharts';
            }
            if (norm.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (norm.includes('node_modules/motion') || norm.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (
              norm.includes('node_modules/react/') ||
              norm.includes('node_modules/react-dom/') ||
              norm.includes('node_modules/scheduler/') ||
              norm.includes('node_modules/react')
            ) {
              return 'vendor-react';
            }
            if (norm.includes('node_modules/qrcode')) {
              return 'vendor-qrcode';
            }
            if (norm.includes('src/i18n/translations/gu.ts')) return 'i18n-gu';
            if (norm.includes('src/i18n/translations/hi.ts')) return 'i18n-hi';
            if (norm.includes('src/i18n/translations/mr.ts')) return 'i18n-mr';
            if (norm.includes('src/i18n/translations/en.ts')) return 'i18n-en';
            if (norm.includes('employeeContentTranslations')) return 'i18n-employee';
            if (norm.includes('consumerContentTranslations')) return 'i18n-consumer';
            if (norm.includes('managementContentTranslations')) return 'i18n-management';
            if (norm.includes('fieldContentTranslations')) return 'i18n-field';
            if (norm.includes('adminContentTranslations')) return 'i18n-admin';
            if (norm.includes('assistantContentTranslations')) return 'i18n-assistant';
            if (norm.includes('utilityAiEngine')) return 'ai-engine';
            if (
              norm.includes('src/utils/billingEngine') ||
              norm.includes('src/utils/lateChargeEngine') ||
              norm.includes('src/utils/paymentCalendarEngine')
            ) {
              return 'app-billing';
            }
            if (
              norm.includes('src/utils/formalNoticeEngine') ||
              norm.includes('src/utils/businessClockEngine')
            ) {
              return 'app-notices-clock';
            }
            if (norm.includes('src/utils/canonicalAnalytics')) {
              return 'app-analytics';
            }
            if (norm.includes('src/utils/exportEngine')) {
              return 'app-export';
            }
            if (
              norm.includes('src/utils/aiRecommendationEngine') ||
              norm.includes('src/utils/anomalyDetector') ||
              norm.includes('src/utils/authClient') ||
              norm.includes('src/utils/backendSession') ||
              norm.includes('src/utils/offlineFieldSync') ||
              norm.includes('src/utils/securityHardening') ||
              norm.includes('src/utils/safeStorage') ||
              norm.includes('src/utils/dateUtils') ||
              norm.includes('src/utils/avatarUtils') ||
              norm.includes('src/utils/audioAlerts') ||
              norm.includes('src/utils/liveData') ||
              norm.includes('src/utils/slaEngine') ||
              norm.includes('src/utils/fieldNotificationEngine') ||
              norm.includes('src/utils/typographyTokens') ||
              norm.includes('src/services/erpAdapter') ||
              norm.includes('src/services/apiClient') ||
              norm.includes('src/services/repositories') ||
              norm.includes('src/services/erpApiContracts')
            ) {
              return 'app-core-utils';
            }
            if (norm.includes('data/') || norm.includes('mockData')) {
              return 'app-datasets';
            }
          }
        }
      }
    }
  };
});
