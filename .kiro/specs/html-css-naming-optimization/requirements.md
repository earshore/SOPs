# 需求文档：HTML和CSS元素命名规范优化

## 引言

本文档定义了对现有Web项目进行HTML和CSS命名规范优化的需求。该项目是一个基于Alpine.js、Tailwind CSS和TypeScript的亚马逊运营SOP管理系统，包含多个功能模块。当前项目已有CSS架构体系和设计令牌系统,但HTML元素命名和CSS类命名存在不一致性问题,需要从顶层架构角度进行统一优化。

## 术语表

- **HTML_Element_Naming_System**: HTML元素命名系统,包括id和data-*属性的命名规范
- **CSS_Class_Naming_System**: CSS类命名系统,包括组件类、工具类和模块类的命名规范
- **BEM_Methodology**: Block Element Modifier方法论,一种CSS命名规范
- **Design_Token_System**: 设计令牌系统,项目中已有的CSS变量和配置系统
- **Module_CSS**: 模块特定CSS,位于各模块目录下的样式文件
- **Component_CSS**: 通用组件CSS,位于src/css/components/目录下
- **Naming_Convention_Validator**: 命名规范验证器,用于检查命名是否符合规范
- **Migration_Tool**: 迁移工具,用于批量更新不符合规范的命名
- **Documentation_System**: 文档系统,包括命名规范指南和最佳实践文档

## 需求

### 需求 1: 统一HTML元素ID命名规范

**用户故事:** 作为开发者,我希望HTML元素ID遵循统一的命名规范,以便快速识别元素用途和所属模块,降低维护成本。

#### 验收标准

1. THE HTML_Element_Naming_System SHALL 定义模块级ID的命名格式为 `{module}-{component}-{element}`
2. THE HTML_Element_Naming_System SHALL 定义全局级ID的命名格式为 `{component}-{element}`
3. THE HTML_Element_Naming_System SHALL 定义容器类ID使用 `-container` 后缀
4. THE HTML_Element_Naming_System SHALL 定义内容区域ID使用 `-content` 后缀
5. THE HTML_Element_Naming_System SHALL 定义交互元素ID使用 `-{action}` 后缀(如 `-button`, `-input`, `-select`)
6. WHEN 开发者创建新的HTML元素ID时, THE Naming_Convention_Validator SHALL 验证其是否符合规范
7. THE HTML_Element_Naming_System SHALL 禁止使用驼峰命名法,统一使用kebab-case

### 需求 2: 统一CSS类命名规范

**用户故事:** 作为开发者,我希望CSS类名遵循BEM方法论和项目约定,以便清晰表达样式作用域和层级关系,提高代码可读性。

#### 验收标准

1. THE CSS_Class_Naming_System SHALL 要求组件类遵循BEM格式: `{block}__{element}--{modifier}`
2. THE CSS_Class_Naming_System SHALL 定义模块特定类使用模块前缀: `{module}-{component}`
3. THE CSS_Class_Naming_System SHALL 定义通用组件类不使用模块前缀
4. THE CSS_Class_Naming_System SHALL 定义状态类使用 `is-` 或 `has-` 前缀
5. THE CSS_Class_Naming_System SHALL 定义工具类使用简短的功能性名称
6. WHEN 开发者创建新的CSS类时, THE Naming_Convention_Validator SHALL 验证其是否符合BEM规范
7. THE CSS_Class_Naming_System SHALL 禁止使用非语义化的类名(如 `blue-button`, `big-text`)

### 需求 3: 统一data-*属性命名规范

**用户故事:** 作为开发者,我希望data-*属性遵循统一的命名规范,以便在JavaScript中方便地访问和操作DOM元素。

#### 验收标准

