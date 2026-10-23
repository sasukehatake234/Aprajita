import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard Brand SVG (Shield + Signal Beacon + Key Motif)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
  </defs>

  <!-- Background rounded box -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)" />

  <!-- Outer Pulse Ring -->
  <circle cx="256" cy="240" r="190" fill="none" stroke="#dc2626" stroke-opacity="0.25" stroke-width="12" stroke-dasharray="16 12" />

  <!-- Shield Base -->
  <path d="M 256,70 L 390,125 C 390,260 256,380 256,380 C 256,380 122,260 122,125 Z" fill="url(#shieldGrad)" />

  <!-- Inner Shield Trim -->
  <path d="M 256,92 L 368,138 C 368,248 256,350 256,350 C 256,350 144,248 144,138 Z" fill="#b91c1c" />

  <!-- Emergency Key / Signal Symbol inside Shield -->
  <circle cx="256" cy="180" r="32" fill="#ffffff" />
  <rect x="246" y="200" width="20" height="90" rx="6" fill="#ffffff" />
  <rect x="256" y="240" width="28" height="14" rx="4" fill="#ffffff" />
  <rect x="256" y="268" width="22" height="14" rx="4" fill="#ffffff" />

  <!-- Radio Beacon Waves -->
  <path d="M 200,150 A 70,70 0 0,0 200,210" fill="none" stroke="#fecaca" stroke-width="8" stroke-linecap="round" />
  <path d="M 312,150 A 70,70 0 0,1 312,210" fill="none" stroke="#fecaca" stroke-width="8" stroke-linecap="round" />

  <!-- Bottom Brand Label -->
  <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="4">SURAKSHA</text>
  <text x="256" y="480" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#ef4444" text-anchor="middle" letter-spacing="6">KEY</text>
</svg>`;

// 2. Maskable Icon (Full bleed background, safe zone with 15% inner padding)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
    <linearGradient id="mBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background for maskable shape cropping -->
  <rect width="512" height="512" fill="url(#mBgGrad)" />

  <!-- Content scaled and centered within the 80% safe circle -->
  <g transform="translate(51, 51) scale(0.80)">
    <circle cx="256" cy="240" r="190" fill="none" stroke="#dc2626" stroke-opacity="0.25" stroke-width="14" stroke-dasharray="16 12" />
    <path d="M 256,70 L 390,125 C 390,260 256,380 256,380 C 256,380 122,260 122,125 Z" fill="url(#mShieldGrad)" />
    <path d="M 256,92 L 368,138 C 368,248 256,350 256,350 C 256,350 144,248 144,138 Z" fill="#b91c1c" />
    <circle cx="256" cy="180" r="32" fill="#ffffff" />
    <rect x="246" y="200" width="20" height="90" rx="6" fill="#ffffff" />
    <rect x="256" y="240" width="28" height="14" rx="4" fill="#ffffff" />
    <rect x="256" y="268" width="22" height="14" rx="4" fill="#ffffff" />
    <path d="M 200,150 A 70,70 0 0,0 200,210" fill="none" stroke="#fecaca" stroke-width="8" stroke-linecap="round" />
    <path d="M 312,150 A 70,70 0 0,1 312,210" fill="none" stroke="#fecaca" stroke-width="8" stroke-linecap="round" />
    <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="4">SURAKSHA</text>
    <text x="256" y="480" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#ef4444" text-anchor="middle" letter-spacing="6">KEY</text>
  </g>
</svg>`;

async function run() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  const standardBuf = Buffer.from(standardSvg);
  const maskableBuf = Buffer.from(maskableSvg);

  // Generate PNG 192x192
  await sharp(standardBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate PNG 512x512
  await sharp(standardBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate Maskable PNG 512x512
  await sharp(maskableBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate Apple Touch Icon 180x180
  await sharp(standardBuf)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate Favicon 64x64 PNG as favicon.ico
  await sharp(standardBuf)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Successfully generated all PWA icons in /public:');
  console.log('- icon.svg');
  console.log('- pwa-192x192.png');
  console.log('- pwa-512x512.png');
  console.log('- pwa-maskable-512x512.png');
  console.log('- apple-touch-icon.png');
  console.log('- favicon.ico');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
