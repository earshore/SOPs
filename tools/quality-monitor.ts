#!/usr/bin/env node
/**
 * 代码质量监控工具
 * 
 * 功能：
 * - 集成 ESLint 复杂度检查
 * - 集成 jscpd 重复代码检测
 * - 监控测试覆盖率
 * - 监控类型覆盖率
 * - 生成质量趋势图表
 * - 设置质量阈值告警
 * - 数据持久化到 JSON 文件
 * - 支持 CI/CD 集成
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 类型定义
// ============================================================================

interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  file: string;
  function: string;
  line: number;
}

interface DuplicationMetrics {
  percentage: number;
  lines: number;
  tokens: number;
  files: number;
}

interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface TypeCoverageMetrics {
  percentage: number;
  total: number;
  covered: number;
  uncovered: number;
}

interface TypeUsageAnalysis {
  total: number;
  typed: number;
  anyCount: number;
  explicitAny: number;
  implicitAny: number;
}

interface ESLintMessage {
  ruleId?: string | null;
  message: string;
  line?: number;
}

interface ESLintResult {
  filePath: string;
  messages?: ESLintMessage[];
  errorCount?: number;
  warningCount?: number;
}

interface QualityMetrics {
  timestamp: string;
  complexity: {
    average: number;
    max: number;
    violations: ComplexityMetrics[];
  };
  duplication: DuplicationMetrics;
  coverage: CoverageMetrics;
  typeCoverage: TypeCoverageMetrics;
  lintErrors: number;
  lintWarnings: number;
}

interface QualityThresholds {
  maxCyclomaticComplexity: number;
  maxCognitiveComplexity: number;
  maxDuplicationPercentage: number;
  minCoveragePercentage: number;
  minTypeCoveragePercentage: number;
  maxLintErrors: number;
}

interface QualityReport {
  metrics: QualityMetrics;
  thresholds: QualityThresholds;
  violations: QualityViolation[];
  passed: boolean;
  score: number;
}

interface QualityViolation {
  type: string;
  message: string;
  severity: 'error' | 'warning';
  actual: number;
  expected: number;
}

interface TrendData {
  date: string;
  metrics: QualityMetrics;
}

interface MonitorConfig {
  srcDir: string;
  testDir: string;
  outputDir: string;
  historyFile: string;
  thresholds: QualityThresholds;
  enableESLint: boolean;
  enableDuplication: boolean;
  enableCoverage: boolean;
  enableTypeCoverage: boolean;
}

// ============================================================================
// 配置
// ============================================================================

const DEFAULT_THRESHOLDS: QualityThresholds = {
  maxCyclomaticComplexity: 10,
  maxCognitiveComplexity: 15,
  maxDuplicationPercentage: 5,
  minCoveragePercentage: 80,
  minTypeCoveragePercentage: 90,
  maxLintErrors: 0
};

const CONFIG: MonitorConfig = {
  srcDir: path.join(__dirname, '../src'),
  testDir: path.join(__dirname, '../tests'),
  outputDir: path.join(__dirname, '../tests/quality'),
  historyFile: path.join(__dirname, '../tests/quality/quality-history.json'),
  thresholds: DEFAULT_THRESHOLDS,
  enableESLint: true,
  enableDuplication: true,
  enableCoverage: true,
  enableTypeCoverage: true
};

// ============================================================================
// 质量监控器类
// ============================================================================

class QualityMonitor {
  private config: MonitorConfig;
  private metrics: QualityMetrics;
  private violations: QualityViolation[] = [];

  constructor(config: MonitorConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): QualityMetrics {
    return {
      timestamp: new Date().toISOString(),
      complexity: {
        average: 0,
        max: 0,
        violations: []
      },
      duplication: {
        percentage: 0,
        lines: 0,
        tokens: 0,
        files: 0
      },
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      },
      typeCoverage: {
        percentage: 0,
        total: 0,
        covered: 0,
        uncovered: 0
      },
      lintErrors: 0,
      lintWarnings: 0
    };
  }

  /**
   * 运行所有质量检查
   */
  public async runAll(): Promise<QualityReport> {
    console.log('🔍 开始代码质量监控...\n');

    try {
      if (this.config.enableESLint) {
        await this.checkComplexity();
      }

      if (this.config.enableDuplication) {
        await this.checkDuplication();
      }

      if (this.config.enableCoverage) {
        await this.checkCoverage();
      }

      if (this.config.enableTypeCoverage) {
        await this.checkTypeCoverage();
      }

      // 检查 lint 错误
      if (this.config.enableESLint) {
        await this.checkLintErrors();
      }

      // 验证阈值
      this.validateThresholds();

      // 计算质量分数
      const score = this.calculateQualityScore();

      // 生成报告
      const report: QualityReport = {
        metrics: this.metrics,
        thresholds: this.config.thresholds,
        violations: this.violations,
        passed: this.violations.filter(v => v.severity === 'error').length === 0,
        score
      };

      return report;
    } catch (error) {
      console.error('❌ 质量检查失败:', error);
      throw error;
    }
  }

  /**
   * 检查代码复杂度（使用 ESLint）
   */
  private async checkComplexity(): Promise<void> {
    console.log('📊 检查代码复杂度...');

    try {
      const results = this.runEslintJson();
      const complexityViolations: ComplexityMetrics[] = [];
      let totalComplexity = 0;
      let functionCount = 0;
      let maxComplexity = 0;

      // 解析 ESLint 结果
      for (const result of results) {
        if (!result.messages || result.messages.length === 0) continue;

        for (const message of result.messages) {
          // 检查圈复杂度规则
          if (message.ruleId === 'complexity') {
            const complexity = this.extractComplexityFromMessage(message.message);
            totalComplexity += complexity;
            functionCount++;
            maxComplexity = Math.max(maxComplexity, complexity);

            if (complexity > this.config.thresholds.maxCyclomaticComplexity) {
              complexityViolations.push({
                cyclomatic: complexity,
                cognitive: 0,
                file: result.filePath,
                function: message.message,
                line: message.line || 0
              });
            }
          }
        }
      }

      this.metrics.complexity = {
        average: functionCount > 0 ? totalComplexity / functionCount : 0,
        max: maxComplexity,
        violations: complexityViolations
      };

      console.log(`  ✓ 平均复杂度: ${this.metrics.complexity.average.toFixed(2)}`);
      console.log(`  ✓ 最大复杂度: ${this.metrics.complexity.max}`);
      console.log(`  ✓ 违规函数: ${complexityViolations.length}\n`);
    } catch (error: any) {
      console.warn('  ⚠ ESLint 检查失败:', error.message, '\n');
    }
  }

  /**
   * 从 ESLint 消息中提取复杂度值
   */
  private extractComplexityFromMessage(message: string): number {
    const match = message.match(/complexity of (\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 检查代码重复（使用 jscpd）
   */
  private async checkDuplication(): Promise<void> {
    console.log('🔄 检查代码重复...');

    try {
      // 确保输出目录存在
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      // 检查 jscpd 是否安装
      try {
        execSync('npx jscpd --version', { stdio: 'ignore' });
      } catch {
        console.warn('  ⚠ jscpd 未安装，跳过重复代码检测');
        console.warn('  💡 安装命令: npm install --save-dev jscpd\n');
        return;
      }

      // 使用配置文件运行 jscpd
      const configFile = path.join(__dirname, '../.jscpd.json');
      const outputFile = path.join(this.config.outputDir, 'jscpd-report.json');
      
      let cmd: string;
      if (fs.existsSync(configFile)) {
        // 使用配置文件
        cmd = `npx jscpd ${this.config.srcDir} --config ${configFile}`;
      } else {
        // 使用命令行参数
        cmd = `npx jscpd ${this.config.srcDir} --reporters json,console --format typescript,javascript --min-lines 10 --min-tokens 50 --output ${this.config.outputDir}`;
      }

      execSync(cmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024
      });

      // 读取报告
      if (fs.existsSync(outputFile)) {
        const report = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        
        // jscpd 报告结构可能因版本而异，需要兼容处理
        const statistics = report.statistics?.total || report.total || {};
        
        this.metrics.duplication = {
          percentage: statistics.percentage || 0,
          lines: statistics.lines || 0,
          tokens: statistics.tokens || 0,
          files: statistics.sources || statistics.files || 0
        };

        console.log(`  ✓ 重复率: ${this.metrics.duplication.percentage.toFixed(2)}%`);
        console.log(`  ✓ 重复行数: ${this.metrics.duplication.lines}`);
        console.log(`  ✓ 重复 tokens: ${this.metrics.duplication.tokens}`);
        console.log(`  ✓ 涉及文件: ${this.metrics.duplication.files}\n`);
      } else {
        console.warn('  ⚠ jscpd 报告文件未生成\n');
      }
    } catch (error: any) {
      // 即使 jscpd 返回非零退出码，也尝试读取报告
      const outputFile = path.join(this.config.outputDir, 'jscpd-report.json');
      if (fs.existsSync(outputFile)) {
        try {
          const report = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
          const statistics = report.statistics?.total || report.total || {};
          
          this.metrics.duplication = {
            percentage: statistics.percentage || 0,
            lines: statistics.lines || 0,
            tokens: statistics.tokens || 0,
            files: statistics.sources || statistics.files || 0
          };

          console.log(`  ✓ 重复率: ${this.metrics.duplication.percentage.toFixed(2)}%`);
          console.log(`  ✓ 重复行数: ${this.metrics.duplication.lines}`);
          console.log(`  ✓ 重复 tokens: ${this.metrics.duplication.tokens}`);
          console.log(`  ✓ 涉及文件: ${this.metrics.duplication.files}\n`);
        } catch {
          console.warn('  ⚠ 代码重复检测失败\n');
        }
      } else {
        console.warn('  ⚠ 代码重复检测失败\n');
      }
    }
  }

  /**
   * 检查测试覆盖率
   */
  private async checkCoverage(): Promise<void> {
    console.log('📈 检查测试覆盖率...');

    if (!this.config.enableCoverage) {
      console.log('  ⊘ 测试覆盖率检查已禁用\n');
      return;
    }

    try {
      // 使用项目根目录作为基准路径
      const projectRoot = path.join(__dirname, '..');
      const coverageFile = path.join(projectRoot, 'coverage', 'coverage-summary.json');

      console.log(`  📂 覆盖率文件路径: ${coverageFile}`);

      // 如果覆盖率文件不存在，尝试运行测试
      if (!fs.existsSync(coverageFile)) {
        console.log('  ⚠ 覆盖率文件不存在，尝试运行测试生成覆盖率报告...');
        try {
          console.log('  ⏳ 运行命令: npm run test:coverage');
          console.log('  ⏱ 超时设置: 120秒');
          
          execSync('npm run test:coverage', {
            stdio: 'pipe',
            timeout: 120000, // 增加到120秒
            cwd: projectRoot,
            encoding: 'utf-8'
          });
          
          console.log('  ✓ 测试运行完成');
        } catch (error: any) {
          console.warn('  ⚠ 测试运行失败:');
          if (error.stdout) {
            console.warn('  输出:', error.stdout.toString().slice(0, 500));
          }
          if (error.stderr) {
            console.warn('  错误:', error.stderr.toString().slice(0, 500));
          }
          console.warn('  ⚠ 跳过覆盖率检查\n');
          return;
        }
      }

      // 再次检查文件是否存在
      if (!fs.existsSync(coverageFile)) {
        console.warn('  ⚠ 覆盖率文件仍然不存在，可能测试未生成覆盖率报告\n');
        return;
      }

      // 读取并解析覆盖率数据
      console.log('  📖 读取覆盖率数据...');
      const coverageData = fs.readFileSync(coverageFile, 'utf-8');
      const coverage = JSON.parse(coverageData);

      if (!coverage.total) {
        console.warn('  ⚠ 覆盖率数据格式不正确，缺少 total 字段\n');
        return;
      }

      const total = coverage.total;

      // 验证数据完整性
      if (!total.statements || !total.branches || !total.functions || !total.lines) {
        console.warn('  ⚠ 覆盖率数据不完整\n');
        return;
      }

      this.metrics.coverage = {
        statements: total.statements.pct || 0,
        branches: total.branches.pct || 0,
        functions: total.functions.pct || 0,
        lines: total.lines.pct || 0
      };

      console.log(`  ✓ 语句覆盖率: ${this.metrics.coverage.statements.toFixed(2)}%`);
      console.log(`  ✓ 分支覆盖率: ${this.metrics.coverage.branches.toFixed(2)}%`);
      console.log(`  ✓ 函数覆盖率: ${this.metrics.coverage.functions.toFixed(2)}%`);
      console.log(`  ✓ 行覆盖率: ${this.metrics.coverage.lines.toFixed(2)}%`);
      
      // 显示统计信息
      console.log(`  📊 已测试: ${total.statements.covered}/${total.statements.total} 语句`);
      console.log(`  📊 已测试: ${total.branches.covered}/${total.branches.total} 分支`);
      console.log(`  📊 已测试: ${total.functions.covered}/${total.functions.total} 函数`);
      console.log(`  📊 已测试: ${total.lines.covered}/${total.lines.total} 行\n`);
    } catch (error: any) {
      console.warn('  ⚠ 测试覆盖率检查失败:');
      console.warn(`  错误信息: ${error.message}`);
      if (error.stack) {
        console.warn(`  堆栈: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      console.warn('');
    }
  }

  /**
   * 检查类型覆盖率
   */
  private async checkTypeCoverage(): Promise<void> {
      console.log('🔤 检查类型覆盖率...');

      try {
        const program = this.createTypeCoverageProgram();
        const checker = program.getTypeChecker();
        const srcRoot = this.normalizePath(this.config.srcDir) + path.sep;

        let totalSymbols = 0;
        let typedSymbols = 0;
        let anyTypeCount = 0;
        let explicitAnyCount = 0;
        let implicitAnyCount = 0;

        for (const sourceFile of program.getSourceFiles()) {
          const normalizedFileName = this.normalizePath(sourceFile.fileName);
          if (
            sourceFile.isDeclarationFile ||
            !normalizedFileName.startsWith(srcRoot) ||
            !/\.tsx?$/.test(sourceFile.fileName)
          ) {
            continue;
          }

          const analysis = this.analyzeTypeUsage(sourceFile, checker);

          totalSymbols += analysis.total;
          typedSymbols += analysis.typed;
          anyTypeCount += analysis.anyCount;
          explicitAnyCount += analysis.explicitAny;
          implicitAnyCount += analysis.implicitAny;
        }

        // 计算类型覆盖率
        const percentage = totalSymbols > 0 
          ? (typedSymbols / totalSymbols) * 100 
          : 100;

        this.metrics.typeCoverage = {
          percentage: Math.round(percentage * 100) / 100,
          total: totalSymbols,
          covered: typedSymbols,
          uncovered: totalSymbols - typedSymbols
        };

        console.log(`  ✓ 类型覆盖率: ${percentage.toFixed(2)}%`);
        console.log(`  ✓ 总符号数: ${totalSymbols}`);
        console.log(`  ✓ 已类型化: ${typedSymbols}`);
        console.log(`  ✓ 未类型化: ${totalSymbols - typedSymbols}`);
        console.log(`  ✓ 总 any: ${anyTypeCount}`);
        console.log(`  ✓ 显式 any: ${explicitAnyCount}`);
        console.log(`  ✓ 推断或传播 any: ${implicitAnyCount}\n`);

      } catch (error) {
        console.warn('  ⚠ 类型覆盖率检查失败:', error);
        this.metrics.typeCoverage = {
          percentage: 0,
          total: 0,
          covered: 0,
          uncovered: 0
        };
      }
    }

    /**
     * 创建用于类型覆盖率统计的 TypeScript Program。
     */
    private createTypeCoverageProgram(): ts.Program {
      const configPath =
        ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.app.json') ||
        ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.json');

      if (!configPath) {
        throw new Error('未找到 TypeScript 配置文件');
      }

      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
        throw new Error(`读取 TypeScript 配置失败: ${message}`);
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );

      return ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    }

    /**
     * 分析文件中的类型使用情况。
     * 这里使用 TypeChecker 的实际推断结果，避免把正常类型推断误判为隐式 any。
     */
    private analyzeTypeUsage(sourceFile: ts.SourceFile, checker: ts.TypeChecker): TypeUsageAnalysis {
      let totalSymbols = 0;
      let anyCount = 0;
      let explicitAny = 0;
      let implicitAny = 0;

      const countNode = (name: ts.Identifier | undefined, node: ts.Node): void => {
        if (!name) {
          return;
        }

        totalSymbols++;
        const type = checker.getTypeAtLocation(name);
        if (!this.isAnyType(type)) {
          return;
        }

        anyCount++;
        if (this.hasExplicitAnyType(node)) {
          explicitAny++;
        } else {
          implicitAny++;
        }
      };

      const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
          countNode(node.name, node);
        } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
          countNode(node.name, node);
        } else if (
          (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) &&
          ts.isIdentifier(node.name)
        ) {
          countNode(node.name, node);
        } else if (
          ts.isFunctionDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node)
        ) {
          countNode(node.name && ts.isIdentifier(node.name) ? node.name : undefined, node);
        } else if (
          ts.isTypeAliasDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isEnumDeclaration(node)
        ) {
          countNode(node.name, node);
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      return {
        total: totalSymbols,
        typed: totalSymbols - anyCount,
        anyCount,
        explicitAny,
        implicitAny
      };
    }

    private isAnyType(type: ts.Type): boolean {
      return (type.flags & ts.TypeFlags.Any) !== 0;
    }

    private hasExplicitAnyType(node: ts.Node): boolean {
      let found = false;

      const typeNode = 'type' in node ? (node as { type?: ts.TypeNode }).type : undefined;
      if (!typeNode) {
        return false;
      }

      const visit = (child: ts.Node): void => {
        if (child.kind === ts.SyntaxKind.AnyKeyword) {
          found = true;
          return;
        }
        ts.forEachChild(child, visit);
      };

      visit(typeNode);
      return found;
    }

    private normalizePath(filePath: string): string {
      return path.normalize(filePath);
    }


  /**
   * 检查 Lint 错误
   */
  private async checkLintErrors(): Promise<void> {
    console.log('🔍 检查 Lint 错误...');

    try {
      const results = this.runEslintJson();
      let errorCount = 0;
      let warningCount = 0;

      for (const result of results) {
        errorCount += result.errorCount || 0;
        warningCount += result.warningCount || 0;
      }

      this.metrics.lintErrors = errorCount;
      this.metrics.lintWarnings = warningCount;

      console.log(`  ✓ Lint 错误: ${errorCount}`);
      console.log(`  ✓ Lint 警告: ${warningCount}\n`);
    } catch (error: any) {
      console.warn('  ⚠ Lint 检查失败:', error.message, '\n');
    }
  }

  private runEslintJson(): ESLintResult[] {
    const ignoredTestFiles = [
      '--ignore-pattern "**/*.test.ts"',
      '--ignore-pattern "**/*.test.tsx"',
      '--ignore-pattern "**/*.spec.ts"',
      '--ignore-pattern "**/*.spec.tsx"'
    ].join(' ');
    const cmd = `npx eslint "${this.config.srcDir}" ${ignoredTestFiles} --format json`;

    try {
      const output = execSync(cmd, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 20 * 1024 * 1024
      }).toString();
      return JSON.parse(output) as ESLintResult[];
    } catch (error: any) {
      if (error.stdout) {
        return JSON.parse(error.stdout) as ESLintResult[];
      }
      throw error;
    }
  }

  /**
   * 验证阈值
   */
  private validateThresholds(): void {
    const thresholds = this.config.thresholds;

    // 检查复杂度
    if (this.metrics.complexity.max > thresholds.maxCyclomaticComplexity) {
      this.violations.push({
        type: 'complexity',
        message: `最大圈复杂度超过阈值`,
        severity: 'error',
        actual: this.metrics.complexity.max,
        expected: thresholds.maxCyclomaticComplexity
      });
    }

    // 检查重复率
    if (this.metrics.duplication.percentage > thresholds.maxDuplicationPercentage) {
      this.violations.push({
        type: 'duplication',
        message: `代码重复率超过阈值`,
        severity: 'warning',
        actual: this.metrics.duplication.percentage,
        expected: thresholds.maxDuplicationPercentage
      });
    }

    // 检查测试覆盖率
    if (this.metrics.coverage.lines < thresholds.minCoveragePercentage) {
      this.violations.push({
        type: 'coverage',
        message: `测试覆盖率低于阈值`,
        severity: 'warning',
        actual: this.metrics.coverage.lines,
        expected: thresholds.minCoveragePercentage
      });
    }

    // 检查类型覆盖率
    if (this.metrics.typeCoverage.percentage < thresholds.minTypeCoveragePercentage) {
      this.violations.push({
        type: 'type-coverage',
        message: `类型覆盖率低于阈值`,
        severity: 'warning',
        actual: this.metrics.typeCoverage.percentage,
        expected: thresholds.minTypeCoveragePercentage
      });
    }

    // 检查 Lint 错误
    if (this.metrics.lintErrors > thresholds.maxLintErrors) {
      this.violations.push({
        type: 'lint',
        message: `Lint 错误数超过阈值`,
        severity: 'error',
        actual: this.metrics.lintErrors,
        expected: thresholds.maxLintErrors
      });
    }
  }

  /**
   * 计算质量分数（0-100）
   */
  private calculateQualityScore(): number {
    let score = 100;

    // 复杂度扣分（最多扣 20 分）
    const complexityPenalty = Math.min(20, this.metrics.complexity.violations.length * 2);
    score -= complexityPenalty;

    // 重复率扣分（最多扣 15 分）
    const duplicationPenalty = Math.min(15, this.metrics.duplication.percentage * 3);
    score -= duplicationPenalty;

    // 覆盖率扣分（最多扣 25 分）
    const coverageDeficit = Math.max(0, this.config.thresholds.minCoveragePercentage - this.metrics.coverage.lines);
    const coveragePenalty = Math.min(25, coverageDeficit / 2);
    score -= coveragePenalty;

    // 类型覆盖率扣分（最多扣 20 分）
    const typeCoverageDeficit = Math.max(0, this.config.thresholds.minTypeCoveragePercentage - this.metrics.typeCoverage.percentage);
    const typeCoveragePenalty = Math.min(20, typeCoverageDeficit / 2);
    score -= typeCoveragePenalty;

    // Lint 错误扣分（最多扣 20 分）
    const lintPenalty = Math.min(20, this.metrics.lintErrors * 2);
    score -= lintPenalty;

    return Math.max(0, Math.round(score));
  }

  /**
   * 发送告警通知
   */
  public sendAlerts(report: QualityReport): void {
    if (report.violations.length === 0) {
      return;
    }

    console.log('\n🚨 质量告警触发！');
    console.log('=====================================');

    // 按严重程度分组
    const errors = report.violations.filter(v => v.severity === 'error');
    const warnings = report.violations.filter(v => v.severity === 'warning');

    if (errors.length > 0) {
      console.log('\n🔴 错误级别告警:');
      errors.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.message}`);
        console.log(`     类型: ${violation.type}`);
        console.log(`     实际值: ${violation.actual.toFixed(2)}`);
        console.log(`     期望值: ${violation.expected.toFixed(2)}`);
        console.log(`     差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n🟡 警告级别告警:');
      warnings.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.message}`);
        console.log(`     类型: ${violation.type}`);
        console.log(`     实际值: ${violation.actual.toFixed(2)}`);
        console.log(`     期望值: ${violation.expected.toFixed(2)}`);
        console.log(`     差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}`);
      });
    }

    console.log('\n📋 建议措施:');
    this.generateRecommendations(report.violations);

    console.log('=====================================\n');

    // 保存告警到文件
    this.saveAlertLog(report);
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(violations: QualityViolation[]): void {
    const recommendations = new Map<string, string>();

    violations.forEach(violation => {
      switch (violation.type) {
        case 'complexity':
          recommendations.set('complexity', 
            '  • 重构高复杂度函数，拆分为更小的函数\n' +
            '  • 使用提前返回（early return）减少嵌套\n' +
            '  • 考虑使用策略模式或状态模式简化逻辑');
          break;
        case 'duplication':
          recommendations.set('duplication',
            '  • 提取重复代码为公共函数或类\n' +
            '  • 使用继承或组合消除重复\n' +
            '  • 考虑使用工具类或辅助函数');
          break;
        case 'coverage':
          recommendations.set('coverage',
            '  • 为核心业务逻辑添加单元测试\n' +
            '  • 为关键用户流程添加集成测试\n' +
            '  • 使用测试覆盖率报告识别未测试代码');
          break;
        case 'type-coverage':
          recommendations.set('type-coverage',
            '  • 为函数参数和返回值添加类型注解\n' +
            '  • 消除 any 类型的使用\n' +
            '  • 使用类型守卫增强类型安全');
          break;
        case 'lint':
          recommendations.set('lint',
            '  • 运行 npm run lint:fix 自动修复\n' +
            '  • 检查并修复剩余的 lint 错误\n' +
            '  • 配置编辑器实时显示 lint 错误');
          break;
      }
    });

    recommendations.forEach(recommendation => {
      console.log(recommendation);
    });
  }

  /**
   * 保存告警日志
   */
  private saveAlertLog(report: QualityReport): void {
    try {
      const alertLogPath = path.join(this.config.outputDir, 'quality-alerts.log');
      const timestamp = new Date().toISOString();
      
      let logContent = `\n${'='.repeat(80)}\n`;
      logContent += `[${timestamp}] 质量告警\n`;
      logContent += `${'='.repeat(80)}\n`;
      logContent += `质量分数: ${report.score}/100\n`;
      logContent += `违规数量: ${report.violations.length}\n\n`;

      report.violations.forEach((violation, index) => {
        logContent += `${index + 1}. [${violation.severity.toUpperCase()}] ${violation.message}\n`;
        logContent += `   类型: ${violation.type}\n`;
        logContent += `   实际值: ${violation.actual.toFixed(2)}\n`;
        logContent += `   期望值: ${violation.expected.toFixed(2)}\n`;
        logContent += `   差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}\n\n`;
      });

      // 追加到日志文件
      fs.appendFileSync(alertLogPath, logContent, 'utf-8');
      console.log(`📝 告警日志已保存: ${alertLogPath}`);
    } catch (error) {
      console.error('保存告警日志失败:', error);
    }
  }

  /**
   * 检查是否应该阻止构建
   */
  public shouldBlockBuild(report: QualityReport): boolean {
    // 如果有错误级别的违规，阻止构建
    const hasErrors = report.violations.some(v => v.severity === 'error');
    
    // 如果质量分数过低，阻止构建
    const scoreThreshold = 60; // 最低可接受分数
    const scoreTooLow = report.score < scoreThreshold;

    if (hasErrors) {
      console.log('\n❌ 构建阻止: 存在错误级别的质量违规');
    }
    
    if (scoreTooLow) {
      console.log(`\n❌ 构建阻止: 质量分数过低 (${report.score} < ${scoreThreshold})`);
    }

    return hasErrors || scoreTooLow;
  }

  /**
   * 保存历史数据
   */
  public saveHistory(report: QualityReport): void {
    try {
      let history: TrendData[] = [];

      // 读取现有历史
      if (fs.existsSync(this.config.historyFile)) {
        const content = fs.readFileSync(this.config.historyFile, 'utf-8');
        history = JSON.parse(content);
      }

      // 添加新数据
      history.push({
        date: new Date().toISOString().split('T')[0],
        metrics: report.metrics
      });

      // 只保留最近 30 天的数据
      if (history.length > 30) {
        history = history.slice(-30);
      }

      // 保存
      fs.writeFileSync(
        this.config.historyFile,
        JSON.stringify(history, null, 2),
        'utf-8'
      );

      console.log(`✅ 历史数据已保存: ${this.config.historyFile}`);
    } catch (error) {
      console.error('❌ 保存历史数据失败:', error);
    }
  }
  /**
   * 发送告警通知
   */
  public sendAlerts(report: QualityReport): void {
    if (report.violations.length === 0) {
      return;
    }

    console.log('\n🚨 质量告警触发！');
    console.log('=====================================');

    // 按严重程度分组
    const errors = report.violations.filter(v => v.severity === 'error');
    const warnings = report.violations.filter(v => v.severity === 'warning');

    if (errors.length > 0) {
      console.log('\n🔴 错误级别告警:');
      errors.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.message}`);
        console.log(`     类型: ${violation.type}`);
        console.log(`     实际值: ${violation.actual.toFixed(2)}`);
        console.log(`     期望值: ${violation.expected.toFixed(2)}`);
        console.log(`     差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n🟡 警告级别告警:');
      warnings.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.message}`);
        console.log(`     类型: ${violation.type}`);
        console.log(`     实际值: ${violation.actual.toFixed(2)}`);
        console.log(`     期望值: ${violation.expected.toFixed(2)}`);
        console.log(`     差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}`);
      });
    }

    console.log('\n📋 建议措施:');
    this.generateRecommendations(report.violations);

    console.log('=====================================\n');

    // 保存告警到文件
    this.saveAlertLog(report);
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(violations: QualityViolation[]): void {
    const recommendations = new Map<string, string>();

    violations.forEach(violation => {
      switch (violation.type) {
        case 'complexity':
          recommendations.set('complexity',
            '  • 重构高复杂度函数，拆分为更小的函数\n' +
            '  • 使用提前返回（early return）减少嵌套\n' +
            '  • 考虑使用策略模式或状态模式简化逻辑');
          break;
        case 'duplication':
          recommendations.set('duplication',
            '  • 提取重复代码为公共函数或类\n' +
            '  • 使用继承或组合消除重复\n' +
            '  • 考虑使用工具类或辅助函数');
          break;
        case 'coverage':
          recommendations.set('coverage',
            '  • 为核心业务逻辑添加单元测试\n' +
            '  • 为关键用户流程添加集成测试\n' +
            '  • 使用测试覆盖率报告识别未测试代码');
          break;
        case 'type-coverage':
          recommendations.set('type-coverage',
            '  • 为函数参数和返回值添加类型注解\n' +
            '  • 消除 any 类型的使用\n' +
            '  • 使用类型守卫增强类型安全');
          break;
        case 'lint':
          recommendations.set('lint',
            '  • 运行 npm run lint:fix 自动修复\n' +
            '  • 检查并修复剩余的 lint 错误\n' +
            '  • 配置编辑器实时显示 lint 错误');
          break;
      }
    });

    recommendations.forEach(recommendation => {
      console.log(recommendation);
    });
  }

  /**
   * 保存告警日志
   */
  private saveAlertLog(report: QualityReport): void {
    try {
      const alertLogPath = path.join(this.config.outputDir, 'quality-alerts.log');
      const timestamp = new Date().toISOString();

      let logContent = `\n${'='.repeat(80)}\n`;
      logContent += `[${timestamp}] 质量告警\n`;
      logContent += `${'='.repeat(80)}\n`;
      logContent += `质量分数: ${report.score}/100\n`;
      logContent += `违规数量: ${report.violations.length}\n\n`;

      report.violations.forEach((violation, index) => {
        logContent += `${index + 1}. [${violation.severity.toUpperCase()}] ${violation.message}\n`;
        logContent += `   类型: ${violation.type}\n`;
        logContent += `   实际值: ${violation.actual.toFixed(2)}\n`;
        logContent += `   期望值: ${violation.expected.toFixed(2)}\n`;
        logContent += `   差距: ${Math.abs(violation.actual - violation.expected).toFixed(2)}\n\n`;
      });

      // 追加到日志文件
      fs.appendFileSync(alertLogPath, logContent, 'utf-8');
      console.log(`📝 告警日志已保存: ${alertLogPath}`);
    } catch (error) {
      console.error('保存告警日志失败:', error);
    }
  }

  /**
   * 检查是否应该阻止构建
   */
  public shouldBlockBuild(report: QualityReport): boolean {
    // 如果有错误级别的违规，阻止构建
    const hasErrors = report.violations.some(v => v.severity === 'error');

    // 如果质量分数过低，阻止构建
    const scoreThreshold = 60; // 最低可接受分数
    const scoreTooLow = report.score < scoreThreshold;

    if (hasErrors) {
      console.log('\n❌ 构建阻止: 存在错误级别的质量违规');
    }

    if (scoreTooLow) {
      console.log(`\n❌ 构建阻止: 质量分数过低 (${report.score} < ${scoreThreshold})`);
    }

    return hasErrors || scoreTooLow;
  }


  /**
   * 生成 JSON 报告
   */
  public saveJSONReport(report: QualityReport, outputPath: string): void {
    try {
      const json = JSON.stringify(report, null, 2);
      fs.writeFileSync(outputPath, json, 'utf-8');
      console.log(`✅ JSON 报告已保存: ${outputPath}`);
    } catch (error) {
      console.error('❌ 保存 JSON 报告失败:', error);
    }
  }

  /**
   * 生成 HTML 报告
   */
  public saveHTMLReport(report: QualityReport, outputPath: string): void {
    try {
      const html = this.generateHTML(report);
      fs.writeFileSync(outputPath, html, 'utf-8');
      console.log(`✅ HTML 报告已保存: ${outputPath}`);
    } catch (error) {
      console.error('❌ 保存 HTML 报告失败:', error);
    }
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTML(report: QualityReport): string {
    const scoreColor = report.score >= 90 ? '#10b981' : 
                       report.score >= 70 ? '#f59e0b' : '#ef4444';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>代码质量监控报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { color: #111827; margin-bottom: 0.5rem; }
    .meta { color: #6b7280; font-size: 0.875rem; }
    .score-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .score-value {
      font-size: 4rem;
      font-weight: bold;
      color: ${scoreColor};
    }
    .score-label { color: #6b7280; margin-top: 0.5rem; }
    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      margin-top: 1rem;
    }
    .status-pass { background: #d1fae5; color: #065f46; }
    .status-fail { background: #fee2e2; color: #991b1b; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-label { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .metric-value { font-size: 2rem; font-weight: bold; color: #111827; }
    .metric-detail { color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem; }
    .violations {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .violations-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .violation {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .violation:last-child { border-bottom: none; }
    .violation-icon { font-size: 1.5rem; }
    .violation-content { flex: 1; }
    .violation-message { font-weight: 500; color: #111827; }
    .violation-detail { color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 代码质量监控报告</h1>
      <div class="meta">生成时间: ${new Date(report.metrics.timestamp).toLocaleString('zh-CN')}</div>
    </div>

    <div class="score-card">
      <div class="score-value">${report.score}</div>
      <div class="score-label">质量分数</div>
      <span class="status-badge ${report.passed ? 'status-pass' : 'status-fail'}">
        ${report.passed ? '✓ 通过' : '✗ 未通过'}
      </span>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">代码复杂度</div>
        <div class="metric-value">${report.metrics.complexity.average.toFixed(1)}</div>
        <div class="metric-detail">平均 | 最大: ${report.metrics.complexity.max}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">代码重复率</div>
        <div class="metric-value">${report.metrics.duplication.percentage.toFixed(1)}%</div>
        <div class="metric-detail">${report.metrics.duplication.lines} 行重复</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">测试覆盖率</div>
        <div class="metric-value">${report.metrics.coverage.lines.toFixed(1)}%</div>
        <div class="metric-detail">行覆盖率</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">类型覆盖率</div>
        <div class="metric-value">${report.metrics.typeCoverage.percentage.toFixed(1)}%</div>
        <div class="metric-detail">${report.metrics.typeCoverage.uncovered} 个类型错误</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Lint 错误</div>
        <div class="metric-value">${report.metrics.lintErrors}</div>
        <div class="metric-detail">${report.metrics.lintWarnings} 个警告</div>
      </div>
    </div>

    ${report.violations.length > 0 ? `
    <div class="violations">
      <div class="violations-header">
        <h2>质量违规 (${report.violations.length})</h2>
      </div>
      ${report.violations.map(v => `
        <div class="violation">
          <div class="violation-icon">${v.severity === 'error' ? '🔴' : '🟡'}</div>
          <div class="violation-content">
            <div class="violation-message">${v.message}</div>
            <div class="violation-detail">
              实际值: ${v.actual.toFixed(2)} | 期望值: ${v.expected.toFixed(2)}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : '<div class="violations"><div class="violations-header"><h2>✅ 无质量违规</h2></div></div>'}
  </div>
</body>
</html>`;
  }

  /**
   * 生成趋势图表（使用历史数据）
   */
  public generateTrendChart(outputPath: string): void {
    try {
      if (!fs.existsSync(this.config.historyFile)) {
        console.warn('⚠ 历史数据不存在，无法生成趋势图表');
        return;
      }

      const history: TrendData[] = JSON.parse(
        fs.readFileSync(this.config.historyFile, 'utf-8')
      );

      if (history.length < 2) {
        console.warn('⚠ 历史数据不足，无法生成趋势图表');
        return;
      }

      const html = this.generateTrendHTML(history);
      fs.writeFileSync(outputPath, html, 'utf-8');
      console.log(`✅ 趋势图表已保存: ${outputPath}`);
    } catch (error) {
      console.error('❌ 生成趋势图表失败:', error);
    }
  }

  /**
   * 生成趋势图表 HTML
   */
  private generateTrendHTML(history: TrendData[]): string {
    const dates = history.map(h => h.date);
    const complexityData = history.map(h => h.metrics.complexity.average);
    const duplicationData = history.map(h => h.metrics.duplication.percentage);
    const coverageData = history.map(h => h.metrics.coverage.lines);
    const typeCoverageData = history.map(h => h.metrics.typeCoverage.percentage);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>代码质量趋势</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { color: #111827; }
    .chart-container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    canvas { max-height: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 代码质量趋势</h1>
    </div>

    <div class="chart-container">
      <h2>代码复杂度趋势</h2>
      <canvas id="complexityChart"></canvas>
    </div>

    <div class="chart-container">
      <h2>代码重复率趋势</h2>
      <canvas id="duplicationChart"></canvas>
    </div>

    <div class="chart-container">
      <h2>测试覆盖率趋势</h2>
      <canvas id="coverageChart"></canvas>
    </div>

    <div class="chart-container">
      <h2>类型覆盖率趋势</h2>
      <canvas id="typeCoverageChart"></canvas>
    </div>
  </div>

  <script>
    const dates = ${JSON.stringify(dates)};
    
    // 复杂度图表
    new Chart(document.getElementById('complexityChart'), {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '平均复杂度',
          data: ${JSON.stringify(complexityData)},
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        }
      }
    });

    // 重复率图表
    new Chart(document.getElementById('duplicationChart'), {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '重复率 (%)',
          data: ${JSON.stringify(duplicationData)},
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        }
      }
    });

    // 测试覆盖率图表
    new Chart(document.getElementById('coverageChart'), {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '覆盖率 (%)',
          data: ${JSON.stringify(coverageData)},
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            min: 0,
            max: 100
          }
        }
      }
    });

    // 类型覆盖率图表
    new Chart(document.getElementById('typeCoverageChart'), {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '类型覆盖率 (%)',
          data: ${JSON.stringify(typeCoverageData)},
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            min: 0,
            max: 100
          }
        }
      }
    });
  </script>