1. THE HTML_Element_Naming_System SHALL 定义行为相关的data属性使用 `data-action` 格式
2. THE HTML_Element_Naming_System SHALL 定义状态相关的data属性使用 `data-state` 格式
3. THE HTML_Element_Naming_System SHALL 定义配置相关的data属性使用 `data-config` 格式
4. THE HTML_Element_Naming_System SHALL 定义标识相关的data属性使用 `data-id` 或 `data-{entity}-id` 格式
5. THE HTML_Element_Naming_System SHALL 要求所有data属性值使用kebab-case或snake_case
6. WHEN Alpine.js组件使用data属性时, THE HTML_Element_Naming_System SHALL 保持Alpine.js原生属性格式不变

### 需求 4: 建立命名规范文档体系

**用户故事:** 作为开发者,我希望有完整的命名规范文档和示例,以便快速学习和遵循规范,减少命名错误。

#### 验收标准

1. THE Documentation_System SHALL 提供HTML命名规范指南文档
2. THE Documentation_System SHALL 提供CSS命名规范指南文档
3. THE Documentation_System SHALL 提供每种命名模式的代码示例
4. THE Documentation_System SHALL 提供常见错误和正确写法的对比示例
5. THE Documentation_System SHALL 提供命名规范速查表
6. THE Documentation_System SHALL 集成到项目docs目录中
7. THE Documentation_System SHALL 提供中文文档

### 需求 5: 实现命名规范验证工具

**用户故事:** 作为开发者,我希望有自动化工具验证命名规范,以便在开发过程中及时发现和修正不符合规范的命名。

#### 验收标准

1. THE Naming_Convention_Validator SHALL 扫描所有HTML文件中的id属性
2. THE Naming_Convention_Validator SHALL 扫描所有HTML和CSS文件中的class属性
3. THE Naming_Convention_Validator SHALL 扫描所有HTML文件中的data-*属性
4. WHEN 发现不符合规范的命名时, THE Naming_Convention_Validator SHALL 生成详细的报告
5. THE Naming_Convention_Validator SHALL 报告包含文件路径、行号、当前命名和建议命名
6. THE Naming_Convention_validator SHALL 支持命令行执行
7. THE Naming_Convention_Validator SHALL 生成JSON和Markdown格式的报告

### 需求 6: 实现命名规范迁移工具

**用户故事:** 作为开发者,我希望有自动化工具批量更新不符合规范的命名,以便高效地完成整个项目的命名规范迁移。

#### 验收标准

1. THE Migration_Tool SHALL 支持批量重命名HTML元素ID
2. THE Migration_Tool SHALL 支持批量重命名CSS类名
3. THE Migration_Tool SHALL 支持批量重命名data-*属性
4. WHEN 重命名ID时, THE Migration_Tool SHALL 同步更新所有引用该ID的JavaScript代码
5. WHEN 重命名class时, THE Migration_Tool SHALL 同步更新所有CSS文件中的类定义
6. THE Migration_Tool SHALL 提供预览模式,显示将要进行的更改
7. THE Migration_Tool SHALL 在执行更改前创建备份
8. THE Migration_Tool SHALL 生成迁移报告,记录所有更改

### 需求 7: 优化模块CSS命名一致性

**用户故事:** 作为开发者,我希望各模块的CSS命名保持一致性,以便快速识别样式所属模块和用途。

#### 验收标准

1. THE Module_CSS SHALL 使用统一的模块前缀命名约定
2. WHEN 模块为app_center时, THE Module_CSS SHALL 使用 `app-` 前缀
3. WHEN 模块为sops时, THE Module_CSS SHALL 使用 `sop-` 前缀
4. WHEN 模块为amz_hub时, THE Module_CSS SHALL 使用 `hub-` 前缀
5. THE Module_CSS SHALL 避免使用过长的类名(建议不超过4个单词)
6. THE Module_CSS SHALL 优先使用通用组件类,仅在必要时创建模块特定类
7. WHEN 模块样式可以抽象为通用组件时, THE Module_CSS SHALL 将其迁移到Component_CSS

### 需求 8: 建立命名规范审查流程

