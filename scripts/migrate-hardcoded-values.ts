#!/usr/bin/env node
/**
 * 硬编码值迁移工具
 * 自动将CSS中的硬编码颜色、时长、缓动函数等替换为设计令牌
 */

import * as fs from 'fs';
import glob from 'glob';

// 颜色映射表
const COLOR_MAPPINGS: Record<string, string> = {
  // 绿色系
  '#dcfce7': 'var(--color-green-100)',
  '#16a34a': 'var(--color-green-600)',
  '#15803d': 'var(--color-green-700)',
  '#86efac': 'var(--color-green-300)',
  '#f0fdf4': 'var(--color-green-50)',
  
  // 黄色/琥珀色系
  '#fef3c7': 'var(--color-amber-100)',
  '#d97706': 'var(--color-amber-600)',
  '#fffbeb': 'var(--color-amber-50)',
  '#f59e0b': 'var(--color-amber-500)',
  
  // 蓝色系
  '#e0e7ff': 'var(--color-indigo-100)',
  '#4f46e5': 'var(--color-indigo-600)',
  '#dbeafe': 'var(--color-blue-100)',
  '#1d4ed8': 'var(--color-blue-700)',
  '#93c5fd': 'var(--color-blue-300)',
  '#3b82f6': 'var(--color-blue-500)',
  '#2563eb': 'var(--color-blue-600)',
  
  // 紫色系
  '#f3e8ff': 'var(--color-purple-100)',
  '#7c3aed': 'var(--color-purple-600)',
  
  // 橙色系
  '#ffedd5': 'var(--color-orange-100)',
  '#ea580c': 'var(--color-orange-600)',
  '#f97316': 'var(--color-orange-500)',
  
  // 灰色系
  '#e2e8f0': 'var(--color-slate-200)',
  '#64748b': 'var(--color-slate-500)',
  '#1e293b': 'var(--color-slate-800)',
  '#94a3b8': 'var(--color-slate-400)',
  '#f8fafc': 'var(--color-slate-50)',
  '#cbd5e1': 'var(--color-slate-300)',
  
  // RGBA 颜色
  'rgba(59, 130, 246, 0.2)': 'var(--color-primary-light)',
  'rgba(59, 130, 246, 0.1)': 'var(--color-primary-light)',
  'rgba(0, 0, 0, 0.1)': 'var(--color-black-alpha-10)',
  'rgba(0, 0, 0, 0.05)': 'var(--color-black-alpha-5)',
  'rgba(0, 0, 0, 0.04)': 'var(--color-black-alpha-5)',
  'rgba(0, 0, 0, 0.06)': 'var(--color-black-alpha-5)',
  'rgba(0, 0, 0, 0.08)': 'var(--color-black-alpha-10)',
  'rgba(0, 0, 0, 0.15)': 'var(--color-black-alpha-20)',
  'rgba(226, 232, 240, 0.8)': 'var(--color-slate-200)',
};

// 动画时长映射
const DURATION_MAPPINGS: Record<string, string> = {
  '0.2s': 'var(--duration-fast)',
  '200ms': 'var(--duration-fast)',
  '0.3s': 'var(--duration-normal)',
  '300ms': 'var(--duration-normal)',
  '0.35s': 'var(--duration-normal)',
  '350ms': 'var(--duration-normal)',
  '0.4s': 'var(--duration-slow)',
  '400ms': 'var(--duration-slow)',
  '0.5s': 'var(--duration-slower)',
  '500ms': 'var(--duration-slower)',
  '2s': 'var(--duration-2s)',
  '2000ms': 'var(--duration-2s)',
};

