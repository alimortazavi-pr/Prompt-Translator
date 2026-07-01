const { spawn } = require('child_process');
const path = require('path');

const exe = path.join(__dirname, '..', 'dist', 'win-unpacked', 'Prompt Translator.exe');

spawn(exe, [], { detached: true, stdio: 'ignore', shell: true }).unref();
