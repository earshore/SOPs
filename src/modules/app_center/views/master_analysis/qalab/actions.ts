/**
 * QA Lab 业务逻辑
 */

import { SAMPLE_JSON } from './sampleData';
import { generateMultiLangQAs } from './qaData';
import { qalabState } from './state';
import { LANGUAGES, CATEGORIES, MARKET_LANG_MAP } from './constants';
import { showToast, delay, downloadFile } from './utils';
import { renderResults, renderLangSelector, renderQAGrid } from './render';

/**
 * 加载示例数据
 */
export function loadSample(): void {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (input) {
        input.value = SAMPLE_JSON;
        showToast('success', '示例数据已加载', '点击「智能分析」开始生成 Q&A');
    }
}

/**
 * 清空输入
 */
export function clearInput(): void {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (input) {
        input.value = '';
    }
    
    const resultsSection = document.getElementById('resultsSection');
    const progressSection = document.getElementById('progressSection');
    
    if (resultsSection) resultsSection.classList.remove('active');
    if (progressSection) progressSection.classList.remove('active');
    
    showToast('success', '已清空', '准备接收新的报告数据');
}

/**
 * 开始分析
 */
export async function startAnalysis(): Promise<void> {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (!input || !input.value.trim()) {
        showToast('error', '请先粘贴报告 JSON', '或点击「加载示例数据」');
        return;
    }

    try {
        qalabState.reportData = JSON.parse(input.value);
    } catch (e) {
        showToast('error', 'JSON 格式错误', '请检查数据格式是否正确');
        return;
    }

    const market = qalabState.reportData?.metadata?.marketplace || qalabState.reportData?.analysisReport?.market || 'DE';
    qalabState.currentLang = MARKET_LANG_MAP[market.toUpperCase()] || 'de';

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
            const prevStep = document.getElementById(steps[i - 1]!);
            if (prevStep) {
                prevStep.classList.remove('active');
                prevStep.classList.add('done');
                const icon = prevStep.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-circle-check';
            }
        }
        
        const currentStep = document.getElementById(steps[i]!);
        if (currentStep) {
            currentStep.classList.add('active');
            const icon = currentStep.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-circle-notch fa-spin';
        }
        
        if (bar) {
            bar.style.width = ((i + 1) / steps.length * 100) + '%';
        }
    }

    await delay(600);
    
    const lastStep = document.getElementById(steps[steps.length - 1]!);
    if (lastStep) {
        lastStep.classList.remove('active');
        lastStep.classList.add('done');
        const icon = lastStep.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-circle-check';
    }

    qalabState.generatedQAs = generateMultiLangQAs(qalabState.reportData);

    if (progressSection) progressSection.classList.remove('active');
    if (inputSection) inputSection.style.opacity = '1';
    
    renderResults(toggleQA, copyQA, editQA, switchLang, switchCategory);
    
    if (resultsSection) resultsSection.classList.add('active');
    
    showToast('success', '分析完成!', `已生成 ${qalabState.generatedQAs.length} 个 Q&A`);
}

/**
 * 切换全部展开/折叠
 */
export function toggleExpandAll(): void {
    qalabState.allExpanded = !qalabState.allExpanded;
    const cards = document.querySelectorAll('.qa-card');
    const btn = document.getElementById('expandAllBtn');

    cards.forEach(card => {
        if (qalabState.allExpanded) {
            card.classList.add('open');
        } else {
            card.classList.remove('open');
        }
    });

    if (btn) {
        btn.innerHTML = qalabState.allExpanded
            ? '<i class="fa-solid fa-compress"></i> 全部折叠'
            : '<i class="fa-solid fa-expand"></i> 全部展开';
    }
}

/**
 * 导出JSON
 */
