#!/usr/bin/env tsx
/**
 * 代码质量进度跟踪脚本
 * 
 * 功能:
 * - 运行 ESLint 并统计问题数量
 * - 对比历史数据显示改进趋势
 * - 生成进度报告
 * 
 * 使用方法:
 * npm run quality:track
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface QualityMetrics {
  timestamp: string;
  date: string;
  totalProblems: number;
  errors: number;
  warnings: number;
  consoleStatements: number;
  anyTypes: number;
  complexFunctions: number;
  localStorage: number;
}

interface HistoryData {
  baseline: QualityMetrics;
  history: QualityMetrics[];
}

const HISTORY_FILE = 'tests/quality/quality-progress-history.json';
const REPORT_FILE = 'tests/quality/quality-progress-report.txt';

function runLint(): string {
  try {
    execSync('npm run lint', { encoding: 'utf-8' });
    return '';
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

function parseMetrics(lintOutput: string): Omit<QualityMetrics, 'timestamp' | 'date'> {
  const lines = lintOutput.split('\n');
  
  // 统计总问题数
  const summaryLine = lines.find(line => line.includes('problems'));
  let totalProblems = 0;
  let errors = 0;
  let warnings = 0;
  
  if (summaryLine) {
    const match = summaryLine.match(/✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
    if (match) {
      totalProblems = parseInt(match[1]);
      errors = parseInt(match[2]);
      warnings = parseInt(match[3]);
    }
  }
  
  // 统计 console 语句
  const consoleStatements = (lintOutput.match(/no-console/g) || []).length;
  
  // 统计 any 类型
  const anyTypes = (lintOutput.match(/no-explicit-any/g) || []).length;
  
  // 统计复杂函数
  const complexFunctions = (lintOutput.match(/complexity/g) || []).length;
  
  // 统计 localStorage
  const localStorage = (lintOutput.match(/no-restricted-globals/g) || []).length;
  
  return {
    totalProblems,
    errors,
    warnings,
    consoleStatements,
    anyTypes,
    complexFunctions,
    localStorage,
  };
}

function loadHistory(): HistoryData | null {
  if (!existsSync(HISTORY_FILE)) {
    return null;
  }
  
  try {
    const content = readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function saveHistory(data: HistoryData): void {
  writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

function generateReport(current: QualityMetrics, history: HistoryData | null): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('代码质量进度报告');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`生成时间: ${current.date}`);
  lines.push('');
  
  // 当前指标
  lines.push('📊 当前指标');
  lines.push('-'.repeat(60));
  lines.push(`总问题数:        ${current.totalProblems.toString().padStart(6)}`);
  lines.push(`  错误:          ${current.errors.toString().padStart(6)}`);
  lines.push(`  警告:          ${current.warnings.toString().padStart(6)}`);
  lines.push(`Console 语句:    ${current.consoleStatements.toString().padStart(6)}`);
  lines.push(`any 类型:        ${current.anyTypes.toString().padStart(6)}`);
  lines.push(`复杂函数:        ${current.complexFunctions.toString().padStart(6)}`);
  lines.push(`localStorage:    ${current.localStorage.toString().padStart(6)}`);
  lines.push('');
  
  // 对比基线
  if (history && history.baseline) {
    const baseline = history.baseline;
    lines.push('📈 相比基线的改进');
    lines.push('-'.repeat(60));
    
    const improvements = [
      { name: '总问题数', current: current.totalProblems, baseline: baseline.totalProblems },
      { name: '错误', current: current.errors, baseline: baseline.errors },
      { name: '警告', current: current.warnings, baseline: baseline.warnings },
      { name: 'Console', current: current.consoleStatements, baseline: baseline.consoleStatements },
      { name: 'any 类型', current: current.anyTypes, baseline: baseline.anyTypes },
      { name: '复杂函数', current: current.complexFunctions, baseline: baseline.complexFunctions },
      { name: 'localStorage', current: current.localStorage, baseline: baseline.localStorage },
    ];
    
    improvements.forEach(({ name, current, baseline }) => {
      const diff = current - baseline;
      const percent = baseline > 0 ? ((diff / baseline) * 100).toFixed(1) : '0.0';
      const arrow = diff < 0 ? '↓' : diff > 0 ? '↑' : '→';
      const sign = diff > 0 ? '+' : '';
      
      lines.push(
        `${name.padEnd(15)} ${arrow} ${sign}${diff.toString().padStart(5)} (${sign}${percent}%)`
      );
    });
    
    lines.push('');
    lines.push(`基线日期: ${baseline.date}`);
    lines.push('');
  }
  
  // 目标进度
  lines.push('🎯 目标进度');
  lines.push('-'.repeat(60));
  
  const targets = [
    { name: '总问题数', current: current.totalProblems, target: 500, phase: '最终' },
    { name: '错误数', current: current.errors, target: 200, phase: '最终' },
    { name: '警告数', current: current.warnings, target: 300, phase: '最终' },
    { name: 'Console', current: current.consoleStatements, target: 50, phase: '阶段1' },
    { name: 'localStorage', current: current.localStorage, target: 0, phase: '阶段1' },
  ];
  
  targets.forEach(({ name, current, target, phase }) => {
    const progress = target > 0 ? Math.min(100, ((1 - current / target) * 100)) : 100;
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    
    lines.push(
      `${name.padEnd(15)} [${bar}] ${progress.toFixed(0)}% (${phase})`
    );
  });
  
  lines.push('');
  
  // 趋势分析
  if (history && history.history.length > 1) {
    lines.push('📉 趋势分析（最近 5 次）');
    lines.push('-'.repeat(60));
    
    const recent = history.history.slice(-5);
    lines.push('日期'.padEnd(12) + '总问题'.padStart(8) + '错误'.padStart(8) + '警告'.padStart(8));
    lines.push('-'.repeat(60));
    
    recent.forEach(record => {
      const date = record.date.split(' ')[0];
      lines.push(
        date.padEnd(12) +
        record.totalProblems.toString().padStart(8) +
        record.errors.toString().padStart(8) +
        record.warnings.toString().padStart(8)
      );
    });
    
    lines.push('');
  }
  
  // 下一步建议
  lines.push('💡 下一步建议');
  lines.push('-'.repeat(60));
  
  if (current.localStorage > 0) {
    lines.push('🔴 紧急: 修复 localStorage 直接访问（安全问题）');
  }
  
  if (current.consoleStatements > 400) {
    lines.push('⚠️  高优先级: 替换 console 语句为 loggerService');
  }
  
  if (current.complexFunctions > 10) {
    lines.push('📝 中优先级: 降低函数复杂度');
  }
  
  if (current.anyTypes > 250) {
    lines.push('📝 中优先级: 减少 any 类型使用');
  }
  
  lines.push('');
  lines.push('查看详细计划: docs/archive/kiro-2026-h1/specs/code-quality-improvement/plan.md');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

function main() {
  console.log('🔍 运行代码质量检查...\n');
  
  // 运行 lint
  const lintOutput = runLint();
  
  // 解析指标
  const metrics = parseMetrics(lintOutput);
  const now = new Date();
  const current: QualityMetrics = {
    ...metrics,
    timestamp: now.toISOString(),
    date: now.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
  };
  
  // 加载历史数据
  let history = loadHistory();
  
  // 如果是第一次运行，设置基线
  if (!history) {
    history = {
      baseline: current,
      history: [current],
    };
    console.log('✅ 已设置基线数据\n');
  } else {
    history.history.push(current);
    console.log('✅ 已更新历史数据\n');
  }
  
  // 保存历史
  saveHistory(history);
  
  // 生成报告
  const report = generateReport(current, history);
  
  // 保存报告
  writeFileSync(REPORT_FILE, report);
  
  // 输出报告
  console.log(report);
  
  console.log(`\n📄 报告已保存到: ${REPORT_FILE}`);
  console.log(`📊 历史数据已保存到: ${HISTORY_FILE}`);
}

main();
