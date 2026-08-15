/**
 * Utility Bridge 生成器 — 为原生 Tailwind 颜色工具类生成深色语义映射。
 *
 * 输出: src/css/foundation/utility-bridge.generated.css
 * 运行: npm run generate:tokens (或单独 npm run generate:bridge)
 *
 * 背景 (enterprise-theme-system-redesign T4):
 * 业务模板与渲染器存在上万处浅色锁死的工具类 (bg-white / text-slate-800 /
 * bg-amber-50 / border-slate-200 …), 模板内 `dark:` 变体为 0。逐文件手迁
 * 不可持续且产出碎片化深色。桥接层扫描源码中「实际出现」的颜色工具类
 * (与 Tailwind content 扫描同一文件集), 从下方唯一映射表生成 resolved-dark
 * 覆盖规则:
 *   - 浅色模式零改动 (所有规则仅在 .dark / data-color-mode-resolved=dark 生效)
 *   - 深色语义全站一致 (中性面走 Theme surface token, 彩色走 hue 平移 + 透明 tint)
 *   - 仅对源码中出现的类出规则 — 输出可审计、体积可控
 *   - 元素级逃生舱: 加 `twb-keep` class 的元素不参与桥接
 *     (用于「无论何种主题都要保持浅色字面值」的场景, 如主题预览色块)
 *
 * 规则铁律 (与 THEME_SYSTEM_GUIDELINES §2.3 对齐):
 *   - Theme 拥有中性 surface / text / border → 中性映射引用语义 token
 *   - 不触碰 --color-primary* / focus (Accent) 与模块归属色 (Ownership)
 *   - 饱和实色 (400-600 CTA/图标底/进度条) 与暗墨面板 (slate-800/900 hero)
 *     保持原值 — 两种模式下同为「深色墨面」, 是品牌一致性而非遗漏
 *   - 低透明度白叠加 (bg-white/5..40) 表达「提亮」意图, 深浅语义一致, 不覆盖;
 *     bg-white/50 及以上是「浅色磨砂表面」, 映射为 surface 磨砂
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

// ───────────────────────────── 调色板与作用域 ─────────────────────────────

/** 有彩色相 (与 design-tokens palettes 对齐, 不含中性 slate/gray) */
const HUES = new Set([
  'amber',
  'blue',
  'cyan',
  'emerald',
  'fuchsia',
  'green',
  'indigo',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'rose',
  'sky',
  'teal',
  'violet',
  'yellow',
]);

const NEUTRALS = new Set(['slate', 'gray']);

/** resolved-dark 作用域 — 与 variables.css 暗色块和 theme-bootstrap 标记对齐 */
const DARK = ':is(.dark, [data-color-mode-resolved="dark"])';
/** 元素级逃生舱 */
const KEEP = ':not(.twb-keep)';

// ───────────────────────────── 值助手 ─────────────────────────────

/** hue 透明 tint — 深色下彩色软底/软线的统一配方 (可叠于任意 surface) */
const tint = (hue: string, pct: number): string =>
  `color-mix(in srgb, var(--color-${hue}-400) ${pct}%, transparent)`;

const whiteA = (alpha: number): string => `rgba(255, 255, 255, ${alpha})`;
const token = (name: string): string => `var(--${name})`;
const shadeVar = (palette: string, shade: number): string => `var(--color-${palette}-${shade})`;

const withAlpha = (value: string, alpha?: number): string =>
  alpha === undefined ? value : `color-mix(in srgb, ${value} ${alpha}%, transparent)`;

// ───────────────────────────── 映射表 (SSOT) ─────────────────────────────

/** 中性背景: 白卡 → surface-card; 浅灰 wash → panel / 白透明阶 */
const NEUTRAL_BG: Record<string, string> = {
  '50': token('surface-panel'),
  '100': whiteA(0.07),
  '200': whiteA(0.12),
  '300': whiteA(0.18),
};

