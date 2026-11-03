/**
 * VIDYUTFLOW 2.0 — HIGH-PRECISION CODE 128 (SUBSET B) BARCODE ENGINE
 *
 * Provides persistent, deterministic, machine-readable Code 128 barcodes
 * for every canonical electricity bill.
 *
 * Guarantees:
 * - RFC-compliant Code 128 specification (ISO/IEC 15417)
 * - 11-module character patterns with valid parity and stop character (13 modules)
 * - Checksum calculation: (104 + sum(val_i * i)) % 103
 * - Generates both clean vector SVG and PDF vector bar coordinates (x, width, height in points)
 * - Built-in verification decoder for automated test suites
 * - Stable across language switches, reloads, and payment status updates
 */

// Code 128 patterns (index 0 to 106). Each string contains widths of alternating bars and spaces.
// E.g., "212222" means Bar:2, Space:1, Bar:2, Space:2, Bar:2, Space:2 (sum = 11 modules).
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106 (106 is STOP: 13 modules)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export interface Code128Bar {
  x: number;
  width: number;
  isBlack: boolean;
}

export interface Code128PdfBarInterval {
  x: number;
  width: number;
  height: number;
}

export interface GeneratedBarcode {
  canonicalReference: string;
  encodedString: string;
  totalModules: number;
  modules: boolean[]; // true = black, false = white
  svg: string;
  dataUrl?: string;
  humanReadableText: string;
}

/**
 * Derives a canonical, globally unique, safe Code 128 reference for any electricity bill.
 * Example: 'UG-04281-99231-202610-8821'
 */
export function deriveCanonicalBarcodeReference(
  billNo: string,
  consumerNo?: string,
  billMonth?: string
): string {
  const cleanBillNo = String(billNo || 'BILL-UG-UNKNOWN')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  const cleanConsumer = String(consumerNo || '04281-99231')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');

  // If billNo already has a standard format 'BILL-UG-YYYY-MM-XXXX'
  if (cleanBillNo.startsWith('BILL-UG-')) {
    const suffix = cleanBillNo.replace(/^BILL-UG-/, '');
    return `UG-${cleanConsumer}-${suffix}`;
  }

  // Fallback safe canonical format
  return `UG-${cleanConsumer}-${cleanBillNo}`;
}

/**
 * Encodes ASCII string into Code 128 (Subset B) module array.
 */
export function encodeCode128B(text: string): {
  modules: boolean[];
  totalModules: number;
  checksum: number;
  patternCodes: number[];
} {
  const codes: number[] = [START_CODE_B];
  let checksumAcc = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode < 32 || charCode > 126) {
      throw new Error(`Unsupported character in Code 128B: ${text[i]} (code ${charCode})`);
    }
    const val = charCode - 32;
    codes.push(val);
    checksumAcc += val * (i + 1);
  }

  const checksum = checksumAcc % 103;
  codes.push(checksum);
  codes.push(STOP_CODE);

  // Convert pattern codes to boolean modules
  const modules: boolean[] = [];

  // Left quiet zone (10 modules)
  for (let q = 0; q < 10; q++) modules.push(false);

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Right quiet zone (10 modules)
  for (let q = 0; q < 10; q++) modules.push(false);

  return {
    modules,
    totalModules: modules.length,
    checksum,
    patternCodes: codes,
  };
}

/**
 * Generates high-resolution SVG string for Code 128 barcode.
 */
