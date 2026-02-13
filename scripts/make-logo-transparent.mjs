/**
 * Makes logo backgrounds transparent and writes to the assets used by the app.
 * - klineo-icon-white-bg.png: make white (outer) transparent → output klineo-icon-64.png, favicon
 * - klineo-icon-black-bg.png: make black transparent → output 6c13e9... (K + yellow bar only)
 * Run: node scripts/make-logo-transparent.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'src', 'assets');
const publicDir = path.join(__dirname, '..', 'public');

async function makeWhiteTransparent(inputPath, outputPath) {
  const img = await sharp(inputPath);
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Treat near-white pixels (e.g. rgb > 250) as transparent
    if (r > 250 && g > 250 && b > 250) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);
}

async function makeBlackTransparent(inputPath, outputPath) {
  const img = await sharp(inputPath);
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Treat near-black pixels as transparent (keep white K and yellow)
    if (r < 30 && g < 30 && b < 30) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);
}

async function main() {
  const whiteBg = path.join(assetsDir, 'klineo-icon-white-bg.png');
  const blackBg = path.join(assetsDir, 'klineo-icon-black-bg.png');

  try {
    // Use black-bg version with black made transparent for sidebar/topbar (K + yellow on any bg)
    await makeBlackTransparent(blackBg, path.join(assetsDir, '6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png'));
    await makeBlackTransparent(blackBg, path.join(assetsDir, 'klineo-icon-64.png'));
    await makeBlackTransparent(blackBg, path.join(publicDir, 'favicon.png'));
    console.log('Created transparent K icon (black→transparent) for sidebar, topbar, favicon.');

    // Optional: white-bg with white→transparent for light contexts
    await makeWhiteTransparent(whiteBg, path.join(assetsDir, 'klineo-icon-transparent-from-white.png'));
    console.log('Created klineo-icon-transparent-from-white.png (white→transparent).');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