/** 中性背景 hover — hover 意图是「提亮」, 独立配挡 */
const NEUTRAL_BG_HOVER: Record<string, string> = {
  '50': token('color-bg-hover'),
  '100': whiteA(0.09),
  '200': whiteA(0.14),
};

/** 中性文字: 深灰读色 → 亮灰阶 (与 --color-text-* 暗色 token 同表) */
const NEUTRAL_TEXT: Record<string, string> = {
  '950': 'var(--color-slate-100)',
  '900': 'var(--color-slate-100)',
  '800': 'var(--color-slate-100)',
  '700': 'var(--color-slate-200)',
  '600': 'var(--color-slate-300)',
  '500': 'var(--color-slate-400)',
};

/** 中性边框: 浅灰实线 → 白透明阶 (含项目自定义 slate-150) */
const NEUTRAL_BORDER: Record<string, string> = {
  '100': whiteA(0.07),
  '150': whiteA(0.08),
  '200': whiteA(0.1),
  '300': whiteA(0.16),
};

const NEUTRAL_BORDER_HOVER: Record<string, string> = {
  '200': whiteA(0.14),
  '300': whiteA(0.22),
};

/** hue 软底 (50/100/200) → 透明 tint 三档 */
const HUE_BG_TINT: Record<string, number> = { '50': 12, '100': 18, '200': 26 };
const HUE_BG_TINT_HOVER: Record<string, number> = { '50': 16, '100': 22, '200': 30 };

/** hue 文字平移: 深读色 → 亮读色 (Radix/Material 深色惯例) */
const HUE_TEXT: Record<string, number> = {
  '500': 400,
  '600': 400,
  '700': 300,
  '800': 300,
  '900': 200,
  '950': 200,
};

/** hue 边框 → tint 边线 */
const HUE_BORDER_TINT: Record<string, number> = { '100': 22, '200': 32, '300': 42 };

/** ring 软环 */
const HUE_RING_TINT: Record<string, number> = { '50': 24, '100': 30, '200': 40 };
const NEUTRAL_RING: Record<string, string> = { '200': whiteA(0.16), '300': whiteA(0.22), '400': whiteA(0.3) };

/** bg-white/NN: ≥50 视为浅色磨砂表面 */
const FROST_MIN_ALPHA = 50;

/** shadow-* → Theme shadow token (variables.css 暗色块已重定义 --shadow-*) */
const SHADOW_KEYS = new Set(['sm', 'md', 'lg', 'xl', '2xl', 'inner']);

// ───────────────────────────── 源码扫描 ─────────────────────────────

const SCAN_ROOTS = [join(repoRoot, 'src')];
const SCAN_FILES = [join(repoRoot, 'index.html')];
const SCAN_EXT = /\.(html|ts|js|tsx|jsx)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
/** 生成物与测试不参与扫描, 避免自引用死类 */
const SKIP_FILE = /(\.generated\.|\.test\.|\.spec\.)/;

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (SCAN_EXT.test(entry) && !SKIP_FILE.test(entry)) {
      out.push(full);
    }
  }
}

const VARIANTS = ['hover', 'focus', 'focus-within', 'group-hover', 'active', 'odd', 'even'] as const;
type Variant = (typeof VARIANTS)[number] | '';

const UTILITIES = [
  'bg',
  'text',
  'border',
  'divide',
  'ring-offset',
  'ring',
  'placeholder',
  'from',
  'via',
  'to',
  'shadow',
] as const;
type Utility = (typeof UTILITIES)[number];

interface UsedClass {
  /** 原始完整类名 (含变体前缀), 用于选择器 */
  raw: string;
  variant: Variant;
  utility: Utility;
  /** 工具类主体, 如 `white`, `slate-200`, `emerald-50/80`, `sm` */
  body: string;
}

const CLASS_RE = new RegExp(
  `(?:(${VARIANTS.join('|')}):)?` +
    `((?:${UTILITIES.join('|')})-[a-z0-9]+(?:-[0-9]{2,3})?(?:/[0-9]{1,3})?)(?![a-zA-Z0-9_-])`,
  'g'
);

