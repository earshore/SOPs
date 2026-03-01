#!/usr/bin/env node
/**
 * 修复CSS语法错误工具
 * 修复错误的var()嵌套和遗漏的硬编码值
 */

import * as fs from 'fs';
import glob from 'glob';

interface FixResult {
  file: string;
  changes: number;
  varSyntaxFixes: number;
  cubicBezierFixes: number;
  durationFixes: number;
  rgbaFixes: number;
}

class CssSyntaxFixer {
  private results: FixResult[] = [];
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  async fixFile(filePath: string): Promise<FixResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;
    let totalChanges = 0;
    let varSyntaxFixes = 0;
    let cubicBezierFixes = 0;
    let durationFixes = 0;
    let rgbaFixes = 0;

    // 1. 修复 var(--duration-var(--duration-2s)) -> var(--duration-2s)
    const varDurationMatches = (newContent.match(/var\(--duration-var\(--duration-2s\)\)/g) || []).length;
    if (varDurationMatches > 0) {
      newContent = newContent.replace(/var\(--duration-var\(--duration-2s\)\)/g, 'var(--duration-2s)');
      varSyntaxFixes += varDurationMatches;
      totalChanges += varDurationMatches;
    }

    // 2. 修复 var(--var(--ease-in-out)) -> var(--ease-in-out)
    const varEaseMatches = (newContent.match(/var\(--var\(--ease-[^)]+\)\)/g) || []).length;
    if (varEaseMatches > 0) {
      newContent = newContent.replace(/var\(--var\((--ease-[^)]+)\)\)/g, 'var($1)');
      varSyntaxFixes += varEaseMatches;
      totalChanges += varEaseMatches;
    }

    // 3. 修复 cubic-bezier(0.22, 1, 0.36, 1) -> var(--ease-smooth)
    const cubicBezierMatches = (newContent.match(/cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/g) || []).length;
    if (cubicBezierMatches > 0) {
      newContent = newContent.replace(/cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/g, 'var(--ease-smooth)');
      cubicBezierFixes += cubicBezierMatches;
      totalChanges += cubicBezierMatches;
    }

    // 4. 修复 0.25s -> var(--duration-fast) (仅在transition中)
    const duration25Matches = (newContent.match(/transition:\s*[^;]*\b0\.25s\b/g) || []).length;
    if (duration25Matches > 0) {
      newContent = newContent.replace(/(\btransition:\s*[^;]*)\b0\.25s\b/g, '$1var(--duration-fast)');
      durationFixes += duration25Matches;
      totalChanges += duration25Matches;
    }

    // 5. 修复 0.6s -> var(--duration-slower)
    const duration6Matches = (newContent.match(/\b0\.6s\b/g) || []).length;
    if (duration6Matches > 0) {
      newContent = newContent.replace(/\b0\.6s\b/g, 'var(--duration-slower)');
      durationFixes += duration6Matches;
      totalChanges += duration6Matches;
    }

    // 6. 修复 0.8s -> var(--duration-slower)
    const duration8Matches = (newContent.match(/\b0\.8s\b/g) || []).length;
    if (duration8Matches > 0) {
      newContent = newContent.replace(/\b0\.8s\b/g, 'var(--duration-slower)');
      durationFixes += duration8Matches;
      totalChanges += duration8Matches;
    }

    // 7. 修复 0.4s -> var(--duration-slow)
    const duration4Matches = (newContent.match(/\b0\.4s\b/g) || []).length;
    if (duration4Matches > 0) {
      newContent = newContent.replace(/\b0\.4s\b/g, 'var(--duration-slow)');
      durationFixes += duration4Matches;
      totalChanges += duration4Matches;
    }

    // 8. 修复 1.5s -> var(--duration-2s) (最接近的值)
    const duration15Matches = (newContent.match(/\b1\.5s\b/g) || []).length;
    if (duration15Matches > 0) {
      newContent = newContent.replace(/\b1\.5s\b/g, 'var(--duration-2s)');
      durationFixes += duration15Matches;
      totalChanges += duration15Matches;
    }

    // 9. 修复 12s -> 保持不变（特殊动画时长）
    // 10. 修复 3s -> 保持不变（特殊动画时长）
    // 11. 修复 2.5s -> var(--duration-2s)
    const duration25sMatches = (newContent.match(/\b2\.5s\b/g) || []).length;
    if (duration25sMatches > 0) {
      newContent = newContent.replace(/\b2\.5s\b/g, 'var(--duration-2s)');
      durationFixes += duration25sMatches;
      totalChanges += duration25sMatches;
    }

    // 12. 修复 4s -> 保持不变（特殊动画时长）

    // 13. 修复特定的rgba值
    const rgbaReplacements: Record<string, string> = {
      'rgba(248, 250, 252, 0.5)': 'var(--color-slate-50)',
      'rgba(241, 245, 249, 0.3)': 'var(--color-slate-100)',
      'rgba(255, 255, 255, 0.85)': 'var(--color-white)',
      'rgba(255, 255, 255, 0.5)': 'var(--color-white)',
      'rgba(59, 130, 246, 0.04)': 'var(--color-primary-light)',
      'rgba(59, 130, 246, 0.05)': 'var(--color-primary-light)',
      'rgba(59, 130, 246, 0.08)': 'var(--color-primary-light)',
      'rgba(59, 130, 246, 0.15)': 'var(--color-primary-light)',
      'rgba(59, 130, 246, 0.25)': 'var(--color-primary-light)',
      'rgba(59, 130, 246, 0.3)': 'var(--color-primary-light)',
      'rgba(37, 99, 235, 0.3)': 'var(--color-primary-light)',
      'rgba(249, 115, 22, 0.15)': 'var(--color-orange-200)',
      'rgba(16, 185, 129, 0.18)': 'var(--color-green-200)',
      'rgba(16, 185, 129, 0.08)': 'var(--color-green-100)',
      'rgba(16, 185, 129, 0.5)': 'var(--color-green-400)',
      'rgba(16, 185, 129, 0.28)': 'var(--color-green-200)',
      'rgba(16, 185, 129, 0.15)': 'var(--color-green-200)',
      'rgba(16, 185, 129, 0.7)': 'var(--color-green-500)',
      'rgba(251, 191, 36, 0.35)': 'var(--color-amber-300)',
      'rgba(251, 191, 36, 0.2)': 'var(--color-amber-200)',
      'rgba(234, 179, 8, 0.8)': 'var(--color-amber-600)',
      'rgba(251, 191, 36, 0.15)': 'var(--color-amber-200)',
      'rgba(251, 191, 36, 0.25)': 'var(--color-amber-300)',
      'rgba(251, 191, 36, 0.4)': 'var(--color-amber-400)',
      'rgba(251, 191, 36, 0.08)': 'var(--color-amber-100)',
      'rgba(99, 102, 241, 0.08)': 'var(--color-indigo-100)',
      'rgba(99, 102, 241, 0.12)': 'var(--color-indigo-200)',
      'rgba(245, 158, 11, 0.3)': 'var(--color-amber-300)',
      'rgba(245, 158, 11, 0.2)': 'var(--color-amber-200)',
      'rgba(245, 158, 11, 0.6)': 'var(--color-amber-500)',
      'rgba(245, 158, 11, 0.15)': 'var(--color-amber-200)',
    };

    for (const [oldValue, newValue] of Object.entries(rgbaReplacements)) {
      const escapedValue = oldValue.replace(/[().,\s]/g, '\\$&');
      const regex = new RegExp(escapedValue, 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, newValue);
        rgbaFixes += matches;
        totalChanges += matches;
      }
    }

    // 如果不是 dry run，写入文件
    if (!this.dryRun && totalChanges > 0) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }

    const result: FixResult = {
      file: filePath,
      changes: totalChanges,
      varSyntaxFixes,
      cubicBezierFixes,
      durationFixes,
      rgbaFixes,
    };

    this.results.push(result);
    return result;
  }

  async fixFiles(pattern: string): Promise<void> {
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(pattern, { ignore: 'node_modules/**' }, (err: Error | null, matches: string[]) => {
        if (err) reject(err);
        else resolve(matches);
      });
    });

    console.log(`\n🔍 找到 ${files.length} 个文件\n`);

    for (const file of files) {
      const result = await this.fixFile(file);

      if (result.changes > 0) {
        console.log(`✏️  ${file}`);
        console.log(`   总计: ${result.changes} 处修复`);
        if (result.varSyntaxFixes > 0) {
          console.log(`   - var()语法错误: ${result.varSyntaxFixes} 处`);
        }
        if (result.cubicBezierFixes > 0) {
          console.log(`   - cubic-bezier: ${result.cubicBezierFixes} 处`);
        }
        if (result.durationFixes > 0) {
          console.log(`   - 时长值: ${result.durationFixes} 处`);
        }
        if (result.rgbaFixes > 0) {
          console.log(`   - rgba颜色: ${result.rgbaFixes} 处`);
        }
        console.log();
      }
    }
  }

  printSummary(): void {
    const filesWithChanges = this.results.filter(r => r.changes > 0);
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes, 0);
    const totalVarSyntaxFixes = this.results.reduce((sum, r) => sum + r.varSyntaxFixes, 0);
    const totalCubicBezierFixes = this.results.reduce((sum, r) => sum + r.cubicBezierFixes, 0);
    const totalDurationFixes = this.results.reduce((sum, r) => sum + r.durationFixes, 0);
    const totalRgbaFixes = this.results.reduce((sum, r) => sum + r.rgbaFixes, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 修复总结');
    console.log('='.repeat(60));
    console.log(`模式: ${this.dryRun ? '预览模式 (Dry Run)' : '执行模式'}`);
    console.log(`修复文件: ${filesWithChanges.length} 个`);
    console.log(`总计修复: ${totalChanges} 处`);
    console.log(`  - var()语法错误: ${totalVarSyntaxFixes} 处`);
    console.log(`  - cubic-bezier: ${totalCubicBezierFixes} 处`);
    console.log(`  - 时长值: ${totalDurationFixes} 处`);
    console.log(`  - rgba颜色: ${totalRgbaFixes} 处`);
    console.log('='.repeat(60) + '\n');

    if (this.dryRun && totalChanges > 0) {
      console.log('💡 提示: 使用 --apply 参数执行实际修复\n');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const targetPattern = args.find(arg => !arg.startsWith('--')) || 'src/modules/**/*_style.css';

  console.log('\n🚀 CSS语法错误修复工具\n');

  if (dryRun) {
    console.log('⚠️  预览模式 - 不会修改文件');
    console.log('   使用 --apply 参数执行实际修复\n');
  } else {
    console.log('✅ 执行模式 - 将修复文件\n');
  }

  const fixer = new CssSyntaxFixer(dryRun);
  await fixer.fixFiles(targetPattern);
  fixer.printSummary();
}

main().catch(console.error);
