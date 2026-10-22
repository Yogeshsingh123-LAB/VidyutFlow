import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { generateUtilityGroundedResponse } from './src/utils/utilityAiEngine';
import { createAuthApiHandler } from './src/server/authRoutes';

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
export function vidyutMitraAiPlugin(): Plugin {
  return {
    name: 'vidyut-mitra-ai-plugin',
    configureServer(server) {
      const authApiHandler = createAuthApiHandler();
      // Mount server-side authentication endpoints (/api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/signup)
      server.middlewares.use('/api/auth', authApiHandler);

      server.middlewares.use('/api/ai-chat', async (req, res) => {
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

        req.on('data', chunk => {
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

            const validRoles = ['consumer', 'employee', 'field', 'management', 'admin'];
            const safeRole = typeof role === 'string' && validRoles.includes(role) ? role : 'consumer';

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              const fallbackReply = generateUtilityGroundedResponse(trimmedMessage, safeRole, accountContext);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: fallbackReply,
                  isFallback: true,
                  fallbackReason: 'UNCONFIGURED_KEY',
                  configured: false
                })
              );
              return;
            }

            // If Gemini is currently in a cooldown window for the same API key, respond immediately via Grounded Engine
            if (
              !customGeneratorOverride &&
              geminiCooldownUntil > Date.now() &&
              geminiCooldownKey === apiKey
            ) {
              const fallbackReply = generateUtilityGroundedResponse(trimmedMessage, safeRole, accountContext);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: fallbackReply,
                  isFallback: true,
                  fallbackReason: geminiCooldownReason,
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

            // Sanitize and bound client-supplied demonstration context
            let contextPrompt = '';
            if (accountContext && typeof accountContext === 'object') {
              const safeName = typeof accountContext.consumerName === 'string'
                ? accountContext.consumerName.slice(0, 80)
                : 'Citizen Consumer';
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
[CLIENT-SUPPLIED DEMONSTRATION SESSION CONTEXT — FRONTEND PROTOTYPE STATE (NOT SERVER-VERIFIED AUTH)]:
- Active Portal Role: ${safeRole}
- Session Display Name: ${safeName}
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
[CLIENT-SUPPLIED DEMONSTRATION SESSION CONTEXT — FRONTEND PROTOTYPE STATE]:
- Active Portal Role: ${safeRole}
- Has Linked Electricity Connections: NO
`;
            }

            // Sanitize optional recent conversation history (up to last 6 turns)
            let historyPrompt = '';
            if (Array.isArray(history) && history.length > 0) {
              const sanitizedTurns = history
                .slice(-6)
                .filter((h: any) => h && (h.sender === 'user' || h.sender === 'assistant') && typeof h.text === 'string')
                .map((h: any) => `${h.sender === 'user' ? 'User' : 'Vidyut Mitra'}: ${h.text.slice(0, 800)}`);
              if (sanitizedTurns.length > 0) {
                historyPrompt = `\n[RECENT CONVERSATION HISTORY]:\n${sanitizedTurns.join('\n')}\n`;
              }
            }

            const systemInstruction = `You are Vidyut Mitra, the utility operations and billing demonstration assistant on the VidyutFlow ERP prototype platform.

CRITICAL INSTRUCTIONS & GROUNDING RULES:

1. ACCOUNT & BILLING ACCURACY (STRICT ZERO HALLUCINATION & DEMO LABELING):
- You are provided with the user's scoped demonstration session context above.
- NEVER describe simulated demo bills or payment records as official UGVCL invoices or official tax receipts. Always clearly label them as simulated DEMO records ("Simulated Demo Bill Record — not an official UGVCL invoice").
- DO NOT invent subsidy reasons, regulatory approvals, tariff adjustments, urban adjustments, or payment incentives (never claim a difference is due to "RGPU urban adjustment", "timely digital payment credit", "promotional credit", or "approved tariff schedule adjustment").
- When the user asks about their electricity bill, connection, meter reading, payments, complaints, or applications:
  a) Locate the matching record in the provided session context.
  b) Quote the EXACT stored values from the demo record: Consumer Number (e.g. 04281-99231), Demo Bill ID, Billing Month (e.g. September 2026), Stored Billed Consumption (e.g. 360 kWh), Stored Total Amount (e.g. ₹2,185.00), Due Date, and Status.
  c) If the user writes a slight digit transposition of their linked consumer number (such as "04821-99231" instead of "04281-99231"), match it to their linked connection 04281-99231 and politely note the stored consumer number 04281-99231.
  d) Clearly distinguish Stored Demo Bill Record Values (stored energyCharges, fixedCharges, fuelPriceAdjustment, electricityDuty, rebateOrSubsidy, totalAmount) from Dynamically Calculated Slab Breakdown Totals:
     - Dynamically sum the stored slabBreakdown amounts from the bill record in context.
     - For example, on BILL-UG-2026-10-8821 (September 2026, 04281-99231, 360 kWh): the four stored slab amounts (₹152.50 + ₹175.00 + ₹622.50 + ₹572.00) dynamically sum to ₹1,522.00 (NEVER say ₹1,522.50), whereas the stored energyCharges field is ₹1,420.00.
     - Whenever the calculated slab total differs from the stored energyCharges field (such as the ₹102.00 difference between ₹1,522.00 and ₹1,420.00 on BILL-UG-2026-10-8821, ₹102.00 on BILL-UG-2026-09-8821, or ₹99.00 on BILL-UG-2026-08-8821), explicitly label that difference as an "unexplained demo-data discrepancy" because no supporting record in the dataset explains it.
  e) DO NOT estimate consumption (never guess 280–310 kWh). DO NOT invent missing meter readings, invoice line items, charges, payments, or account details.
  f) If a stored record contains only the bill total and consumption without line items, explicitly state that the exact charge breakdown is unavailable in the stored record.
  g) Multiple Connections & Ambiguity: If the user has multiple linked connections (e.g. 04281-99231 Residential RGPU and 04281-77190 Commercial NRGP) and asks about a bill without specifying the amount or connection, identify the selected dashboard connection's bill first and also mention the other connection's demo bill.
  h) Newly Registered Accounts: If hasLinkedConnections is NO (empty connections list), clearly state that no electricity connections or bills are currently linked to their account (${accountContext?.consumerName || 'their profile'}), and guide them to use the "Link Existing Connection" feature on [Open Dashboard](action:dashboard) or [View My Connections](action:connections). NEVER use or expose Smt. Meenaben Patel's demo records for newly registered accounts!
  i) Cross-Account Privacy: Never disclose records belonging to another consumer outside the provided session context.

