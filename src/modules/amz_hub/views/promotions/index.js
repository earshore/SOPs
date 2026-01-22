// src/modules/amz_hub/views/promotions/index.js
// 欧洲站实战版 - 基于头部卖家真实经验

// ==================== 1. 内容数据源 (欧洲站实战版) ====================
const promoData = [
    {
        id: 'overview',
        title: '欧洲站促销实战概览',
        icon: 'fa-layer-group',
        content: [
            {
                type: 'callout',
                style: 'insight',
                title: '💡核心认知',
                text: '促销不是"打折亏钱"，而是用可控成本换取排名、评论、BSR权重的战略性投资。欧洲站流量成本高，精准选择促销时机比盲目参与更重要。'
            },
            {
                type: 'section_header',
                text: '促销工具'
            },
            {
                type: 'grid_links',
                items: [
                    { title: 'Deals 促销', icon: 'fa-bolt', text: '秒杀/7天促销 | 冲排名利器' },
                    { title: '优惠券 Coupons', icon: 'fa-ticket-alt', text: '低成本日常引流 | 必用工具' },
                    { title: 'Prime 专享折扣', icon: 'fa-tags', text: '高转化率 | 免费使用' }
                ]
            },
            {
                type: 'section_header',
                text: '年度促销旺季'
            },
            {
                type: 'grid_links',
                items: [
                    { title: 'Prime Day', icon: 'fa-box-open', text: '7月 | 上半年最大流量峰值' },
                    { title: '返校季', icon: 'fa-graduation-cap', text: '8-9月 | 欧洲特色窗口期' },
                    { title: '黑五网一', icon: 'fa-shopping-cart', text: '11月 | 全年收割季' }
                ]
            }
        ]
    },
    // --- 促销工具组 ---
    {
        id: 'tools_intro',
        title: '促销工具',
        icon: 'fa-tools',
        content: [
            {
                type: 'callout',
                style: 'core',
                title: '🎯 我的促销组合策略',
                text: '日常：Prime专享折扣 (免费) + 优惠券 (低成本)；冲刺期：叠加LD秒杀；大促期：7天Deal + 高额Coupon。不要把所有工具同时开，要有节奏。'
            },
            {
                type: 'comparison_table',
                headers: ['工具', '成本', '流量效果', '使用频率', '适用场景'],
                rows: [
                    ['秒杀 LD', '€60-150/次', '⭐⭐⭐⭐', '旺季期间', '冲排名、清库存'],
                    ['7天促销', '€200-400/次', '⭐⭐⭐⭐⭐', '大促期间', '稳定提升权重'],
                    ['优惠券', '兑换费 €0.50/次', '⭐⭐⭐', '常年开启', '日常引流转化'],
                    ['Prime专享', '免费', '⭐⭐⭐', '常年开启', '提升转化率']
                ]
            }
        ]
    },
    {
        id: 'deals',
        title: 'Deals 促销',
        icon: 'fa-bolt',
        content: [
            {
                type: 'callout',
                style: 'warning',
                title: '⚠️ 秒杀费用上涨警告',
                text: '2023年起欧洲站秒杀费大幅上涨，Prime Day期间单次秒杀费可达€300+。务必提前核算好ROI，不是每个产品都适合报秒杀！'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '秒杀 (Lightning Deal)',
                        icon: 'fa-stopwatch',
                        desc: '4-12小时限时促销，展示在Today\'s Deals页面。流量集中但时间短，适合有一定评论基础的产品。',
                        tags: ['冲排名', '测试市场', '备货要足']
                    },
                    {
                        title: '7天促销 (7-day Deal)',
                        icon: 'fa-calendar-week',
                        desc: '持续7天的促销展示，费用高但曝光时间长。ROI往往比秒杀更好，是大促期间的优选。',
                        tags: ['性价比高', '权重提升', '大促首选']
                    },
                    {
                        title: '镇店之宝 (DOTD)',
                        icon: 'fa-gem',
                        desc: '顶级展示位，需要亚马逊邀请。普通卖家很难获得，不用过多关注。',
                        tags: ['门槛极高', '被动等待']
                    }
                ]
            },
            {
                type: 'section_header',
                text: '🎯 我的秒杀实战心得'
            },
            {
                type: 'tip_list',
                items: [
                    { icon: 'fa-check-circle', style: 'success', text: '库存充足再报秒杀，断货比不报更伤排名' },
                    { icon: 'fa-check-circle', style: 'success', text: '提前2-3周报名，越早费用越低、时间段越好' },
                    { icon: 'fa-check-circle', style: 'success', text: '秒杀期间同步加大广告预算，形成流量叠加' },
                    { icon: 'fa-times-circle', style: 'danger', text: '新品0评论不要报秒杀，转化率太低，浪费钱' },
                    { icon: 'fa-times-circle', style: 'danger', text: '不要在淡季报秒杀，自然流量太少效果差' }
                ]
            },
            {
                type: 'callout',
                style: 'formula',
                title: '📊 秒杀ROI计算公式',
                text: 'ROI = (秒杀期间额外利润 + 排名提升带来的后续利润) / (秒杀费 + 折扣损失)。注意：排名提升带来的后续利润往往是更大的收益来源！'
            }
        ]
    },
    {
        id: 'coupons',
        title: '优惠券 (Coupons)',
        icon: 'fa-ticket-alt',
        content: [
            {
                type: 'callout',
                style: 'core',
                title: '💡 必备工具',
                text: '优惠券是我使用频率最高的促销工具！成本低、设置灵活、效果可控。欧洲消费者对"绿色优惠券标签"非常敏感，能显著提升点击率。'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '搜索结果醒目标签',
                        icon: 'fa-eye',
                        desc: '绿色 "Coupon" 标签在搜索结果中非常抢眼，能有效提升点击率10-25%。这是免费的视觉曝光！'
                    },
                    {
                        title: '优惠券专属页面',
                        icon: 'fa-bookmark',
                        desc: '用户可在 Amazon Coupons 页面浏览所有优惠券商品，带来额外的免费流量入口。'
                    },
                    {
                        title: '灵活的目标设置',
                        icon: 'fa-bullseye',
                        desc: '可设置仅限Prime会员、特定客群(学生/家长等)可用，精准投放。'
                    }
                ]
            },
            {
                type: 'section_header',
                text: '🎯 优惠券实战设置技巧'
            },
            {
                type: 'key_value_list',
                items: [
                    { key: '折扣力度', value: '5%-15%是日常最佳区间，大促期间可提到20%' },
                    { key: '预算上限', value: '务必设置！按"月预算"计算，避免被薅羊毛' },
                    { key: '时间段', value: '建议设置14-30天，可随时手动关闭' },
                    { key: '叠加策略', value: '优惠券可与Prime专享折扣叠加使用！' }
                ]
            },
            {
                type: 'callout',
                style: 'warning',
                title: '⚠️ 避坑提醒',
                text: '每次优惠券被使用，亚马逊收取 €0.50 兑换费。高销量产品要算好成本！设置预算上限防止超支。'
            }
        ]
    },
    {
        id: 'prime_discount',
        title: 'Prime 专享折扣',
        icon: 'fa-user-tag',
        content: [
            {
                type: 'callout',
                style: 'success',
                title: '✅ 免费工具，强烈推荐',
                text: '这是亚马逊唯一免费的促销工具！设置后商品详情页会显示划线价和折扣幅度，对Prime会员（欧洲站核心客群）极具吸引力。'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '视觉冲击力强',
                        icon: 'fa-strikethrough',
                        desc: '划线价 + 红色折扣标签，在详情页Buy Box区域非常醒目，直接刺激购买决策。'
                    },
                    {
                        title: '精准触达高价值用户',
                        icon: 'fa-crown',
                        desc: 'Prime会员是亚马逊最活跃、付费意愿最强的用户群。欧洲Prime渗透率高达40%+。'
                    },
                    {
                        title: '无额外费用',
                        icon: 'fa-euro-sign',
                        desc: '不同于优惠券的兑换费，Prime专享折扣完全免费，只需让利折扣部分。'
                    }
                ]
            },
            {
                type: 'section_header',
                text: '🎯 设置要求与技巧'
            },
            {
                type: 'key_value_list',
                items: [
                    { key: '最低折扣', value: '10% (部分类目要求15%)' },
                    { key: '价格要求', value: '折扣后价格需低于过去30天最低价' },
                    { key: '评分要求', value: '需3星以上评分' },
                    { key: '我的做法', value: '所有成熟产品常年开启10-15%折扣' }
                ]
            },
            {
                type: 'callout',
                style: 'tip',
                title: '💡 进阶技巧',
                text: 'Prime专享折扣可与Coupon叠加！消费者同时看到划线价 + 优惠券标签，转化率暴增。这是我最常用的组合拳。'
            }
        ]
    },
    // --- 促销旺季组 ---
    {
        id: 'seasons_intro',
        title: '促销旺季',
        icon: 'fa-calendar-alt',
        content: [
            {
                type: 'callout',
                style: 'insight',
                title: '📅 欧洲站旺季节奏认知',
                text: '欧洲站全年有明确的淡旺季：1-2月淡季，3-6月平稳，7月Prime Day爆发，8-9月返校季，10月平稳，11-12月全年最大旺季。备货和促销节奏要跟上！'
            },
            {
                type: 'timeline',
                items: [
                    { month: '7月', event: 'Prime Day', level: 'peak', note: '全年第一个大峰值' },
                    { month: '8-9月', event: '返校季', level: 'high', note: '德国错峰开学，跨度长' },
                    { month: '10月', event: 'Prime秋促', level: 'medium', note: '测试年底库存节奏' },
                    { month: '11月', event: '黑五网一', level: 'peak', note: '全年最大旺季' },
                    { month: '12月', event: '圣诞季', level: 'high', note: '礼品类爆发' }
                ]
            },
            {
                type: 'callout',
                style: 'warning',
                title: '⚠️ 备货警告',
                text: '旺季FBA入库慢，要提前6-8周发货！黑五库存最晚10月初要到仓，否则可能赶不上。'
            }
        ]
    },
    {
        id: 'prime_day',
        title: 'Prime Day 实战攻略',
        icon: 'fa-box-open',
        content: [
            {
                type: 'callout',
                style: 'core',
                title: '📅 时间节点 (欧洲站)',
                text: '通常在7月中旬，持续48小时。提报Deal的截止时间一般在5月中下旬，要提前关注卖家后台通知！'
            },
            {
                type: 'section_header',
                text: '🎯 我的Prime Day备战清单'
            },
            {
                type: 'checklist',
                items: [
                    { text: '提前3个月：分析去年Prime Day数据，确定主推产品', done: true },
                    { text: '提前2个月：优化Listing、主图、A+页面', done: true },
                    { text: '提前6周：FBA发货，确保库存6-8周销量', done: true },
                    { text: '提前4周：提报LD/7天Deal，设置Coupon', done: true },
                    { text: '提前2周：提升广告预算，积累广告权重', done: true },
                    { text: '活动期间：监控库存，及时补货/调价', done: false }
                ]
            },
            {
                type: 'stats',
                items: [
                    { icon: 'fa-chart-line', text: '我的经验：Prime Day期间日均销量是平时的 3-5倍，广告ACOS反而下降15-20%' },
                    { icon: 'fa-trophy', text: '核心策略：用Prime Day的高转化"养"关键词排名，这个权重会延续1-2个月' }
                ]
            },
            {
                type: 'callout',
                style: 'warning',
                title: '⚠️ 常见踩坑',
                text: '不要在Prime Day当天临时加价！亚马逊会显示"价格上涨"标签，严重影响转化。要稳价或降价参与。'
            }
        ]
    },
    {
        id: 'back_to_school',
        title: '返校季 (欧洲站特辑)',
        icon: 'fa-graduation-cap',
        content: [
            {
                type: 'callout',
                style: 'insight',
                title: '🇪🇺 欧洲返校季特点',
                text: '欧洲返校季集中在8月中-9月初，比美国短但更集中。德国因各州错峰开学，流量持续更久（8月初-9月中）。'
            },
            {
                type: 'section_header',
                text: '📊 各国开学时间参考'
            },
            {
                type: 'comparison_table',
                headers: ['国家', '开学时间', '采购高峰', '消费特点'],
                rows: [
                    ['🇬🇧 英国', '9月初', '8月中下旬', '文具、电子产品热销'],
                    ['🇩🇪 德国', '8月初-9月中 (各州不同)', '7月底-9月', '书包、运动用品'],
                    ['🇫🇷 法国', '9月初', '8月底', '文具套装受欢迎'],
                    ['🇮🇹 意大利', '9月中', '9月初', '服装类需求大'],
                    ['🇪🇸 西班牙', '9月初', '8月底', '价格敏感度高']
                ]
            },
            {
                type: 'section_header',
                text: '🎯 我的返校季策略'
            },
            {
                type: 'tip_list',
                items: [
                    { icon: 'fa-check-circle', style: 'success', text: '创建文具套装Bundle，客单价+利润率都更高' },
                    { icon: 'fa-check-circle', style: 'success', text: '在Listing标题中加入"Back to School"关键词' },
                    { icon: 'fa-check-circle', style: 'success', text: '大学新生宿舍用品是蓝海：收纳盒、床品、小家电' },
                    { icon: 'fa-times-circle', style: 'danger', text: '不要和大品牌硬刚书包/文具主词，广告成本太高' }
                ]
            }
        ]
    },
    {
        id: 'bfcm',
        title: '黑五网一 (BFCM) 决战攻略',
        icon: 'fa-shopping-cart',
        content: [
            {
                type: 'callout',
                style: 'core',
                title: '🏆 全年最重要的战役',
                text: '黑五网一是欧洲站全年最大旺季，11月最后一个周五（黑五）+ 随后的周一（网一）。但实际上整个11月后两周都是高流量期，要抓住全程！'
            },
            {
                type: 'section_header',
                text: '📅 BFCM时间线'
            },
            {
                type: 'timeline',
                items: [
                    { month: '10月初', event: '库存到仓截止', level: 'warning', note: '否则可能赶不上' },
                    { month: '10月底', event: 'Deal提报截止', level: 'warning', note: '越早报越便宜' },
                    { month: '11月中', event: '预热期开始', level: 'medium', note: '开始小促+广告' },
                    { month: '11月底', event: '黑色星期五', level: 'peak', note: '流量峰值' },
                    { month: '12月初', event: '网络星期一', level: 'peak', note: '第二波高峰' },
                    { month: '12月中', event: '圣诞采购', level: 'high', note: '礼品类继续爆发' }
                ]
            },
            {
                type: 'section_header',
                text: '🎯 BFCM作战计划'
            },
            {
                type: 'checklist',
                items: [
                    { text: '9月：对比去年数据，确定主推SKU', done: true },
                    { text: '9月底：计算毛利，确定最大可承受折扣', done: true },
                    { text: '10月初：FBA发货，备2-3个月库存', done: true },
                    { text: '10月中：提报Deal、设置高额Coupon', done: true },
                    { text: '11月初：广告预算提升50-100%', done: true },
                    { text: '黑五当周：每天2次监控库存+排名', done: false },
                    { text: '12月初：分析数据，调整圣诞策略', done: false }
                ]
            },
            {
                type: 'stats',
                items: [
                    { icon: 'fa-fire', text: '我的经验：BFCM期间单日销量可达平时的 8-15倍，是全年利润的主要来源' },
                    { icon: 'fa-lightbulb', text: '核心技巧：BFCM前维持适当高价，才能在BFCM时做出"大幅折扣"的视觉效果' }
                ]
            },
            {
                type: 'callout',
                style: 'warning',
                title: '⚠️ 血泪教训',
                text: '不要把全部库存押注BFCM！如果Deal不成功或遇到差评攻击，可能导致库存积压。建议用60%库存参与BFCM，保留40%应对风险。'
            }
        ]
    }
];

