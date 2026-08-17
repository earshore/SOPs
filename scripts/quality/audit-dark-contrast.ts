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
  // SOPs 子页面
  { label: 'S-NPI', path: '/#/sops/growth/npi-tracker', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-ListingSEO', path: '/#/sops/growth/listing-seo', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-PPC', path: '/#/sops/growth/ppc-advertising', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Restricted', path: '/#/sops/growth/restricted-words', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Promo', path: '/#/sops/growth/promotion-submission', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Competitor', path: '/#/sops/growth/competitor-monitoring', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-FBA', path: '/#/sops/backend/fba-shipping', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Procurement', path: '/#/sops/backend/procurement-qc', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Inventory', path: '/#/sops/backend/inventory-replenishment', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-AccountSec', path: '/#/sops/safety/account-security', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Permission', path: '/#/sops/safety/permission-management', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Brand', path: '/#/sops/safety/brand-infringement', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-PerfNotif', path: '/#/sops/safety/performance-notification', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Compliance', path: '/#/sops/safety/product-compliance', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-GPSR', path: '/#/sops/safety/eu-gpsr-compliance', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-Email', path: '/#/sops/service/email-templates', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-NegReview', path: '/#/sops/service/negative-review', ready: '#panel-sops:not(.hidden)' },
  { label: 'S-QA', path: '/#/sops/service/qa-maintenance', ready: '#panel-sops:not(.hidden)' },
  // AMZ Hub 子页面
  { label: 'H-EU', path: '/#/amz-hub/knowledge/eu-insights', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-SEO', path: '/#/amz-hub/knowledge/seo-strategy', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-Eco', path: '/#/amz-hub/knowledge/ecosystem', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-QL', path: '/#/amz-hub/practice/quality-listing', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-Calendar', path: '/#/amz-hub/practice/marketing-calendar', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-PromoAct', path: '/#/amz-hub/practice/promo-activities', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-PromoTools', path: '/#/amz-hub/practice/promo-tools', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-New30D', path: '/#/amz-hub/advanced/new-product-30days', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-Conversion', path: '/#/amz-hub/advanced/conversion-optimization', ready: '#panel-amz_hub:not(.hidden)' },
  { label: 'H-Mature', path: '/#/amz-hub/advanced/mature-phase', ready: '#panel-amz_hub:not(.hidden)' },
] as const;

const onlyRoute = process.argv.find(a => a.startsWith('--route='))?.slice(8);

// 注入 4 种类型的 toast（模拟 showToast 产物，无动画便于稳定审计）
const TOAST_SOURCE = `
(() => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  container.innerHTML = '';
  const types = [
    ['success', 'fa-circle-check'],
    ['error', 'fa-circle-xmark'],
    ['info', 'fa-circle-info'],
    ['warning', 'fa-triangle-exclamation'],
  ];
  for (const [type, icon] of types) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const iconEl = document.createElement('i');
    iconEl.className = 'fa-solid ' + icon;
    toast.appendChild(iconEl);
    const content = document.createElement('div');
    content.className = 'toast-content';
    const titleEl = document.createElement('strong');
    titleEl.textContent = type + ' 通知示例标题';
    content.appendChild(titleEl);
    const descEl = document.createElement('div');
    descEl.className = 'toast-desc';
    descEl.textContent = '这是一条 ' + type + ' 类型的描述文字，用于对比度审计。';
    content.appendChild(descEl);
    toast.appendChild(content);
    container.appendChild(toast);
  }
})()
`;

// 页面内审计逻辑，纯 JS 字符串（避免 tsx 转译注入 __name helper / TS 语法）
const AUDIT_SOURCE = `
(() => {
  const parseColor = (v) => {
    if (!v || v === 'transparent') return null;
    let p = null;
    let m = v.match(/rgba?\\\(([^)]+)\\\)/);
    if (m) {
      p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);
    } else {
      // Chromium 对 color-mix 的 computed 值为 color(srgb r g b / a) 或百分数
      m = v.match(/color\\\(srgb\\s+([^)]+)\\\)/);
      if (m) {
        p = m[1].split(/[\\s/]+/).filter(Boolean).map(x =>
          x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)
        );
      }
    }
    if (!p || p.length < 3 || p.some(Number.isNaN)) return null;
    const isUnit = v.startsWith('color(');
    const to255 = (x) => (isUnit ? x * 255 : x);
    return { r: to255(p[0]), g: to255(p[1]), b: to255(p[2]), a: p.length > 3 ? p[3] : 1 };
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
  // var() 渐变（如 --sidebar-primary）先借元素计算样式解析为实际颜色
  const gradientAvg = (img, el) => {
    if (img.includes('var(')) {
      img = img.replace(/var\(--([a-z0-9-]+)(?:\s*,\s*([^)]*))?\)/g, (_, name, fallback) => {
        const resolved = el ? getComputedStyle(el).getPropertyValue('--' + name).trim() : '';
        return resolved && !resolved.startsWith('var(') ? resolved : (fallback || '').trim();
      });
    }
    const stops = [];
    const re = /rgba?\\([^)]*\\)|#[0-9a-fA-F]{3,8}|color\\(srgb [^)]*\\)/g;
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
        const g = gradientAvg(bgImg, node);
        if (g && g.a > 0) {
          // 渐变层在其 background-color 之上，优先用渐变近似色
          bg = g;
        }
      }
      if (bg) {
        // 遍历从内层 el 向上，父层在视觉下层：acc(已处理内层) 在上，bg(父层) 在下
        acc = {
          r: acc.r + bg.r * bg.a * (1 - acc.a),
          g: acc.g + bg.g * bg.a * (1 - acc.a),
          b: acc.b + bg.b * bg.a * (1 - acc.a),
          a: acc.a + bg.a * (1 - acc.a),
        };
        if (acc.a > 0.99) break;
      }
      node = node.parentElement;
    }
    if (acc.a < 0.99) {
      // 链上出现过渐变但解析失败（var() 未就绪等）：真实底色存在但不可知，
      // 不应退化为画布色猜测（会误报白字白底），改为跳过该元素
      if (gradient) return { bg: null, gradient };
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
  // 只审计当前可见面板（SPA 中其它面板以 .hidden 留在 DOM）
  const hiddenPanels = Array.from(
    document.querySelectorAll(
      '#panel-home.hidden, #panel-sops.hidden, #panel-app_center.hidden, #panel-amz_hub.hidden, #panel-more.hidden'
    )
  );
  const all = document.querySelectorAll('body *');
  for (const el of Array.from(all)) {
    if (typeof el.className === 'string' && el.className.includes('sop-step-number')) {
      const __bg = getComputedStyle(el).backgroundColor;
      window.__stepCapture = window.__stepCapture || [];
      window.__stepCapture.push({ text: (el.textContent||'').trim(), bg: __bg, t: Math.round(performance.now()) });
    }
    if (hiddenPanels.some(p => p.contains(el))) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const opacity = parseFloat(cs.opacity);
    if (opacity < 0.3) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const hasText = Array.from(el.childNodes).some(
      n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
    );
    // 图形图标（font-icon）无文本节点：按非文本 3:1 阈值审计
    const isIcon =
      !hasText &&
      el.tagName.toLowerCase() === 'i' &&
      typeof el.className === 'string' &&
      /fa-|icon/i.test(el.className);
    if (!hasText && !isIcon) continue;
    const fg = parseColor(cs.color);
    if (!fg) continue;
    // 误报排除：渐变文字（background-clip: text）、视觉隐藏（sr-only/clip）、描边字
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;
    // [CONTRAST] 低 alpha 文字（12% accent-soft 等）不可读但对不透明色对比虚高 → 跳过（按不可见处理）
    if (fg.a < 0.35) continue;
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
    const threshold = isIcon ? 3 : isLarge ? 3 : 4.5;
    stats.checked += 1;
    if (r < threshold) {
      const id = el.id ? '#' + el.id : '';
      const cls =
        typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
          : '';
      defects.push({
        icon: isIcon || undefined,
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
  return { defects, checked: stats.checked, skipped: stats.skippedTransparent, stepCapture: window.__stepCapture || [] };
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
    console.log(`\n========== MODE: ${mode} ==========`);
    for (const route of CORE_ROUTES) {
      if (onlyRoute && !route.path.includes(onlyRoute)) continue;
      // 每个路由用全新页面：SPA 连续路由切换会残留前序路由的主题变量
      // （如 --color-blue-500 被覆写/移除 → color-mix 失效 → 背景变透明 → 审计误报）
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      await page.addInitScript(modeValue => {
        window.localStorage.setItem('app-color-mode', JSON.stringify(modeValue));
      }, mode);
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(route.ready, { timeout: 20000 });
        // 固定等待：模块 CSS/JS 为懒加载 chunk，DOM 可能静态无变化，
        // 仅靠元素计数轮询会提前退出 → 审计跑在样式就绪前产生误报
        await page.waitForTimeout(4000);
        // 再等 Alpine/动态渲染稳定（元素计数连续两次一致）
        const panelSel = [
          '#panel-sops:not(.hidden)',
          '#panel-amz_hub:not(.hidden)',
          '#panel-app_center:not(.hidden)',
          '#panel-more:not(.hidden)',
          '#panel-home:not(.hidden)',
        ].join(', ');
        for (let i = 0; i < 16; i++) {
          const before = await page.evaluate((sel) => {
            const root = document.querySelector(sel) ?? document.body;
            return root.querySelectorAll('*').length + document.styleSheets.length * 1000000;
          }, panelSel);
          await page.waitForTimeout(350);
          const after = await page.evaluate((sel) => {
            const root = document.querySelector(sel) ?? document.body;
            return root.querySelectorAll('*').length + document.styleSheets.length * 1000000;
          }, panelSel);
          if (before === after) break;
        }
        // 展开所有 <details> 折叠区：关闭状态下内容 display:none，不展开永远审计不到
        await page.evaluate(() => {
          document.querySelectorAll('details').forEach((d) => {
            (d as HTMLDetailsElement).open = true;
          });
        });
        await page.waitForTimeout(600);
        await page.evaluate(TOAST_SOURCE);
        await page.waitForTimeout(600);
        // 双跑复验：间隔 800ms 跑两遍，只保留两次一致的缺陷——
        // 过滤过渡/动画中间态（背景 alpha 0）导致的瞬态误报
        const first = await page.evaluate(AUDIT_SOURCE);
        await page.waitForTimeout(800);
        const result = await page.evaluate(AUDIT_SOURCE);
        const stable = new Set(result.defects.map((d) => `${d.sel}|${d.text}|${d.color}|${d.bg}`));
        result.defects = result.defects.filter(
          (d) => stable.has(`${d.sel}|${d.text}|${d.color}|${d.bg}`)
        );
        // 用 CDP 获取每个缺陷元素的 color 规则来源
        const doc = await cdp.send('DOM.getDocument');
        for (const d of result.defects) {
          try {
            const q = await cdp.send('DOM.querySelector', {
              nodeId: doc.root.nodeId,
              selector: `${d.tag}${d.sel.includes('.') || d.sel.includes('#') ? d.sel.slice(d.sel.indexOf('.') >= 0 ? d.sel.indexOf('.') : d.sel.indexOf('#')) : ''}`,
            });
            if (!q.nodeId) continue;
            const matched = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: q.nodeId });
            const sources: string[] = [];
            for (const entry of matched.matchedCSSRules ?? []) {
              const style = entry.rule?.style;
              const colorProp = style?.cssProperties?.find(p => p.name === 'color');
              if (!colorProp) continue;
              const sheetId = entry.rule.styleSheetId ?? style.styleSheetId;
              if (!sheetId) continue;
              try {
                const header = await cdp.send('CSS.getStyleSheetHeader', {
                  styleSheetId: sheetId,
                });
                const line = style.range ? style.range.startLine + 1 : '?';
                // 只保留文件规则（跳过注入/内联）
                if (header.sourceURL && !header.sourceURL.includes('data:')) {
                  const selText =
                    entry.rule.selectorList?.text ?? entry.rule.selectorText ?? '?';
                  sources.push(`${header.sourceURL}:${line} :: ${selText}`);
                }
              } catch {
                /* 忽略 */
              }
            }
            if (sources.length) d.cssRules = [...new Set(sources)];
          } catch {
            /* CDP 个别节点失败忽略 */
          }
        }
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
      } finally {
        await page.close();
      }
    }
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