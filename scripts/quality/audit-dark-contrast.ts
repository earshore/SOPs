/**
 * 深色模式可读性审计：遍历核心路由，计算每个可见文本元素的前景/背景
 * WCAG 对比度，输出低于阈值（小文本 4.5、大文本 3.0）的缺陷。
 *
 * 用法：
 *   npx tsx scripts/quality/audit-dark-contrast.ts [--route=/xxx]
 *   BASE_URL=http://127.0.0.1:5173 npx tsx scripts/quality/audit-dark-contrast.ts
 * 输出：[dark, light] 两个模式的结果写入 audit-dark-contrast-report.json
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 5198;
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

const CORE_ROUTES = [
  { label: 'Home', path: '/#/home', ready: '#panel-home:not(.hidden)' },
  { label: 'SOPs', path: '/#/sops', ready: '#panel-sops:not(.hidden) .sops-overview' },
  { label: 'App Center', path: '/#/app-center', ready: '#panel-app_center:not(.hidden) .app-overview-container' },
  { label: 'Scraper', path: '/#/app-center/master-analysis/scraper', ready: '[x-data="scraperPanel"]' },
  { label: 'AI Analysis', path: '/#/app-center/master-analysis/ai-analysis', ready: '.ai-analysis-wrapper' },
  { label: 'Promptlab', path: '/#/app-center/master-analysis/promptlab', ready: '[x-data="promptlabPanel"]' },
  { label: 'Deep Chat', path: '/#/app-center/playground/deep-chat', ready: '#deep-chat-view' },
  { label: 'KH Input', path: '/#/app-center/keyword-hunter/input', ready: '#keyword-hunter-module-input' },
  { label: 'PPC Terms', path: '/#/app-center/ppc-tools/ppc-search-terms', ready: '.ppc-search-terms-app' },
  { label: 'AMZ Hub', path: '/#/amz-hub', ready: '.amz-hub-overview' },
  { label: 'More', path: '/#/more', ready: '.more-overview' },
  { label: 'Skills', path: '/#/more/explore/skills', ready: '.skills-page' },
] as const;

const onlyRoute = process.argv.find(a => a.startsWith('--route='))?.slice(8);

// 页面内审计逻辑，纯 JS 字符串（避免 tsx 转译注入 __name helper / TS 语法）
const AUDIT_SOURCE = `
(() => {
  const parseColor = (v) => {
    const m = v.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const luminance = (c) => {
    const lin = (x) => {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (fg, bg) => {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const hi = l1 >= l2 ? l1 : l2;
    const lo = l1 >= l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  };
  const fmt = (c) =>
    'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + c.a.toFixed(2) + ')';

  // 解析背景图（linear/radial-gradient）的端点颜色，取平均作为近似底色
  const gradientAvg = (img) => {
    const stops = [];
    const re = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/g;
    let m;
    while ((m = re.exec(img)) !== null) {
      const c = parseColor(m[0]);
      if (c) stops.push(c);
    }
    if (!stops.length) return null;
    const avg = stops.reduce(
      (acc, c) => ({
        r: acc.r + c.r * c.a,
        g: acc.g + c.g * c.a,
        b: acc.b + c.b * c.a,
        a: acc.a + c.a,
      }),
      { r: 0, g: 0, b: 0, a: 0 }
    );
    if (avg.a === 0) return null;
    return { r: avg.r / avg.a, g: avg.g / avg.a, b: avg.b / avg.a, a: Math.min(avg.a / stops.length, 1) };
  };

  // 从元素向上合成有效背景色（alpha 混合）；渐变层用端点平均色近似
  const resolveBg = (el) => {
    let acc = { r: 0, g: 0, b: 0, a: 0 };
    let gradient = false;
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const bgImg = cs.backgroundImage;
      let bg = parseColor(cs.backgroundColor);
      if (bgImg && bgImg !== 'none') {
        gradient = true;
        const g = gradientAvg(bgImg);
        if (g && g.a > 0) {
          // 渐变层在其 background-color 之上，优先用渐变近似色
          bg = g;
        }
      }
      if (bg) {
        acc = {
          r: bg.r * bg.a + acc.r * (1 - bg.a),
          g: bg.g * bg.a + acc.g * (1 - bg.a),
          b: bg.b * bg.a + acc.b * (1 - bg.a),
          a: bg.a + acc.a * (1 - bg.a),
        };
        if (acc.a > 0.99) break;
      }
      node = node.parentElement;
    }
    if (acc.a < 0.99) {
      const doc = parseColor(getComputedStyle(document.documentElement).backgroundColor);
      const body = parseColor(getComputedStyle(document.body).backgroundColor);
      const canvas = doc && doc.a > 0 ? doc : body && body.a > 0 ? body : null;
      if (!canvas) return { bg: null, gradient };
      acc = {
        r: canvas.r * canvas.a + acc.r * (1 - canvas.a),
        g: canvas.g * canvas.a + acc.g * (1 - canvas.a),
        b: canvas.b * canvas.a + acc.b * (1 - canvas.a),
        a: 1,
      };
    }
    return { bg: acc, gradient };
  };

  const defects = [];
  const stats = { checked: 0, skippedTransparent: 0 };
  const all = document.querySelectorAll('body *');
  for (const el of Array.from(all)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const opacity = parseFloat(cs.opacity);
    if (opacity < 0.3) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const hasText = Array.from(el.childNodes).some(
      n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
    );
    if (!hasText) continue;
    const fg = parseColor(cs.color);
    if (!fg) continue;
    // 误报排除：渐变文字（background-clip: text）、视觉隐藏（sr-only/clip）、描边字
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;
    if (fg.a === 0) continue;
    if (el.classList.contains('sr-only') || el.closest('.sr-only')) continue;
    if (cs.position === 'absolute' && cs.clipPath !== 'none') continue;
    const { bg, gradient } = resolveBg(el);
    if (!bg) {
      stats.skippedTransparent += 1;
      continue;
    }
    const fontSize = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const r = ratio(fg, bg);
    const threshold = isLarge ? 3 : 4.5;
    stats.checked += 1;
    if (r < threshold) {
      const id = el.id ? '#' + el.id : '';
      const cls =
        typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
          : '';
      defects.push({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
        text: (el.textContent || '').trim().slice(0, 48),
        color: fmt(fg),
        bg: fmt(bg),
        ratio: Number(r.toFixed(2)),
        threshold,
        large: isLarge,
        fontSize,
        weight,
        opacity: Number(opacity.toFixed(2)),
        gradient,
        sel: el.tagName.toLowerCase() + id + cls,
      });
    }
  }
  return { defects, checked: stats.checked, skipped: stats.skippedTransparent };
})()
`;

async function launchDev(): Promise<ChildProcess> {
  const child = spawn(
    `npm run dev:simple -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    {
      shell: true,
      stdio: ['ignore', 'ignore', 'inherit'],
    }
  );
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return child;
    } catch {
      /* not ready */
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

