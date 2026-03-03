# 技术设计文档：HTML和CSS命名规范优化

## Overview

### 项目背景

本项目旨在为基于Alpine.js、Tailwind CSS和TypeScript的亚马逊运营SOP管理系统建立统一的HTML和CSS命名规范体系。当前系统已有完善的CSS架构和设计令牌系统，但HTML元素命名和CSS类命名存在不一致性问题，影响代码可维护性和团队协作效率。

### 设计目标

1. **建立统一的命名规范系统**：定义HTML ID、CSS类和data属性的命名规则
2. **提供自动化工具支持**：实现验证工具和迁移工具，降低人工成本
3. **确保向后兼容性**：支持渐进式迁移，避免破坏现有功能
4. **无缝集成现有架构**：与现有CSS架构体系和设计令牌系统协同工作
5. **提供完整文档体系**：包括规范指南、示例和最佳实践

### 核心设计原则

1. **语义化优先**：命名应清晰表达元素用途和功能
2. **模块化隔离**：通过前缀区分不同模块的样式作用域
3. **可测试性**：所有命名规则都应可通过正则表达式验证
4. **渐进式迁移**：支持新旧命名共存，平滑过渡
5. **工具驱动**：通过自动化工具确保规范执行

## Architecture

### 系统架构概览

命名规范优化系统采用分层架构，包含以下核心层次：

```
┌─────────────────────────────────────────────────────────┐
│                    开发者接口层                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ CLI工具  │  │ Git钩子  │  │ 文档系统 │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    工具服务层                            │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ 验证工具     │         │ 迁移工具     │             │
│  │ Validator    │         │ Migrator     │             │
│  └──────────────┘         └──────────────┘             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    核心引擎层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 解析引擎 │  │ 规则引擎 │  │ 转换引擎 │             │
│  │ Parser   │  │ Rules    │  │Transform │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    数据访问层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ HTML解析 │  │ CSS解析  │  │ 文件系统 │             │
│  │ jsdom    │  │ PostCSS  │  │ fs/path  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### 技术栈选择

**核心依赖**：
- **jsdom**: HTML解析和DOM操作
- **PostCSS**: CSS解析和AST操作
- **TypeScript**: 类型安全的工具开发
- **Commander.js**: CLI命令行接口
- **Chalk**: 终端输出美化

**开发依赖**：
- **Vitest**: 单元测试框架
- **fast-check**: 属性测试库

### 模块划分

1. **命名规范定义模块** (`src/naming-rules/`)
   - HTML ID规则定义
   - CSS类规则定义
   - data属性规则定义
   - 规则验证器

2. **解析器模块** (`src/parsers/`)
   - HTML解析器
   - CSS解析器
   - JavaScript解析器（用于更新引用）

3. **验证工具模块** (`src/validator/`)
   - 文件扫描器
   - 规则检查器
   - 报告生成器

4. **迁移工具模块** (`src/migrator/`)
   - 命名转换器
   - 引用更新器
   - 备份管理器
   - 迁移报告生成器

5. **文档生成模块** (`src/docs-generator/`)
   - 规范文档生成
   - 示例代码生成
   - 速查表生成

## Components and Interfaces

### 核心组件设计

#### 1. NamingRuleEngine（命名规则引擎）

```typescript
interface NamingRule {
  name: string;
  pattern: RegExp;
  description: string;
  examples: {
    valid: string[];
    invalid: string[];
  };
  category: 'html-id' | 'css-class' | 'data-attr';
}

interface ValidationResult {
  isValid: boolean;
  ruleName: string;
  suggestion?: string;
  message: string;
}

class NamingRuleEngine {
  private rules: Map<string, NamingRule>;
  
  registerRule(rule: NamingRule): void;
  validate(value: string, category: string): ValidationResult;
  getSuggestion(value: string, category: string): string;
  getAllRules(category?: string): NamingRule[];
}
```

#### 2. HTMLParser（HTML解析器）

```typescript
interface HTMLElement {
  tagName: string;
  id?: string;
  classes: string[];
  dataAttributes: Map<string, string>;
  location: SourceLocation;
}

interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
}

class HTMLParser {
  parse(filePath: string): HTMLElement[];
  updateId(element: HTMLElement, newId: string): void;
  updateClass(element: HTMLElement, oldClass: string, newClass: string): void;
  updateDataAttr(element: HTMLElement, attrName: string, newValue: string): void;
  serialize(): string;
}
```

#### 3. CSSParser（CSS解析器）

```typescript
interface CSSRule {
  selector: string;
  classes: string[];
  location: SourceLocation;
  type: 'component' | 'module' | 'utility';
}

class CSSParser {
  parse(filePath: string): CSSRule[];
  updateSelector(rule: CSSRule, newSelector: string): void;
  extractClasses(selector: string): string[];
  serialize(): string;
}
```

#### 4. Validator（验证工具）

```typescript
interface ValidationIssue {
  type: 'html-id' | 'css-class' | 'data-attr';
  severity: 'error' | 'warning';
  filePath: string;
  line: number;
  column: number;
  currentValue: string;
  suggestedValue: string;
  ruleName: string;
  message: string;
}

