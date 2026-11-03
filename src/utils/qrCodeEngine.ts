/**
 * VIDYUTFLOW 2.0 — UNIQUE QR CODE VERIFICATION ENGINE
 *
 * Generates genuine, scannable QR codes for every canonical electricity bill.
 * Provides:
 * - Scannable QR code matrix and SVG generation
 * - Direct vector rectangle coordinates for native PDF embedding
 * - Configurable application origin without fake localhost claims
 * - Safe opaque reference resolution
 * - Client-side bill verification route parsing (#verify-bill?ref=...)
 */

import QRCode from 'qrcode';

export interface GeneratedQrCode {
  canonicalUrl: string;
  safeBillReference: string;
  consumerNo: string;
  matrix: boolean[][]; // row by col, true = black module
  size: number;
  svg: string;
  dataUrl?: string;
}

export interface ParsedBillVerificationParams {
  isValid: boolean;
  ref?: string;
  consumerNo?: string;
  rawPayload: string;
}

/**
 * Derives the safe, canonical URL encoded inside the QR code for a given electricity bill.
 */
export function deriveCanonicalQrVerificationUrl(
  billNo: string,
  consumerNo: string,
  baseOrigin?: string
): { url: string; safeRef: string } {
  const safeRef = String(billNo || 'BILL-UG-UNKNOWN')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  const cleanConsumer = String(consumerNo || '04281-99231')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');

  let origin = baseOrigin;
  if (!origin) {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin;
    } else {
      origin = 'https://vidyutflow.ugvcl.demo';
    }
  }

  // Construct mobile-friendly verification link
  const url = `${origin}#verify-bill?ref=${encodeURIComponent(safeRef)}&c=${encodeURIComponent(
    cleanConsumer
  )}`;

  return { url, safeRef };
}

/**
 * Generates the QR code module matrix synchronously or using QRCode.create.
 */
export function generateQrCodeMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const matrix: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Generates clean SVG string for QR code with customizable size and quiet zones.
 */
export function generateQrCodeSvg(
  text: string,
  options: {
    sizePx?: number;
    margin?: number;
    colorDark?: string;
    colorLight?: string;
  } = {}
): string {
  const margin = options.margin ?? 2;
  const colorDark = options.colorDark ?? '#0f172a';
  const colorLight = options.colorLight ?? '#ffffff';
  const matrix = generateQrCodeMatrix(text);
  const matrixSize = matrix.length;
  const totalGrid = matrixSize + margin * 2;
  const sizePx = options.sizePx ?? 140;
  const cellSize = sizePx / totalGrid;

  const rects: string[] = [];

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = ((c + margin) * cellSize).toFixed(2);
        const y = ((r + margin) * cellSize).toFixed(2);
        const s = cellSize.toFixed(2);
        rects.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${colorDark}" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="QR Code for Bill Verification">
  <rect width="100%" height="100%" fill="${colorLight}" />
  ${rects.join('\n  ')}
</svg>`;
}

/**
 * Calculates vector rectangle coordinates for embedding the QR code directly into a PDF stream.
 * In PDF coordinates, (targetX, targetY) is the bottom-left corner of the QR box.
 */
export function calculateQrCodePdfRects(
  text: string,
  targetX: number,
  targetY: number,
  sizePt: number,
  marginModules = 2
): Array<{ x: number; y: number; width: number; height: number }> {
  const matrix = generateQrCodeMatrix(text);
  const matrixSize = matrix.length;
  const totalGrid = matrixSize + marginModules * 2;
  const cellPt = sizePt / totalGrid;
  const rects: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = targetX + (c + marginModules) * cellPt;
        // In PDF coordinates, y increases upward from the bottom of the page
        const y = targetY + sizePt - (r + marginModules + 1) * cellPt;
        rects.push({
          x,
          y,
          width: cellPt,
          height: cellPt,
        });
      }
    }
  }

  return rects;
}

/**
 * Parses a QR scan verification URL or hash string.
 * Supports:
 * - '#verify-bill?ref=BILL-UG-2026-10-8821&c=04281-99231'
 * - 'https://.../#verify-bill?ref=...'
 */
export function parseBillVerificationUrl(rawInput: string): ParsedBillVerificationParams {
  if (!rawInput) return { isValid: false, rawPayload: '' };

  try {
    const raw = String(rawInput).trim();
    let queryPart = '';

    if (raw.includes('#verify-bill')) {
      const idx = raw.indexOf('#verify-bill');
      const hash = raw.substring(idx);
      const qIdx = hash.indexOf('?');
      if (qIdx !== -1) {
        queryPart = hash.substring(qIdx + 1);
      }
    } else if (raw.includes('?')) {
      queryPart = raw.substring(raw.indexOf('?') + 1);
    }

    if (!queryPart) {
      return { isValid: false, rawPayload: raw };
    }

    const params = new URLSearchParams(queryPart);
    const ref = params.get('ref') || undefined;
    const consumerNo = params.get('c') || undefined;

    return {
      isValid: Boolean(ref),
      ref,
      consumerNo,
      rawPayload: raw,
    };
  } catch {
    return { isValid: false, rawPayload: rawInput };
  }
}
