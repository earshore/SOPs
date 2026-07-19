// src/modules/more/views/explore/prompts/constants/promptLibrary.ts
// ================================================================
// Prompt playbook for Amazon operators
// ================================================================

export type PromptCategoryId =
  | 'framework'
  | 'listing'
  | 'review'
  | 'ppc'
  | 'competitor'
  | 'customer'
  | 'compliance';

export type RecommendedModelKey =
  | 'FLAGSHIP_REASONING'
  | 'BALANCED_WORKHORSE'
  | 'FAST_DRAFT'
  | 'LONG_CONTEXT'
  | 'DATA_REVIEW';

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
  requiredData: readonly string[];
  doNotGuess: readonly string[];
  outputContract: string;
  riskLevel: 'low' | 'medium' | 'high';
  prompt: string;
  promptEn: string;
}

export const PROMPT_CATEGORIES: Record<string, PromptCategory> = {
  FRAMEWORK: { id: 'framework', name: '方法框架', icon: 'fa-layer-group', color: 'indigo' },
  LISTING: { id: 'listing', name: 'Listing转化', icon: 'fa-file-lines', color: 'blue' },
  REVIEW: { id: 'review', name: 'VOC评论', icon: 'fa-comments', color: 'purple' },
  PPC: { id: 'ppc', name: 'PPC投放', icon: 'fa-bullseye', color: 'orange' },
  COMPETITOR: { id: 'competitor', name: '竞品洞察', icon: 'fa-chart-line', color: 'red' },
  CUSTOMER: { id: 'customer', name: '客服售后', icon: 'fa-headset', color: 'green' },
  COMPLIANCE: { id: 'compliance', name: '合规风控', icon: 'fa-shield-halved', color: 'indigo' },
};

export const RECOMMENDED_MODELS: Record<RecommendedModelKey, RecommendedModel> = {
  FLAGSHIP_REASONING: {
    id: 'flagship-reasoning',
    name: '旗舰推理模型',
    provider: 'OpenAI / Anthropic / Google',
    badge: '深度',
  },
  BALANCED_WORKHORSE: {
    id: 'balanced-workhorse',
    name: '均衡工作模型',
    provider: 'OpenAI / Anthropic / Google',
    badge: '推荐',
  },
  FAST_DRAFT: {
    id: 'fast-draft',
    name: '快速草稿模型',
    provider: 'OpenAI / Anthropic / Google',
    badge: '快速',
  },
  LONG_CONTEXT: {
    id: 'long-context',
    name: '长上下文模型',
    provider: 'OpenAI / Anthropic / Google',
    badge: '长文',
  },
  DATA_REVIEW: {
    id: 'data-review',
    name: '数据审阅模型',
    provider: 'OpenAI / Anthropic / Google',
    badge: '审阅',
  },
};