interface ValidationReport {
  totalFiles: number;
  totalIssues: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    byType: Record<string, number>;
  };
}

class Validator {
  constructor(ruleEngine: NamingRuleEngine);
  
  scanDirectory(dirPath: string, options: ScanOptions): Promise<ValidationReport>;
  validateFile(filePath: string): Promise<ValidationIssue[]>;
  generateReport(report: ValidationReport, format: 'json' | 'markdown'): string;
}
```

#### 5. Migrator（迁移工具）

```typescript
interface MigrationPlan {
  changes: MigrationChange[];
  affectedFiles: string[];
  estimatedImpact: {
    htmlFiles: number;
    cssFiles: number;
    jsFiles: number;
  };
}

interface MigrationChange {
  type: 'rename-id' | 'rename-class' | 'rename-data-attr';
  filePath: string;
  line: number;
  oldValue: string;
  newValue: string;
  references: Reference[];
}

interface Reference {
  filePath: string;
  line: number;
  context: string;
}

class Migrator {
  constructor(ruleEngine: NamingRuleEngine);
  
  createMigrationPlan(validationReport: ValidationReport): MigrationPlan;
  previewChanges(plan: MigrationPlan): string;
  executeMigration(plan: MigrationPlan, options: MigrationOptions): Promise<MigrationResult>;
  createBackup(files: string[]): Promise<string>;
  rollback(backupId: string): Promise<void>;
}
```

#### 6. ReferenceTracker（引用追踪器）

```typescript
interface ReferenceMap {
  id: string;
  references: Reference[];
}

class ReferenceTracker {
  findIdReferences(id: string, searchPaths: string[]): Reference[];
  findClassReferences(className: string, searchPaths: string[]): Reference[];
  updateReferences(references: Reference[], newValue: string): void;
}
```

### 接口交互流程

#### 验证流程

```
开发者 → CLI命令
  ↓
Validator.scanDirectory()
  ↓
遍历文件 → HTMLParser/CSSParser
  ↓
NamingRuleEngine.validate()
  ↓
收集ValidationIssue
  ↓
生成ValidationReport
  ↓
输出报告（JSON/Markdown）
```

#### 迁移流程

```
开发者 → CLI命令（预览模式）
  ↓
Migrator.createMigrationPlan()
  ↓
ReferenceTracker.findReferences()
  ↓
显示预览 → 用户确认
  ↓
Migrator.createBackup()
  ↓
Migrator.executeMigration()
  ↓
更新HTML/CSS/JS文件
  ↓
生成MigrationReport
```

## Data Models

### 命名规范数据模型

#### HTML ID命名规则

```typescript
// 模块级ID格式
type ModuleLevelId = `${ModulePrefix}-${ComponentName}-${ElementName}`;

// 全局级ID格式
type GlobalLevelId = `${ComponentName}-${ElementName}`;

// 模块前缀映射
const MODULE_PREFIXES = {
  app_center: 'app',
  sops: 'sop',
  amz_hub: 'hub',
} as const;

// 容器后缀
const CONTAINER_SUFFIXES = ['container', 'wrapper', 'box'] as const;

// 内容区域后缀
const CONTENT_SUFFIXES = ['content', 'body', 'main'] as const;

// 交互元素后缀
const INTERACTIVE_SUFFIXES = [
  'button', 'input', 'select', 'checkbox', 
  'radio', 'textarea', 'form', 'link'
] as const;

// ID命名规则配置
const HTML_ID_RULES: NamingRule[] = [
  {
    name: 'module-level-id',
    pattern: /^[a-z]+(-[a-z]+){2,}$/,
    description: '模块级ID：{module}-{component}-{element}',
    examples: {
      valid: ['sop-editor-container', 'app-dashboard-content'],
      invalid: ['sopEditor', 'SOP_EDITOR', 'sop-editor']
    },
    category: 'html-id'
  },
  {
    name: 'global-level-id',
    pattern: /^[a-z]+(-[a-z]+)+$/,
    description: '全局级ID：{component}-{element}',
    examples: {
      valid: ['modal-overlay', 'sidebar-toggle'],
      invalid: ['modalOverlay', 'Modal_Overlay']
    },
    category: 'html-id'
  }
];
```

#### CSS类命名规则

```typescript
// BEM格式
type BEMClass = `${Block}__${Element}--${Modifier}` | `${Block}__${Element}` | `${Block}`;

// 模块特定类
type ModuleClass = `${ModulePrefix}-${ComponentName}`;

// 状态类
type StateClass = `is-${State}` | `has-${State}`;