function scanUsedClasses(): Map<string, UsedClass> {
  const files: string[] = [...SCAN_FILES];
  for (const root of SCAN_ROOTS) walk(root, files);

  const used = new Map<string, UsedClass>();
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const match of content.matchAll(CLASS_RE)) {
      const variant = (match[1] ?? '') as Variant;
      const full = match[2];
      const utility = UTILITIES.find(u => full.startsWith(`${u}-`));
      if (!utility) continue;
      const body = full.slice(utility.length + 1);
      const raw = variant ? `${variant}:${full}` : full;
      if (!used.has(raw)) {
        used.set(raw, { raw, variant, utility, body });
      }
    }
  }
  return used;
}

// ───────────────────────────── body 解析 ─────────────────────────────

interface ParsedColor {
  palette: string;
  shade: string | null;
  alpha: number | undefined;
}

function parseColorBody(body: string): ParsedColor | null {
  const alphaMatch = body.match(/^(.*?)\/([0-9]{1,3})$/);
  const base = alphaMatch ? alphaMatch[1] : body;
  const alpha = alphaMatch ? Number(alphaMatch[2]) : undefined;

  const shadeMatch = base.match(/^([a-z]+)-([0-9]{2,3})$/);
  if (shadeMatch) {
    return { palette: shadeMatch[1], shade: shadeMatch[2], alpha };
  }
  if (/^[a-z]+$/.test(base)) {
    return { palette: base, shade: null, alpha };
  }
  return null;
}

// ───────────────────────────── 选择器助手 ─────────────────────────────

const escapeClass = (cls: string): string =>
  cls.replace(/:/g, '\\:').replace(/\./g, '\\.').replace(/\//g, '\\/');

/** 变体感知选择器; suffix 用于 divide/placeholder 的结构性尾部 */
function selectorFor(used: UsedClass, suffix = ''): string {
  const cls = `.${escapeClass(used.raw)}${KEEP}`;
  switch (used.variant) {
    case '':
      return `${DARK} ${cls}${suffix}`;
    case 'hover':
      return `${DARK} ${cls}:hover${suffix}`;
    case 'focus':
      return `${DARK} ${cls}:focus${suffix}`;
    case 'focus-within':
      return `${DARK} ${cls}:focus-within${suffix}`;
    case 'active':
      return `${DARK} ${cls}:active${suffix}`;
    case 'odd':
      return `${DARK} ${cls}:nth-child(odd)${suffix}`;
    case 'even':
      return `${DARK} ${cls}:nth-child(even)${suffix}`;
    case 'group-hover':
      return `${DARK} .group:hover ${cls}${suffix}`;
  }
}

// ───────────────────────────── 单类映射 ─────────────────────────────

interface BridgeRule {
  selector: string;
  decls: Record<string, string>;
}

const isHover = (v: Variant): boolean => v === 'hover' || v === 'group-hover';

function mapBg(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed) return [];
  const { palette, shade, alpha } = parsed;

  if (palette === 'white' && shade === null) {
    if (alpha !== undefined) {
      if (alpha < FROST_MIN_ALPHA) return [];
      const frost = `color-mix(in srgb, ${token('surface-card')} ${alpha}%, transparent)`;
      return [{ selector: selectorFor(used), decls: { 'background-color': frost } }];
    }
    const value = isHover(used.variant)
      ? token('surface-card-hover')
      : token('surface-card');
    return [{ selector: selectorFor(used), decls: { 'background-color': value } }];
  }

  if (shade === null) return []; // black / transparent / current …

  if (NEUTRALS.has(palette)) {
    const table = isHover(used.variant) ? { ...NEUTRAL_BG, ...NEUTRAL_BG_HOVER } : NEUTRAL_BG;
    const value = table[shade];
    if (!value) return [];
    return [{ selector: selectorFor(used), decls: { 'background-color': withAlpha(value, alpha) } }];
  }

  if (HUES.has(palette)) {
    const table = isHover(used.variant) ? { ...HUE_BG_TINT, ...HUE_BG_TINT_HOVER } : HUE_BG_TINT;
    const pct = table[shade];
    if (pct === undefined) return [];
    const scaled = alpha === undefined ? pct : Math.max(4, Math.round((pct * alpha) / 100));
    return [{ selector: selectorFor(used), decls: { 'background-color': tint(palette, scaled) } }];
  }

  return [];
}

