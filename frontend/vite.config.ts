import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { generateUtilityGroundedResponse } from './src/utils/utilityAiEngine';
import { createAuthApiHandler, defaultServerAuthService } from './src/server/authRoutes';
import { parseSessionCookieHeader, ServerSessionRecord } from './src/server/authService';
import { defaultServerDataStore } from './src/server/dataStore';
import { AGENTIC_PERSONAS } from './src/server/agenticPersonas';
import { getRoleToolDeclarations, executeAgenticTool } from './src/server/agenticTools';
import { defaultAiCacheManager } from './src/server/aiCache';
import { detectPromptInjection, redactSensitiveData } from './src/utils/securityHardening';
import { UserRole } from './src/types';

// Rate limiting store for development middleware (in-memory sliding window)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1-minute window
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute per IP

// Server-side deadline & circuit-breaker cooldown so consecutive queries respond immediately
// when Gemini API is quota-exhausted or unreachable
export const SERVER_GEMINI_TIMEOUT_MS = 3500;
const GEMINI_COOLDOWN_MS = 60 * 1000;
let geminiCooldownUntil = 0;
let geminiCooldownReason = 'SERVICE_UNAVAILABLE';
let geminiCooldownKey = '';

export function resetAiMiddlewareStateForTests() {
  rateLimitMap.clear();
  defaultAiCacheManager.resetForTests();
  geminiCooldownUntil = 0;
  geminiCooldownReason = 'SERVICE_UNAVAILABLE';
  geminiCooldownKey = '';
}

export type CustomGeminiGenerator = (params: {
  model: string;
  contents: string;
  systemInstruction: string;
  abortSignal: AbortSignal;
}) => Promise<string>;

let customGeneratorOverride: CustomGeminiGenerator | null = null;
export function setCustomGeminiGeneratorForTests(fn: CustomGeminiGenerator | null) {
  customGeneratorOverride = fn;
}

/**
 * Vidyut Mitra AI & Server Authentication Development Middleware Plugin
 *
 * NOTE ON ENVIRONMENT & PRODUCTION SECURITY:
 * - This middleware runs exclusively inside Vite development mode (`configureServer`).
 * - In Vite, GEMINI_API_KEY and SESSION_SECRET are read exclusively from server-side environment
 *   variables and are NEVER prefixed with VITE_, preventing them from being compiled into
 *   client-side JavaScript bundles.
 * - For production deployments outside Google AI Studio Preview, an independent server-side
 *   runtime (such as an Express service on Node.js / Cloud Run) mounts `createAuthApiHandler()`
 *   and proxies requests to the Gemini API.
 */
const VALID_ROLES: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

