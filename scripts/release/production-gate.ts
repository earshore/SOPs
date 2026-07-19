/**
 * Read-only production HTTP contract probe for a real Pages URL.
 * Does not mutate release-candidate artifacts.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ProbeResult {
  url: string;
  status: number;
  ok: boolean;
  detail: string;
}

export async function probeUrl(url: string, init?: RequestInit): Promise<ProbeResult> {
  const res = await fetch(url, { redirect: 'manual', ...init });
  return {
    url,
    status: res.status,
    ok: res.status >= 200 && res.status < 400,
    detail: `status=${res.status}`,
  };
}

export async function runProductionGate(baseUrl: string): Promise<{ ok: boolean; probes: ProbeResult[] }> {
  const root = baseUrl.replace(/\/$/, '');
  const probes: ProbeResult[] = [];
  probes.push(await probeUrl(`${root}/`));
  // missing asset must not be 200 HTML shell - accept 404
  const missing = await fetch(`${root}/assets/js/__missing_release_probe__.js`, { redirect: 'manual' });
  probes.push({
    url: `${root}/assets/js/__missing_release_probe__.js`,
    status: missing.status,
    ok: missing.status === 404,
    detail: `expected 404 got ${missing.status}`,
  });
  // clean home should redirect or ok depending on host; accept 302/301/200
  const home = await fetch(`${root}/home`, { redirect: 'manual' });
  const homeOk = home.status === 302 || home.status === 301 || home.status === 200 || home.status === 308;
  probes.push({
    url: `${root}/home`,
    status: home.status,
    ok: homeOk,
    detail: `location=${home.headers.get('location') ?? ''}`,
  });
  return { ok: probes.every(p => p.ok), probes };
}

async function main(): Promise<void> {
  const base = process.env.PAGES_PREVIEW_URL || process.env.PAGES_URL;
  if (!base) {
    console.error('Set PAGES_PREVIEW_URL (or PAGES_URL) to a real Pages origin');
    process.exit(2);
  }
  const result = await runProductionGate(base);
  const outDir = resolve(process.cwd(), 'release-artifacts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, 'production-readiness.json'),
    JSON.stringify({ ...result, at: new Date().toISOString(), base }, null, 2) + '\n'
  );
  if (!result.ok) {
    console.error('production-gate failed', result);
    process.exit(1);
  }
  console.log('production-gate passed', result);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('production-gate.ts');
if (isMain) {
  void main();
}
