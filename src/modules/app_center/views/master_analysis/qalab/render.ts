/**
 * QA Lab 渲染函数
 */

import { LANGUAGES, CATEGORIES } from './constants';
import { qalabState } from './state';
import { escapeHtml } from './utils';

/**
 * 渲染产品信息栏
 */
export function renderProductBar(): void {
    const container = document.getElementById('productBar');
    if (!container) return;

    const ar = qalabState.reportData?.analysisReport || qalabState.reportData;
    const title = ar?.product_title || '产品分析';
    const asins = qalabState.reportData?.metadata?.asins || [];

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
export function renderStats(): void {
    const container = document.getElementById('dashboardStats');
    if (!container) return;

    const totalQAs = qalabState.generatedQAs.length;
    const categories = [...new Set(qalabState.generatedQAs.map(qa => qa.category))];
    const avgConfidence = totalQAs > 0 
        ? (qalabState.generatedQAs.reduce((sum, qa) => sum + qa.confidence, 0) / totalQAs).toFixed(1)
        : '0';
    const languages = LANGUAGES.length;

    const ar = qalabState.reportData?.analysisReport || qalabState.reportData;
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
export function renderInsights(): void {
    const container = document.getElementById('insightsStrip');
    if (!container) return;

    const ar = qalabState.reportData?.analysisReport || qalabState.reportData;
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
export function renderLangSelector(onLangChange: (lang: string) => void): void {
    const container = document.getElementById('langSelector');
    if (!container) return;

    const html = LANGUAGES.map(lang => `
        <button class="lang-btn ${lang.code === qalabState.currentLang ? 'active' : ''}"
                data-lang="${lang.code}">
            <span class="lang-flag">${lang.flag}</span>
            <span>${lang.label}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;

    container.querySelectorAll('.lang-btn').forEach(btn => {
        qalabState.eventManager.addEventListener(btn as HTMLElement, 'click', () => {
            const lang = (btn as HTMLElement).dataset.lang;
            if (lang) onLangChange(lang);
        });
    });
}

/**
 * 渲染分类标签
 */
export function renderCategoryTabs(onCategoryChange: (cat: string) => void): void {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
        counts[cat.id] = cat.id === 'all'
            ? qalabState.generatedQAs.length
            : qalabState.generatedQAs.filter(qa => qa.category === cat.id).length;
    });

    const html = CATEGORIES.map(cat => `
        <button class="cat-tab ${cat.id === qalabState.currentCategory ? 'active' : ''}"
                data-category="${cat.id}">
            <i class="${cat.icon}"></i>
            <span>${cat.label}</span>
            <span class="count">${counts[cat.id]}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;

    container.querySelectorAll('.cat-tab').forEach(btn => {
        qalabState.eventManager.addEventListener(btn as HTMLElement, 'click', () => {
            const category = (btn as HTMLElement).dataset.category;
            if (category) onCategoryChange(category);
        });
    });
}

/**
 * 渲染Q&A网格
 */
export function renderQAGrid(
    onToggle: (id: number) => void,
    onCopy: (id: number, btn: HTMLElement) => void,
    onEdit: (id: number) => void
): void {
    const container = document.getElementById('qaGrid');
    if (!container) return;

    const filtered = qalabState.currentCategory === 'all'
        ? qalabState.generatedQAs
        : qalabState.generatedQAs.filter(qa => qa.category === qalabState.currentCategory);

    const html = filtered.map((qa, index) => {
        const trans = qa.translations[qalabState.currentLang];
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

    container.querySelectorAll('[data-qa-toggle]').forEach(el => {
        qalabState.eventManager.addEventListener(el as HTMLElement, 'click', () => {
            const id = (el as HTMLElement).dataset.qaToggle;
            if (id) onToggle(parseInt(id));
        });
    });

    container.querySelectorAll('[data-qa-copy]').forEach(el => {
        qalabState.eventManager.addEventListener(el as HTMLElement, 'click', (e) => {
            e.stopPropagation();
            const id = (el as HTMLElement).dataset.qaCopy;
            if (id) onCopy(parseInt(id), el as HTMLElement);
        });
    });

    container.querySelectorAll('[data-qa-edit]').forEach(el => {
        qalabState.eventManager.addEventListener(el as HTMLElement, 'click', (e) => {
            e.stopPropagation();
            const id = (el as HTMLElement).dataset.qaEdit;
            if (id) onEdit(parseInt(id));
        });
    });

    qalabState.eventManager.addTimeout(() => {
        container.querySelectorAll('.qa-card').forEach(card => card.classList.add('visible'));
    }, 50);
}

/**
 * 渲染所有结果
 */
export function renderResults(
    onToggle: (id: number) => void,
    onCopy: (id: number, btn: HTMLElement) => void,
    onEdit: (id: number) => void,
    onLangChange: (lang: string) => void,
    onCategoryChange: (cat: string) => void
): void {
    renderProductBar();
    renderStats();
    renderInsights();
    renderLangSelector(onLangChange);
    renderCategoryTabs(onCategoryChange);
    renderQAGrid(onToggle, onCopy, onEdit);
}
