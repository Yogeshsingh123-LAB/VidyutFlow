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

export const UGVCL_MERCHANT_UPI_ID = 'kushwsand@naviaxis';
export const UGVCL_MERCHANT_NAME = 'UGVCL VidyutFlow';

export type UpiQrStatus = 'ACTIVE' | 'ACTIVE_OVERDUE_UPDATED' | 'PAID_CONSUMED';

export interface UpiBillQrPayload {
  status: UpiQrStatus;
  isActive: boolean;
  isOverdueUpdated?: boolean;
  upiId: string;
  merchantName: string;
  billNo: string;
  qrTransactionRef: string;
  consumerNo: string;
  amount: number;
  expiryDate: string;
  uri: string;
  reason?: string;
}

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDateEndOfDayMs(dateStr?: string): number | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // Match DD-MMM-YYYY (e.g. 30-Oct-2026)
  const dmy = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = MONTH_INDEX_MAP[dmy[2].slice(0, 3).toLowerCase()];
    const year = Number(dmy[3]);
    if (mon !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(year, mon, day, 23, 59, 59, 999).getTime();
    }
  }
  // Match YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 23, 59, 59, 999).getTime();
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  return null;
}

/**
 * Generates an NPCI-compliant UPI payment URI (`upi://pay?...`) for any UPI app
 * (GPay, PhonePe, Paytm, BHIM, Navi, etc.).
 * - Remains active until payment is completed.
 * - If the due date is missed, marks the old pre-due QR as superseded/expired and
 *   issues an updated QR with the recalculated bill amount (including late charges).
 * - Permanently deactivates once the bill is paid.
 */
export function generateUpiBillQrPayload(params: {
  billNo: string;
  consumerNo: string;
  amount: number;
  dueDate: string;
  isPaid?: boolean;
  referenceDate?: string;
  upiId?: string;
}): UpiBillQrPayload {
  const upiId = params.upiId || UGVCL_MERCHANT_UPI_ID;
  const cleanBillNo = String(params.billNo || 'BILL-UG-UNKNOWN').trim();
  const cleanConsumer = String(params.consumerNo || '').trim();
  const amount = Math.max(0, Number(params.amount) || 0);
  const expiryDate = String(params.dueDate || '').trim();

  if (params.isPaid || amount <= 0) {
    return {
      status: 'PAID_CONSUMED',
      isActive: false,
      isOverdueUpdated: false,
      upiId,
      merchantName: UGVCL_MERCHANT_NAME,
      billNo: cleanBillNo,
      qrTransactionRef: cleanBillNo,
      consumerNo: cleanConsumer,
      amount: 0,
      expiryDate,
      uri: '',
      reason: 'Payment already received & receipt generated — QR code deactivated.',
    };
  }

  const expiryMs = parseDateEndOfDayMs(expiryDate);
  const refMs = params.referenceDate
    ? parseDateEndOfDayMs(params.referenceDate) ?? Date.now()
    : Date.now();
  const isOverdue = expiryMs !== null && refMs > expiryMs;
  const refTag = (params.referenceDate || new Date(refMs).toISOString().slice(0, 10)).replace(/[^A-Za-z0-9]/g, '');
  const qrTransactionRef = isOverdue ? `${cleanBillNo}-OD-${refTag}` : cleanBillNo;

  const formattedAmt = amount.toFixed(2);
  const note = isOverdue
    ? `UGVCL Updated Overdue Bill ${cleanBillNo} | Consumer ${cleanConsumer}`
    : `UGVCL Bill ${cleanBillNo} | Consumer ${cleanConsumer} | Due ${expiryDate}`;
  const uri =
    `upi://pay?pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent(UGVCL_MERCHANT_NAME)}` +
    `&tr=${encodeURIComponent(qrTransactionRef)}` +
    `&tn=${encodeURIComponent(note)}` +
    `&am=${encodeURIComponent(formattedAmt)}` +
    `&cu=INR`;

  return {
    status: isOverdue ? 'ACTIVE_OVERDUE_UPDATED' : 'ACTIVE',
    isActive: true,
    isOverdueUpdated: isOverdue,
    upiId,
    merchantName: UGVCL_MERCHANT_NAME,
    billNo: cleanBillNo,
    qrTransactionRef,
    consumerNo: cleanConsumer,
    amount,
    expiryDate,
    uri,
    reason: isOverdue
      ? `Due date (${expiryDate}) missed — old QR expired; updated QR active for ₹${formattedAmt} until paid.`
      : undefined,
  };
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