async function main() {
  let server: ChildProcess | null = null;
  if (!process.env.BASE_URL) server = await launchDev();
  const browser = await chromium.launch();
  const report: Record<string, unknown> = {};
  let total = 0;

  for (const mode of ['dark', 'light'] as const) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(modeValue => {
      window.localStorage.setItem('app-color-mode', JSON.stringify(modeValue));
    }, mode);
    console.log(`\n========== MODE: ${mode} ==========`);
    for (const route of CORE_ROUTES) {
      if (onlyRoute && !route.path.includes(onlyRoute)) continue;
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(route.ready, { timeout: 20000 });
        await page.waitForTimeout(800);
        const result = await page.evaluate(AUDIT_SOURCE);
        report[`${mode}:${route.label}`] = result;
        total += result.defects.length;
        console.log(`[${route.label}] checked=${result.checked} defects=${result.defects.length}`);
        for (const d of result.defects) {
          console.log(
            `   ${d.ratio} < ${d.threshold} ${d.sel} "${d.text}" ${d.color} on ${d.bg}${d.gradient ? ' [gradient-layer]' : ''}`
          );
        }
      } catch (e) {
        report[`${mode}:${route.label}`] = { error: String(e).slice(0, 200) };
        console.log(`[${route.label}] ERROR ${String(e).slice(0, 200)}`);
      }
    }
    await page.close();
  }

  writeFileSync('audit-dark-contrast-report.json', JSON.stringify(report, null, 2));
  console.log(`\nTOTAL DEFECTS: ${total}`);
  await browser.close();
  server?.kill();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});