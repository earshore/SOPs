// src/modules/more/views/explore/prompts/constants/promptLibrary.js
// ================================================================
// 🎯 专业提示词库 - 亚马逊欧洲站头部卖家实战经验
// ================================================================

/**
 * 类型定义
 */
export type PromptCategoryId = 'listing' | 'review' | 'customer' | 'marketing' | 'competitor' | 'compliance';

export type RecommendedModelKey = 'GPT4' | 'GPT4_TURBO' | 'CLAUDE_OPUS' | 'CLAUDE_SONNET' | 'GEMINI_PRO';

export interface PromptCategory {
    id: PromptCategoryId;
    name: string;
    icon: string;
    color: string;
}

export interface RecommendedModel {
    id: string;
    name: string;
    provider: string;
    badge: string;
}

export interface PromptItem {
    id: string;
    category: PromptCategoryId;
    title: string;
    description: string;
    recommendedModel: RecommendedModelKey;
    prompt: string;
    promptEn: string;
}

/**
 * 提示词分类
 */
export const PROMPT_CATEGORIES: Record<string, PromptCategory> = {
    LISTING: { id: 'listing', name: 'Listing优化', icon: 'fa-file-alt', color: 'blue' },
    REVIEW: { id: 'review', name: '评论分析', icon: 'fa-comments', color: 'purple' },
    CUSTOMER: { id: 'customer', name: '客户服务', icon: 'fa-headset', color: 'green' },
    MARKETING: { id: 'marketing', name: '营销推广', icon: 'fa-bullhorn', color: 'orange' },
    COMPETITOR: { id: 'competitor', name: '竞品分析', icon: 'fa-chart-line', color: 'red' },
    COMPLIANCE: { id: 'compliance', name: '合规检查', icon: 'fa-shield-alt', color: 'indigo' }
};

/**
 * 推荐模型配置
 */