export const PROMPT_LIBRARY: readonly PromptItem[] = [
  {
    id: 'prompt_brief_builder',
    category: 'framework',
    title: '提示词Brief生成器',
    description: '把模糊需求整理成角色、输入、约束、输出和验收标准齐全的可执行提示词。',
    recommendedModel: 'BALANCED_WORKHORSE',
    requiredData: ['业务问题', '使用场景', '可用数据', '期望输出', '不可猜测的数据'],
    doNotGuess: ['实时数据', '平台政策', '费用', '搜索量', '销量', '排名'],
    outputContract:
      'Markdown sections with task fit, data gaps, short prompt, strict prompt, and 3 acceptance checks.',
    riskLevel: 'medium',
    prompt: `# Role
你是跨境电商AI工作流设计师，负责把运营需求转成可复用、可验收的提示词。

# Task
基于输入信息，生成一个可直接复制到大模型中的任务提示词，并标注需要人工补齐的数据。

# Input
- 业务问题: {{business_question}}
- 使用场景: {{scenario}}
- 目标站点/语言: {{marketplace_and_language}}
- 已有数据: {{available_data}}
- 不允许模型猜测的数据: {{missing_or_sensitive_data}}
- 期望输出: {{expected_output}}
- 使用者水平: {{operator_level}}

# Method
1. 先判断这个需求是否适合交给大模型。如果不适合，说明原因和替代方案。
2. 把需求拆成: 背景、目标、角色、输入、约束、步骤、输出格式、质量检查。
3. 对实时数据、平台政策、费用、搜索量、销量等信息，必须要求用户提供来源，不允许模型凭空生成。
4. 给出一版短提示词和一版严谨提示词。
5. 为提示词设计3条验收标准。

# Output
## 任务判断
- 是否适合大模型:
- 需要外部数据:
- 主要风险:

## 数据补齐清单
| 数据 | 为什么需要 | 缺失时的处理 |
| --- | --- | --- |

## 短提示词
[可复制内容]

## 严谨提示词
[可复制内容]

## 验收标准
1.
2.
3.`,
    promptEn: `# Role
You are an AI workflow designer for cross-border ecommerce teams. Your job is to turn messy operator requests into reusable, testable prompts.

# Task
Create a production-ready prompt from the user input and mark any data that must be supplied by a human or source system.

# Input
- Business question: {{business_question}}
- Scenario: {{scenario}}
- Marketplace/language: {{marketplace_and_language}}
- Available data: {{available_data}}
- Data the model must not guess: {{missing_or_sensitive_data}}
- Expected output: {{expected_output}}
- Operator skill level: {{operator_level}}

# Method
1. Decide whether this task is suitable for an LLM. If not, explain the better alternative.
2. Convert the task into: background, goal, role, inputs, constraints, steps, output format, quality checks.
3. For real-time data, platform policy, fees, search volume, sales, or ranking data, require a source. Do not let the model invent it.
4. Provide one short prompt and one strict prompt.
5. Define 3 acceptance checks.

# Output
## Task Fit
- Suitable for LLM:
- External data required:
- Main risk:

## Data Gap Checklist
| Data | Why needed | If missing |
| --- | --- | --- |

## Short Prompt
[Copy-ready prompt]

## Strict Prompt
[Copy-ready prompt]

## Acceptance Checks
1.
2.
3.`,
  },
  {
    id: 'prompt_eval_pack',
    category: 'framework',
    title: '提示词评估集',
    description: '为关键提示词设计测试用例、评分表和回归检查，避免“一次好结果”误判为稳定能力。',
    recommendedModel: 'FLAGSHIP_REASONING',
    requiredData: ['待评估提示词', '业务目标', '样本类型', '失败模式', '最终使用者'],
    doNotGuess: ['真实样本表现', '上线阈值是否已达成', '合规结论'],
    outputContract:
      'Markdown evaluation pack with capabilities, 8 sample cases, 100-point rubric, release threshold, and regression steps.',
    riskLevel: 'medium',
    prompt: `# Role
你是AI输出质量评审负责人，专门为亚马逊运营提示词建立测试集。

# Task
为以下提示词生成一套最小可用评估集，用于上线前测试和后续模型升级回归。

# Input
- 待评估提示词: {{prompt_to_test}}
- 业务目标: {{business_goal}}
- 真实样本类型: {{sample_types}}
- 绝不能出现的问题: {{failure_modes}}
- 输出将被谁使用: {{end_user}}

# Method
1. 提炼提示词的核心能力，不超过5项。
2. 设计8个测试样本: 3个正常样本、2个边界样本、2个故意缺数据样本、1个高风险合规样本。
3. 每个样本都给出理想输出特征，而不是唯一标准答案。
4. 设计100分评分表，覆盖准确性、可执行性、合规性、格式稳定性和不确定性处理。
5. 给出通过阈值和复测动作。

# Output
## 能力拆解
| 能力 | 为什么重要 | 常见失败 |
| --- | --- | --- |

## 测试样本
| # | 类型 | 输入摘要 | 理想输出特征 | 重点观察 |
| --- | --- | --- | --- | --- |

## 评分表
| 维度 | 分值 | 扣分规则 |
| --- | --- | --- |

## 上线阈值
- 通过标准:
- 需要人工复核的触发条件:
- 模型或提示词升级后的回归步骤:`,
    promptEn: `# Role
You are the AI output QA owner for Amazon operations prompts.

# Task
Create a minimum viable evaluation pack for the prompt below, suitable for pre-release testing and regression checks after model changes.

# Input
- Prompt to test: {{prompt_to_test}}
- Business goal: {{business_goal}}
- Real sample types: {{sample_types}}
- Must-not-happen failure modes: {{failure_modes}}
- End user: {{end_user}}

# Method
1. Extract up to 5 core capabilities.
2. Design 8 test samples: 3 normal, 2 edge cases, 2 missing-data cases, 1 high-risk compliance case.
3. For each sample, define ideal output traits rather than one exact answer.
4. Build a 100-point rubric covering accuracy, actionability, compliance, format stability, and uncertainty handling.
5. Provide release threshold and retest actions.

# Output
## Capability Breakdown
| Capability | Why it matters | Common failure |
| --- | --- | --- |

## Test Samples
| # | Type | Input summary | Ideal output traits | What to inspect |
| --- | --- | --- | --- | --- |

## Rubric
| Dimension | Points | Deduction rules |
| --- | --- | --- |

## Release Threshold
- Pass criteria:
- Human review triggers:
- Regression steps after model or prompt changes:`,
  },
  {
    id: 'listing_keyword_to_copy',
    category: 'listing',
    title: '关键词到Listing初稿',
    description: '把关键词库、竞品页和评论痛点转成标题、五点、A+结构，并附带合规自检。',
    recommendedModel: 'BALANCED_WORKHORSE',
    requiredData: [
      '产品事实',
      '目标站点/语言',
      '关键词库',
      '竞品文案',
      'Review/QA痛点',
      '禁用词/禁用声明',
    ],
    doNotGuess: ['搜索量', '销量', '排名', '认证', '测试报告', '医疗/健康/环保/质保声明'],
    outputContract:
      'Markdown tables for keyword grouping, title options, bullets, A+ plan, and compliance checks.',
    riskLevel: 'high',
    prompt: `# Role
你是亚马逊Listing转化优化负责人，熟悉搜索意图、详情页规则和多语言本地化。

# Task
基于真实关键词和竞品资料，输出可交给运营二次编辑的Listing初稿。不要编造搜索量、销量、排名、认证或政策结论。

# Input
- 产品名称/品类: {{product_category}}
- 目标站点和语言: {{marketplace_language}}
- 品牌定位: {{brand_positioning}}
- 关键词库: {{keyword_bank}}
- 竞品标题和五点: {{competitor_copy}}
- Review/QA痛点: {{review_and_qa_pain_points}}
- 产品事实和证据: {{product_facts_and_evidence}}
- 禁止使用的词/声明: {{restricted_terms}}

# Method
1. 先把关键词按搜索意图分组: 核心词、属性词、场景词、问题词、竞品替代词。
2. 判断哪些关键词适合标题，哪些适合五点、A+或后台词。
3. 标题保持清晰、可比较、不过度堆词；缺少证据的卖点不得写成确定性声明。
4. 五点按客户决策顺序组织: 识别产品 -> 关键收益 -> 证据 -> 使用场景 -> 风险解除。
5. A+只给模块结构和文案方向，不生成未经证实的品牌故事。
6. 最后输出合规和数据缺口清单。

# Output
## 关键词意图分组
| 组别 | 关键词 | 用在何处 | 理由 |
| --- | --- | --- | --- |

## 标题备选
| 版本 | 标题 | 策略 | 需要人工确认 |
| --- | --- | --- | --- |

## 五点初稿
| # | Bullet | 覆盖意图 | 证据来源 | 风险提示 |
| --- | --- | --- | --- | --- |

## A+模块建议
| 模块 | 目的 | 文案方向 | 图片Brief |
| --- | --- | --- | --- |

## 合规与质量自检
- 可能夸大的声明:
- 需要证据的字段:
- 建议A/B测试项:
- 不建议上线的内容:`,
    promptEn: `# Role
You are an Amazon listing conversion lead with expertise in search intent, detail page rules, and localization.

# Task
Use real keyword and competitor data to create an editable listing draft. Do not invent search volume, sales, ranking, certifications, or policy conclusions.

# Input
- Product/category: {{product_category}}
- Marketplace/language: {{marketplace_language}}
- Brand positioning: {{brand_positioning}}
- Keyword bank: {{keyword_bank}}
- Competitor title and bullets: {{competitor_copy}}
- Review/QA pain points: {{review_and_qa_pain_points}}
- Product facts and evidence: {{product_facts_and_evidence}}
- Restricted terms/claims: {{restricted_terms}}

# Method
1. Group keywords by search intent: core, attribute, scenario, problem, competitor alternative.
2. Decide which keywords belong in title, bullets, A+ content, or backend terms.
3. Keep the title clear, comparable, and not keyword-stuffed. Do not turn unsupported benefits into factual claims.
4. Order bullets by buyer decision flow: identify product -> key benefit -> proof -> use case -> risk reduction.
5. For A+ content, provide module structure and copy direction only. Do not invent brand stories.
6. Finish with compliance and data gap checks.

# Output
## Keyword Intent Groups
| Group | Keywords | Placement | Rationale |
| --- | --- | --- | --- |

## Title Options
| Version | Title | Strategy | Human check needed |
| --- | --- | --- | --- |

## Bullet Draft
| # | Bullet | Intent covered | Evidence source | Risk note |
| --- | --- | --- | --- | --- |

## A+ Module Plan
| Module | Purpose | Copy direction | Image brief |
| --- | --- | --- | --- |

## Compliance and Quality Check
- Potentially exaggerated claims:
- Evidence required:
- Suggested A/B test items:
- Content not recommended for publishing:`,
  },
  {
    id: 'review_voc_action_map',
    category: 'review',
    title: 'VOC评论行动地图',
    description: '从评论、QA和退货原因中提炼产品改进、Listing表达和客服动作。',
    recommendedModel: 'LONG_CONTEXT',
    requiredData: ['评论数据', 'QA数据', '退货/客服原因', '时间范围', '产品版本变化'],
    doNotGuess: ['样本量', '用户身份', '产品缺陷根因', '退货真实原因', '可立即改产品的结论'],
    outputContract:
      'Markdown report with data health, topic clusters, action map, listing rewrite opportunities, and confirmation needs.',
    riskLevel: 'high',
    prompt: `# Role
你是VOC分析师，负责把用户原话转成运营、产品和客服可以执行的行动地图。

# Task
分析评论/QA/退货原因，输出主题聚类、严重度、证据原文和行动建议。不得只给情绪总结。

# Input
- 数据范围和时间: {{date_range}}
- 产品/ASIN: {{asin_or_product}}
- 评论数据: {{review_data}}
- QA数据: {{qa_data}}
- 退货/客服原因: {{return_or_ticket_reasons}}
- 已知产品版本变化: {{product_version_changes}}

# Method
1. 分开处理Verified Purchase、非VP、近期评论和历史评论。
2. 先做主题聚类，再判断情绪和严重度。
3. 每个结论至少引用或概述2条原始证据；证据不足必须标注。
4. 把洞察拆到三个责任方: 产品、Listing、客服。
5. 标出可以立刻改文案的问题，和必须等产品验证的问题。

# Output
## 数据健康度
- 样本量:
- 时间覆盖:
- 可能偏差:

## 主题聚类
| 主题 | 提及量 | 情绪 | 严重度 | 代表证据 | 影响 |
| --- | --- | --- | --- | --- | --- |

## 行动地图
| 责任方 | 动作 | 依据 | 优先级 | 验证方式 |
| --- | --- | --- | --- | --- |

## Listing改写机会
| 当前误解/痛点 | 建议表达 | 放置位置 | 风险 |
| --- | --- | --- | --- |

## 需要继续确认
- 数据不足的判断:
- 需要补抓的数据:
- 不应立即行动的结论:`,
    promptEn: `# Role
You are a VOC analyst turning customer language into actions for operations, product, and support teams.

# Task
Analyze reviews, QA, and return reasons. Produce topic clusters, severity, evidence, and action recommendations. Do not stop at sentiment summaries.

# Input
- Date range: {{date_range}}
- Product/ASIN: {{asin_or_product}}
- Review data: {{review_data}}
- QA data: {{qa_data}}
- Return/support reasons: {{return_or_ticket_reasons}}
- Known product version changes: {{product_version_changes}}

# Method
1. Separate Verified Purchase, non-VP, recent reviews, and historical reviews.
2. Cluster topics first, then assess sentiment and severity.
3. Support each conclusion with at least 2 original evidence snippets or summaries. Mark weak evidence.
4. Split insights by owner: Product, Listing, Support.
5. Separate copy changes that can be made now from issues that require product validation.

# Output
## Data Health
- Sample size:
- Time coverage:
- Possible bias:

## Topic Clusters
| Topic | Mentions | Sentiment | Severity | Evidence | Impact |
| --- | --- | --- | --- | --- | --- |

## Action Map
| Owner | Action | Evidence | Priority | Validation method |
| --- | --- | --- | --- | --- |

## Listing Rewrite Opportunities
| Misunderstanding/pain point | Suggested wording | Placement | Risk |
| --- | --- | --- | --- |

## Needs More Confirmation
- Judgments with weak data:
- Data to collect:
- Conclusions not ready for action:`,
  },
  {
    id: 'ppc_search_term_triage',
    category: 'ppc',
    title: 'PPC搜索词分诊',
    description: '用搜索词报表做加词、否词、降价、提预算和Listing承接问题识别。',
    recommendedModel: 'DATA_REVIEW',
    requiredData: [
      '搜索词报表',
      '目标ACOS/ROAS',
      '毛利率/底线ACOS',
      '活动结构',
      '当前Listing关键词',
    ],
    doNotGuess: ['搜索量', '竞品出价', '转化归因', '毛利率', '预算限制', '平台实时竞价'],
    outputContract:
      'Markdown tables for data quality, search-term actions, bid/budget changes, listing fit issues, and execution order.',
    riskLevel: 'high',
    prompt: `# Role
你是Amazon Sponsored Products投放分析师，目标是在不牺牲有效曝光的前提下降低浪费和提升转化。

# Task
分析搜索词报表，输出可执行的加词、否词、出价和预算建议。没有转化数据时，不要给确定性结论。

# Input
- 目标ACOS/ROAS: {{target_acos_or_roas}}
- 毛利率和底线ACOS: {{margin_and_floor_acos}}
- 活动目标: {{campaign_goal}}
- 搜索词报表: {{search_term_report}}
- 广告活动结构: {{campaign_structure}}
- 当前Listing核心关键词: {{listing_keywords}}
- 特殊约束: {{constraints}}

# Rules
- 所有建议必须基于报表字段，不得猜测搜索量或竞品出价。
- 低点击量样本只能标记观察，不直接否词。
- 区分关键词否定、ASIN否定、预算不足、Listing承接差四类问题。
- 品牌词、防御词、新品探索词需要单独标记。

# Method
1. 先检查数据质量: 日期范围、点击量、订单归因、异常值。
2. 按表现分桶: 放大、保留观察、降价、否定、需要Listing优化。
3. 对每条建议写出触发依据和风险。
4. 输出一版保守动作和一版激进动作。

# Output
## 数据质量检查
| 项目 | 结论 | 影响 |
| --- | --- | --- |

## 搜索词动作表
| 搜索词/ASIN | 动作 | 依据 | 风险 | 放入活动/匹配方式 |
| --- | --- | --- | --- | --- |

## 出价与预算建议
| 活动/词 | 当前表现 | 建议 | 幅度 | 复查时间 |
| --- | --- | --- | --- | --- |

## Listing承接问题
| 搜索意图 | 当前Listing缺口 | 建议优化 |
| --- | --- | --- |

## 执行顺序
1. 今日处理:
2. 3天后复查:
3. 7天后判断:`,
    promptEn: `# Role
You are an Amazon Sponsored Products analyst. Your goal is to reduce waste and improve conversion without killing useful discovery.

# Task
Analyze a search term report and produce actionable harvesting, negation, bid, and budget recommendations. If conversion data is insufficient, do not make definitive calls.

# Input
- Target ACOS/ROAS: {{target_acos_or_roas}}
- Margin and floor ACOS: {{margin_and_floor_acos}}
- Campaign goal: {{campaign_goal}}
- Search term report: {{search_term_report}}
- Campaign structure: {{campaign_structure}}
- Current listing keywords: {{listing_keywords}}
- Constraints: {{constraints}}

# Rules
- Base every recommendation on report fields. Do not guess search volume or competitor bids.
- Low-click samples should be marked for observation, not immediately negated.
- Separate keyword negatives, ASIN negatives, budget constraints, and listing mismatch problems.
- Brand defense, competitor terms, and launch exploration terms must be labeled separately.

# Method
1. Check data quality: date range, clicks, order attribution, outliers.
2. Bucket terms: scale, observe, reduce bid, negate, listing needs improvement.
3. Explain trigger evidence and risk for each action.
4. Provide conservative and aggressive action sets.

# Output
## Data Quality Check
| Item | Finding | Impact |
| --- | --- | --- |

## Search Term Action Table
| Term/ASIN | Action | Evidence | Risk | Campaign/match placement |
| --- | --- | --- | --- | --- |

## Bid and Budget Recommendations
| Campaign/term | Current performance | Recommendation | Change | Review date |
| --- | --- | --- | --- | --- |

## Listing Fit Issues
| Search intent | Listing gap | Optimization suggestion |
| --- | --- | --- |

## Execution Order
1. Do today:
2. Review in 3 days:
3. Decide in 7 days:`,
  },
  {
    id: 'competitor_detail_page_teardown',
    category: 'competitor',
    title: '竞品详情页拆解',
    description: '拆解头部ASIN的关键词、页面叙事、图片顺序、评价风险和可差异化机会。',
    recommendedModel: 'LONG_CONTEXT',
    requiredData: ['我方产品资料', '竞品详情页资料', '目标站点', '商业目标', '可调整资源'],
    doNotGuess: ['竞品销量', '排名', '广告投入', '未提供的价格变化', '知识产权结论'],
    outputContract:
      'Markdown tables for competitor patterns, gap diagnosis, differentiation opportunities, risky tactics, and 30-day actions.',
    riskLevel: 'medium',
    prompt: `# Role
你是亚马逊竞品情报分析师，擅长从头部ASIN中提炼可落地的差异化策略。

# Task
分析1-5个竞品详情页资料，输出竞品共性、我方差距、差异化机会和不可跟随的风险点。

# Input
- 我方产品资料: {{our_product}}
- 竞品资料: {{competitor_pages}}
- 目标站点: {{marketplace}}
- 我方商业目标: {{business_goal}}
- 可调整资源: {{available_assets}}

# Method
1. 先抽取每个竞品的页面叙事: 谁用、解决什么、凭什么信、为什么现在买。
2. 对比标题、五点、图片顺序、A+、价格带、评论痛点。
3. 标出竞品做对了但我方缺失的内容。
4. 标出竞品看起来有效但不建议模仿的内容: 夸大声明、侵权风险、无证据承诺、过度促销。
5. 输出按影响和执行难度排序的动作。

# Output
## 竞品共性
| 维度 | 共性打法 | 可能原因 | 我方是否应跟进 |
| --- | --- | --- | --- |

## 差距诊断
| 维度 | 我方现状 | 竞品做法 | 差距 | 影响 |
| --- | --- | --- | --- | --- |

## 差异化机会
| 机会 | 目标客户 | 需要的证据/素材 | 建议放置位置 |
| --- | --- | --- | --- |

## 不建议模仿
| 竞品做法 | 风险 | 替代表达 |
| --- | --- | --- |

## 30天行动清单
| 时间 | 动作 | 负责人 | 验证指标 |
| --- | --- | --- | --- |`,
    promptEn: `# Role
You are an Amazon competitive intelligence analyst who turns top-ASIN detail pages into actionable differentiation strategy.

# Task
Analyze 1-5 competitor detail pages and produce shared patterns, our gaps, differentiation opportunities, and risky tactics not worth copying.

# Input
- Our product: {{our_product}}
- Competitor pages: {{competitor_pages}}
- Marketplace: {{marketplace}}
- Business goal: {{business_goal}}
- Assets we can change: {{available_assets}}

# Method
1. Extract each competitor's page narrative: who uses it, what problem it solves, why to trust it, why buy now.
2. Compare title, bullets, image sequence, A+ content, price band, and review pain points.
3. Mark what competitors do well that we currently miss.
4. Mark tactics that may look effective but should not be copied: exaggerated claims, IP risk, unsupported promises, over-promotion.
5. Prioritize actions by impact and effort.

# Output
## Competitor Patterns
| Dimension | Common tactic | Likely reason | Should we follow? |
| --- | --- | --- | --- |

## Gap Diagnosis
| Dimension | Our state | Competitor tactic | Gap | Impact |
| --- | --- | --- | --- | --- |

## Differentiation Opportunities
| Opportunity | Target buyer | Evidence/assets needed | Placement |
| --- | --- | --- | --- |

## Do Not Copy
| Competitor tactic | Risk | Safer alternative |
| --- | --- | --- |

## 30-Day Action List
| Timing | Action | Owner | Validation metric |
| --- | --- | --- | --- |`,
  },
  {
    id: 'customer_support_reply',
    category: 'customer',
    title: '客服回复与升级SOP',
    description: '针对买家消息、差评和Seller Support沟通生成合规、克制、可升级的回复。',
    recommendedModel: 'BALANCED_WORKHORSE',
    requiredData: [
      '场景',
      '原始消息',
      '订单/物流/产品事实',
      '可提供方案',
      '不可承诺内容',
      '目标语言',
    ],
    doNotGuess: ['订单隐私', '物流状态', '退款承诺', '评价引导', '外部联系方式', '平台政策结论'],
    outputContract:
      'Markdown sections for situation assessment, customer reply draft, internal actions, escalation conditions, and risky wording replacements.',
    riskLevel: 'high',
    prompt: `# Role
你是跨境电商客服质检负责人，熟悉亚马逊站内沟通边界和欧洲客户沟通礼仪。

# Task
根据客户或平台沟通内容，生成回复草稿、内部处理动作和升级条件。

# Input
- 场景: {{case_type}}
- 原始消息: {{message}}
- 订单/物流/产品事实: {{facts}}
- 客户情绪: {{customer_emotion}}
- 可提供方案: {{available_resolution}}
- 不可承诺内容: {{cannot_promise}}
- 目标语言: {{target_language}}

# Rules
- 公开或站内回复不得包含外部联系方式、订单隐私、索评暗示或不实承诺。
- 先承认问题，再给下一步，不争辩。
- 不确定的信息要写成待核实，不得编造。
- 复杂问题拆成: 对客户回复、内部动作、升级标准。

# Output
## 情况判断
- 问题类型:
- 紧急程度:
- 需要补充的信息:

## 客户回复草稿
语气: 专业、简洁、共情

[目标语言正文]

## 内部处理动作
| 步骤 | 动作 | 负责人 | 时限 |
| --- | --- | --- | --- |

## 升级条件
- 何时升级给主管:
- 何时升级给物流/产品/合规:
- 需要保留的证据:

## 风险表达替换
| 避免表达 | 替代表达 |
| --- | --- |`,
    promptEn: `# Role
You are a cross-border ecommerce support QA lead familiar with Amazon message boundaries and European customer etiquette.

# Task
Generate a response draft, internal handling actions, and escalation conditions from a customer or platform message.

# Input
- Scenario: {{case_type}}
- Original message: {{message}}
- Order/logistics/product facts: {{facts}}
- Customer emotion: {{customer_emotion}}
- Available resolution: {{available_resolution}}
- Promises we cannot make: {{cannot_promise}}
- Target language: {{target_language}}

# Rules
- Public or platform messages must not include external contact information, order privacy, review incentives, or unsupported promises.
- Acknowledge first, then give next steps. Do not argue.
- Unknown facts must be marked as pending verification. Do not invent them.
- Split complex cases into: customer reply, internal action, escalation criteria.

# Output
## Situation Assessment
- Issue type:
- Urgency:
- Missing information:

## Customer Reply Draft
Tone: professional, concise, empathetic

[Target-language message]

## Internal Handling Actions
| Step | Action | Owner | Deadline |
| --- | --- | --- | --- |

## Escalation Conditions
- When to escalate to manager:
- When to escalate to logistics/product/compliance:
- Evidence to preserve:

## Risky Wording Replacement
| Avoid | Safer wording |
| --- | --- |`,
  },
  {
    id: 'compliance_claim_audit',
    category: 'compliance',
    title: '产品声明合规审查',
    description: '审查标题、五点、A+和图片文案中的性能、认证、环保、医疗等高风险声明。',
    recommendedModel: 'FLAGSHIP_REASONING',
    requiredData: [
      '产品类别',
      '销售站点',
      'Listing/图片文案',
      '证书/测试报告',
      '包装/说明书/标签',
      '已知限制',
    ],
    doNotGuess: ['法律结论', '认证有效性', '测试数据', '平台禁词清单', '专利/商标/版权状态'],
    outputContract:
      'Markdown tables for risk overview, claim-by-claim review, evidence checklist, must-fix items, and professional review needs.',
    riskLevel: 'high',
    prompt: `# Role
你是亚马逊欧盟站合规审查顾问，关注平台详情页规则、证据链和消费者误导风险。

# Task
审查Listing中的产品声明，输出风险等级、需要证据和合规改写建议。你不是律师；对法律结论必须标注需专业复核。

# Input
- 产品类别: {{category}}
- 销售站点: {{marketplaces}}
- 标题/五点/A+/图片文案: {{listing_copy}}
- 产品证书和测试报告: {{certificates_and_reports}}
- 包装/说明书/标签信息: {{packaging_and_manual}}
- 已知禁用词或类目要求: {{known_restrictions}}

# Method
1. 把声明分为: 性能、材质、认证、环保、健康/医疗、安全、质保、比较级。
2. 判断每条声明是否有证据、是否可量化、是否容易误导消费者。
3. 区分平台规则风险、监管风险、知识产权风险和证据不足风险。
4. 给出低风险替代表达，保持卖点但降低绝对化。
5. 对缺证据的声明，不允许改写成确定性事实。

# Output
## 风险总览
| 风险等级 | 数量 | 主要问题 |
| --- | --- | --- |

## 逐条审查
| 原声明 | 类型 | 风险 | 证据状态 | 问题 | 合规改写 |
| --- | --- | --- | --- | --- | --- |

## 证据清单
| 声明 | 需要文件 | 当前状态 | 负责人 |
| --- | --- | --- | --- |

## 上线前必须处理
1.
2.
3.

## 需要专业复核
- 法规或类目不确定项:
- 高风险语言:
- 可能涉及商标/专利/版权的内容:`,
    promptEn: `# Role
You are an Amazon EU listing compliance reviewer focused on detail page rules, evidence chains, and consumer-misleading risk.

# Task
Review product claims in a listing and produce risk levels, evidence requirements, and safer rewrite suggestions. You are not a lawyer; mark legal conclusions for professional review.

# Input
- Product category: {{category}}
- Marketplaces: {{marketplaces}}
- Title/bullets/A+/image copy: {{listing_copy}}
- Certificates and test reports: {{certificates_and_reports}}
- Packaging/manual/label information: {{packaging_and_manual}}
- Known restricted terms or category requirements: {{known_restrictions}}

# Method
1. Classify claims as: performance, material, certification, environmental, health/medical, safety, warranty, comparative.
2. Assess whether each claim has evidence, is measurable, and could mislead consumers.
3. Separate platform-rule risk, regulatory risk, IP risk, and insufficient-evidence risk.
4. Provide lower-risk alternatives that preserve the selling point while reducing absolutes.
5. For unsupported claims, do not rewrite them as factual certainty.

# Output
## Risk Overview
| Risk level | Count | Main issue |
| --- | --- | --- |

## Claim-by-Claim Review
| Original claim | Type | Risk | Evidence status | Issue | Safer rewrite |
| --- | --- | --- | --- | --- | --- |

## Evidence Checklist
| Claim | Required document | Current status | Owner |
| --- | --- | --- | --- |

## Must Fix Before Publishing
1.
2.
3.

## Requires Professional Review
- Uncertain regulation/category items:
- High-risk wording:
- Potential trademark/patent/copyright issues:`,
  },
];

