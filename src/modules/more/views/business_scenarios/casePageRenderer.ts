import { escapeHtml } from '../../../../common/utils/security';

type CaseId = 'usage_notice' | 'bad_review_response' | 'ad_acos_diagnosis' | 'review_monitor' | 'amazon_daily_report';

interface MetricItem {
    label: string;
    value: string;
    detail: string;
}

interface PhaseItem {
    title: string;
    body: string;
}

interface BackgroundItem {
    label: string;
    value: string;
}

interface ToolTrace {
    name: string;
    status: string;
    lines: string[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    actor: string;
    time: string;
    text: string[];
    tool?: ToolTrace;
}

interface ChatStage {
    marker: string;
    title: string;
    summary: string;
    messages: ChatMessage[];
}

interface ScenarioCase {
    accent: string;
    soft: string;
    title: string;
    subtitle: string;
    sourceUrl: string;
    market: string;
    metrics: MetricItem[];
    phases: PhaseItem[];
    backgroundText: string;
    background: BackgroundItem[];
    assistantInitial: string;
    assistantLine: string;
    stages: ChatStage[];
    capabilities: PhaseItem[];
    sop: string[];
    schedule: string[];
    footer: string;
}

function renderBadge(text: string, className = ''): string {
    return `<span class="zn-badge ${className}">${escapeHtml(text)}</span>`;
}

function renderList(items: string[]): string {
    return items.map(item => `<li><i class="fa-solid fa-check"></i><span>${escapeHtml(item)}</span></li>`).join('');
}

function renderToolTrace(tool: ToolTrace): string {
    return `
        <div class="zn-tool">
            <div class="zn-tool-head">
                <span><i class="fa-solid fa-play"></i>${escapeHtml(tool.name)}</span>
                <strong>${escapeHtml(tool.status)}</strong>
            </div>
            <div class="zn-tool-body">
                ${tool.lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
            </div>
        </div>`;
}

function renderMessage(message: ChatMessage, accent: string): string {
    const isUser = message.role === 'user';
    const role = isUser ? 'user' : 'assistant';

    return `
        <div class="zn-msg zn-msg--${role}">
            ${isUser ? '' : `<div class="zn-avatar" style="background:${accent};">${escapeHtml(message.actor)}</div>`}
            <div class="zn-msg-stack">
                <div class="zn-bubble">
                    <div class="zn-msg-meta">${escapeHtml(isUser ? '用户' : 'OpenClaw')} · ${escapeHtml(message.time)}</div>
                    ${message.text.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                    ${message.tool ? renderToolTrace(message.tool) : ''}
                </div>
                <div class="zn-time">${escapeHtml(message.time)}</div>
            </div>
            ${isUser ? `<div class="zn-avatar zn-avatar--user">${escapeHtml(message.actor)}</div>` : ''}
        </div>`;
}

function renderHero(caseData: ScenarioCase): string {
    return `
        <section class="zn-hero">
            <div class="zn-hero-eyebrow">
                ${renderBadge('紫鸟开放平台')}
                ${renderBadge('场景示例 · 分步引导版')}
                ${renderBadge('v2.0 · 教会 → 沉淀 → 定时')}
                ${renderBadge(caseData.market)}
            </div>
            <h2>${escapeHtml(caseData.title)}</h2>
            <p>${escapeHtml(caseData.subtitle)} 同时请记住：OpenClaw 的实际表现高度依赖你接入的大模型，参考页展示的是较强模型配合分步教学后的样例。</p>
            <div class="zn-hero-meta">
                ${caseData.metrics.map(item => `
                    <article>
                        <span>${escapeHtml(item.label)}</span>
                        <strong>${escapeHtml(item.value)}</strong>
                        <small>${escapeHtml(item.detail)}</small>
                    </article>`).join('')}
            </div>
        </section>`;
}

function renderPhases(items: PhaseItem[]): string {
    return `
        <section class="zn-card zn-phases">
            <h2>四步法：从“教会”到“定时跑”</h2>
            <p class="zn-lead">这是 OpenClaw 自动化任务的通用心智模型。下方对话严格按这四步组织，并在项目宽版内容区中横向展开。</p>
            <div class="zn-phase-grid">
                ${items.map((item, index) => `
                    <article>
                        <h3><span>${index + 1}</span>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.body)}</p>
                    </article>`).join('')}
            </div>
        </section>`;
}

function renderBackground(caseData: ScenarioCase): string {
    return `
        <section class="zn-card zn-intro">
            <h2>场景背景</h2>
            <p>${escapeHtml(caseData.backgroundText)}</p>
            <dl>
                ${caseData.background.map(item => `
                    <dt>${escapeHtml(item.label)}</dt>
                    <dd>${escapeHtml(item.value)}</dd>`).join('')}
            </dl>
        </section>`;
}

function renderStages(caseData: ScenarioCase): string {
    return caseData.stages.map(stage => `
        <section class="zn-chat-stage">
            <div class="zn-stage-banner">
                <span>${escapeHtml(stage.marker)}</span>
                <div>
                    <h3>${escapeHtml(stage.title)}</h3>
                    <p>${escapeHtml(stage.summary)}</p>
                </div>
            </div>
            <div class="zn-stage-messages">
                ${stage.messages.map(message => renderMessage(message, caseData.accent)).join('')}
            </div>
        </section>`).join('');
}

function renderChat(caseData: ScenarioCase): string {
    return `
        <section class="zn-chat-card">
            <header class="zn-chat-header">
                <div class="zn-avatar zn-avatar--assistant" style="background:${caseData.accent};">${escapeHtml(caseData.assistantInitial)}</div>
                <div>
                    <h2>OpenClaw · 紫鸟开放平台 AI 助理</h2>
                    <p>${escapeHtml(caseData.assistantLine)}</p>
                </div>
            </header>
            ${renderStages(caseData)}
        </section>`;
}

