import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateCSPConnectSrc,
  getBrowserDirectEndpoints,
  getDangerousEndpoints,
} from './apiEndpoints';

interface VercelConfig {
  headers: Array<{
    source: string;
    headers: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

function extractConnectSrc(csp: string): string {
  return csp.match(/(?:^|;\s*)connect-src\s+([^;]+)/)?.[1]?.trim() ?? '';
}

function readPublicHeadersCsp(): string {
  const headers = readFileSync(join(process.cwd(), 'public/_headers'), 'utf8');
  return (
    headers
      .split(/\r?\n/)
      .find(line => line.includes('Content-Security-Policy:'))
      ?.split('Content-Security-Policy:')[1]
      ?.trim() ?? ''
  );
}

function readVercelCsp(): string {
  const vercelConfig = JSON.parse(
    readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')
  ) as VercelConfig;
  return (
    vercelConfig.headers
      .find(header => header.source === '/(.*)')
      ?.headers.find(header => header.key === 'Content-Security-Policy')?.value ?? ''
  );
}

describe('apiEndpoints CSP policy', () => {
  it('only includes browser-direct endpoints in CSP connect-src', () => {
    const connectSrc = generateCSPConnectSrc();

    expect(getBrowserDirectEndpoints()).toEqual([
      'api.scraperapi.com',
      'api.zenrows.com',
      'api.brightdata.com',
      'new.hongecb.store',
    ]);
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://new.hongecb.store');

    getDangerousEndpoints().forEach(domain => {
      expect(connectSrc).not.toContain(domain);
    });
  });

  it('keeps deployed CSP headers aligned with endpoint policy', () => {
    const expectedConnectSrc = generateCSPConnectSrc();

    expect(extractConnectSrc(readPublicHeadersCsp())).toBe(expectedConnectSrc);
    expect(extractConnectSrc(readVercelCsp())).toBe(expectedConnectSrc);
  });
});
