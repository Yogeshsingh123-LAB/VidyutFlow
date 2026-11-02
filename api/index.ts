import type { IncomingMessage, ServerResponse } from 'http';
import { createProductionRequestHandler } from '../src/server/prodServer';

/**
 * Serverless `/api/*` entry point for Vercel deployments (Item #7).
 * Ensures `/api/health`, `/api/auth/*`, and `/api/ai-chat` continue working
 * when deployed outside `vite dev`.
 */
const handler = createProductionRequestHandler();

export default function vercelApiHandler(req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
