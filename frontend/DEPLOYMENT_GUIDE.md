# VidyutFlow — UGVCL Intelligent Utility ERP (PS000125)
## Deployment & Operations Guide (`Phase 9`)

This guide documents the runtime requirements, environment configuration, build and preview commands, server-side API proxy requirements, and operational procedures for deploying **VidyutFlow UGVCL Intelligent Utility ERP (PS000125)** in **Demo Mode** (`DEMO`) or connecting it to an external persistent database service (`LIVE`).

---

## 1. Required Node.js & Runtime Version

- **Node.js:** `>= 20.11.0` (LTS recommended: `v20.x` or `v22.x`).
- **Package Manager:** `npm >= 10.x`.
- **Operating Mode Requirement:** Because VidyutFlow includes server-side middleware for authentication (`/api/auth/*`), health diagnostics (`/api/health`), and Gemini AI agent execution (`/api/ai-chat`), **it requires a Node.js server runtime** (not a static-only file bucket) so server-side secrets (`GEMINI_API_KEY`, `SESSION_SECRET`) remain protected on the server.

---

## 2. Required Environment Variables

Create a `.env` file in the project root (copied from `.env.example`) or configure secrets in your hosting platform:

| Variable Name | Scope | Required | Default / Behavior if Omitted | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Server-Only** | Optional (Recommended) | Deterministic ERP Fallback mode active | Google Gemini API key used exclusively by the `/api/ai-chat` server middleware (`gemini-2.5-flash`). **Never** prefix with `VITE_`. |
| `SESSION_SECRET` | **Server-Only** | Optional in Demo / Required in Prod | Ephemeral 32-byte key generated at startup | HMAC-SHA256 secret (minimum 32 characters) used to sign `vidyut_session` HTTP-only cookies in `/api/auth/*`. |
| `VITE_ERP_OPERATING_MODE` | Client Build/Runtime | Optional | `DEMO` | Initial ERP operating mode (`DEMO` or `LIVE`). Can also be toggled at runtime in the Admin Portal or Mode Switcher. |
| `VITE_ERP_API_BASE_URL` | Client Build/Runtime | Optional | `/api/v1` | Base URL for persistent external ERP REST endpoints when running in `LIVE` mode. |
| `VITE_ERP_API_TIMEOUT_MS` | Client Build/Runtime | Optional | `8000` | Request timeout (in milliseconds) for `ErpApiClient` calls in `LIVE` mode. |

> **CRITICAL SECURITY RULE:** Never expose `GEMINI_API_KEY` or `SESSION_SECRET` with a `VITE_` prefix. All AI model calls and session token signing execute strictly on the server.

---

## 3. Build, Development, Test, and Start Commands

### Install Dependencies
```bash
npm install
```

### Run Verification & Regression Suites
```bash
# 1. Static TypeScript verification (zero errors required)
npm run lint

# 2. Full 14-suite automated regression & E2E verification
npm test

# 3. Compile production frontend assets to dist/
npm run build
```

### Start the Application (Development / AI Studio Container)
```bash
npm run dev
```
- Starts the Vite server on `http://0.0.0.0:3000` with `/api/health`, `/api/auth/*`, and `/api/ai-chat` middleware mounted.

### Start the Production Build Preview Server (Node.js Runtime)
```bash
npm run build
npm run preview -- --port=3000 --host=0.0.0.0
```
- `vite.config.ts` registers `attachServerMiddlewares` in **both** `configureServer` and `configurePreviewServer`. Running `npm run preview` serves the compiled `dist/` bundle while keeping `/api/health`, `/api/auth/*`, and `/api/ai-chat` active on the same Node.js process.

---

## 4. Hosting Requirements

- **Supported Hosting Targets:**
  - **Google Cloud Run / App Engine / Compute Engine** (Node.js container running `npm run preview -- --port=3000 --host=0.0.0.0` or an Express server).
  - **Railway / Render / Fly.io** (Node.js web service).
  - **Google AI Studio Build Preview** (native container runtime on port `3000`).
- **Unsupported as Standalone Static Hosting:**
  - Do **not** deploy `dist/` alone to a static-only CDN (e.g., GitHub Pages or S3 without a backend proxy), as static hosts cannot execute the Node.js `/api/auth/*` and `/api/ai-chat` server middleware.
  - Note: `vercel.json` is configured with `"source": "/((?!api/).*)"` so `/api/*` routes are never silently rewritten to `/index.html`.

---

## 5. API Proxy and Authentication Route Requirements

The Node.js middleware (`vidyutMitraAiPlugin` in `vite.config.ts`) mounts three server-side route groups:

1. **`GET /api/health`**
   - Returns JSON readiness status (`status: "ok"`, `authMiddleware: "mounted"`, `aiProxyMiddleware: "mounted"`, `geminiConfigured: boolean`).
2. **`POST /api/auth/login` | `POST /api/auth/signup` | `POST /api/auth/logout` | `GET /api/auth/me` | `GET /api/auth/audit`**
   - Implemented in `src/server/authRoutes.ts` & `src/server/authService.ts`.
   - Manages PBKDF2-SHA256 password verification, HMAC-signed HTTP-only cookies (`vidyut_session`), CSRF header verification (`X-Requested-With: VidyutFlow-ERP-Client`), and role-based session introspection.
