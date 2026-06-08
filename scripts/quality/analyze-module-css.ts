#!/usr/bin/env ts-node
/**
 * Phase 3: 分析模块CSS并识别通用样式
 * 
 * 功能:
 * 1. 扫描所有模块CSS文件
 * 2. 识别重复的样式模式
 * 3. 提取通用样式建议
 * 4. 生成重构报告
 */

import * as fs from 'fs';
import * as path from 'path';

interface CSSPattern {
  pattern: string;
  count: number;
  files: string[];
  examples: string[];
}

interface AnalysisResult {
  totalFiles: number;
  totalLines: number;
  patterns: {
    cards: CSSPattern[];
    buttons: CSSPattern[];
    containers: CSSPattern[];
    animations: CSSPattern[];
    timelines: CSSPattern[];
    icons: CSSPattern[];
    badges: CSSPattern[];
  };
  recommendations: string[];
}

// 模块CSS文件路径
const MODULE_CSS_PATHS = [
  'src/modules/app_center/app_center_style.css',
  'src/modules/sops/sops_style.css',
  'src/modules/home/homeDisplay.css',
  'src/modules/amz_hub/amz_hub_style.css',
  'src/modules/more/more_style.css',
  'src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css',
  'src/modules/app_center/views/master_analysis/scraper/scraper_style.css',
  'src/modules/app_center/views/master_analysis/master_analysis_style.css',
  'src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css',
  'src/modules/more/views/explore/prompts/prompts_style.css',
];

// 通用样式模式
const PATTERNS = {
  // 卡片相关
  cards: [
    /\.[\w-]*card[\w-]*\s*{[^}]*background:\s*[^;]+;[^}]*border-radius:\s*[^;]+;/gi,
    /\.[\w-]*card[\w-]*:hover\s*{[^}]*transform:\s*translateY\([^)]+\)/gi,
    /\.[\w-]*card[\w-]*\s*{[^}]*box-shadow:\s*[^;]+;/gi,
  ],
  // 按钮相关
  buttons: [
    /\.[\w-]*btn[\w-]*\s*{[^}]*padding:\s*[^;]+;[^}]*border-radius:\s*[^;]+;/gi,
    /\.[\w-]*button[\w-]*:hover\s*{[^}]*background:\s*[^;]+;/gi,
  ],
  // 容器相关
  containers: [
    /\.[\w-]*container[\w-]*\s*{[^}]*max-width:\s*\d+px;[^}]*margin:\s*0\s+auto;/gi,
    /\.[\w-]*wrapper[\w-]*\s*{[^}]*padding:\s*[^;]+;/gi,
  ],
  // 动画相关
  animations: [
    /@keyframes\s+[\w-]+\s*{[^}]+}/gi,
    /animation:\s*[\w-]+\s+[\d.]+s/gi,
  ],
  // 时间线相关
  timelines: [
    /\.[\w-]*timeline[\w-]*::before\s*{[^}]*background:\s*linear-gradient/gi,
    /\.[\w-]*timeline[\w-]*-dot\s*{[^}]*border-radius:\s*50%;/gi,
  ],
  // 图标相关
  icons: [
    /\.[\w-]*icon[\w-]*\s*{[^}]*width:\s*\d+px;[^}]*height:\s*\d+px;[^}]*border-radius:/gi,
    /\.[\w-]*icon[\w-]*\s*{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/gi,
  ],
  // 徽章相关
  badges: [
    /\.[\w-]*badge[\w-]*\s*{[^}]*padding:\s*[^;]+;[^}]*border-radius:\s*[^;]+;[^}]*font-size:\s*[^;]+;/gi,
    /\.[\w-]*status[\w-]*\s*{[^}]*background:\s*[^;]+;[^}]*color:\s*[^;]+;/gi,
  ],
};

function readCSSFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  无法读取文件: ${filePath}`);
    return '';
  }
}

function analyzePatterns(content: string, patterns: RegExp[], category: string): CSSPattern[] {
  const results: CSSPattern[] = [];
  
  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      results.push({
        pattern: `${category}-pattern-${index + 1}`,
        count: matches.length,
        files: [],
        examples: matches.slice(0, 3), // 只保留前3个示例
      });
    }
  });
  
  return results;
}

function analyzeModuleCSS(): AnalysisResult {
  const result: AnalysisResult = {
    totalFiles: 0,
    totalLines: 0,
    patterns: {
      cards: [],
      buttons: [],
      containers: [],
      animations: [],
      timelines: [],
      icons: [],
      badges: [],
    },
    recommendations: [],
  };

  console.log('🔍 开始分析模块CSS文件...\n');

  MODULE_CSS_PATHS.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  文件不存在: ${filePath}`);
      return;
    }

    const content = readCSSFile(filePath);
    if (!content) return;

    result.totalFiles++;
    result.totalLines += content.split('\n').length;

    console.log(`📄 分析: ${filePath}`);

    // 分析各类模式
    Object.keys(PATTERNS).forEach(category => {
      const categoryPatterns = PATTERNS[category as keyof typeof PATTERNS];
      const found = analyzePatterns(content, categoryPatterns, category);
      
      found.forEach(pattern => {
        pattern.files.push(filePath);
        const existing = result.patterns[category as keyof typeof result.patterns]
          .find(p => p.pattern === pattern.pattern);
        
        if (existing) {
          existing.count += pattern.count;
          existing.files.push(...pattern.files);
          existing.examples.push(...pattern.examples);
        } else {
          result.patterns[category as keyof typeof result.patterns].push(pattern);
        }
      });
    });
  });

  console.log(`\n✅ 分析完成: ${result.totalFiles} 个文件, ${result.totalLines} 行代码\n`);

  // 生成建议
  generateRecommendations(result);

  return result;
}

