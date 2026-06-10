import { describe, expect, it } from 'vitest';
import { setSafeHtml } from './security';

describe('welcome banner normalization', () => {
  it('adds landmark semantics and prunes repeated simple-banner decorations', () => {
    const container = document.createElement('div');

    setSafeHtml(
      container,
      `
        <div class="wb-container wb-container--simple">
          <div class="wb-orb wb-orb-1"></div>
          <div class="wb-particle wb-particle-1"></div>
          <div class="wb-content">
            <div class="wb-icon"><i class="fas fa-clipboard-list"></i></div>
            <div class="wb-title-row">
              <h1 class="wb-title">SOP Overview</h1>
            </div>
          </div>
        </div>
      `,
    );

    const banner = container.querySelector<HTMLElement>('.wb-container');
    const title = container.querySelector<HTMLElement>('.wb-title');

    expect(banner).not.toBeNull();
    expect(title).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('region');
    expect(banner?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(title?.id).toMatch(/^welcome-banner-title-/);
    expect(banner?.querySelector('.wb-orb')).toBeNull();
    expect(banner?.querySelector('.wb-particle')).toBeNull();
    expect(banner?.querySelector('.wb-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps card-banner decorations while hiding them from assistive tech', () => {
    const container = document.createElement('div');

    setSafeHtml(
      container,
      `
        <div class="wb-container wb-container--card">
          <div class="wb-card">
            <div class="wb-bg-gradient"></div>
            <div class="wb-orb wb-orb-1"></div>
            <div class="wb-particle wb-particle-1"></div>
            <div class="wb-content">
              <h2 class="wb-title">Tool Banner</h2>
            </div>
          </div>
        </div>
      `,
    );

    const banner = container.querySelector<HTMLElement>('.wb-container');
    const orb = banner?.querySelector('.wb-orb');
    const particle = banner?.querySelector('.wb-particle');

    expect(orb).not.toBeNull();
    expect(particle).not.toBeNull();
    expect(orb?.getAttribute('aria-hidden')).toBe('true');
    expect(particle?.getAttribute('role')).toBe('presentation');
  });

  it('preserves existing hero labels while normalizing decorative icons', () => {
    const container = document.createElement('div');

    setSafeHtml(
      container,
      `
        <section class="ppc-hero" aria-labelledby="ppc-page-title">
          <div class="ppc-hero-icon"><i class="fas fa-magnifying-glass-dollar"></i></div>
          <h1 id="ppc-page-title">PPC Search Terms</h1>
          <span class="ppc-tag-dot"></span>
        </section>
      `,
    );

    const hero = container.querySelector<HTMLElement>('.ppc-hero');

    expect(hero).not.toBeNull();
    expect(hero?.getAttribute('aria-labelledby')).toBe('ppc-page-title');
    expect(hero?.querySelector('.ppc-hero-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(hero?.querySelector('.ppc-tag-dot')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('labels ziniao notice title sections as welcome banner regions', () => {
    const container = document.createElement('div');

    setSafeHtml(
      container,
      `
        <section class="zn-notice-title">
          <h2>使用 OpenClaw 前必读</h2>
          <p>先确认模型能力和人工确认边界。</p>
        </section>
      `,
    );

    const banner = container.querySelector<HTMLElement>('.zn-notice-title');
    const title = container.querySelector<HTMLElement>('h2');

    expect(banner).not.toBeNull();
    expect(title).not.toBeNull();
    expect(banner?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(title?.id).toMatch(/^welcome-banner-title-/);
  });
});
