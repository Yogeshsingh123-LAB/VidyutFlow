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

const FASTAPI_TARGET = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008';

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
      port: Number(process.env.PORT) || 5173,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/backend': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/backend/, '')
        },
        '/api/notifications': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/requests': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/evidence': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/directory': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/system': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/erp': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/workflows': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/staff': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/v1': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/transformers': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/transformer-analytics': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/transformer-policies': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/assistant': {
          target: FASTAPI_TARGET,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 5173,
      allowedHosts: true
    },
    build: {
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
            if (
              norm.includes('src/utils/canonicalAnalytics') ||
              norm.includes('src/utils/exportEngine')
            ) {
              return 'app-analytics-export';
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
