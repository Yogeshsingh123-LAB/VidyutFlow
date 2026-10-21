import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Exact brand magenta: #CF1263
const MAGENTA = '#CF1263';

// High-fidelity vector SVG matching the uploaded UGVCL logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <!-- Rounded squircle clip path for outer boundary -->
    <clipPath id="squircle">
      <rect x="252" y="172" width="470" height="438" rx="95" ry="95" />
    </clipPath>
  </defs>

  <!-- Transparent canvas -->
  <rect width="1000" height="1000" fill="none" />

  <!-- 1. Emblem Group -->
  <g clip-path="url(#squircle)">
    <!-- Base Solid Magenta Background -->
    <rect x="240" y="160" width="495" height="460" fill="${MAGENTA}" />

    <!-- Top Vertical Notch: cuts open from top edge (y: 160 to y: 240) between x: 454 and x: 520 -->
    <polygon points="454,160 520,160 520,240 454,240" fill="#FFFFFF" />

    <!-- Bottom Vertical Notch: 180° symmetric (y: 540 to y: 620) between x: 480 and x: 546 -->
    <polygon points="480,540 546,540 546,620 480,620" fill="#FFFFFF" />

    <!-- Upper Thin Diagonal Slit across upper-left to right -->
    <polygon points="240,268 735,366 735,378 240,280" fill="#FFFFFF" />

    <!-- Upper Lightning Bolt: Sharp horizontal point pointing right -->
    <polygon points="454,240 635,370 340,370 454,370" fill="#FFFFFF" />

    <!-- Lower Thin Diagonal Slit across lower-right to left (180° symmetric) -->
    <polygon points="735,512 240,414 240,402 735,500" fill="#FFFFFF" />

    <!-- Lower Lightning Bolt: Sharp horizontal point pointing left (180° symmetric) -->
    <polygon points="546,540 365,410 660,410 546,410" fill="#FFFFFF" />
  </g>

  <!-- 2. Clean Geometric Typography: UGVCL -->
  <text 
    x="500" 
    y="820" 
    text-anchor="middle" 
    fill="${MAGENTA}" 
    font-family="'Plus Jakarta Sans', 'Arial Black', -apple-system, sans-serif" 
    font-size="180" 
    font-weight="900" 
    letter-spacing="14"
  >UGVCL</text>
</svg>`;

async function build() {
  const publicAssetsDir = path.resolve('public/assets');
  if (!fs.existsSync(publicAssetsDir)) {
    fs.mkdirSync(publicAssetsDir, { recursive: true });
  }

  // 1. Write the vector SVG
  const svgPath = path.join(publicAssetsDir, 'ugvcl-logo.svg');
  fs.writeFileSync(svgPath, svgContent);

  // 2. Render to high-resolution transparent PNG (1000x1000) using sharp
  const pngPath = path.join(publicAssetsDir, 'ugvcl-logo.png');
  await sharp(Buffer.from(svgContent))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(pngPath);

  // Also write to public/assets/ugvcl/ugvcl_logo.png as alias
  const aliasPath = path.join(publicAssetsDir, 'ugvcl/ugvcl_logo.png');
  fs.copyFileSync(pngPath, aliasPath);
  console.log('Built ugvcl-logo.png and ugvcl-logo.svg successfully');
}

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