function mapText(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed || parsed.shade === null) return [];
  const { palette, shade, alpha } = parsed;

  if (NEUTRALS.has(palette)) {
    const value = NEUTRAL_TEXT[shade];
    if (!value) return [];
    return [{ selector: selectorFor(used), decls: { color: withAlpha(value, alpha) } }];
  }
  if (HUES.has(palette)) {
    const target = HUE_TEXT[shade];
    if (target === undefined) return [];
    return [
      { selector: selectorFor(used), decls: { color: withAlpha(shadeVar(palette, target), alpha) } },
    ];
  }
  return [];
}

function mapBorder(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed || parsed.shade === null) return [];
  const { palette, shade, alpha } = parsed;

  if (NEUTRALS.has(palette)) {
    const table = isHover(used.variant)
      ? { ...NEUTRAL_BORDER, ...NEUTRAL_BORDER_HOVER }
      : NEUTRAL_BORDER;
    const value = table[shade];
    if (!value) return [];
    return [{ selector: selectorFor(used), decls: { 'border-color': withAlpha(value, alpha) } }];
  }
  if (HUES.has(palette)) {
    const pct = HUE_BORDER_TINT[shade];
    if (pct === undefined) return [];
    const scaled = alpha === undefined ? pct : Math.max(6, Math.round((pct * alpha) / 100));
    return [{ selector: selectorFor(used), decls: { 'border-color': tint(palette, scaled) } }];
  }
  return [];
}

const DIVIDE_SUFFIX = ' > :not([hidden]) ~ :not([hidden])';

function mapDivide(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed || parsed.shade === null || parsed.alpha !== undefined) return [];
  const { palette, shade } = parsed;

  if (NEUTRALS.has(palette)) {
    const value = NEUTRAL_BORDER[shade];
    if (!value) return [];
    return [{ selector: selectorFor(used, DIVIDE_SUFFIX), decls: { 'border-color': value } }];
  }
  if (HUES.has(palette)) {
    const pct = HUE_BORDER_TINT[shade];
    if (pct === undefined) return [];
    return [
      { selector: selectorFor(used, DIVIDE_SUFFIX), decls: { 'border-color': tint(palette, pct) } },
    ];
  }
  return [];
}

function mapRing(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed || parsed.shade === null || parsed.alpha !== undefined) return [];
  const { palette, shade } = parsed;

  if (NEUTRALS.has(palette)) {
    const value = NEUTRAL_RING[shade];
    if (!value) return [];
    return [{ selector: selectorFor(used), decls: { '--tw-ring-color': value } }];
  }
  if (HUES.has(palette)) {
    const pct = HUE_RING_TINT[shade];
    if (pct === undefined) return [];
    return [{ selector: selectorFor(used), decls: { '--tw-ring-color': tint(palette, pct) } }];
  }
  return [];
}

function mapPlaceholder(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed || parsed.shade === null) return [];
  const { palette, shade } = parsed;
  if (!NEUTRALS.has(palette)) return [];
  if (Number(shade) < 300 || Number(shade) > 500) return [];
  return [
    {
      selector: selectorFor(used, '::placeholder'),
      decls: { color: token('color-text-placeholder') },
    },
  ];
}

function mapShadow(used: UsedClass): BridgeRule[] {
  if (!SHADOW_KEYS.has(used.body)) return [];
  return [
    { selector: selectorFor(used), decls: { '--tw-shadow': `var(--shadow-${used.body})` } },
  ];
}

