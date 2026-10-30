import type { IncomingMessage, ServerResponse } from 'http';
import { generateUtilityGroundedResponse } from '../utils/utilityAiEngine';
import { createAuthApiHandler, defaultServerAuthService } from './authRoutes';
import { parseSessionCookieHeader, ServerSessionRecord } from './authService';
import { defaultServerDataStore } from './dataStore';
import { AGENTIC_PERSONAS } from './agenticPersonas';
import { getRoleToolDeclarations, executeAgenticTool } from './agenticTools';
import { defaultAiCacheManager } from './aiCache';
import { detectPromptInjection, redactSensitiveData } from '../utils/securityHardening';
import { UserRole } from '../types';

/**
 * Shared VidyutFlow Node HTTP Runtime Middleware (Items #6 & #7).
 *
 * Mounted identically in:
 *   1. `vite dev` / `vite preview` (`vite.config.ts`)
 *   2. Standalone production HTTP server (`src/server/prodServer.ts` — `npm start` / Docker)
 *   3. Serverless `/api/*` entry (`api/index.ts` — Vercel)
 *
 * Security guarantees on `/api/ai-chat` (Item #6):
 *   - Requires an authenticated `HttpOnly` server session cookie (`401 Unauthorized` otherwise).
 *   - Role & userId are derived exclusively from the verified server session (never `body.role`).
 *   - Spoofable `X-Forwarded-For` headers are ignored unless `TRUSTED_PROXY === 'true'`;
 *     sliding-window rate limits key on socket remoteAddress + authenticated `session.userId`.
 *   - Prompt grounding data is loaded server-side from `defaultServerDataStore` — arbitrary
 *     client-supplied `accountContext` objects are NEVER interpolated into the LLM prompt.
 */

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

export const SERVER_GEMINI_TIMEOUT_MS = 3500;
const GEMINI_COOLDOWN_MS = 60 * 1000;
let geminiCooldownUntil = 0;
let geminiCooldownReason = 'SERVICE_UNAVAILABLE';
let geminiCooldownKey: string | undefined = '';

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

function getUnspoofableClientIp(req: IncomingMessage): string {
  if (process.env.TRUSTED_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket?.remoteAddress || 'local-client';
}

function buildServerVerifiedContext(
  signedToken: string,
  session: ServerSessionRecord,
  rawSelectedConnectionNo: unknown
) {
  const safeSelectedNo =
    typeof rawSelectedConnectionNo === 'string' && /^[A-Za-z0-9_-]{3,32}$/.test(rawSelectedConnectionNo)
      ? rawSelectedConnectionNo
      : undefined;

  if (session.role === 'consumer') {
    try {
      const conns = defaultServerDataStore.getConnections(signedToken);
      const bills = defaultServerDataStore.getBills(signedToken);
      const payments = defaultServerDataStore.getPayments(signedToken);
      const complaints = defaultServerDataStore.getComplaints(signedToken);
      const applications = defaultServerDataStore.getApplications(signedToken);
      const selectedConn =
        (safeSelectedNo && conns.find(c => c.consumerNo === safeSelectedNo)) || conns[0];

      return {
        consumerName: session.user.name,
        hasLinkedConnections: conns.length > 0,
        selectedConnectionNo: selectedConn?.consumerNo || 'None',
        connections: conns.slice(0, 5).map(c => ({
          ...c,
          bills: bills.filter(b => b.consumerNo === c.consumerNo)
        })),
        payments: payments.slice(0, 10),
        complaints: complaints.slice(0, 10),
        applications: applications.slice(0, 10)
      };
    } catch {
      return {
        consumerName: session.user.name,
        hasLinkedConnections: false,
        selectedConnectionNo: 'None',
        connections: [],
        payments: [],
        complaints: [],
        applications: []
      };
    }
  }

  return {
    consumerName: session.user.name,
    hasLinkedConnections: false,
    selectedConnectionNo: 'StaffWorkspace',
    connections: [],
    payments: [],
    complaints: [],
    applications: []
  };
}

export function createHealthHandler() {
  return (req: IncomingMessage, res: ServerResponse) => {
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
        mode: process.env.NODE_ENV === 'production' ? 'PRODUCTION_RUNTIME' : 'DEMO_READY',
        authMiddleware: 'mounted',
        aiProxyMiddleware: 'mounted',
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
      })
    );
  };
}