// 缓动函数映射
const EASING_MAPPINGS: Record<string, string> = {
  'cubic-bezier(0.4, 0, 0.2, 1)': 'var(--ease-in-out)',
  'cubic-bezier(0, 0, 0.2, 1)': 'var(--ease-out)',
  'cubic-bezier(0.25, 0.8, 0.25, 1)': 'var(--ease-smooth)',
  'cubic-bezier(0.34, 1.56, 0.64, 1)': 'var(--ease-spring)',
  'cubic-bezier(0.68, -0.55, 0.265, 1.55)': 'var(--ease-bounce)',
  'ease-out': 'var(--ease-out)',
  'ease-in-out': 'var(--ease-in-out)',
};

// 阴影映射（常见的硬编码阴影值）
const SHADOW_MAPPINGS: Record<string, string> = {
  '0 1px 2px 0 rgba(0, 0, 0, 0.05)': 'var(--shadow-sm)',
  '0 1px 3px 0 rgba(0, 0, 0, 0.05)': 'var(--shadow-sm)',
  '0 1px 3px 0 rgba(0, 0, 0, 0.04)': 'var(--shadow-sm)',
  '0 4px 6px -1px rgba(0, 0, 0, 0.05)': 'var(--shadow-sm)',
  '0 4px 12px -2px rgba(0, 0, 0, 0.08)': 'var(--shadow-md)',
  '0 2px 8px -2px rgba(0, 0, 0, 0.06)': 'var(--shadow-sm)',
  '0 20px 40px -12px rgba(0, 0, 0, 0.15)': 'var(--shadow-xl)',
};

// 圆角映射
const BORDER_RADIUS_MAPPINGS: Record<string, string> = {
  '2px': 'var(--rounded-sm)',
  '4px': 'var(--rounded)',
  '6px': 'var(--rounded-md)',
  '8px': 'var(--rounded-lg)',
  '10px': 'var(--rounded-lg)',
  '12px': 'var(--rounded-xl)',
  '16px': 'var(--rounded-2xl)',
  '0.5rem': 'var(--rounded-lg)',
  '0.75rem': 'var(--rounded-xl)',
  '1rem': 'var(--rounded-2xl)',
};

interface MigrationResult {
  file: string;
  changes: number;
  colorChanges: number;
  durationChanges: number;
  easingChanges: number;
  radiusChanges: number;
  shadowChanges: number;
}

class HardcodedValueMigrator {
  private results: MigrationResult[] = [];
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  /**
   * 迁移指定文件
   */
  async migrateFile(filePath: string): Promise<MigrationResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;
    let totalChanges = 0;
    let colorChanges = 0;
    let durationChanges = 0;
    let easingChanges = 0;
    let radiusChanges = 0;
    let shadowChanges = 0;

