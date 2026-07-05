import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(process.cwd(), 'src/css/components/data-scan.css');
const mainCssPath = resolve(process.cwd(), 'src/css/main.css');

describe('PC data scan CSS contract', () => {
  it('loads the PC data scan component from the main CSS entry', () => {
    const mainCss = readFileSync(mainCssPath, 'utf8');

    expect(mainCss).toContain("@import './components/data-scan.css';");
  });

  it('defines stable desktop scanning dimensions and semantic helpers', () => {
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('--pc-data-row-height: 44px');
    expect(css).toContain('--pc-data-row-height-compact: 36px');
    expect(css).toContain('.pc-data-table');
    expect(css).toContain('.pc-data-list-item');
    expect(css).toContain(".pc-data-table [data-align='number']");
    expect(css).toContain(".pc-status-badge[data-tone='success']");
    expect(css).toContain(".pc-status-badge[data-tone='warning']");
    expect(css).toContain(".pc-status-badge[data-tone='error']");
    expect(css).toContain(".pc-status-badge[data-tone='info']");
    expect(css).toContain('.pc-action-button');
    expect(css).not.toMatch(/transition\s*:\s*all\b/);
  });
});
