import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Builds the HLS media fixture once before the suite starts. */
export default function globalSetup(): void {
  const script = fileURLToPath(
    new URL('./scripts/fetch-media.sh', import.meta.url),
  );
  execFileSync('bash', [script], { stdio: 'inherit' });
}