export function exportJSON(): void {
    const filtered = qalabState.currentCategory === 'all'
        ? qalabState.generatedQAs
        : qalabState.generatedQAs.filter(qa => qa.category === qalabState.currentCategory);

    const exportData = {
        metadata: {
            language: qalabState.currentLang,
            category: qalabState.currentCategory,
            exportDate: new Date().toISOString(),
            totalQAs: filtered.length
        },
        qas: filtered.map(qa => ({
            id: qa.id,
            category: qa.category,
            confidence: qa.confidence,
            question: qa.translations[qalabState.currentLang]?.q || '',
            answer: qa.translations[qalabState.currentLang]?.a || '',
            sources: qa.sources
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadFile(blob, `rufus-qa-${qalabState.currentLang}-${qalabState.currentCategory}-${Date.now()}.json`);
    showToast('success', '导出成功', 'JSON 文件已下载');
}

/**
 * 导出CSV
 */
export function exportCSV(): void {
    const filtered = qalabState.currentCategory === 'all'
        ? qalabState.generatedQAs
        : qalabState.generatedQAs.filter(qa => qa.category === qalabState.currentCategory);

    let csv = 'ID,分类,置信度,问题,答案,数据源\n';
    filtered.forEach(qa => {
        const trans = qa.translations[qalabState.currentLang];
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
    downloadFile(blob, `rufus-qa-${qalabState.currentLang}-${qalabState.currentCategory}-${Date.now()}.csv`);
    showToast('success', '导出成功', 'CSV 文件已下载');
}

/**
 * 导出文本
 */
export function exportText(): void {
    const filtered = qalabState.currentCategory === 'all'
        ? qalabState.generatedQAs
        : qalabState.generatedQAs.filter(qa => qa.category === qalabState.currentCategory);

    const langName = LANGUAGES.find(l => l.code === qalabState.currentLang)?.name || qalabState.currentLang;
    const catLabel = CATEGORIES.find(c => c.id === qalabState.currentCategory)?.label || qalabState.currentCategory;

    let text = `Rufus Q&A 预研结果\n`;
    text += `语言: ${langName}\n`;
    text += `分类: ${catLabel}\n`;
    text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    text += `总计: ${filtered.length} 个 Q&A\n`;
    text += `${'='.repeat(80)}\n\n`;

    filtered.forEach((qa, index) => {
        const trans = qa.translations[qalabState.currentLang];
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
    downloadFile(blob, `rufus-qa-${qalabState.currentLang}-${qalabState.currentCategory}-${Date.now()}.txt`);
    showToast('success', '导出成功', '文本文件已下载');
}

/**
 * 切换语言
 */
export function switchLang(lang: string): void {
    qalabState.currentLang = lang;
    renderLangSelector(switchLang);
    renderQAGrid(toggleQA, copyQA, editQA);
    const langName = LANGUAGES.find(l => l.code === lang)?.name || lang;
    showToast('success', '语言已切换', `当前: ${langName}`);
}

/**
 * 切换分类
 */
export function switchCategory(cat: string): void {
    qalabState.currentCategory = cat;
    renderResults(toggleQA, copyQA, editQA, switchLang, switchCategory);
}

/**
 * 切换Q&A展开/折叠
 */
export function toggleQA(id: number): void {
    const card = document.querySelector(`.qa-card[data-qa-id="${id}"]`);
    if (card) {
        card.classList.toggle('open');
    }
}

/**
 * 复制Q&A
 */
export function copyQA(id: number, btnElement: HTMLElement): void {
    const qa = qalabState.generatedQAs.find(q => q.id === id);
    if (!qa) return;

    const trans = qa.translations[qalabState.currentLang];
    if (!trans) return;

    const text = `Q: ${trans.q}\n\nA: ${trans.a}`;

    navigator.clipboard.writeText(text).then(() => {
        btnElement.classList.add('copied');
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
        qalabState.eventManager.addTimeout(() => {
            btnElement.classList.remove('copied');
            btnElement.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
        }, 2000);
        showToast('success', '已复制到剪贴板', '');
    }).catch(() => {
        showToast('error', '复制失败', '请手动复制');
    });
}

/**
 * 编辑Q&A
 */
export function editQA(_id: number): void {
    showToast('info', '编辑功能', '此功能将在后续版本中提供');
}