export function getPromptsByCategory(categoryId?: PromptCategoryId | 'all'): readonly PromptItem[] {
  if (!categoryId || categoryId === 'all') {
    return PROMPT_LIBRARY;
  }

  return PROMPT_LIBRARY.filter(prompt => prompt.category === categoryId);
}

export function getPromptById(promptId: string): PromptItem | undefined {
  return PROMPT_LIBRARY.find(prompt => prompt.id === promptId);
}

export function searchPrompts(
  keyword: string,
  categoryId: PromptCategoryId | 'all' = 'all'
): PromptItem[] {
  const lowerKeyword = keyword.toLowerCase();

  return getPromptsByCategory(categoryId).filter(prompt => {
    const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
    const model =
      RECOMMENDED_MODELS[prompt.recommendedModel] || RECOMMENDED_MODELS.BALANCED_WORKHORSE;
    const searchableText = [
      prompt.id,
      prompt.title,
      prompt.description,
      prompt.requiredData.join(' '),
      prompt.doNotGuess.join(' '),
      prompt.outputContract,
      prompt.riskLevel,
      prompt.prompt,
      prompt.promptEn,
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

export function getModelInfo(modelKey: RecommendedModelKey): RecommendedModel {
  return RECOMMENDED_MODELS[modelKey] || RECOMMENDED_MODELS.BALANCED_WORKHORSE;
}
