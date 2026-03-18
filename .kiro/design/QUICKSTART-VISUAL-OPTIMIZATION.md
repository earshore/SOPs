# Welcome Banner 视觉优化 - 快速开始

## 🚀 一键执行

### 方式 1: 使用 Python 脚本（推荐）

```bash
# 预览将要更新的文件
python scripts/update-welcome-visual.py --dry-run

# 执行批量更新
python scripts/update-welcome-visual.py
```

### 方式 2: 手动更新单个模块

参考下面的模板，复制粘贴到对应模块的 template.html 文件中。

---

## 📋 配色方案速查表

### AI & 技术类（蓝色系）
```css
style="--wb-gradient-1: rgba(239, 246, 255, 0.95); --wb-gradient-2: rgba(219, 234, 254, 0.90); --wb-orb-1-color: rgba(96, 165, 250, 0.15); --wb-orb-2-color: rgba(147, 197, 253, 0.12); --wb-orb-3-color: rgba(59, 130, 246, 0.08); --wb-particle-color: rgba(59, 130, 246, 0.6)"
```

### 增长类（绿色系）
```css
style="--wb-gradient-1: rgba(236, 253, 245, 0.95); --wb-gradient-2: rgba(209, 250, 229, 0.90); --wb-orb-1-color: rgba(52, 211, 153, 0.15); --wb-orb-2-color: rgba(110, 231, 183, 0.12); --wb-orb-3-color: rgba(16, 185, 129, 0.08); --wb-particle-color: rgba(16, 185, 129, 0.6)"
```

### 安全类（橙色系）
```css
style="--wb-gradient-1: rgba(255, 247, 237, 0.95); --wb-gradient-2: rgba(255, 237, 213, 0.90); --wb-orb-1-color: rgba(251, 146, 60, 0.15); --wb-orb-2-color: rgba(253, 186, 116, 0.12); --wb-orb-3-color: rgba(249, 115, 22, 0.08); --wb-particle-color: rgba(249, 115, 22, 0.6)"
```

### 服务类（紫色系）
```css
style="--wb-gradient-1: rgba(250, 245, 255, 0.95); --wb-gradient-2: rgba(243, 232, 255, 0.90); --wb-orb-1-color: rgba(192, 132, 252, 0.15); --wb-orb-2-color: rgba(216, 180, 254, 0.12); --wb-orb-3-color: rgba(168, 85, 247, 0.08); --wb-particle-color: rgba(168, 85, 247, 0.6)"
```

### 供应链类（琥珀色系）
```css
style="--wb-gradient-1: rgba(255, 251, 235, 0.95); --wb-gradient-2: rgba(254, 243, 199, 0.90); --wb-orb-1-color: rgba(251, 191, 36, 0.15); --wb-orb-2-color: rgba(252, 211, 77, 0.12); --wb-orb-3-color: rgba(245, 158, 11, 0.08); --wb-particle-color: rgba(245, 158, 11, 0.6)"
```

### 分析类（青色系）
```css
style="--wb-gradient-1: rgba(236, 254, 255, 0.95); --wb-gradient-2: rgba(207, 250, 254, 0.90); --wb-orb-1-color: rgba(34, 211, 238, 0.15); --wb-orb-2-color: rgba(103, 232, 249, 0.12); --wb-orb-3-color: rgba(6, 182, 212, 0.08); --wb-particle-color: rgba(6, 182, 212, 0.6)"
```

### 知识中心类（灰色系）
```css
style="--wb-gradient-1: rgba(248, 250, 252, 0.95); --wb-gradient-2: rgba(241, 245, 249, 0.90); --wb-orb-1-color: rgba(148, 163, 184, 0.15); --wb-orb-2-color: rgba(203, 213, 225, 0.12); --wb-orb-3-color: rgba(100, 116, 139, 0.08); --wb-particle-color: rgba(100, 116, 139, 0.6)"
```

### 探索类（靛蓝色系）
```css
style="--wb-gradient-1: rgba(238, 242, 255, 0.95); --wb-gradient-2: rgba(224, 231, 255, 0.90); --wb-orb-1-color: rgba(129, 140, 248, 0.15); --wb-orb-2-color: rgba(165, 180, 252, 0.12); --wb-orb-3-color: rgba(99, 102, 241, 0.08); --wb-particle-color: rgba(99, 102, 241, 0.6)"
```

---

## 🎨 完整 HTML 模板

### 使用 wb-card 布局（推荐）

