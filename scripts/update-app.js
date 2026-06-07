const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

let zipUrl = process.env.UPDATE_ZIP_URL;

// Fallback to GitHub API to find the latest release asset if not explicitly configured
if (!zipUrl) {
  console.log('[OTA Update] UPDATE_ZIP_URL not set. Fetching latest release from GitHub API...');
  try {
    const res = await fetch('https://api.github.com/repos/jorper98/unified-AIChat-Hub/releases/latest', {
      headers: { 'User-Agent': 'Unified-Chat-Hub-Updater' }
    });
    if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);
    const data = await res.json();
    const asset = data.assets.find(a => a.name.startsWith('unified-chat-deploy-v'));
    if (!asset) throw new Error('No deployment asset found in the latest release.');
    zipUrl = asset.browser_download_url;
    console.log(`[OTA Update] Found latest release URL: ${zipUrl}`);
  } catch (err) {
    console.error(`[OTA Update] Failed to fetch latest release: ${err.message}`);
    console.error('[OTA Update] Please set UPDATE_ZIP_URL in your .env file.');
    process.exit(1);
  }
}

const appDir = path.join(__dirname, '..');
const tempZipPath = path.join(appDir, 'temp-update.zip');
const tempExtractPath = path.join(appDir, 'temp-extract');

console.log(`[OTA Update] Downloading update from ${zipUrl}...`);

const file = fs.createWriteStream(tempZipPath);
https.get(zipUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`[OTA Update] Failed to download update: HTTP ${response.statusCode}`);
    process.exit(1);
  }
  
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('[OTA Update] Download complete. Extracting...');
    
    try {
      const zip = new AdmZip(tempZipPath);
      zip.extractAllTo(tempExtractPath, true);
      
      const extractedFolders = fs.readdirSync(tempExtractPath);
      if (extractedFolders.length === 0) {
        throw new Error('Extracted zip is empty');
      }
      
      const sourceDir = path.join(tempExtractPath, extractedFolders[0]);
      console.log(`[OTA Update] Source directory found: ${extractedFolders[0]}`);
      
      const excludeDirs = ['.env', 'data', 'backups', 'node_modules', '.next', 'temp-update.zip', 'temp-extract', '.kilo'];
      
      function copyDir(src, dest) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
      
      console.log('[OTA Update] Copying files to /app...');
      copyDir(sourceDir, appDir);
      
      console.log('[OTA Update] Running npm install to sync dependencies...');
      execSync('npm install', { cwd: appDir, stdio: 'inherit' });
      
      console.log('[OTA Update] Update applied successfully!');
      console.log('[OTA Update] NOTE: Please restart the container (docker compose restart web-app) to apply all changes, especially if package.json was updated.');
      
      // Cleanup
      fs.rmSync(tempExtractPath, { recursive: true, force: true });
      fs.unlinkSync(tempZipPath);
      console.log('[OTA Update] Temporary files cleaned up.');
      process.exit(0);
      
    } catch (err) {
      console.error('[OTA Update] Error during extraction or copy:', err.message);
      // Cleanup on error
      if (fs.existsSync(tempExtractPath)) fs.rmSync(tempExtractPath, { recursive: true, force: true });
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('[OTA Update] Download error:', err.message);
  if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
  process.exit(1);
});
