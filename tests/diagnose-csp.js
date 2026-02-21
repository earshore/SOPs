/**
 * CSP诊断脚本
 * 用于检查CSP配置是否正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== CSP配置诊断 ===\n');

// 1. 检查源文件
console.log('1. 检查源文件 index.html:');

const indexPath = path.join(__dirname, '../index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

if (indexContent.includes('Content-Security-Policy')) {
  console.log('❌ 错误: index.html 中仍包含 CSP meta 标签');
  const lines = indexContent.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('Content-Security-Policy')) {
      console.log(`   第 ${i + 1} 行: ${line.trim()}`);
    }
  });
} else {
  console.log('✅ 正确: index.html 中没有 CSP meta 标签');
}

// 2. 检查 public/_headers 文件
console.log('\n2. 检查 public/_headers 文件:');
const headersPath = path.join(__dirname, '../public/_headers');

if (fs.existsSync(headersPath)) {
  console.log('✅ 文件存在: public/_headers');
  const headersContent = fs.readFileSync(headersPath, 'utf-8');
  console.log('   文件内容:');
  console.log('   ---');
  console.log(headersContent.split('\n').map(l => '   ' + l).join('\n'));
  console.log('   ---');
  
  if (headersContent.includes('Content-Security-Policy')) {
    console.log('✅ 包含 CSP 配置');
  } else {
    console.log('❌ 错误: 未找到 CSP 配置');
  }
} else {
  console.log('❌ 错误: public/_headers 文件不存在');
}

// 3. 检查构建输出
console.log('\n3. 检查构建输出 dist/index.html:');
const distIndexPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(distIndexPath)) {
  console.log('✅ 文件存在: dist/index.html');
  const distIndexContent = fs.readFileSync(distIndexPath, 'utf-8');
  
  if (distIndexContent.includes('Content-Security-Policy')) {
    console.log('❌ 错误: dist/index.html 中仍包含 CSP meta 标签');
    const lines = distIndexContent.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('Content-Security-Policy')) {
        console.log(`   第 ${i + 1} 行: ${line.trim()}`);
      }
    });
  } else {
    console.log('✅ 正确: dist/index.html 中没有 CSP meta 标签');
  }
} else {
  console.log('⚠️  警告: dist/index.html 不存在 (可能未构建)');
}

// 4. 检查 dist/_headers
console.log('\n4. 检查 dist/_headers:');
const distHeadersPath = path.join(__dirname, '../dist/_headers');

if (fs.existsSync(distHeadersPath)) {
  console.log('✅ 文件存在: dist/_headers');
  const distHeadersContent = fs.readFileSync(distHeadersPath, 'utf-8');
  
  if (distHeadersContent.includes('Content-Security-Policy')) {
    console.log('✅ 包含 CSP 配置');
  } else {
    console.log('❌ 错误: 未找到 CSP 配置');
  }
} else {
  console.log('❌ 错误: dist/_headers 文件不存在');
}

// 5. 检查 Vite 配置
console.log('\n5. 检查 Vite 配置:');
const viteConfigPath = path.join(__dirname, '../vite.config.js');

if (fs.existsSync(viteConfigPath)) {
  console.log('✅ vite.config.js 存在');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  
  if (viteConfig.includes('publicDir')) {
    console.log('⚠️  注意: vite.config.js 中配置了 publicDir');
  } else {
    console.log('✅ 使用默认 public 目录');
  }
} else {
  console.log('❌ 错误: vite.config.js 不存在');
}

console.log('\n=== 诊断完成 ===');
console.log('\n建议操作:');
console.log('1. 如果 index.html 或 dist/index.html 中仍有 CSP meta 标签,需要重新构建');
console.log('2. 如果 dist/_headers 不存在,检查 Vite 是否正确复制 public 目录');
console.log('3. 部署到 Cloudflare 后,检查响应头是否包含 CSP');
console.log('4. 使用浏览器开发者工具 Network 标签查看响应头');
