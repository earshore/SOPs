console.log("📚 AmzHub Module Loading...");

import { amz_countryData } from "./amz_constants.js";

// ================= 全局变量 =================
let amz_chartsInitialized = false;
let amz_radarChartInstance = null;
let amz_a10ChartInstance = null;
let amz_keywordRadarInstance = null;
// 默认当前内部 Tab
// let amz_currentTab = 'amz_eu_insights'; 
let isViewLoaded = false; // 标记是否已经加载过 HTML

// ================= 核心功能函数 (暴露给 window) =================
/**
 * 核心：确保视图已加载
 * 修复版：检测 DOM 是否已存在，防止 ViewLoader 和 Fetch 冲突导致的双重嵌套
 */
export async function loadAmzHubView() {
    // 1. 智能检测：检查关键子元素是否已经在页面上了
    // 'amz_eu_insights' 是 html 里的第一个 tab 内容的 ID
    const existingContent = document.getElementById('amz_eu_insights');
    
    if (existingContent) {
        console.log("✅ [AmzHub] 检测到 DOM 已由 ViewLoader 预加载，跳过重复 Fetch");
        isViewLoaded = true;
        return; // 直接返回，什么都不用做
    }

    // 2. 如果页面上真的没有（比如没用 ViewLoader），才执行下面的加载逻辑
    if (isViewLoaded) return;

    const container = document.getElementById('panel-amz_hub');
    if (!container) {
        // 如果连容器都没有，说明 ViewLoader 配置可能漏了，或者是纯懒加载模式
        console.error("❌ 找不到 #panel-amz_hub 容器");
        return;
    }

    try {
        console.log("📥 [AmzHub] 正在加载 HTML 视图...");
        const response = await fetch('src/modules/amz_hub/amz_hubDisplay.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const htmlText = await response.text();
        
        // ⚠️ 注意：如果你的 HTML 文件里包含了 <div id="panel-amz_hub"> 外壳
        // 这里直接 innerHTML 会导致嵌套。
        // 但由于我们上面的 Step 1 已经拦截了大部分情况，这里作为兜底逻辑，
        // 我们可以暂时保持原样，或者建议你 HTML 文件里去掉最外层 id="panel-amz_hub" 的 div
        container.innerHTML = htmlText;
        
        isViewLoaded = true;
        console.log("✅ [Amz Hub] 视图注入完成");

    } catch (error) {
        console.error("加载 Amz Hub 失败:", error);
        container.innerHTML = `<div class="text-red-500 p-8 text-center">加载失败: ${error.message}</div>`;
    }
}

/**
 * 2. 内部 Tab 切换逻辑
 * @param {string} tabId - 如 'amz_eu_insights'
 */
window.amz_switchTab = function(tabId) {
    // 防御：如果试图切换但视图还没加载，强制先加载
    if (!isViewLoaded) return;

    // 1. 隐藏所有 Tab 内容
    document.querySelectorAll('.amz_tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('fade-in');
    });
    
    // 2. 显示目标 Content
    const target = document.getElementById(tabId);
    if(target) {
        target.style.display = 'block';
        // 强制重绘以触发 fade-in 动画
        requestAnimationFrame(() => target.classList.add('fade-in'));
        
        // 特殊逻辑：如果是洞察页面，刷新一下当前选中的国家信息
        if (tabId === 'amz_eu_insights') {
            const selector = document.getElementById('amz_countrySelector');
            if(selector) window.amz_updateCountryInfo(selector.value);
        }
    } else {
        console.warn(`⚠️ 未找到 ID 为 [${tabId}] 的内容区域`);
    }

    // 3. 初始化或刷新图表
    // 延时一点点确保 DOM display:block 后再画图，否则 Chart.js 可能会计算不出尺寸
    setTimeout(amz_tryInitCharts, 50);
};

/**
 * 3. 更新国家信息 (业务逻辑)
 */
