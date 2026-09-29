import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const WRENCH_PATH = `
  M -37,5
  L 10,5
  C 13,5 16,7.5 19,11
  L 31,8.5
  C 32.5,8 33,6.5 32,5
  L 19,4.5
  L 19,-3.5
  L 32,-3.5
  C 33.5,-3.5 34,-5 33,-6.5
  L 29,-10.5
  C 25.5,-13.5 19.5,-13 14,-9
  L 10,-5
  L -37,-5
  C -40.5,-5 -42.5,-2.5 -42.5,0
  C -42.5,2.5 -40.5,5 -37,5
  Z
  M -31,-2.5 A 2.5 2.5 0 1 0 -31,2.5 A 2.5 2.5 0 1 0 -31,-2.5 Z
  M 12,-9 H 17.5 V -6.5 H 12 Z
`.replace(/\s+/g, ' ').trim();

const SCREWDRIVER_HANDLE_PATH = `
  M -37,-6
  C -40.5,-6 -42.5,-4 -42.5,0
  C -42.5,4 -40.5,6 -37,6
  L -17,6
  C -15.5,6 -15,4.5 -15,3.5
  L -11.5,3.5
  L -11.5,2.5
  L -7.5,2.5
  L -7.5,-2.5
  L -11.5,-2.5
  L -11.5,-3.5
  C -15,-3.5 -15.5,-6 -17,-6
  Z
`.replace(/\s+/g, ' ').trim();

const SCREWDRIVER_TIP_PATH = `
  M 7.5,-2.5
  L 31,-2.5
  L 39,-1.5
  L 39,1.5
  L 31,2.5
  L 7.5,2.5
  Z
`.replace(/\s+/g, ' ').trim();

/**
 * Generates an SVG string of the official FIXIT Icon
 * @param {Object} options
 * @param {number} options.scale - Scale multiplier for the central crossed tools
 * @param {number} options.borderRadius - 0 for full bleed (iOS & Android maskable), or radius for squircle
 * @param {string} options.bgColor - Background color (default #082D60)
 */
function generateFixitIconSvg({ scale = 0.72, borderRadius = 0, bgColor = '#082D60' } = {}) {
  const rxAttr = borderRadius > 0 ? `rx="${borderRadius}"` : '';

  return `<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Brand Background -->
  <rect width="100" height="100" ${rxAttr} fill="${bgColor}" />
  
  <g transform="translate(50, 50) scale(${scale})">
    <!-- Screwdriver (Top-Left to Bottom-Right, +45°) in Pure White -->
    <g transform="rotate(45)">
      <path d="${SCREWDRIVER_HANDLE_PATH}" fill="#FFFFFF" />
      <path d="${SCREWDRIVER_TIP_PATH}" fill="#FFFFFF" />
      <!-- Ergonomic grip ribs -->
      <line x1="-35" y1="-2" x2="-21" y2="-2" stroke="${bgColor}" stroke-width="1.2" stroke-linecap="round" opacity="0.45" />
      <line x1="-35" y1="2" x2="-21" y2="2" stroke="${bgColor}" stroke-width="1.2" stroke-linecap="round" opacity="0.45" />
    </g>

    <!-- Adjustable Wrench (Bottom-Left to Top-Right, -45°) in FIXIT Electric Blue -->
    <g transform="rotate(-45)">
      <path d="${WRENCH_PATH}" fillRule="evenodd" clipRule="evenodd" fill="#0988F5" />
    </g>
  </g>
</svg>`;
}

async function run() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Generating official FIXIT brand icons...');

  // 1. Base SVGs
  // Standard SVG (scalable, with subtle standard squircle for desktop/vector viewing)
  const vectorSvg = generateFixitIconSvg({ scale: 0.72, borderRadius: 22 });
  // Full-bleed SVG (no radius, optimal for iOS Apple Touch Icon and Android Maskable)
  const fullBleedSvg = generateFixitIconSvg({ scale: 0.70, borderRadius: 0 });
  // Maskable SVG (extra safe margin: 60% scale to strictly respect Android 80% safe zone)
  const maskableSvg = generateFixitIconSvg({ scale: 0.60, borderRadius: 0 });

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), vectorSvg);
  fs.writeFileSync(path.join(publicDir, 'fixit-icon.svg'), vectorSvg);
  fs.writeFileSync(path.join(publicDir, 'fixi-icon.svg'), vectorSvg);
  console.log('✓ SVGs written');

  // 2. iOS Apple Touch Icons (Solid #082D60 background, NO transparent corners!)
  // Standard 180x180 for iPhone Retina
  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png (180x180) generated');

  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon-180x180.png'));
  
  await sharp(Buffer.from(fullBleedSvg))
    .resize(152, 152)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon-152x152.png'));

  await sharp(Buffer.from(fullBleedSvg))
    .resize(167, 167)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon-167x167.png'));

  await sharp(Buffer.from(fullBleedSvg))
    .resize(120, 120)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon-120x120.png'));

  // 3. Android PWA Icons
  // Purpose: any
  await sharp(Buffer.from(fullBleedSvg))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ pwa-192x192.png (192x192) generated');

  await sharp(Buffer.from(fullBleedSvg))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ pwa-512x512.png (512x512) generated');

  // Purpose: maskable (with strict 60% safe zone margin)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ pwa-maskable-512x512.png (512x512 safe zone) generated');

  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-192x192.png'));

  // 4. Favicons
  await sharp(Buffer.from(fullBleedSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(Buffer.from(fullBleedSvg))
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  await sharp(Buffer.from(fullBleedSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('✓ Favicon PNGs (16x16, 32x32, 48x48) generated');

  // Generate multi-resolution favicon.ico via ImageMagick convert
  try {
    const f16 = path.join(publicDir, 'favicon-16x16.png');
    const f32 = path.join(publicDir, 'favicon-32x32.png');
    const f48 = path.join(publicDir, 'favicon-48x48.png');
    const icoPath = path.join(publicDir, 'favicon.ico');
    execSync(`convert "${f16}" "${f32}" "${f48}" "${icoPath}"`);
    console.log('✓ favicon.ico created with ImageMagick');
  } catch (err) {
    console.warn('ImageMagick convert warning for ICO:', err.message);
  }

  // Canonical fixit-logo.svg
  if (fs.existsSync(path.join(publicDir, 'fixi-logo.svg'))) {
    fs.copyFileSync(
      path.join(publicDir, 'fixi-logo.svg'),
      path.join(publicDir, 'fixit-logo.svg')
    );
    console.log('✓ fixit-logo.svg synchronized');
  }

  console.log('All FIXIT PWA icons generated successfully with pristine quality!');
}

run().catch(console.error);