// ── 渐变端点 ──
// from-* 覆盖被映射的浅色端; 所有「使用中」的 via-*/to-* 一律输出等特异度
// 规则 (映射值或原值回写), 保证「映射 from + 未映射 via/to」组合下端点值
// 不被 from 的 --tw-gradient-stops 重写吞掉 (via/to 段排在 from 段之后)。

function gradientStopValue(parsed: ParsedColor): { value: string; mapped: boolean } | null {
  const { palette, shade, alpha } = parsed;
  if (palette === 'white' && shade === null) {
    return { value: withAlpha(token('surface-card'), alpha), mapped: true };
  }
  if (palette === 'transparent' || palette === 'black' || palette === 'current') return null;
  if (shade === null) return null;

  if (NEUTRALS.has(palette)) {
    const mappedValue = NEUTRAL_BG[shade];
    if (mappedValue) return { value: withAlpha(mappedValue, alpha), mapped: true };
    return { value: withAlpha(shadeVar(palette, Number(shade)), alpha), mapped: false };
  }
  if (HUES.has(palette)) {
    const pct = HUE_BG_TINT[shade];
    if (pct !== undefined) {
      const scaled = alpha === undefined ? pct : Math.max(4, Math.round((pct * alpha) / 100));
      return { value: tint(palette, scaled), mapped: true };
    }
    return { value: withAlpha(shadeVar(palette, Number(shade)), alpha), mapped: false };
  }
  return null;
}

function mapFrom(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed) return [];
  const stop = gradientStopValue(parsed);
  if (!stop || !stop.mapped) return []; // 未映射端点保持 Tailwind 原值
  const value = stop.value;
  return [
    {
      selector: selectorFor(used),
      decls: {
        '--tw-gradient-from': `${value} var(--tw-gradient-from-position)`,
        '--tw-gradient-to': `color-mix(in srgb, ${value} 0%, transparent) var(--tw-gradient-to-position)`,
        '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to)',
      },
    },
  ];
}

