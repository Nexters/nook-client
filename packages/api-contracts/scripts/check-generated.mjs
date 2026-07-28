import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedDirectory = path.resolve(
  packageDirectory,
  '../../apps/web/src/shared/api/generated',
);

async function readDirectory(directory) {
  const files = new Map();

  async function visit(currentDirectory) {
    let entries = [];

    try {
      entries = await readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        files.set(path.relative(directory, entryPath), await readFile(entryPath, 'utf8'));
      }
    }
  }

  await visit(directory);
  return files;
}

function runOrval() {
  return new Promise((resolve, reject) => {
    const command = spawn('pnpm', ['generate'], {
      cwd: packageDirectory,
      stdio: 'inherit',
    });

    command.on('error', reject);
    command.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Orval exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function directoriesMatch(before, after) {
  if (before.size !== after.size) return false;

  for (const [file, content] of before) {
    if (after.get(file) !== content) return false;
  }

  return true;
}

const before = await readDirectory(generatedDirectory);
await runOrval();
const after = await readDirectory(generatedDirectory);

if (!directoriesMatch(before, after)) {
  console.error('Orval generated code was out of date and has been regenerated.');
  console.error('Commit the files under `apps/web/src/shared/api/generated`.');
  process.exitCode = 1;
} else {
  console.log('Orval generated code is up to date.');
}