**用户故事:** 作为项目负责人,我希望建立命名规范审查流程,以便确保新代码持续遵循命名规范,防止技术债务累积。

#### 验收标准

1. THE Documentation_System SHALL 提供代码审查检查清单
2. THE Naming_Convention_Validator SHALL 集成到Git pre-commit钩子
3. WHEN 提交包含不符合规范的命名时, THE Naming_Convention_Validator SHALL 阻止提交并显示错误信息
4. THE Naming_Convention_Validator SHALL 支持配置忽略规则
5. THE Documentation_System SHALL 提供命名规范培训材料
6. THE Documentation_System SHALL 提供命名规范FAQ文档

### 需求 9: 优化现有命名的向后兼容性

**用户故事:** 作为开发者,我希望在优化命名规范的同时保持向后兼容性,以便渐进式迁移,避免破坏现有功能。

#### 验收标准

1. THE Migration_Tool SHALL 支持创建命名映射表
2. THE Migration_Tool SHALL 支持生成兼容层代码
3. WHEN 旧命名仍被使用时, THE Migration_Tool SHALL 在控制台输出弃用警告
4. THE Documentation_System SHALL 记录所有命名变更和映射关系
5. THE Migration_Tool SHALL 支持分阶段迁移策略
6. THE Migration_Tool SHALL 提供回滚机制

### 需求 10: 集成到现有CSS架构体系

**用户故事:** 作为开发者,我希望命名规范优化能够无缝集成到现有的CSS架构体系中,以便与设计令牌系统和组件系统协同工作。

#### 验收标准

1. THE CSS_Class_Naming_System SHALL 与现有Design_Token_System保持一致
2. THE CSS_Class_Naming_System SHALL 与现有Component_CSS命名保持一致
3. THE Documentation_System SHALL 更新现有CSS架构文档,添加命名规范章节
4. THE CSS_Class_Naming_System SHALL 支持Tailwind CSS工具类与自定义类的混合使用
5. THE CSS_Class_Naming_System SHALL 明确定义何时使用Tailwind类,何时使用自定义类
6. THE Documentation_System SHALL 提供命名规范与CSS架构的集成示例

## 特殊需求指导

### HTML和CSS解析器要求

本项目涉及HTML和CSS文件的解析和修改,需要特别注意:

1. **HTML解析**: 使用成熟的HTML解析库(如jsdom、parse5),确保正确处理各种HTML结构
2. **CSS解析**: 使用CSS解析库(如postcss、css-tree),确保正确处理CSS选择器和规则
3. **AST操作**: 通过AST(抽象语法树)进行精确的代码修改,避免破坏代码结构
4. **保留格式**: 尽可能保留原有的代码格式和注释
5. **测试覆盖**: 对解析和修改逻辑进行充分的单元测试

### 命名规范的可测试性

每个命名规范都应该是可测试的:

1. **正则表达式验证**: 使用正则表达式定义命名模式,便于自动化验证
2. **示例驱动**: 为每种命名模式提供正确和错误的示例
3. **边界条件**: 考虑特殊字符、长度限制等边界条件
4. **性能考虑**: 验证工具应该能够快速扫描大型项目

### 渐进式迁移策略

考虑到项目规模,建议采用渐进式迁移:

1. **优先级排序**: 先迁移核心模块和高频使用的组件
2. **分模块迁移**: 按模块逐个迁移,降低风险
3. **兼容期**: 设置合理的兼容期,允许新旧命名共存
4. **监控机制**: 监控迁移过程中的问题和影响

## 相关文档

- 现有CSS架构文档: `docs/css-architecture-guide.md`
- CSS架构README: `docs/CSS-ARCHITECTURE-README.md`
- 最佳实践文档: `docs/best-practices.md`
- CSS目录README: `src/css/README.md`

---

**文档版本**: 1.0  
**创建日期**: 2026-03-01  
**维护者**: AihangSOP 开发团队
