import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const variablesCssPath = resolve(process.cwd(), 'src/css/foundation/variables.css');
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

  it('defines desktop layout aliases for PC workbench pages', () => {
    const css = readFileSync(variablesCssPath, 'utf8');

    expect(css).toContain('--layout-max-width: var(--container-max-width, var(--container-2xl))');
    expect(css).toContain('--layout-wide-width: 1600px');
    expect(css).toContain('--page-gutter: var(--container-padding-x-lg, 24px)');
    expect(css).toContain('--page-gutter-wide: var(--spacing-xl, 32px)');
    expect(css).toMatch(
      /@media\s*\(min-width:\s*1536px\)[\s\S]*--page-gutter:\s*var\(--page-gutter-wide,\s*32px\)/
    );
  });

  it('defines component and module semantic aliases instead of forcing raw colors in pages', () => {
    const css = readFileSync(variablesCssPath, 'utf8');

    // D2: card/panel aliases follow workbench radius SSOT (not bare rounded-md).
    expect(css).toContain('--rounded-card: var(--workbench-radius)');
    expect(css).toContain('--rounded-panel: var(--workbench-radius)');
    expect(css).toContain('--card-bg: var(--surface-card)');
    expect(css).toContain('--card-border: var(--border-subtle)');
    expect(css).toContain('--panel-bg: var(--surface-panel)');
    expect(css).toContain('--panel-border: var(--border-subtle)');
    expect(css).toContain('--module-accent: var(--color-accent)');
    expect(css).toContain('--module-accent-soft: var(--color-accent-light)');
    expect(css).toContain(
      '--module-accent-border: color-mix(in srgb, var(--module-accent) 24%, transparent)'
    );
    expect(css).toContain('--module-accent-focus: var(--focus-ring-soft)');
  });

  it('tracks soft focus halo through Appearance focus-ring (D5)', () => {
    const css = readFileSync(variablesCssPath, 'utf8');

    expect(css).toContain(
      '--focus-ring-soft: color-mix(in srgb, var(--color-focus-ring) 16%, transparent)'
    );
    expect(css).not.toMatch(/--focus-ring-soft:\s*rgba\(37,\s*99,\s*235/);
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

  it('uses desktop layout aliases in shared PC containers and header chrome', () => {
    const containersCss = readFileSync(containersCssPath, 'utf8');
    const headerCss = readFileSync(headerCssPath, 'utf8');

    expect(containersCss).toContain('max-width: var(--layout-max-width, 1450px)');
    expect(containersCss).toContain('max-width: var(--layout-wide-width, 1600px)');
    expect(containersCss).toContain('padding: 2rem var(--page-gutter, 1rem)');
    expect(containersCss).toContain('padding: 0 var(--page-gutter, 1rem)');
    expect(headerCss).toContain('max-width: var(--layout-max-width, var(--container-2xl, 1450px))');
    expect(headerCss).toContain('padding: 0 var(--page-gutter, var(--spacing-md, 16px))');
  });

  it('keeps module themes on module accent aliases instead of overriding global primary color', () => {
    const appCenterCss = readFileSync(appCenterCssPath, 'utf8');
    const sopsCss = readFileSync(sopsCssPath, 'utf8');
    const localPrimaryDefinition = /--color-primary(?:-(?:light|dark|darker))?\s*:/;
    const localPrimaryReference = /var\(--color-primary(?:\)|,|-light|-dark|-darker)/;

    expect(appCenterCss).toContain('--module-accent: var(--app-overview-accent)');
    expect(appCenterCss).toContain('--module-accent-focus: var(--app-overview-focus-ring)');
    expect(appCenterCss).toContain(
      '--button-filter-focus-color: var(--module-accent, var(--color-focus-ring, #3b82f6))'
    );
    expect(appCenterCss).not.toMatch(localPrimaryDefinition);
    expect(appCenterCss).not.toMatch(localPrimaryReference);

    expect(sopsCss).toContain('--module-accent: var(--sops-qwen-violet)');
    expect(sopsCss).toContain('--module-accent-focus: var(--sops-qwen-focus)');
    expect(sopsCss).toContain(
      'outline: 2px solid var(--module-accent, var(--color-focus-ring, #3b82f6))'
    );
    expect(sopsCss).not.toMatch(localPrimaryDefinition);
    expect(sopsCss).not.toMatch(localPrimaryReference);
  });

  it('keeps NPI long-form helper copy within a readable desktop measure', () => {
    const sopsCss = readFileSync(sopsCssPath, 'utf8');

    expect(sopsCss).toContain('.npi-tracker-page p');
    expect(sopsCss).toContain('max-width: min(100%, 64rem)');
  });
});