export function vidyutMitraAiPlugin(): Plugin {
  const attachServerMiddlewares = (middlewares: { use: (route: string, fn: any) => void }) => {
    const authApiHandler = createAuthApiHandler();
    // Mount server-side health & readiness diagnostic endpoint (/api/health)
    middlewares.use('/api/health', (req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }));
        return;
      }
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'VidyutFlow UGVCL ERP Server Runtime',
          mode: 'DEMO_READY',
          authMiddleware: 'mounted',
          aiProxyMiddleware: 'mounted',
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
        })
      );
    });

    // Mount server-side authentication endpoints (/api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/signup)
    middlewares.use('/api/auth', authApiHandler);

    middlewares.use('/api/ai-chat', async (req: any, res: any) => {
        // Enforce strict HTTP security headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        // Sliding-window rate limiter per client IP
        const clientIp =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          'local-client';
        const now = Date.now();
        const activeTimestamps = (rateLimitMap.get(clientIp) || []).filter(
          t => now - t < RATE_LIMIT_WINDOW_MS
        );

        if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
          res.statusCode = 429;
          res.end(
            JSON.stringify({
              error: 'Rate limit exceeded. Please wait a moment before sending another query.'
            })
          );
          return;
        }

        activeTimestamps.push(now);
        rateLimitMap.set(clientIp, activeTimestamps);

        let rawBody = '';
        let bodyTooLarge = false;

        req.on('error', () => {
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                reply: generateUtilityGroundedResponse('', 'consumer', null),
                isFallback: true,
                fallbackReason: 'STREAM_ERROR',
                configured: Boolean(process.env.GEMINI_API_KEY)
              })
            );
          }
        });

        req.on('data', (chunk: Buffer | string) => {
          rawBody += chunk;
          if (rawBody.length > 50000) { // 50KB safety limit
            bodyTooLarge = true;
          }
        });

        req.on('end', async () => {
          if (res.writableEnded) return;
          if (bodyTooLarge) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'Payload too large.' }));
            return;
          }

          try {
            const body = JSON.parse(rawBody || '{}');
            const { message, role, accountContext, history } = body;

            if (!message || typeof message !== 'string') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Message query is required.' }));
              return;
            }

            const trimmedMessage = message.trim();
            if (!trimmedMessage) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Message query cannot be empty.' }));
              return;
            }

            if (trimmedMessage.length > 2500) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Message exceeds maximum length of 2,500 characters.' }));
              return;
            }

            // 1. Authenticate session if session cookie is present
            const signedToken = parseSessionCookieHeader(req.headers.cookie);
            let session: ServerSessionRecord | null = null;
            if (signedToken) {
              try {
                session = defaultServerAuthService.validateSession(signedToken);
              } catch {
                session = null;
              }
            }

            // Derive role and user identity (prefer server-authenticated session over client payload)
            let safeRole: UserRole = 'consumer';
            let userId = 'anonymous';

            if (session) {
              safeRole = session.role;
              userId = session.userId;
            } else if (typeof role === 'string' && (VALID_ROLES as string[]).includes(role)) {
              safeRole = role as UserRole;
              userId = `demo_${safeRole}`;
            }

            const persona = AGENTIC_PERSONAS[safeRole] || AGENTIC_PERSONAS.consumer;

            // 2. Per-client / Per-user rate limiting via AiCacheManager
            const rateLimitCheck = defaultAiCacheManager.checkRateLimit(`${userId}:${clientIp}`);
            if (!rateLimitCheck.allowed) {
              res.statusCode = 429;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Rate limit exceeded. Please wait a moment before sending another query.',
                  retryAfterMs: rateLimitCheck.retryAfterMs
                })
              );
              return;
            }

            // 2.5 Prompt-Injection Defense & Adversarial Input Guard
            const injectionCheck = detectPromptInjection(trimmedMessage);
            if (injectionCheck.isSuspicious) {
              console.warn(
                `[VidyutFlow Security] Blocked suspicious prompt-injection attempt for role "${safeRole}" (patterns: ${injectionCheck.matchedPatterns.join(', ')}).`
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: `### ${persona.name} — Security Policy Notice\n\nYour request contains instructions that attempt to override system governance, extract restricted credentials, or bypass Role-Based Access Control (${ injectionCheck.matchedPatterns.join(', ') }).\n\nAll VidyutFlow AI agents operate under strict read-only ERP boundaries for the **${safeRole.toUpperCase()}** portal and cannot execute unauthorized commands or expose internal secrets.`,
                  persona: {
                    id: persona.id,
                    name: persona.name,
                    title: persona.title,
                    badge: persona.badge,
                    role: persona.role
                  },
                  executedTools: [],
                  isFallback: true,
                  fallbackReason: 'PROMPT_INJECTION_BLOCKED',
                  configured: Boolean(process.env.GEMINI_API_KEY)
                })
              );
              return;
            }

            // 3. In-memory user-isolated cache lookup
            const contextSummary = accountContext?.selectedConnectionNo || '';
            const cacheKey = defaultAiCacheManager.generateCacheKey(userId, safeRole, injectionCheck.sanitizedText, contextSummary);
            const cached = defaultAiCacheManager.get(cacheKey, Date.now(), userId, safeRole);

            if (cached && !customGeneratorOverride) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: cached.reply,
                  persona: {
                    id: persona.id,
                    name: persona.name,
                    title: persona.title,
                    badge: persona.badge,
                    role: persona.role
                  },
                  executedTools: cached.executedTools,
                  isFallback: false,
                  isCached: true,
                  configured: Boolean(process.env.GEMINI_API_KEY)
                })
              );
              return;
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey && !customGeneratorOverride) {
              const fallbackReply = defaultAiCacheManager.generateRoleGroundedFallback(trimmedMessage, safeRole, accountContext);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: fallbackReply,
                  persona: {
                    id: persona.id,
                    name: persona.name,
                    title: persona.title,
                    badge: persona.badge,
                    role: persona.role
                  },
                  executedTools: [],
                  isFallback: true,
                  fallbackReason: 'UNCONFIGURED_KEY',
                  configured: false
                })
              );
              return;
            }

            // 4. Circuit-breaker check for quota exhaustion or server cooldown
            const circuit = defaultAiCacheManager.isCircuitOpen();
            if (
              !customGeneratorOverride &&
              (circuit.isOpen || (geminiCooldownUntil > Date.now() && geminiCooldownKey === apiKey))
            ) {
              const fallbackReply = defaultAiCacheManager.generateRoleGroundedFallback(trimmedMessage, safeRole, accountContext);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: fallbackReply,
                  persona: {
                    id: persona.id,
                    name: persona.name,
                    title: persona.title,
                    badge: persona.badge,
                    role: persona.role
                  },
                  executedTools: [],
                  isFallback: true,
                  fallbackReason: circuit.reason || geminiCooldownReason,
                  configured: true
                })
              );
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            // Sanitize demonstration session context
            let contextPrompt = '';
            if (accountContext && typeof accountContext === 'object') {
              const safeName = typeof accountContext.consumerName === 'string'
                ? accountContext.consumerName.slice(0, 80)
                : (session?.user.name || 'Citizen Consumer');
              const safeConnections = Array.isArray(accountContext.connections)
                ? accountContext.connections.slice(0, 5)
                : [];
              const safeComplaints = Array.isArray(accountContext.complaints)
                ? accountContext.complaints.slice(0, 10)
                : [];
              const safeApplications = Array.isArray(accountContext.applications)
                ? accountContext.applications.slice(0, 10)
                : [];
              const safePayments = Array.isArray(accountContext.payments)
                ? accountContext.payments.slice(0, 10)
                : [];

              contextPrompt = `
[AUTHENTICATED ERP & DEMONSTRATION CONTEXT]:
- Active Agent Persona: ${persona.name} (${persona.title})
- Authorized Role: ${safeRole}
- Active User Identity: ${safeName}
- Has Linked Electricity Connections: ${accountContext.hasLinkedConnections ? 'YES' : 'NO'}
- Selected Dashboard Connection: ${typeof accountContext.selectedConnectionNo === 'string' ? accountContext.selectedConnectionNo.slice(0, 30) : 'Default'}
- Linked Connections, Meter Readings & Bills Data:
${JSON.stringify(safeConnections, null, 2)}
- Linked Payment Transactions Data:
${JSON.stringify(safePayments, null, 2)}
- Linked Complaints Data:
${JSON.stringify(safeComplaints, null, 2)}
- Linked Applications Data:
${JSON.stringify(safeApplications, null, 2)}
`;
            } else {
              contextPrompt = `
[AUTHENTICATED ERP & DEMONSTRATION CONTEXT]:
- Active Agent Persona: ${persona.name} (${persona.title})
- Authorized Role: ${safeRole}
- Active User Identity: ${session?.user.name || 'Citizen'}
- Has Linked Electricity Connections: NO
`;
            }

            // Sanitize conversation history
            let historyPrompt = '';
            if (Array.isArray(history) && history.length > 0) {
              const sanitizedTurns = history
                .slice(-6)
                .filter((h: any) => h && (h.sender === 'user' || h.sender === 'assistant') && typeof h.text === 'string')
                .map((h: any) => `${h.sender === 'user' ? 'User' : persona.name}: ${h.text.slice(0, 800)}`);
              if (sanitizedTurns.length > 0) {
                historyPrompt = `\n[RECENT CONVERSATION HISTORY]:\n${sanitizedTurns.join('\n')}\n`;
              }
            }

            const promptContents = `${contextPrompt}${historyPrompt}
Current User Question: ${trimmedMessage}`;

            let reply = '';
            let isFallback = false;
            let fallbackReason: string | undefined;
            const executedTools: string[] = [];

            // Bounded Gemini model execution with 3.5-second server-side deadline
            const serverAbortController = new AbortController();
            let timeoutHandle: NodeJS.Timeout | undefined;

            try {
              const timeoutPromise = new Promise<string>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                  serverAbortController.abort();
                  reject(new Error('GEMINI_DEADLINE_EXCEEDED'));
                }, SERVER_GEMINI_TIMEOUT_MS);
              });

              const apiPromise = (async () => {
                if (customGeneratorOverride) {
                  return customGeneratorOverride({
                    model: 'gemini-3.8-flash',
                    contents: promptContents,
                    systemInstruction: persona.systemInstruction,
                    abortSignal: serverAbortController.signal
                  });
                }

                const roleTools = getRoleToolDeclarations(safeRole);
                const config: any = {
                  systemInstruction: persona.systemInstruction,
                  temperature: 0.2,
                  abortSignal: serverAbortController.signal
                };

                if (roleTools.length > 0) {
                  config.tools = [{ functionDeclarations: roleTools }];
                }

                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: promptContents,
                  config
                });

                // Check for Gemini function calls (Agentic Tool Calling)
                if (response.functionCalls && response.functionCalls.length > 0) {
                  const toolResults: any[] = [];
                  for (const fc of response.functionCalls) {
                    if (!fc.name) continue;
                    executedTools.push(fc.name);
                    const toolResult = await executeAgenticTool({
                      name: fc.name,
                      args: (fc.args as Record<string, any>) || {},
                      session,
                      role: safeRole,
                      dataStore: defaultServerDataStore,
                      clientContext: accountContext
                    });
                    toolResults.push({
                      call: fc,
                      result: toolResult
                    });
                  }

                  // If model provided text along with tools, or perform second generation with tool findings
                  if (response.text && response.text.trim()) {
                    return response.text;
                  }

                  // Synthesize response based on tool results with model
                  const toolSummaryPrompt = `${promptContents}\n\n[AGENTIC TOOL EXECUTION RESULTS]:\n${JSON.stringify(
                    toolResults.map(tr => ({
                      tool: tr.call.name,
                      success: tr.result.success,
                      data: tr.result.data || tr.result.error
                    })),
                    null,
                    2
                  )}\n\nPlease synthesize a clear, authoritative response for the user using the above verified ERP tool results.`;

                  const followUp = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: toolSummaryPrompt,
                    config: {
                      systemInstruction: persona.systemInstruction,
                      temperature: 0.2,
                      abortSignal: serverAbortController.signal
                    }
                  });

                  return followUp.text || '';
                }

                return response.text || '';
              })();

              try {
                reply = await Promise.race([apiPromise, timeoutPromise]);
                geminiCooldownUntil = 0;
                defaultAiCacheManager.recordSuccess();
              } finally {
                if (timeoutHandle) clearTimeout(timeoutHandle);
              }
            } catch (geminiErr: any) {
              const errMsg = String(geminiErr?.message || '');
              const isQuotaExceeded =
                errMsg.includes('429') ||
                errMsg.toLowerCase().includes('quota') ||
                errMsg.includes('RESOURCE_EXHAUSTED');
              const isTimeout =
                errMsg.includes('GEMINI_DEADLINE_EXCEEDED') ||
                geminiErr?.name === 'AbortError';

              console.warn(
                redactSensitiveData(
                  `[VidyutFlow ${persona.name}] Gemini API ${isTimeout ? `deadline exceeded (${SERVER_GEMINI_TIMEOUT_MS}ms)` : isQuotaExceeded ? 'quota limit reached' : 'temporarily unavailable'}; activated ${persona.name} Grounded Engine.`
                )
              );

              reply = defaultAiCacheManager.generateRoleGroundedFallback(trimmedMessage, safeRole, accountContext);
              isFallback = true;
              fallbackReason = isTimeout ? 'TIMEOUT' : isQuotaExceeded ? 'QUOTA_EXHAUSTED' : 'SERVICE_UNAVAILABLE';

              // Trip circuit breaker on failure
              defaultAiCacheManager.recordFailure(geminiErr);
              geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
              geminiCooldownReason = fallbackReason;
              geminiCooldownKey = apiKey;
            }

            if (!reply || !reply.trim()) {
              reply = defaultAiCacheManager.generateRoleGroundedFallback(trimmedMessage, safeRole, accountContext);
              isFallback = true;
              fallbackReason = fallbackReason || 'EMPTY_MODEL_REPLY';
            }

            // Cache successful responses
            if (!isFallback && reply) {
              defaultAiCacheManager.set(cacheKey, userId, safeRole, reply, executedTools);
            }

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                reply,
                persona: {
                  id: persona.id,
                  name: persona.name,
                  title: persona.title,
                  badge: persona.badge,
                  role: persona.role
                },
                executedTools,
                isFallback,
                fallbackReason,
                configured: true
              })
            );
          } catch (err: any) {
            console.error('[VidyutFlow AI Proxy] Server recovery handler activated after request processing failure.');
            try {
              const body = JSON.parse(rawBody || '{}');
              const roleArg = (typeof body?.role === 'string' && (VALID_ROLES as string[]).includes(body.role) ? body.role : 'consumer') as UserRole;
              const personaFallback = AGENTIC_PERSONAS[roleArg] || AGENTIC_PERSONAS.consumer;
              const safeReply = defaultAiCacheManager.generateRoleGroundedFallback(String(body?.message || ''), roleArg, body?.accountContext);
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  reply: safeReply,
                  persona: {
                    id: personaFallback.id,
                    name: personaFallback.name,
                    title: personaFallback.title,
                    badge: personaFallback.badge,
                    role: personaFallback.role
                  },
                  executedTools: [],
                  isFallback: true,
                  fallbackReason: 'RECOVERY_FALLBACK',
                  configured: true
                })
              );
            } catch {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: generateUtilityGroundedResponse('', 'consumer', null),
                  persona: {
                    id: AGENTIC_PERSONAS.consumer.id,
                    name: AGENTIC_PERSONAS.consumer.name,
                    title: AGENTIC_PERSONAS.consumer.title,
                    badge: AGENTIC_PERSONAS.consumer.badge,
                    role: 'consumer'
                  },
                  executedTools: [],
                  isFallback: true,
                  configured: true
                })
              );
            }
          }
        });
      });
  };

  return {
    name: 'vidyut-mitra-ai-plugin',
    configureServer(server) {
      attachServerMiddlewares(server.middlewares);
    },
    configurePreviewServer(server) {
      attachServerMiddlewares(server.middlewares);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), vidyutMitraAiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 5173,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/backend': {
          // FastAPI auth + any future backend routes not shadowed by dev middleware
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/backend/, '')
        },
        '/api/health': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/notifications': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/requests': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/system': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/assistant/ml-metrics': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        },
        '/api/auth': {
          target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8008',
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
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
          },
        },
      },
    },
  };
});
