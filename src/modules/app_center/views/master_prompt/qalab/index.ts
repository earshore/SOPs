/**
 * QA Lab 子模块
 * 负责 Rufus Q&A 智能预研系统功能
 * 
 * 架构说明：
 * - 状态保存到 state.masterPrompt.qalab 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import state from "../../../../../common/state";
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import eventBus from '../../../../../common/EventBus';

import './qalab.css';
import '../master_prompt_style.css';

// ========================================== 
// Types & Constants
// ========================================== 

interface EventListenerRecord {
    element: HTMLElement | Document | Window;
    event: string;
    handler: EventListenerOrEventListenerObject;
}

interface Language {
    code: string;
    flag: string;
    name: string;
    label: string;
}

interface Category {
    id: string;
    label: string;
    icon: string;
}

interface QATranslation {
    q: string;
    a: string;
}

interface QA {
    id: number;
    category: string;
    confidence: number;
    sources: string[];
    translations: Record<string, QATranslation>;
}

const LANGUAGES: Language[] = [
  { code: 'de', flag: '🇩🇪', name: 'Deutsch', label: 'DE' },
  { code: 'en', flag: '🇬🇧', name: 'English', label: 'EN' },
  { code: 'fr', flag: '🇫🇷', name: 'Français', label: 'FR' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano', label: 'IT' },
  { code: 'es', flag: '🇪🇸', name: 'Español', label: 'ES' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands', label: 'NL' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska', label: 'SV' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski', label: 'PL' },
  { code: 'be', flag: '🇧🇪', name: 'Belgique', label: 'BE' },
  { code: 'ie', flag: '🇮🇪', name: 'Ireland', label: 'IE' }
];

const CATEGORIES: Category[] = [
  { id: 'all', label: '全部', icon: 'fa-solid fa-layer-group' },
  { id: 'performance', label: '性能表现', icon: 'fa-solid fa-gauge-high' },
  { id: 'feature', label: '产品特性', icon: 'fa-solid fa-star' },
  { id: 'scenario', label: '使用场景', icon: 'fa-solid fa-location-dot' },
  { id: 'trust', label: '信任决策', icon: 'fa-solid fa-shield-halved' },
  { id: 'safety', label: '安全品质', icon: 'fa-solid fa-heart-pulse' },
  { id: 'gift', label: '送礼相关', icon: 'fa-solid fa-gift' }
];

// ========================================== 
// Module State
// ========================================== 

let eventListeners: EventListenerRecord[] = [];
let timeouts: number[] = [];
let registeredActions: string[] = [];
let dataUpdateHandler: (() => void) | null = null;

let currentLang = 'de';
let currentCategory = 'all';
let allExpanded = false;
let reportData: any = null;
let generatedQAs: QA[] = [];

// ========================================== 
// Helper Functions
// ========================================== 

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(element: HTMLElement | Document | Window, event: string, handler: EventListenerOrEventListenerObject): void {
    element.addEventListener(event, handler);
    eventListeners.push({ element: element as any, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    timeouts.push(id);
    return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup(): void {
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];

    timeouts.forEach(id => clearTimeout(id));
    timeouts = [];
    
    if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
        console.log(`[QALab] 已清理 ${registeredActions.length} 个动作`);
        registeredActions = [];
    }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 显示Toast提示
 */
