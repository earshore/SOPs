/**
 * 生产产物体积门禁：任何 dist 内 JS chunk 超过预算即硬失败。
 *
 * 口径：gzip 后大小 + 原始大小双阈值。deepChat.bundle.js 为第三方
 * vendor 独立挂载（不进 manualChunks），与其他 chunk 共用同一预算。
 *
 * 用法：npm run build 之后执行 `npm run build:size-gate`
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const DIST_DIR = join(process.cwd(), 'dist');
const MAX_GZIP_KB = 400;
const MAX_RAW_KB = 1200;

interface OversizedEntry {
  name: string;
  gzipKB: number;
  rawKB: number;
}

function collectJs(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const filePath = join(dir, name);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      collectJs(filePath, out);
    } else if (stat.isFile() && name.endsWith('.js')) {
      out.push(filePath);
    }
  }
}

const jsFiles: string[] = [];
collectJs(join(DIST_DIR, 'assets'), jsFiles);

if (jsFiles.length === 0) {
  console.error('[bundle-size-gate] 未找到 dist/assets 下的 JS 产物，请先执行 npm run build');
  process.exit(1);
}

const oversized: OversizedEntry[] = [];
let totalGzipKB = 0;
let maxGzipKB = 0;

for (const filePath of jsFiles) {
  const content = readFileSync(filePath);
  const rawKB = content.length / 1024;
  const gzipKB = gzipSync(content).length / 1024;
  totalGzipKB += gzipKB;
  if (gzipKB > maxGzipKB) maxGzipKB = gzipKB;
  if (gzipKB > MAX_GZIP_KB || rawKB > MAX_RAW_KB) {
    oversized.push({ name: filePath.slice(DIST_DIR.length + 1), gzipKB, rawKB });
  }
}

const formatted = (kb: number): string => `${kb.toFixed(1)}KB`;

console.log(
  `[bundle-size-gate] JS chunks: ${jsFiles.length} | gzip total: ${formatted(totalGzipKB)} | max gzip: ${formatted(maxGzipKB)}`
);

if (oversized.length > 0) {
  console.error('[bundle-size-gate] 以下 chunk 超过体积预算，构建失败：');
  for (const entry of oversized) {
    console.error(
      `  - ${entry.name}: gzip ${formatted(entry.gzipKB)} (上限 ${formatted(MAX_GZIP_KB)}) / raw ${formatted(entry.rawKB)} (上限 ${formatted(MAX_RAW_KB)})`
    );
  }
  process.exit(1);
}