3. **`POST /api/ai-chat`**
   - Authenticates the caller's session or demo role, enforces sliding-window IP and user rate limits, screens inputs via `detectPromptInjection()`, executes role-scoped read-only tools (`src/server/agenticTools.ts`), and calls `@google/genai` (`gemini-2.5-flash`).

---

## 6. Gemini API Configuration & Fallback Resilience

- **Model Used:** `gemini-2.5-flash` via the official `@google/genai` SDK.
- **Resilience Architecture:**
  - **Timeout Guard:** Every server-side Gemini call is bounded by a `3,500ms` server deadline (`SERVER_GEMINI_TIMEOUT_MS` in `vite.config.ts`) and an `8,000ms` client `AbortController` timeout (`AIAssistantDrawer.tsx`).
  - **Retry & Circuit Breaker:** Transient `HTTP 429` (`RESOURCE_EXHAUSTED`) or `503` errors trigger bounded retries with exponential backoff and cooldown (`src/server/aiCache.ts`).
  - **Deterministic ERP Fallback & FastAPI TF-IDF Companion:** If `GEMINI_API_KEY` is unset, quota is exhausted, or the circuit breaker opens, `/api/ai-chat` returns a HTTP `200` response generated by `generateUtilityGroundedResponse()` (`src/utils/utilityAiEngine.ts`) with `isFallback: true`. Each reply explicitly badges `Gemini + Read-Only Tools` vs `Grounded Engine`, and when a verified FastAPI session is active the drawer also queries `POST /api/assistant/chat` (local scikit-learn TF-IDF policy RAG + role/zone-scoped live queue) and cites matched policy sources.

---

## 7. Demo Mode (`DEMO`) Setup & Reset Procedure

- **Default Behavior:** The application boots in `DEMO` mode with all 5 UGVCL portals populated with deterministic seed records (`src/data/mockData.ts`).
- **Browser Persistence:** Mutations made during a demo session are persisted in browser `localStorage` (`vidyutone_*` and `vidyutflow_*` keys).
- **Deterministic Reset:**
  - Any user can click **Help & Info → Reset Demo Data**, **User Avatar → Reset Demo Records**, or press `Cmd/Ctrl + K` → **Reset Demo Data**.
  - `resetDemoData()` in `src/context/AppContext.tsx` purges all `vidyutone_*` and `vidyutflow_*` keys, clears dismissed modal and idempotency refs, and immediately re-seeds all canonical ERP records, critical incidents, and pending AI recommendations.

---

## 8. Live Backend (`LIVE`) Connection Requirements

- **Connecting an External Database Service:**
  - Implement the REST endpoints documented in `BACKEND_INTEGRATION_GUIDE.md` under `/api/v1/*` (`consumers`, `connections`, `applications`, `complaints`, `work-orders`, `bills`, `payments`, `incidents`, `ai-recommendations`, `audit-logs`, `notifications`).
  - Set `VITE_ERP_OPERATING_MODE=LIVE` and `VITE_ERP_API_BASE_URL=https://your-erp-backend.example.com/api/v1`.
- **Strict No-Silent-Fallback Guarantee:**
  - When operating in `LIVE` mode, `ErpApiClient` (`src/services/erpApiClient.ts`) will **never** silently substitute simulated demo data if a backend request fails or times out. Instead, `liveSyncStatus` transitions to `'unavailable'` and a prominent **`LIVE BACKEND UNAVAILABLE`** alert banner is rendered with a **Retry Live Sync** button and an explicit **Switch to Demo Mode** option.

---

## 9. Rollback Instructions

If a configuration change or external backend deployment causes issues during a presentation or release:

1. **Immediate Runtime Rollback to Demo Mode (Zero Downtime):**
   - Click the **`LIVE`** badge in the top navigation bar (or open **Admin Portal → Infrastructure & Mode**) and select **Switch to DEMO Mode**, then click **Reset Demo Data**.
2. **Environment Variable Rollback:**
   - Set `VITE_ERP_OPERATING_MODE=DEMO` in `.env` and restart the server (`npm run dev` or `npm run preview`).
3. **Codebase Rollback:**
   - Run `npm run clean && npm run build && npm test` to verify a clean build artifact before restarting the process.

---

## 10. Security Considerations

1. **Secret Isolation:** `GEMINI_API_KEY` and `SESSION_SECRET` are accessed only via `process.env` inside Node.js server files (`vite.config.ts`, `src/server/*`) and are verified by automated tests (`tests/security-resilience-stress.test.ts`) to never appear in client code.
2. **Consumer Record Isolation:** Both client repositories and server-side AI tools (`src/server/agenticTools.ts`) filter consumer connections, bills, payments, applications, and complaints by the authenticated consumer's linked `consumerNo`.
3. **Read-Only AI Execution:** No Gemini tool has write/mutation capability. All AI-proposed operational changes require human review and role validation in `HumanApprovalModal`.
4. **Prompt-Injection Defense & Log Redaction:** Incoming AI queries are screened by `detectPromptInjection()` (`src/utils/securityHardening.ts`), and sensitive fields (passwords, tokens, API keys) are redacted by `redactSensitiveData()` before logging.
