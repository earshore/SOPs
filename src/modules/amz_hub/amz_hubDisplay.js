import { amz_countryData } from "./amz_constants.js";

// ================= 全局变量 =================
let amz_chartsInitialized = false;
let amz_radarChartInstance = null;
let amz_a10ChartInstance = null;
let amz_keywordRadarInstance = null;
// 默认当前内部 Tab
let amz_currentTab = 'amz_eu_insights'; 
let isViewLoaded = false; // 标记是否已经加载过 HTML

// ================= 核心功能函数 (暴露给 window) =================
/**
 * 核心：动态加载 HTML 视图
 * @returns {Promise<void>}
 */
export async function loadAmzHubView() {
    // 1. 如果已经加载过，直接返回，避免重复请求
    if (isViewLoaded) return;

    const container = document.getElementById('panel-amz_hub');
    if (!container) return;

    try {
        // 2. 请求 HTML 文件 (注意路径要根据你的实际目录结构调整)
        // 假设 html 文件在 modules/Amz_Hub/amz_hubDisplay.html
        const response = await fetch('src/modules/amz_hub/amz_hubDisplay.html'); 
        
if (!response.ok) {
            throw new Error(`路径错误或文件不存在 (Status: ${response.status})`);
        }
        
        const htmlText = await response.text();

        // 3. 注入 HTML
        container.innerHTML = htmlText;
        isViewLoaded = true;
        console.log("Amz Hub 视图加载完成");

  // 加载完成后切换 Tab
        if (typeof window.amz_switchTab === 'function') {
            window.amz_switchTab(amz_currentTab);
        }

    } catch (error) {
        console.error("加载 Amz Hub 失败:", error);
        container.innerHTML = `<div class="text-red-500 p-8 text-center">加载失败，请检查网络或路径配置。<br>${error.message}</div>`;
    }
}

/**
 * 1. 内部 Tab 切换 (控制 Hub 面板内的 div 显隐)
 * @param {string} tabId - 内部模块 ID (如 'amz_eu_insights', 'amz_seo_strategy')
 */
window.amz_switchTab = function(tabId) {
    amz_currentTab = tabId;

    if (!isViewLoaded) return;

    // 1. 隐藏 Hub 内部所有的 tab-content
    document.querySelectorAll('.amz_tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active', 'fade-in');
    });
    
    // 2. 显示目标 content
    const target = document.getElementById(tabId);
    if(target) {
        target.style.display = 'block';
        requestAnimationFrame(() => target.classList.add('fade-in'));
        
        // 特殊逻辑：刷新国家信息
        if (tabId === 'amz_eu_insights') {
            const selector = document.getElementById('amz_countrySelector');
            if(selector) window.amz_updateCountryInfo(selector.value);
        }
    }

    // 3. (可选) 这里不再需要处理按钮样式
    // 因为 ui.js 的 switchTab 已经处理了侧边栏的高亮
    // 旧的 amz_nav-btn 代码可以删掉

    // 4. 初始化图表
    setTimeout(amz_tryInitCharts, 100);
};

/**
 * 2. 更新国家信息 (用于 Market Insights Tab)
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

// 辅助：获取国旗 Emoji
function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());
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