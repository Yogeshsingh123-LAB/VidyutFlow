import type { MeterOCRResult } from './meterReading';

export const MAX_METER_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_METER_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateMeterPhoto(file: File): string | null {
  if (!ACCEPTED_METER_PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP photo.';
  if (file.size <= 0 || file.size > MAX_METER_PHOTO_BYTES) return 'Photo must be between 1 byte and 5 MiB.';
  return null;
}

/** Re-encodes through canvas to strip metadata and apply the chosen rotation before OCR. */
export async function prepareMeterPhoto(file: File, rotationDegrees = 0): Promise<Blob> {
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
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('The photo could not be prepared for local reading.');
  if (blob.size > MAX_METER_PHOTO_BYTES) throw new Error('Prepared photo exceeds the 5 MiB limit.');
  return blob;
}

export async function extractMeterReading(
  image: Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<MeterOCRResult> {
  // Tesseract runs locally in a Web Worker. The selected language model is fetched
  // from the project's public CDN on first use; image pixels are never sent there.
  // Dynamic import enables node unit tests to run without requiring web worker dependencies.
  const { createWorker, PSM } = (await import('tesseract.js')) as any;
  const worker = await createWorker('eng', 1, {
    workerPath: '/vendor/tesseract/worker.min.js',
    workerBlobURL: false,
    corePath: '/vendor/tesseract',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    logger: (message: { progress?: number; status?: string }) => onProgress?.(message.progress || 0, message.status || 'Reading photo')
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
    const result = await worker.recognize(image);
    const rawText = result.data.text.trim();
    const candidates = rawText.match(/\d+(?:[.,]\d+)?/g) || [];
    const candidateReading = candidates.sort((a: string, b: string) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0] || '';
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
      requiresReview: !candidateReading || candidates.length !== 1 || confidence === undefined || confidence < 75,
      engineVersion: `Tesseract ${result.data.version || 'unknown'} / tesseract.js 7.0.0`,
      extractedAt: new Date().toISOString(),
      engine: 'tesseract.js'
    };
  } finally {
    await worker.terminate();
  }
}
