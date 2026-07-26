import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

const svgPath = './public/icon.svg';

if (!fs.existsSync(svgPath)) {
  console.error("SVG icon not found at ./public/icon.svg!");
  process.exit(1);
}

async function run() {
  console.log("Generating PNG launcher icons from vector SVG using canvas...");

  try {
    // 1. Load the SVG image
    const image = await loadImage(svgPath);

    // 2. Generate PNG images of different sizes
    const sizes = [56, 112, 128, 512];
    const base64Data = {};

    for (const size of sizes) {
      console.log(`Rendering ${size}x${size} PNG using HTML5 canvas...`);
      
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Enable high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the SVG image stretched to the canvas size
      ctx.drawImage(image, 0, 0, size, size);
      
      const buffer = canvas.toBuffer('image/png');

      // Store base64 data url
      const b64 = buffer.toString('base64');
      base64Data[size] = `data:image/png;base64,${b64}`;

      // Save file to public/ directory
      const filename = size === 512 ? 'icon.png' : `icon-${size}.png`;
      fs.writeFileSync(`./public/${filename}`, buffer);
      console.log(`Saved ./public/${filename}`);
    }

    // Also save launcher_icon.png to src/assets/images/
    const buffer512 = fs.readFileSync('./public/icon.png');
    fs.mkdirSync('./src/assets/images', { recursive: true });
    fs.writeFileSync('./src/assets/images/launcher_icon.png', buffer512);
    console.log("Saved ./src/assets/images/launcher_icon.png");

    // 3. Read and update manifest.webapp
    const updateManifestFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        console.log(`Updating manifest file: ${filePath}`);
        const manifest = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        manifest.icons = {
          "56": base64Data[56],
          "112": base64Data[112],
          "128": base64Data[128]
        };

        fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
        console.log(`Successfully updated ${filePath}`);
      } else {
        console.log(`Manifest file not found at ${filePath}, skipping.`);
      }
    };

    updateManifestFile('./manifest.webapp');
    updateManifestFile('./public/manifest.webapp');

    console.log("\nAll launcher icons successfully converted and saved as Base64 PNG inside manifests!");
  } catch (error) {
    console.error("Error generating PNG icons with canvas:", error);
    process.exit(1);
  }
}

run();
