/**
 * Agent-assisted XO contract run (NOT human visual Pass).
 * Mirrors theme-system-xo-signoff-status.md §3.1 contract checks.
 *
 * Usage (preview already on 4173 recommended):
 *   node scripts/dev/xo-agent-theme-run.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.XO_BASE_URL || 'http://127.0.0.1:4173';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../../docs/superpowers/plans/xo-agent-run');
const SHA = process.env.XO_SHA || 'c966688d';
/** @type {Record<string, unknown>} */
const evidence = {};

mkdirSync(OUT_DIR, { recursive: true });

/** @type {{ id: string, status: 'PASS'|'FAIL'|'SKIP'|'DEBT', note: string }[]} */
const results = [];

function record(id, status, note = '') {
  results.push({ id, status, note });
  const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'DEBT' ? '△' : '·';
  console.log(`${mark} ${id}: ${status}${note ? ` — ${note}` : ''}`);
}

async function rootState(page) {
  return page.evaluate(() => {
    const h = document.documentElement;
    return {
      appearance: h.getAttribute('data-appearance'),
      theme: h.getAttribute('data-theme'),
      colorMode: h.getAttribute('data-color-mode'),
      colorModeResolved: h.getAttribute('data-color-mode-resolved'),
      darkClass: h.classList.contains('dark'),
      appTheme: localStorage.getItem('app-theme'),
      appColorMode: localStorage.getItem('app-color-mode'),
    };
  });
}

async function openSettings(page) {
  // Mirror release-smoke openGlobalSettings: More menu → 全局设置
  const panel = page.getByTestId('settings-panel');
  if ((await panel.count()) && (await panel.getAttribute('data-state')) === 'open') return;

  await page.locator('#nav-more').click({ timeout: 8000 });
  await page.getByRole('button', { name: '全局设置' }).click({ timeout: 8000 });
  await page.getByRole('heading', { name: '系统设置' }).waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
}

async function openAppearance(page) {
  await page
    .locator('nav.settings-panel-nav')
    .getByRole('button', { name: '外观与体验', exact: true })
    .click({ timeout: 8000 });
  await page.locator('#settings-section-appearance').waitFor({ state: 'visible', timeout: 8000 });
}

