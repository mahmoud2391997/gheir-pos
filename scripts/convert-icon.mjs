import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = path.join(root, "electron/assets/gheir-logo.png");
const icoPath = path.join(root, "electron/assets/icon.ico");

if (!fs.existsSync(logoPath)) {
  console.error("Logo file not found:", logoPath);
  process.exit(1);
}

try {
  // Get image dimensions
  const metadata = await sharp(logoPath).metadata();
  const size = Math.max(metadata.width || 256, metadata.height || 256);
  
  // Resize to square (256x256 is standard for icons)
  const squarePng = await sharp(logoPath)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  
  // Convert to ICO
  const icoBuffer = await pngToIco(squarePng);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log("Icon converted successfully to:", icoPath);
} catch (error) {
  console.error("Error converting icon:", error);
  process.exit(1);
}