function mapVia(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed) return [];
  const stop = gradientStopValue(parsed);
  if (!stop) return [];
  const value = stop.value;
  return [
    {
      selector: selectorFor(used),
      decls: {
        '--tw-gradient-to': `color-mix(in srgb, ${value} 0%, transparent) var(--tw-gradient-to-position)`,
        '--tw-gradient-stops': `var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
      },
    },
  ];
}

function mapTo(used: UsedClass): BridgeRule[] {
  const parsed = parseColorBody(used.body);
  if (!parsed) return [];
  const stop = gradientStopValue(parsed);
  if (!stop) return [];
  return [
    {
      selector: selectorFor(used),
      decls: { '--tw-gradient-to': `${stop.value} var(--tw-gradient-to-position)` },
    },
  ];
}

const MAPPERS: Record<Utility, (used: UsedClass) => BridgeRule[]> = {
  bg: mapBg,
  text: mapText,
  border: mapBorder,
  divide: mapDivide,
  ring: mapRing,
  'ring-offset': () => [], // 统一由通用规则处理
  placeholder: mapPlaceholder,
  shadow: mapShadow,
  from: mapFrom,
  via: mapVia,
  to: mapTo,
};

/** 输出分区顺序 — via/to 必须晚于 from (等特异度靠后胜出) */
const SECTION_ORDER: { utility: Utility; title: string }[] = [
  { utility: 'bg', title: '背景 → surface / 白透明阶 / hue tint' },
  { utility: 'text', title: '文字 → 亮灰阶 / hue 亮档平移' },
  { utility: 'border', title: '边框 → 白透明阶 / hue tint 边线' },
  { utility: 'divide', title: '分隔线' },
  { utility: 'ring', title: 'ring 软环' },
  { utility: 'placeholder', title: 'placeholder' },
  { utility: 'shadow', title: '阴影 → Theme shadow token' },
  { utility: 'from', title: '渐变端点 · from (映射浅色端)' },
  { utility: 'via', title: '渐变端点 · via (映射 + 回写)' },
  { utility: 'to', title: '渐变端点 · to (映射 + 回写)' },
];

// ───────────────────────────── 生成 ─────────────────────────────

function generate(): { css: string; ruleCount: number; usedCount: number } {
  const used = scanUsedClasses();

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Utility Bridge - 自动生成文件');
  lines.push(' * ⚠️ 请勿手动编辑此文件！');
  lines.push(' * 修改 scripts/build/generate-utility-bridge.ts 后运行 npm run generate:tokens');
  lines.push(' *');
  lines.push(' * 作用: 在 resolved-dark 下重定义源码中实际使用的 Tailwind 颜色工具类,');
  lines.push(' * 使存量浅色模板获得与 Theme token 一致的深色表面/文字/边框。');
  lines.push(' * 浅色模式不受影响; 加 `twb-keep` class 可让元素退出桥接。');
  lines.push(' */');

  let ruleCount = 0;

  // ring-offset 缝隙色: Tailwind 预设 --tw-ring-offset-color:#fff,
  // 深色下 focus ring 会带白色缝隙; 统一改为卡面色 (多数控件位于卡上)
  lines.push('');
  lines.push('/* ── ring-offset 缝隙 → 卡面色 ── */');
  lines.push(
    `${DARK} *, ${DARK} ::before, ${DARK} ::after { --tw-ring-offset-color: var(--surface-card); }`
  );
  ruleCount += 1;

  const sorted = [...used.values()].sort((a, b) => a.raw.localeCompare(b.raw));

  for (const { utility, title } of SECTION_ORDER) {
    const sectionRules: string[] = [];
    for (const cls of sorted) {
      if (cls.utility !== utility) continue;
      for (const bridgeRule of MAPPERS[utility](cls)) {
        const body = Object.entries(bridgeRule.decls)
          .map(([prop, value]) => `${prop}: ${value}`)
          .join('; ');
        sectionRules.push(`${bridgeRule.selector} { ${body}; }`);
      }
    }
    if (sectionRules.length > 0) {
      lines.push('');
      lines.push(`/* ── ${title} ── */`);
      lines.push(...sectionRules);
      ruleCount += sectionRules.length;
    }
  }

  lines.push('');

  // ── [B4-THM01] bg-secondary 自定义类桥接修正 ──
  // 存量模板中的 .bg-secondary 原由 Tailwind 生成时错误映射到 var(--color-secondary)
  // （中性蓝灰），修正为手写语义键 --bg-secondary（slate-50），dark 翻转跟随
  // bg-slate-50 契约（→ surface-panel）
  lines.push(
    '/* ── [B4-THM01] bg-secondary 自定义类桥接修正 ── */',
  );
  lines.push(
    '.bg-secondary:not(.twb-keep) { background-color: var(--bg-secondary, #f8fafc); }',
  );
  lines.push(
    ':is(.dark, [data-color-mode-resolved="dark"]) .bg-secondary:not(.twb-keep) { background-color: var(--surface-panel); }',
  );
  lines.push('');
  return { css: lines.join('\n'), ruleCount, usedCount: used.size };
}

// 生成并写入文件（UTILITY_BRIDGE_OUT 供漂移门禁写临时对照文件）
const { css, ruleCount, usedCount } = generate();
const outputPath =
  process.env.UTILITY_BRIDGE_OUT ??
  resolve(__dirname, '../../src/css/foundation/utility-bridge.generated.css');

try {
  writeFileSync(outputPath, css, 'utf-8');
  console.log('✅ Utility Bridge 生成成功:', outputPath);
  console.log(`📊 扫描到 ${usedCount} 个候选类, 生成 ${ruleCount} 条深色映射规则`);
} catch (error) {
  console.error('❌ Utility Bridge 生成失败:', error);
  process.exit(1);
}
