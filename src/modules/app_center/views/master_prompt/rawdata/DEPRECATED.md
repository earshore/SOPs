# ⚠️ 模块已弃用

## 状态

**此模块已于 v2.0.0 版本弃用，并将在未来版本中移除。**

## 原因

为了提供更统一的用户体验，我们将"数据管理"页面的功能集成到了"数据采集"页面中。从逻辑上讲，导入JSON也是一种数据采集方式，因此将这两个功能合并到一个页面更加合理。

## 迁移路径

### 对于用户

- 所有数据管理功能现已集成到"数据采集"页面
- 您可以在"数据采集"页面中完成以下操作：
  - 从亚马逊采集产品数据
  - 导入本地JSON文件
  - 预览和编辑产品数据
  - 查看和管理历史记录

### 对于开发者

如果您的代码依赖此模块的导出函数，请迁移到 `scraper` 模块：

#### 导入路径变更

**旧代码：**
```typescript
import { 
  renderDataPanel, 
  triggerImport, 
  switchDataTab,
  toggleCardExpand,
  deleteProduct,
  deleteReview
} from 'src/modules/app_center/views/master_prompt/rawdata';
```

**新代码：**
```typescript
import { 
  renderDataPanel, 
  triggerImport, 
  switchDataTab,
  toggleCardExpand,
  deleteProduct,
  deleteReview
} from 'src/modules/app_center/views/master_prompt/scraper';
```

#### API兼容性

所有 `rawdata` 模块导出的函数在 `scraper` 模块中都有对应的向后兼容版本，函数签名保持不变：

| 函数名 | 说明 | 兼容性 |
|--------|------|--------|
| `renderDataPanel()` | 渲染数据预览面板 | ✅ 完全兼容 |
| `triggerImport()` | 触发文件导入对话框 | ✅ 完全兼容 |
| `switchDataTab(tab)` | 切换数据标签页 | ✅ 完全兼容 |
| `handleImportFiles(event)` | 处理文件导入事件 | ✅ 完全兼容 |
| `toggleCardExpand(asin)` | 切换产品卡片展开状态 | ✅ 完全兼容 |
| `deleteProduct(asin)` | 删除指定产品 | ✅ 完全兼容 |
| `deleteReview(asin, index)` | 删除指定评论 | ✅ 完全兼容 |

#### 状态管理变更

**旧状态命名空间：**
```typescript
state.masterPrompt.expandedAsin
state.masterPrompt.currentDataTab
```

**新状态命名空间：**
```typescript
state.scraper.expandedAsin
state.scraper.currentDataTab
```

所有数据现在统一保存在 `state.scraper` 命名空间下。

#### 事件通信

事件名称保持不变，无需修改：

- `APP_EVENTS.DATA_UPDATED` - 数据更新事件
- `APP_EVENTS.HISTORY_UPDATED` - 历史记录更新事件
- `MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS` - 采集成功事件

## 功能对照表

| 原 rawdata 功能 | 新 scraper 功能 | 位置 |
|----------------|----------------|------|
| JSON文件导入 | ✅ 已集成 | 数据预览区域顶部"导入JSON"按钮 |
| 数据预览（卡片视图） | ✅ 已集成 | 数据预览标签页 |
| JSON数据查看 | ✅ 已集成 | JSON数据标签页 |
| 产品删除 | ✅ 已集成 | 卡片右上角删除按钮 |
| 评论删除 | ✅ 已集成 | 评论卡片右上角删除按钮 |
| 多站点数据合并 | ✅ 已集成 | 导入时自动处理 |

## 技术改进

集成后的 `scraper` 模块提供了以下改进：

1. **统一的用户体验** - 所有数据采集相关操作在一个页面完成
2. **性能优化** - 支持大数据集分页渲染，避免页面卡顿
3. **安全增强** - 所有用户输入都经过XSS防护处理
4. **更好的错误处理** - 提供更友好的错误提示和日志记录
5. **事件委托** - 使用事件委托优化大量DOM元素的交互性能

## 时间线

- **v2.0.0** (当前) - 模块标记为弃用，功能已迁移到 scraper
- **v2.1.0** (计划) - 移除 rawdata 模块的菜单入口
- **v3.0.0** (计划) - 完全移除 rawdata 模块代码

## 支持

如果您在迁移过程中遇到问题，请：

1. 查看 `scraper` 模块的文档
2. 检查控制台是否有警告或错误信息
3. 联系开发团队获取帮助

## 相关文档

- [数据采集页面集成 - 需求文档](../../../../.kiro/specs/data-collection-integration/requirements.md)
- [数据采集页面集成 - 设计文档](../../../../.kiro/specs/data-collection-integration/design.md)
- [Scraper 模块源码](../scraper/index.ts)