2. REFERENCE TARIFF SCHEDULE:
- Residential (RGPU Urban Reference Slabs): 0–50 units @ ₹3.05/kWh; 51–100 units @ ₹3.50/kWh; 101–250 units @ ₹4.15/kWh; Above 250 units @ ₹5.20/kWh.
- Commercial (NRGP) & Solar Net-Metering (PM Surya Ghar / Gujarat Solar Policy): Quote only the reference rules provided without fabricating unverified rates or adjustments.

3. VALID IN-APP NAVIGATION (ROLE-SCOPED):
- Only recommend existing VidyutFlow navigation tabs for the user's active role (${safeRole}) using the exact token format [Button Label](action:tab_id):
  * If role is "consumer": [Open Dashboard](action:dashboard), [View My Connections](action:connections), [Apply New Connection](action:new-connection), [Open Electricity Bills](action:bills), [View Payment History](action:payments), [Go to Complaint Desk](action:complaints), [Open Service Requests](action:requests), [View Notifications](action:notifications), [Open Account Profile](action:profile).
  * If role is "employee": [ERP Overview](action:dashboard), [Application Queue](action:applications), [Consumer Ledger](action:consumers), [Complaint Queue](action:complaints), [Approval Center](action:approvals), [Dept Coordination](action:coordination), [Revenue Reports](action:reports).
  * If role is "field": [Field Console](action:dashboard), [Work Orders](action:workorders), [Site Feasibility](action:inspections), [Feeder Patrol](action:maintenance), [Offline Queue](action:offline), [Completed Jobs](action:history).
  * If role is "management": [Executive Cockpit](action:dashboard), [Revenue & Demand](action:analytics), [SLA Redressal](action:sla), [Feeder Overloads](action:feeders), [UGVCL AI Insights](action:ai-insights), [Executive Export](action:reports).
  * If role is "admin": [System Overview](action:overview), [Users & Roles](action:users), [Access Matrix](action:access), [Audit Trail](action:audit), [API Integrations](action:integrations), [Infrastructure & DB](action:infra), [System Settings](action:settings).
- NEVER invent non-existent navigation paths such as "My Account > Consumption History" or tabs belonging to other roles.

4. FORMATTING & PRESENTATION:
- Format cleanly using standard Markdown headings (###), bold text, bullet points, and Markdown tables for bill breakdowns.
- DO NOT output literal escaped hyphens like \\---, raw LaTeX $$ delimiters, or raw HTML entities.`;

            const promptContents = `${contextPrompt}${historyPrompt}
Current User Question: ${trimmedMessage}`;

            let reply = '';
            let isFallback = false;
            let fallbackReason: string | undefined;

            // Bounded Gemini model execution with 3.5-second server-side deadline & AbortController
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
                    systemInstruction,
                    abortSignal: serverAbortController.signal
                  });
                }

                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: promptContents,
                  config: {
                    systemInstruction,
                    temperature: 0.2,
                    abortSignal: serverAbortController.signal
                  }
                });
                return response.text || '';
              })();

              try {
                reply = await Promise.race([apiPromise, timeoutPromise]);
                geminiCooldownUntil = 0;
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
                `[Vidyut Mitra AI Proxy] Gemini API ${isTimeout ? `deadline exceeded (${SERVER_GEMINI_TIMEOUT_MS}ms)` : isQuotaExceeded ? 'quota limit reached' : 'temporarily unavailable'}; activated Utility Grounded Engine.`
              );
              reply = generateUtilityGroundedResponse(trimmedMessage, safeRole, accountContext);
              isFallback = true;
              fallbackReason = isTimeout ? 'TIMEOUT' : isQuotaExceeded ? 'QUOTA_EXHAUSTED' : 'SERVICE_UNAVAILABLE';

              // Activate 60s circuit-breaker cooldown so subsequent queries respond immediately
              geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
              geminiCooldownReason = fallbackReason;
              geminiCooldownKey = apiKey;
            }

            if (!reply || !reply.trim()) {
              reply = generateUtilityGroundedResponse(trimmedMessage, safeRole, accountContext);
              isFallback = true;
              fallbackReason = fallbackReason || 'EMPTY_MODEL_REPLY';
            }

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                reply,
                isFallback,
                fallbackReason,
                configured: true
              })
            );
          } catch (err: any) {
            console.error('[Vidyut Mitra AI Proxy] Server recovery handler activated after request processing failure.');
            // Even on unexpected exceptions, provide the user with the authoritative grounded answer
            try {
              const body = JSON.parse(rawBody || '{}');
              const safeReply = generateUtilityGroundedResponse(body?.message || '', body?.role || 'consumer', body?.accountContext);
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  reply: safeReply,
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
                  isFallback: true,
                  configured: true
                })
              );
            }
          }
        });
      });
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
      // Allow the sandbox preview proxy host (e.g. *.e2b.app) in dev
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
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 5173
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
          },
        },
      },
    },
  };
});
