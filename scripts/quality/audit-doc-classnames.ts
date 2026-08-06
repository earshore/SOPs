/**
 * 文档 ↔ CSS 类名防漂移审计脚本
 *
 * 目的：防止速查文档记录不存在的组件类名（如历史漂移 `.btn` vs `.action-btn`）。
 * 规则：
 * 1. 从速查文档（src/css/README.md、src/css/QUICK-REFERENCE.md，可扩展列表）提取 `.some-class` token。
 *    提取规则：`\.` 后紧跟 `[a-zA-Z_]`（后续允许数字/`-`/`_`），因此 `.5rem`、`.1`、`.2xl` 等
 *    数字开头误匹配自动过滤；`.css`、`.md` 等文件名后缀单独排除。
 * 2. 从 src/css/{components,foundation,utilities,animations}/*.css 收集所有已定义类选择器（宁可多抓；
 *    animations 纳入是因为 QUICK-REFERENCE 记录的动画类 fade-in/slide-in/spin 等定义在
 *    animations/keyframes.css）。
 * 3. 文档类名若既不在 CSS 定义集合、也不在 Tailwind/框架工具类白名单 → 判定「未定义类名」（漂移）。
 * 运行：npm run doc-classnames:audit（--report-only 仅报告不 fail，便于先看结果）
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const CSS_ROOT = join(ROOT, 'src', 'css');

// 扫描的速查文档（后续可扩展列表）
const DOC_FILES = [
  join(CSS_ROOT, 'README.md'),
  join(CSS_ROOT, 'QUICK-REFERENCE.md'),
];

// 收集类选择器的 CSS 目录（相对 src/css；宁可多抓）
const CSS_DIRS = ['components', 'foundation', 'utilities', 'animations'];

// 文件名后缀误匹配（`variables.css`、`README.md` 里的 `.css` / `.md`）
const FILE_EXTENSIONS = new Set([
  'css', 'md', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'html',
  'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'ico', 'yml', 'yaml',
  'bat', 'sh', 'txt', 'ejs', 'map',
]);

// 文档中示意性示例类（占位符，非真实组件类；README/QUICK-REFERENCE「自定义样式」示例）
const DOC_EXAMPLE_ALLOWLIST = new Set(['my-custom-card', 'my-element']);

// Tailwind/框架工具类白名单（前缀匹配；变体如 hover: 会先剥离再匹配）
const TAILWIND_EXACT = new Set([
  'flex', 'grid', 'relative', 'absolute', 'fixed', 'sticky', 'hidden',
  'block', 'inline', 'inline-block', 'inline-flex', 'truncate', 'sr-only',
  'visible', 'invisible', 'static', 'isolate', 'filter',
]);

const TAILWIND_PREFIXES = [
  'bg-', 'text-', 'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
  'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
  'gap-', 'items-', 'justify-', 'content-', 'self-', 'place-',
  'rounded-', 'shadow-', 'border-', 'ring-', 'transition-', 'duration-', 'ease-',
  'group-', 'w-', 'h-', 'max-', 'min-', 'leading-', 'font-', 'tracking-',
  'cursor-', 'overflow-', 'whitespace-', 'opacity-', 'z-', 'inset-',
  'top-', 'bottom-', 'left-', 'right-', 'space-', 'divide-', 'placeholder-',
  'focus-', 'active-', 'disabled-', 'flex-', 'grid-', 'col-', 'row-',
  'basis-', 'grow-', 'shrink-', 'order-', 'aspect-', 'object-', 'select-',
  'pointer-events-', 'resize-', 'list-', 'align-', 'float-', 'clear-',
  'mix-blend-', 'backdrop-', 'saturate-', 'sepia-', 'invert-', 'brightness-',
  'contrast-', 'drop-shadow-', 'grayscale-', 'size-',
];

// 常见 Tailwind 变体前缀（hover:bg-red-500 → bg-red-500）
const TAILWIND_VARIANTS = [
  'hover', 'focus', 'active', 'disabled', 'focus-within', 'focus-visible',
  'group-hover', 'group-focus', 'group-active', 'first', 'last', 'odd', 'even',
  'checked', 'visited', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'dark',
  'motion-safe', 'motion-reduce', 'print', 'portrait', 'landscape',
  'max-sm', 'max-md', 'max-lg', 'max-xl', 'max-2xl',
];

interface Occurrence {
  className: string;
  file: string;
  line: number;
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function extractClassTokens(content: string, file: string): Occurrence[] {
  const occurrences: Occurrence[] = [];
  // 类名 token：点号后紧跟字母/下划线，后续字母/数字/`-`/`_`
  const tokenRe = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(content)) !== null) {
    const name = m[1];
    if (FILE_EXTENSIONS.has(name)) continue;
    // 多段文件名（如 style.legacy.css）：`.legacy` 后紧跟 `.<扩展名>`，非类名
    const rest = content.slice(tokenRe.lastIndex);
    const extMatch = rest.match(/^\.([a-zA-Z0-9]+)/);
    if (extMatch && FILE_EXTENSIONS.has(extMatch[1])) continue;
    occurrences.push({ className: name, file, line: lineAt(content, m.index) });
  }
  return occurrences;
}

function collectDefinedClasses(): Set<string> {
  const defined = new Set<string>();
  let cssFileCount = 0;
  for (const dir of CSS_DIRS) {
    const fullDir = join(CSS_ROOT, dir);
    for (const entry of readdirSync(fullDir)) {
      if (!entry.endsWith('.css')) continue;
      cssFileCount++;
      const content = readFileSync(join(fullDir, entry), 'utf-8');
      for (const occ of extractClassTokens(content, '')) {
        defined.add(occ.className);
      }
    }
  }
  console.log(`🔍 扫描 CSS ${cssFileCount} 个文件（${CSS_DIRS.join('/')}），已定义类 ${defined.size} 个`);
  return defined;
}

function isTailwindUtility(name: string): boolean {
  for (const variant of TAILWIND_VARIANTS) {
    if (name.startsWith(`${variant}:`)) {
      return isTailwindUtility(name.slice(variant.length + 1));
    }
  }
  if (TAILWIND_EXACT.has(name)) return true;
  return TAILWIND_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function printHelp(): void {
  console.log(`用法: npm run doc-classnames:audit [--report-only]
  --report-only  仅报告，不因未定义类名而 fail（退出码恒为 0）
  校验 src/css/README.md 与 QUICK-REFERENCE.md 中出现的类名
  是否存在于 src/css/{components,foundation,utilities,animations}/*.css 或 Tailwind 白名单`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  const reportOnly = args.includes('--report-only');

  const defined = collectDefinedClasses();

  const allOccurrences: Occurrence[] = [];
  for (const docFile of DOC_FILES) {
    const content = readFileSync(docFile, 'utf-8');
    const occurrences = extractClassTokens(content, relative(ROOT, docFile));
    allOccurrences.push(...occurrences);
    console.log(`🔍 扫描文档 ${relative(ROOT, docFile)}，提取类名 ${occurrences.length} 个`);
  }

  // 唯一类名分类（CSS 定义优先，其次 Tailwind 白名单/示例占位符）
  const uniqueClasses = [...new Set(allOccurrences.map((o) => o.className))];
  const undefinedMap = new Map<string, Occurrence[]>();
  let definedCount = 0;
  let whitelistedCount = 0;

  for (const className of uniqueClasses) {
    if (defined.has(className)) {
      definedCount++;
    } else if (isTailwindUtility(className) || DOC_EXAMPLE_ALLOWLIST.has(className)) {
      whitelistedCount++;
    } else {
      undefinedMap.set(
        className,
        allOccurrences.filter((o) => o.className === className),
      );
    }
  }

  console.log('');
  console.log('═'.repeat(72));
  console.log('文档 ↔ CSS 类名审计报告');
  console.log('═'.repeat(72));
  console.log('');
  console.log('📊 统计:');
  console.log(`   文档类名总数（唯一）: ${uniqueClasses.length}`);
  console.log(`   ✅ CSS 已定义: ${definedCount}`);
  console.log(`   ⚪ Tailwind 白名单/示例占位符: ${whitelistedCount}`);
  console.log(`   ❌ 未定义: ${undefinedMap.size}`);
  console.log('');

  if (undefinedMap.size > 0) {
    console.log('❌ 文档中出现但 CSS 未定义且不在白名单的类名:');
    console.log('─'.repeat(72));
    for (const [className, occurrences] of undefinedMap) {
      console.log(`\n   .${className}`);
      occurrences.slice(0, 5).forEach((o) => {
        console.log(`      ${o.file}:${o.line}`);
      });
      if (occurrences.length > 5) {
        console.log(`      ... 还有 ${occurrences.length - 5} 处`);
      }
    }
    console.log('');
    if (reportOnly) {
      console.log('⚠️  发现未定义类名（--report-only：仅报告，不 fail）');
      process.exit(0);
    }
    console.log('❌ FAILED：请修正文档类名，或确认后加入白名单（--report-only 可只查看不阻断）');
    process.exit(1);
  }

  console.log('🎉 OK：文档类名与 CSS 实现一致（或均为白名单工具类）');
  process.exit(0);
}

main();
