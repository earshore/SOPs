// src/modules/amz_hub/views/promotions/index.js

// ==================== 1. 内容数据源 (扁平化，严格保留文案) ====================
const promoData = [
    {
        id: 'overview',
        title: '促销工具/促销旺季一览',
        icon: 'fa-layer-group',
        content: [
            {
                type: 'text',
                text: '亚马逊为卖家提供平日可提报使用的促销工具，以及一年数次的促销旺季机会，帮助卖家进行新品启动，培育流量，并且迅速出单。'
            },
            // --- 拆分第一部分：促销工具 ---
            {
                type: 'section_header', // 新增类型：分块标题
                text: '促销工具'
            },
            {
                type: 'grid_links',
                items: [
                    { title: 'Deals 促销', icon: 'fa-bolt', text: '秒杀 / 7天促销 / 镇店之宝' },
                    { title: '优惠券', icon: 'fa-ticket-alt', text: 'Coupons' },
                    { title: 'Prime 专享折扣', icon: 'fa-tags', text: 'Prime Exclusive Discount' }
                ]
            },
            // --- 拆分第二部分：促销旺季 ---
            {
                type: 'section_header', // 新增类型：分块标题
                text: '促销旺季'
            },
            {
                type: 'grid_links',
                items: [
                    { title: '亚马逊 Prime 会员日', icon: 'fa-box-open', text: 'Prime Day' },
                    { title: '黑五网一', icon: 'fa-shopping-cart', text: 'BFCM' }
                ]
            }
        ]
    },
    // --- 促销工具组 ---
    {
        id: 'tools_intro', // 专门用于"促销工具"大标题的介绍文案
        title: '促销工具',
        icon: 'fa-tools',
        content: [
            {
                type: 'text',
                text: '有效利用促销工具是卖家在亚马逊上引流和转化的重要手段。充分利用每个工具的特点，结合亚马逊上的旺季节日大促，为自己的品牌和商品制定有节奏的营销活动，是每位卖家的必修课。'
            },
            // {
            //     type: 'note',
            //     text: '<strong>效果 / 提报难度：</strong> 从小到大依次为：秒杀 < 7天促销 < 镇店之宝'
            // }
        ]
    },
    {
        id: 'deals',
        title: 'Deals 促销',
        icon: 'fa-bolt',
        content: [
            {
                type: 'text',
                text: '亚马逊网站上有各种提高商品能见度的促销活动。参加的商品可以显示在Today’s Deal页面，获得额外的流量。常见的Deal促销有秒杀（Lightning Deal）、7天促销（7-day Deal）、和镇店之宝（Deal of the Day），通过活动不仅能帮助卖家在短期内冲击销量，也能获得流量和知名度，优化店铺运营。'
            },
            {
                type: 'note',
                text: '<strong>效果 / 提报难度：</strong> 从小到大依次为：秒杀 < 7天促销 < 镇店之宝'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '秒杀 (Lightning Deal)',
                        icon: 'fa-stopwatch',
                        desc: '限时、短时间高流量的活动，参与商品设置短时促销价，时间结束即恢复原价，可以设置促销总量，销完为止。',
                        tags: ['大流量', '瞬间爆单', '无需大量库存']
                    },
                    {
                        title: '7天促销 (7-day Deal)',
                        icon: 'fa-calendar-week',
                        desc: '与秒杀类似的限时促销优惠活动，参与的商品将会在促销页面显示7天。',
                        tags: ['性价比高', '展示时间较长', '持续曝光']
                    },
                    {
                        title: '镇店之宝 (DOTD)',
                        icon: 'fa-gem',
                        desc: '一个或一组高需求商品，只在指定日有大幅度折扣的促销活动。',
                        tags: ['黄金展示位', '大幅提升曝光', '带动全店']
                    }
                ]
            }
        ]
    },
    {
        id: 'coupons',
        title: '优惠券 (Coupons)',
        icon: 'fa-ticket-alt',
        content: [
            {
                type: 'text',
                text: '优惠券是面向所有卖家的促销手段，设置门槛相对较低，卖家可以通过优惠券为单个商品或一组商品创建折扣，还可以因此享受由亚马逊提供的自动推广服务，是卖家吸引流量，节约营销成本的优质之选。'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '精准触达目标客群',
                        icon: 'fa-bullseye',
                        desc: '能针对不同客户群（如Prime会员、母亲或学生）提供订制优惠券。'
                    },
                    {
                        title: '增加商品被发现的可能',
                        icon: 'fa-eye',
                        desc: '亚马逊会自动推广优惠券，搜索结果和优惠券主页也都设置特别促销标志，在PC端和移动端皆有专属页面露出。'
                    }
                ]
            }
        ]
    },
    {
        id: 'prime_discount',
        title: 'Prime 专享折扣',
        icon: 'fa-user-tag',
        content: [
            {
                type: 'text',
                text: 'Prime专享折扣（Prime Exclusive Discount）是面向Prime会员的专属折扣，持续时间较长，折扣要求较低，通常会被作为日常折扣广泛使用。该工具向Prime会员展示带删除线的定价和节省信息，折扣后价格也会显示在Prime会员的商品详情页/购买按钮上，是卖家快速增销量，提升转化率的一大利器。'
            },
            {
                type: 'sub_items',
                items: [
                    {
                        title: '高价值客群',
                        icon: 'fa-crown',
                        desc: '面向Prime会员，一群已在亚马逊建立了消费习惯的消费者。'
                    },
                    {
                        title: '刺激购买',
                        icon: 'fa-percent',
                        desc: '通过独享的节省信息，刺激购买行动。'
                    }
                ]
            }
        ]
    },
    // --- 促销旺季组 ---
    {
        id: 'seasons_intro', // 专门用于"促销旺季"大标题的介绍文案
        title: '促销旺季',
        icon: 'fa-calendar-alt',
        content: [
            {
                type: 'text',
                text: '亚马逊每个月都会针对各个国家的节日推出相应的促销活动来助力店铺爆单，商品大卖。在各国众多的节日中，亚马逊年度最重要的大促就是亚马逊Prime会员日（Prime Day）和 黑五网一（BFCM），在此期间，店铺的流量和销量都将高于平时。把握住节日与旺季，是卖家突破销量瓶颈、提升产品曝光的大好时机。'
            }
        ]
    },
    {
        id: 'prime_day',
        title: '亚马逊 Prime 会员日',
        icon: 'fa-box-open',
        content: [
            {
                type: 'text',
                text: '亚马逊Prime会员日（Prime Day）是全球Prime会员的购物狂欢节，也是亚马逊购物网站全年最为重要的常驻促销节日之一，更是卖家推动整体销售额、推广品牌的大好机会。在Prime Day期间，卖家们可以通过参加多种促销活动来提高流量，抓住更多爆单可能。2022年亚马逊还推出了Prime会员早享日活动，在全球15个国家的当地时间10月举行，为卖家开辟新的增长机会。'
            },
            {
                type: 'stats',
                items: [
                    {
                        icon: 'fa-chart-pie',
                        text: '2022年 Prime 会员日期间，全球会员购买了超过3亿件商品。平均每分钟就有10万+件商品被购买。'
                    },
                    {
                        icon: 'fa-hand-holding-usd',
                        text: '2022年全球消費者在 Prime 会员日开始前3周内，已为小企业创造超过30亿美元的销量。'
                    }
                ]
            }
        ]
    },
    {
        id: 'bfcm',
        title: '黑五网一 (BFCM)',
        icon: 'fa-shopping-cart',
        content: [
            {
                type: 'text',
                text: '每年11-12月的节假日相对集中，消费者购物的需求上升明显，其中黑色星期五（Black Friday，简称“黑五”）和网络星期一（Cyber Monday，简称“网一”）已成为全球买家的疯狂购物节。通常每年11月的最后一个星期五就是“黑五”，“黑五”结束后的第一个周一便是“网一”，在此期间，亚马逊购物网站也会举办全站点的大促活动。全品类商品的流量与销量都会在此期间得到大幅提升。'
            },
            {
                type: 'stats',
                items: [
                    {
                        icon: 'fa-calendar-plus',
                        text: '67%参与调研的美国消费者表示在黑五网一后他们将持续购物到年底假期。'
                    },
                    {
                        icon: 'fa-heart',
                        text: '69%参与调研的消费者表示有可能/极有可能将亚马逊视为他们的节日购物首选。'
                    }
                ]
            }
        ]
    }
];