export function createAiChatHandler() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
      return;
    }

    const clientIp = getUnspoofableClientIp(req);
    const now = Date.now();
    const ipTimestamps = (rateLimitMap.get(`ip:${clientIp}`) || []).filter(
      t => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (ipTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      res.statusCode = 429;
      res.setHeader('Retry-After', '60');
      res.end(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait a moment before sending another query.'
        })
      );
      return;
    }
    ipTimestamps.push(now);
    rateLimitMap.set(`ip:${clientIp}`, ipTimestamps);

    // Enforce authenticated server session BEFORE reading untrusted body into LLM pipeline (Item #6)
    const signedToken = parseSessionCookieHeader(req.headers.cookie);
    let session: ServerSessionRecord | null = null;
    if (signedToken) {
      try {
        session = defaultServerAuthService.validateSession(signedToken);
      } catch {
        session = null;
      }
    }
    if (!session || !signedToken) {
      res.statusCode = 401;
      res.end(
        JSON.stringify({
          error: 'Authentication required. Please sign in to use Vidyut Mitra AI.',
          code: 'AUTH_REQUIRED'
        })
      );
      return;
    }

    const safeRole: UserRole = session.role;
    const userId = session.userId;

    let rawBody = '';
    let bodyTooLarge = false;

    req.on('error', () => {
      if (!res.writableEnded) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            reply: generateUtilityGroundedResponse('', safeRole, null),
            isFallback: true,
            fallbackReason: 'STREAM_ERROR',
            configured: Boolean(process.env.GEMINI_API_KEY)
          })
        );
      }
    });

    req.on('data', (chunk: Buffer | string) => {
      rawBody += chunk;
      if (rawBody.length > 50000) {
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
        const { message, accountContext, history } = body;

        if (!message || typeof message !== 'string') {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Message query is required.' }));
          return;
        }
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Message query cannot be empty.' }));
          return;
        }
        if (trimmedMessage.length > 2500) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Message exceeds maximum length of 2,500 characters.' }));
          return;
        }

        const persona = AGENTIC_PERSONAS[safeRole] || AGENTIC_PERSONAS.consumer;

        const rateLimitCheck = defaultAiCacheManager.checkRateLimit(`${userId}:${clientIp}`);
        if (!rateLimitCheck.allowed) {
          res.statusCode = 429;
          res.setHeader('Retry-After', String(Math.max(1, Math.ceil((rateLimitCheck.retryAfterMs || 60000) / 1000))));
          res.end(
            JSON.stringify({
              error: 'Rate limit exceeded. Please wait a moment before sending another query.',
              retryAfterMs: rateLimitCheck.retryAfterMs
            })
          );
          return;
        }

        const injectionCheck = detectPromptInjection(trimmedMessage);
        if (injectionCheck.isSuspicious) {
          console.warn(
            `[VidyutFlow Security] Blocked suspicious prompt-injection attempt for role "${safeRole}" (patterns: ${injectionCheck.matchedPatterns.join(', ')}).`
          );
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              reply: `### ${persona.name} — Security Policy Notice\n\nYour request contains instructions that attempt to override system governance, extract restricted credentials, or bypass Role-Based Access Control (${injectionCheck.matchedPatterns.join(', ')}).\n\nAll VidyutFlow AI agents operate under strict read-only ERP boundaries for the **${safeRole.toUpperCase()}** portal and cannot execute unauthorized commands or expose internal secrets.`,
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

        // Build server-authoritative ERP context (never trusting client-supplied accountContext data)
        const serverContext = buildServerVerifiedContext(
          signedToken,
          session,
          accountContext?.selectedConnectionNo
        );

        const contextSummary = serverContext.selectedConnectionNo || '';
        const cacheKey = defaultAiCacheManager.generateCacheKey(
          userId,
          safeRole,
          injectionCheck.sanitizedText,
          contextSummary
        );
        const cached = defaultAiCacheManager.get(cacheKey, Date.now(), userId, safeRole);

        if (cached && !customGeneratorOverride) {
          res.statusCode = 200;
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
          const fallbackReply = defaultAiCacheManager.generateRoleGroundedFallback(
            trimmedMessage,
            safeRole,
            serverContext
          );
          res.statusCode = 200;
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

        const circuit = defaultAiCacheManager.isCircuitOpen();
        if (
          !customGeneratorOverride &&
          (circuit.isOpen || (geminiCooldownUntil > Date.now() && geminiCooldownKey === apiKey))
        ) {
          const fallbackReply = defaultAiCacheManager.generateRoleGroundedFallback(
            trimmedMessage,
            safeRole,
            serverContext
          );
          res.statusCode = 200;
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
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const contextPrompt = `
[SERVER-VERIFIED ERP SESSION CONTEXT]:
- Active Agent Persona: ${persona.name} (${persona.title})
- Authorized Session Role: ${safeRole}
- Verified User Identity: ${serverContext.consumerName}
- Has Linked Electricity Connections: ${serverContext.hasLinkedConnections ? 'YES' : 'NO'}
- Selected Dashboard Connection: ${serverContext.selectedConnectionNo}
- Server-Verified Connections, Meter Readings & Bills:
${JSON.stringify(serverContext.connections, null, 2)}
- Server-Verified Payment Transactions:
${JSON.stringify(serverContext.payments, null, 2)}
- Server-Verified Complaints:
${JSON.stringify(serverContext.complaints, null, 2)}
- Server-Verified Applications:
${JSON.stringify(serverContext.applications, null, 2)}
`;

        let historyPrompt = '';
        if (Array.isArray(history) && history.length > 0) {
          const sanitizedTurns = history
            .slice(-6)
            .filter(
              (h: any) =>
                h &&
                (h.sender === 'user' || h.sender === 'assistant') &&
                typeof h.text === 'string' &&
                !detectPromptInjection(h.text).isSuspicious
            )
            .map(
              (h: any) =>
                `${h.sender === 'user' ? 'User' : persona.name}: ${redactSensitiveData(h.text.slice(0, 600))}`
            );
          if (sanitizedTurns.length > 0) {
            historyPrompt = `\n[RECENT CONVERSATION HISTORY]:\n${sanitizedTurns.join('\n')}\n`;
          }
        }

        const promptContents = `${contextPrompt}${historyPrompt}
Current User Question: ${injectionCheck.sanitizedText}`;

        let reply = '';
        let isFallback = false;
        let fallbackReason: string | undefined;
        const executedTools: string[] = [];

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
                  clientContext: serverContext
                });
                toolResults.push({ call: fc, result: toolResult });
              }

              if (response.text && response.text.trim()) {
                return response.text;
              }

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
            errMsg.includes('GEMINI_DEADLINE_EXCEEDED') || geminiErr?.name === 'AbortError';

          console.warn(
            redactSensitiveData(
              `[VidyutFlow ${persona.name}] Gemini API ${
                isTimeout
                  ? `deadline exceeded (${SERVER_GEMINI_TIMEOUT_MS}ms)`
                  : isQuotaExceeded
                  ? 'quota limit reached'
                  : 'temporarily unavailable'
              }; activated ${persona.name} Grounded Engine.`
            )
          );

          reply = defaultAiCacheManager.generateRoleGroundedFallback(
            trimmedMessage,
            safeRole,
            serverContext
          );
          isFallback = true;
          fallbackReason = isTimeout
            ? 'TIMEOUT'
            : isQuotaExceeded
            ? 'QUOTA_EXHAUSTED'
            : 'SERVICE_UNAVAILABLE';

          defaultAiCacheManager.recordFailure(geminiErr);
          geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
          geminiCooldownReason = fallbackReason;
          geminiCooldownKey = apiKey;
        }

        if (!reply || !reply.trim()) {
          reply = defaultAiCacheManager.generateRoleGroundedFallback(
            trimmedMessage,
            safeRole,
            serverContext
          );
          isFallback = true;
          fallbackReason = fallbackReason || 'EMPTY_MODEL_REPLY';
        }

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
      } catch {
        const personaFallback = AGENTIC_PERSONAS[safeRole] || AGENTIC_PERSONAS.consumer;
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error: 'Malformed JSON request payload.',
            persona: {
              id: personaFallback.id,
              name: personaFallback.name,
              title: personaFallback.title,
              badge: personaFallback.badge,
              role: safeRole
            }
          })
        );
      }
    });
  };
}

export function attachVidyutServerMiddlewares(middlewares: {
  use: (route: string, fn: any) => void;
}) {
  middlewares.use('/api/health', createHealthHandler());
  middlewares.use('/api/auth', createAuthApiHandler());
  middlewares.use('/api/ai-chat', createAiChatHandler());
}
