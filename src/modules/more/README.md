# More Module - 探索功能

## 模块结构

```
src/modules/more/
├── more.html              # 探索主页面（包含三个功能卡片）
├── more.js                # 路由处理和动态加载逻辑
├── README.md              # 本文档
└── views/                 # 子页面目录
    ├── agents/            # 智能体页面
    │   ├── index.js       # 智能体页面逻辑
    │   └── template.html  # 智能体页面模板
    ├── prompts/           # 提示词页面
    │   ├── index.js       # 提示词页面逻辑
    │   └── template.html  # 提示词页面模板
    └── workflows/         # 工作流页面
        ├── index.js       # 工作流页面逻辑
        └── template.html  # 工作流页面模板
```

## 路由配置

在 `src/common/config/menuConfig.js` 中配置了以下路由：

- `more_explore` - 探索主页（显示三个功能卡片）
- `explore_agents` - 智能体页面
- `explore_prompts` - 提示词页面
- `explore_workflows` - 工作流页面

## 工作原理

1. **主页面显示**：当导航到 `more_explore` 时，显示 `more.html` 中的三个功能卡片
2. **子页面加载**：点击卡片后，通过 `more.js` 动态加载对应的子页面模板
3. **内容替换**：子页面内容会替换 `more_content_area` 区域的内容
4. **返回功能**：每个子页面都有返回按钮，点击后恢复主页面内容

## 开发指南

### 添加新功能

1. 在 `views/` 目录下创建新的子目录
2. 创建 `template.html` 和 `index.js` 文件
3. 在 `menuConfig.js` 中添加路由配置
4. 在 `more.html` 中添加功能卡片
5. 在 `more.js` 的 `handleMoreRoute` 中添加路由处理

### 完善现有功能

目前三个子页面都是占位页面，可以直接修改对应的 `template.html` 和 `index.js` 来实现具体功能。

#### 智能体页面 (agents)
- 路径：`src/modules/more/views/agents/`
- 用途：AI智能体管理与配置

#### 提示词页面 (prompts)
- 路径：`src/modules/more/views/prompts/`
- 用途：提示词模板库与管理

#### 工作流页面 (workflows)
- 路径：`src/modules/more/views/workflows/`
- 用途：自动化工作流配置与管理

## 注意事项

- 所有子页面都在同一个 `panel-more` 面板内动态切换
- 使用 `window.switchTab()` 进行路由导航
- 子页面的 JS 模块会在加载时自动初始化
- 返回按钮使用 `window.switchTab('more_explore', true)` 返回主页