function renderCapabilitySummary(caseData: ScenarioCase): string {
    return `
        <section class="zn-card zn-summary">
            <div class="zn-summary-head">
                <h2>本场景演示的 4 个关键能力</h2>
                <p>${escapeHtml(caseData.footer)}</p>
            </div>
            <div class="zn-summary-grid">
                ${caseData.capabilities.map((item, index) => `
                    <article>
                        <strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.body)}</p>
                    </article>`).join('')}
            </div>
            <div class="zn-rule-grid">
                <article>
                    <h3>沉淀为 SOP 的内容</h3>
                    <ul>${renderList(caseData.sop)}</ul>
                </article>
                <article>
                    <h3>定时与复用规则</h3>
                    <ul>${renderList(caseData.schedule)}</ul>
                </article>
            </div>
        </section>`;
}

function renderScenario(caseData: ScenarioCase): string {
    return `
    <div class="ziniao-case-shell" style="--zn-accent:${caseData.accent};--zn-soft:${caseData.soft};">
        ${renderHero(caseData)}
        ${renderPhases(caseData.phases)}
        ${renderBackground(caseData)}
        ${renderChat(caseData)}
        ${renderCapabilitySummary(caseData)}
    </div>`;
}

function renderUsageNotice(): string {
    const notices: Array<[string, string]> = [
        ['任务拆解 & 计划能力', '弱模型可能把 6 步任务一次性混跑；强模型会主动拆成可验证小步，并在每步结束时等待确认。'],
        ['工具调用稳定性', '差评抓取、SPA 等待、去重指纹、HTML 渲染都依赖工具链编排，模型弱时容易漏调或参数错。'],
        ['分类 / 归因准确度', '产品质量、期望偏差、详情页误导这类细分判定依赖语义理解和规则记忆。'],
        ['多语种话术质量', '英文、德语、日语回复是否得体，是否避免过度承诺，不同模型差异很明显。'],
        ['长上下文 / 多轮记忆', '示例横跨多轮修正规则，模型必须记住“不要默认补寄”“公开回复不放邮箱”等共识。'],
        ['沉淀为 SOP 的概括能力', '把对话压缩成参数化、可复用、可调度的工作流，是独立能力，不是简单摘要。'],
    ];

    return `
    <div class="ziniao-case-shell ziniao-notice-shell" style="--zn-accent:#dc2626;--zn-soft:#f59e0b;">
        <section class="zn-notice-title">
            <h2>使用 OpenClaw 前必读 · 两条关键须知</h2>
            <p>在跑任何自动化流程前，请先阅读以下两段说明。当前页面保留参考页信息顺序，并按项目宽版内容区重新排版。</p>
        </section>

        <section class="zn-notice-card zn-notice-card--danger">
            <div class="zn-notice-label">重要</div>
            <h3>不同大模型的能力不同，跑出来的效果也会不一样</h3>
            <p>OpenClaw 是“调度大模型 + 工具链”的智能体。底层模型不同，同一份指令下的拆解、调用、分类、话术和 SOP 沉淀质量都会有明显差异。参考场景展示的是较强模型配合分步教学后的能力上限样例，不是任意模型一句话就能稳定复现的保底承诺。</p>
            <div class="zn-notice-grid">
                ${notices.map(([title, body], index) => `
                    <article>
                        <strong>${index + 1} · ${escapeHtml(title)}</strong>
                        <span>${escapeHtml(body)}</span>
                    </article>`).join('')}
            </div>
            <footer>建议：上线前先确认接入的大模型档位。如果首次试跑不达预期，先检查模型、工具权限、页面等待和分步验证。</footer>
        </section>

        <section class="zn-notice-card zn-notice-card--warning">
            <h3>这是“如何使用 OpenClaw”的示范，不是“复制粘贴就能跑”的提示词</h3>
            <p>后续四个页面中的店铺名、订单号、差评、看板数字和对话过程都是演示数据，用来说明“分步引导 → 单步验证 → 流程沉淀 → 定时调度”的使用方式。</p>
            <p>直接把长指令一次性丢给 OpenClaw，实际效果通常会变差：可能漏抓数据源、可能误判分类、可能在页面未渲染完成时取数，也可能把本该人工确认的动作错误自动化。</p>
            <p>正确节奏是：一步一步引导，每一步看到产物后确认 OK，再进入下一步；流程跑通后再让 OpenClaw 沉淀为 SOP，最后才绑定定时任务和推送规则。</p>
        </section>

        <section class="zn-card zn-summary">
            <div class="zn-summary-grid zn-summary-grid--four">
                ${([
                    ['先试跑', '用演示窗口验证店铺、语言、权限、页面加载和字段口径。'],
                    ['再验收', '每步只看一个产物：数量、样本、分类、草稿、看板或报告。'],
                    ['再沉淀', '把确认过的步骤写成参数化 SOP，避免把店铺名和时区硬编码。'],
                    ['再定时', '只给已验收 SOP 配触发频率、推送对象和失败兜底。'],
                ] as Array<[string, string]>).map(([title, body]) => `
                    <article>
                        <strong>${escapeHtml(title)}</strong>
                        <p>${escapeHtml(body)}</p>
                    </article>`).join('')}
            </div>
        </section>
    </div>`;
}

interface PageShell {
    open: string;
    close: string;
}

function findOpeningDivWithClass(templateHtml: string, className: string): string | null {
    const pattern = new RegExp(`<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${className}\\b[^"']*\\1)[^>]*>`, 'i');
    return templateHtml.match(pattern)?.[0].trim() ?? null;
}

function renderModuleShell(templateHtml: string): PageShell {
    const fadeShell = findOpeningDivWithClass(templateHtml, 'view-fade-in');
    const moduleShell = findOpeningDivWithClass(templateHtml, 'module-container') || '<div class="module-container py-6">';
    const openings = fadeShell && fadeShell !== moduleShell ? [fadeShell, moduleShell] : [moduleShell];

    return {
        open: openings.join('\n'),
        close: openings.map(() => '</div>').join('\n'),
    };
}