// ==================== 2. 导航结构 (树状，用于渲染侧边栏) ====================
const navStructure = [
    {
        id: 'overview',
        label: '促销工具/促销旺季一览',
        type: 'root'
    },
    {
        id: 'tools_group',
        label: '促销工具',
        type: 'group',
        targetId: 'tools_intro', // 点击标题跳转到的内容ID
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
            // 简单的根节点
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
            // 包含子项的组
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

        // 2. 黄色高亮块
        if (block.type === 'note') return `<div class="amzp_highlight_box">${block.text}</div>`;

        // 3. (新增) 分块小标题：促销工具 / 促销旺季
        if (block.type === 'section_header') {
            return `
                <div style="font-size: 1.15rem; font-weight: 700; color: #333; margin-top: 30px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-caret-right" style="color: #566ce8;"></i> ${block.text}
                </div>
            `;
        }

        // 4. 快捷入口 Grid
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

        // 5. 详细子项目
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

        // 6. 统计数据
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
    }).join('');
}

// 3. 滚动与高亮逻辑
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        const container = document.querySelector('.amzp_container');
        // 修正偏移量，避免被 Header 遮挡
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

    // 1. 清除所有高亮
    document.querySelectorAll('.amzp_nav_header').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.amzp_sub_link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.amzp_nav_group').forEach(el => el.classList.remove('expanded'));

    // 2. 判断 activeId 属于哪个组
    let activeGroup = null;

    // 遍历结构寻找匹配
    for (const group of navStructure) {
        // Case A: 匹配到 Root 节点 (如 Overview)
        if (group.id === activeId) {
            document.getElementById(`nav_header_${group.id}`)?.classList.add('active');
            return; // Root 节点不需要展开
        }

        // Case B: 匹配到 Group 标题本身 (如 Tools Intro)
        if (group.targetId === activeId) {
            document.getElementById(`nav_header_${activeId}`)?.classList.add('active');
            document.getElementById(`nav_group_${group.id}`)?.classList.add('expanded');
            return;
        }

        // Case C: 匹配到子项 (如 Deals)
        if (group.children) {
            const childMatch = group.children.find(c => c.id === activeId);
            if (childMatch) {
                // 高亮子项
                document.getElementById(`nav_link_${activeId}`)?.classList.add('active');
                // 高亮并展开父级
                document.getElementById(`nav_header_${group.targetId}`)?.classList.add('active'); // 可选：父级标题是否也要高亮？通常子项高亮时父级只需展开
                document.getElementById(`nav_group_${group.id}`)?.classList.add('expanded');
                return;
            }
        }
    }
}

function setupIntersectionObserver() {
    const container = document.querySelector('.amzp_container');

    observer = new IntersectionObserver((entries) => {
        // 找出当前视口中可见比例最大的元素
        // 或者简单的：使用第一个进入视口的
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateNavState(entry.target.id);
            }
        });
    }, {
        root: container,
        threshold: 0.2, // 20% 可见
        rootMargin: "-10% 0px -60% 0px" // 偏向上半部分触发
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
    console.log("✅ Promotions Module Loaded");
}

export function unmount() {
    if (observer) observer.disconnect();
    delete window.amzp_scrollTo;
    delete window.amzp_scrollTo_Name;
    console.log("❌ Promotions Module Unmounted");
}