/**
 * 简化构建脚本 - 使用esbuild快速构建
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

console.log('🔨 开始构建...\n');

try {
  // 构建主入口
  await build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/cli.js',
    external: ['jsdom', 'postcss', 'commander', 'chalk', 'minimatch'],
  });

  // 构建库入口
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/index.js',
    external: ['jsdom', 'postcss', 'commander', 'chalk', 'minimatch'],
  });

  console.log('✅ 构建完成！\n');
  console.log('输出文件:');
  console.log('  - dist/cli.js (CLI入口)');
  console.log('  - dist/index.js (库入口)');

} catch (error) {
  console.error('❌ 构建失败:', error);
  process.exit(1);
}
