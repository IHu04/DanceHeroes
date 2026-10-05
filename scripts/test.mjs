import { spawnSync } from 'node:child_process';
import path from 'node:path';
const python = path.join('.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const result = spawnSync(python, ['-m', 'unittest', 'discover', '-s', 'backend/tests', '-v'], { stdio: 'inherit' });
if (result.error) console.error('Run npm run setup:backend first.');
process.exit(result.status ?? 1);