function generateRecommendations(result: AnalysisResult): void {
  console.log('📋 生成优化建议...\n');

  // 卡片样式建议
  const cardPatterns = result.patterns.cards.filter(p => p.count > 2);
  if (cardPatterns.length > 0) {
    result.recommendations.push(
      `发现 ${cardPatterns.length} 个重复的卡片样式模式，建议提取到 src/css/components/cards.css`
    );
  }

  // 容器样式建议
  const containerPatterns = result.patterns.containers.filter(p => p.count > 3);
  if (containerPatterns.length > 0) {
    result.recommendations.push(
      `发现 ${containerPatterns.length} 个重复的容器样式，建议统一使用 max-width: 1450px 和 margin: 0 auto`
    );
  }

  // 时间线样式建议
  const timelinePatterns = result.patterns.timelines.filter(p => p.count > 1);
  if (timelinePatterns.length > 0) {
    result.recommendations.push(
      `发现 ${timelinePatterns.length} 个重复的时间线样式，建议提取到 src/css/components/timeline.css`
    );
  }

  // 图标容器建议
  const iconPatterns = result.patterns.icons.filter(p => p.count > 2);
  if (iconPatterns.length > 0) {
    result.recommendations.push(
      `发现 ${iconPatterns.length} 个重复的图标容器样式，建议使用统一的 .icon-container 类`
    );
  }

  // 动画建议
  const animationPatterns = result.patterns.animations.filter(p => p.count > 1);
  if (animationPatterns.length > 0) {
    result.recommendations.push(
      `发现 ${animationPatterns.length} 个重复的动画定义，建议移动到 src/css/animations/keyframes.css`
    );
  }

  // 徽章建议
  const badgePatterns = result.patterns.badges.filter(p => p.count > 2);
  if (badgePatterns.length > 0) {
    result.recommendations.push(
      `发现 ${badgePatterns.length} 个重复的徽章样式，建议提取到 src/css/components/badges.css`
    );
  }
}

function generateReport(result: AnalysisResult): void {
  const reportPath = 'docs/css-module-analysis-report.md';
  
  let report = `# CSS 模块分析报告

> 生成时间: ${new Date().toLocaleString('zh-CN')}

## 📊 统计信息

- 分析文件数: ${result.totalFiles}
- 总代码行数: ${result.totalLines}
- 识别模式数: ${Object.values(result.patterns).reduce((sum, patterns) => sum + patterns.length, 0)}

## 🔍 发现的重复模式

`;

  // 各类模式统计
  Object.entries(result.patterns).forEach(([category, patterns]) => {
    if (patterns.length === 0) return;
    
    report += `### ${category.charAt(0).toUpperCase() + category.slice(1)} 相关\n\n`;
    
    patterns.forEach(pattern => {
      if (pattern.count > 1) {
        report += `- **${pattern.pattern}**: 出现 ${pattern.count} 次\n`;
        report += `  - 文件: ${[...new Set(pattern.files)].join(', ')}\n`;
        if (pattern.examples.length > 0) {
          report += `  - 示例:\n`;
          pattern.examples.slice(0, 2).forEach(example => {
            const cleaned = example.replace(/\s+/g, ' ').substring(0, 100);
            report += `    \`\`\`css\n    ${cleaned}...\n    \`\`\`\n`;
          });
        }
        report += '\n';
      }
    });
  });

  // 优化建议
  report += `## 💡 优化建议\n\n`;
  result.recommendations.forEach((rec, index) => {
    report += `${index + 1}. ${rec}\n`;
  });

  report += `\n## 📝 下一步行动

### 立即执行

1. **提取通用容器样式**
   - 统一使用 \`max-width: 1450px\` 和 \`margin: 0 auto\`
   - 创建 \`.module-container\` 通用类

2. **提取时间线组件**
   - 创建 \`src/css/components/timeline.css\`
   - 统一时间线样式和动画

3. **整合图标容器**
   - 使用统一的 \`.icon-container\` 类
   - 支持不同尺寸变体

4. **合并重复动画**
   - 移动重复的 @keyframes 到全局动画文件
   - 使用设计令牌中的动画变量

### 后续优化

1. 重构模块特有样式
2. 更新模块CSS注册表
3. 建立代码审查清单
4. 编写最佳实践文档

---

**维护者**: AihangSOP 开发团队
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 报告已生成: ${reportPath}\n`);
}

function printSummary(result: AnalysisResult): void {
  console.log('=' .repeat(60));
  console.log('📊 分析摘要');
  console.log('='.repeat(60));
  console.log(`文件数量: ${result.totalFiles}`);
  console.log(`代码行数: ${result.totalLines}`);
  console.log(`\n发现的模式:`);
  
  Object.entries(result.patterns).forEach(([category, patterns]) => {
    const total = patterns.reduce((sum, p) => sum + p.count, 0);
    if (total > 0) {
      console.log(`  - ${category}: ${patterns.length} 种模式, ${total} 次出现`);
    }
  });
  
  console.log(`\n优化建议: ${result.recommendations.length} 条`);
  console.log('='.repeat(60));
}

// 主函数
function main(): void {
  console.log('\n🚀 CSS 模块分析工具 - Phase 3\n');
  
  const result = analyzeModuleCSS();
  generateReport(result);
  printSummary(result);
  
  console.log('\n✨ 分析完成！请查看生成的报告文件。\n');
}

main();
