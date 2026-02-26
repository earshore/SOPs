/**
 * QA Lab 业务逻辑
 * 使用新架构：SafeRenderer 进行安全渲染
 */

import { appStore } from '@/stores/useAppStore';
import { generateMultiLangQAs } from './qaData';
import { LANGUAGES, CATEGORIES, MARKET_LANG_MAP } from './constants';
import { downloadFile } from './utils';
import { showToast } from '../../../../../common/ui/notifications';
import { renderResults, renderLangSelector, renderQAGrid } from './render';
import { rufusSimulator } from './rufusSimulator';
import { triggerFileImport } from './importHandler';
import { renderDataPreview, renderJSONPreview } from './dataPreview';

// 获取 qalab 状态的辅助函数
const getQalabState = () => appStore.getState().qalab;

/**
 * 自动加载分析报告
 * 从全局状态中检测并加载分析报告到输入框
 */
export function autoLoadAnalysisReport(): void {
    console.log('[QALab] ========================================');
    console.log('[QALab] 🔍 autoLoadAnalysisReport 被调用');
    console.log('[QALab] 时间:', new Date().toLocaleTimeString());
    
    const analysisReport = appStore.getState().analysis?.analysisReport;
    
    if (!analysisReport) {
        console.log('[QALab] ⚠️ 未检测到分析报告');
        console.log('[QALab] - state.analysis:', appStore.getState().analysis ? '存在但无 analysisReport' : '不存在');
        console.log('[QALab] ========================================');
        return;
    }
    
    console.log('[QALab] ✅ 检测到分析报告');
    console.log('[QALab] - 报告类型:', typeof analysisReport);
    
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (!input) {
        console.log('[QALab] ⚠️ 输入框未就绪');
        console.log('[QALab] ========================================');
        return;
    }
    
    console.log('[QALab] ✅ 输入框已就绪');
    
    try {
        // 处理不同格式的报告数据
        let reportJSON: string;
        let reportData: any;
        
        if (typeof analysisReport === 'string') {
            console.log('[QALab] 📄 报告格式: 字符串');
            reportJSON = analysisReport;
            reportData = JSON.parse(reportJSON);
        } else {
            console.log('[QALab] 📄 报告格式: 对象');
            const reportObj = analysisReport as any;
            
            // 从 state 中获取完整的 metadata 信息
            const scrapedData = appStore.getState().scraper?.scrapedData as any;
            
            // 获取 ASINs：优先从 appStore.getState().analysis.selectedAsins，否则从 scrapedData.products 提取
            let selectedAsins = appStore.getState().analysis?.selectedAsins || [];
            if (selectedAsins.length === 0 && scrapedData?.products) {
                selectedAsins = scrapedData.products
                    .map((p: any) => p.asin)
                    .filter((asin: string) => !!asin);
            }
            
            // 从报告对象推断 selectedTargets（分析目标）
            const selectedTargets = Object.keys(reportObj).filter(key => 
                key.includes('-') && typeof reportObj[key] === 'object'
            );
            
            // 数据源判断：如果有 scraper 数据则为 scraper，否则为 sample
            const dataSource = scrapedData?.products?.length > 0 ? 'scraper' : 'sample';
            
            // 构建完整的 metadata
            const metadata = {
                asins: selectedAsins,
                targets: selectedTargets,
                timestamp: new Date().toISOString(),
                dataSource: dataSource,
                marketplace: scrapedData?.metadata?.marketplace || 'DE',
                productTitle: scrapedData?.products?.map((p: any) => p.productTitle).join(' | ') || undefined
            };
            
            console.log('[QALab] 📦 构建完整的 FullReportData 格式');
            console.log('[QALab] - metadata:', metadata);
            
            reportData = {
                metadata,
                analysisReport: reportObj
            };
            
            reportJSON = JSON.stringify(reportData, null, 2);
        }
        
        console.log('[QALab] 📊 报告 JSON 长度:', reportJSON.length, '字符');
        
        // 检查是否与当前内容相同，避免重复加载
        if (input.value.trim() === reportJSON.trim()) {
            console.log('[QALab] ⚠️ 报告已加载，跳过重复加载');
            console.log('[QALab] ========================================');
            return;
        }
        
        input.value = reportJSON;
        const qalabState = getQalabState();
        qalabState.reportData = reportData;
        
        console.log('[QALab] ✅ 报告已加载到 qalabState.reportData');
        console.log('[QALab] 📋 报告详细信息:');
        
        // 详细记录报告内容
        if (qalabState.reportData) {
            // 获取实际的分析报告数据
            const ar = qalabState.reportData.analysisReport || qalabState.reportData;
            
            console.log('[QALab] - 报告根字段:', Object.keys(qalabState.reportData));
            console.log('[QALab] - 分析报告字段:', Object.keys(ar));
            console.log('[QALab] ----------------------------------------');
            
            // 产品信息
            const productTitle = ar.product_title || ar.productTitle || ar.title || 'N/A';
            const market = qalabState.reportData.metadata?.marketplace || ar.market || ar.marketplace || 'N/A';
            const asins = qalabState.reportData.metadata?.asins || (ar.asin ? [ar.asin] : []);
            
            console.log('[QALab] - 产品标题:', productTitle);
            console.log('[QALab] - 市场:', market);
            console.log('[QALab] - ASINs:', asins);
            console.log('[QALab] ----------------------------------------');
            
            // 检查关键数据字段（支持多种命名格式）
            const sellingPoints = ar['selling-points']?.bullet_analysis 
                || ar.sellingPoints?.bullet_analysis 
                || ar.selling_points?.bullet_analysis
                || [];
            
            const fatalFlaws = ar['fatal-flaws']?.critical_issues 
                || ar.fatalFlaws?.critical_issues 
                || ar.fatal_flaws?.critical_issues
                || [];
            
            const wowMoments = ar['wow-moments']?.moments 
                || ar.wowMoments?.moments 
                || ar.wow_moments?.moments
                || [];
            
            const hesitations = ar['hesitation-points']?.hesitations 
                || ar.hesitationPoints?.hesitations 
                || ar.hesitation_points?.hesitations
                || [];
            
            const buyerProfile = ar['buyer-profile']?.buyer_types 
                || ar.buyerProfile?.buyer_types 
                || ar.buyer_profile?.buyer_types
                || [];
            
            console.log('[QALab] - 卖点数量:', sellingPoints.length);
            console.log('[QALab] - 致命缺陷数量:', fatalFlaws.length);
            console.log('[QALab] - Wow 时刻数量:', wowMoments.length);
            console.log('[QALab] - 犹豫点数量:', hesitations.length);
            console.log('[QALab] - 买家画像数量:', buyerProfile.length);
            
            // 如果所有字段都是空的，列出所有可用字段帮助调试
            if (sellingPoints.length === 0 && fatalFlaws.length === 0 && wowMoments.length === 0) {
                console.warn('[QALab] ⚠️ 所有业务字段都为空，列出可用字段:');
                console.log('[QALab] - 可用字段:', Object.keys(ar));
                
                // 尝试查找可能的字段名
                for (const key of Object.keys(ar)) {
                    if (typeof ar[key] === 'object' && ar[key] !== null) {
                        console.log('[QALab] - 对象字段', key, ':', Object.keys(ar[key]));
                    }
                }
            }
        }
        
        // 显示加载提示
        const reportSource = qalabState.reportData?.metadata?.asins?.join(', ') || '未知';
        showToast('分析报告已自动加载', { 
            type: 'success', 
            description: `来源: ${reportSource}` 
        });
        
        // 刷新数据预览
        refreshDataPreview();
        
        console.log('[QALab] ✅ 分析报告已自动加载');
        console.log('[QALab] ========================================');
    } catch (error) {
        console.error('[QALab] ❌ 加载分析报告失败:', error);
        console.error('[QALab] 错误详情:', (error as Error).message);
        console.log('[QALab] ========================================');
        showToast('报告加载失败', { 
            type: 'error', 
            description: '数据格式可能不正确' 
        });
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
    
    showToast('已清空', { 
        type: 'success', 
        description: '准备接收新的报告数据' 
    });
}

/**
 * 开始分析
 * 使用 requestAnimationFrame 替代 setTimeout 进行动画控制
 */
export async function startAnalysis(): Promise<void> {
    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
    if (!input || !input.value.trim()) {
        showToast('请先粘贴报告 JSON', { 
            type: 'error', 
            description: '或点击「加载示例数据」' 
        });
        return;
    }

    const qalabState = getQalabState();
    
    try {
        qalabState.reportData = JSON.parse(input.value);
    } catch (e) {
        showToast('JSON 格式错误', { 
            type: 'error', 
            description: '请检查数据格式是否正确' 
        });
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
    
    // 初始化 Rufus 模拟器（使用 AI 模式）
    rufusSimulator.initialize(qalabState.reportData, 'ai');
    
    renderResults(toggleQA, copyQA, editQA, switchLang, switchCategory);
    
    if (resultsSection) resultsSection.classList.add('active');
    
    showToast('分析完成!', { 
        type: 'success', 
        description: `已生成 ${qalabState.generatedQAs.length} 个 Q&A` 
    });
}

/**
 * 切换全部展开/折叠
 */
export function toggleExpandAll(): void {
    const qalabState = getQalabState();
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
    const qalabState = getQalabState();
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
    showToast('导出成功', { 
        type: 'success', 
        description: 'JSON 文件已下载' 
    });
}

/**
 * 导出CSV
 */
export function exportCSV(): void {
    const qalabState = getQalabState();
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
    showToast('导出成功', { 
        type: 'success', 
        description: 'CSV 文件已下载' 
    });
}

/**
 * 导出文本
 */
export function exportText(): void {
    const qalabState = getQalabState();
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
    showToast('导出成功', { 
        type: 'success', 
        description: '文本文件已下载' 
    });
}

/**
 * 切换语言
 */
export function switchLang(lang: string): void {
    const qalabState = getQalabState();
    qalabState.currentLang = lang;
    renderLangSelector(switchLang);
    renderQAGrid(toggleQA, copyQA, editQA);
    const langName = LANGUAGES.find(l => l.code === lang)?.name || lang;
    showToast('语言已切换', { 
        type: 'success', 
        description: `当前: ${langName}` 
    });
}

/**
 * 切换分类
 */
export function switchCategory(cat: string): void {
    const qalabState = getQalabState();
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
    const qalabState = getQalabState();
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
        
        showToast('已复制到剪贴板', { type: 'success' });
    }).catch(() => {
        showToast('复制失败', { 
            type: 'error', 
            description: '请手动复制' 
        });
    });
}