</body>
</html>`;
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  console.log('🔍 开始代码质量监控...\n');

  try {
    // 创建监控器
    const monitor = new QualityMonitor(CONFIG);

    // 运行所有检查
    const report = await monitor.runAll();

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 保存报告
    const timestamp = new Date().toISOString().split('T')[0];
    const jsonPath = path.join(CONFIG.outputDir, `quality-report-${timestamp}.json`);
    const htmlPath = path.join(CONFIG.outputDir, `quality-report-${timestamp}.html`);
    const trendPath = path.join(CONFIG.outputDir, `quality-trend.html`);

    monitor.saveJSONReport(report, jsonPath);
    monitor.saveHTMLReport(report, htmlPath);
    monitor.saveHistory(report);
    monitor.generateTrendChart(trendPath);

    // 打印摘要
    console.log('\n📊 质量检查完成！');
    console.log('=====================================');
    console.log(`质量分数: ${report.score}/100`);
    console.log(`状态: ${report.passed ? '✓ 通过' : '✗ 未通过'}`);
    console.log('-------------------------------------');
    console.log(`平均复杂度: ${report.metrics.complexity.average.toFixed(2)}`);
    console.log(`代码重复率: ${report.metrics.duplication.percentage.toFixed(2)}%`);
    console.log(`测试覆盖率: ${report.metrics.coverage.lines.toFixed(2)}%`);
    console.log(`类型覆盖率: ${report.metrics.typeCoverage.percentage.toFixed(2)}%`);
    console.log(`Lint 错误: ${report.metrics.lintErrors}`);
    console.log('-------------------------------------');
    
    if (report.violations.length > 0) {
      console.log(`质量违规: ${report.violations.length} 个`);
      for (const violation of report.violations) {
        const icon = violation.severity === 'error' ? '🔴' : '🟡';
        console.log(`  ${icon} ${violation.message}`);
        console.log(`     实际: ${violation.actual.toFixed(2)} | 期望: ${violation.expected.toFixed(2)}`);
      }
    } else {
      console.log('✅ 无质量违规');
    }
    
    console.log('=====================================\n');

    // 发送告警通知
    monitor.sendAlerts(report);

    // 检查是否应该阻止构建
    const shouldBlock = monitor.shouldBlockBuild(report);
    
    if (shouldBlock) {
      console.log('\n⛔ CI/CD 构建将被阻止');
      process.exit(1);
    } else if (!report.passed) {
      console.log('\n⚠️  存在警告，但不阻止构建');
      process.exit(0);
    } else {
      console.log('\n✅ 质量检查通过，可以继续构建');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 质量监控失败:', error);
    process.exit(1);
  }
}

// 运行主函数
const isMainModule = () => {
  if (typeof process.argv[1] === 'undefined') return false;
  
  const scriptPath = fileURLToPath(import.meta.url);
  const argPath = path.resolve(process.argv[1]);
  
  return scriptPath === argPath;
};

if (isMainModule()) {
  main();
}

export type { QualityReport, QualityMetrics, QualityThresholds };
export { QualityMonitor };