export const RECOMMENDED_MODELS: Record<RecommendedModelKey, RecommendedModel> = {
    GPT4: { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', badge: '最佳' },
    GPT4_TURBO: { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', badge: '推荐' },
    CLAUDE_OPUS: { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', badge: '推荐' },
    CLAUDE_SONNET: { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', badge: '高性价比' },
    GEMINI_PRO: { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', badge: '快速' }
};

/**
 * 专业提示词库
 */
export const PROMPT_LIBRARY: readonly PromptItem[] = [
    // ============================================================
    // Listing 优化类
    // ============================================================
    {
        id: 'listing_title_optimize',
        category: 'listing',
        title: '产品标题优化',
        description: '基于关键词研究和竞品分析,生成高转化率的产品标题',
        recommendedModel: 'GPT4_TURBO',
        prompt: `# Role
亚马逊欧洲站Listing优化专家，10年+实战经验，精通DE/FR/IT/ES/NL五站本地化。

# Task
生成3版优化标题，平衡SEO与转化率。

# Input
- 产品类型: {{product_type}}
- 核心卖点: {{key_benefits}}
- 目标站点: {{marketplace}}
- 主关键词: {{primary_keywords}}
- 竞品参考: {{competitor_titles}}

# Rules
1. 长度: 150-200字符，前80字符含核心词+主卖点
2. 结构: 品牌+核心词+材质/规格+功能+适用场景+差异化
3. 禁止: 促销词(Best/Cheap)、特殊符号堆砌、重复词根
4. 本地化:
   - DE: 复合名词正确拼写，首字母大写规则
   - FR: 性数配合，介词用法(pour/avec)
   - IT: 形容词后置，冠词用法
   - ES: 重音符号，倒装问句避免
   - NL: 可混用英语专业术语

# Output Format
## 版本A: 转化优先
[标题]
- 字符数: X
- 策略: 强调使用场景和情感利益

## 版本B: SEO优先
[标题]
- 字符数: X
- 策略: 最大化关键词覆盖

## 版本C: 平衡版
[标题]
- 字符数: X
- 策略: 兼顾搜索与点击

## 关键词覆盖检查
| 关键词 | A | B | C |
|--------|---|---|---|`,
        promptEn: `# Role
Amazon EU Listing Specialist, 10+ years experience, native-level localization for DE/FR/IT/ES/NL.

# Task
Generate 3 optimized title versions balancing SEO and conversion.

# Input
- Product: {{product_type}}
- Key Benefits: {{key_benefits}}
- Marketplace: {{marketplace}}
- Keywords: {{primary_keywords}}
- Competitor Ref: {{competitor_titles}}

# Rules
1. Length: 150-200 chars, first 80 chars = core keyword + main benefit
2. Structure: Brand + Core KW + Material/Spec + Function + Use Case + USP
3. Avoid: Promotional words, symbol stuffing, keyword repetition
4. Localization:
   - DE: Compound noun rules, capitalization
   - FR: Gender/number agreement, prepositions
   - IT: Adjective placement, articles
   - ES: Accent marks, proper syntax
   - NL: English tech terms acceptable

# Output
## Version A: Conversion-First
[Title] | Chars: X | Strategy: Benefit-focused

## Version B: SEO-First
[Title] | Chars: X | Strategy: Max keyword coverage

## Version C: Balanced
[Title] | Chars: X | Strategy: Hybrid approach

## Keyword Coverage Matrix
| Keyword | A | B | C |`
    },

    {
        id: 'listing_bullets_optimize',
        category: 'listing',
        title: '五点描述优化',
        description: '创建结构化、高转化的产品五点描述',
        recommendedModel: 'CLAUDE_SONNET',
        prompt: `# Role
亚马逊欧洲站文案专家，专注高转化Bullet Points撰写。

# Task
创建5条结构化卖点描述，每条解决一个客户核心关切。

# Input
- 产品: {{product_name}}
- 客户画像: {{target_customer}}
- 客户痛点: {{pain_points}}
- 产品优势: {{advantages}}
- 使用场景: {{use_cases}}
- 目标站点: {{marketplace}}

# Framework (每条结构)
[Emoji] **关键词开头** - 痛点触发 → 解决方案 → 具体利益

# 5条内容规划
1. **核心差异化** - 为什么选我们而非竞品
2. **品质信任** - 材质/认证/工艺背书
3. **功能价值** - 具体功能带来的实际好处
4. **场景延展** - 多场景适用性扩大需求
5. **无忧承诺** - 消除购买顾虑的临门一脚

# Rules
- 长度: 200-250字符/条 (DE站可至280)
- 关键词: 每条埋入1-2个长尾词，自然不堆砌
- 禁止: 夸大声明、绝对化用语、竞品贬低
- 本地化偏好:
  - DE: 重技术参数、认证
  - FR: 重设计感、生活方式
  - IT: 重工艺、材质故事
  - ES: 重家庭、实用性

# Output
| # | Bullet Point | 字符 | 埋词 | 策略意图 |
|---|--------------|------|------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |`,
        promptEn: `# Role
Amazon EU copywriter, specialized in high-converting Bullet Points.

# Task
Create 5 structured bullets, each addressing one core customer concern.

# Input
- Product: {{product_name}}
- Target Customer: {{target_customer}}
- Pain Points: {{pain_points}}
- Advantages: {{advantages}}
- Use Cases: {{use_cases}}
- Marketplace: {{marketplace}}

# Framework (per bullet)
[Emoji] **Keyword Lead** - Pain trigger → Solution → Concrete benefit

# 5-Bullet Strategy
1. **Core USP** - Why choose us over competitors
2. **Quality Trust** - Materials/certifications/craftsmanship
3. **Feature Value** - Specific benefits from features
4. **Scene Extension** - Multi-scenario applicability
5. **Risk Removal** - Eliminate purchase hesitation

# Rules
- Length: 200-250 chars/bullet (280 for DE)
- Keywords: 1-2 long-tail per bullet, natural integration
- Avoid: Exaggeration, absolute claims, competitor bashing
- Local preferences:
  - DE: Tech specs, certifications
  - FR: Design, lifestyle
  - IT: Craftsmanship, materials
  - ES: Family, practicality

# Output
| # | Bullet | Chars | Keywords | Intent |
|---|--------|-------|----------|--------|`
    },

    {
        id: 'listing_description_html',
        category: 'listing',
        title: 'A+页面内容策划',
        description: '设计专业的A+页面内容结构和文案',
        recommendedModel: 'GPT4',
        prompt: `# Role
亚马逊A+内容策划师，精通品牌故事视觉化与转化路径设计。

# Task
设计7模块A+页面完整方案，含文案与视觉brief。

# Input
- 产品: {{product_type}}
- 品牌调性: {{brand_tone}}
- 核心差异化: {{usp}}
- 目标客户: {{target_audience}}
- 使用场景: {{use_cases}}
- 目标站点: {{marketplace}}

# 7-Module Structure

## M1: Hero Banner (品牌首屏)
- 目的: 3秒抓住注意力，传达核心价值
- 文案: 品牌Slogan + 一句话价值主张 (≤15词)
- 视觉: 生活场景主图 + 品牌Logo

## M2: USP Grid (卖点矩阵)
- 目的: 快速传递3-4个核心功能
- 文案: 每格 图标+标题(3词)+说明(15词)
- 视觉: 统一风格图标，产品局部特写

## M3: Lifestyle Gallery (场景展示)
- 目的: 情感共鸣，想象拥有后的生活
- 文案: 场景标题 + 情境描述 (≤20词/张)
- 视觉: 2-3张目标客户生活场景

## M4: Tech Specs (细节信任)
- 目的: 建立专业可信度
- 文案: 参数名称 + 数值 + 客户利益转化
- 视觉: 产品分解图/材质特写

## M5: Comparison (对比优势)
- 目的: 引导选择，避免跳出比价
- 文案: ✓/✗ 对比项 (我们 vs 普通产品，非点名竞品)
- 视觉: 对比表格模块

## M6: How-to (使用指南)
- 目的: 降低使用门槛，减少售后
- 文案: 3-5步骤，动词开头 (≤10词/步)
- 视觉: 步骤示意图

## M7: Brand Promise (信任闭环)
- 目的: 临门一脚，消除最后顾虑
- 文案: 质保 + 售后承诺 + 品牌故事片段
- 视觉: 认证标识 + 团队/工厂图

# Rules
- 移动端优先: 60%用户手机浏览
- 合规: 避免绝对化声明，含WEEE等必要标识
- 本地化: 文案需翻译，图片文字需替换

# Output
每模块输出:
1. 文案(目标语言)
2. 视觉Brief(50词内)
3. 关键转化点标注`,
        promptEn: `# Role
Amazon A+ Content Strategist, expert in brand storytelling and conversion optimization.

# Task
Design complete 7-module A+ page with copy and visual briefs.

# Input
- Product: {{product_type}}
- Brand Tone: {{brand_tone}}
- USP: {{usp}}
- Target: {{target_audience}}
- Use Cases: {{use_cases}}
- Marketplace: {{marketplace}}

# 7-Module Framework

## M1: Hero Banner
- Goal: 3-sec attention grab
- Copy: Slogan + value prop (≤15 words)
- Visual: Lifestyle hero + logo

## M2: USP Grid
- Goal: Quick feature scan
- Copy: Icon + title(3w) + desc(15w) × 3-4
- Visual: Unified icons, product details

## M3: Lifestyle Gallery
- Goal: Emotional connection
- Copy: Scene title + context (≤20w/image)
- Visual: 2-3 target customer scenarios

## M4: Tech Specs
- Goal: Build credibility
- Copy: Spec + value + benefit translation
- Visual: Exploded view/material closeup

## M5: Comparison
- Goal: Guide choice, prevent bounce
- Copy: ✓/✗ Us vs Generic (no competitor naming)
- Visual: Comparison table module

## M6: How-to Guide
- Goal: Lower barrier, reduce returns
- Copy: 3-5 steps, verb-led (≤10w/step)
- Visual: Step illustrations

## M7: Brand Promise
- Goal: Final conversion push
- Copy: Warranty + support + brand story
- Visual: Certifications + team/factory

# Output per Module
1. Copy (target language)
2. Visual Brief (≤50w)
3. Conversion point annotation`
    },

    // ============================================================
    // 评论分析类
    // ============================================================
    {
        id: 'review_sentiment_analysis',
        category: 'review',
        title: '评论情感分析',
        description: '深度分析产品评论,提取客户真实反馈和改进建议',
        recommendedModel: 'CLAUDE_OPUS',
        prompt: `# Role
VOC(客户声音)分析专家，擅长从评论中提取可执行商业洞察。

# Task
分析评论数据，输出结构化洞察报告与行动清单。

# Input
\`\`\`
{{review_data}}
格式: 星级 | 标题 | 正文 | 日期 | VP标记
\`\`\`

# Analysis Framework

## 1. Overview Dashboard
| 指标 | 数值 |
|------|------|
| 总评论数 | |
| 平均星级 | |
| VP比例 | |
| 正/中/负比例 | |
| 情感趋势(近3月) | ↑/→/↓ |

## 2. Topic Extraction
识别Top 10高频主题，按提及量排序:
| 主题 | 提及量 | 情感倾向 | 代表性原文 |
|------|--------|----------|------------|

## 3. Strengths Analysis (做对了什么)
提取3-5个客户最满意的点:
- **[优势点]**: 客户原话佐证 → Listing可强化方向

## 4. Pain Points Analysis (哪里痛)
按严重度(H/M/L)分级:
| 问题 | 严重度 | 占比 | 根因推测 | 影响 |
|------|--------|------|----------|------|

## 5. Unmet Needs (隐藏机会)
客户期望但未被满足的需求:
- 产品改进方向
- Listing期望管理建议

## 6. Competitive Mentions
客户主动提及的竞品对比:
| 竞品 | 对比维度 | 我们+/- |

# Output: Action Items
按优先级(P0/P1/P2)输出:
| 优先级 | 行动项 | 负责方 | 预期效果 |
|--------|--------|--------|----------|
| P0 | | 产品/运营 | |

# Rules
- 区分VP与非VP评论权重
- 识别可能的刷评/恶意差评特征
- 关注近期评论趋势变化`,
        promptEn: `# Role
VOC Analyst, expert in extracting actionable insights from customer reviews.

# Task
Analyze review data, output structured insights and action items.

# Input
\`\`\`
{{review_data}}
Format: Rating | Title | Body | Date | VP Flag
\`\`\`

# Analysis Framework

## 1. Dashboard
| Metric | Value |
|--------|-------|
| Total Reviews | |
| Avg Rating | |
| VP Ratio | |
| Pos/Neu/Neg | |
| Trend (3mo) | ↑/→/↓ |

## 2. Topic Extraction
Top 10 topics by mention volume:
| Topic | Count | Sentiment | Sample Quote |

## 3. Strengths (What works)
Top 3-5 customer satisfiers:
- **[Strength]**: Quote → Listing enhancement opportunity

## 4. Pain Points
Severity rated (H/M/L):
| Issue | Severity | % | Root Cause | Impact |

## 5. Unmet Needs (Hidden opportunities)
Customer expectations not met:
- Product improvement directions
- Listing expectation management

## 6. Competitive Mentions
| Competitor | Dimension | Our +/- |

# Output: Prioritized Actions
| Priority | Action | Owner | Expected Impact |
|----------|--------|-------|-----------------|
| P0 | | Product/Ops | |

# Rules
- Weight VP reviews higher
- Flag potential fake/malicious reviews
- Note recent trend shifts`
    },

    {
        id: 'review_response_template',
        category: 'review',
        title: '差评回复模板生成',
        description: '针对不同类型的差评,生成专业且有温度的回复',
        recommendedModel: 'GPT4_TURBO',
        prompt: `# Role
客户关系修复专家，精通差评转化与品牌声誉管理。

# Task
生成2版专业差评回复(正式版/温暖版)，目标: 展示专业度 + 潜在挽回。

# Input
- 星级: {{rating}}
- 标题: {{title}}
- 内容: {{content}}
- 问题分类: {{issue_type}} [质量/物流/使用/期望/服务]
- 客户情绪: {{emotion}} [愤怒/失望/困惑/理性]
- 目标站点: {{marketplace}}

# Response Framework (LEARN模型)
1. **Listen** - 确认收到，表达重视
2. **Empathize** - 同理心，理解感受
3. **Apologize** - 真诚道歉，不推责
4. **Resolve** - 具体解决方案
5. **Notify** - 邀请私下沟通，闭环

# Rules
- 长度: 120-180词 (太长不读)
- 24h内回复时效
- 禁止: 找借口、反驳客户、暴露内部问题
- 必须: 公开回复中不含订单号等隐私信息
- 本地化语气:
  - DE: Sehr geehrte/r开头，正式严谨
  - FR: 表达歉意可适度感性
  - IT: 可稍显热情
  - ES: 强调人情味
  - NL: 直接简洁

# Output

## 版本A: 正式专业版
\`\`\`
[回复正文 - 目标语言]
\`\`\`
- 沟通技巧标注: 

## 版本B: 温暖共情版
\`\`\`
[回复正文 - 目标语言]
\`\`\`
- 沟通技巧标注:

## 后续跟进SOP
1. 回复后X小时检查是否有追评
2. 若客户联系，提供[具体方案]
3. 问题解决后，礼貌询问是否愿意更新评价

## 避免的表达
- ❌ "但是..."
- ❌ "根据我们的政策..."
- ❌ "这不是我们的责任..."`,
        promptEn: `# Role
Customer Recovery Specialist, expert in review management and brand reputation.

# Task
Generate 2 professional negative review responses (Formal/Warm), goal: demonstrate professionalism + potential recovery.

# Input
- Rating: {{rating}}
- Title: {{title}}
- Content: {{content}}
- Issue Type: {{issue_type}} [Quality/Shipping/Usage/Expectation/Service]
- Customer Emotion: {{emotion}} [Angry/Disappointed/Confused/Rational]
- Marketplace: {{marketplace}}

# Response Framework (LEARN)
1. **Listen** - Acknowledge receipt, show attention
2. **Empathize** - Understand their feelings
3. **Apologize** - Sincere, no deflection
4. **Resolve** - Specific solution offered
5. **Notify** - Invite private contact, close loop

# Rules
- Length: 120-180 words
- 24h response time
- Never: Make excuses, argue, expose internal issues
- Must: No private info (order#) in public reply
- Tone by market:
  - DE: Formal, precise
  - FR: Emotionally appropriate
  - IT: Warm acceptable
  - ES: Personal touch
  - NL: Direct, concise

# Output

## Version A: Formal Professional
\`\`\`
[Response - target language]
\`\`\`
Technique notes:

## Version B: Warm Empathetic
\`\`\`
[Response - target language]
\`\`\`
Technique notes:

## Follow-up SOP
1. Check for reply after Xh
2. If customer contacts: [specific solution]
3. After resolution: politely ask for review update

## Phrases to Avoid
- ❌ "However..."
- ❌ "Per our policy..."
- ❌ "This is not our fault..."`
    },

    // ============================================================
    // 客户服务类
    // ============================================================
    {
        id: 'customer_email_template',
        category: 'customer',
        title: '客户邮件模板',
        description: '生成专业的客户服务邮件模板',
        recommendedModel: 'CLAUDE_SONNET',
        prompt: `# Role
跨境电商客服专家，精通欧洲客户沟通礼仪与亚马逊消息规范。

# Task
生成符合场景的客服邮件模板，含主题行与正文。

# Input
- 场景: {{scenario}}
  [订单确认/发货通知/延迟道歉/退换货/使用指导/售后关怀/好评邀请/问题解决]
- 产品: {{product_name}}
- 订单号: {{order_id}}
- 问题描述: {{issue}}
- 客户情绪: {{emotion}} [平静/焦虑/不满]
- 目标站点: {{marketplace}}

# Email Structure
1. **Subject Line** (含订单号后4位，关键信息前置)
2. **Greeting** (个性化称呼)
3. **Purpose** (首句说明来意)
4. **Body** (核心信息，分段清晰)
5. **Action** (明确下一步)
6. **Close** (专业温暖)

# Rules
- 长度: 80-120词 (移动端友好)
- 禁止: 外部链接、联系方式、索评暗示(非索评场景)
- 必须: 符合Amazon消息政策
- 本地化:
  - DE: Sehr geehrte/r + 姓氏, Mit freundlichen Grüßen
  - FR: 完整礼貌套语
  - IT: Gentile + 姓名
  - ES: Estimado/a
  - NL: 可用英语

# Output

## 主题行 (3选1)
1. 
2. 
3. 

## 邮件正文
\`\`\`
[完整邮件 - 目标语言]
\`\`\`

## 简洁跟进版 (50词内)
\`\`\`
[跟进邮件]
\`\`\`

## 场景升级预案
若客户回复不满意 → [应对话术]`,
        promptEn: `# Role
Cross-border CS Expert, fluent in EU customer etiquette and Amazon messaging policy.

# Task
Generate scenario-appropriate CS email template with subject line and body.

# Input
- Scenario: {{scenario}}
  [Order Confirm/Shipping/Delay/Return/Usage Guide/Follow-up/Review Request/Resolution]
- Product: {{product_name}}
- Order ID: {{order_id}}
- Issue: {{issue}}
- Customer Emotion: {{emotion}} [Calm/Anxious/Upset]
- Marketplace: {{marketplace}}

# Email Structure
1. **Subject** (Last 4 of order#, key info first)
2. **Greeting** (Personalized)
3. **Purpose** (First sentence = why writing)
4. **Body** (Core info, clear paragraphs)
5. **Action** (Clear next step)
6. **Close** (Professional, warm)

# Rules
- Length: 80-120 words (mobile-friendly)
- Never: External links, contact info, review hints (unless review request)
- Must: Comply with Amazon messaging policy
- Localization:
  - DE: Sehr geehrte/r + surname, formal close
  - FR: Full courtesy formulas
  - IT: Gentile + name
  - ES: Estimado/a
  - NL: English acceptable

# Output

## Subject Lines (pick 1 of 3)
1. 
2. 
3. 

## Email Body
\`\`\`
[Complete email - target language]
\`\`\`

## Brief Follow-up (≤50 words)
\`\`\`
[Follow-up email]
\`\`\`

## Escalation Response
If customer replies unsatisfied → [Response script]`
    },

    {
        id: 'customer_faq_generator',
        category: 'customer',
        title: 'FAQ生成器',
        description: '基于常见问题生成结构化的FAQ内容',
        recommendedModel: 'GPT4',
        prompt: `# Role
产品文档专家，擅长将客服数据转化为自助FAQ，降低咨询量。

# Task
生成分类FAQ，覆盖售前到售后全链路问题。

# Input
- 产品: {{product_name}}
- 产品类型: {{product_type}}
- 问题来源: {{sources}} [客服记录/差评/退货原因]
- 目标站点: {{marketplace}}
- 高频问题: {{top_issues}}

# FAQ Categories (每类3-5个Q&A)

## 1. Pre-Purchase (购前)
- 规格确认类
- 兼容性类
- 包装内容类

## 2. Usage (使用)
- 首次设置
- 常用功能
- 故障排除

## 3. Care (维护)
- 清洁保养
- 存储要求
- 耗材更换

## 4. Order & Shipping (订单物流)
- 发货时效
- 物流追踪
- 关税说明

## 5. Returns (退换货)
- 退货条件 (14天无理由-欧盟法定)
- 退货流程
- 退款时效

## 6. Warranty (质保)
- 质保范围
- 索赔流程
- 联系方式

# Q&A Format
**Q: [客户视角的问题,口语化]**
A: [答案,50-80词]
- 避免专业术语
- 可加内链锚点占位符 {{link:xxx}}

# Output
按类别输出完整FAQ
标注: 高频🔥 / 易引发差评⚠️ / 可减少退货💰`,
        promptEn: `# Role
Product Documentation Expert, skilled in converting CS data into self-service FAQ to reduce inquiries.

# Task
Generate categorized FAQ covering pre-sale to post-sale journey.

# Input
- Product: {{product_name}}
- Product Type: {{product_type}}
- Data Sources: {{sources}} [CS tickets/Reviews/Returns]
- Marketplace: {{marketplace}}
- Top Issues: {{top_issues}}

# FAQ Categories (3-5 Q&As each)

## 1. Pre-Purchase
- Spec confirmation
- Compatibility
- Package contents

## 2. Usage
- Initial setup
- Common functions
- Troubleshooting

## 3. Care
- Cleaning/maintenance
- Storage
- Consumables

## 4. Order & Shipping
- Dispatch time
- Tracking
- Customs/duties

## 5. Returns
- Return policy (14-day EU statutory)
- Process
- Refund timeline

## 6. Warranty
- Coverage
- Claim process
- Contact

# Q&A Format
**Q: [Customer-perspective, conversational]**
A: [Answer, 50-80 words]
- Avoid jargon
- Add link placeholders {{link:xxx}}

# Output
Complete FAQ by category
Tags: Frequent🔥 / Review-risk⚠️ / Return-saver💰`
    },

    // ============================================================
    // 营销推广类
    // ============================================================
    {
        id: 'marketing_campaign_plan',
        category: 'marketing',
        title: '促销活动策划',
        description: '设计完整的促销活动方案,包括Prime Day、黑五等',
        recommendedModel: 'GPT4',
        prompt: `# Role
亚马逊欧洲站大促操盘手，多次Prime Day/黑五百万级GMV实战经验。

# Task
制定完整促销方案，含时间线、定价、流量、库存全链路规划。

# Input
- 活动: {{event}} [Prime Day/黑五网一/Easter/圣诞/闪购]
- 时间: {{dates}}
- 站点: {{marketplaces}}
- ASIN: {{asin}}
- 当前数据: BSR {{bsr}}, 日销 {{daily_sales}}, 评分 {{rating}}
- 库存: {{inventory_status}} [充足/正常/紧张]
- 预算: {{budget}}
- 成本: {{cogs}} (不含头程FBA)

# Campaign Framework

## 1. 目标设定 (SMART)
| 指标 | 目标值 | 底线值 |
|------|--------|--------|
| 销量 | | |
| GMV | | |
| BSR | | |
| ACoS | | |
| 利润率 | | |

## 2. 定价策略
- 日常价: €XX
- 活动价: €XX (折扣 X%)
- 优惠券: €X (类型: X%)
- 会员专享: €XX
- 最低可接受价: €XX (保本线)
- 活动后恢复策略: 

## 3. 流量矩阵
| 渠道 | 预算占比 | 策略 | KPI |
|------|----------|------|-----|
| SP广告 | X% | | |
| SB广告 | X% | | |
| SD广告 | X% | | |
| Deal | - | LD/BD申请 | |
| 站外 | X% | | |

## 4. 时间线
| 阶段 | 时间 | 核心任务 | Checklist |
|------|------|----------|-----------|
| T-4周 | | 库存确认+Deal申请 | ☐☐☐ |
| T-2周 | | Listing优化+广告预热 | ☐☐☐ |
| T-1周 | | 价格设置+最终检查 | ☐☐☐ |
| 活动期 | | 实时监控+动态调整 | ☐☐☐ |
| T+1周 | | 复盘+价格恢复 | ☐☐☐ |

## 5. 库存规划
- 活动预估销量: X units
- 安全库存: X units
- 当前可售天数: X days
- 需补货: ☐是 ☐否
- 断货预案: 

## 6. 风险预案
| 风险 | 触发条件 | 应对措施 |
|------|----------|----------|
| 库存告急 | <X天 | |
| 竞品价格战 | 低于€X | |
| 广告超支 | ACoS>X% | |
| 差评激增 | 日均>X条 | |

# Output
1. 一页纸决策摘要
2. 详细执行方案
3. 每日Checklist
4. 复盘模板`,
        promptEn: `# Role
Amazon EU Campaign Strategist, 7-figure GMV experience in Prime Day/Black Friday.

# Task
Create complete campaign plan covering timeline, pricing, traffic, inventory.

# Input
- Event: {{event}} [Prime Day/BFCM/Easter/Christmas/Flash]
- Dates: {{dates}}
- Marketplaces: {{marketplaces}}
- ASIN: {{asin}}
- Current: BSR {{bsr}}, Daily {{daily_sales}}, Rating {{rating}}
- Inventory: {{inventory_status}} [Sufficient/Normal/Tight]
- Budget: {{budget}}
- COGS: {{cogs}} (ex. logistics)

# Campaign Framework

## 1. Goals (SMART)
| Metric | Target | Floor |
|--------|--------|-------|
| Units | | |
| GMV | | |
| BSR | | |
| ACoS | | |
| Margin | | |

## 2. Pricing Strategy
- Regular: €XX
- Event: €XX (X% off)
- Coupon: €X (type)
- Prime Exclusive: €XX
- Floor Price: €XX (breakeven)
- Post-event recovery:

## 3. Traffic Matrix
| Channel | Budget % | Strategy | KPI |
|---------|----------|----------|-----|
| SP | X% | | |
| SB | X% | | |
| SD | X% | | |
| Deals | - | LD/BD | |
| Off-Amazon | X% | | |

## 4. Timeline
| Phase | Time | Tasks | Checklist |
|-------|------|-------|-----------|
| T-4wk | | Inventory + Deal submit | ☐☐☐ |
| T-2wk | | Listing + Ad warmup | ☐☐☐ |
| T-1wk | | Pricing + Final check | ☐☐☐ |
| Event | | Monitor + Adjust | ☐☐☐ |
| T+1wk | | Review + Price restore | ☐☐☐ |

## 5. Inventory Planning
- Event forecast: X units
- Safety stock: X units
- Current DOS: X days
- Restock needed: ☐Y ☐N
- Stockout contingency:

## 6. Risk Contingency
| Risk | Trigger | Response |
|------|---------|----------|
| Low stock | <X days | |
| Price war | <€X | |
| Ad overspend | ACoS>X% | |
| Review spike | >X/day | |

# Output
1. One-page executive summary
2. Detailed execution plan
3. Daily checklist
4. Post-mortem template`
    },

    {
        id: 'marketing_social_content',
        category: 'marketing',
        title: '社交媒体内容创作',
        description: '为Instagram、Facebook等平台创作产品推广内容',
        recommendedModel: 'CLAUDE_SONNET',
        prompt: `# Role
欧洲市场社媒营销专家，精通各平台算法与本地化内容策略。

# Task
创建一周社媒内容日历，含文案、视觉brief与hashtag策略。

# Input
- 产品: {{product_name}}
- 目标受众: {{audience}} (年龄/性别/兴趣/痛点)
- 核心卖点: {{selling_points}}
- 品牌调性: {{brand_tone}} [专业/活泼/高端/亲民/环保]
- 平台: {{platform}} [Instagram/Facebook/TikTok/Pinterest]
- 目标市场: {{marketplace}}

# Weekly Content Matrix

| Day | 内容类型 | 目标 | 格式 |
|-----|----------|------|------|
| Mon | 产品价值 | 认知 | 单图/轮播 |
| Tue | 使用场景 | 共鸣 | Reels/短视频 |
| Wed | 教育内容 | 价值 | 信息图/How-to |
| Thu | 用户证言 | 信任 | UGC/截图 |
| Fri | 互动内容 | 参与 | 投票/问答 |
| Sat | 幕后故事 | 连接 | Story/Behind |
| Sun | 促销CTA | 转化 | 限时优惠 |

# Content Format (per post)

## 发布信息
- 最佳时间: {{local_time}} (当地时区)
- 格式: [单图/轮播/Reels/Story]

## 文案 (目标语言)
\`\`\`
Hook (前3秒/首句): 
Body (50-100词):
CTA:
\`\`\`

## Hashtag策略
- 品牌词: #{{brand}} (1-2个)
- 品类词: #{{category}} (3-4个)
- 场景词: #{{lifestyle}} (3-4个)
- 本地热门: #{{local_trending}} (3-4个)
- 总数: 10-15个

## 视觉Brief
- 主体: 
- 场景:
- 色调:
- 文字叠加:

## 预期指标
- Reach: 
- Engagement Rate:

# 本地化要点
- DE: 内容要有信息量,避免过度营销感
- FR: 强调美学与生活方式
- IT: 情感化表达,色彩丰富
- ES: 家庭/社交场景,幽默元素
- NL: 可用英语,直接实用

# Output
完整7天内容日历 + 互动回复模板(5条)`,
        promptEn: `# Role
EU Social Media Marketing Expert, fluent in platform algorithms and local content strategy.

# Task
Create weekly social content calendar with copy, visual briefs, and hashtag strategy.

# Input
- Product: {{product_name}}
- Audience: {{audience}} (age/gender/interests/pain points)
- Key Benefits: {{selling_points}}
- Brand Tone: {{brand_tone}} [Professional/Playful/Premium/Friendly/Eco]
- Platform: {{platform}} [Instagram/Facebook/TikTok/Pinterest]
- Market: {{marketplace}}

# Weekly Content Matrix

| Day | Type | Goal | Format |
|-----|------|------|--------|
| Mon | Product Value | Awareness | Static/Carousel |
| Tue | Use Case | Resonance | Reels/Video |
| Wed | Educational | Value | Infographic |
| Thu | Social Proof | Trust | UGC |
| Fri | Interactive | Engagement | Poll/Q&A |
| Sat | Behind-scenes | Connection | Story |
| Sun | Promo CTA | Conversion | Limited offer |

# Content Format (per post)

## Post Info
- Best Time: {{local_time}} (local TZ)
- Format: [Static/Carousel/Reels/Story]

## Copy (target language)
\`\`\`
Hook (first 3 sec/line):
Body (50-100 words):
CTA:
\`\`\`

## Hashtag Strategy
- Brand: #{{brand}} (1-2)
- Category: #{{category}} (3-4)
- Lifestyle: #{{lifestyle}} (3-4)
- Local trending: #{{local}} (3-4)
- Total: 10-15

## Visual Brief
- Subject:
- Setting:
- Color tone:
- Text overlay:

## Expected Metrics
- Reach:
- Engagement Rate:

# Localization Notes
- DE: Informative, avoid hard-sell
- FR: Aesthetic, lifestyle focus
- IT: Emotional, vibrant colors
- ES: Family/social, humor works
- NL: English OK, direct/practical

# Output
Complete 7-day calendar + 5 engagement reply templates`
    },

    // ============================================================
    // 竞品分析类
    // ============================================================
    {
        id: 'competitor_listing_analysis',
        category: 'competitor',
        title: '竞品Listing深度分析',
        description: '全面分析竞品Listing,找出差异化机会',
        recommendedModel: 'CLAUDE_OPUS',
        prompt: `# Role
亚马逊竞品情报分析师，擅长拆解头部Listing并发现可执行的差异化机会。

# Task
深度分析1-3个竞品Listing，输出SWOT与行动清单。

# Input
## 竞品信息
| 字段 | 竞品A | 竞品B | 竞品C |
|------|-------|-------|-------|
| ASIN | | | |
| 标题 | | | |
| 价格 | | | |
| 评分 | | | |
| 评论数 | | | |
| BSR | | | |
| 上架时间 | | | |

## 我们的产品
- ASIN: {{our_asin}}
- 价格: {{our_price}}
- 评分: {{our_rating}}
- BSR: {{our_bsr}}

# Analysis Framework

## 1. 标题拆解
| 元素 | 竞品A | 竞品B | 我们 | Gap |
|------|-------|-------|------|-----|
| 品牌词位置 | | | | |
| 核心关键词 | | | | |
| 卖点顺序 | | | | |
| 字符利用率 | | | | |
→ 可借鉴点:
→ 差异化机会:

## 2. 五点描述拆解
| 维度 | 竞品模式 | 我们的Gap | 优化方向 |
|------|----------|-----------|----------|
| 结构 | | | |
| 卖点侧重 | | | |
| 关键词密度 | | | |
| 情感vs理性 | | | |
| 客户痛点覆盖 | | | |

## 3. 主图分析
| 图片位置 | 竞品策略 | 我们 | 优化建议 |
|----------|----------|------|----------|
| 主图 | | | |
| 图2-功能 | | | |
| 图3-场景 | | | |
| 图4-细节 | | | |
| 图5-规格 | | | |
| 图6-信任 | | | |

## 4. 定价洞察
- 价格带分布: 
- 竞品价格策略: (高端定位/性价比/低价抢量)
- 促销频率: 
- 我们的定价空间:

## 5. 评论洞察
| 维度 | 竞品被夸的点 | 竞品被骂的点 | 我们的机会 |
|------|--------------|--------------|------------|
| 产品 | | | |
| 物流 | | | |
| 服务 | | | |

## 6. 广告策略(如可获取)
- 主推关键词: 
- 广告位分布:
- 预估广告占比:

# Output

## SWOT Matrix
| | 正面 | 负面 |
|---|------|------|
| 内部 | Strengths | Weaknesses |
| 外部 | Opportunities | Threats |

## 行动清单
| 优先级 | 行动项 | 预期效果 | 执行难度 |
|--------|--------|----------|----------|
| 本周 | | | ⭐⭐⭐ |
| 本月 | | | ⭐⭐ |
| 季度 | | | ⭐ |

## 风险预警
-`,
        promptEn: `# Role
Amazon Competitive Intelligence Analyst, expert in dissecting top listings and identifying actionable differentiation.

# Task
Deep-analyze 1-3 competitor listings, output SWOT and action items.

# Input
## Competitor Data
| Field | Comp A | Comp B | Comp C |
|-------|--------|--------|--------|
| ASIN | | | |
| Title | | | |
| Price | | | |
| Rating | | | |
| Reviews | | | |
| BSR | | | |
| Launch Date | | | |

## Our Product
- ASIN: {{our_asin}}
- Price: {{our_price}}
- Rating: {{our_rating}}
- BSR: {{our_bsr}}

# Analysis Framework

## 1. Title Breakdown
| Element | Comp A | Comp B | Ours | Gap |
|---------|--------|--------|------|-----|
| Brand position | | | | |
| Core keywords | | | | |
| Benefit order | | | | |
| Char efficiency | | | | |
→ Learnings:
→ Differentiation:

## 2. Bullet Points
| Dimension | Comp Pattern | Our Gap | Optimization |
|-----------|--------------|---------|--------------|
| Structure | | | |
| USP focus | | | |
| Keyword density | | | |
| Emotional/rational | | | |
| Pain point coverage | | | |

## 3. Image Analysis
| Position | Comp Strategy | Ours | Recommendation |
|----------|---------------|------|----------------|
| Main | | | |
| 2-Feature | | | |
| 3-Lifestyle | | | |
| 4-Detail | | | |
| 5-Specs | | | |
| 6-Trust | | | |

## 4. Pricing Insights
- Price band distribution:
- Comp pricing strategy: (Premium/Value/Low)
- Promo frequency:
- Our pricing room:

## 5. Review Insights
| Dimension | Comp Praised | Comp Criticized | Our Opportunity |
|-----------|--------------|-----------------|-----------------|
| Product | | | |
| Shipping | | | |
| Service | | | |

## 6. Ad Strategy (if available)
- Top keywords:
- Ad placement:
- Est. ad share:

# Output

## SWOT Matrix
| | Positive | Negative |
|---|----------|----------|
| Internal | Strengths | Weaknesses |
| External | Opportunities | Threats |

## Action Items
| Priority | Action | Expected Impact | Effort |
|----------|--------|-----------------|--------|
| This Week | | | ⭐⭐⭐ |
| This Month | | | ⭐⭐ |
| Quarter | | | ⭐ |

## Risk Alerts
-`
    },

    {
        id: 'competitor_pricing_strategy',
        category: 'competitor',
        title: '竞品定价策略分析',
        description: '分析竞品定价规律,制定最优定价策略',
        recommendedModel: 'GPT4_TURBO',
        prompt: `# Role
电商定价策略专家，擅长数据驱动的价格优化与竞争定位。

# Task
分析市场定价数据，输出最优定价策略与动态调价规则。

# Input
## 成本结构
- 产品成本: €{{cogs}}
- 头程运费: €{{shipping}}
- FBA费用: €{{fba_fee}}
- 平台佣金: {{commission}}%
- VAT: {{vat}}%
- 目标利润率: {{target_margin}}%

## 竞品价格数据
| 竞品 | 价格 | 评分 | 评论数 | BSR | 预估月销 |
|------|------|------|--------|-----|----------|
| A | €XX | X.X | XXX | XX | XXX |
| B | €XX | X.X | XXX | XX | XXX |
| ... | | | | | |

# Analysis Framework

## 1. 成本计算
| 项目 | 金额 |
|------|------|
| 产品成本 | €X |
| 头程分摊 | €X |
| FBA | €X |
| 佣金(@€XX售价) | €X |
| VAT(@€XX售价) | €X |
| **总成本** | €X |
| **保本价** | €X |
| **目标售价**(X%利润) | €X |

## 2. 市场价格分析
- 价格区间: €XX - €XX
- 中位数: €XX
- 众数: €XX
- 价格带分布:
  - 高端(>€XX): X%
  - 中端(€XX-XX): X%
  - 低端(<€XX): X%

## 3. 价格-销量关系
| 价格点 | 预估销量 | 预估利润 | 市场份额 |
|--------|----------|----------|----------|
| €XX | | | |
| €XX | | | |
| €XX | | | |

→ 利润最大化价格点: €XX
→ 销量最大化价格点: €XX
→ 推荐价格: €XX (理由: )

## 4. 竞争定位策略
| 策略 | 价格 | 适用条件 | 风险 |
|------|------|----------|------|
| 高于均价10-20% | €XX | 评分>4.5, A+完整 | |
| 平均价 | €XX | 基础打法 | |
| 低于均价10% | €XX | 新品冲量 | |

## 5. 动态调价规则
| 触发条件 | 调价动作 | 幅度 |
|----------|----------|------|
| BSR上升>X% | 涨价 | +X% |
| 库存<X天 | 涨价 | +X% |
| 竞品降价>X% | 评估跟进 | -X% |
| 转化率<X% | 小幅降价测试 | -X% |

## 6. 促销定价
- 日常优惠券: €X (X%)
- 大促价格: €XX (最低X折)
- 秒杀价格: €XX
- 价格恢复策略: 阶梯回升/一步到位

# Output
1. 推荐定价及理由
2. 价格区间(日常/促销/底线)
3. 调价决策树
4. 月度价格监控表模板`,
        promptEn: `# Role
E-commerce Pricing Strategist, expert in data-driven price optimization and competitive positioning.

# Task
Analyze market pricing data, output optimal pricing strategy and dynamic adjustment rules.

# Input
## Cost Structure
- COGS: €{{cogs}}
- Inbound shipping: €{{shipping}}
- FBA fee: €{{fba_fee}}
- Commission: {{commission}}%
- VAT: {{vat}}%
- Target margin: {{target_margin}}%

## Competitor Pricing
| Competitor | Price | Rating | Reviews | BSR | Est. Monthly |
|------------|-------|--------|---------|-----|--------------|
| A | €XX | X.X | XXX | XX | XXX |
| B | €XX | X.X | XXX | XX | XXX |

# Analysis Framework

## 1. Cost Calculation
| Item | Amount |
|------|--------|
| COGS | €X |
| Inbound | €X |
| FBA | €X |
| Commission (@€XX) | €X |
| VAT (@€XX) | €X |
| **Total Cost** | €X |
| **Breakeven** | €X |
| **Target Price** (X% margin) | €X |

## 2. Market Price Analysis
- Range: €XX - €XX
- Median: €XX
- Mode: €XX
- Distribution:
  - Premium (>€XX): X%
  - Mid (€XX-XX): X%
  - Budget (<€XX): X%

## 3. Price-Volume Relationship
| Price Point | Est. Volume | Est. Profit | Market Share |
|-------------|-------------|-------------|--------------|
| €XX | | | |
| €XX | | | |
| €XX | | | |

→ Profit-maximizing: €XX
→ Volume-maximizing: €XX
→ Recommended: €XX (Rationale: )

## 4. Competitive Positioning
| Strategy | Price | Conditions | Risk |
|----------|-------|------------|------|
| +10-20% above avg | €XX | Rating>4.5, A+ | |
| At average | €XX | Baseline | |
| -10% below avg | €XX | New launch | |

## 5. Dynamic Pricing Rules
| Trigger | Action | Magnitude |
|---------|--------|-----------|
| BSR up >X% | Raise | +X% |
| Inventory <X days | Raise | +X% |
| Comp drops >X% | Evaluate | -X% |
| CVR <X% | Test lower | -X% |

## 6. Promotional Pricing
- Daily coupon: €X (X%)
- Event price: €XX (min X% off)
- Lightning deal: €XX
- Recovery strategy: Stepped/Direct

# Output
1. Recommended price with rationale
2. Price range (daily/promo/floor)
3. Pricing decision tree
4. Monthly price tracking template`
    },

    // ============================================================
    // 合规检查类
    // ============================================================
    {
        id: 'compliance_listing_check',
        category: 'compliance',
        title: 'Listing合规性检查',
        description: '检查Listing是否符合亚马逊政策和欧盟法规',
        recommendedModel: 'GPT4',
        prompt: `# Role
亚马逊欧洲站合规审核专家，精通平台政策与欧盟法规(CE/REACH/GPSR/EPR)。

# Task
全面审核Listing合规性，输出风险评级与整改清单。

# Input
- 产品类别: {{category}}
- 目标站点: {{marketplaces}}
- 标题: {{title}}
- 五点描述: {{bullets}}
- 产品描述: {{description}}
- 关键属性: {{attributes}} (品牌/材质/认证)
- A+声明: {{aplus_claims}}

# Compliance Checklist

## 1. Amazon Policy ⚖️

### 禁用词扫描
| 类型 | 检查项 | 状态 | 位置 |
|------|--------|------|------|
| 绝对化 | 最好/第一/最佳/No.1 | ⚠️/✅ | |
| 促销词 | 便宜/打折/限时(非促销时) | | |
| 医疗声明 | 治疗/治愈/医疗级(无认证) | | |
| 保证性 | 100%有效/永久/绝不 | | |
| 竞品 | 竞品品牌名 | | |

### 内容规范
- [ ] 无外部链接/联系方式
- [ ] 无促销信息(价格/优惠)
- [ ] 无时效性声明(新品/2024款)
- [ ] 品牌名使用授权
- [ ] 分类准确

### 图片规范
- [ ] 主图纯白背景
- [ ] 主图无文字/Logo/水印
- [ ] 无促销贴纸
- [ ] 尺寸≥1000px

## 2. EU Regulations 🇪🇺

### 产品安全
| 法规 | 适用性 | 状态 | 要求 |
|------|--------|------|------|
| CE认证 | 是/否/不确定 | | |
| GPSR(通用产品安全) | 2024年12月生效 | | EU负责人信息 |
| GS认证(德国) | 可选但重要 | | |

### 化学物质
| 法规 | 适用性 | 状态 | 要求 |
|------|--------|------|------|
| REACH | | | SVHC声明 |
| RoHS(电子) | | | |
| SCIP数据库 | | | |

### 环保EPR
| 法规 | 德国 | 法国 | 意大利 | 西班牙 |
|------|------|------|--------|--------|
| 包装法 | LUCID | | | |
| WEEE(电子) | | | | |
| 电池法 | | | | |
| 纺织品EPR | - | ✓ | - | - |

### 标签要求
- [ ] CE标识(如适用)
- [ ] 进口商信息(EU地址)
- [ ] 原产地标注
- [ ] 多语言说明书
- [ ] 安全警告(如适用)
- [ ] 能效标签(如适用)

## 3. IP Risk 🛡️
- 商标风险: 
- 外观专利风险:
- 版权风险(图片/文案):

# Risk Scoring
| 维度 | 评分(0-100) | 主要问题 |
|------|-------------|----------|
| 平台政策 | | |
| 欧盟法规 | | |
| 知识产权 | | |
| **综合评分** | | |

# Output

## 🔴 高风险项 (必须整改)
| # | 问题 | 位置 | 整改建议 | 风险后果 |
|---|------|------|----------|----------|

## 🟡 中风险项 (建议整改)
| # | 问题 | 位置 | 整改建议 |

## 🟢 低风险项 (可优化)
| # | 问题 | 建议 |

## 整改优先级排序
1. 
2. 
3.`,
        promptEn: `# Role
Amazon EU Compliance Specialist, expert in platform policies and EU regulations (CE/REACH/GPSR/EPR).

# Task
Comprehensive listing compliance audit, output risk rating and remediation checklist.

# Input
- Category: {{category}}
- Marketplaces: {{marketplaces}}
- Title: {{title}}
- Bullets: {{bullets}}
- Description: {{description}}
- Attributes: {{attributes}} (brand/material/certs)
- A+ Claims: {{aplus_claims}}

# Compliance Checklist

## 1. Amazon Policy ⚖️

### Prohibited Words Scan
| Type | Check | Status | Location |
|------|-------|--------|----------|
| Superlatives | Best/First/#1 | ⚠️/✅ | |
| Promotional | Cheap/Sale/Limited | | |
| Medical | Cure/Treat/Medical-grade | | |
| Guarantees | 100% effective/Forever | | |
| Competitors | Competitor brand names | | |

### Content Rules
- [ ] No external links/contact info
- [ ] No promo info (price/discount)
- [ ] No time-sensitive claims (New/2024)
- [ ] Brand authorization
- [ ] Accurate categorization

### Image Rules
- [ ] Pure white background (main)
- [ ] No text/logo/watermark (main)
- [ ] No promotional badges
- [ ] Size ≥1000px

## 2. EU Regulations 🇪🇺

### Product Safety
| Regulation | Applicable | Status | Requirement |
|------------|------------|--------|-------------|
| CE Marking | Y/N/TBD | | |
| GPSR | Dec 2024 | | EU Responsible Person |
| GS (Germany) | Optional | | |

### Chemical Substances
| Regulation | Applicable | Status | Requirement |
|------------|------------|--------|-------------|
| REACH | | | SVHC declaration |
| RoHS (electronics) | | | |
| SCIP database | | | |

### EPR
| Regulation | DE | FR | IT | ES |
|------------|----|----|----|----|
| Packaging | LUCID | | | |
| WEEE | | | | |
| Battery | | | | |
| Textile EPR | - | ✓ | - | - |

### Labeling
- [ ] CE mark (if applicable)
- [ ] Importer info (EU address)
- [ ] Country of origin
- [ ] Multi-language instructions
- [ ] Safety warnings
- [ ] Energy label (if applicable)

## 3. IP Risk 🛡️
- Trademark:
- Design patent:
- Copyright (images/copy):

# Risk Scoring
| Dimension | Score (0-100) | Main Issues |
|-----------|---------------|-------------|
| Platform Policy | | |
| EU Regulations | | |
| IP | | |
| **Overall** | | |

# Output

## 🔴 High Risk (Must Fix)
| # | Issue | Location | Remediation | Consequence |
|---|-------|----------|-------------|-------------|

## 🟡 Medium Risk (Should Fix)
| # | Issue | Location | Remediation |

## 🟢 Low Risk (Can Optimize)
| # | Issue | Suggestion |

## Priority Remediation Order
1.
2.
3.`
    },

    {
        id: 'compliance_claim_verification',
        category: 'compliance',
        title: '产品声明验证',
        description: '验证产品声明的合法性和可证明性',
        recommendedModel: 'CLAUDE_OPUS',
        prompt: `# Role
产品声明合规顾问，专注欧盟广告法与产品声明验证。

# Task
审核产品声明的合法性与可证明性，输出风险评估与合规改写版本。

# Input
产品声明列表:
\`\`\`
{{claims}}
例如:
- "防水IP68级别"
- "100%有机棉"
- "通过德国TÜV认证"
- "可降解材料"
- "续航24小时"
- "抗菌99.9%"
\`\`\`

目标市场: {{marketplaces}}
产品类别: {{category}}

# Analysis Framework

## 声明分类与审核

| 声明 | 类型 | 风险等级 | 需要证据 | 合规版本 |
|------|------|----------|----------|----------|
| | 性能/材质/认证/环保/健康 | 🔴🟡🟢 | | |

## 逐条详细分析

### 声明 1: "{{claim}}"
**类型**: 性能声明
**法规依据**: 
- EU: 不正当商业行为指令(UCPD)
- DE: UWG反不正当竞争法
- 亚马逊政策: 

**需要的证据**:
- [ ] 第三方测试报告 (实验室: ISO17025认可)
- [ ] 认证证书 (有效期内)
- [ ] 自我声明 (风险等级)

**表述评估**:
- ✅/❌ 是否有歧义
- ✅/❌ 是否可量化验证
- ✅/❌ 是否需要条件限定

**风险评估**:
- 消费者投诉风险: 高/中/低
- 竞争对手举报风险: (尤其德国Abmahnung)
- 平台下架风险:
- 法律诉讼风险:

**合规改写**:
- 原文: "{{original}}"
- 建议: "{{compliant_version}}"
- 理由: 

[对每个声明重复以上分析]

# 欧洲市场特别风险

## 德国市场 🇩🇪
- UWG法严格，Abmahnung(警告信)盛行
- 竞争对手/消费者协会可发起诉讼
- 罚金可达€250,000

## 法国市场 🇫🇷
- 绿色声明法规严格
- 禁止"环保""可降解"等模糊声明
- 需具体量化环保数据

## 环保声明特别注意
- "Eco-friendly" ❌ 太模糊
- "Made from 80% recycled materials" ✅ 可量化
- "Biodegradable" 需注明条件和时间

# Output

## 风险汇总
| 声明 | 风险 | 证据状态 | 优先级 |
|------|------|----------|--------|
| | 🔴🟡🟢 | 有/缺/需更新 | P0/P1/P2 |

## 证据准备清单
| 声明 | 需要文件 | 获取渠道 | 预计时间 | 费用 |
|------|----------|----------|----------|------|

## 合规改写汇总
| # | 原声明 | 合规版本 |
|---|--------|----------|

## 立即行动项
1. [P0] 
2. [P1]
3. [P2]`,
        promptEn: `# Role
Product Claims Compliance Consultant, specialized in EU advertising law and claim verification.

# Task
Audit product claims for legality and provability, output risk assessment and compliant rewrites.

# Input
Product Claims:
\`\`\`
{{claims}}
Examples:
- "Waterproof IP68"
- "100% Organic Cotton"
- "TÜV Germany Certified"
- "Biodegradable Material"
- "24-hour Battery Life"
- "99.9% Antibacterial"
\`\`\`

Target Markets: {{marketplaces}}
Product Category: {{category}}

# Analysis Framework

## Claims Classification & Audit

| Claim | Type | Risk | Evidence Needed | Compliant Version |
|-------|------|------|-----------------|-------------------|
| | Performance/Material/Cert/Eco/Health | 🔴🟡🟢 | | |

## Detailed Analysis per Claim

### Claim 1: "{{claim}}"
**Type**: Performance claim
**Legal Basis**:
- EU: UCPD (Unfair Commercial Practices Directive)
- DE: UWG (Unfair Competition Act)
- Amazon Policy:

**Evidence Required**:
- [ ] Third-party test report (Lab: ISO17025 accredited)
- [ ] Valid certification
- [ ] Self-declaration (risk level)

**Expression Evaluation**:
- ✅/❌ Ambiguity
- ✅/❌ Quantifiable/verifiable
- ✅/❌ Conditions needed

**Risk Assessment**:
- Consumer complaint: H/M/L
- Competitor reporting: (esp. German Abmahnung)
- Platform removal:
- Legal action:

**Compliant Rewrite**:
- Original: "{{original}}"
- Suggested: "{{compliant_version}}"
- Rationale:

[Repeat for each claim]

# EU Market-Specific Risks

## Germany 🇩🇪
- Strict UWG, Abmahnung culture
- Competitors/consumer orgs can litigate
- Fines up to €250,000

## France 🇫🇷
- Strict green claims regulations
- "Eco-friendly" "biodegradable" banned if vague
- Must quantify environmental data

## Environmental Claims
- "Eco-friendly" ❌ Too vague
- "Made from 80% recycled materials" ✅ Quantifiable
- "Biodegradable" needs conditions/timeline

# Output

## Risk Summary
| Claim | Risk | Evidence | Priority |
|-------|------|----------|----------|
| | 🔴🟡🟢 | Have/Missing/Outdated | P0/P1/P2 |

## Evidence Checklist
| Claim | Document Needed | Source | Timeline | Cost |
|-------|-----------------|--------|----------|------|

## Compliant Rewrites
| # | Original | Compliant Version |
|---|----------|-------------------|

## Immediate Actions
1. [P0]
2. [P1]
3. [P2]`
    }
];

/**
 * 根据分类获取提示词
 */
export function getPromptsByCategory(categoryId?: PromptCategoryId | 'all'): readonly PromptItem[] {
    if (!categoryId || categoryId === 'all') {
        return PROMPT_LIBRARY;
    }
    return PROMPT_LIBRARY.filter(p => p.category === categoryId);
}

/**
 * 根据ID获取提示词
 */
export function getPromptById(promptId: string): PromptItem | undefined {
    return PROMPT_LIBRARY.find(p => p.id === promptId);
}

/**
 * 搜索提示词
 */
export function searchPrompts(
    keyword: string,
    categoryId: PromptCategoryId | 'all' = 'all'
): PromptItem[] {
    const lowerKeyword = keyword.toLowerCase();

    return getPromptsByCategory(categoryId).filter((p) => {
        const category = Object.values(PROMPT_CATEGORIES).find((cat) => cat.id === p.category);
        const model = RECOMMENDED_MODELS[p.recommendedModel] || RECOMMENDED_MODELS.GPT4_TURBO;
        const searchableText = [
            p.id,
            p.title,
            p.description,
            p.prompt,
            p.promptEn,
            category?.name || '',
            model.name,
            model.provider,
            model.badge,
        ]
            .join('\n')
            .toLowerCase();

        return searchableText.includes(lowerKeyword);
    });
}


/**
 * 获取推荐模型信息
 */
export function getModelInfo(modelKey: RecommendedModelKey): RecommendedModel {
    return RECOMMENDED_MODELS[modelKey] || RECOMMENDED_MODELS.GPT4_TURBO;
}
