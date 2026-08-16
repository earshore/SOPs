import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const variablesCssPath = resolve(process.cwd(), 'src/css/foundation/variables.css');
const variablesGeneratedCssPath = resolve(process.cwd(), 'src/css/foundation/variables.generated.css');
const buttonsCssPath = resolve(process.cwd(), 'src/css/components/buttons.css');
const headerCssPath = resolve(process.cwd(), 'src/css/components/header.css');
const containersCssPath = resolve(process.cwd(), 'src/css/utilities/containers.css');
const mainCssPath = resolve(process.cwd(), 'src/css/main.css');
const criticalCssPath = resolve(process.cwd(), 'src/css/critical.css');
const appCenterCssPath = resolve(process.cwd(), 'src/modules/app_center/app_center_style.css');
const sopsCssPath = resolve(process.cwd(), 'src/modules/sops/sops_style.css');

describe('PC design token CSS contract', () => {
  it('loads generated tokens before the manual alias layer', () => {
    const mainCss = readFileSync(mainCssPath, 'utf8');

    expect(mainCss.indexOf("@import './foundation/variables.generated.css';")).toBeLessThan(
      mainCss.indexOf("@import './foundation/variables.css';")
    );
  });

  it('keeps critical CSS on generated first-paint tokens instead of copying the base token set', () => {
    const criticalCss = readFileSync(criticalCssPath, 'utf8');

    expect(criticalCss.indexOf("@import './foundation/variables.generated.css';")).toBeLessThan(
      criticalCss.indexOf("@import './components/loading.css';")
    );
    expect(criticalCss).not.toMatch(/--color-(?:primary|slate-50|slate-700)\s*:/);
    expect(criticalCss).not.toMatch(/--font-(?:sans|display)\s*:/);
    expect(criticalCss).toContain('--duration-normal: var(--duration-300, 300ms)');
    expect(criticalCss).toContain('--z-header: var(--z-40, 40)');
  });

  it('keeps desktop layout on generated container scale after B5 archive', () => {
    const css = readFileSync(variablesCssPath, 'utf8');
    const generatedCss = readFileSync(variablesGeneratedCssPath, 'utf8');

    // B5-THM01: 手写 --layout-*/--page-gutter 布局别名（含 1536px 覆盖）已归档；
    // 桌面版式契约下沉为 generated --container-* 令牌 + containers/header 内联字面。
    expect(generatedCss).toContain('--container-max-width: 1450px');
    expect(generatedCss).toContain('--container-padding: 1rem');
    expect(generatedCss).toContain('--container-padding-sm: 1.5rem');
    expect(css).not.toMatch(/--layout-(?:max|wide)-width\s*:/);
    expect(css).not.toMatch(/--page-gutter\s*:/);
  });

  it('defines component and module semantic aliases instead of forcing raw colors in pages', () => {
    const css = readFileSync(variablesCssPath, 'utf8');

    // D2: card/panel aliases follow workbench radius SSOT (not bare rounded-md).
    expect(css).toContain('--rounded-card: var(--workbench-radius)');
    expect(css).toContain('--rounded-panel: var(--workbench-radius)');
    expect(css).toContain('--card-radius: var(--rounded-card)');
    expect(css).toContain('--card-border: var(--border-subtle)');
    expect(css).toContain('--panel-radius: var(--rounded-panel)');
    // B5-THM01: --card-bg/--panel-bg/--panel-border 别名已归档，消费点直连 --surface-*/--border-subtle。
    expect(css).toContain('--card-shadow: var(--shadow-card)');
    expect(css).toContain('--module-accent: var(--color-accent)');
    expect(css).toContain('--module-accent-soft: var(--color-accent-light)');
    expect(css).toContain(
      '--module-accent-border: color-mix(in srgb, var(--module-accent) 24%, transparent)'
    );
    // B2-THM01: focus-ring 链归档，--module-accent-focus 降级为 var(--module-accent)。
    expect(css).toMatch(/--module-accent-focus:\s*var\(\s*--module-accent\s*\)/);
  });

  it('keeps soft focus halo fallback derived from Appearance primary (D5, B2-THM01)', () => {
    const css = readFileSync(variablesCssPath, 'utf8');
    const headerCss = readFileSync(headerCssPath, 'utf8');

    // B2-THM01: 手写 --focus-ring-soft 组已归档（D13）；header 等消费点保留内联
    // fallback，仍从 Appearance primary 派生（不再回退到硬编码蓝色 rgba）。
    expect(css).not.toMatch(/--focus-ring-soft\s*:/);
    expect(css).not.toMatch(/--focus-ring-soft:\s*rgba\(37,\s*99,\s*235/);
    expect(headerCss).toMatch(
      /color-mix\(in srgb,\s*var\(--color-primary[\s\S]*?16%,\s*transparent\)\s*\)/
    );
  });

  it('does not stomp Appearance primary/focus with indigo under dark mode (T1)', () => {
    const css = readFileSync(variablesCssPath, 'utf8');

    // Dark foundation must not hard-assign brand primary/focus/link to indigo.
    expect(css).not.toMatch(/--color-primary:\s*var\(--color-indigo-/);
    expect(css).not.toMatch(/--color-primary-dark:\s*var\(--color-indigo-/);
    expect(css).not.toMatch(/--color-primary-darker:\s*var\(--color-indigo-/);
    expect(css).not.toMatch(/--color-focus-ring:\s*var\(--color-indigo-/);
    expect(css).not.toMatch(/--color-border-focus:\s*var\(--color-indigo-/);
    expect(css).not.toMatch(/--color-text-link:\s*var\(--color-indigo-/);
    // B2-THM01: 手写 --focus-ring-* 链连同 dark 镜像归档，dark 块不再定义焦点令牌；
    // 保留的是从 Appearance primary 派生的软填充再调优（非色相 stomp）。
    expect(css).not.toMatch(
      /\[data-color-mode-resolved='dark'\][\s\S]*--focus-ring-\w+\s*:/
    );
    expect(css).toMatch(
      /\[data-color-mode-resolved='dark'\][\s\S]*--color-primary-light:\s*color-mix\(in srgb,\s*var\(--color-primary\)\s*22%,\s*transparent\)/
    );
  });

  it('routes primary action buttons through semantic button aliases', () => {
    const css = readFileSync(buttonsCssPath, 'utf8');

    expect(css).toContain('background: var(--button-primary-bg, var(--color-primary))');
    expect(css).toContain(
      'color: var(--button-primary-fg, var(--color-primary-contrast, #ffffff))'
    );
    expect(css).toContain('background: var(--button-primary-hover-bg, var(--color-primary-dark))');
    expect(css).toContain(
      'background: var(--button-primary-active-bg, var(--color-primary-darker))'
    );
  });

  it('keeps desktop layout widths in shared PC containers and header chrome (B5-THM01)', () => {
    const containersCss = readFileSync(containersCssPath, 'utf8');
    const headerCss = readFileSync(headerCssPath, 'utf8');

    // B5-THM01: --layout-*/--page-gutter 别名归档，containers/header 内联同一字面宽度/内边距。
    expect(containersCss).toContain('max-width: 1450px');
    expect(containersCss).toContain('max-width: 1600px');
    expect(containersCss).toContain('padding: 2rem 1rem');
    expect(containersCss).toContain('padding: 0 1rem');
    expect(headerCss).toContain('max-width: 1450px');
    expect(headerCss).toContain('padding: 0 var(--spacing-4, 16px)');
  });

  it('keeps module themes on module accent aliases instead of overriding global primary color', () => {
    const appCenterCss = readFileSync(appCenterCssPath, 'utf8');
    const sopsCss = readFileSync(sopsCssPath, 'utf8');
    const localPrimaryDefinition = /--color-primary(?:-(?:light|dark|darker))?\s*:/;
    const journeyUsesAppearanceAccent =
      /\.app-overview-recent-journey\s*\{[^}]*--app-recent-accent:\s*var\(--color-primary\)/;

    expect(appCenterCss).toContain('--module-accent: var(--app-overview-accent)');
    expect(appCenterCss).toContain('--module-accent-focus: var(--app-overview-focus-ring)');
    // B2-THM01: focus-ring 链归档，焦点兜底回落到 primary。
    expect(appCenterCss).toContain(
      '--button-filter-focus-color: var(--module-accent, var(--color-primary, #3b82f6))'
    );
    expect(appCenterCss).not.toMatch(localPrimaryDefinition);
    expect(appCenterCss).toMatch(journeyUsesAppearanceAccent);

    expect(sopsCss).toContain('--module-accent: var(--sops-qwen-violet)');
    expect(sopsCss).toContain('--module-accent-focus: var(--sops-qwen-focus)');
    expect(sopsCss).toContain(
      'outline: 2px solid var(--module-accent, var(--color-primary, #3b82f6))'
    );
    expect(sopsCss).not.toMatch(localPrimaryDefinition);
  });

  it('keeps NPI long-form helper copy within a readable desktop measure', () => {
    const sopsCss = readFileSync(sopsCssPath, 'utf8');

    expect(sopsCss).toContain('.npi-tracker-page p');
    expect(sopsCss).toContain('max-width: min(100%, 64rem)');
  });
});
