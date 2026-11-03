import { createWorker, PSM } from 'tesseract.js';
import type { AmbiguousDigitNotice, MeterOCRResult } from './meterReading';

export const MAX_METER_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_METER_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface NormalizedCropBox {
  /** 0 <= x <= 1 */
  x: number;
  /** 0 <= y <= 1 */
  y: number;
  /** 0 < width <= 1 */
  width: number;
  /** 0 < height <= 1 */
  height: number;
}

export interface PixelCropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const AMBIGUOUS_CHAR_MAP: Record<string, { digit: string; alternatives: string[]; reason: string }> = {
  B: { digit: '8', alternatives: ['8', 'B'], reason: 'Character "B" frequently misread for digit "8"' },
  b: { digit: '6', alternatives: ['6', 'b', '8'], reason: 'Character "b" frequently misread for digit "6" or "8"' },
  O: { digit: '0', alternatives: ['0', 'O', 'D'], reason: 'Letter "O" frequently misread for digit "0"' },
  o: { digit: '0', alternatives: ['0', 'o'], reason: 'Letter "o" frequently misread for digit "0"' },
  D: { digit: '0', alternatives: ['0', 'D', 'O'], reason: 'Letter "D" frequently misread for digit "0"' },
  S: { digit: '5', alternatives: ['5', 'S'], reason: 'Character "S" frequently misread for digit "5"' },
  s: { digit: '5', alternatives: ['5', 's'], reason: 'Character "s" frequently misread for digit "5"' },
  I: { digit: '1', alternatives: ['1', 'I', 'l'], reason: 'Letter "I" frequently misread for digit "1"' },
  l: { digit: '1', alternatives: ['1', 'l', 'I'], reason: 'Letter "l" frequently misread for digit "1"' },
  '|': { digit: '1', alternatives: ['1', '|'], reason: 'Vertical bar "|" frequently misread for digit "1"' },
  '!': { digit: '1', alternatives: ['1', '!'], reason: 'Exclamation "!" frequently misread for digit "1"' },
  G: { digit: '6', alternatives: ['6', 'G', '0'], reason: 'Character "G" frequently misread for digit "6"' },
  Z: { digit: '2', alternatives: ['2', 'Z'], reason: 'Character "Z" frequently misread for digit "2"' }
};

export function validateMeterPhoto(file: File): string | null {
  if (!ACCEPTED_METER_PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP photo.';
  if (file.size <= 0 || file.size > MAX_METER_PHOTO_BYTES) return 'Photo must be between 1 byte and 5 MiB.';
  return null;
}

export function sanitizeCropBox(crop?: Partial<NormalizedCropBox> | null): NormalizedCropBox {
  if (!crop) return { x: 0, y: 0, width: 1, height: 1 };
  let x = typeof crop.x === 'number' && Number.isFinite(crop.x) ? crop.x : 0;
  let y = typeof crop.y === 'number' && Number.isFinite(crop.y) ? crop.y : 0;
  let width = typeof crop.width === 'number' && Number.isFinite(crop.width) ? crop.width : 1;
  let height = typeof crop.height === 'number' && Number.isFinite(crop.height) ? crop.height : 1;

  x = Math.max(0, Math.min(0.95, x));
  y = Math.max(0, Math.min(0.95, y));
  width = Math.max(0.05, Math.min(1 - x, width));
  height = Math.max(0.05, Math.min(1 - y, height));

  return { x, y, width, height };
}

export function computeCropPixelCoordinates(
  canvasWidth: number,
  canvasHeight: number,
  crop: NormalizedCropBox
): PixelCropCoordinates {
  const sanitized = sanitizeCropBox(crop);
  const x = Math.max(0, Math.min(canvasWidth - 1, Math.round(sanitized.x * canvasWidth)));
  const y = Math.max(0, Math.min(canvasHeight - 1, Math.round(sanitized.y * canvasHeight)));
  const width = Math.max(1, Math.min(canvasWidth - x, Math.round(sanitized.width * canvasWidth)));
  const height = Math.max(1, Math.min(canvasHeight - y, Math.round(sanitized.height * canvasHeight)));
  return { x, y, width, height };
}

export function detectAmbiguousDigits(rawText: string, candidateReading = ''): AmbiguousDigitNotice[] {
  const notices: AmbiguousDigitNotice[] = [];
  if (!rawText) return notices;

  // Search for alphanumeric tokens that combine digits and commonly substituted letters
  const tokens = rawText.match(/[0-9A-Za-z!|]+(?:[.,][0-9A-Za-z!|]+)?/g) || [];
  const candidateDigits = candidateReading.replace(/[.,]/g, '');

  for (const token of tokens) {
    if (token.length < 3) continue;
    let hasAmbiguousChar = false;
    for (const char of token) {
      if (AMBIGUOUS_CHAR_MAP[char]) {
        hasAmbiguousChar = true;
        break;
      }
    }

    if (hasAmbiguousChar) {
      for (let i = 0; i < token.length; i++) {
        const char = token[i];
        const match = AMBIGUOUS_CHAR_MAP[char];
        if (match) {
          notices.push({
            position: i + 1,
            rawChar: char,
            proposedDigit: match.digit,
            alternatives: match.alternatives,
            reason: match.reason
          });
        }
      }
      break;
    }
  }

  // If no token was found with explicit letters but candidate has ambiguous digit patterns
  // (e.g. rawText had 'B' but candidate stripped it, or candidate has '8' where raw had 'B')
  if (notices.length === 0 && candidateDigits) {
    for (const [char, meta] of Object.entries(AMBIGUOUS_CHAR_MAP)) {
      if (rawText.includes(char) && !rawText.includes(meta.digit)) {
        notices.push({
          position: 1,
          rawChar: char,
          proposedDigit: meta.digit,
          alternatives: meta.alternatives,
          reason: meta.reason
        });
      }
    }
  }

  return notices;
}

/** Re-encodes through canvas to strip metadata, apply the chosen rotation and optional crop before OCR. */
export async function prepareMeterPhoto(
  file: File,
  rotationDegrees = 0,
  cropArea?: NormalizedCropBox
): Promise<Blob> {
  const image = await createImageBitmap(file);
  const rotated = Math.abs(rotationDegrees % 180) === 90;
  const canvas = document.createElement('canvas');
  canvas.width = rotated ? image.height : image.width;
  canvas.height = rotated ? image.width : image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo preview is not supported by this browser.');
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  image.close();

  let targetCanvas: HTMLCanvasElement = canvas;
  if (cropArea && (cropArea.x > 0 || cropArea.y > 0 || cropArea.width < 1 || cropArea.height < 1)) {
    const coords = computeCropPixelCoordinates(canvas.width, canvas.height, cropArea);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = coords.width;
    croppedCanvas.height = coords.height;
    const cropCtx = croppedCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        coords.x,
        coords.y,
        coords.width,
        coords.height,
        0,
        0,
        coords.width,
        coords.height
      );
      targetCanvas = croppedCanvas;
    }
  }

  const blob = await new Promise<Blob | null>(resolve => targetCanvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('The photo could not be prepared for local reading.');
  if (blob.size > MAX_METER_PHOTO_BYTES) throw new Error('Prepared photo exceeds the 5 MiB limit.');
  return blob;
}

