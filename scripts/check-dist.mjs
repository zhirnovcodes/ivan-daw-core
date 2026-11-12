// dist/ is committed so that `pnpm add github:zhirnovcodes/ivan-daw-core#vX.Y.Z`
// works with no publish or prepare step. This script rebuilds dist/ and fails
// if the result differs from what is staged or committed, so a stale dist/ never gets merged.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const git = (args) => execSync(`git ${args}`, { encoding: 'utf8' }).trim();

rmSync('dist', { recursive: true, force: true });
execSync('pnpm build', { stdio: 'inherit' });
const changed = [
  git('diff --name-only -- dist'),
  git('ls-files --others --exclude-standard -- dist'),
]
  .filter(Boolean)
  .join('\n');
if (changed) {
  console.error(`dist/ is out of date. Stage and commit the rebuilt files:\n${changed}`);
  process.exit(1);
}
console.log('dist/ is up to date.');
