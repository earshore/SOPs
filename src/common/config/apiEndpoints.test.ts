import { readFileSync, readdirSync, statSync } from 'node:fs';
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

function readSettingsTemplate(): string {
  // TD-SET-01 Phase 2: shell + section fragments, assembled like the runtime loader.
  let html = readFileSync(
    join(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  const sectionOrder = [
    'llmSection',
    'toolStrategySection',
    'toolStrategyGeneralAi',
    'toolStrategyMasterAnalysis',
    'toolStrategyDeepChat',
    'toolStrategyKeywordHunter',
    'toolStrategyPpcFlags',
    'networkSection',
    'dataSection',
    'appearanceSection',
    'diagnosticsSection',
  ];
  for (const name of sectionOrder) {
    const slot = `<!--settings-slot:${name}-->`;
    if (!html.includes(slot)) continue;
    html = html.replace(
      slot,
      readFileSync(join(process.cwd(), `src/components/settings/sections/${name}.html`), 'utf8')
    );
  }
  return html;
}

function readAiAnalysisTemplate(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/app_center/views/master_analysis/ai_analysis/template.html'),
    'utf8'
  );
}

function readScraperTemplate(): string {
  return readFileSync(
    join(process.cwd(), 'src/modules/app_center/views/master_analysis/scraper/template.html'),
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

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function readRuntimeTextFiles(paths: string[]): Array<{ path: string; source: string }> {
  const files: Array<{ path: string; source: string }> = [];
  const textFilePattern = /\.(?:css|html|json|md|ts|tsx|js|mjs|cjs)$/;

  for (const path of paths) {
    const absolutePath = join(process.cwd(), path);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      for (const entry of readdirSync(absolutePath)) {
        files.push(...readRuntimeTextFiles([`${path}/${entry}`]));
      }
      continue;
    }

    if (textFilePattern.test(path) && !/\.test\.[cm]?[jt]sx?$/.test(path)) {
      files.push({ path, source: readFileSync(absolutePath, 'utf8') });
    }
  }

  return files;
}

describe('apiEndpoints CSP policy', () => {
  it('only includes browser-direct endpoints in CSP connect-src', () => {
    const connectSrc = generateCSPConnectSrc();

    expect(getBrowserDirectEndpoints()).toEqual([
      'new.hongecb.store',
      'api.scraperapi.com',
      'api.zenrows.com',
      'api.brightdata.com',
      'r.jina.ai',
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

  it('allows the Deep Chat web-search reader host in every deployed CSP', () => {
    for (const connectSrc of [
      generateCSPConnectSrc(),
      extractConnectSrc(readPublicHeadersCsp()),
      extractConnectSrc(readVercelCsp()),
    ]) {
      expect(connectSrc).toContain('https://r.jina.ai');
    }
  });

  it('keeps production LLM browser-direct and prevents old proxy routes from returning', () => {
    const runtimeFiles = readRuntimeTextFiles(['src', 'public', 'vercel.json']);

    for (const { path, source } of runtimeFiles) {
      expect(source, path).not.toContain('/api/llm/v1');
      expect(source, path).not.toContain('_routes.json');
      expect(source, path).not.toContain('server-managed placeholder');
    }

    expect(readPublicHeadersCsp()).toContain('https://new.hongecb.store');
    expect(readVercelCsp()).toContain('https://new.hongecb.store');
  });

  it('keeps script-src strict in deployed CSP headers', () => {
    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      const scriptSrc = extractCspDirective(csp, 'script-src');

      expect(scriptSrc).toBe("'self'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain('https://cdn.bootcdn.net');
    }
  });

  it('keeps style sources strict without inline style attributes', () => {
    for (const csp of [readPublicHeadersCsp(), readVercelCsp()]) {
      const styleSrc = extractCspDirective(csp, 'style-src');
      const styleSrcElem = extractCspDirective(csp, 'style-src-elem');
      const styleSrcAttr = extractCspDirective(csp, 'style-src-attr');

      expect(styleSrc).toBe("'self'");
      expect(styleSrcElem).toBe("'self'");
      expect(styleSrcAttr).toBe('');
      expect(styleSrc).not.toContain("'unsafe-inline'");
      expect(styleSrcElem).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-inline'");
    }

    expect(readAppModalSource()).not.toContain("createElement('style')");
    expect(readRestrictedWordsTemplate()).not.toContain('<style');
    expect(readRestrictedWordsEntry()).toContain("import './styles.css';");
  });
});

describe('apiEndpoints inline style policy', () => {
  it('keeps the app shell and migrated panels free of inline style bindings', () => {
    const inlineStyleBinding = /\s(?:x-bind:|:)?style\s*=/;

    expect(readIndexHtml()).not.toMatch(inlineStyleBinding);
    expect(readSettingsTemplate()).not.toMatch(inlineStyleBinding);
    expect(readAiAnalysisTemplate()).not.toMatch(inlineStyleBinding);
    expect(readScraperTemplate()).not.toMatch(inlineStyleBinding);
    // Drawer 动画由三态机 panelSheetState 驱动（'closed' | 'closing' | 'open'）；
    // 面板显隐仍由 :hidden="!isOpen" 决定，不使用 x-show/x-transition。
    expect(readSettingsTemplate()).toContain('data-state="closed"');
    expect(readSettingsTemplate()).toContain(':data-state="panelSheetState"');
  });

  it('keeps migrated assets free of static style attributes', () => {
    const migratedStaticStyleFiles = [
      'src/common/components/SidebarRenderer.ts',
      'src/common/devtools/PerformanceMonitor.ts',
      'src/common/devtools/MemoryDevTools.ts',
      'src/css/components/welcome-banner.css',
      'src/components/modal/sharedModals.html',
      'src/modules/amz_hub/constants/amz_hub_constants.ts',
      'src/modules/amz_hub/views/overview/template.html',
      'src/modules/amz_hub/views/knowledge/ecosystem/template.html',
      'src/modules/amz_hub/views/knowledge/eu_insights/template.html',
      'src/modules/amz_hub/views/knowledge/seo_strategy/template.html',
      'src/modules/amz_hub/views/practice/marketing_calendar/index.ts',
      'src/modules/amz_hub/views/practice/marketing_calendar/template.html',
      'src/modules/amz_hub/views/practice/promo_activities/template.html',
      'src/modules/app_center/views/keyword_hunter/analysis/index.ts',
      'src/modules/app_center/views/keyword_hunter/analysis/template.html',
      'src/modules/app_center/views/keyword_hunter/process/template.html',
      'src/modules/app_center/views/master_analysis/promptlab/template.html',
      'src/modules/home/homeDisplay.html',
      'src/modules/more/views/business_scenarios/casePageRenderer.ts',
      'src/modules/more/views/explore/agents/template.html',
      'src/modules/more/views/explore/prompts/template.html',
      'src/modules/more/views/explore/skills/template.html',
      'src/modules/more/views/explore/workflows/template.html',
      'src/modules/more/views/overview/template.html',
      'src/modules/sops/views/growth/npi_tracker/template.html',
      'src/modules/sops/views/overview/template.html',
    ];

    for (const file of migratedStaticStyleFiles) {
      expect(readProjectFile(file), file).not.toMatch(/\sstyle=/);
    }
  });

  it('keeps the migrated settings panel free of Alpine runtime display styles', () => {
    const alpineShowDirective = ['x', 'show'].join('-');

    expect(readSettingsTemplate()).not.toContain(`${alpineShowDirective}=`);
    expect(readSettingsTemplate()).not.toContain('x-transition');
    expect(readSettingsTemplate()).toContain(':hidden="!isOpen"');
  });

  it('bundles Font Awesome locally instead of loading it from bootcdn', () => {
    expect(readIndexHtml()).not.toContain('cdn.bootcdn.net');
    expect(readMainEntry()).toContain('@fortawesome/fontawesome-free/css/fontawesome.min.css');
    expect(readMainEntry()).toContain('@fortawesome/fontawesome-free/css/solid.min.css');
    expect(readMainEntry()).toContain('@fortawesome/fontawesome-free/css/regular.min.css');
    expect(readMainEntry()).toContain('@fortawesome/fontawesome-free/css/brands.min.css');

    const legacyFontFamilyDeclarations = readRuntimeTextFiles(['src'])
      .filter(
        ({ path, source }) =>
          path.endsWith('.css') && /font-family\s*:\s*['"]Font Awesome 6 Free['"]/i.test(source)
      )
      .map(({ path }) => path);

    expect(legacyFontFamilyDeclarations).toEqual([]);

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

describe('Font Awesome CSS policy', () => {
  it('keeps the welcome banner badge on the Font Awesome 7 classic solid glyph', () => {
    const css = readProjectFile('src/css/components/welcome-banner.css');
    const rule = css.match(/\.wb-container--simple\s+\.wb-icon::after\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(rule).not.toBe('');
    expect(rule).toMatch(/content:\s*['"]\\f0e7['"]\s*;/);
    expect(rule).toMatch(/font-weight:\s*900\s*;/);
    expect(rule).toMatch(
      /font-family:\s*var\(--fa-family-classic(?:,\s*['"]Font Awesome 7 Free['"])?\)\s*;/
    );
    expect(rule).not.toContain('Font Awesome 6 Free');
  });
});
