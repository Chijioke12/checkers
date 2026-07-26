import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log("Starting production build & OmniSD bundling process...");

// 0. Regenerate PNG icons and update webapp manifests
try {
  console.log("Regenerating PNG icons and updating manifests...");
  execSync('node generate-png-icons.js', { stdio: 'inherit' });
} catch (err) {
  console.error("Failed to generate PNG icons!", err);
  process.exit(1);
}

// 1. Copy fonts to public/ so Vite copies them to dist/ during build
console.log("Copying font files to public/ folder...");
fs.mkdirSync('./public', { recursive: true });
if (fs.existsSync('./BalooChettan-Regular.ttf')) {
  fs.copyFileSync('./BalooChettan-Regular.ttf', './public/BalooChettan-Regular.ttf');
}
if (fs.existsSync('./LuckiestGuy-Regular.ttf')) {
  fs.copyFileSync('./LuckiestGuy-Regular.ttf', './public/LuckiestGuy-Regular.ttf');
}

// 2. Strip simulator UI for production
console.log("Stripping simulator UI...");
execSync('node strip-simulator.js strip', { stdio: 'inherit' });

try {
  // 3. Compile the app using Vite production build
  console.log("Running production build (Vite)...");
  execSync('npx vite build', { stdio: 'inherit' });
} catch (err) {
  console.error("Vite build failed!", err);
  process.exit(1);
} finally {
  // 4. Always restore the simulator for dev preview so that the user's iframe is preserved
  console.log("Restoring simulator UI for local development...");
  execSync('node strip-simulator.js restore', { stdio: 'inherit' });
}

// 5. Generate application.zip (containing the exact files in dist/)
console.log("Creating application.zip containing pure device build files...");
try {
  const appZip = new AdmZip();
  appZip.addLocalFolder('./dist');
  appZip.writeZip('./application.zip');
  console.log("Created application.zip successfully.");
} catch (err) {
  console.error("Failed to package application.zip", err);
  process.exit(1);
}

// 6. Generate the outer OmniSD checkers.zip package
console.log("Packaging final checkers.zip for OmniSD installation...");
try {
  const outerZip = new AdmZip();
  
  // Add application.zip
  outerZip.addLocalFile('./application.zip');
  
  // Add empty update.webapp
  fs.writeFileSync('./update.webapp', '');
  outerZip.addLocalFile('./update.webapp');
  
  // Add metadata.json referencing app://kaios-checkers/manifest.webapp
  const metadata = {
    version: 1,
    manifestURL: "app://kaios-checkers/manifest.webapp"
  };
  fs.writeFileSync('./metadata.json', JSON.stringify(metadata, null, 2));
  outerZip.addLocalFile('./metadata.json');
  
  // Write the checkers.zip
  outerZip.writeZip('./checkers.zip');
  console.log("Created final checkers.zip successfully.");
} catch (err) {
  console.error("Failed to package checkers.zip", err);
  process.exit(1);
} finally {
  // Clean up intermediate files
  console.log("Cleaning up intermediate packaging files...");
  if (fs.existsSync('./application.zip')) fs.unlinkSync('./application.zip');
  if (fs.existsSync('./update.webapp')) fs.unlinkSync('./update.webapp');
  if (fs.existsSync('./metadata.json')) fs.unlinkSync('./metadata.json');
}

console.log("\n========================================================");
console.log("SUCCESS: OmniSD package checkers.zip generated!");
console.log("========================================================\n");
