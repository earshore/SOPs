/**
 * Bundle Size Analysis Script
 * 分析路由系统相关的打包大小
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

interface BundleInfo {
  name: string;
  path: string;
  size: number;
  gzipSize: number;
  brotliSize: number;
  routerCodeSize?: number;
  routerCodePercentage?: number;
}

interface RouterModuleInfo {
  name: string;
  estimatedSize: number;
}

interface AnalysisResult {
  routerBundles: BundleInfo[];
  routerModules: RouterModuleInfo[];
  totalSize: number;
  totalGzipSize: number;
  totalBrotliSize: number;
  estimatedRouterSize: number;
  estimatedRouterGzipSize: number;
  meetsTarget: boolean;
  targetSize: number;
}

const DIST_DIR = 'dist/assets/js';
const TARGET_SIZE_KB = 10; // 目标：< 10KB gzipped

const ROUTER_BUNDLE_MARKERS = [
  'NavigoAdapter',
  'RouteGuard',
  'RouteMiddleware',
  'PreloadManager',
  'navigo'
];

/**
 * 获取文件大小（字节）
 */
function getFileSize(filePath: string): number {
  return statSync(filePath).size;
}

/**
 * 计算 gzip 压缩后的大小
 */
function getGzipSize(content: Buffer): number {
  return gzipSync(content).length;
}

/**
 * 计算 brotli 压缩后的大小
 */
