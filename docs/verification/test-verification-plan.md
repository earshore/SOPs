# DNA 提取器修复验证计划

## 测试目标
验证新的通用 DNA 提取器（universalDNAExtractor）能够正确识别和处理 Downloads 报告格式，并成功提取关键词数据。

## 验证标准
- ✅ 新提取器成功识别报告（不返回 null）
- ✅ 关键词被提取并填充到 keywordsTier1 和 keywordsTier2
- ✅ 日志显示 "使用提取器: 新提取器 (universalDNAExtractor)"
- ✅ 用户能看到明显的变化（关键词自动填充）

## 测试环境
- 代码路径：`src/modules/app_center/views/master_analysis/`
- 关键文件：
  - `services/universalDNAExtractor.ts` - 新提取器
  - `services/adapters/CompetitorReportAdapter.ts` - 竞品报告适配器
  - `services/reportTypeDetector.ts` - 报告类型检测
  - `promptlab/components/PromptlabPanel.ts` - 调用入口

## 测试用例

### 测试用例 1: Competitor Report 格式识别
**目的**: 验证适配器能识别 Competitor Report 格式

**测试数据**:
```json
{
  "competitor_insights": {
    "strengths": ["高品质", "性价比"],
    "weaknesses": ["包装简陋"],
    "user_profile": ["25-35岁", "都市白领"],
    "differentiation_angles": ["独特香调", "持久留香"]
  },
  "feature_points": ["50ml容量", "木质香调", "6小时持久"],
  "keyword_clusters": {
    "core": ["perfume", "cologne", "fragrance"],
    "attribute": ["long lasting", "woody", "aromatic"],
    "long_tail": ["men's cologne for night club", "aromatic woody perfume"]
  },
  "high_frequency_phrases": ["long lasting", "great smell", "perfect size"],
  "intents": ["gift", "daily use", "special occasion"],
  "negative_drivers": ["expensive", "small bottle"],
  "meta": {
    "targetMarket": "DE",
    "analyzedASINs": ["B0DNMZ2MLG"],
    "generatedByModel": "gpt-4",
    "generatedAt": "2026-03-06T10:00:00Z"
  }
}
```

**预期结果**:
- `detectReportType()` 返回 `ReportType.COMPETITOR`
- `CompetitorReportAdapter.canHandle()` 返回 `true`
- `extractDNA()` 返回非 null 的 ExtendedDNA 对象
- 提取的数据包含：
  - `keywords.core`: ["perfume", "cologne", "fragrance"]
  - `keywords.longTail`: ["men's cologne for night club", "aromatic woody perfume"]
  - `keywords.intent`: ["gift", "daily use", "special occasion"]
  - `highFrequencyPhrases`: ["long lasting", "great smell", "perfect size"]
  - `audience`: "25-35岁, 都市白领"
  - `painPoints`: ["包装简陋", "expensive", "small bottle"]
  - `differentiationAngles`: ["独特香调", "持久留香"]

### 测试用例 2: Product Overview Report 格式识别
**目的**: 验证适配器能识别 Product Overview Report 格式

**测试数据**:
```json
{
  "productOverview": {
    "itemsAnalyzed": 1,
    "asins": ["B0DNMZ2MLG"],
    "market": "DE",
    "category": "Beauty",
    "summary": "Men's cologne with woody notes"
  },
  "coreFeatures": {
    "scent": "Aromatic Woody",
    "size": "50ml",
    "longevity": "6+ hours"
  },
  "user_profile": {
    "demographics": {
      "age_ranges": ["25-35", "35-45"],
      "locations": ["Urban areas"],
      "household": ["Single", "Couple"]
    },
    "goals": ["Smell good", "Boost confidence"],
    "pain_points": ["Short lasting perfumes", "Expensive brands"],
    "scenarios": ["Daily wear", "Night out", "Special occasions"],
    "objections": ["Price", "Bottle size"],
    "price_sensitivity": "Medium",
    "decision_drivers": ["Longevity", "Scent quality", "Price"]
  },
  "keywordClusters": {
    "core": ["perfume", "cologne", "fragrance"],
    "longTail": ["long lasting cologne for men", "woody aromatic perfume"],
    "intent": ["gift", "daily", "night club"]
  },
  "meta": {
    "generatedAt": "2026-03-06T10:00:00Z",
    "engine": "gpt-4",
    "asins": ["B0DNMZ2MLG"]
  }
}
```

**预期结果**:
- `detectReportType()` 返回 `ReportType.PRODUCT_OVERVIEW`
- `ProductOverviewAdapter.canHandle()` 返回 `true`
- 提取的关键词包含 core, longTail, intent 三个分类

### 测试用例 3: 日志输出验证
**目的**: 验证日志正确显示使用的提取器

