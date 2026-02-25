/**
 * QA Lab 模块诊断脚本
 * 检查模块是否正确加载和配置
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 QA Lab 模块诊断\n');
console.log('='.repeat(60));

// 1. 检查核心文件是否存在
console.log('\n1. 检查核心文件:');
const files = [
    'src/modules/app_center/views/master_analysis/qalab/index.ts',
    'src/modules/app_center/views/master_analysis/qalab/actions.ts',
    'src/modules/app_center/views/master_analysis/qalab/template.html',
    'src/modules/app_center/views/master_analysis/qalab/qalab.css',
    'src/modules/app_center/views/master_analysis/qalab/rufusSimulator.ts',
    'src/modules/app_center/views/master_analysis/qalab/state.ts',
    'src/modules/app_center/views/master_analysis/qalab/qaData.ts'
];

files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 2. 检查 template.html 中的 Rufus 模拟器部分
console.log('\n2. 检查模板内容:');
const templatePath = 'src/modules/app_center/views/master_analysis/qalab/template.html';
if (fs.existsSync(templatePath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    const hasRufusSection = template.includes('rufus-simulator-section');
    const hasRufusInput = template.includes('rufusInput');
    const hasRufusMessages = template.includes('rufusMessages');
    
    console.log(`${hasRufusSection ? '✅' : '❌'} Rufus 模拟器区域`);
    console.log(`${hasRufusInput ? '✅' : '❌'} Rufus 输入框`);
    console.log(`${hasRufusMessages ? '✅' : '❌'} Rufus 消息容器`);
}

// 3. 检查 CSS 样式
console.log('\n3. 检查 CSS 样式:');
const cssPath = 'src/modules/app_center/views/master_analysis/qalab/qalab.css';
if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf-8');
    const hasRufusStyles = css.includes('.rufus-simulator-section');
    const hasRufusMessage = css.includes('.rufus-message');
    const hasRufusInput = css.includes('.rufus-input');
    
    console.log(`${hasRufusStyles ? '✅' : '❌'} Rufus 模拟器样式`);
    console.log(`${hasRufusMessage ? '✅' : '❌'} Rufus 消息样式`);
    console.log(`${hasRufusInput ? '✅' : '❌'} Rufus 输入框样式`);
}

// 4. 检查 actions.ts 中的函数
console.log('\n4. 检查 Actions 函数:');
const actionsPath = 'src/modules/app_center/views/master_analysis/qalab/actions.ts';
if (fs.existsSync(actionsPath)) {
    const actions = fs.readFileSync(actionsPath, 'utf-8');
    const hasAutoLoad = actions.includes('autoLoadAnalysisReport');
    const hasSendRufus = actions.includes('sendRufusQuestion');
    const hasClearRufus = actions.includes('clearRufusChat');
    const hasRenderRufus = actions.includes('renderRufusMessages');
    
    console.log(`${hasAutoLoad ? '✅' : '❌'} autoLoadAnalysisReport 函数`);
    console.log(`${hasSendRufus ? '✅' : '❌'} sendRufusQuestion 函数`);
    console.log(`${hasClearRufus ? '✅' : '❌'} clearRufusChat 函数`);
    console.log(`${hasRenderRufus ? '✅' : '❌'} renderRufusMessages 函数`);
}

// 5. 检查 index.ts 中的注册
console.log('\n5. 检查函数注册:');
const indexPath = 'src/modules/app_center/views/master_analysis/qalab/index.ts';
if (fs.existsSync(indexPath)) {
    const index = fs.readFileSync(indexPath, 'utf-8');
    const hasRufusImport = index.includes('sendRufusQuestion');
    const hasRufusAction = index.includes('amz_qalab_sendRufusQuestion');
    const hasClearAction = index.includes('amz_qalab_clearRufusChat');
    const hasEventListener = index.includes('rufusInput');
    
    console.log(`${hasRufusImport ? '✅' : '❌'} 导入 Rufus 函数`);
    console.log(`${hasRufusAction ? '✅' : '❌'} 注册发送问题操作`);
    console.log(`${hasClearAction ? '✅' : '❌'} 注册清空对话操作`);
    console.log(`${hasEventListener ? '✅' : '❌'} 注册回车键监听`);
}

// 6. 检查 rufusSimulator.ts
console.log('\n6. 检查 Rufus 模拟器:');
const simulatorPath = 'src/modules/app_center/views/master_analysis/qalab/rufusSimulator.ts';
if (fs.existsSync(simulatorPath)) {
    const simulator = fs.readFileSync(simulatorPath, 'utf-8');
    const hasClass = simulator.includes('class RufusSimulator');
    const hasGenerate = simulator.includes('generateAnswer');
    const hasExport = simulator.includes('export const rufusSimulator');
    
    console.log(`${hasClass ? '✅' : '❌'} RufusSimulator 类`);
    console.log(`${hasGenerate ? '✅' : '❌'} generateAnswer 方法`);
    console.log(`${hasExport ? '✅' : '❌'} 导出实例`);
}

// 7. 建议
console.log('\n' + '='.repeat(60));
console.log('\n📋 诊断建议:\n');
console.log('如果所有检查都通过但界面未更新，请尝试:');
console.log('1. 清除浏览器缓存 (Ctrl+Shift+Delete)');
console.log('2. 硬刷新页面 (Ctrl+F5 或 Ctrl+Shift+R)');
console.log('3. 重启开发服务器 (npm run dev)');
console.log('4. 检查浏览器控制台是否有错误信息');
console.log('5. 确认已切换到 QA Lab 标签页');
console.log('\n如果问题仍然存在，请检查:');
console.log('- 浏览器开发者工具 Network 标签，确认 template.html 和 qalab.css 已加载');
console.log('- 浏览器开发者工具 Console 标签，查看是否有 JavaScript 错误');
console.log('- 确认模块路由配置正确');

console.log('\n✨ 诊断完成!\n');