    // 替换颜色
    for (const [oldValue, newValue] of Object.entries(COLOR_MAPPINGS)) {
      const regex = new RegExp(oldValue.replace(/[()]/g, '\\$&'), 'gi');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, newValue);
        colorChanges += matches;
        totalChanges += matches;
      }
    }

    // 替换动画时长
    for (const [oldValue, newValue] of Object.entries(DURATION_MAPPINGS)) {
      const regex = new RegExp(`\\b${oldValue}\\b`, 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, newValue);
        durationChanges += matches;
        totalChanges += matches;
      }
    }

    // 替换缓动函数
    for (const [oldValue, newValue] of Object.entries(EASING_MAPPINGS)) {
      const regex = new RegExp(oldValue.replace(/[().,\s]/g, '\\$&'), 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, newValue);
        easingChanges += matches;
        totalChanges += matches;
      }
    }

    // 替换阴影值（在 box-shadow 属性中）
    for (const [oldValue, newValue] of Object.entries(SHADOW_MAPPINGS)) {
      const escapedValue = oldValue.replace(/[().,\s]/g, '\\$&');
      const regex = new RegExp(`(box-shadow:\\s*)${escapedValue}`, 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, `$1${newValue}`);
        shadowChanges += matches;
        totalChanges += matches;
      }
    }

    // 替换圆角（只在 border-radius 属性中）
    for (const [oldValue, newValue] of Object.entries(BORDER_RADIUS_MAPPINGS)) {
      const regex = new RegExp(`(border-radius:\\s*)${oldValue}`, 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, `$1${newValue}`);
        radiusChanges += matches;
        totalChanges += matches;
      }
    }

    // 如果不是 dry run，写入文件
    if (!this.dryRun && totalChanges > 0) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }

    const result: MigrationResult = {
      file: filePath,
      changes: totalChanges,
      colorChanges,
      durationChanges,
      easingChanges,
      radiusChanges,
      shadowChanges,
    };

    this.results.push(result);
    return result;
  }

  /**
   * 迁移多个文件
   */
  async migrateFiles(pattern: string): Promise<void> {
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(pattern, { ignore: 'node_modules/**' }, (err: Error | null, matches: string[]) => {
        if (err) reject(err);
        else resolve(matches);
      });
    });
    
    console.log(`\n🔍 找到 ${files.length} 个文件\n`);

    for (const file of files) {
      const result = await this.migrateFile(file);
      
      if (result.changes > 0) {
        console.log(`✏️  ${file}`);
        console.log(`   总计: ${result.changes} 处修改`);
        if (result.colorChanges > 0) {
          console.log(`   - 颜色: ${result.colorChanges} 处`);
        }
        if (result.durationChanges > 0) {
          console.log(`   - 时长: ${result.durationChanges} 处`);
        }
        if (result.easingChanges > 0) {
          console.log(`   - 缓动: ${result.easingChanges} 处`);
        }
        if (result.shadowChanges > 0) {
          console.log(`   - 阴影: ${result.shadowChanges} 处`);
        }
        if (result.radiusChanges > 0) {
          console.log(`   - 圆角: ${result.radiusChanges} 处`);
        }
        console.log();
      }
    }
  }

  /**
   * 打印总结报告
   */
  printSummary(): void {
    const filesWithChanges = this.results.filter(r => r.changes > 0);
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes, 0);
    const totalColorChanges = this.results.reduce((sum, r) => sum + r.colorChanges, 0);
    const totalDurationChanges = this.results.reduce((sum, r) => sum + r.durationChanges, 0);
    const totalEasingChanges = this.results.reduce((sum, r) => sum + r.easingChanges, 0);
    const totalShadowChanges = this.results.reduce((sum, r) => sum + r.shadowChanges, 0);
    const totalRadiusChanges = this.results.reduce((sum, r) => sum + r.radiusChanges, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 迁移总结');
    console.log('='.repeat(60));
    console.log(`模式: ${this.dryRun ? '预览模式 (Dry Run)' : '执行模式'}`);
    console.log(`修改文件: ${filesWithChanges.length} 个`);
    console.log(`总计修改: ${totalChanges} 处`);
    console.log(`  - 颜色: ${totalColorChanges} 处`);
    console.log(`  - 时长: ${totalDurationChanges} 处`);
    console.log(`  - 缓动: ${totalEasingChanges} 处`);
    console.log(`  - 阴影: ${totalShadowChanges} 处`);
    console.log(`  - 圆角: ${totalRadiusChanges} 处`);
    console.log('='.repeat(60) + '\n');

    if (this.dryRun && totalChanges > 0) {
      console.log('💡 提示: 使用 --apply 参数执行实际修改\n');
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const targetPattern = args.find(arg => !arg.startsWith('--')) || 'src/modules/**/*_style.css';

  console.log('\n🚀 硬编码值迁移工具\n');
  
  if (dryRun) {
    console.log('⚠️  预览模式 - 不会修改文件');
    console.log('   使用 --apply 参数执行实际修改\n');
  } else {
    console.log('✅ 执行模式 - 将修改文件\n');
  }

  const migrator = new HardcodedValueMigrator(dryRun);
  await migrator.migrateFiles(targetPattern);
  migrator.printSummary();
}

main().catch(console.error);
