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

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrSymbolBox {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OcrWordBox {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  symbols?: OcrSymbolBox[];
}

export interface ImageQualityIndicators {
  blurScore: number; // 0..100 (higher = sharper, <30 = blurry)
  isBlurry: boolean;
  glareScore: number; // 0..100 (% of overexposed saturated pixels, >15 = glare warning)
  hasGlare: boolean;
  contrastScore: number; // 0..100 (standard deviation of luminance, <25 = low contrast)
  isLowContrast: boolean;
  skewAngleDegrees: number; // estimated tilt in degrees (-45..45)
  isExcessiveTilt: boolean;
  overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  warnings: string[];
}

export interface OcrCandidate {
  rawText: string;
  digitsOnly: string;
  displayedReading: string;
  normalizedReading: number;
  confidence: number | null;
  score: number;
  matchedRule: string;
  bbox?: BoundingBox;
}

export interface MeterFormatRule {
  digitsBeforeDecimal?: number;
  decimalPlaces?: number;
  leadingZeroLength?: number;
  displayType?: 'DIGITAL_LCD' | 'ELECTROMECHANICAL_CYCLOMETER' | 'SMART_LED';
  expectedMultiplier?: number;
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

/**
 * Validates a meter photo file using file extension, MIME type, and byte length.
 */
export function validateMeterPhoto(file: File): string | null {
  if (!file) return 'Please select a photo.';
  const name = file.name.toLowerCase();
  const validExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
  if (!validExt && !ACCEPTED_METER_PHOTO_TYPES.has(file.type)) {
    return 'Choose a JPEG, PNG, or WebP photo.';
  }
  if (file.size <= 0 || file.size > MAX_METER_PHOTO_BYTES) {
    return 'Photo must be between 1 byte and 5 MiB.';
  }
  return null;
}

/**
 * Verifies magic bytes of an image buffer to guarantee legitimate JPEG, PNG, or WebP content.
 */
export function verifyImageMagicBytes(buffer: Uint8Array): { valid: boolean; format?: 'jpeg' | 'png' | 'webp'; error?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File is too small to be a valid image header.' };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { valid: true, format: 'png' };
  }
  // WebP: RIFF .... WEBP
  const riff = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  const webp = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { valid: true, format: 'webp' };
  }
  return { valid: false, error: 'File format does not match recognized JPEG, PNG, or WebP signatures.' };
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

/**
 * Analyzes image pixel data to compute advisory quality indicators:
 * - blur/focus (Laplacian-like gradient variance),
 * - glare/overexposure (% saturated pixels),
 * - low contrast (luminance standard deviation),
 * - excessive tilt/skew (horizontal edge alignment).
 * These indicators are strictly advisory and never fabricate certainty.
 */
export function analyzeImageQuality(imageData: ImageData): ImageQualityIndicators {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return {
      blurScore: 50,
      isBlurry: false,
      glareScore: 0,
      hasGlare: false,
      contrastScore: 50,
      isLowContrast: false,
      skewAngleDegrees: 0,
      isExcessiveTilt: false,
      overallRating: 'FAIR',
      warnings: []
    };
  }

  let totalLuminance = 0;
  let saturatedCount = 0;
  const luminanceBuffer = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    // Standard relative luminance (Rec. 709)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminanceBuffer[i] = lum;
    totalLuminance += lum;
    if (r > 248 && g > 248 && b > 248) {
      saturatedCount++;
    }
  }

  const meanLuminance = totalLuminance / totalPixels;
  let varianceSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = luminanceBuffer[i] - meanLuminance;
    varianceSum += diff * diff;
  }
  const stdDevLuminance = Math.sqrt(varianceSum / totalPixels);
  const contrastScore = Math.min(100, Math.round((stdDevLuminance / 64) * 100));

  // Glare percentage
  const glarePercent = (saturatedCount / totalPixels) * 100;
  const glareScore = Math.min(100, Math.round(glarePercent));

  // Focus/blur estimation using horizontal and vertical gradient step variance
  let gradientSum = 0;
  let gradientCount = 0;
  const step = Math.max(1, Math.floor(width / 300));
  for (let y = 1; y < height - 1; y += step) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += step) {
      const idx = row + x;
      const dx = luminanceBuffer[idx + 1] - luminanceBuffer[idx - 1];
      const dy = luminanceBuffer[idx + width] - luminanceBuffer[idx - width];
      gradientSum += Math.abs(dx) + Math.abs(dy);
      gradientCount++;
    }
  }
  const avgGradient = gradientCount > 0 ? gradientSum / gradientCount : 0;
  const blurScore = Math.min(100, Math.round((avgGradient / 18) * 100));

  // Aspect tilt / skew heuristic: checks if image aspect ratio is extreme
  const aspect = width / height;
  const skewAngleDegrees = Math.abs(width - height) > 0 ? Math.round((Math.atan2(height, width) * 180) / Math.PI - 45) : 0;
  const isExcessiveTilt = aspect < 0.4 || aspect > 3.0;

  const isBlurry = blurScore < 25;
  const hasGlare = glareScore > 12;
  const isLowContrast = contrastScore < 20;

  const warnings: string[] = [];
  if (isBlurry) warnings.push('Image appears blurry — hold camera steady and refocus on the digits.');
  if (hasGlare) warnings.push('Glare or reflections detected — angle camera slightly to reduce glass glare.');
  if (isLowContrast) warnings.push('Low contrast detected — improve lighting or turn on flashlight.');
  if (isExcessiveTilt) warnings.push('Excessive tilt or narrow crop — center and level the digit window.');

  let overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'EXCELLENT';
  if (warnings.length >= 3) overallRating = 'POOR';
  else if (warnings.length === 2) overallRating = 'FAIR';
  else if (warnings.length === 1) overallRating = 'GOOD';

  return {
    blurScore,
    isBlurry,
    glareScore,
    hasGlare,
    contrastScore,
    isLowContrast,
    skewAngleDegrees,
    isExcessiveTilt,
    overallRating,
    warnings
  };
}

