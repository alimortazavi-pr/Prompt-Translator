const { spawnSync } = require('child_process');

const platform = process.argv[2]
  || (process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux');

if (!process.env.ELECTRON_MIRROR) {
  process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
}

console.log(`Building for ${platform}...`);

const result = spawnSync(
  'electron-builder',
  [`--${platform}`],
  { stdio: 'inherit', shell: true, env: process.env }
);

process.exit(result.status ?? 1);