window.amz_updateCountryInfo = function(code) {
    if (!amz_countryData || !amz_countryData[code]) return;

    const data = amz_countryData[code];
    const details = document.getElementById('amz_countryDetails');
    
    if(details) {
        details.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span class="text-3xl">${getFlagEmoji(code)}</span> ${data.name}
                </h2>
                <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-full">Mature Market</span>
            </div>
            <div class="space-y-4">
                <div>
                    <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">核心画像 (Persona)</h4>
                    <p class="text-sm text-slate-700 leading-relaxed">${data.traits}</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">运营建议 (Strategy)</h4>
                    <div class="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        ${data.tips}
                    </div>
                </div>
            </div>
        `;
    }
    
    // 更新雷达图数据
    if (amz_radarChartInstance && amz_radarChartInstance.data.datasets.length > 0) {
        amz_radarChartInstance.data.datasets[0].data = data.radarData;
        amz_radarChartInstance.update();
    }
};

function getFlagEmoji(countryCode) {
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// ================= 初始化与图表逻辑 =================

// 初始化图表 (Chart.js) - 只有当容器可见时调用才有效
function amz_tryInitCharts() {
    if (amz_chartsInitialized) return;
    // 只有当 DOM 元素真的存在时才初始化
    if (!document.getElementById('amz_a10Chart')) return;
    if (typeof Chart === 'undefined') { console.warn("Chart.js not loaded"); return; }

    // 1. A10 算法权重环形图
    const ctxA10 = document.getElementById('amz_a10Chart');
    if (ctxA10) {
        amz_a10ChartInstance = new Chart(ctxA10.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['自然销量 (Organic Sales)', '转化率 (CVR)', '站外/引流 (Off-site)', 'PPC 广告', '点击率 (CTR)', '其他'],
                datasets: [{
                    data: [35, 25, 20, 10, 5, 5],
                    backgroundColor: ['#1E293B', '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#94A3B8'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } 
                },
                cutout: '70%'
            }
        });
    }

    // 2. 欧洲市场用户画像雷达图
    const ctxRadar = document.getElementById('amz_euRadarChart');
    if (ctxRadar) {
        if (amz_radarChartInstance) amz_radarChartInstance.destroy();
        amz_radarChartInstance = new Chart(ctxRadar.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['质量要求', '环保意识', '价格敏感', '外观设计', '品牌信任'],
                datasets: [{
                    label: '市场倾向指数',
                    data: [90, 85, 40, 60, 95], 
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: 'rgb(99, 102, 241)',
                    pointBackgroundColor: 'rgb(99, 102, 241)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(99, 102, 241)'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    r: { 
                        angleLines: { display: true, color: '#f1f5f9' },
                        grid: { color: '#f1f5f9' },
                        suggestedMin: 0, 
                        suggestedMax: 100,
                        ticks: { display: false } // 隐藏刻度数字，更美观
                    } 
                },
                plugins: { legend: { display: false } }
            }
        });
    }
    
    // 3. SEO 关键词来源对比雷达图
    const ctxKeyword = document.getElementById('amz_keywordRadarChart');
    if (ctxKeyword) {
        if (amz_keywordRadarInstance) amz_keywordRadarInstance.destroy();
        
        amz_keywordRadarInstance = new Chart(ctxKeyword.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['语义相关性', '流量准确性', '长尾挖掘力', '转化意图', '竞争程度'],
                datasets: [{
                    label: 'Review/Listing 扒词',
                    data: [95, 40, 90, 85, 30], 
                    fill: true,
                    backgroundColor: 'rgba(234, 88, 12, 0.2)', // Orange
                    borderColor: '#EA580C',
                    pointBackgroundColor: '#EA580C'
                }, {
                    label: 'ABA 报告数据',
                    data: [60, 95, 50, 70, 90], 
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue
                    borderColor: '#3B82F6',
                    pointBackgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true, color: '#f1f5f9' },
                        grid: { color: '#f1f5f9' },
                        suggestedMin: 0,
                        suggestedMax: 100,
                         ticks: { display: false, backdropColor: 'transparent' }
                    }
                }
            }
        });
    }

    amz_chartsInitialized = true;
    console.log("Amz Hub Charts Initialized");
}

// 移除原来的 initAmzHubModule 钩子，不再拦截全局 switchTab

// ============================================================
// 🚀 核心关键：监听路由事件
// 只要加上这个，amz_hub 就能"听到" switchTab 的指令了
// ============================================================
window.addEventListener('app:route-changed', async (e) => {
    const { routeId, config } = e.detail;

    // 过滤：只处理属于 Hub 模块的路由
    // 这里的 isHub 是我们在 menuConfig.js 里定义的属性
    if (config && config.route.isHub) {
        console.log(`📡 [AmzHub] 捕获路由: ${routeId}`);

        // 1. 确保 HTML 已经加载
        await loadAmzHubView();

        // 2. 执行内部切换
        window.amz_switchTab(routeId);
    }
});

// 暴露给 window，以防万一有旧代码调用
window.loadAmzHubView = loadAmzHubView;