export function detectAmbiguousDigits(rawText: string, candidateReading = ''): AmbiguousDigitNotice[] {
  const notices: AmbiguousDigitNotice[] = [];
  if (!rawText) return notices;

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

/**
 * Re-encodes photo through canvas to strip EXIF/GPS metadata, apply rotation/crop,
 * and downscale high-resolution camera images to fit comfortably within the 5 MiB upload limit.
 */
export async function prepareMeterPhoto(
  file: File,
  rotationDegrees = 0,
  cropArea?: NormalizedCropBox,
  maxDimension = 2048
): Promise<{ blob: Blob; quality: ImageQualityIndicators | null; pixelCoords: PixelCropCoordinates }> {
  const image = await createImageBitmap(file);
  const rotated = Math.abs(rotationDegrees % 180) === 90;
  const initialWidth = rotated ? image.height : image.width;
  const initialHeight = rotated ? image.width : image.height;

  // Compute safe scale factor if image exceeds maxDimension
  const scale = Math.min(1, maxDimension / Math.max(initialWidth, initialHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(initialWidth * scale);
  canvas.height = Math.round(initialHeight * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo preview is not supported by this browser.');

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, (-initialWidth * scale) / 2, (-initialHeight * scale) / 2, initialWidth * scale, initialHeight * scale);
  image.close();

  let targetCanvas: HTMLCanvasElement = canvas;
  let pixelCoords = { x: 0, y: 0, width: canvas.width, height: canvas.height };

  if (cropArea && (cropArea.x > 0 || cropArea.y > 0 || cropArea.width < 1 || cropArea.height < 1)) {
    pixelCoords = computeCropPixelCoordinates(canvas.width, canvas.height, cropArea);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = pixelCoords.width;
    croppedCanvas.height = pixelCoords.height;
    const cropCtx = croppedCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        pixelCoords.x,
        pixelCoords.y,
        pixelCoords.width,
        pixelCoords.height,
        0,
        0,
        pixelCoords.width,
        pixelCoords.height
      );
      targetCanvas = croppedCanvas;
    }
  }

  // Analyze quality on the target canvas
  let quality: ImageQualityIndicators | null = null;
  const targetCtx = targetCanvas.getContext('2d');
  if (targetCtx) {
    try {
      const imgData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      quality = analyzeImageQuality(imgData);
    } catch {
      quality = null;
    }
  }

  const blob = await new Promise<Blob | null>(resolve => targetCanvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new Error('The photo could not be prepared for local reading.');
  if (blob.size > MAX_METER_PHOTO_BYTES) {
    // If still large, re-encode with slightly higher compression
    const compressed = await new Promise<Blob | null>(resolve => targetCanvas.toBlob(resolve, 'image/jpeg', 0.75));
    if (!compressed || compressed.size > MAX_METER_PHOTO_BYTES) {
      throw new Error('Prepared photo exceeds the 5 MiB limit.');
    }
    return { blob: compressed, quality, pixelCoords };
  }

  return { blob, quality, pixelCoords };
}

/**
 * Intelligent candidate ranking based on:
 * - meter-display format rule (expected decimals, digits before decimal),
 * - crop area proximity,
 * - token length and leading zeroes preservation,
 * - confidence score.
 */
export function rankOcrCandidates(
  words: OcrWordBox[],
  rules?: MeterFormatRule
): OcrCandidate[] {
  const expectedDecimals = rules?.decimalPlaces ?? 0;
  const expectedIntDigits = rules?.digitsBeforeDecimal ?? (rules?.leadingZeroLength ? rules.leadingZeroLength - expectedDecimals : 5);
  const candidates: OcrCandidate[] = [];

  for (const w of words) {
    const raw = (w.text || '').trim();
    if (!raw) continue;
    // Extract candidate numeric patterns including decimals and commas
    const matches = raw.match(/\d+(?:[.,]\d+)?/g) || [];
    for (const match of matches) {
      const clean = match.replace(',', '.');
      const parts = clean.split('.');
      const intPart = parts[0] || '';
      const decPart = parts[1] || '';
      const numVal = parseFloat(clean);
      if (!Number.isFinite(numVal)) continue;

      let score = 50;
      let matchedRule = 'General Numeric Token';

      // Digit count proximity to configured meter format
      const totalDigits = intPart.length + decPart.length;
      const expectedTotal = expectedIntDigits + expectedDecimals;
      if (Math.abs(totalDigits - expectedTotal) === 0) {
        score += 35;
        matchedRule = 'Exact Digit Count Match';
      } else if (Math.abs(totalDigits - expectedTotal) <= 1) {
        score += 20;
        matchedRule = 'Near Digit Count Match';
      }

      // Decimal precision rule match
      if (expectedDecimals > 0 && decPart.length === expectedDecimals) {
        score += 25;
        matchedRule += ' + Decimal Precision Match';
      } else if (expectedDecimals === 0 && decPart.length === 0) {
        score += 15;
      }

      // Confidence weight
      if (w.confidence && w.confidence > 0) {
        score += Math.min(20, Math.round(w.confidence / 5));
      }

      // Penalize excessively short or obviously serial/year tokens
      if (intPart.length < 3 && decPart.length === 0) {
        score -= 30;
      }
      if (intPart.startsWith('202') && intPart.length === 4) {
        score -= 20; // likely a year (2024, 2025, 2026)
      }

      candidates.push({
        rawText: raw,
        digitsOnly: intPart + (decPart ? decPart : ''),
        displayedReading: match,
        normalizedReading: numVal,
        confidence: w.confidence !== undefined && Number.isFinite(w.confidence) ? w.confidence : null,
        score,
        matchedRule,
        bbox: w.bbox
      });
    }
  }

  // Sort descending by calculated score
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Runs local Tesseract OCR entirely in the browser using self-hosted vendor assets
 * without relying on an external CDN or external cloud API.
 */
export async function extractMeterReading(
  image: Blob,
  onProgress?: (progress: number, status: string) => void,
  isCropped = false,
  formatRules?: MeterFormatRule
): Promise<MeterOCRResult & { wordBoxes?: OcrWordBox[]; quality?: ImageQualityIndicators | null; candidates?: OcrCandidate[] }> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    // Uses self-hosted assets under /vendor/tesseract/ with local eng.traineddata fallback
    worker = await createWorker('eng', 1, {
      workerPath: '/vendor/tesseract/worker.min.js',
      workerBlobURL: false,
      corePath: '/vendor/tesseract',
      langPath: '/vendor/tesseract', // Self-hosted! Zero external CDN dependency on first use
      logger: message => onProgress?.(message.progress || 0, message.status || 'Reading photo')
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1'
    });

    const result = await worker.recognize(image);
    const rawText = result.data.text.trim();

    // Collect word boxes with bounding box coordinates
    const wordBoxes: OcrWordBox[] = [];
    const pageData = result.data as unknown as { words?: Array<{ text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }> };
    if (pageData.words && Array.isArray(pageData.words)) {
      for (const w of pageData.words) {
        if (w.text && w.bbox) {
          wordBoxes.push({
            text: w.text,
            confidence: Number.isFinite(w.confidence) ? (w.confidence as number) : 0,
            bbox: {
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1
            }
          });
        }
      }
    }

    // Rank candidates using domain-specific meter display format rules
    const rankedCandidates = rankOcrCandidates(wordBoxes, formatRules);
    const topCandidate = rankedCandidates[0];

    // Fallback regex scan if word boxes didn't capture tokens cleanly
    const rawCandidates = rawText.match(/\d+(?:[.,]\d+)?/g) || [];
    let candidateReading = topCandidate ? topCandidate.displayedReading : rawCandidates.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0] || '';

    // Check ambiguous character substitutions
    const ambiguousDigits = detectAmbiguousDigits(rawText, candidateReading);
    if (!candidateReading && ambiguousDigits.length > 0) {
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
    const confidence = topCandidate?.confidence ?? (Number.isFinite(result.data.confidence) ? result.data.confidence : undefined);

    return {
      meterId: identity,
      rawText,
      candidateReading,
      ...(normalizedReading === undefined ? {} : { normalizedReading }),
      ...(confidence === undefined ? {} : { confidence }),
      requiresReview:
        !candidateReading ||
        rankedCandidates.length > 3 ||
        confidence === undefined ||
        confidence < 75 ||
        ambiguousDigits.length > 0,
      engineVersion: `Tesseract ${result.data.version || 'unknown'} / tesseract.js 7.0.0 (Self-Hosted Offline Model)`,
      extractedAt: new Date().toISOString(),
      engine: 'tesseract.js',
      ambiguousDigits: ambiguousDigits.length > 0 ? ambiguousDigits : undefined,
      isCropped,
      wordBoxes,
      candidates: rankedCandidates
    };
  } catch (error) {
    // Graceful manual entry fallback if worker initialization fails
    return {
      meterId: '',
      rawText: '',
      candidateReading: '',
      requiresReview: true,
      engineVersion: 'Tesseract worker / local error fallback',
      extractedAt: new Date().toISOString(),
      engine: 'tesseract.js',
      isCropped,
      candidates: []
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
