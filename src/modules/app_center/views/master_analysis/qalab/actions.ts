/**
 * QA Lab 业务逻辑
 * 使用新架构：SafeRenderer 进行安全渲染
 */

import state from '../../../../../common/state';
import { SAMPLE_JSON } from './sampleData';
import { generateMultiLangQAs } from './qaData';
import { qalabState } from './state';
import { LANGUAGES, CATEGORIES, MARKET_LANG_MAP } from './constants';
import { showToast, downloadFile } from './utils';
import { renderResults, renderLangSelector, renderQAGrid } from './render';
import { rufusSimulator } from './rufusSimulator';

/**
 * 自动加载分析报告
 * 从全局状态中检测并加载分析报告到输入框
 */
export function autoLoadAnalysisReport(): void {
    const analysisReport = state.analysis?.analysisReport;
    
    if (!analysisReport) {
        console.log('[QALab] 未检测到分析报告');
        return;
    }
    
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (!input) {
        console.log('[QALab] 输入框未就绪');
        return;
    }
    
    try {
        // 处理不同格式的报告数据
        let reportJSON: string;
        
        if (typeof analysisReport === 'string') {
            reportJSON = analysisReport;
        } else {
            // 转换为与 Promptlab 一致的格式
            const reportObj = analysisReport as any;
            const results = reportObj.results;
            const firstResult = results && Array.isArray(results) && results.length > 0 ? results[0] : null;
            
            const formattedReport = {
                metadata: {
                    asins: firstResult?.asin?.split(', ') || [],
                    marketplace: reportObj.marketplace || 'DE'
                },
                analysisReport: firstResult || reportObj
            };
            reportJSON = JSON.stringify(formattedReport, null, 2);
        }
        
        // 检查是否与当前内容相同，避免重复加载
        if (input.value.trim() === reportJSON.trim()) {
            console.log('[QALab] 报告已加载，跳过重复加载');
            return;
        }
        
        input.value = reportJSON;
        qalabState.reportData = JSON.parse(reportJSON);
        
        // 显示加载提示
        const reportSource = qalabState.reportData?.metadata?.asins?.join(', ') || '未知';
        showToast('success', '分析报告已自动加载', `来源: ${reportSource}`);
        
        console.log('[QALab] 分析报告已自动加载');
    } catch (error) {
        console.error('[QALab] 加载分析报告失败:', error);
        showToast('error', '报告加载失败', '数据格式可能不正确');
    }
}

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
 * 使用 requestAnimationFrame 替代 setTimeout 进行动画控制
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

    // 使用 Promise 和 requestAnimationFrame 替代 setTimeout
    const animateStep = (index: number): Promise<void> => {
        return new Promise(resolve => {
            const delay = 400 + Math.random() * 300;
            setTimeout(() => {
                if (index > 0) {
                    const prevStep = document.getElementById(steps[index - 1]!);
                    if (prevStep) {
                        prevStep.classList.remove('active');
                        prevStep.classList.add('done');
                        const icon = prevStep.querySelector('i');
                        if (icon) icon.className = 'fa-solid fa-circle-check';
                    }
                }
                
                const currentStep = document.getElementById(steps[index]!);
                if (currentStep) {
                    currentStep.classList.add('active');
                    const icon = currentStep.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-circle-notch fa-spin';
                }
                
                if (bar) {
                    bar.style.width = ((index + 1) / steps.length * 100) + '%';
                }
                
                resolve();
            }, delay);
        });
    };

    // 顺序执行所有步骤
    for (let i = 0; i < steps.length; i++) {
        await animateStep(i);
    }

    // 最后一步完成
    await new Promise(resolve => setTimeout(resolve, 600));
    
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
    
    // 初始化 Rufus 模拟器
    rufusSimulator.initialize(qalabState.reportData);
    
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
 * 使用 requestAnimationFrame 替代 setTimeout
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
        
        // 使用 requestAnimationFrame 和 setTimeout 组合
        setTimeout(() => {
            requestAnimationFrame(() => {
                btnElement.classList.remove('copied');
                btnElement.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
            });
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

/**
 * Rufus AI 模拟器 - 发送问题
 */
export async function sendRufusQuestion(question: string): Promise<void> {
    if (!question.trim()) {
        showToast('error', '请输入问题', '');
        return;
    }
    
    // 添加用户消息
    qalabState.rufusMessages.push({
        role: 'user',
        content: question,
        timestamp: Date.now()
    });
    
    // 更新UI显示用户消息
    renderRufusMessages();
    
    // 清空输入框
    const input = document.getElementById('rufusInput') as HTMLTextAreaElement;
    if (input) {
        input.value = '';
    }
    
    // 显示思考状态
    qalabState.rufusThinking = true;
    renderRufusThinking();
    
    try {
        // 初始化模拟器
        if (qalabState.reportData) {
            rufusSimulator.initialize(qalabState.reportData);
        }
        
        // 模拟思考延迟（500-1500ms）
        const thinkingDelay = 500 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, thinkingDelay));
        
        // 生成回答
        const answer = await rufusSimulator.generateAnswer(question);
        
        // 添加助手消息
        qalabState.rufusMessages.push({
            role: 'assistant',
            content: answer,
            timestamp: Date.now()
        });
        
        qalabState.rufusThinking = false;
        renderRufusMessages();
        
    } catch (error) {
        console.error('[QALab] Rufus 回答生成失败:', error);
        qalabState.rufusThinking = false;
        showToast('error', '回答生成失败', '请稍后重试');
    }
}

/**
 * 清空 Rufus 对话历史
 */
export function clearRufusChat(): void {
    qalabState.rufusMessages = [];
    renderRufusMessages();
    showToast('success', '对话已清空', '');
}

/**
 * 渲染 Rufus 消息列表
 */
function renderRufusMessages(): void {
    const container = document.getElementById('rufusMessages');
    if (!container) return;
    
    if (qalabState.rufusMessages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fa-solid fa-comments text-4xl mb-3 opacity-50"></i>
                <p>还没有对话记录</p>
                <p class="text-sm mt-1">向 Rufus AI 提问，获取基于报告的智能回答</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = qalabState.rufusMessages.map(msg => {
        const isUser = msg.role === 'user';
        const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="rufus-message ${isUser ? 'user' : 'assistant'}">
                <div class="message-header">
                    <span class="message-role">
                        <i class="fa-solid fa-${isUser ? 'user' : 'robot'}"></i>
                        ${isUser ? '您' : 'Rufus AI'}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }).join('');
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
}

/**
 * 渲染 Rufus 思考状态
 */
function renderRufusThinking(): void {
    const container = document.getElementById('rufusMessages');
    if (!container) return;
    
    if (qalabState.rufusThinking) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = 'rufusThinking';
        thinkingDiv.className = 'rufus-message assistant thinking';
        thinkingDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">
                    <i class="fa-solid fa-robot"></i>
                    Rufus AI
                </span>
            </div>
            <div class="message-content">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                正在思考...
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;
    } else {
        const thinkingDiv = document.getElementById('rufusThinking');
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }
}
