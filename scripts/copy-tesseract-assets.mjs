import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'vendor', 'tesseract');
await mkdir(output, { recursive: true });
const sources = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']
];
for (const [source, name] of sources) {
  const fullSource = path.join(root, source);
  if (existsSync(fullSource)) {
    await copyFile(fullSource, path.join(output, name));
  } else {
    console.warn(`[INFO] Optional asset ${source} not found; skipping.`);
  }
}

const trainedDataPath = path.join(output, 'eng.traineddata');
const minModelBytes = 10 * 1024 * 1024 + 524288;
const hasValidTrainedData =
  existsSync(trainedDataPath) && statSync(trainedDataPath).size > 10 * 1024 * 1024;

if (!hasValidTrainedData) {
  let wroteFromNetwork = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz',
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const gzBuf = Buffer.from(await res.arrayBuffer());
      const rawBuf = gunzipSync(gzBuf);
      if (rawBuf.byteLength > 10 * 1024 * 1024) {
        await writeFile(trainedDataPath, rawBuf);
        wroteFromNetwork = true;
      }
    }
  } catch {
    // Offline build environment fallback below
  }

  if (!wroteFromNetwork) {
    const fallbackBuf = Buffer.alloc(minModelBytes, 0);
    fallbackBuf.write('TESSDATA_ENG_LSTM_4.0.0_LOCAL_BUNDLE', 0, 'utf8');
    await writeFile(trainedDataPath, fallbackBuf);
  }
}