export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    showHumanReadable?: boolean;
    fontSize?: number;
  } = {}
): GeneratedBarcode {
  const height = options.height ?? 50;
  const moduleWidth = options.moduleWidth ?? 1.4;
  const showText = options.showHumanReadable ?? true;
  const fontSize = options.fontSize ?? 10;
  const textHeight = showText ? fontSize + 4 : 0;
  const totalHeight = height + textHeight;

  const encoded = encodeCode128B(text);
  const totalWidth = encoded.totalModules * moduleWidth;

  // Build SVG rect elements for black runs
  const rects: string[] = [];
  let currentRunStart = -1;

  for (let i = 0; i < encoded.modules.length; i++) {
    if (encoded.modules[i]) {
      if (currentRunStart === -1) currentRunStart = i;
    } else {
      if (currentRunStart !== -1) {
        const x = (currentRunStart * moduleWidth).toFixed(2);
        const w = ((i - currentRunStart) * moduleWidth).toFixed(2);
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#0f172a" />`);
        currentRunStart = -1;
      }
    }
  }

  if (currentRunStart !== -1) {
    const x = (currentRunStart * moduleWidth).toFixed(2);
    const w = ((encoded.modules.length - currentRunStart) * moduleWidth).toFixed(2);
    rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#0f172a" />`);
  }

  let textSvg = '';
  if (showText) {
    const midX = (totalWidth / 2).toFixed(2);
    const textY = (height + fontSize + 1).toFixed(2);
    textSvg = `<text x="${midX}" y="${textY}" text-anchor="middle" font-family="monospace, monospace" font-size="${fontSize}" font-weight="600" fill="#1e293b" letter-spacing="1">${text}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(
    2
  )} ${totalHeight.toFixed(
    2
  )}" width="${totalWidth.toFixed(2)}" height="${totalHeight.toFixed(
    2
  )}" style="display:block; max-width:100%; height:auto;" role="img" aria-label="Code 128 Barcode: ${text}">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${rects.join('\n  ')}
  ${textSvg}
</svg>`;

  return {
    canonicalReference: text,
    encodedString: text,
    totalModules: encoded.totalModules,
    modules: encoded.modules,
    svg,
    humanReadableText: text,
  };
}

/**
 * Calculates vector bar coordinates for PDF rendering (in PDF points).
 * Returns array of black rectangles with { x, width, height }
 * where x is relative to targetStartX.
 */
export function calculateCode128PdfBars(
  text: string,
  targetStartX: number,
  targetStartY: number,
  targetWidthPt: number,
  targetHeightPt: number
): {
  bars: Array<{ x: number; y: number; width: number; height: number }>;
  humanReadableY: number;
  totalModules: number;
} {
  const encoded = encodeCode128B(text);
  const moduleWidth = targetWidthPt / encoded.totalModules;
  const bars: Array<{ x: number; y: number; width: number; height: number }> = [];

  let currentRunStart = -1;
  for (let i = 0; i < encoded.modules.length; i++) {
    if (encoded.modules[i]) {
      if (currentRunStart === -1) currentRunStart = i;
    } else {
      if (currentRunStart !== -1) {
        bars.push({
          x: targetStartX + currentRunStart * moduleWidth,
          y: targetStartY,
          width: (i - currentRunStart) * moduleWidth,
          height: targetHeightPt,
        });
        currentRunStart = -1;
      }
    }
  }

  if (currentRunStart !== -1) {
    bars.push({
      x: targetStartX + currentRunStart * moduleWidth,
      y: targetStartY,
      width: (encoded.modules.length - currentRunStart) * moduleWidth,
      height: targetHeightPt,
    });
  }

  return {
    bars,
    humanReadableY: targetStartY - 10,
    totalModules: encoded.totalModules,
  };
}

/**
 * Independent verification decoder for automated tests.
 * Decodes a boolean module array back to ASCII text using Code 128 rules.
 */
export function decodeCode128Modules(modules: boolean[]): {
  success: boolean;
  decodedText: string;
  checksumValid: boolean;
  error?: string;
} {
  // Strip 10-module quiet zones
  if (modules.length < 11 * 3 + 13 + 20) {
    return { success: false, decodedText: '', checksumValid: false, error: 'Module array too short' };
  }

  // Find start of barcode (first black module after left quiet zone)
  let startIndex = 0;
  while (startIndex < modules.length && !modules[startIndex]) {
    startIndex++;
  }

  // Read symbols (each symbol is 11 modules except stop which is 13)
  const patternToCode = new Map<string, number>();
  CODE128_PATTERNS.forEach((pat, idx) => {
    patternToCode.set(pat, idx);
  });

  const parsedCodes: number[] = [];
  let idx = startIndex;

  while (idx < modules.length) {
    // Check if remaining modules are stop character (13 modules: 2331112)
    const remaining = modules.length - idx;
    if (remaining >= 13) {
      // Check for stop pattern
      let pStr = '';
      let curVal = modules[idx];
      let curCount = 0;
      let tempIdx = idx;
      while (tempIdx < modules.length && pStr.length < 7) {
        if (modules[tempIdx] === curVal) {
          curCount++;
          tempIdx++;
        } else {
          pStr += curCount;
          curVal = modules[tempIdx];
          curCount = 0;
        }
      }
      if (pStr === '2331112' || (pStr.startsWith('233111') && tempIdx - idx >= 13)) {
        parsedCodes.push(STOP_CODE);
        break;
      }
    }

    // Try reading 11-module symbol
    if (idx + 11 > modules.length) break;

    // Convert 11 modules into bar-space run lengths
    let runStr = '';
    let curState = modules[idx];
    let runLen = 0;
    for (let m = 0; m < 11; m++) {
      if (modules[idx + m] === curState) {
        runLen++;
      } else {
        runStr += runLen;
        curState = modules[idx + m];
        runLen = 1;
      }
    }
    runStr += runLen;

    const matchedCode = patternToCode.get(runStr);
    if (matchedCode === undefined) {
      // Might be stop code if it was 13 modules
      if (runStr.startsWith('233111')) {
        parsedCodes.push(STOP_CODE);
        break;
      }
      return { success: false, decodedText: '', checksumValid: false, error: `Unrecognized pattern: ${runStr} at module ${idx}` };
    }

    parsedCodes.push(matchedCode);
    idx += 11;

    if (matchedCode === STOP_CODE) break;
  }

  if (parsedCodes.length < 3) {
    return { success: false, decodedText: '', checksumValid: false, error: 'Incomplete symbol sequence' };
  }

  const start = parsedCodes[0];
  if (start !== START_CODE_B) {
    return { success: false, decodedText: '', checksumValid: false, error: `Expected Start B (104), got ${start}` };
  }

  const checksumSymbol = parsedCodes[parsedCodes.length - 2];
  const dataSymbols = parsedCodes.slice(1, parsedCodes.length - 2);

  // Validate checksum
  let checkSumCalc = START_CODE_B;
  for (let d = 0; d < dataSymbols.length; d++) {
    checkSumCalc += dataSymbols[d] * (d + 1);
  }
  const expectedChecksum = checkSumCalc % 103;
  const checksumValid = expectedChecksum === checksumSymbol;

  // Convert data symbols to characters
  const decodedChars = dataSymbols.map((val) => String.fromCharCode(val + 32)).join('');

  return {
    success: true,
    decodedText: decodedChars,
    checksumValid,
  };
}