```html
<div class="wb-container mb-8" style="[选择上面的配色方案]">
    <div class="wb-card">
        <!-- 背景装饰 -->
        <div class="wb-bg-gradient"></div>
        <div class="wb-orb wb-orb-1"></div>
        <div class="wb-orb wb-orb-2"></div>
        <div class="wb-orb wb-orb-3"></div>
        <div class="wb-grid-pattern"></div>

        <!-- 浮动粒子 -->
        <div class="wb-particle wb-particle-1"></div>
        <div class="wb-particle wb-particle-2"></div>
        <div class="wb-particle wb-particle-3"></div>
        <div class="wb-particle wb-particle-4"></div>
        <div class="wb-particle wb-particle-5"></div>
        <div class="wb-particle wb-particle-6"></div>
        <div class="wb-particle wb-particle-7"></div>
        <div class="wb-particle wb-particle-8"></div>

        <div class="wb-content">
            <div class="wb-header">
                <!-- Icon -->
                <div class="wb-icon-wrapper">
                    <div class="wb-icon-main" aria-label="图标描述">
                        <i class="fas fa-icon-name" aria-hidden="true"></i>
                    </div>
                    <div class="wb-icon-badge" aria-label="状态">
                        <i class="fas fa-bolt" aria-hidden="true"></i>
                    </div>
                </div>

                <!-- Content -->
                <div class="wb-text">
                    <div class="wb-title-row">
                        <h2 class="wb-title">模块标题</h2>
                        <span class="wb-badge wb-badge-ai" aria-label="类别">
                            <i class="fas fa-star" aria-hidden="true"></i>BADGE
                        </span>
                    </div>
                    <p class="wb-description">
                        模块描述文字
                    </p>

                    <!-- Feature Tags -->
                    <ul class="wb-tags" role="list">
                        <li class="wb-tag" role="listitem">
                            <div class="wb-tag-dot" aria-hidden="true"></div>
                            <span>特性 1</span>
                        </li>
                        <li class="wb-tag" role="listitem">
                            <div class="wb-tag-dot" aria-hidden="true"></div>
                            <span>特性 2</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 使用简化布局

```html
<div class="wb-container" style="[选择上面的配色方案]">
    <div class="wb-orb wb-orb-1"></div>
    <div class="wb-orb wb-orb-2"></div>
    <div class="wb-orb wb-orb-3"></div>
    
    <!-- 浮动粒子 -->
    <div class="wb-particle wb-particle-1"></div>
    <div class="wb-particle wb-particle-2"></div>
    <div class="wb-particle wb-particle-3"></div>
    <div class="wb-particle wb-particle-4"></div>
    <div class="wb-particle wb-particle-5"></div>
    <div class="wb-particle wb-particle-6"></div>
    <div class="wb-particle wb-particle-7"></div>
    <div class="wb-particle wb-particle-8"></div>
    
    <div class="wb-content">
        <div class="wb-icon">
            <i class="fas fa-icon-name"></i>
        </div>
        <div class="wb-title-row">
            <h1 class="wb-title">模块标题</h1>
            <span class="wb-badge wb-badge-ai">
                <i class="fa-solid fa-icon"></i>BADGE
            </span>
        </div>
        <p class="wb-description">模块描述</p>
        <div class="wb-meta">
            <span><i class="fas fa-tag mr-1"></i>标签 1</span>
            <span><i class="fas fa-tag mr-1"></i>标签 2</span>
        </div>
    </div>
</div>
```

---

## ✅ 验证清单

更新完成后，请检查：

### 视觉效果
- [ ] 配色方案正确应用
- [ ] 8 个粒子都显示正常
- [ ] 3 个光球都存在
- [ ] 动画流畅自然
- [ ] 文字清晰可读

### 技术检查
- [ ] HTML 结构完整
- [ ] CSS 变量正确设置
- [ ] 无控制台错误
- [ ] 响应式布局正常

### 浏览器测试
- [ ] Chrome/Edge 显示正常
- [ ] Firefox 显示正常
- [ ] Safari 显示正常（如有）
- [ ] 移动端显示正常

---

## 🐛 常见问题

### Q: 粒子不显示？
A: 检查是否添加了所有 8 个粒子 div，确保 CSS 文件已更新。

### Q: 颜色不对？
A: 确认 style 属性中的 CSS 变量值正确，注意 rgba 格式。

### Q: 动画卡顿？
A: 检查是否有其他高性能消耗的动画，考虑减少粒子数量。

### Q: 暗色模式显示异常？
A: welcome-banner.css 已包含暗色模式适配，检查是否有其他样式覆盖。

---

## 📞 获取帮助

如有问题，请查看：
- 📄 [完整优化方案](.kiro/design/welcome-visual-optimization-plan.md)
- 📄 [优化总结](.kiro/design/welcome-visual-optimization-summary.md)
- 📄 [CSS 组件文档](src/css/components/welcome-banner.css)

---

**最后更新**: 2026-03-18  
**版本**: v1.0
