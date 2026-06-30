#!/usr/bin/env node

/**
 * @file
 *  Generate app icons from a source image (WebP, PNG, JPEG, etc.).
 *
 *  Pipeline: sharp decodes/normalizes the source into a 1024x1024 PNG, then
 *  png2icons builds the macOS .icns and Windows .ico from it. Also writes a
 *  plain icon.png (used for Linux / the dev dock). Pure JS — no system tools.
 *
 *  Usage:
 *    pnpm make-icons [source-image]      (defaults to assets/icon-source.webp)
 *    npm run make-icons -- [source-image]
 *
 *  Runs as part of `pnpm build`; if no source image exists it skips quietly so
 *  the build still succeeds.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import png2icons from "png2icons";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "assets");
const src = process.argv[2] ?? path.join(outDir, "icon-source.webp");

if (!existsSync(src)) {
  console.warn(`make-icons: no source image at ${src} — skipping icon generation.`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

// Normalize to a square 1024x1024 PNG with transparent padding (no cropping).
const png = await sharp(src)
  .resize(1024, 1024, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const icns = png2icons.createICNS(png, png2icons.BICUBIC, 0);
const ico = png2icons.createICO(png, png2icons.BICUBIC, 0, false);
if (!icns || !ico) {
  console.error("Error: png2icons failed to generate icon data.");
  process.exit(1);
}

writeFileSync(path.join(outDir, "icon.png"), png);
writeFileSync(path.join(outDir, "icon.icns"), icns);
writeFileSync(path.join(outDir, "icon.ico"), ico);

console.log("Wrote assets/icon.png, assets/icon.icns, assets/icon.ico");
