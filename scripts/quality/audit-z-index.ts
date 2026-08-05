/**
 * Z-index 层级审计脚本
 *
 * 规则（对齐 docs/Z_INDEX_LAYERING_GUIDELINES.md）：
 * 1. 业务 CSS 禁止裸数字 z-index >= 100（-1..99 允许局部小值）；
 * 2. 业务 CSS 禁止 z-index 使用 !important 提升层级（数值 >= 10 或引用 var() 时判定违规）；
 * 3. 业务 HTML/TS 模板字符串禁止 Tailwind 任意值类 z-[数字]；
 * 4. 业务 TS/HTML 内联 z-index 裸数字 >= 100 判定违规。
 *
 * 豁免：src/common/devtools/**（调试工具面板）。
 * 运行：npm run z-index:audit（已接入 ci:quality）。
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const SRC_DIR = join(ROOT, 'src');

interface Violation {
  file: string;
  line: number;
  message: string;
  suggestion: string;
  snippet: string;
}

const violations: Violation[] = [];

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(css|html|ts|js|tsx|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function pushViolation(file: string, line: number, message: string, suggestion: string, snippet: string): void {
  violations.push({ file, line, message, suggestion, snippet });
}

function auditCss(text: string, file: string): void {
  const re = /z-index\s*:\s*([^;}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = (m[1] ?? '').trim();
    const isImportant = /!important/i.test(raw);
    const isToken = /var\(|calc\(/i.test(raw);
    const num = Number.parseInt(raw.replace(/!important/gi, '').trim(), 10);

    if (!isToken && Number.isFinite(num) && num >= 100) {
      pushViolation(
        file,
        lineAt(text, m.index),
        `裸数字 z-index: ${num} 越界（>= 100）`,
        '改用语义 token：var(--z-*)（层级表见 docs/Z_INDEX_LAYERING_GUIDELINES.md）',
        raw
      );
    }
    if (isImportant && !isToken && Number.isFinite(num) && num >= 10) {
      pushViolation(
        file,
        lineAt(text, m.index),
        `z-index 使用 !important 提升层级（值 ${num}）`,
        '用更高优先级选择器或语义 token 替代 !important',
        raw
      );
    }
    if (isImportant && isToken) {
      pushViolation(
        file,
        lineAt(text, m.index),
        'z-index 引用 token 时禁止追加 !important',
        '用更高优先级选择器替代 !important',
        raw
      );
    }
  }
}

function auditMarkup(text: string, file: string): void {
  const arbitrary = /z-\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = arbitrary.exec(text)) !== null) {
    pushViolation(
      file,
      lineAt(text, m.index),
      `Tailwind 任意值类 z-[${m[1]}] 违规`,
      '使用语义 token var(--z-*) 或 Tailwind z-10~z-50',
      m[0]
    );
  }

  const inline = /z-index\s*:\s*([^;"'\n}]+)/g;
  while ((m = inline.exec(text)) !== null) {
    const raw = (m[1] ?? '').trim();
    const num = Number.parseInt(raw.replace(/!important/gi, '').trim(), 10);
    if (Number.isFinite(num) && num >= 100) {
      pushViolation(
        file,
        lineAt(text, m.index),
        `内联 z-index: ${num} 越界（>= 100）`,
        '改用语义 token var(--z-*)',
        raw
      );
    }
  }
}

function isExempt(file: string): boolean {
  return file.split(/[\\/]/).includes('devtools');
}

function audit(): void {
  const files: string[] = [];
  collectFiles(SRC_DIR, files);

  for (const file of files) {
    if (isExempt(file)) continue;
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (file.endsWith('.css')) {
      auditCss(text, rel);
    } else {
      auditMarkup(text, rel);
    }
  }
}

audit();

console.log('═'.repeat(80));
console.log('Z-index 层级审计');
console.log('═'.repeat(80));

if (violations.length === 0) {
  console.log('🎉 未发现 z-index 层级违规。');
  console.log('规范：docs/Z_INDEX_LAYERING_GUIDELINES.md');
} else {
  for (const v of violations) {
    console.log(`\n❌ ${v.file}:${v.line}`);
    console.log(`   问题: ${v.message}`);
    console.log(`   建议: ${v.suggestion}`);
    console.log(`   原文: ${v.snippet}`);
  }
  console.log(`\n共 ${violations.length} 处违规。`);
  console.log('豁免范围：src/common/devtools/**');
  process.exitCode = 1;
}
console.log('═'.repeat(80));