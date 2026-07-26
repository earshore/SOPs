/**
 * Utility Bridge 漂移门禁 — 校验 utility-bridge.generated.css 与源码同步。
 *
 * 原理: 重新运行生成器到临时输出，与已提交文件逐字节对比。
 * 不一致 = 有人新增/修改了颜色工具类但未跑 `npm run generate:tokens`
 * （深色语义会漏掉新类），或手改了生成文件。
 *
 * 运行: npm run theme:bridge:gate   (已接入 ci:quality)
 */

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const COMMITTED = resolve(repoRoot, 'src/css/foundation/utility-bridge.generated.css');
const TEMP_OUT = resolve(repoRoot, 'src/css/foundation/utility-bridge.gate-check.css');

function normalize(css: string): string {
  return css.replace(/\r\n/g, '\n').trim();
}

try {
  execSync('npx tsx scripts/build/generate-utility-bridge.ts', {
    cwd: repoRoot,
    stdio: 'pipe',
    env: { ...process.env, UTILITY_BRIDGE_OUT: TEMP_OUT },
  });

  const committed = normalize(readFileSync(COMMITTED, 'utf-8'));
  const fresh = normalize(readFileSync(TEMP_OUT, 'utf-8'));

  if (committed !== fresh) {
    const committedRules = committed.split('\n').filter(l => l.includes('{')).length;
    const freshRules = fresh.split('\n').filter(l => l.includes('{')).length;
    console.error('❌ Utility Bridge 漂移: 生成文件与源码不同步。');
    console.error(`   已提交规则数: ${committedRules}  重新生成规则数: ${freshRules}`);
    console.error('   请运行 npm run generate:tokens (或 npm run generate:bridge) 并提交结果。');
    process.exit(1);
  }

  console.log('✅ Utility Bridge 门禁通过: 深色映射与源码颜色工具类同步。');
} finally {
  if (existsSync(TEMP_OUT)) {
    unlinkSync(TEMP_OUT);
  }
}
