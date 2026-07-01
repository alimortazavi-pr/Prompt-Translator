const { existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');

if (!existsSync(distDir)) {
  console.log('Downloading Electron binary...');
  execSync('node install.js', { cwd: electronDir, stdio: 'inherit' });
}
