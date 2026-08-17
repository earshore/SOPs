/**
 * 深色模式深度审计（第二轮）：
 * 覆盖首轮未触达的表面——More 模块 9 个子页、系统设置面板、AppModal、
 * 交互状态（hover / placeholder / disabled / 滚动条非文本对比 3:1）。
 *
 * 用法：BASE_URL=http://127.0.0.1:5198 npx tsx scripts/quality/audit-dark-depth.ts
 * 输出 audit-dark-depth-report.json
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 5198;
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

const MORE_ROUTES = [
  { label: 'M-Agents', path: '/#/more/explore/agents', ready: '#panel-more:not(.hidden)' },
  { label: 'M-Prompts', path: '/#/more/explore/prompts', ready: '#panel-more:not(.hidden)' },
  { label: 'M-Workflows', path: '/#/more/explore/workflows', ready: '#panel-more:not(.hidden)' },
  {
    label: 'M-UsageNotice',
    path: '/#/more/business-scenarios/usage-notice',
    ready: '#panel-more:not(.hidden)',
  },
  {
    label: 'M-AdAcos',
    path: '/#/more/business-scenarios/ad-acos-diagnosis',
    ready: '#panel-more:not(.hidden)',
  },
  {
    label: 'M-DailyReport',
    path: '/#/more/business-scenarios/amazon-daily-report',
    ready: '#panel-more:not(.hidden)',
  },
  {
    label: 'M-BadReview',
    path: '/#/more/business-scenarios/bad-review-response',
    ready: '#panel-more:not(.hidden)',
  },
  {
    label: 'M-ReviewMonitor',
    path: '/#/more/business-scenarios/review-monitor',
    ready: '#panel-more:not(.hidden)',
  },
] as const;

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

// 单元素快速对比（用于 hover 态），返回缺陷或 null
const ELEM_CHECK_SOURCE = `
(() => {
  const selIdx = window.__SCOPE_SEL__ ?? 0;
  const parseColor = (v) => {
    if (!v || v === 'transparent') return null;
    let p = null;
    let m = v.match(/rgba?\\(([^)]+)\\)/);
    if (m) {
      p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);
    } else {
      m = v.match(/color\\(srgb\\s+([^)]+)\\)/);
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
    const l1 = luminance(fg); const l2 = luminance(bg);
    const hi = l1 >= l2 ? l1 : l2; const lo = l1 >= l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  };
  const gradAvg = (img) => {
    const stops = []; const re = /rgba?\\([^)]*\\)|#[0-9a-fA-F]{3,8}|color(srgb [^)]*)/g; let m;
    while ((m = re.exec(img)) !== null) { const c = parseColor(m[0]); if (c) stops.push(c); }
    if (!stops.length) return null;
    const avg = stops.reduce((acc, c) => ({ r: acc.r + c.r * c.a, g: acc.g + c.g * c.a, b: acc.b + c.b * c.a, a: acc.a + c.a }), { r: 0, g: 0, b: 0, a: 0 });
    if (avg.a === 0) return null;
    return { r: avg.r / avg.a, g: avg.g / avg.a, b: avg.b / avg.a, a: Math.min(avg.a / stops.length, 1) };
  };
  const resolveBg = (el) => {
    let acc = { r: 0, g: 0, b: 0, a: 0 }; let gradient = false; let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      let bg = parseColor(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        gradient = true;
        const g = gradAvg(cs.backgroundImage);
        if (g && g.a > 0) bg = g;
      }
      if (bg) {
        acc = { r: bg.r * bg.a + acc.r * (1 - bg.a), g: bg.g * bg.a + acc.g * (1 - bg.a), b: bg.b * bg.a + acc.b * (1 - bg.a), a: bg.a + acc.a * (1 - bg.a) };
        if (acc.a > 0.99) break;
      }
      node = node.parentElement;
    }
    if (acc.a < 0.99) {
      const doc = parseColor(getComputedStyle(document.documentElement).backgroundColor);
      const body = parseColor(getComputedStyle(document.body).backgroundColor);
      const canvas = doc && doc.a > 0 ? doc : body && body.a > 0 ? body : null;
      if (!canvas) return { bg: null, gradient };
      acc = { r: canvas.r * canvas.a + acc.r * (1 - canvas.a), g: canvas.g * canvas.a + acc.g * (1 - canvas.a), b: canvas.b * canvas.a + acc.b * (1 - canvas.a), a: 1 };
    }
    return { bg: acc, gradient };
  };
  const els = window.__hoverCandidates__ || [];
  const el = els[selIdx];
  if (!el || !el.isConnected) return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none') return null;
  const hasText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0);
  const fg = parseColor(cs.color);
  if (!fg || fg.a === 0 || !hasText && !el.querySelector('*')) return null;
  if (cs.webkitBackgroundClip === 'text') return null;
  const { bg, gradient } = resolveBg(el);
  if (!bg) return null;
  const fontSize = parseFloat(cs.fontSize) || 16;
  const weight = parseInt(cs.fontWeight, 10) || 400;
  const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
  const r = ratio(fg, bg);
  const threshold = isLarge ? 3 : 4.5;
  if (r >= threshold) return null;
  return {
    sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''),
    text: (el.textContent || '').trim().slice(0, 36),
    color: 'rgba(' + Math.round(fg.r) + ',' + Math.round(fg.g) + ',' + Math.round(fg.b) + ')',
    bg: 'rgba(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')',
    ratio: Number(r.toFixed(2)),
    threshold,
  };
})()
`;

// 控件/伪元素/滚动条检查（placeholder / disabled / scrollbar / focus ring 存在性）
const CONTROL_SOURCE = `
(() => {
  const parseColor = (v) => {
    if (!v || v === 'transparent') return null;
    let p = null;
    let m = v.match(/rgba?\\(([^)]+)\\)/);
    if (m) { p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number); }
    else {
      m = v.match(/color\\(srgb\\s+([^)]+)\\)/);
      if (m) { p = m[1].split(/[\\s/]+/).filter(Boolean).map(x => x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)); }
    }
    if (!p || p.length < 3 || p.some(Number.isNaN)) return null;
    const isUnit = v.startsWith('color(');
    const t = (x) => (isUnit ? x * 255 : x);
    return { r: t(p[0]), g: t(p[1]), b: t(p[2]), a: p.length > 3 ? p[3] : 1 };
  };
  const luminance = (c) => {
    const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (fg, bg) => {
    const l1 = luminance(fg); const l2 = luminance(bg);
    const hi = l1 >= l2 ? l1 : l2; const lo = l1 >= l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  };
  const fmt = (c) => 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')';
  // 合成到最近不透明祖先（半透明背景如 rgba(255,255,255,0.04) 需按 alpha 混合）
  const resolveSolid = (el) => {
    let acc = { r: 0, g: 0, b: 0, a: 0 };
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // 渐变跳过
      const bg = parseColor(cs.backgroundColor);
      if (bg) {
        acc = { r: bg.r * bg.a + acc.r * (1 - bg.a), g: bg.g * bg.a + acc.g * (1 - bg.a), b: bg.b * bg.a + acc.b * (1 - bg.a), a: bg.a + acc.a * (1 - bg.a) };
        if (acc.a > 0.98) break;
      }
      node = node.parentElement;
    }
    if (acc.a < 0.98) {
      const canvas = parseColor(getComputedStyle(document.body).backgroundColor);
      if (!canvas) return null;
      acc = { r: canvas.r * canvas.a + acc.r * (1 - canvas.a), g: canvas.g * canvas.a + acc.g * (1 - canvas.a), b: canvas.b * canvas.a + acc.b * (1 - canvas.a), a: 1 };
    }
    return { r: acc.r, g: acc.g, b: acc.b };
  };
  const defects = [];
  const hiddenPanels = Array.from(document.querySelectorAll('#panel-home.hidden, #panel-sops.hidden, #panel-app_center.hidden, #panel-amz_hub.hidden, #panel-more.hidden'));
  const visible = (el) => {
    if (hiddenPanels.some(p => p.contains(el))) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= 1 && rect.height >= 1;
  };
  // 1) placeholder
  for (const el of Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'))) {
    if (!visible(el)) continue;
    const pColor = getComputedStyle(el, '::placeholder').color;
    const fg = parseColor(pColor);
    if (!fg || fg.a === 0) continue;
    const bgP = resolveSolid(el);
    if (!bgP) continue;
    const r = ratio(fg, bgP);
    if (r < 4.5) {
      defects.push({ kind: 'placeholder', sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''), text: (el.getAttribute('placeholder') || '').slice(0, 30), color: fmt(fg), bg: fmt(bgP), ratio: Number(r.toFixed(2)) });
    }
  }
  // 2) disabled 控件
  for (const el of Array.from(document.querySelectorAll('button:disabled, input:disabled, select:disabled, textarea:disabled, [aria-disabled="true"]'))) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg || fg.a === 0) continue;
    if (cs.webkitBackgroundClip === 'text') continue;
    const bgP = resolveSolid(el);
    if (!bgP) continue;
    const r = ratio(fg, bgP);
    if (r < 3) {
      defects.push({ kind: 'disabled', sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''), text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 24), color: fmt(fg), bg: fmt(bgP), ratio: Number(r.toFixed(2)) });
    }
  }
  // 3) 滚动条（thumb vs track，非文本 3:1）
  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (!visible(el)) continue;
    const overflow = getComputedStyle(el).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    let thumb = null; let track = null;
    try {
      const cs = getComputedStyle(el);
      thumb = parseColor(getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor);
      track = parseColor(getComputedStyle(el, '::-webkit-scrollbar-track').backgroundColor);
    } catch { /* older engines */ }
    if (thumb && thumb.a > 0.05 && track && track.a > 0.05) {
      const r = ratio(thumb, track);
      if (r < 3) {
        defects.push({ kind: 'scrollbar', sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''), text: '', color: fmt(thumb), bg: fmt(track), ratio: Number(r.toFixed(2)) });
      }
    }
    if (defects.filter(d => d.kind === 'scrollbar').length > 12) break;
  }
  return defects;
})()
`;

// 打开并审计系统设置面板
const OPEN_SETTINGS_SOURCE = `
(() => {
  const w = window;
  if (typeof w.openSettings === 'function') { w.openSettings(); return true; }
  const btn = document.querySelector('[data-action="openSettings"], .settings-gear-btn');
  if (btn) { (btn).click(); return true; }
  return false;
})()
`;

// 审计作用域内元素（scope 参数化版 AUDIT_SOURCE，复用核心逻辑）
const SCOPED_AUDIT_SOURCE = `
(() => {
  const scopeSel = window.__SCOPE_SEL__ ?? null;
  const parseColor = (v) => {
    if (!v || v === 'transparent') return null;
    let p = null;
    let m = v.match(/rgba?\\(([^)]+)\\)/);
    if (m) { p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number); }
    else {
      m = v.match(/color\\(srgb\\s+([^)]+)\\)/);
      if (m) { p = m[1].split(/[\\s/]+/).filter(Boolean).map(x => x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)); }
    }
    if (!p || p.length < 3 || p.some(Number.isNaN)) return null;
    const isUnit = v.startsWith('color(');
    const t = (x) => (isUnit ? x * 255 : x);
    return { r: t(p[0]), g: t(p[1]), b: t(p[2]), a: p.length > 3 ? p[3] : 1 };
  };
  const luminance = (c) => {
    const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (fg, bg) => {
    const l1 = luminance(fg); const l2 = luminance(bg);
    const hi = l1 >= l2 ? l1 : l2; const lo = l1 >= l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  };
  const fmt = (c) => 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + c.a.toFixed(2) + ')';
  const gradAvg = (img) => {
    const stops = []; const re = /rgba?\\([^)]*\\)|#[0-9a-fA-F]{3,8}|color(srgb [^)]*)/g; let m;
    while ((m = re.exec(img)) !== null) { const c = parseColor(m[0]); if (c) stops.push(c); }
    if (!stops.length) return null;
    const avg = stops.reduce((acc, c) => ({ r: acc.r + c.r * c.a, g: acc.g + c.g * c.a, b: acc.b + c.b * c.a, a: acc.a + c.a }), { r: 0, g: 0, b: 0, a: 0 });
    if (avg.a === 0) return null;
    return { r: avg.r / avg.a, g: avg.g / avg.a, b: avg.b / avg.a, a: Math.min(avg.a / stops.length, 1) };
  };
  const resolveBg = (el) => {
    let acc = { r: 0, g: 0, b: 0, a: 0 }; let gradient = false; let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      let bg = parseColor(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        gradient = true;
        const g = gradAvg(cs.backgroundImage);
        if (g && g.a > 0) bg = g;
      }
      if (bg) {
        acc = { r: bg.r * bg.a + acc.r * (1 - bg.a), g: bg.g * bg.a + acc.g * (1 - bg.a), b: bg.b * bg.a + acc.b * (1 - bg.a), a: bg.a + acc.a * (1 - bg.a) };
        if (acc.a > 0.99) break;
      }
      node = node.parentElement;
    }
    if (acc.a < 0.99) {
      const doc = parseColor(getComputedStyle(document.documentElement).backgroundColor);
      const body = parseColor(getComputedStyle(document.body).backgroundColor);
      const canvas = doc && doc.a > 0 ? doc : body && body.a > 0 ? body : null;
      if (!canvas) return { bg: null, gradient };
      acc = { r: canvas.r * canvas.a + acc.r * (1 - canvas.a), g: canvas.g * canvas.a + acc.g * (1 - canvas.a), b: canvas.b * canvas.a + acc.b * (1 - canvas.a), a: 1 };
    }
    return { bg: acc, gradient };
  };
  const scope = scopeSel ? document.querySelector(scopeSel) : document;
  if (!scope) return { defects: [], checked: 0, skippedTransparent: 0 };
  const all = [];
  const collectShallow = (root) => {
    if (root.shadowRoot) collectShallow(root.shadowRoot);
    root.querySelectorAll('*').forEach(el => {
      all.push(el);
      if (el.shadowRoot) collectShallow(el.shadowRoot);
    });
  };
  collectShallow(scope);
  const defects = []; let checked = 0; let skipped = 0;
  for (const el of Array.from(all)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const opacity = parseFloat(cs.opacity);
    if (opacity < 0.3) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0);
    if (!hasText) continue;
    const fg = parseColor(cs.color);
    if (!fg || fg.a === 0) continue;
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;
    const { bg, gradient } = resolveBg(el);
    if (!bg) { skipped += 1; continue; }
    const fontSize = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const r = ratio(fg, bg);
    const threshold = isLarge ? 3 : 4.5;
    checked += 1;
    if (r < threshold) {
      const id = el.id ? '#' + el.id : '';
      const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
      defects.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 40),
        color: fmt(fg),
        bg: fmt(bg),
        ratio: Number(r.toFixed(2)),
        threshold,
        gradient,
        sel: el.tagName.toLowerCase() + id + cls,
      });
    }
  }
  return { defects, checked, skippedTransparent: skipped };
})()
`;

async function launchDev(): Promise<ChildProcess> {
  const child = spawn(`npm run dev:simple -- --host 127.0.0.1 --port ${PORT} --strictPort`, {
    shell: true,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
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

  const mode = 'dark';
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(modeValue => {
    window.localStorage.setItem('app-color-mode', JSON.stringify(modeValue));
  }, mode);
  console.log(`\n========== DEPTH: ${mode} ==========`);

  const auditScoped = async (scopeSel: string | null, label: string): Promise<number> => {
    await page.evaluate(sel => {
      (window as any).__SCOPE_SEL__ = sel;
    }, scopeSel);
    const result = await page.evaluate(SCOPED_AUDIT_SOURCE);
    report[`${mode}:${label}`] = result;
    total += result.defects.length;
    console.log(`[${label}] checked=${result.checked} defects=${result.defects.length}`);
    for (const d of result.defects) {
      console.log(
        `   ${d.ratio} < ${d.threshold} ${d.sel} "${d.text}" ${d.color} on ${d.bg}${d.gradient ? ' [gradient-layer]' : ''}`
      );
    }
    return result.defects.length;
  };

  // A) More 子页 + toast
  for (const route of MORE_ROUTES) {
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(route.ready, { timeout: 20000 });
      await page.waitForTimeout(900);
      await page.evaluate(TOAST_SOURCE);
      await page.waitForTimeout(500);
      await auditScoped(null, route.label);
    } catch (e) {
      report[`${mode}:${route.label}`] = { error: String(e).slice(0, 200) };
      console.log(`[${route.label}] ERROR ${String(e).slice(0, 200)}`);
    }
  }

  // B) 系统设置面板
  try {
    await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#panel-home:not(.hidden)', { timeout: 20000 });
    await page.waitForTimeout(800);
    await page.evaluate(OPEN_SETTINGS_SOURCE);
    await page
      .waitForSelector('.settings-panel-root:not(.hidden)', { timeout: 15000 })
      .catch(() => null);
    await page.waitForTimeout(1200);
    await auditScoped('.settings-panel-root', 'Settings');
  } catch (e) {
    report[`${mode}:Settings`] = { error: String(e).slice(0, 200) };
    console.log(`[Settings] ERROR ${String(e).slice(0, 200)}`);
  }

  // C) AppModal 弹窗
  try {
    const modalState = await page.evaluate(() => {
      try {
        document.querySelector('app-modal')?.remove();
        const modal = document.createElement('app-modal');
        modal.setAttribute('title', '深度审计弹窗');
        modal.setAttribute('closable', 'true');
        modal.innerHTML =
          '<p>这是用于对比度审计的弹窗正文，检查深色模式下弹层文字与背景的可读性。</p>';
        document.body.appendChild(modal);
        (modal as any).open?.();
        const sr = (modal as any).shadowRoot;
        return {
          open: modal.hasAttribute('open'),
          srCount: sr ? sr.querySelectorAll('*').length : -1,
        };
      } catch (e) {
        return { err: String(e) };
      }
    });
    console.log('[Modal] state:', JSON.stringify(modalState));
    await page.waitForTimeout(1000);
    await auditScoped('app-modal', 'Modal');
  } catch (e) {
    report[`${mode}:Modal`] = { error: String(e).slice(0, 200) };
    console.log(`[Modal] ERROR ${String(e).slice(0, 200)}`);
  }

  // 关掉设置面板，避免影响后续 hover sweep
  try {
    await page.evaluate(() => {
      const panel = document.querySelector('.settings-panel-root');
      if (panel) (panel as HTMLElement).classList.add('hidden');
      document.querySelector('app-modal')?.remove();
    });
  } catch {
    /* ignore */
  }

  // D) hover 状态扫描（首页 + SOPs 总览 + App Center 总览，覆盖主要交互面）
  const hoverRoutes = [
    { label: 'Hover-Home', path: '/#/home', ready: '#panel-home:not(.hidden)' },
    { label: 'Hover-SOPs', path: '/#/sops', ready: '#panel-sops:not(.hidden) .sops-overview' },
    {
      label: 'Hover-AppCenter',
      path: '/#/app-center',
      ready: '#panel-app_center:not(.hidden) .app-overview-container',
    },
  ];
  for (const route of hoverRoutes) {
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(route.ready, { timeout: 20000 });
      await page.waitForTimeout(900);
      // 收集 hover 候选
      const candidates = await page.evaluate(() => {
        const hidden = Array.from(
          document.querySelectorAll(
            '#panel-home.hidden, #panel-sops.hidden, #panel-app_center.hidden, #panel-amz_hub.hidden, #panel-more.hidden'
          )
        );
        const els = Array.from(document.querySelectorAll('[class*="hover:"]')).filter(el => {
          if (hidden.some(p => p.contains(el))) return false;
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden';
        });
        (window as any).__hoverCandidates__ = els.slice(0, 14);
        return (window as any).__hoverCandidates__.length;
      });
      const hoverDefects: unknown[] = [];
      for (let i = 0; i < candidates; i++) {
        try {
          await page.evaluate(i => {
            const el = (window as any).__hoverCandidates__[i];
            el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          }, i);
          await page.waitForTimeout(120);
          await page.evaluate(i => {
            (window as any).__SCOPE_SEL__ = i;
          }, i);
          const d = await page.evaluate(ELEM_CHECK_SOURCE);
          if (d) hoverDefects.push(d);
        } catch {
          /* per-element */
        }
      }
      report[`${mode}:${route.label}`] = { checked: candidates, defects: hoverDefects };
      total += hoverDefects.length;
      console.log(`[${route.label}] hover-candidates=${candidates} defects=${hoverDefects.length}`);
      for (const d of hoverDefects) {
        console.log(
          `   HOVER ${(d as any).ratio} < ${(d as any).threshold} ${(d as any).sel} "${(d as any).text}" ${(d as any).color} on ${(d as any).bg}`
        );
      }
    } catch (e) {
      report[`${mode}:${route.label}`] = { error: String(e).slice(0, 200) };
      console.log(`[${route.label}] ERROR ${String(e).slice(0, 200)}`);
    }
  }

  // E) 控件检查（placeholder / disabled / scrollbar）复用首轮 40 路由清单的一部分（全跑太慢，取代表性路由）
  const controlRoutes = [
    { label: 'Ctrl-Home', path: '/#/home', ready: '#panel-home:not(.hidden)' },
    { label: 'Ctrl-Settings', path: '/#/home', ready: '#panel-home:not(.hidden)', settings: true },
    {
      label: 'Ctrl-Scraper',
      path: '/#/app-center/master-analysis/scraper',
      ready: '[x-data="scraperPanel"]',
    },
    {
      label: 'Ctrl-KH',
      path: '/#/app-center/keyword-hunter/input',
      ready: '#keyword-hunter-module-input',
    },
    {
      label: 'Ctrl-PPC',
      path: '/#/app-center/ppc-tools/ppc-search-terms',
      ready: '.ppc-search-terms-app',
    },
    { label: 'Ctrl-SOPs', path: '/#/sops', ready: '#panel-sops:not(.hidden) .sops-overview' },
    { label: 'Ctrl-NPI', path: '/#/sops/growth/npi-tracker', ready: '#panel-sops:not(.hidden)' },
    { label: 'Ctrl-Agents', path: '/#/more/explore/agents', ready: '#panel-more:not(.hidden)' },
  ] as const;
  for (const route of controlRoutes) {
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(route.ready, { timeout: 20000 });
      await page.waitForTimeout(900);
      if ((route as any).settings) {
        await page.evaluate(OPEN_SETTINGS_SOURCE);
        await page.waitForTimeout(1200);
      }
      const defects = await page.evaluate(CONTROL_SOURCE);
      report[`${mode}:${route.label}`] = defects;
      total += defects.length;
      console.log(`[${route.label}] controls defects=${defects.length}`);
      for (const d of defects) {
        console.log(`   ${d.kind} ${d.ratio} ${d.sel} "${d.text}" ${d.color} on ${d.bg}`);
      }
    } catch (e) {
      report[`${mode}:${route.label}`] = { error: String(e).slice(0, 200) };
      console.log(`[${route.label}] ERROR ${String(e).slice(0, 200)}`);
    }
  }

  writeFileSync('audit-dark-depth-report.json', JSON.stringify(report, null, 2));
  console.log(`\nTOTAL DEFECTS: ${total}`);
  await page.close();
  await browser.close();
  server?.kill();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