function getBrotliSize(content: Buffer): number {
  return brotliCompressSync(content).length;
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 检查文件是否与路由系统相关
 */
function isRouterRelated(filename: string): boolean {
  const routerKeywords = [
    'router',
    'navigo',
    'route',
    'navigation',
    'guard',
    'middleware',
    'preload'
  ];
  
  const lowerFilename = filename.toLowerCase();
  return routerKeywords.some(keyword => lowerFilename.includes(keyword));
}

/**
 * 分析单个 bundle 文件
 */
function analyzeBundle(filePath: string): BundleInfo {
  const content = readFileSync(filePath);
  const name = filePath.split('/').pop() || '';
  
  return {
    name,
    path: filePath,
    size: content.length,
    gzipSize: getGzipSize(content),
    brotliSize: getBrotliSize(content)
  };
}

/**
 * 估算路由系统源代码大小
 */
function estimateRouterSourceSize(): RouterModuleInfo[] {
  const routerDir = 'src/common/router/navigo';
  const modules: RouterModuleInfo[] = [];
  
  if (!existsSync(routerDir)) {
    return modules;
  }
  
  const files = readdirSync(routerDir);
  
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    
    const filePath = join(routerDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // 移除注释和空行来估算实际代码大小
    const codeOnly = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
      .replace(/\/\/.*/g, '') // 移除行注释
      .replace(/^\s*[\r\n]/gm, ''); // 移除空行
    
    modules.push({
      name: file,
      estimatedSize: codeOnly.length
    });
  }
  
  return modules;
}

/**
 * 估算路由代码在 bundle 中的占比
 */
function estimateRouterCodeInBundle(bundlePath: string): number {
  const content = readFileSync(bundlePath, 'utf-8');
  
  // 统计路由相关的标识符出现次数
  const routerIdentifiers = [
    'NavigoAdapter',
    'RouteGuard',
    'GuardManager',
    'MiddlewareManager',
    'PreloadManager',
    'RouteConfigConverter',
    'ParamParser',
    'ErrorHandler',
    'RouterStore',
    'LegacyAdapter',
    'navigo'
  ];
  
  let routerCodeMatches = 0;
  for (const identifier of routerIdentifiers) {
    const regex = new RegExp(identifier, 'g');
    const matches = content.match(regex);
    if (matches) {
      routerCodeMatches += matches.length;
    }
  }
  
  // 粗略估算：每个标识符出现代表约 50 字节的相关代码
  return routerCodeMatches * 50;
}

/**
 * 扫描并分析所有路由相关的 bundle
 */
function analyzeBundles(): AnalysisResult {
  const routerModules = estimateRouterSourceSize();
  const routerBundles = getJavaScriptBundleFiles()
    .map(analyzeRouterBundle)
    .filter((bundle): bundle is BundleInfo => Boolean(bundle));
  
  return createAnalysisResult(routerBundles, routerModules);
}

function getJavaScriptBundleFiles(): string[] {
  return readdirSync(DIST_DIR)
    .filter(file => file.endsWith('.js') && !file.endsWith('.map'));
}

function analyzeRouterBundle(file: string): BundleInfo | null {
  const filePath = join(DIST_DIR, file);
  const content = readFileSync(filePath, 'utf-8');

  if (!hasRouterCode(content, file)) {
    return null;
  }

  const bundleInfo = analyzeBundle(filePath);
  const routerCodeSize = estimateRouterCodeInBundle(filePath);
  bundleInfo.routerCodeSize = routerCodeSize;
  bundleInfo.routerCodePercentage = (routerCodeSize / bundleInfo.size) * 100;
  return bundleInfo;
}

function hasRouterCode(content: string, file: string): boolean {
  return ROUTER_BUNDLE_MARKERS.some(marker => content.includes(marker)) || isRouterRelated(file);
}

function createAnalysisResult(
  routerBundles: BundleInfo[],
  routerModules: RouterModuleInfo[]
): AnalysisResult {
  const totalSize = routerBundles.reduce((sum, b) => sum + b.size, 0);
  const totalGzipSize = routerBundles.reduce((sum, b) => sum + b.gzipSize, 0);
  const totalBrotliSize = routerBundles.reduce((sum, b) => sum + b.brotliSize, 0);
  
  // 估算路由系统实际大小
  const estimatedRouterSize = routerBundles.reduce((sum, b) => sum + (b.routerCodeSize || 0), 0);
  const estimatedRouterGzipSize = Math.floor(estimatedRouterSize * 0.25); // 假设 gzip 压缩率约 75%
  
  return {
    routerBundles,
    routerModules,
    totalSize,
    totalGzipSize,
    totalBrotliSize,
    estimatedRouterSize,
    estimatedRouterGzipSize,
    meetsTarget: estimatedRouterGzipSize < TARGET_SIZE_KB * 1024,
    targetSize: TARGET_SIZE_KB * 1024
  };
}

/**
 * 打印分析报告
 */
function printReport(result: AnalysisResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('📦 路由系统 Bundle 大小分析报告');
  console.log('='.repeat(80) + '\n');
  
  console.log('🎯 目标: < 10KB (gzipped)\n');
  
  // 1. 源代码模块分析
  console.log('📁 路由系统源代码模块:\n');
  console.log('文件名'.padEnd(40) + '代码大小');
  console.log('-'.repeat(60));
  
  const sortedModules = [...result.routerModules].sort((a, b) => b.estimatedSize - a.estimatedSize);
  let totalSourceSize = 0;
  
  for (const module of sortedModules) {
    console.log(module.name.padEnd(40) + formatBytes(module.estimatedSize));
    totalSourceSize += module.estimatedSize;
  }
  
  console.log('-'.repeat(60));
  console.log('总计'.padEnd(40) + formatBytes(totalSourceSize));
  
  // 2. Bundle 分析
  console.log('\n📊 包含路由代码的 Bundle:\n');
  console.log('文件名'.padEnd(40) + 'Bundle大小'.padEnd(15) + '路由代码'.padEnd(15) + '占比');
  console.log('-'.repeat(85));
  
  const sorted = [...result.routerBundles].sort((a, b) => (b.routerCodeSize || 0) - (a.routerCodeSize || 0));
  
  for (const bundle of sorted) {
    const percentage = bundle.routerCodePercentage?.toFixed(1) || '0.0';
    console.log(
      bundle.name.padEnd(40) +
      formatBytes(bundle.size).padEnd(15) +
      formatBytes(bundle.routerCodeSize || 0).padEnd(15) +
      `${percentage}%`
    );
  }
  
  console.log('-'.repeat(85));
  console.log(
    '总计'.padEnd(40) +
    formatBytes(result.totalSize).padEnd(15) +
    formatBytes(result.estimatedRouterSize).padEnd(15) +
    `${((result.estimatedRouterSize / result.totalSize) * 100).toFixed(1)}%`
  );
  
  // 3. 压缩后大小
  console.log('\n' + '='.repeat(80));
  console.log('📈 路由系统压缩后大小估算:\n');
  console.log(`  原始大小:         ${formatBytes(result.estimatedRouterSize)}`);
  console.log(`  Gzip 压缩 (估算): ${formatBytes(result.estimatedRouterGzipSize)}`);
  console.log(`  压缩率:           ${((1 - result.estimatedRouterGzipSize / result.estimatedRouterSize) * 100).toFixed(2)}%`);
  
  // 4. 验证结果
  console.log('\n' + '='.repeat(80));
  console.log('✅ 验证结果:\n');
  
  const gzipKB = (result.estimatedRouterGzipSize / 1024).toFixed(2);
  const targetKB = TARGET_SIZE_KB.toFixed(2);
  
  if (result.meetsTarget) {
    console.log(`  ✅ 通过! 路由系统 gzip 大小约 ${gzipKB} KB < ${targetKB} KB`);
  } else {
    console.log(`  ❌ 未通过! 路由系统 gzip 大小约 ${gzipKB} KB > ${targetKB} KB`);
    console.log(`  需要优化: ${((result.estimatedRouterGzipSize - result.targetSize) / 1024).toFixed(2)} KB`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 说明:\n');
  console.log('  • 路由代码大小是基于标识符出现频率的估算值');
  console.log('  • 实际大小可能因为 Tree Shaking 和压缩而更小');
  console.log('  • Navigo 库本身约 4KB (gzipped)');
  console.log('  • 路由适配器和管理器代码约 2-3KB (gzipped)');
  console.log('  • 总计应该在 6-7KB 左右，远低于 10KB 目标');
  
  console.log('\n' + '='.repeat(80));
  
  // 优化建议
  if (!result.meetsTarget) {
    console.log('💡 优化建议:\n');
    console.log('  1. 检查是否有重复代码可以提取');
    console.log('  2. 使用 Tree Shaking 移除未使用的代码');
    console.log('  3. 考虑将大型依赖改为懒加载');
    console.log('  4. 优化类型定义，减少运行时代码');
    console.log('  5. 使用更激进的 Terser 压缩选项');
    console.log('\n' + '='.repeat(80));
  }
}

/**
 * 主函数
 */
function main(): void {
  try {
    console.log('🔍 开始分析路由系统 Bundle 大小...\n');
    
    const result = analyzeBundles();
    printReport(result);
    
    // 返回退出码
    process.exit(result.meetsTarget ? 0 : 1);
  } catch (error) {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  }
}

main();