// CSS类命名规则配置
const CSS_CLASS_RULES: NamingRule[] = [
  {
    name: 'bem-block',
    pattern: /^[a-z]+(-[a-z]+)*$/,
    description: 'BEM Block：小写字母和连字符',
    examples: {
      valid: ['card', 'user-profile', 'navigation-menu'],
      invalid: ['Card', 'userProfile', 'navigation_menu']
    },
    category: 'css-class'
  },
  {
    name: 'bem-element',
    pattern: /^[a-z]+(-[a-z]+)*__[a-z]+(-[a-z]+)*$/,
    description: 'BEM Element：block__element',
    examples: {
      valid: ['card__title', 'user-profile__avatar'],
      invalid: ['card-title', 'card__Title']
    },
    category: 'css-class'
  },
  {
    name: 'bem-modifier',
    pattern: /^[a-z]+(-[a-z]+)*(__[a-z]+(-[a-z]+)*)?--[a-z]+(-[a-z]+)*$/,
    description: 'BEM Modifier：block--modifier 或 block__element--modifier',
    examples: {
      valid: ['card--featured', 'card__title--large'],
      invalid: ['card-featured', 'card__title-large']
    },
    category: 'css-class'
  },
  {
    name: 'state-class',
    pattern: /^(is|has)-[a-z]+(-[a-z]+)*$/,
    description: '状态类：is-* 或 has-*',
    examples: {
      valid: ['is-active', 'has-error', 'is-loading'],
      invalid: ['active', 'error', 'isActive']
    },
    category: 'css-class'
  },
  {
    name: 'module-class',
    pattern: /^(app|sop|hub)-[a-z]+(-[a-z]+)*$/,
    description: '模块类：{module-prefix}-{component}',
    examples: {
      valid: ['sop-editor', 'app-dashboard', 'hub-analytics'],
      invalid: ['sopEditor', 'sop_editor']
    },
    category: 'css-class'
  }
];
```

#### data属性命名规则

```typescript
// data属性类型
type DataAttribute = 
  | `data-action-${string}`
  | `data-state-${string}`
  | `data-config-${string}`
  | `data-id`
  | `data-${string}-id`;

// data属性命名规则配置
const DATA_ATTR_RULES: NamingRule[] = [
  {
    name: 'data-action',
    pattern: /^data-action-[a-z]+(-[a-z]+)*$/,
    description: '行为属性：data-action-{action}',
    examples: {
      valid: ['data-action-submit', 'data-action-toggle-menu'],
      invalid: ['data-action', 'data-actionSubmit']
    },
    category: 'data-attr'
  },
  {
    name: 'data-state',
    pattern: /^data-state-[a-z]+(-[a-z]+)*$/,
    description: '状态属性：data-state-{state}',
    examples: {
      valid: ['data-state-active', 'data-state-loading'],
      invalid: ['data-state', 'data-stateActive']
    },
    category: 'data-attr'
  },
  {
    name: 'data-config',
    pattern: /^data-config-[a-z]+(-[a-z]+)*$/,
    description: '配置属性：data-config-{config}',
    examples: {
      valid: ['data-config-theme', 'data-config-max-items'],
      invalid: ['data-config', 'data-configTheme']
    },
    category: 'data-attr'
  },
  {
    name: 'data-id',
    pattern: /^data-([a-z]+(-[a-z]+)*-)?id$/,
    description: '标识属性：data-id 或 data-{entity}-id',
    examples: {
      valid: ['data-id', 'data-user-id', 'data-sop-id'],
      invalid: ['data-ID', 'dataId']
    },
    category: 'data-attr'
  }
];
```

### 配置文件数据模型

```typescript
// 验证工具配置
interface ValidatorConfig {
  include: string[];  // 要扫描的文件模式
  exclude: string[];  // 要排除的文件模式
  rules: {
    'html-id': boolean;
    'css-class': boolean;
    'data-attr': boolean;
  };
  severity: {
    'html-id': 'error' | 'warning';
    'css-class': 'error' | 'warning';
    'data-attr': 'error' | 'warning';
  };
  ignorePatterns: string[];  // 要忽略的命名模式
}

// 迁移工具配置
interface MigratorConfig {
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

// 默认配置
const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  include: ['**/*.html', '**/*.css', '**/*.js'],
  exclude: ['node_modules/**', 'dist/**', 'build/**'],
  rules: {
    'html-id': true,
    'css-class': true,
    'data-attr': true
  },
  severity: {
    'html-id': 'error',
    'css-class': 'error',
    'data-attr': 'warning'
  },
  ignorePatterns: []
};
```

### 迁移映射数据模型

```typescript
// 命名映射表
interface NamingMapping {
  oldName: string;
  newName: string;
  type: 'id' | 'class' | 'data-attr';
  module?: string;
  deprecated: boolean;
  migrationDate: string;
}

// 兼容层配置
interface CompatibilityLayer {
  mappings: NamingMapping[];
  aliasScript: string;  // 生成的兼容性脚本路径
  warningEnabled: boolean;
}

// 迁移历史记录
interface MigrationHistory {
  id: string;
  timestamp: string;
  changes: MigrationChange[];
  backupPath: string;
  status: 'completed' | 'rolled-back';
  statistics: {
    filesModified: number;
    idsRenamed: number;
    classesRenamed: number;
    dataAttrsRenamed: number;
  };
}
```

