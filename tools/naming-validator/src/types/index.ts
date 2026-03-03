/**
 * 全局类型定义
 */

/**
 * 命名规则类别
 */
export type NamingCategory = 'html-id' | 'css-class' | 'data-attr';

/**
 * 严重级别
 */
export type Severity = 'error' | 'warning';

/**
 * 命名规则定义
 */
export interface NamingRule {
  name: string;
  pattern: RegExp;
  description: string;
  examples: {
    valid: string[];
    invalid: string[];
  };
  category: NamingCategory;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  ruleName: string;
  suggestion?: string;
  message: string;
}

/**
 * 源代码位置
 */
export interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
}

/**
 * 验证问题
 */
export interface ValidationIssue {
  type: NamingCategory;
  severity: Severity;
  filePath: string;
  line: number;
  column: number;
  currentValue: string;
  suggestedValue: string;
  ruleName: string;
  message: string;
}

/**
 * 验证报告
 */
export interface ValidationReport {
  totalFiles: number;
  totalIssues: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    byType: Record<string, number>;
  };
}

/**
 * 验证器配置
 */
export interface ValidatorConfig {
  include: string[];
  exclude: string[];
  rules: {
    'html-id': boolean;
    'css-class': boolean;
    'data-attr': boolean;
  };
  severity: {
    'html-id': Severity;
    'css-class': Severity;
    'data-attr': Severity;
  };
  ignorePatterns: string[];
}

/**
 * 迁移器配置
 */
export interface MigratorConfig {
  backup: {
    enabled: boolean;
    directory: string;
  };
  dryRun: boolean;
  updateReferences: boolean;
  modules: {
    name: string;
    prefix: string;
    paths: string[];
  }[];
  compatibility: {
    createAliases: boolean;
    deprecationWarnings: boolean;
  };
}

/**
 * 完整配置
 */
export interface Config {
  validator: ValidatorConfig;
  migrator: MigratorConfig;
}

/**
 * HTML元素定义
 */
export interface HTMLElement {
  tagName: string;
  id?: string;
  classes: string[];
  dataAttributes: Map<string, string>;
  location: SourceLocation;
  element: any; // jsdom元素引用
}

/**
 * CSS规则类型
 */
export type CSSRuleType = 'component' | 'module' | 'utility';

/**
 * CSS规则定义
 */
export interface CSSRule {
  selector: string;
  classes: string[];
  location: SourceLocation;
  type: CSSRuleType;
  rule: any; // PostCSS规则引用
}

/**
 * 引用追踪相关类型
 */
export type ReferenceType = 'id' | 'class' | 'data-attr';

export interface Reference {
  filePath: string;
  line: number;
  column: number;
  context: string;
  type: ReferenceType;
}

export interface ReferenceMap {
  ids: Map<string, Reference[]>;
  classes: Map<string, Reference[]>;
  dataAttrs: Map<string, Reference[]>;
}

/**
 * 迁移计划
 */
export interface MigrationPlan {
  changes: MigrationChange[];
  affectedFiles: string[];
  statistics: {
    totalChanges: number;
    byType: Record<string, number>;
    estimatedImpact: 'low' | 'medium' | 'high';
  };
}

export interface MigrationChange {
  type: NamingCategory;
  filePath: string;
  line: number;
  oldValue: string;
  newValue: string;
  references: Reference[];
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  changesApplied: number;
  filesModified: string[];
  errors: Array<{
    filePath: string;
    error: string;
  }>;
  backupPath?: string;
}
