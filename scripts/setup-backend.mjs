import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
const command = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const version = spawnSync(command, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)']);
if (version.error || version.status !== 0) {
  console.error('Python 3.10+ is required. Install it, or set PYTHON to its executable path.');
  process.exit(1);
}
function run(executable, args) {
  const result = spawnSync(executable, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
const python = path.join('.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) run(command, ['-m', 'venv', '.venv']);
run(python, ['-m', 'pip', 'install', '-r', 'backend/requirements.txt']);