// ==================== 2. 导航结构 (树状，用于渲染侧边栏) ====================
const navStructure = [
    {
        id: 'overview',
        label: '实战概览',
        type: 'root'
    },
    {
        id: 'tools_group',
        label: '促销工具',
        type: 'group',
        targetId: 'tools_intro',
        children: [
            { id: 'deals', label: 'Deals促销' },
            { id: 'coupons', label: '优惠券 (Coupons)' },
            { id: 'prime_discount', label: 'Prime专享折扣' }
        ]
    },
    {
        id: 'seasons_group',
        label: '促销旺季',
        type: 'group',
        targetId: 'seasons_intro',
        children: [
            { id: 'prime_day', label: 'Prime Day' },
            { id: 'back_to_school', label: '返校季' },
            { id: 'bfcm', label: '黑五网一 (BFCM)' }
        ]
    }
];

// ==================== Logic ====================

let observer = null;

function init() {
    renderNav();
    renderContent();
    setupIntersectionObserver();
}

// 1. 渲染侧边栏 (递归渲染树状结构)
function renderNav() {
    const navContainer = document.getElementById('amzp_nav');
    if (!navContainer) return;

    navContainer.innerHTML = navStructure.map(node => {
        if (node.type === 'root') {
            return `
                <div class="amzp_nav_group" id="nav_group_${node.id}">
                    <a href="javascript:void(0)" class="amzp_nav_header" 
                       id="nav_header_${node.id}"
                       onclick="window.amzp_scrollTo('${node.id}')">
                       ${node.label}
                    </a>
                </div>
            `;
        } else if (node.type === 'group') {
            const childrenHtml = node.children.map(child => `
                <a href="javascript:void(0)" class="amzp_sub_link" 
                   id="nav_link_${child.id}"
                   onclick="window.amzp_scrollTo('${child.id}')">
                   ${child.label}
                </a>
            `).join('');

            return `
                <div class="amzp_nav_group" id="nav_group_${node.id}">
                    <a href="javascript:void(0)" class="amzp_nav_header" 
                       id="nav_header_${node.targetId}"
                       onclick="window.amzp_scrollTo('${node.targetId}')">
                       ${node.label}
                    </a>
                    <div class="amzp_nav_children">
                        <div class="amzp_nav_children_track">
                            ${childrenHtml}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// 2. 渲染内容区 (扁平渲染)
function renderContent() {
    const contentContainer = document.getElementById('amzp_main');
    if (!contentContainer) return;

    contentContainer.innerHTML = promoData.map(section => `
        <div id="${section.id}" class="amzp_card">
            <div class="amzp_card_header">
                <i class="fas ${section.icon} amzp_card_icon" style="font-size:1.5rem; color: #566ce8;"></i>
                <h2 class="amzp_card_title">${section.title}</h2>
            </div>
            ${renderSectionBody(section.content)}
        </div>
    `).join('');
}

function renderSectionBody(contentArray) {
    if (!contentArray) return '';

    return contentArray.map(block => {
        // 1. 文本
        if (block.type === 'text') return `<div class="amzp_text">${block.text}</div>`;

        // 2. 黄色高亮块 (保留兼容)
        if (block.type === 'note') return `<div class="amzp_highlight_box">${block.text}</div>`;

        // 3. 分块小标题
        if (block.type === 'section_header') {
            return `
                <div class="amzp_section_header">
                    <i class="fas fa-caret-right"></i> ${block.text}
                </div>
            `;
        }

        // 4. 多彩呼出框 (新增)
        if (block.type === 'callout') {
            const styleMap = {
                'insight': { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' },
                'core': { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff', border: 'none' },
                'warning': { bg: '#fff3cd', color: '#856404', border: '1px solid #ffc107' },
                'success': { bg: '#d4edda', color: '#155724', border: '1px solid #28a745' },
                'tip': { bg: '#e7f3ff', color: '#0066cc', border: '1px solid #b3d7ff' },
                'formula': { bg: 'linear-gradient(135deg, #434343 0%, #000000 100%)', color: '#fff', border: 'none' }
            };
            const style = styleMap[block.style] || styleMap['insight'];
            return `
                <div class="amzp_callout" style="background: ${style.bg}; color: ${style.color}; border: ${style.border}; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 8px;">${block.title}</div>
                    <div style="font-size: 0.95rem; line-height: 1.7;">${block.text}</div>
                </div>
            `;
        }

        // 5. 快捷入口 Grid
        if (block.type === 'grid_links') {
            return `
                <div class="amzp_grid" style="margin-top: 10px;">
                    ${block.items.map(item => `
                        <div class="amzp_sub_item" style="cursor: pointer; padding: 20px;" onclick="window.amzp_scrollTo_Name('${item.title}')">
                            <div class="amzp_sub_header" style="margin-bottom: 8px;">
                                <div class="amzp_sub_icon"><i class="fas ${item.icon}"></i></div>
                                <div class="amzp_sub_title" style="font-size: 1rem;">${item.title}</div>
                            </div>
                            <div class="amzp_sub_desc" style="font-size: 0.85rem; margin-bottom: 0;">${item.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 6. 详细子项目
        if (block.type === 'sub_items') {
            return `
                <div class="amzp_grid">
                    ${block.items.map(item => `
                        <div class="amzp_sub_item">
                            <div class="amzp_sub_header">
                                <div class="amzp_sub_icon"><i class="fas ${item.icon}"></i></div>
                                <div class="amzp_sub_title">${item.title}</div>
                            </div>
                            <div class="amzp_sub_desc">${item.desc}</div>
                            ${item.tags ? `
                                <div style="margin-top:auto">
                                    ${item.tags.map(t => `<span class="amzp_tag">${t}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 7. 统计数据
        if (block.type === 'stats') {
            return `
                <div class="amzp_grid">
                    ${block.items.map(item => `
                        <div class="amzp_stats_box">
                            <i class="fas ${item.icon}" style="font-size:1.8rem; color: #566ce8;"></i>
                            <div class="amzp_stats_text">${item.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 8. 对比表格 (新增)
        if (block.type === 'comparison_table') {
            return `
                <div class="amzp_table_wrapper" style="overflow-x: auto; margin: 20px 0;">
                    <table class="amzp_table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;">
                                ${block.headers.map(h => `<th style="padding: 12px 15px; text-align: left; font-weight: 600;">${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${block.rows.map((row, i) => `
                                <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : '#fff'}; border-bottom: 1px solid #eee;">
                                    ${row.map((cell, j) => `<td style="padding: 12px 15px; ${j === 0 ? 'font-weight: 600; color: #333;' : ''}">${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // 9. 提示列表 (新增)
        if (block.type === 'tip_list') {
            return `
                <div class="amzp_tip_list" style="margin: 15px 0;">
                    ${block.items.map(item => {
                const color = item.style === 'success' ? '#28a745' : (item.style === 'danger' ? '#dc3545' : '#666');
                const bg = item.style === 'success' ? '#d4edda' : (item.style === 'danger' ? '#f8d7da' : '#f8f9fa');
                return `
                            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 15px; margin-bottom: 8px; background: ${bg}; border-radius: 8px;">
                                <i class="fas ${item.icon}" style="color: ${color}; margin-top: 2px;"></i>
                                <span style="color: #333; font-size: 0.95rem;">${item.text}</span>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        // 10. 键值列表 (新增)
        if (block.type === 'key_value_list') {
            return `
                <div class="amzp_kv_list" style="margin: 15px 0; background: #f8f9fa; border-radius: 10px; padding: 5px 0;">
                    ${block.items.map(item => `
                        <div style="display: flex; padding: 12px 20px; border-bottom: 1px solid #eee;">
                            <span style="font-weight: 600; color: #566ce8; min-width: 120px;">${item.key}</span>
                            <span style="color: #333;">${item.value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 11. 时间线 (新增)
        if (block.type === 'timeline') {
            return `
                <div class="amzp_timeline" style="margin: 20px 0; position: relative; padding-left: 30px;">
                    <div style="position: absolute; left: 8px; top: 0; bottom: 0; width: 3px; background: linear-gradient(to bottom, #667eea, #764ba2); border-radius: 2px;"></div>
                    ${block.items.map(item => {
                const levelColors = {
                    'peak': '#dc3545',
                    'high': '#fd7e14',
                    'medium': '#28a745',
                    'warning': '#ffc107'
                };
                const color = levelColors[item.level] || '#666';
                return `
                            <div style="position: relative; margin-bottom: 20px; padding-left: 20px;">
                                <div style="position: absolute; left: -22px; top: 5px; width: 14px; height: 14px; background: ${color}; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15);"></div>
                                <div style="font-weight: 700; color: ${color}; font-size: 0.9rem;">${item.month}</div>
                                <div style="font-weight: 600; color: #333; font-size: 1rem; margin-top: 2px;">${item.event}</div>
                                <div style="color: #666; font-size: 0.85rem; margin-top: 2px;">${item.note}</div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        // 12. 检查清单 (新增)
        if (block.type === 'checklist') {
            return `
                <div class="amzp_checklist" style="margin: 15px 0;">
                    ${block.items.map(item => `
                        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 15px; margin-bottom: 6px; background: ${item.done ? '#d4edda' : '#fff'}; border: 1px solid ${item.done ? '#28a745' : '#ddd'}; border-radius: 8px;">
                            <i class="fas ${item.done ? 'fa-check-square' : 'fa-square'}" style="color: ${item.done ? '#28a745' : '#ccc'}; font-size: 1.1rem; margin-top: 1px;"></i>
                            <span style="color: ${item.done ? '#155724' : '#333'}; font-size: 0.95rem; ${item.done ? '' : ''}">${item.text}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return '';
    }).join('');
}

// 3. 滚动与高亮逻辑
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        const container = document.querySelector('.amzp_container');
        const offset = 20;
        const top = el.getBoundingClientRect().top + container.scrollTop - offset;
        container.scrollTo({ top: top, behavior: 'smooth' });
    }
}

function scrollToSectionByName(name) {
    const target = promoData.find(p => name.includes(p.title.split(' ')[0]) || p.title.includes(name));
    if (target) scrollToSection(target.id);
}

// 核心：更新导航状态
function updateNavState(activeId) {
    if (!activeId) return;

    document.querySelectorAll('.amzp_nav_header').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.amzp_sub_link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.amzp_nav_group').forEach(el => el.classList.remove('expanded'));

    for (const group of navStructure) {
        if (group.id === activeId) {
            document.getElementById(`nav_header_${group.id}`)?.classList.add('active');
            return;
        }

        if (group.targetId === activeId) {
            document.getElementById(`nav_header_${activeId}`)?.classList.add('active');
            document.getElementById(`nav_group_${group.id}`)?.classList.add('expanded');
            return;
        }

        if (group.children) {
            const childMatch = group.children.find(c => c.id === activeId);
            if (childMatch) {
                document.getElementById(`nav_link_${activeId}`)?.classList.add('active');
                document.getElementById(`nav_header_${group.targetId}`)?.classList.add('active');
                document.getElementById(`nav_group_${group.id}`)?.classList.add('expanded');
                return;
            }
        }
    }
}

function setupIntersectionObserver() {
    const container = document.querySelector('.amzp_container');

    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateNavState(entry.target.id);
            }
        });
    }, {
        root: container,
        threshold: 0.2,
        rootMargin: "-10% 0px -60% 0px"
    });

    promoData.forEach(section => {
        const el = document.getElementById(section.id);
        if (el) observer.observe(el);
    });
}

// ==================== Export ====================

export async function mount(container) {
    const response = await fetch('src/modules/amz_hub/views/promotions/template.html');
    const html = await response.text();
    container.innerHTML = html;

    window.amzp_scrollTo = scrollToSection;
    window.amzp_scrollTo_Name = scrollToSectionByName;

    init();
    console.log("✅ Promotions Module Loaded (实战版)");
}

export function unmount() {
    if (observer) observer.disconnect();
    delete window.amzp_scrollTo;
    delete window.amzp_scrollTo_Name;
    console.log("❌ Promotions Module Unmounted");
}