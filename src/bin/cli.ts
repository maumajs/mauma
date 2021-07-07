#!/usr/bin/env node
import { join } from 'path';
import { spawn } from 'child_process';

function run(script: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const cmd = spawn(process.argv[0], [script], { detached: true });
    cmd.on('exit', (code) => resolve(code));
    cmd.on('error', (err) => reject(err));
    cmd.stdout.on('data', (data) => console.log(data.toString()));
    cmd.stderr.on('data', (data) => console.error(data.toString()));
  });
}

(async () => {
  // Run in separate processes
  // Build mauma uses "on-the-fly" TS loading which breaks Vite builds, having on separate processes fixes the issue
  await run(join(__dirname, 'build-mauma.js'));
  await run(join(__dirname, 'build-vite.js'));
})();
