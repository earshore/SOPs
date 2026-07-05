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
  return extractCspDirective(csp, 'connect-src');
}

function extractCspDirective(csp: string, directive: string): string {
  return csp.match(new RegExp(`(?:^|;\\s*)${directive}\\s+([^;]+)`))?.[1]?.trim() ?? '';
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

function readIndexHtml(): string {
  return readFileSync(join(process.cwd(), 'index.html'), 'utf8');
}

function readMainEntry(): string {
  return readFileSync(join(process.cwd(), 'src/main.ts'), 'utf8');
}

function readMarketingCalendarTemplate(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/amz_hub/views/practice/marketing_calendar/template.html'),
    'utf8'
  );
}

function readMarketingCalendarEntry(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/amz_hub/views/practice/marketing_calendar/index.ts'),
    'utf8'
  );
}

function readAppModalSource(): string {
  return readFileSync(join(process.cwd(), 'src/components/modal/AppModal.ts'), 'utf8');
}

function readRestrictedWordsTemplate(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/sops/views/growth/restricted_words/template.html'),
    'utf8'
  );
}

function readRestrictedWordsEntry(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/sops/views/growth/restricted_words/index.ts'),
    'utf8'
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
      'new.hongecb.store',
      'api.scraperapi.com',
      'api.zenrows.com',
      'api.brightdata.com',
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

  it('keeps script-src strict in deployed CSP headers', () => {
    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      const scriptSrc = extractCspDirective(csp, 'script-src');

      expect(scriptSrc).toBe("'self'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain('https://cdn.bootcdn.net');
    }
  });

  it('keeps style elements strict while isolating inline style attributes', () => {
    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      const styleSrc = extractCspDirective(csp, 'style-src');
      const styleSrcElem = extractCspDirective(csp, 'style-src-elem');
      const styleSrcAttr = extractCspDirective(csp, 'style-src-attr');

      expect(styleSrc).toBe("'self'");
      expect(styleSrcElem).toBe("'self'");
      expect(styleSrcAttr).toBe("'unsafe-inline'");
      expect(styleSrc).not.toContain("'unsafe-inline'");
      expect(styleSrcElem).not.toContain("'unsafe-inline'");
    }

    expect(readAppModalSource()).not.toContain("createElement('style')");
    expect(readRestrictedWordsTemplate()).not.toContain('<style');
    expect(readRestrictedWordsEntry()).toContain("import './styles.css';");
  });

  it('bundles Font Awesome locally instead of loading it from bootcdn', () => {
    expect(readIndexHtml()).not.toContain('cdn.bootcdn.net');
    expect(readMainEntry()).toContain('@fortawesome/fontawesome-free/css/all.min.css');

    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      expect(extractCspDirective(csp, 'style-src')).not.toContain('cdn.bootcdn.net');
      expect(extractCspDirective(csp, 'style-src-elem')).not.toContain('cdn.bootcdn.net');
      expect(extractCspDirective(csp, 'font-src')).not.toContain('cdn.bootcdn.net');
    }
  });

  it('uses system font stacks instead of loading Google Fonts', () => {
    expect(readIndexHtml()).not.toContain('fonts.googleapis.com');
    expect(readIndexHtml()).not.toContain('fonts.gstatic.com');

    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      expect(extractCspDirective(csp, 'style-src')).not.toContain('fonts.googleapis.com');
      expect(extractCspDirective(csp, 'style-src-elem')).not.toContain('fonts.googleapis.com');
      expect(extractCspDirective(csp, 'font-src')).not.toContain('fonts.gstatic.com');
    }
  });

  it('bundles flag icons locally instead of loading them from the stylesheet CDN', () => {
    const template = readMarketingCalendarTemplate();
    const entry = readMarketingCalendarEntry();

    expect(template).not.toContain('cdn.jsdelivr.net');
    expect(entry).not.toContain('flag-icons/css/flag-icons.min.css');
    expect(entry).toContain("import './flag-icons.local.css';");

    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      expect(extractCspDirective(csp, 'style-src')).not.toContain('cdn.jsdelivr.net');
      expect(extractCspDirective(csp, 'style-src-elem')).not.toContain('cdn.jsdelivr.net');
    }
  });
});