function showToastMessage(type: 'success' | 'error' | 'info' | 'warning', title: string, desc?: string): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };
    
    const icon = iconMap[type] || 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${escapeHtml(title)}</strong>${desc ? '<br><span style="font-size:11px;color:var(--text3)">' + escapeHtml(desc) + '</span>' : ''}</div>`;
    
    container.appendChild(toast);
    
    addTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all .4s';
        addTimeout(() => toast.remove(), 400);
    }, 3500);
}

/**
 * 下载文件
 */
function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========================================== 
// 继续在下一个文件中...
// ========================================== 

// ========================================== 
// Sample Data
// ========================================== 

const SAMPLE_JSON = `{
  "metadata": {
    "asins": ["B0FVM8J662", "B0DNMZ2MLG", "B0D47FG7QS"],
    "marketplace": "DE"
  },
  "analysisReport": {
    "asin": "B0FVM8J662, B0DNMZ2MLG, B0D47FG7QS",
    "product_title": "50ml Parfum Homme Cadeau - Eau de Phéromones",
    "analysis_timestamp": "2026-02-13T19:30:08.840Z",
    "market": "DE",
    "selling-points": {
      "bullet_analysis": [
        {"bullet_index":1,"original_text_summary":"Duftkomposition: frische Kopfnoten","functions":["Spezifische Duftkomposition"],"scenes":["Tägliche Anwendung"],"credibility_score":"high"}
      ]
    },
    "fatal-flaws": {
      "critical_issues": [
        {"issue":"Very poor longevity","frequency":4,"severity":"critical"}
      ]
    },
    "wow-moments": {
      "moments": [
        {"moment_description":"Fragrance evolving beautifully","emotion_type":"surprise"}
      ]
    }
  }
}`;

// ========================================== 
// QA Generation Logic
// ========================================== 

/**
 * 生成多语言Q&A数据
 */
function generateMultiLangQAs(_data: any): QA[] {
    const qas: QA[] = [];
    
    // Q1: Longevity
    qas.push({
        id: 1,
        category: 'performance',
        confidence: 3,
        sources: ['Fatal Flaws', 'Reviews', 'Selling Points'],
        translations: {
            de: {
                q: 'Wie lange hält der Duft auf der Haut?',
                a: 'Ehrliche Antwort basierend auf Kundenfeedback: Die Haltbarkeit ist der am häufigsten kritisierte Punkt.\n\n⏱️ Realistische Erwartung:\n• Erste 30-60 Minuten: Deutlich wahrnehmbar\n• Nach 1-2 Stunden: Merklich schwächer\n• Nach 3+ Stunden: Kaum noch wahrnehmbar\n\nDas beworbene "5-8 Stunden" entspricht nicht der Mehrheitserfahrung. Für längere Wirkung empfehlen wir:\n1. Auf feuchte Haut nach dem Duschen auftragen\n2. Auf Kleidung sprühen (Fleckentest vorher!)\n3. Nachsprühen bei Bedarf (kompakte 50ml-Flasche ideal für unterwegs)'
            },
            en: {
                q: 'How long does the fragrance last on skin?',
                a: 'Honest answer based on customer feedback: Longevity is the most criticized aspect.\n\n⏱️ Realistic expectation:\n• First 30-60 min: Clearly noticeable\n• After 1-2 hours: Noticeably weaker\n• After 3+ hours: Barely perceptible\n\nThe advertised "5-8 hours" doesn\'t match majority experience. For longer effect:\n1. Apply to moist skin after shower\n2. Spray on clothing (spot test first!)\n3. Reapply as needed (compact 50ml perfect for travel)'
            },
            fr: {
                q: 'Combien de temps le parfum tient-il sur la peau ?',
                a: 'Réponse honnête : La tenue est le point le plus critiqué.\n\n⏱️ Attente réaliste :\n• 30-60 premières min : Bien perceptible\n• Après 1-2h : Nettement plus faible\n• Après 3h+ : Presque imperceptible\n\nLes "5-8 heures" annoncées ne correspondent pas à l\'expérience majoritaire.'
            },
            it: { q: 'Quanto dura la fragranza sulla pelle?', a: 'Risposta onesta: La durata è il punto più criticato. Aspettativa realistica: 30-60 min ben percepibile, dopo 1-2h notevolmente più debole.' },
            es: { q: '¿Cuánto dura la fragancia en la piel?', a: 'Respuesta honesta: La duración es el punto más criticado. Expectativa realista: 30-60 min bien perceptible, después de 1-2h notablemente más débil.' },
            nl: { q: 'Hoe lang blijft de geur op de huid?', a: 'Eerlijk antwoord: Houdbaarheid is het meest bekritiseerde punt. Realistische verwachting: 30-60 min duidelijk waarneembaar.' },
            sv: { q: 'Hur länge håller doften på huden?', a: 'Ärligt svar: Hållbarhet är den mest kritiserade punkten. Realistisk förväntan: 30-60 min tydligt märkbar.' },
            pl: { q: 'Jak długo zapach utrzymuje się na skórze?', a: 'Szczera odpowiedź: Trwałość jest najbardziej krytykowanym punktem. Realistyczne oczekiwanie: 30-60 min wyraźnie wyczuwalne.' },
            be: { q: 'Combien de temps tient le parfum ?', a: 'La tenue est critiquée. Réaliste : 30-60 min perceptible.' },
            ie: { q: 'How long does it last?', a: 'Honest answer: Longevity is most criticized. Realistic: 30-60 min noticeable.' }
        }
    });

    // 添加更多Q&A...
    // 为了简化，这里只展示一个示例
    
    return qas;
}

// ========================================== 
// Core Action Functions
// ========================================== 

/**
 * 加载示例数据
 */
function loadSample(): void {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (input) {
        input.value = SAMPLE_JSON;
        showToastMessage('success', '示例数据已加载', '点击「智能分析」开始生成 Q&A');
    }
}

/**
 * 清空输入
 */
function clearInput(): void {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (input) {
        input.value = '';
    }
    
    const resultsSection = document.getElementById('resultsSection');
    const progressSection = document.getElementById('progressSection');
    
    if (resultsSection) resultsSection.classList.remove('active');
    if (progressSection) progressSection.classList.remove('active');
    
    showToastMessage('success', '已清空', '准备接收新的报告数据');
}

/**
 * 开始分析
 */
async function startAnalysis(): Promise<void> {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (!input || !input.value.trim()) {
        showToastMessage('error', '请先粘贴报告 JSON', '或点击「加载示例数据」');
        return;
    }

    try {
        reportData = JSON.parse(input.value);
    } catch (e) {
        showToastMessage('error', 'JSON 格式错误', '请检查数据格式是否正确');
        return;
    }

    // 检测市场语言
    const market = reportData?.metadata?.marketplace || reportData?.analysisReport?.market || 'DE';
    const langMap: Record<string, string> = {
        'DE': 'de', 'UK': 'en', 'GB': 'en', 'FR': 'fr', 'IT': 'it', 'ES': 'es',
        'NL': 'nl', 'SE': 'sv', 'PL': 'pl', 'BE': 'be', 'IE': 'ie', 'US': 'en'
    };
    currentLang = langMap[market.toUpperCase()] || 'de';

    // 显示进度
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    const inputSection = document.getElementById('inputSection');
    
    if (progressSection) progressSection.classList.add('active');
    if (resultsSection) resultsSection.classList.remove('active');
    if (inputSection) inputSection.style.opacity = '0.5';

    const steps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
    const bar = document.getElementById('progressBar');

    for (let i = 0; i < steps.length; i++) {
        await delay(400 + Math.random() * 300);
        
        if (i > 0) {
            const prevStepId = steps[i - 1];
            if (prevStepId) {
                const prevStep = document.getElementById(prevStepId);
                if (prevStep) {
                    prevStep.classList.remove('active');
                    prevStep.classList.add('done');
                    const icon = prevStep.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-circle-check';
                }
            }
        }
        
        const currentStepId = steps[i];
        if (currentStepId) {
            const currentStep = document.getElementById(currentStepId);
            if (currentStep) {
                currentStep.classList.add('active');
                const icon = currentStep.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-circle-notch fa-spin';
            }
        }
        
        if (bar) {
            bar.style.width = ((i + 1) / steps.length * 100) + '%';
        }
    }

    await delay(600);
    
    const lastStepId = steps[steps.length - 1];
    if (!lastStepId) return;
    
    const lastStep = document.getElementById(lastStepId);
    if (lastStep) {
        lastStep.classList.remove('active');
        lastStep.classList.add('done');
        const icon = lastStep.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-circle-check';
    }

    // 生成Q&A
    generatedQAs = generateMultiLangQAs(reportData);

    // 隐藏进度，显示结果
    if (progressSection) progressSection.classList.remove('active');
    if (inputSection) inputSection.style.opacity = '1';
    
    renderResults();
    
    if (resultsSection) resultsSection.classList.add('active');
    
    showToastMessage('success', '分析完成!', `已生成 ${generatedQAs.length} 个 Q&A`);
}

/**
 * 切换全部展开/折叠
 */
function toggleExpandAll(): void {
    allExpanded = !allExpanded;
    const cards = document.querySelectorAll('.qa-card');
    const btn = document.getElementById('expandAllBtn');

    cards.forEach(card => {
        if (allExpanded) {
            card.classList.add('open');
        } else {
            card.classList.remove('open');
        }
    });

    if (btn) {
        btn.innerHTML = allExpanded
            ? '<i class="fa-solid fa-compress"></i> 全部折叠'
            : '<i class="fa-solid fa-expand"></i> 全部展开';
    }
}

/**
 * 导出JSON
 */
function exportJSON(): void {
    const filtered = currentCategory === 'all'
        ? generatedQAs
        : generatedQAs.filter(qa => qa.category === currentCategory);

    const exportData = {
        metadata: {
            language: currentLang,
            category: currentCategory,
            exportDate: new Date().toISOString(),
            totalQAs: filtered.length
        },
        qas: filtered.map(qa => ({
            id: qa.id,
            category: qa.category,
            confidence: qa.confidence,
            question: qa.translations[currentLang]?.q || '',
            answer: qa.translations[currentLang]?.a || '',
            sources: qa.sources
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadFile(blob, `rufus-qa-${currentLang}-${currentCategory}-${Date.now()}.json`);
    showToastMessage('success', '导出成功', 'JSON 文件已下载');
}

/**
 * 导出CSV
 */
function exportCSV(): void {
    const filtered = currentCategory === 'all'
        ? generatedQAs
        : generatedQAs.filter(qa => qa.category === currentCategory);

    let csv = 'ID,分类,置信度,问题,答案,数据源\n';
    filtered.forEach(qa => {
        const trans = qa.translations[currentLang];
        if (trans) {
            const row = [
                qa.id,
                qa.category,
                qa.confidence,
                `"${trans.q.replace(/"/g, '""')}"`,
                `"${trans.a.replace(/"/g, '""')}"`,
                `"${qa.sources.join(', ')}"`
            ].join(',');
            csv += row + '\n';
        }
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `rufus-qa-${currentLang}-${currentCategory}-${Date.now()}.csv`);
    showToastMessage('success', '导出成功', 'CSV 文件已下载');
}