**验证点**:
1. 在 PromptlabPanel.ts 的 `handleExtractDNA()` 方法中
2. 检查日志输出：
   - `[Promptlab] 使用提取器: 新提取器 (universalDNAExtractor)` - 成功使用新提取器
   - `[Promptlab] 新提取器无法提取，尝试旧提取器` - 回退到旧提取器（不应出现）

### 测试用例 4: UI 关键词填充验证
**目的**: 验证提取的关键词正确填充到 UI 表单

**验证步骤**:
1. 打开 Promptlab 面板
2. 加载包含 Competitor Report 的分析报告
3. 点击 "提取产品 DNA" 按钮
4. 检查表单字段：
   - `keywordsTier1` 应包含 core keywords
   - `keywordsTier2` 应包含 long-tail keywords
   - `audience` 字段应填充目标受众
   - `usps` 字段应填充核心卖点

**预期结果**:
- 所有字段自动填充
- 用户看到明显的数据变化
- Toast 提示 "产品 DNA 提取成功"

### 测试用例 5: 回退机制验证
**目的**: 验证当新提取器无法处理时，系统正确回退到旧提取器

**测试数据**: 使用旧格式的 FullAnalysisReport
```json
{
  "buyer-profile": {
    "demographics": {
      "age_range_estimate": "25-45岁",
      "likely_gender": "male"
    },
    "buyer_types": [{"type": "日常用户", "percentage": 100}]
  },
  "selling-points": {
    "function_scene_matrix": {
      "functions": ["功能1", "功能2"]
    }
  }
}
```

**预期结果**:
- 新提取器返回 null
- 日志显示 "新提取器无法提取，尝试旧提取器"
- 旧提取器成功提取数据
- 系统正常工作，不报错

## 测试执行步骤

### 步骤 1: 单元测试验证
```bash
# 运行 DNA 提取器相关测试
npm run test -- dnaExtractor
npm run test -- universalDNAExtractor
npm run test -- reportTypeDetector
```

### 步骤 2: 手动集成测试
1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问应用
3. 导航到 Master Analysis 模块
4. 准备测试报告文件（Competitor Report 格式）
5. 上传或加载报告
6. 打开浏览器开发者工具，查看 Console 日志
7. 点击 "提取产品 DNA" 按钮
8. 验证：
   - Console 日志输出
   - UI 表单字段填充
   - Toast 提示信息

### 步骤 3: 边界情况测试
- 空报告对象
- 缺少必需字段的报告
- 格式错误的报告
- 混合格式的报告

## 验证检查清单

- [ ] CompetitorReportAdapter.canHandle() 正确识别报告
- [ ] reportTypeDetector.detectReportType() 返回正确类型
- [ ] universalDNAExtractor.extractDNA() 返回非 null 结果
- [ ] 提取的 keywords 包含 core, longTail, intent 三个分类
- [ ] 提取的 highFrequencyPhrases 不为空
- [ ] 提取的 painPoints 不为空
- [ ] 提取的 differentiationAngles 不为空
- [ ] 日志显示 "使用提取器: 新提取器"
- [ ] UI 表单字段正确填充
- [ ] 用户能看到明显变化
- [ ] 回退机制正常工作（旧格式报告）
- [ ] 无控制台错误
- [ ] 置信度计算正确

## 已知问题和注意事项

1. **字段名称差异**: Competitor Report 使用 `keyword_clusters`，Product Overview 使用 `keywordClusters`（驼峰命名）
2. **适配器顺序**: 适配器按注册顺序检查，确保最具体的适配器优先
3. **日志级别**: 确保 Logger 设置为 DEBUG 级别以查看详细日志
4. **浏览器兼容性**: 测试主流浏览器（Chrome, Firefox, Edge）

## 测试报告模板

```markdown
## 测试执行报告

**测试日期**: YYYY-MM-DD
**测试人员**: QA Engineer
**测试环境**: Development

### 测试结果摘要
- 通过: X/Y
- 失败: X/Y
- 阻塞: X/Y

### 详细结果

#### 测试用例 1: Competitor Report 格式识别
- 状态: ✅ 通过 / ❌ 失败
- 备注:

#### 测试用例 2: Product Overview Report 格式识别
- 状态: ✅ 通过 / ❌ 失败
- 备注:

#### 测试用例 3: 日志输出验证
- 状态: ✅ 通过 / ❌ 失败
- 备注:

#### 测试用例 4: UI 关键词填充验证
- 状态: ✅ 通过 / ❌ 失败
- 备注:

#### 测试用例 5: 回退机制验证
- 状态: ✅ 通过 / ❌ 失败
- 备注:

### 发现的问题
1.
2.

### 建议
1.
2.
```

## 下一步行动
1. 等待 fix-engineer 完成修复
2. 执行上述测试用例
3. 记录测试结果
4. 向 team-lead 汇报验证结果