const commonPhases: PhaseItem[] = [
    { title: '分步引导', body: '把大任务拆成最小可验证步骤，每步只让 OpenClaw 做一件事。' },
    { title: '单步验证', body: '看抓取数、样本、草稿、报告或看板，不满意当场改，满意再继续。' },
    { title: '流程沉淀', body: '把验证过的步骤保存为命名 SOP，参数化店铺、市场、阈值和推送规则。' },
    { title: '定时调度', body: '只有已沉淀 SOP 才能挂定时，并配置异常兜底和人工确认边界。' },
];

const scenarioCases: Record<Exclude<CaseId, 'usage_notice'>, ScenarioCase> = {
    bad_review_response: {
        accent: '#4f46e5',
        soft: '#7c3aed',
        title: '差评 24 小时闪电响应 — 先教会 OpenClaw，再让它定时帮你跑',
        subtitle: '差评响应不能一句话全自动。参考页按 6 步把店铺打开、Feedback 抓取、Brand / Product Reviews 补充、分类、S/A/B 草稿和 HTML 看板逐步跑通，再沉淀 SOP 与定时任务。',
        sourceUrl: 'https://open.ziniao.com/ziniao-cases/scenario-bad-review',
        market: '适用：Amazon US / UK / DE / JP',
        metrics: [
            { label: '交互方式', value: '自然语言 · 分步引导', detail: '每一步结束后停下来，等运营确认。' },
            { label: '演示节奏', value: '6 步教 · 1 步沉淀 · 1 步定时', detail: '先跑通，再标准化，最后自动执行。' },
            { label: '数据源', value: 'Feedback / Brand / Product', detail: '三个入口留来源字段并去重。' },
            { label: '交付物', value: 'SOP + 定时任务 + 看板', detail: 'HTML 看板、JSON 数据和回复草稿。' },
        ],
        phases: commonPhases,
        backgroundText: '你是 AURA-US-01 的运营 Lily，KPI 是 1-3 星差评 24 小时内必须有处理动作。你不想每天人工切后台，也不希望一上来就让 OpenClaw 全自动回复。',
        background: [
            { label: '角色', value: '运营 Lily / OpenClaw，已连接 ZClaw 浏览器、飞书、邮件。' },
            { label: '店铺', value: 'AURA-US-01，Amazon US。' },
            { label: 'SLA', value: '1-3 星差评 24 小时内必须有回复草稿或处理动作。' },
            { label: '目标', value: '把 6 步教学沉淀为“AURA 差评 24h 闪电响应”。' },
        ],
        assistantInitial: 'OC',
        assistantLine: '已连接 ZClaw 浏览器 · 飞书 · 邮件',
        stages: [
            {
                marker: '①',
                title: '阶段一 · 分步引导 + 单步验证',
                summary: '先拆 6 步，再从店铺打开、Feedback 抓取和评论入口扩展开始逐步确认。',
                messages: [
                    { role: 'user', actor: 'L', time: '08:58', text: ['OpenClaw，我想做“差评 24 小时闪电响应”。先别一次跑完，我要一步一步看你能不能做对。目标店铺：AURA-US-01。'] },
                    { role: 'assistant', actor: 'OC', time: '08:58', text: ['我会拆成 6 步：打开店铺并验证桥接；抓 Feedback Manager 最近 24 小时 1-3 星；补充 Brand Customer Reviews 与 Product Reviews；按原因分类；生成 S/A/B 回复草稿；最后渲染 HTML 看板。每一步完成后我都会停下来等你确认。'] },
                    { role: 'user', actor: 'L', time: '08:59', text: ['从 Step 1 开始。店铺打开后我先确认登录态。'] },
                    { role: 'assistant', actor: 'OC', time: '08:59', text: ['已打开 Seller Central，ZClaw 桥接握手正常，店铺头像匹配 AURA-US-01，没有二次验证。'], tool: { name: 'ziniao-assistant · open_store', status: '✓ 完成 1.4s', lines: ['shop=AURA-US-01', 'url=sellercentral.amazon.com/home', 'bridge=connected', 'next=等待人工确认'] } },
                    { role: 'user', actor: 'L', time: '09:00', text: ['OK，继续抓 Feedback。只看最近 24 小时 1-3 星。'] },
                    { role: 'assistant', actor: 'OC', time: '09:02', text: ['Feedback Manager 已按最近 24 小时和 1-3 星过滤，命中 3 条。我先不分类，先把数量、星级和样本字段给你确认。'], tool: { name: 'sellercentral · feedback_manager', status: '✓ 命中 3 条', lines: ['1 星=1，2 星=1，3 星=1', '字段=reviewer/order/date/rating/body/status', '采集口径=最近 24h'] } },
                    { role: 'user', actor: 'L', time: '09:03', text: ['数量对。继续补 Brand 和 Product Reviews，但记得三个入口口径不同，要去重。'] },
                    { role: 'assistant', actor: 'OC', time: '09:04', text: ['已补充 Brand Customer Reviews 5 条、Product Reviews 2 条。原始合计 10 条，按 reviewer、日期、正文指纹去重后得到 7 条独立差评，并保留来源字段。'] },
                ],
            },
            {
                marker: '②',
                title: '阶段二 · 分类、草稿和看板',
                summary: '运营在分类子标签、S 档承诺和看板字段上连续修正规则，OpenClaw 当场重算。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '09:05', text: ['先按产品质量、尺寸规格、功能问题、物流包装、客户服务、期望偏差六类分类。7 条里产品质量 3 条、物流包装 2 条、功能问题 1 条、期望偏差 1 条。'] },
                    { role: 'user', actor: 'L', time: '09:06', text: ['“和图片不一样”不要只放在期望偏差，拆出“详情页误导”，后续给 Listing 同学。'] },
                    { role: 'assistant', actor: 'OC', time: '09:07', text: ['已新增“期望偏差 · 详情页误导”子标签，并把该规则记入本轮上下文，沉淀 SOP 时同步写进去。'] },
                    { role: 'assistant', actor: 'OC', time: '09:09', text: ['回复草稿已生成 S/A/B 三档：S 档 2 条、A 档 4 条、B 档 1 条。S 档用于损坏、退款或高风险问题，A 档用于明确问题处理，B 档用于轻微体验或期望偏差。'] },
                    { role: 'user', actor: 'L', time: '09:10', text: ['S 档不能默认说已补寄。先退款，再询问客户是否需要补寄。'] },
                    { role: 'assistant', actor: 'OC', time: '09:11', text: ['已重生成 S 档话术：先表达歉意和退款处理，再询问是否需要补寄，不承诺已经补寄。HTML 看板也已生成。'], tool: { name: 'report · render_bad_review_dashboard', status: '✓ 已生成', lines: ['看板字段=评分/24h新增差评/S档数量/Top分类/详情页误导/草稿状态', '新增要求=环比变化列', '输出=html + json + markdown_drafts'] } },
                    { role: 'user', actor: 'L', time: '09:12', text: ['看板加一列“环比变化”，之后固定保留。'] },
                    { role: 'assistant', actor: 'OC', time: '09:12', text: ['已加入环比变化列，并标记为 SOP 固定字段。'] },
                ],
            },
            {
                marker: '③',
                title: '阶段三 · SOP 沉淀',
                summary: '把已经确认过的 6 步流程保存成可复用 SOP，避免下次重新教学。',
                messages: [
                    { role: 'user', actor: 'L', time: '09:13', text: ['把这 6 步沉淀成“AURA 差评 24h 闪电响应”。详情页误导、S 档不默认补寄、看板环比列都写进去。'] },
                    { role: 'assistant', actor: 'OC', time: '09:14', text: ['SOP v1 已保存：参数化店铺、市场、时区；三入口抓取与来源留痕；去重规则；六类原因与详情页误导子标签；S/A/B 草稿；HTML 看板；登录态丢失、SPA 超时和推送失败的兜底。'] },
                ],
            },
            {
                marker: '④',
                title: '阶段四 · 定时调度 + 复用',
                summary: '只给确认过的 SOP 绑定早晚任务，并定义 @ 人策略和跨站复用方式。',
                messages: [
                    { role: 'user', actor: 'L', time: '09:15', text: ['每天早晚跑，S 档要立刻提醒。'] },
                    { role: 'assistant', actor: 'OC', time: '09:16', text: ['已配置每天 09:00 和 21:00（Asia/Shanghai）触发，推送 AURA 运营群。S 档大于等于 1 条立即 @ Lily，否则只在晚班汇总。'] },
                    { role: 'user', actor: 'L', time: '09:17', text: ['UK 和 DE 也要用。'] },
                    { role: 'assistant', actor: 'OC', time: '09:18', text: ['无需重教。复制 SOP instance，切换市场域名、时区、语言和推送群即可；母版规则通过 SOP 版本统一升级。'] },
                ],
            },
        ],
        capabilities: [
            { title: '分步引导', body: '让运营按“一步一确认”节奏教学，避免全链路一次性失控。' },
            { title: '单步验证', body: '每个工具动作都回传数量、样本和字段，用户能即时修正规则。' },
            { title: '流程沉淀', body: '把会话中的修正规则固化到 SOP，而不是只留在聊天记录里。' },
            { title: '定时调度', body: '已验证 SOP 才能挂定时，并且保留人工提醒与异常兜底。' },
        ],
        sop: ['三入口抓取并保留来源字段。', '按 reviewer + date + body 指纹去重。', '分类包含详情页误导子标签。', 'S 档不默认承诺补寄。', 'HTML 看板固定包含环比变化列。'],
        schedule: ['每天 09:00 / 21:00 运行。', 'S 档大于等于 1 条立即 @ 负责人。', 'UK / DE 复制 SOP instance，不改母版规则。'],
        footer: '场景示例 · 差评 24 小时闪电响应 · 本页面对话、订单号和看板数字均为演示数据，非真实执行结果。',
    },
    ad_acos_diagnosis: {
        accent: '#f59e0b',
        soft: '#2563eb',
        title: '广告 ACOS 日审 — 从一句“先看一眼”到周一/三/五自动跑',
        subtitle: '广告优化涉及 Campaign / Ad Group / Targeting / 搜索词多层下钻。参考页强调先审后跑，只输出人工可复核的调价手册和否定词清单，不直接自动改后台。',
        sourceUrl: 'https://open.ziniao.com/ziniao-cases/scenario-ad-optimization',
        market: '适用：Amazon US / UK / DE / JP',
        metrics: [
            { label: '交互方式', value: '自然语言 · 分步引导', detail: '每层数据先给广告负责人确认。' },
            { label: '演示节奏', value: '6 步教 · 1 步沉淀 · 1 步定时', detail: '低频定时，避免过度调价。' },
            { label: '数据源', value: 'Campaign / Ad Group / Targeting / 搜索词', detail: '三级结构加搜索词，不混成单表结论。' },
            { label: '交付物', value: 'SOP + 定时任务 + 调价手册', detail: '三张数据表、调价 xlsx、否定词清单和 HTML 报告。' },
        ],
        phases: commonPhases,
        backgroundText: '你是 NOVA-US-02 的广告负责人 Alex，KPI 是广告 ACOS 不能连续两天超过 40%。本轮试跑临时把阈值收紧到 35%，但不允许 OpenClaw 自动调价。',
        background: [
            { label: '角色', value: '广告运营 Alex / OpenClaw，已连接 ZClaw 浏览器和飞书。' },
            { label: '店铺', value: 'NOVA-US-02，Amazon US。' },
            { label: '阈值', value: '默认 ACOS 40%，本次审核临时使用 35%。' },
            { label: '目标', value: '把广告日审沉淀为“NOVA 广告 ACOS 日审”。' },
        ],
        assistantInitial: 'OC',
        assistantLine: '已连接 ZClaw 浏览器 · 广告控制台 · 飞书',
        stages: [
            {
                marker: '①',
                title: '阶段一 · 先拆广告日审',
                summary: '从店铺与广告控制台打开开始，只抓有花费并超过阈值的层级。',
                messages: [
                    { role: 'user', actor: 'A', time: '09:10', text: ['我要做 NOVA-US-02 的广告 ACOS 日审。阈值先用 35%，不要一口气跑完，也不要自动改竞价。'] },
                    { role: 'assistant', actor: 'OC', time: '09:10', text: ['我会拆成 6 步：打开店铺和广告控制台；抓进行中 Campaign；对有花费且超阈值的层级下钻 Ad Group 与 Targeting；按 ACOS 分层；生成手动调价指南；识别无关搜索词并输出报告。所有改价只给手册，不直接执行。'] },
                    { role: 'assistant', actor: 'OC', time: '09:12', text: ['Seller Central 和 advertising.amazon.com 均可达。Campaign Manager 是虚拟滚动表格，我已先触发完整渲染再读取列。进行中 Campaign 14 个，其中 9 个最近 7 天有花费，昨日整体 ACOS 42.7%。'], tool: { name: 'ads-console · campaign_grid', status: '✓ 已采集', lines: ['active_campaigns=14', 'spent_campaigns=9', 'yesterday_acos=42.7%', 'grid=virtual_scroll_aligned'] } },
                    { role: 'user', actor: 'A', time: '09:13', text: ['数量对，只看有花费的 9 个。'] },
                    { role: 'assistant', actor: 'OC', time: '09:16', text: ['继续下钻 23 个 Ad Group，其中 11 个超过 35%。再进入 Targeting，得到 187 行，字段包括匹配类型、建议竞价范围、实际竞价、展示、点击、花费、销售、ACOS 和 ROAS。'] },
                ],
            },
            {
                marker: '②',
                title: '阶段二 · 分层和调价手册',
                summary: '用户现场调整花费门槛和高 ACOS 处理口径，避免低样本误判和自动暂停。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '09:18', text: ['初始规则：ACOS > 50% 为严重超标，35%-50% 为轻度超标，<30% 为良好，花费低于 5 美元暂不评估。187 行中严重超标 41 行、轻度超标 58 行、良好 73 行。'] },
                    { role: 'user', actor: 'A', time: '09:19', text: ['5 美元门槛太低，改成 10 美元，避免低样本进入调价方案。'] },
                    { role: 'assistant', actor: 'OC', time: '09:20', text: ['已重算：严重超标 35 行、轻度超标 49 行、良好 66 行、暂不评估 37 行。调价手册会按层级输出建议竞价、预期影响和后台操作路径。'] },
                    { role: 'user', actor: 'A', time: '09:22', text: ['ACOS 大于 150% 的 Ad Group 不要写暂停，改成人工复盘。'] },
                    { role: 'assistant', actor: 'OC', time: '09:23', text: ['规则已改：高 ACOS Ad Group 标红并进入人工复盘，不写暂停动作。Targeting 层仍输出降价建议，但由广告负责人执行。'], tool: { name: 'ads-audit · bidding_manual', status: '✓ 已生成', lines: ['min_spend=10 USD', 'manual_review=ACOS>150% Ad Group', 'output=Campaign / AdGroup / Targeting sheets'] } },
                ],
            },
            {
                marker: '③',
                title: '阶段三 · 否定词和报告',
                summary: '从自动投放搜索词里识别无关词，并对“预计省花费”做理论上限说明。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '09:25', text: ['搜索词分析完成：识别竞品品牌词、无关品类词和 cheap/free/diy 等低意图词，建议精确否定 8 条、词组否定 13 条。'] },
                    { role: 'user', actor: 'A', time: '09:26', text: ['报告里的预计省花费别写得像承诺，要加注脚。'] },
                    { role: 'assistant', actor: 'OC', time: '09:26', text: ['HTML 报告保留预计省花费，但标注为理论上限，实际节省取决于后续流量和转化。'] },
                    { role: 'user', actor: 'A', time: '09:27', text: ['沉淀 SOP。必须包含 10 美元门槛、人工复盘、理论省花费注脚。'] },
                    { role: 'assistant', actor: 'OC', time: '09:28', text: ['SOP v1 已保存：Campaign 虚拟滚动采集、三级下钻、Targeting 分层、调价手册、否定词清单、异常兜底和参数化阈值都已写入。'] },
                ],
            },
            {
                marker: '④',
                title: '阶段四 · 低频定时 + 多站复用',
                summary: '广告日审不高频自动跑，按周一/三/五输出报告和提醒。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '09:30', text: ['建议周一/三/五 09:00 运行，默认 ACOS 阈值回到 40%，调用时可传更低阈值。严重超标 Targeting 大于等于 20 条才 @ Alex。'] },
                    { role: 'user', actor: 'A', time: '09:31', text: ['UK 和 JP 也要上，JP 的花费门槛要换日元。'] },
                    { role: 'assistant', actor: 'OC', time: '09:32', text: ['复用同一 SOP。UK 切 advertising.amazon.co.uk，JP 切 advertising.amazon.co.jp；币种门槛从 $10 换算到约 ¥1500，并通过币种表维护，避免单站补丁漂移。'] },
                ],
            },
        ],
        capabilities: [
            { title: '三级下钻', body: 'Campaign、Ad Group、Targeting 分层采集，避免把广告结构压成错误平表。' },
            { title: '可审阅建议', body: '调价只输出手册，不直接操作后台。' },
            { title: '动态规则修正', body: '花费门槛、人工复盘、理论注脚都在会话中即时更新。' },
            { title: '低频调度', body: '广告变更需要观察期，示例采用周一/三/五而不是每日高频。' },
        ],
        sop: ['虚拟滚动表格必须完整渲染。', '花费低于 10 美元暂不评估。', '高 ACOS Ad Group 改成人工复盘。', '预计省花费必须标注理论上限。'],
        schedule: ['每周一/三/五 09:00 运行。', '默认 ACOS 阈值 40%，可参数覆盖。', 'JP 使用日元门槛和 JP 广告域名。'],
        footer: '场景示例 · 广告 ACOS 日审 · 调价建议仅供人工复核，非自动执行结果。',
    },
    review_monitor: {
        accent: '#0f766e',
        soft: '#2563eb',
        title: '本店评论健康周报 — 把“挨条翻评论”变成一周一次的自动巡检',
        subtitle: '评论监控参考页覆盖 Feedback Manager、Brand Customer Reviews 与 Product Reviews，强调多语种原文保留、分类校验、回复草稿不自动发送，以及周报和每日红线任务拆分。',
        sourceUrl: 'https://open.ziniao.com/ziniao-cases/scenario-review-monitor',
        market: '适用：Amazon DE / US / UK / JP',
        metrics: [
            { label: '交互方式', value: '自然语言 · 分步引导', detail: '先验翻译质量，再验分类和预警。' },
            { label: '演示节奏', value: '6 步教 · 1 步沉淀 · 1 步定时', detail: '主周报每周一次，红线轻量每日一次。' },
            { label: '数据源', value: 'Feedback / Brand / Product Reviews', detail: '三个入口分开展示，不误导性合并。' },
            { label: '交付物', value: 'SOP + 周报推送 + 回复草稿', detail: 'xlsx 周报、双语明细和人工确认草稿。' },
        ],
        phases: commonPhases,
        backgroundText: '你是 MOON-DE-01 德国站运营 Wendy，老板每周一要看评论健康周报。你不想挨条翻三类评论入口，也不允许 OpenClaw 自动公开回复。',
        background: [
            { label: '角色', value: '运营 Wendy / OpenClaw，已连接 ZClaw 浏览器、飞书、邮件。' },
            { label: '店铺', value: 'MOON-DE-01，Amazon DE，主语种德语。' },
            { label: '窗口', value: '最近 30 天 Feedback + 当日全部新增 Product Reviews。' },
            { label: '目标', value: '沉淀“MOON 评论健康周报”，每周一自动巡检。' },
        ],
        assistantInitial: 'OC',
        assistantLine: '已连接 ZClaw 浏览器 · 飞书 · 邮件',
        stages: [
            {
                marker: '①',
                title: '阶段一 · 定义周报边界',
                summary: '先确认不自动回复、保留德语原文，并把 ASIN 覆盖范围从 Top 5 改成全覆盖。',
                messages: [
                    { role: 'user', actor: 'W', time: '08:30', text: ['我要做 MOON-DE-01 的评论健康周报。不要自动发回复，只生成草稿；也不要一次跑完。'] },
                    { role: 'assistant', actor: 'OC', time: '08:30', text: ['我会拆成 6 步：打开德国站并保留原语言；抓 Feedback Manager；抓 Product Reviews；筛差评并做双语分类；计算预警指标；生成回复草稿与 xlsx 周报。原计划只看 Top 5 销量 ASIN。'] },
                    { role: 'user', actor: 'W', time: '08:31', text: ['别只看 Top 5。我们 SKU 不多，30 天内有新差评的 ASIN 都覆盖。'] },
                    { role: 'assistant', actor: 'OC', time: '08:31', text: ['已改为“在售 + 30 天内有新差评 ASIN 全覆盖”，超过 30 个 ASIN 时先告警确认。'] },
                ],
            },
            {
                marker: '②',
                title: '阶段二 · 德语环境与入口口径',
                summary: '抓取 Feedback 概况和 Product Reviews 明细，同时校验差评率红黄线。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '08:34', text: ['已打开 sellercentral.amazon.de，语言保留 Deutsch。Feedback Manager 等待 15 秒后取整体评分、30/90/365 天分布和 30 天明细。当前 30 天差评率 8%。'], tool: { name: 'sellercentral.de · feedback_manager', status: '✓ 已采集', lines: ['wait=15s', 'negative_feedback_30d=4', 'negative_rate_30d=8%', 'language=Deutsch'] } },
                    { role: 'user', actor: 'W', time: '08:35', text: ['4 条差评对得上，但红线不是 5%，我们内部是 6%；5%-6% 标黄，超过 6% 才红。'] },
                    { role: 'assistant', actor: 'OC', time: '08:36', text: ['阈值已改，本周 8% 仍是红区。随后从管理库存页找到 18 个在售 ASIN，其中 6 个 30 天内有新差评；逐个打开 Product Reviews，抓到 43 条评论，其中 11 条 1-3 星。'] },
                    { role: 'user', actor: 'W', time: '08:36', text: ['给我看一条 1 星德语原文和中文译文，确认翻译质量。'] },
                    { role: 'assistant', actor: 'OC', time: '08:37', text: ['样本保留星级、ASIN、reviewer、购买状态、德语原文与中文口语化译文，并保留情绪强度。Feedback 和 Product Reviews 口径不同，周报分两块展示。'] },
                ],
            },
            {
                marker: '③',
                title: '阶段三 · 分类、预警和回复草稿',
                summary: '用户修正“批次问题成节”和公开回复口径，避免回复不可撤回风险。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '08:39', text: ['按产品质量、尺寸规格、物流包装、客户服务、期望偏差等原因分类。按钮失效样本归产品质量，“图上看起来更大”归“期望偏差 · 详情页误导”。'] },
                    { role: 'assistant', actor: 'OC', time: '08:40', text: ['预警指标显示：30 天差评率 8% 红区，近 7 天差评数环比增加，某 ASIN 差评集中度高，同一问题词“按钮/Knopf”出现 3 次，疑似批次问题。'] },
                    { role: 'user', actor: 'W', time: '08:41', text: ['同一名词出现 3 次时，单独拉“建议跟进 ASIN”小节，产品同学不会去表格备注里找。'] },
                    { role: 'assistant', actor: 'OC', time: '08:42', text: ['已规则化。随后生成德语原文 + 中文对照回复草稿，只生成不发送。公开回复初稿里含外部邮箱。'] },
                    { role: 'user', actor: 'W', time: '08:43', text: ['公开回复不要放邮箱，引导买家从亚马逊订单详情页联系卖家。'] },
                    { role: 'assistant', actor: 'OC', time: '08:43', text: ['模板已改。xlsx 周报包含店铺反馈概况、全部反馈明细、差评分析预警、后续行动计划和草稿，并补充问题词频小条形图。'] },
                ],
            },
            {
                marker: '④',
                title: '阶段四 · 周报定时 + 多语种复用',
                summary: '主周报每周跑，红线任务每日轻量跑；FR/IT 语言资源单独审核。',
                messages: [
                    { role: 'user', actor: 'W', time: '08:45', text: ['沉淀为“MOON 评论健康周报”，把 6%/5% 阈值、全覆盖 ASIN、分开展示、同名词 3 次成节、公开回复不放邮箱都写进去。'] },
                    { role: 'assistant', actor: 'OC', time: '08:47', text: ['SOP v1 已保存。主周报每周一 09:00 跑完整流程；另建每日 18:00 轻量红线任务，只跑店铺反馈概况和差评率判断，不抓 Product Reviews。红区或批次问题才 @ Wendy。'] },
                    { role: 'user', actor: 'W', time: '08:48', text: ['FR 和 IT 站也要上，我担心关键词集不一样。'] },
                    { role: 'assistant', actor: 'OC', time: '08:49', text: ['流程不用重教，但法语和意大利语关键词集要单独生成草稿并审核后生效。每个站点共享 SOP v1，语言资源独立维护。'] },
                ],
            },
        ],
        capabilities: [
            { title: '多入口口径', body: 'Feedback、Brand、Product Reviews 分开展示，不做误导性合并。' },
            { title: '多语种保真', body: '保留原文、中文译文和情绪强度，回复草稿不自动提交。' },
            { title: '预警规则', body: '红黄线、7 日环比、集中 ASIN 和重复问题词都可参数化。' },
            { title: '任务拆分', body: '周报完整跑，红线轻量跑，避免每天重抓所有商品评论。' },
        ],
        sop: ['差评率 ≥6% 红，5%-6% 黄。', '30 天内有新差评 ASIN 全覆盖。', '同一问题名词出现 3 次单独成节。', '公开回复不放外部邮箱。'],
        schedule: ['每周一 09:00 跑主周报。', '每日 18:00 跑轻量红线任务。', 'FR / IT 关键词集独立维护并审核。'],
        footer: '场景示例 · 评论健康周报 · 回复草稿仅供人工确认，非自动公开回复。',
    },
    amazon_daily_report: {
        accent: '#4f46e5',
        soft: '#14b8a6',
        title: '亚马逊店铺日报 — 12 个后台模块，一份早 08:30 的运营晨会日报',
        subtitle: '店铺日报参考页把 Seller Central、Ads 与 Performance 中的 12 个模块拆成 6 组验证，保留 JP/EN 字段映射、广告 7 日均值对比、重要提醒固定优先级和失败分级兜底。',
        sourceUrl: 'https://open.ziniao.com/ziniao-cases/scenario-amazon-report',
        market: '适用：Amazon US / UK / DE / JP',
        metrics: [
            { label: '交互方式', value: '自然语言 · 分步引导', detail: '12 模块按 6 组验证，不一次并发。' },
            { label: '演示节奏', value: '6 步教 · 1 步沉淀 · 1 步定时', detail: '晨会前 30 分钟自动输出日报。' },
            { label: '数据源', value: 'Seller Central + Ads + Performance', detail: '销售、库存、广告、口碑和合规统一看。' },
            { label: '交付物', value: 'SOP + 日报 HTML + 飞书卡片', detail: '含取数状态、重要提醒和完整日报链接。' },
        ],
        phases: commonPhases,
        backgroundText: '你是 BREEZE-JP-01 日本站店长 Tom，每天 09:00 要开运营晨会。你希望晨会前拿到覆盖销售、库存、FBA、广告、口碑和合规的一份日报，但不想一开始就让 OpenClaw 并发打开 12 个后台页面。',
        background: [
            { label: '角色', value: '店长 Tom / OpenClaw，已连接 ZClaw 浏览器和飞书。' },
            { label: '店铺', value: 'BREEZE-JP-01，Amazon JP，Asia/Tokyo，JPY。' },
            { label: '模块', value: '销售、库存、FBA、货件、业务报告、未发货、广告、评论、反馈、账户健康、绩效通知、重要提醒。' },
            { label: '目标', value: '沉淀“BREEZE 店铺日报”，每天 08:30 JST 自动运行。' },
        ],
        assistantInitial: 'OC',
        assistantLine: '已连接 ZClaw 浏览器 · Seller Central · Ads · 飞书',
        stages: [
            {
                marker: '①',
                title: '阶段一 · 12 个模块先分组',
                summary: '先定义 6 组顺序，广告只取汇总，并加入前 7 日均值对比。',
                messages: [
                    { role: 'user', actor: 'T', time: '07:45', text: ['我要做 BREEZE-JP-01 的亚马逊店铺日报，09:00 晨会要用，覆盖 12 个后台模块。不要一上来全开并发，先分组慢慢跑。'] },
                    { role: 'assistant', actor: 'OC', time: '07:45', text: ['我会拆成 6 组：店铺校验、销售与订单、库存与 FBA、广告汇总、口碑与合规、HTML 日报与重要提醒。广告只取汇总，不做下钻。'] },
                    { role: 'user', actor: 'T', time: '07:46', text: ['广告不要只看昨日孤值，要跟前 7 日均值对比，否则晨会看不出异常。'] },
                    { role: 'assistant', actor: 'OC', time: '07:46', text: ['已把广告组改为昨日五大指标对比前 7 日均值，ACOS 偏离超过阈值就加波动提示。'] },
                ],
            },
            {
                marker: '②',
                title: '阶段二 · JP 环境、销售、库存和货件',
                summary: '保留日语 UI 和 JP/EN 字段映射，发现货件差异后加入调查窗口倒计时。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '07:48', text: ['已打开 sellercentral.amazon.co.jp，语言为日本语，日期按 Asia/Tokyo，币种 JPY。是否切英文？'] },
                    { role: 'user', actor: 'T', time: '07:48', text: ['不要切英文。英文字段有时会变体，用日语 UI + JP/EN 字段映射表抓。'] },
                    { role: 'assistant', actor: 'OC', time: '07:52', text: ['销售与订单组完成：昨日销售、周/月累计、PV、会话、转化率和未发货订单都按 JST 日历日口径输出。库存与 FBA 组完成：在售 SKU、可售/不可售/在途、IPI、超龄库存、潜在仓储费、补货建议和货件进度。发现 FBA17X9PLM2 声明 200 件、接收 187 件，差异 13 件。'], tool: { name: 'sellercentral.jp · inventory_fba_shipments', status: '✓ 已采集', lines: ['timezone=Asia/Tokyo', 'currency=JPY', 'shipment=FBA17X9PLM2', 'declared=200 / received=187 / diff=13'] } },
                    { role: 'user', actor: 'T', time: '07:53', text: ['货件差异必须放在日报顶部，而且要显示剩余调查申请窗口。'] },
                    { role: 'assistant', actor: 'OC', time: '07:53', text: ['已规则化：货件差异会计算 24h 调查窗口剩余时间，并作为重要提醒优先展示。'] },
                ],
            },
            {
                marker: '③',
                title: '阶段三 · 广告、合规和提醒排序',
                summary: '用户把软提醒改成明确晨会动作，并要求提醒优先级写死。',
                messages: [
                    { role: 'assistant', actor: 'OC', time: '07:55', text: ['广告组只取汇总：昨日花费、点击、销售、ACOS、ROAS，并与前 7 日均值对比。昨日 ACOS 高于 7 日均值 9.8pp，花费上升但销售下降。'] },
                    { role: 'user', actor: 'T', time: '07:56', text: ['提醒文案不要写“建议复盘”这么软，要写清楚“请在晨会同步原因”。'] },
                    { role: 'assistant', actor: 'OC', time: '07:57', text: ['口碑与合规组完成：反馈评分、24h 买家评论、账户健康和绩效通知。发现一条包装合规更新提醒，非违规但需 30 日内确认。'] },
                    { role: 'user', actor: 'T', time: '07:57', text: ['放进重要提醒，但不要每天重复到让人麻木。显示 3 天没处理后自动升红。'] },
                    { role: 'assistant', actor: 'OC', time: '07:58', text: ['已生成 HTML 日报，顶部提醒为货件差异、广告 ACOS 波动、绩效通知。当前排序按紧迫度。'] },
                    { role: 'user', actor: 'T', time: '07:58', text: ['动态排序可以，但规则要写死：货件差异窗口优先，其次账户健康升红，然后广告波动，再到其他项。'] },
                    { role: 'assistant', actor: 'OC', time: '07:59', text: ['已将重要提醒优先级固化，后续不按模型主观判断排序。'] },
                ],
            },
            {
                marker: '④',
                title: '阶段四 · 08:30 定时与多站复用',
                summary: '日报按模块失败数量分级处理，US/UK 切换字段映射、时区和币种。',
                messages: [
                    { role: 'user', actor: 'T', time: '08:00', text: ['沉淀为“BREEZE 店铺日报”，写入 JP/EN 字段映射、广告 7 日均值、货件窗口倒计时、绩效通知 3 天后升红和提醒优先级。'] },
                    { role: 'assistant', actor: 'OC', time: '08:02', text: ['SOP v1 已保存：6 组串行、组内并发不超过 2、字段映射、异常兜底、HTML 日报路径和重要提醒规则都已参数化。每天 08:30 JST 触发；1-2 个模块失败仍推日报并标失败，3 个及以上失败先延迟重跑，仍失败则推占位卡片并 @ Tom。'] },
                    { role: 'user', actor: 'T', time: '08:03', text: ['美国和英国店也要用，JP 是日语映射表。'] },
                    { role: 'assistant', actor: 'OC', time: '08:03', text: ['SOP 可复用，US/UK 切 EN 字段映射、当地时区和对应币种。亚马逊 UI 高频变化，后续需要升 SOP 版本并多站一起回归。'] },
                ],
            },
        ],
        capabilities: [
            { title: '多模块分组', body: '12 个后台模块按运营优先级分 6 组串行，降低风控和错列风险。' },
            { title: '字段映射', body: 'JP 使用日语 UI 和 JP/EN 映射表，跨站再切换映射。' },
            { title: '重要提醒', body: '货件窗口、账户健康、广告波动等优先级固化，不靠模型主观排序。' },
            { title: '失败兜底', body: '按失败模块数量决定继续推送、重跑或占位提醒。' },
        ],
        sop: ['12 模块拆成 6 组，组内并发不超过 2。', 'JP/EN 字段映射表独立维护。', '广告汇总对比前 7 日均值。', '重要提醒优先级写死。', '绩效通知 3 天未处理升红。'],
        schedule: ['每天 08:30 JST 触发。', '1-2 个模块失败仍推日报并标出失败。', '3 个及以上失败先重跑，仍失败推占位卡片并 @ 店长。', 'US/UK 切 EN 映射、当地时区和币种。'],
        footer: '场景示例 · 亚马逊店铺日报 · 所有模块数据与提醒均为演示口径，非真实后台执行结果。',
    },
};

export function renderBusinessScenarioPage(templateHtml: string, caseId: CaseId): string {
    const shell = renderModuleShell(templateHtml);
    const body = caseId === 'usage_notice' ? renderUsageNotice() : renderScenario(scenarioCases[caseId]);

    return `${shell.open}
${body}
${shell.close}`;
}
