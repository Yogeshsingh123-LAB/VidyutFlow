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
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'vendor-recharts';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('/src/i18n/translations/gu.ts')) return 'i18n-gu';
            if (id.includes('/src/i18n/translations/hi.ts')) return 'i18n-hi';
            if (id.includes('/src/i18n/translations/mr.ts')) return 'i18n-mr';
            if (id.includes('/src/i18n/translations/en.ts')) return 'i18n-en';
            if (id.includes('employeeContentTranslations.ts')) return 'i18n-employee';
            if (id.includes('consumerContentTranslations.ts')) return 'i18n-consumer';
            if (id.includes('managementContentTranslations.ts')) return 'i18n-management';
            if (id.includes('fieldContentTranslations.ts')) return 'i18n-field';
            if (id.includes('adminContentTranslations.ts')) return 'i18n-admin';
            if (id.includes('/src/data/')) {
              return 'app-datasets';
            }
          }
        }
      }
    }
  };
});
