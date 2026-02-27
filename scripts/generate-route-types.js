#!/usr/bin/env node

/**
 * generate-route-types.js - 自动生成路由 ID 类型
 * 
 * 从 MENU_CONFIG 中提取所有路由 ID，生成 TypeScript 类型定义
 * 
 * 使用方法：
 *   node scripts/generate-route-types.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const CONFIG = {
  menuConfigPath: resolve(__dirname, '../src/common/config/menuConfig.ts'),
  outputPath: resolve(__dirname, '../src/common/router/navigo/route-ids.ts'),
};

/**
 * 从 menuConfig.ts 中提取路由 ID
 */
function extractRouteIds(content) {
  const routeIds = [];
  
  // 匹配 routes 对象中的所有键
  // 例如：[SYSTEM_ROUTES.HOME]: { ... }
  const routeKeyRegex = /\[([A-Z_]+\.[\w_]+)\]:\s*\{/g;
  let match;
  
  while ((match = routeKeyRegex.exec(content)) !== null) {
    routeIds.push(match[1]);
  }
  
  // 去重并排序
  return [...new Set(routeIds)].sort();
}

/**
 * 从常量文件中提取实际的路由 ID 值
 */
function extractRouteValues(content) {
  const routeValues = new Map();
  
  // 匹配常量定义
  // 例如：HOME: 'home',
  const constantRegex = /(\w+):\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = constantRegex.exec(content)) !== null) {
    routeValues.set(match[1], match[2]);
  }
  
  return routeValues;
}

/**
 * 读取路由常量文件
 */
function readRouteConstants() {
  const constantsPath = resolve(__dirname, '../src/common/constants/routes.ts');
  const content = readFileSync(constantsPath, 'utf-8');
  
  const values = new Map();
  
  // 提取所有导出的常量对象
  const objectRegex = /export const (\w+_ROUTES) = \{([^}]+)\}/gs;
  let match;
  
  while ((match = objectRegex.exec(content)) !== null) {
    const objectName = match[1];
    const objectContent = match[2];
    
    // 提取对象内的键值对
    const kvRegex = /(\w+):\s*['"]([^'"]+)['"]/g;
    let kvMatch;
    
    while ((kvMatch = kvRegex.exec(objectContent)) !== null) {
      const fullKey = `${objectName}.${kvMatch[1]}`;
      values.set(fullKey, kvMatch[2]);
    }
  }
  
  return values;
}

/**
 * 生成 TypeScript 类型定义
 */
function generateTypeDefinition(routeIds, routeValues) {
  const timestamp = new Date().toISOString();
  
  // 生成联合类型
  const routeIdValues = routeIds
    .map(id => {
      const value = routeValues.get(id);
      return value ? `  | '${value}'` : null;
    })
    .filter(Boolean)
    .join('\n');
  
  // 生成常量数组
  const routeIdArray = routeIds
    .map(id => {
      const value = routeValues.get(id);
      return value ? `  '${value}'` : null;
    })
    .filter(Boolean)
    .join(',\n');
  
  return `/**
 * route-ids.ts - 自动生成的路由 ID 类型定义
 * 
 * ⚠️ 此文件由脚本自动生成，请勿手动编辑
 * 生成时间: ${timestamp}
 * 生成脚本: scripts/generate-route-types.js
 * 
 * 使用方法：
 *   import type { RouteId } from '@router/navigo/route-ids';
 *   
 *   function navigate(routeId: RouteId) {
 *     // routeId 会有类型提示和检查
 *   }
 */

/**
 * 所有可用的路由 ID（联合类型）
 * 
 * 此类型包含了系统中所有已定义的路由 ID
 * 使用此类型可以获得 IDE 的智能提示和类型检查
 */
export type RouteId =
${routeIdValues};

/**
 * 所有路由 ID 的数组（用于运行时检查）
 */
export const ALL_ROUTE_IDS: readonly RouteId[] = [
${routeIdArray}
] as const;

/**
 * 检查给定的字符串是否为有效的路由 ID
 * 
 * @param id - 要检查的字符串
 * @returns 如果是有效的路由 ID 则返回 true
 * 
 * @example
 * \`\`\`typescript
 * if (isValidRouteId('home')) {
 *   // 类型安全的路由 ID
 * }
 * \`\`\`
 */
export function isValidRouteId(id: string): id is RouteId {
  return (ALL_ROUTE_IDS as readonly string[]).includes(id);
}

/**
 * 断言给定的字符串是有效的路由 ID
 * 
 * @param id - 要检查的字符串
 * @throws {Error} 如果不是有效的路由 ID
 * 
 * @example
 * \`\`\`typescript
 * assertValidRouteId('home'); // OK
 * assertValidRouteId('invalid'); // 抛出错误
 * \`\`\`
 */
export function assertValidRouteId(id: string): asserts id is RouteId {
  if (!isValidRouteId(id)) {
    throw new Error(\`Invalid route ID: "\${id}". Must be one of: \${ALL_ROUTE_IDS.join(', ')}\`);
  }
}

/**
 * 路由 ID 统计信息
 */
export const ROUTE_ID_STATS = {
  /** 路由总数 */
  total: ALL_ROUTE_IDS.length,
  /** 生成时间 */
  generatedAt: '${timestamp}',
} as const;
`;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🔄 开始生成路由 ID 类型...\n');
    
    // 1. 读取 menuConfig.ts
    console.log('📖 读取 menuConfig.ts...');
    const menuConfigContent = readFileSync(CONFIG.menuConfigPath, 'utf-8');
    
    // 2. 提取路由 ID
    console.log('🔍 提取路由 ID...');
    const routeIds = extractRouteIds(menuConfigContent);
    console.log(`   找到 ${routeIds.length} 个路由 ID`);
    
    // 3. 读取路由常量值
    console.log('📖 读取路由常量值...');
    const routeValues = readRouteConstants();
    console.log(`   找到 ${routeValues.size} 个路由值`);
    
    // 4. 生成类型定义
    console.log('✍️  生成类型定义...');
    const typeDefinition = generateTypeDefinition(routeIds, routeValues);
    
    // 5. 写入文件
    console.log('💾 写入文件...');
    writeFileSync(CONFIG.outputPath, typeDefinition, 'utf-8');
    
    console.log('\n✅ 路由 ID 类型生成成功！');
    console.log(`   输出文件: ${CONFIG.outputPath}`);
    console.log(`   路由总数: ${routeIds.length}`);
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    process.exit(1);
  }
}

// 执行
main();