/**
 * 编辑Q&A
 */
export function editQA(_id: number): void {
    showToast('编辑功能', { 
        type: 'info', 
        description: '此功能将在后续版本中提供' 
    });
}

/**
 * Rufus AI 模拟器 - 发送问题
 */
export async function sendRufusQuestion(question: string): Promise<void> {
    console.log('[QALab] ========================================');
    console.log('[QALab] 💬 sendRufusQuestion 被调用');
    console.log('[QALab] 时间:', new Date().toLocaleTimeString());
    console.log('[QALab] ========================================');
    
    if (!question.trim()) {
        console.warn('[QALab] ⚠️ 问题为空');
        showToast('请输入问题', { type: 'error' });
        return;
    }
    
    const qalabState = getQalabState();
    
    console.log('[QALab] 📝 用户问题:');
    console.log('[QALab] - 长度:', question.length, '字符');
    console.log('[QALab] - 内容:', question);
    console.log('[QALab] ----------------------------------------');
    
    // 添加用户消息
    qalabState.rufusMessages.push({
        role: 'user',
        content: question,
        timestamp: Date.now()
    });
    
    console.log('[QALab] ✅ 用户消息已添加到历史');
    console.log('[QALab] - 当前消息总数:', qalabState.rufusMessages.length);
    
    // 更新UI显示用户消息
    renderRufusMessages();
    console.log('[QALab] ✅ UI 已更新显示用户消息');
    
    // 清空输入框
    const input = document.getElementById('rufusInput') as HTMLTextAreaElement;
    if (input) {
        input.value = '';
        console.log('[QALab] ✅ 输入框已清空');
    }
    
    // 显示思考状态
    qalabState.rufusThinking = true;
    renderRufusThinking();
    console.log('[QALab] � 开始思考状态...');
    
    try {
        console.log('[QALab] ----------------------------------------');
        console.log('[QALab] 🚀 当前配置:');
        console.log('[QALab] - Rufus 模式: AI');
        console.log('[QALab] - 报告数据存在:', !!qalabState.reportData);
        
        if (qalabState.reportData) {
            const ar = qalabState.reportData.analysisReport || qalabState.reportData;
            console.log('[QALab] - 产品标题:', ar.product_title || 'N/A');
            console.log('[QALab] - 卖点数:', ar['selling-points']?.bullet_analysis?.length || 0);
            console.log('[QALab] - 缺陷数:', ar['fatal-flaws']?.critical_issues?.length || 0);
        }
        
        console.log('[QALab] ----------------------------------------');
        
        // 初始化模拟器（使用 AI 模式）
        if (qalabState.reportData) {
            console.log('[QALab] 🔧 初始化 Rufus 模拟器...');
            console.log('[QALab] - 模式: AI');
            rufusSimulator.initialize(qalabState.reportData, 'ai');
            console.log('[QALab] ✅ 模拟器初始化完成');
        } else {
            console.warn('[QALab] ⚠️ 没有报告数据');
        }
        
        // AI 模式显示详细状态
        console.log('[QALab] 🤖 使用 AI 模式生成回答');
        updateRufusThinkingMessage('正在连接大模型...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 模拟思考延迟
        const thinkingDelay = 800 + Math.random() * 500;  // 800-1300ms
        
        console.log('[QALab] ⏱️ 思考延迟:', Math.round(thinkingDelay), 'ms');
        
        updateRufusThinkingMessage('正在分析报告内容...');
        await new Promise(resolve => setTimeout(resolve, thinkingDelay / 2));
        
        updateRufusThinkingMessage('正在生成智能回答...');
        await new Promise(resolve => setTimeout(resolve, thinkingDelay / 2));
        
        console.log('[QALab] ----------------------------------------');
        console.log('[QALab] 🚀 开始生成回答...');
        const startTime = Date.now();
        
        // 生成回答
        const answer = await rufusSimulator.generateAnswer(question);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('[QALab] ========================================');
        console.log('[QALab] ✅ 回答生成完成');
        console.log('[QALab] ⏱️ 生成耗时:', duration, 'ms');
        console.log('[QALab] 📊 回答统计:');
        console.log('[QALab] - 长度:', answer.length, '字符');
        console.log('[QALab] - 行数:', answer.split('\n').length);
        console.log('[QALab] - 使用模式: AI');
        console.log('[QALab] ----------------------------------------');
        console.log('[QALab] 📄 回答内容预览 (前 200 字符):');
        console.log('[QALab]', answer.substring(0, 200) + (answer.length > 200 ? '...' : ''));
        console.log('[QALab] ========================================');
        
        // 添加助手消息
        qalabState.rufusMessages.push({
            role: 'assistant',
            content: answer,
            timestamp: Date.now()
        });
        
        console.log('[QALab] ✅ 助手消息已添加到历史');
        console.log('[QALab] - 当前消息总数:', qalabState.rufusMessages.length);
        
        qalabState.rufusThinking = false;
        renderRufusMessages();
        
        console.log('[QALab] ✅ UI 已更新显示助手回答');
        
        // 显示成功提示
        showToast('AI 回答生成成功', { 
            type: 'success', 
            description: '基于大模型智能分析' 
        });
        console.log('[QALab] 💡 已显示 AI 成功提示');
        
        console.log('[QALab] ========================================');
        
    } catch (error) {
        console.error('[QALab] ========================================');
        console.error('[QALab] ❌ Rufus 回答生成失败');
        console.error('[QALab] 错误类型:', (error as Error).name);
        console.error('[QALab] 错误信息:', (error as Error).message);
        console.error('[QALab] 错误堆栈:', (error as Error).stack);
        console.error('[QALab] ========================================');
        
        qalabState.rufusThinking = false;
        
        // AI 模式失败，提示用户
        const errorMsg = (error as Error).message;
        let userFriendlyMsg = '抱歉，AI 模式暂时不可用。\n\n';
        
        if (errorMsg.includes('未配置 LLM')) {
            userFriendlyMsg += '❌ 原因：未配置大语言模型\n\n';
            userFriendlyMsg += '📝 解决方案：\n';
            userFriendlyMsg += '1. 点击右上角设置按钮\n';
            userFriendlyMsg += '2. 进入「LLM 配置」\n';
            userFriendlyMsg += '3. 添加并激活一个 LLM 提供商\n';
            userFriendlyMsg += '4. 返回此页面重新提问';
            
            showToast('AI 模式需要配置', { 
                type: 'warning', 
                description: '请先配置 LLM 服务', 
                duration: 8000 
            });
        } else if (errorMsg.includes('配置不完整')) {
            userFriendlyMsg += '❌ 原因：LLM 配置不完整\n\n';
            userFriendlyMsg += '📝 解决方案：\n';
            userFriendlyMsg += '1. 检查 API Key 是否正确填写\n';
            userFriendlyMsg += '2. 检查 API 端点是否可访问\n';
            userFriendlyMsg += '3. 确认模型名称是否正确';
            
            showToast('LLM 配置不完整', { 
                type: 'warning', 
                description: '请检查配置', 
                duration: 8000 
            });
        } else {
            userFriendlyMsg += `❌ 错误信息：${errorMsg}\n\n`;
            userFriendlyMsg += '💡 提示：请检查网络连接或稍后重试';
            
            showToast('AI 模式调用失败', { 
                type: 'error', 
                description: '请稍后重试', 
                duration: 6000 
            });
        }
        
        qalabState.rufusMessages.push({
            role: 'assistant',
            content: userFriendlyMsg,
            timestamp: Date.now()
        });
        renderRufusMessages();
    }
}

/**
 * 清空 Rufus 对话历史
 */
export function clearRufusChat(): void {
    const qalabState = getQalabState();
    qalabState.rufusMessages.length = 0;
    renderRufusMessages();
    showToast('对话已清空', { type: 'success' });
}

/**
 * 检查 LLM 配置状态（在模块初始化时调用）
 */
export async function checkLLMConfiguration(): Promise<void> {
    try {
        const { StorageService, STORAGE_KEYS } = await import('../../../../../services/storageService');
        const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
        
        if (!activeProvider) {
            console.warn('[QALab] ⚠️ 未配置 LLM 提供商');
            return;
        }
        
        const config = await StorageService.getLLMConfigWithKey(activeProvider);
        if (!config || !config.apiKey) {
            console.warn('[QALab] ⚠️ LLM 配置不完整');
            return;
        }
        
        console.log('[QALab] ✅ LLM 配置正常:', activeProvider);
    } catch (error) {
        console.error('[QALab] 检查 LLM 配置失败:', error);
    }
}

/**
 * 渲染 Rufus 消息列表
 */
export function renderRufusMessages(): void {
    const container = document.getElementById('rufusMessages');
    if (!container) return;
    
    const qalabState = getQalabState();
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
        
        // 消息内容不显示模式徽章
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
    
    const qalabState = getQalabState();
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
                </span>
            </div>
            <div class="message-content" id="rufusThinkingContent">
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

/**
 * 更新思考状态消息
 */
function updateRufusThinkingMessage(message: string): void {
    const thinkingContent = document.getElementById('rufusThinkingContent');
    if (thinkingContent) {
        thinkingContent.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            ${message}
        `;
    }
}

/**
 * 切换数据Tab
 */
export function switchDataTab(tab: 'preview' | 'json'): void {
    console.log('[QALab] 切换数据Tab:', tab);
    
    // 更新Tab按钮状态
    const tabs = document.querySelectorAll('.data-tab');
    tabs.forEach(t => {
        const tabElement = t as HTMLElement;
        const tabName = tabElement.dataset.tab;
        if (tabName === tab) {
            tabElement.classList.add('active');
        } else {
            tabElement.classList.remove('active');
        }
    });
    
    // 更新Tab内容显示
    const previewTab = document.getElementById('dataPreviewTab');
    const jsonTab = document.getElementById('jsonTab');
    
    if (tab === 'preview') {
        previewTab?.classList.add('active');
        jsonTab?.classList.remove('active');
    } else {
        previewTab?.classList.remove('active');
        jsonTab?.classList.add('active');
    }
}

/**
 * 刷新数据预览
 */
export function refreshDataPreview(): void {
    const qalabState = getQalabState();
    const reportData = qalabState.reportData;
    
    console.log('[QALab] 刷新数据预览:', reportData ? '有数据' : '无数据');
    
    // 渲染数据预览
    renderDataPreview(reportData);
    
    // 渲染JSON预览
    renderJSONPreview(reportData);
}

/**
 * 触发导入（暴露给全局）
 */
export function triggerImport(): void {
    console.log('[QALab] 触发文件导入');
    triggerFileImport();
}