/**
 * 导出文本
 */
function exportText(): void {
    const filtered = currentCategory === 'all'
        ? generatedQAs
        : generatedQAs.filter(qa => qa.category === currentCategory);

    const langName = LANGUAGES.find(l => l.code === currentLang)?.name || currentLang;
    const catLabel = CATEGORIES.find(c => c.id === currentCategory)?.label || currentCategory;

    let text = `Rufus Q&A 预研结果\n`;
    text += `语言: ${langName}\n`;
    text += `分类: ${catLabel}\n`;
    text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    text += `总计: ${filtered.length} 个 Q&A\n`;
    text += `${'='.repeat(80)}\n\n`;

    filtered.forEach((qa, index) => {
        const trans = qa.translations[currentLang];
        if (trans) {
            const catName = CATEGORIES.find(c => c.id === qa.category)?.label || qa.category;
            text += `${index + 1}. [${catName}] 置信度 ${qa.confidence}/5\n\n`;
            text += `Q: ${trans.q}\n\n`;
            text += `A: ${trans.a}\n\n`;
            text += `数据源: ${qa.sources.join(', ')}\n`;
            text += `${'-'.repeat(80)}\n\n`;
        }
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    downloadFile(blob, `rufus-qa-${currentLang}-${currentCategory}-${Date.now()}.txt`);
    showToastMessage('success', '导出成功', '文本文件已下载');
}

// ========================================== 
// Render Functions
// ========================================== 

/**
 * 渲染所有结果
 */
function renderResults(): void {
    renderProductBar();
    renderStats();
    renderInsights();
    renderLangSelector();
    renderCategoryTabs();
    renderQAGrid();
}

/**
 * 渲染产品信息栏
 */
function renderProductBar(): void {
    const container = document.getElementById('productBar');
    if (!container) return;

    const ar = reportData?.analysisReport || reportData;
    const title = ar?.product_title || '产品分析';
    const asins = reportData?.metadata?.asins || [];

    const html = `
        <div class="product-bar-label">分析产品</div>
        <div class="product-bar-title">${escapeHtml(title.substring(0, 150))}${title.length > 150 ? '...' : ''}</div>
        <div class="product-asins">
            ${asins.map((asin: string) => `<div class="asin-chip">${escapeHtml(asin)}</div>`).join('')}
        </div>
    `;
    container.innerHTML = html;
}

/**
 * 渲染统计卡片
 */
function renderStats(): void {
    const container = document.getElementById('dashboardStats');
    if (!container) return;

    const totalQAs = generatedQAs.length;
    const categories = [...new Set(generatedQAs.map(qa => qa.category))];
    const avgConfidence = totalQAs > 0 
        ? (generatedQAs.reduce((sum, qa) => sum + qa.confidence, 0) / totalQAs).toFixed(1)
        : '0';
    const languages = LANGUAGES.length;

    const ar = reportData?.analysisReport || reportData;
    const criticalIssues = ar?.['fatal-flaws']?.critical_issues?.length || 0;

    const html = `
        <div class="stat-card purple animate-fade-up" style="animation-delay:0s">
            <div class="stat-icon"><i class="fa-solid fa-comments"></i></div>
            <div class="stat-value">${totalQAs}</div>
            <div class="stat-label">Top Q&A</div>
        </div>
        <div class="stat-card green animate-fade-up" style="animation-delay:0.1s">
            <div class="stat-icon"><i class="fa-solid fa-language"></i></div>
            <div class="stat-value">${languages}</div>
            <div class="stat-label">语言版本</div>
        </div>
        <div class="stat-card orange animate-fade-up" style="animation-delay:0.2s">
            <div class="stat-icon"><i class="fa-solid fa-star"></i></div>
            <div class="stat-value">${avgConfidence}</div>
            <div class="stat-label">平均置信度</div>
        </div>
        <div class="stat-card blue animate-fade-up" style="animation-delay:0.3s">
            <div class="stat-icon"><i class="fa-solid fa-layer-group"></i></div>
            <div class="stat-value">${categories.length}</div>
            <div class="stat-label">问题分类</div>
        </div>
        <div class="stat-card red animate-fade-up" style="animation-delay:0.4s">
            <div class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="stat-value">${criticalIssues}</div>
            <div class="stat-label">关键问题</div>
        </div>
    `;
    container.innerHTML = html;
}

/**
 * 渲染洞察卡片
 */
function renderInsights(): void {
    const container = document.getElementById('insightsStrip');
    if (!container) return;

    const ar = reportData?.analysisReport || reportData;
    const ff = ar?.['fatal-flaws'] || {};
    const wm = ar?.['wow-moments'] || {};

    const insights: Array<{icon: string; iconClass: string; title: string; desc: string}> = [];

    if (ff.critical_issues && ff.critical_issues.length > 0) {
        const topIssue = ff.critical_issues[0];
        insights.push({
            icon: 'hot',
            iconClass: 'fa-solid fa-fire',
            title: '高频致命缺陷',
            desc: topIssue.issue.substring(0, 80) + (topIssue.issue.length > 80 ? '...' : '')
        });
    }

    if (wm.moments && wm.moments.length > 0) {
        insights.push({
            icon: 'good',
            iconClass: 'fa-solid fa-sparkles',
            title: '惊喜时刻',
            desc: wm.moments[0].moment_description.substring(0, 80)
        });
    }

    if (ff.overall_risk_level) {
        insights.push({
            icon: 'warn',
            iconClass: 'fa-solid fa-shield-halved',
            title: '风险评估',
            desc: `整体风险等级: ${ff.overall_risk_level.toUpperCase()}`
        });
    }

    const html = insights.map((ins, i) => `
        <div class="insight-card animate-fade-up" style="animation-delay:${i * 0.1}s">
            <div class="insight-icon ${ins.icon}"><i class="${ins.iconClass}"></i></div>
            <div>
                <div class="insight-title">${escapeHtml(ins.title)}</div>
                <div class="insight-desc">${escapeHtml(ins.desc)}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * 渲染语言选择器
 */
function renderLangSelector(): void {
    const container = document.getElementById('langSelector');
    if (!container) return;

    const html = LANGUAGES.map(lang => `
        <button class="lang-btn ${lang.code === currentLang ? 'active' : ''}"
                data-lang="${lang.code}">
            <span class="lang-flag">${lang.flag}</span>
            <span>${lang.label}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;

    // 绑定点击事件
    container.querySelectorAll('.lang-btn').forEach(btn => {
        addEventListener(btn as HTMLElement, 'click', () => {
            const lang = (btn as HTMLElement).dataset.lang;
            if (lang) switchLang(lang);
        });
    });
}

/**
 * 渲染分类标签
 */
function renderCategoryTabs(): void {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
        counts[cat.id] = cat.id === 'all'
            ? generatedQAs.length
            : generatedQAs.filter(qa => qa.category === cat.id).length;
    });

    const html = CATEGORIES.map(cat => `
        <button class="cat-tab ${cat.id === currentCategory ? 'active' : ''}"
                data-category="${cat.id}">
            <i class="${cat.icon}"></i>
            <span>${cat.label}</span>
            <span class="count">${counts[cat.id]}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;

    // 绑定点击事件
    container.querySelectorAll('.cat-tab').forEach(btn => {
        addEventListener(btn as HTMLElement, 'click', () => {
            const category = (btn as HTMLElement).dataset.category;
            if (category) switchCategory(category);
        });
    });
}

/**
 * 渲染Q&A网格
 */
function renderQAGrid(): void {
    const container = document.getElementById('qaGrid');
    if (!container) return;

    const filtered = currentCategory === 'all'
        ? generatedQAs
        : generatedQAs.filter(qa => qa.category === currentCategory);

    const html = filtered.map((qa, index) => {
        const trans = qa.translations[currentLang];
        if (!trans) return '';

        const confDots = Array(5).fill(0).map((_, i) =>
            `<div class="conf-dot ${i < qa.confidence ? 'filled' : ''}"></div>`
        ).join('');

        const catLabel = CATEGORIES.find(c => c.id === qa.category)?.label || qa.category;

        return `
            <div class="qa-card" data-qa-id="${qa.id}" style="animation-delay:${index * 0.05}s">
                <div class="qa-header" data-qa-toggle="${qa.id}">
                    <div class="qa-number">${qa.id}</div>
                    <div class="qa-question-wrap">
                        <div class="qa-meta">
                            <div class="qa-tag ${qa.category}">${escapeHtml(catLabel)}</div>
                            <div class="qa-confidence">
                                <span>置信度</span>
                                <div class="conf-dots">${confDots}</div>
                            </div>
                        </div>
                        <div class="qa-question">${escapeHtml(trans.q)}</div>
                    </div>
                    <div class="qa-toggle"><i class="fa-solid fa-chevron-down"></i></div>
                </div>
                <div class="qa-body">
                    <div class="qa-answer-wrap">
                        <div class="qa-answer-inner">
                            <div class="qa-answer-label">
                                <i class="fa-solid fa-robot"></i> Rufus AI 答复
                            </div>
                            <div class="qa-answer">${escapeHtml(trans.a)}</div>
                            <div class="qa-sources">
                                ${qa.sources.map(src => `<div class="qa-source"><i class="fa-solid fa-database"></i>${escapeHtml(src)}</div>`).join('')}
                            </div>
                            <div class="qa-actions">
                                <button class="qa-action-btn" data-qa-copy="${qa.id}">
                                    <i class="fa-solid fa-copy"></i> 复制
                                </button>
                                <button class="qa-action-btn" data-qa-edit="${qa.id}">
                                    <i class="fa-solid fa-pen"></i> 编辑
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // 绑定事件
    container.querySelectorAll('[data-qa-toggle]').forEach(el => {
        addEventListener(el as HTMLElement, 'click', () => {
            const id = (el as HTMLElement).dataset.qaToggle;
            if (id) toggleQA(parseInt(id));
        });
    });

    container.querySelectorAll('[data-qa-copy]').forEach(el => {
        addEventListener(el as HTMLElement, 'click', (e) => {
            e.stopPropagation();
            const id = (el as HTMLElement).dataset.qaCopy;
            if (id) copyQA(parseInt(id), el as HTMLElement);
        });
    });

    container.querySelectorAll('[data-qa-edit]').forEach(el => {
        addEventListener(el as HTMLElement, 'click', (e) => {
            e.stopPropagation();
            const id = (el as HTMLElement).dataset.qaEdit;
            if (id) editQA(parseInt(id));
        });
    });

    // 触发动画
    addTimeout(() => {
        container.querySelectorAll('.qa-card').forEach(card => card.classList.add('visible'));
    }, 50);
}

// ========================================== 
// Interaction Functions
// ========================================== 

/**
 * 切换语言
 */
function switchLang(lang: string): void {
    currentLang = lang;
    renderLangSelector();
    renderQAGrid();
    const langName = LANGUAGES.find(l => l.code === lang)?.name || lang;
    showToastMessage('success', '语言已切换', `当前: ${langName}`);
}

/**
 * 切换分类
 */
function switchCategory(cat: string): void {
    currentCategory = cat;
    renderCategoryTabs();
    renderQAGrid();
}

/**
 * 切换Q&A展开/折叠
 */
function toggleQA(id: number): void {
    const card = document.querySelector(`.qa-card[data-qa-id="${id}"]`);
    if (card) {
        card.classList.toggle('open');
    }
}

/**
 * 复制Q&A
 */
function copyQA(id: number, btnElement: HTMLElement): void {
    const qa = generatedQAs.find(q => q.id === id);
    if (!qa) return;

    const trans = qa.translations[currentLang];
    if (!trans) return;

    const text = `Q: ${trans.q}\n\nA: ${trans.a}`;

    navigator.clipboard.writeText(text).then(() => {
        btnElement.classList.add('copied');
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
        addTimeout(() => {
            btnElement.classList.remove('copied');
            btnElement.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
        }, 2000);
        showToastMessage('success', '已复制到剪贴板', '');
    }).catch(() => {
        showToastMessage('error', '复制失败', '请手动复制');
    });
}

/**
 * 编辑Q&A
 */
function editQA(_id: number): void {
    showToastMessage('info', '编辑功能', '此功能将在后续版本中提供');
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[QALab] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/master_prompt/qalab/template.html');
        container.innerHTML = html;

        // 2. 注册全局操作
        const actionNames = registerActionsWithLegacy({
            amz_qalab_startAnalysis: () => startAnalysis(),
            amz_qalab_loadSample: () => loadSample(),
            amz_qalab_clearInput: () => clearInput(),
            amz_qalab_toggleExpandAll: () => toggleExpandAll(),
            amz_qalab_exportJSON: () => exportJSON(),
            amz_qalab_exportCSV: () => exportCSV(),
            amz_qalab_exportText: () => exportText()
        });
        
        registeredActions = actionNames;

        // 3. 设置事件监听器 - 使用事件委托处理data-action
        addEventListener(container, 'click', ((e: Event) => {
            const target = e.target as HTMLElement;
            const actionBtn = target.closest('[data-action]') as HTMLElement;
            
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                if (action) {
                    // 通过actionRegistry调用已注册的函数
                    const actionFn = (window as any)[action];
                    if (typeof actionFn === 'function') {
                        actionFn();
                    }
                }
            }
        }) as EventListener);

        // 4. 监听数据更新事件
        dataUpdateHandler = () => {
            console.log('[QALab] 检测到数据更新');
            // 如果需要响应AI分析数据更新，可以在这里添加逻辑
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            if (input && state.analysis?.analysisReport) {
                // 可以选择自动填充分析报告数据
                console.log('[QALab] 检测到新的分析报告');
            }
        };
        
        eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);

        console.log('[QALab] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[QALab] 🔄 开始卸载子模块');

    try {
        // 1. 清理 EventBus 监听器
        if (dataUpdateHandler) {
            eventBus.off(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);
            dataUpdateHandler = null;
        }

        // 2. 清理事件监听器和定时器
        cleanup();

        // 3. 重置模块状态
        currentLang = 'de';
        currentCategory = 'all';
        allExpanded = false;
        reportData = null;
        generatedQAs = [];

        console.log('[QALab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块卸载失败:', error);
    }
}