export async function extractMeterReading(
  image: Blob,
  onProgress?: (progress: number, status: string) => void,
  isCropped = false
): Promise<MeterOCRResult> {
  // Tesseract runs locally in a Web Worker. The selected language model is fetched
  // from the project's public CDN on first use; image pixels are never sent there.
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker('eng', 1, {
      workerPath: '/vendor/tesseract/worker.min.js',
      workerBlobURL: false,
      corePath: '/vendor/tesseract',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: message => onProgress?.(message.progress || 0, message.status || 'Reading photo')
    });

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
    const result = await worker.recognize(image);
    const rawText = result.data.text.trim();
    const candidates = rawText.match(/\d+(?:[.,]\d+)?/g) || [];
    let candidateReading = candidates.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0] || '';

    // If pure digits weren't found or were very short, check for alphanumeric candidates with letter substitutions
    const ambiguousDigits = detectAmbiguousDigits(rawText, candidateReading);
    if (!candidateReading && ambiguousDigits.length > 0) {
      // Find candidate alphanumeric token with substitutions
      const tokens = rawText.match(/[0-9A-Za-z!|]+(?:[.,][0-9A-Za-z!|]+)?/g) || [];
      const bestAlphanumeric = tokens.sort((a, b) => b.length - a.length)[0];
      if (bestAlphanumeric) {
        let proposed = '';
        for (const char of bestAlphanumeric) {
          if (AMBIGUOUS_CHAR_MAP[char]) {
            proposed += AMBIGUOUS_CHAR_MAP[char].digit;
          } else if (/\d|[.,]/.test(char)) {
            proposed += char;
          }
        }
        if (proposed && /\d/.test(proposed)) {
          candidateReading = proposed;
        }
      }
    }

    const parsed = candidateReading ? Number(candidateReading.replace(',', '.')) : Number.NaN;
    const normalizedReading = Number.isFinite(parsed) ? parsed : undefined;
    const identity = rawText.match(/(?:MTR|METER|UGVCL)[\s:#-]*[A-Z0-9-]{5,}/i)?.[0] || '';
    const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : undefined;

    return {
      meterId: identity,
      rawText,
      candidateReading,
      ...(normalizedReading === undefined ? {} : { normalizedReading }),
      ...(confidence === undefined ? {} : { confidence }),
      requiresReview:
        !candidateReading ||
        candidates.length !== 1 ||
        confidence === undefined ||
        confidence < 75 ||
        ambiguousDigits.length > 0,
      engineVersion: `Tesseract ${result.data.version || 'unknown'} / tesseract.js 7.0.0`,
      extractedAt: new Date().toISOString(),
      engine: 'tesseract.js',
      ambiguousDigits: ambiguousDigits.length > 0 ? ambiguousDigits : undefined,
      isCropped
    };
  } catch (error) {
    return {
      meterId: '',
      rawText: '',
      candidateReading: '',
      requiresReview: true,
      engineVersion: 'Tesseract worker / local error fallback',
      extractedAt: new Date().toISOString(),
      engine: 'tesseract.js',
      isCropped
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}