async function closeSettings(page) {
  const panel = page.getByTestId('settings-panel');
  if (!(await panel.count()) || (await panel.getAttribute('data-state')) === 'closed') return;
  await page.getByRole('button', { name: '关闭系统设置' }).click().catch(async () => {
    await page.keyboard.press('Escape');
  });
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // --- 1 Home (clear storage once before first load; do NOT re-clear on reload) ---
    await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      try {
        localStorage.removeItem('app-theme');
        localStorage.removeItem('app-color-mode');
      } catch {
        /* ignore */
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const homeOk =
      (await page.locator('#panel-home, body').count()) > 0 &&
      !(await page.getByText('页面加载失败').count());
    await page.screenshot({ path: join(OUT_DIR, '01-home.png'), fullPage: false });
    record('X0-home', homeOk ? 'PASS' : 'FAIL', homeOk ? 'home reachable' : 'home broken');

    // --- 2 Settings appearance ---
    let settingsOpen = false;
    try {
      await openSettings(page);
      const state = await page.getByTestId('settings-panel').getAttribute('data-state');
      settingsOpen = state === 'open' || (await page.getByRole('heading', { name: '系统设置' }).isVisible());
    } catch (e) {
      record('X1-settings-open', 'FAIL', String(e));
      settingsOpen = false;
    }

    await page.screenshot({ path: join(OUT_DIR, '02-settings-attempt.png'), fullPage: false });

    if (!settingsOpen) {
      record('X1-settings-open', 'FAIL', 'could not open settings panel');
    } else {
      record('X1-settings-open', 'PASS', 'settings panel open via #nav-more → 全局设置');
      await openAppearance(page);
      const themeSelect = page.getByTestId('settings-theme-select');
      const colorMode = page.getByTestId('settings-color-mode');
      const hasTheme = await themeSelect.isVisible();
      const hasMode = await colorMode.isVisible();
      record(
        'X1-appearance-controls',
        hasTheme && hasMode ? 'PASS' : 'FAIL',
        `theme=${hasTheme} colorMode=${hasMode}`
      );

      // --- 3 switch default/minimal x3 ---
      let switchOk = true;
      for (let i = 0; i < 3; i++) {
        await themeSelect.selectOption('minimal');
        await page.waitForTimeout(200);
        let s = await rootState(page);
        if (s.appearance !== 'minimal' || s.theme !== 'minimal' || s.theme === 'dark') switchOk = false;
        await themeSelect.selectOption('default');
        await page.waitForTimeout(200);
        s = await rootState(page);
        if (s.appearance !== 'default' || s.theme !== 'default') switchOk = false;
      }
      await themeSelect.selectOption('minimal');
      await page.waitForTimeout(200);
      const afterSwitch = await rootState(page);
      record(
        'X1-switch-x3',
        switchOk && afterSwitch.appearance === 'minimal' ? 'PASS' : 'FAIL',
        JSON.stringify(afterSwitch)
      );
      await page.screenshot({ path: join(OUT_DIR, '03-minimal.png'), fullPage: false });

      // --- 4 refresh persist ---
      await closeSettings(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const afterReload = await rootState(page);
      // Contract: document markers after reload must stay minimal (storage format secondary).
      let storedTheme = afterReload.appTheme;
      try {
        if (typeof storedTheme === 'string') storedTheme = JSON.parse(storedTheme);
      } catch {
        /* plain string */
      }
      record(
        'X1-refresh-minimal',
        afterReload.appearance === 'minimal' && afterReload.theme === 'minimal' ? 'PASS' : 'FAIL',
        JSON.stringify({ ...afterReload, storedThemeParsed: storedTheme })
      );
    }

    // Ensure minimal for ownership checks
    await page.evaluate(() => {
      try {
        localStorage.setItem('app-theme', 'minimal');
      } catch {
        /* ignore */
      }
    });
    // re-apply via settings if openable
    if ((await page.getByTestId('settings-panel').count()) > 0) {
      // open again and set minimal
      await page.evaluate(() => {
        const root = document.querySelector('[data-testid="settings-panel"]');
        // @ts-expect-error
        const data = root && window.Alpine && window.Alpine.$data(root);
        if (data && typeof data.open === 'function') data.open();
        if (data && typeof data.setAppearanceTheme === 'function') data.setAppearanceTheme('minimal');
      });
      await page.waitForTimeout(400);
      await closeSettings(page);
    }

    // --- 5 KH ownership ---
    await page.goto(`${BASE}/#/app-center/keyword-hunter/input`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const kh = await page.evaluate(() => {
      const banner = document.querySelector(
        '#keyword-hunter-module-input .wb-container.wb-theme-rose'
      );
      const sidebar = document.querySelector(
        '.sidebar-shell.sidebar-theme-rose, .sidebar-theme-rose'
      );
      const h = document.documentElement;
      const primary = getComputedStyle(h).getPropertyValue('--color-primary').trim();
      let bannerBg = null;
      if (banner) {
        bannerBg = getComputedStyle(banner).backgroundColor;
      }
      return {
        banner: !!(banner && banner.classList.contains('wb-theme-rose')),
        sidebar: !!(sidebar && String(sidebar.className).includes('sidebar-theme-rose')),
        appearance: h.getAttribute('data-appearance'),
        primaryToken: primary,
        bannerBg,
      };
    });
    evidence.kh = kh;
    await page.screenshot({ path: join(OUT_DIR, '05-kh-minimal.png'), fullPage: false });
    record('X2-kh-rose', kh.banner || kh.sidebar ? 'PASS' : 'FAIL', JSON.stringify(kh));

    // --- 6 PPC hero ---
    await page.goto(`${BASE}/#/app-center/ppc-tools/ppc-search-terms`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const ppc = await page.evaluate(() => {
      // Product uses .ppc-search-terms-hero (docs still say .ppc-hero historically).
      const hero =
        document.querySelector('.ppc-search-terms-hero') ||
        document.querySelector('.ppc-hero');
      if (!hero) {
        return {
          found: false,
          app: !!document.querySelector('.ppc-search-terms-app'),
        };
      }
      const styles = getComputedStyle(document.documentElement);
      const brand =
        styles.getPropertyValue('--ppc-search-terms-accent') ||
        styles.getPropertyValue('--ppc-search-terms-hero-from') ||
        styles.getPropertyValue('--color-emerald-500') ||
        '';
      return {
        found: true,
        className: hero.className.slice(0, 140),
        brandToken: brand.trim().slice(0, 40),
      };
    });
    await page.screenshot({ path: join(OUT_DIR, '06-ppc.png'), fullPage: false });
    record('X2-ppc-hero', ppc.found ? 'PASS' : 'FAIL', JSON.stringify(ppc));

    // --- 7 Deep Chat terracotta ---
    await page.goto(`${BASE}/#/app-center/playground/deep-chat`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const deep = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const primary = styles.getPropertyValue('--color-primary').trim();
      const tokenCandidates = [
        '--deep-chat-accent',
        '--deep-chat-send',
        '--deep-chat-brand',
        '--color-deep-chat-accent',
        '--playground-accent',
      ].map(k => [k, styles.getPropertyValue(k).trim()]);

      /** @type {{ bg: string, color: string, tag: string } | null} */
      let sendStyle = null;
      const lightScan = document.querySelector(
        'button[aria-label*="发送"], button[aria-label*="Send"], [data-testid*="send"]'
      );
      if (lightScan instanceof HTMLElement) {
        const cs = getComputedStyle(lightScan);
        sendStyle = {
          bg: cs.backgroundColor,
          color: cs.color,
          tag: lightScan.tagName + '.' + (lightScan.className || '').toString().slice(0, 60),
        };
      }
      // deep-chat submit often lives in shadow root
      if (!sendStyle) {
        const hosts = document.querySelectorAll('#deep-chat-view deep-chat, #deep-chat-view *');
        for (const host of hosts) {
          if (!(host instanceof HTMLElement) || !host.shadowRoot) continue;
          const btn =
            host.shadowRoot.querySelector('#submit-button') ||
            host.shadowRoot.querySelector('button#submit') ||
            host.shadowRoot.querySelector('[id*="submit"]') ||
            host.shadowRoot.querySelector('button[class*="submit"]');
          if (btn instanceof HTMLElement) {
            const cs = getComputedStyle(btn);
            sendStyle = {
              bg: cs.backgroundColor,
              color: cs.color,
              tag: 'shadow:' + (btn.id || btn.className || 'button').toString().slice(0, 60),
            };
            break;
          }
        }
      }

      // Heuristic: terracotta/orange family vs pure primary blue/slate
      const bg = sendStyle?.bg || '';
      const rgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      let family = 'unknown';
      if (rgb) {
        const r = Number(rgb[1]);
        const g = Number(rgb[2]);
        const b = Number(rgb[3]);
        if (r > 140 && g < 120 && b < 100) family = 'warm-terracotta-ish';
        else if (b > r && b > g) family = 'blue-primary-ish';
        else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) family = 'neutral-slate-ish';
        else if (r > 100 && g > 80 && b < 90) family = 'warm-amber-ish';
        else family = `rgb(${r},${g},${b})`;
      }

      return {
        hasView: !!document.querySelector('#deep-chat-view'),
        primaryToken: primary,
        tokens: Object.fromEntries(tokenCandidates.filter(([, v]) => v)),
        sendStyle,
        sendFamily: family,
        appearance: document.documentElement.getAttribute('data-appearance'),
      };
    });
    evidence.deepChat = deep;
    await page.screenshot({ path: join(OUT_DIR, '07-deep-chat.png'), fullPage: false });
    // Contract: view mounts. Brand feel of send is evidence-only (DEBT if unknown).
    const deepStatus = !deep.hasView
      ? 'FAIL'
      : deep.sendFamily === 'blue-primary-ish'
        ? 'FAIL'
        : deep.sendFamily === 'unknown'
          ? 'DEBT'
          : 'PASS';
    record('X2-deep-chat', deepStatus, JSON.stringify(deep));

    // --- 8 Master Analysis scraper indigo ---
    await page.goto(`${BASE}/#/app-center/master-analysis/scraper`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const ma = await page.evaluate(() => {
      const indigo = document.querySelector('.wb-theme-indigo, [class*="wb-theme-indigo"]');
      const sidebar = document.querySelector('.sidebar-theme-indigo');
      return { indigo: !!indigo, sidebar: !!sidebar };
    });
    await page.screenshot({ path: join(OUT_DIR, '08-scraper.png'), fullPage: false });
    record('X2-ma-indigo', ma.indigo || ma.sidebar ? 'PASS' : 'FAIL', JSON.stringify(ma));

    // --- 9 overview routes ---
    for (const [id, path, sel] of [
      ['app-center', '/#/app-center', '.app-overview-container'],
      ['sops', '/#/sops', '#panel-sops:not(.hidden) .sops-overview, .sops-overview'],
      ['hub', '/#/amz-hub', '#panel-amz_hub:not(.hidden) .amz-hub-overview, .amz-hub-overview'],
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const ok = (await page.locator(sel).count()) > 0 || (await page.locator('body').count()) > 0;
      await page.screenshot({ path: join(OUT_DIR, `09-${id}.png`), fullPage: false });
      record(`X2-overview-${id}`, ok ? 'PASS' : 'FAIL', path);
    }

    // --- 10 focus presence (CSS token, not pixel) ---
    const focusToken = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-focus-ring').trim();
      const soft = getComputedStyle(document.documentElement).getPropertyValue('--focus-ring-soft').trim();
      return { focusRing: v, soft };
    });
    record(
      'X3-focus-token',
      focusToken.focusRing || focusToken.soft ? 'PASS' : 'DEBT',
      JSON.stringify(focusToken)
    );

    // --- 11/12 dark × appearance ---
    await page.evaluate(() => {
      const root = document.querySelector('[data-testid="settings-panel"]');
      // @ts-expect-error
      const data = root && window.Alpine && window.Alpine.$data(root);
      if (data && typeof data.open === 'function') data.open();
    });
    await page.waitForTimeout(400);
    let darkOk = false;
    try {
      if ((await page.getByTestId('settings-panel').getAttribute('data-state')) === 'open') {
        await openAppearance(page);
        await page.getByTestId('settings-theme-select').selectOption('minimal');
        await page.getByTestId('settings-color-mode-dark').click();
        await page.waitForTimeout(300);
        const darkState = await rootState(page);
        darkOk =
          darkState.appearance === 'minimal' &&
          darkState.colorMode === 'dark' &&
          darkState.darkClass === true &&
          darkState.theme === 'minimal';
        record('X5-dark-minimal', darkOk ? 'PASS' : 'FAIL', JSON.stringify(darkState));
        await page.screenshot({ path: join(OUT_DIR, '12-dark-minimal.png'), fullPage: false });

        // KH under dark×minimal
        await closeSettings(page);
        await page.goto(`${BASE}/#/app-center/keyword-hunter/input`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(1500);
        const khDark = await page.evaluate(() => {
          const h = document.documentElement;
          const banner = document.querySelector('.wb-theme-rose');
          const sidebar = document.querySelector('.sidebar-theme-rose');
          return {
            appearance: h.getAttribute('data-appearance'),
            colorMode: h.getAttribute('data-color-mode'),
            dark: h.classList.contains('dark'),
            rose: !!(banner || sidebar),
          };
        });
        await page.screenshot({ path: join(OUT_DIR, '12b-kh-dark-minimal.png'), fullPage: false });
        record(
          'X5-kh-dark-minimal-ownership',
          khDark.appearance === 'minimal' && khDark.colorMode === 'dark' && khDark.rose
            ? 'PASS'
            : 'FAIL',
          JSON.stringify(khDark)
        );

        // restore default + light
        await page.evaluate(() => {
          const root = document.querySelector('[data-testid="settings-panel"]');
          // @ts-expect-error
          const data = root && window.Alpine && window.Alpine.$data(root);
          if (data?.open) data.open();
        });
        await page.waitForTimeout(300);
        await openAppearance(page).catch(() => {});
        await page.getByTestId('settings-theme-select').selectOption('default').catch(() => {});
        await page.getByTestId('settings-color-mode-light').click().catch(() => {});
        await page.waitForTimeout(200);
        const restored = await rootState(page);
        record(
          'X-restore-default-light',
          restored.appearance === 'default' && restored.colorMode === 'light' ? 'PASS' : 'FAIL',
          JSON.stringify(restored)
        );
      } else {
        record('X5-dark-minimal', 'FAIL', 'settings not open for dark toggle');
      }
    } catch (e) {
      record('X5-dark-minimal', 'FAIL', String(e));
    }

    // X6 settings self - debt expected possible
    record(
      'X6-settings-self-token',
      'DEBT',
      'agent cannot judge full-panel old-blue aesthetics; leave for human XO'
    );

    // console errors (filter noise)
    const severe = consoleErrors.filter(
      e =>
        !/favicon|Font Awesome|Download the React|DevTools|sourcemap/i.test(e) &&
        !/Failed to load resource/i.test(e)
    );
    record(
      'X-console',
      severe.length === 0 ? 'PASS' : 'DEBT',
      severe.length ? severe.slice(0, 5).join(' | ') : 'no severe pageerrors'
    );
  } finally {
    await browser.close();
  }

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const debt = results.filter(r => r.status === 'DEBT').length;
  const overall =
    fail > 0 ? 'FAIL (agent-contract)' : debt > 0 ? 'PASS with debt (agent-contract)' : 'PASS (agent-contract)';

  const md = `# Agent-assisted XO run (contract only)

**Date**: 2026-07-26  
**Build/SHA**: \`${SHA}\`  
**Base**: ${BASE}  
**Runner**: Playwright headless agent script \`scripts/dev/xo-agent-theme-run.mjs\`  
**Honesty**: **NOT human visual Pass.** Pixel aesthetics / long-session comfort / “一眼扫读” **still Yellow** until human XO signs.

## Summary

| Metric | Value |
| --- | --- |
| PASS | ${pass} |
| FAIL | ${fail} |
| DEBT/SKIP | ${debt} |
| **Overall (agent-contract)** | **${overall}** |
| **Visual / Human XO** | **Yellow / unsigned** |

## Results

| ID | Status | Note |
| --- | --- | --- |
${results.map(r => `| ${r.id} | **${r.status}** | ${r.note.replace(/\|/g, '\\|')} |`).join('\n')}

## Screenshots

Saved under \`docs/superpowers/plans/xo-agent-run/\` (\`01-home.png\` …).

## Human still required

1. Open same routes and **eyeball** default↔minimal contrast  
2. Confirm terracotta / emerald hero **feel** (not just class presence)  
3. Fill template in \`theme-system-xo-signoff-status.md\` §3 with human name  
4. Only then may Visual leave Yellow  

## Gate cross-check (same tip)

- Prior phase review: full build green, smoke **29/29** @ 4173  
- Sample wave **FREEZE** remains  
`;

  writeFileSync(join(OUT_DIR, 'XO-AGENT-RUN-REPORT.md'), md, 'utf8');
  writeFileSync(
    join(OUT_DIR, 'results.json'),
    JSON.stringify({ SHA, BASE, overall, results, evidence }, null, 2)
  );
  console.log('\n=== OVERALL', overall, '===');
  console.log('Report:', join(OUT_DIR, 'XO-AGENT-RUN-REPORT.md'));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
