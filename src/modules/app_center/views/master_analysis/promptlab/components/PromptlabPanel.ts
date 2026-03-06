/**
 * Promptlab Panel Alpine.js 组件核心逻辑
 * 负责 Prompt 拼接生成功能的响应式状态管理
 */

import { escapeHtml } from '@/common/utils/security';
import { appStore } from '@/stores/useAppStore';
import { promptlabService } from '../../services/promptlabService';
import SITE_CONFIGS from '../../../../../../common/constants/constants';
import type { TargetMarket } from '@/types/state';
import { ANALYSIS_MODULES } from '../../constants/prompts';
import { showToast } from '../../../../../../common/ui';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';
import type { AnalysisReport } from '../../../../../../types/modules-business';
import type { UserProductProfile, PromptInputs } from '../../../../../../types/state';
import eventBus from '../../../../../../common/EventBus';
import { SafeRenderer } from '../../../../../../common/infrastructure/SafeRenderer';
import { estimateTokenCount, formatTokenCount } from '../../ai_analysis/utils/tokenCounter';
import { PROMPTLAB_DISPLAY_LIMITS } from '../../config/displayLimits';

import { Logger } from '../../../../../../services/loggerService';
import { extractProductDNA, canExtractDNA } from '../../services/dnaExtractor';
import { extractDNAFromDownloadsReport, canExtractDNAFromDownloadsReport } from '../../services/universalDNAExtractor';
/**
 * 控制台模式类型
 */
type ConsoleMode = 'listing' | 'visual';

/**
 * 创建 Promptlab Panel Alpine 组件
 */
export function createPromptlabPanel() {
    return {
        // ========== State ==========

        // 控制台模式
        currentConsoleMode: 'listing' as ConsoleMode,

        // Prompt 缓存
        listingPromptCache: '',
        visualPromptCache: '',

        // 市场跟踪（用于检测数据源变化）
        lastMarketplace: '',

        // 输入框原始高度存储
        originalHeights: new Map<HTMLElement, number>(),

        // 用户产品配置
        profile: {
            targetMarket: '',
            keywordsTier1: '',
            keywordsTier2: '',
            audience: '',
            usps: '',
            specs: '',
            socialHook: '',
            negative: '',
            tone: 'professional',
            customStrategy: '',
            useCosmo: true,
            useRufus: true,
            useEmoji: true,
            selectedReportSections: [] as string[],
            charLimit: 5000,
        } as UserProductProfile,

        // DNA 提取置信度
        dnaConfidence: {
            audience: 0,
            usps: 0,
            specs: 0,
            keywords: 0,
            overall: 0
        },

        // 置信度筛选配置

        // 标记是否已经渲染过报告（用于区分首次加载和用户清空）
        hasRenderedReportOnce: false,

        // ========== Computed Properties ==========

        /**
         * 是否有分析报告
         */
        get hasReport(): boolean {
            const report = appStore.getState().analysis.analysisReport;
            Logger.debug('[Promptlab] hasReport 检查:', {
                report,
                type: typeof report,
                hasMetadata: typeof report === 'object' && report !== null ? (report as any).metadata : undefined,
                hasAnalysisReport: typeof report === 'object' && report !== null ? (report as any).analysisReport : undefined,
                result: !!report
            });
            return !!appStore.getState().analysis.analysisReport;
        },

        /**
         * 是否准备就绪（可以生成 Prompt）
         */
        get isReady(): boolean {
            return this.hasReport &&
                this.profile.targetMarket !== '' &&
                this.profile.keywordsTier1.trim().length > 0 &&
                this.profile.keywordsTier2.trim().length > 0;
        },

        /**
         * 当前 Prompt 输出
         */
        get currentPrompt(): string {
            return this.currentConsoleMode === 'listing'
                ? this.listingPromptCache
                : this.visualPromptCache;
        },

        /**
         * Token 计数
         */
        get tokenCount(): number {
            return estimateTokenCount(this.currentPrompt);
        },

        /**
         * 格式化的 Token 计数
         */
        get formattedTokenCount(): string {
            return formatTokenCount(this.tokenCount);
        },

        /**
         * 是否超出字符限制
         */
        get isOverLimit(): boolean {
            return this.tokenCount > this.profile.charLimit;
        },

        // ========== 置信度相关 ==========

        /**
         * 获取报告置信度数据
         */
        get reportConfidence() {
            const report = appStore.getState().analysis.analysisReport;
            if (!report || typeof report === 'string') {
                console.debug('[Promptlab 置信度] reportConfidence: 报告不存在或为字符串');
                return null;
            }
            const reportObj = report as any;
            if (!reportObj._metadata) {
                console.warn('[Promptlab 置信度] reportConfidence: 报告缺少 _metadata 字段');
                return null;
            }
            const confidence = reportObj._metadata.confidence || null;
            console.debug('[Promptlab 置信度] reportConfidence:', confidence);
            return confidence;
        },

        /**
         * 获取总体置信度
         */
        get overallConfidence() {
            const report = appStore.getState().analysis.analysisReport;
            if (!report || typeof report === 'string') {
                console.debug('[Promptlab 置信度] overallConfidence: 报告不存在或为字符串');
                return 0;
            }
            const reportObj = report as any;
            if (!reportObj._metadata) {
                console.warn('[Promptlab 置信度] overallConfidence: 报告缺少 _metadata 字段');
                return 0;
            }
            const overall = reportObj._metadata.overallConfidence || 0;
            console.debug('[Promptlab 置信度] overallConfidence:', overall);
            return overall;
        },

        /**
         * 获取总体置信度百分比
         */
        get overallConfidencePercent() {
            const percent = Math.round((this.overallConfidence as number) * 100);
            console.debug('[Promptlab 置信度] overallConfidencePercent:', percent + '%');
            return percent;
        },

        /**
         * 检查是否有置信度数据
         */
        get hasConfidenceData() {
            const hasData = !!this.reportConfidence;
            console.debug('[Promptlab 置信度] hasConfidenceData:', hasData);
            return hasData;
        },

        /**
         * 获取特定目标的置信度（百分比）
         */
        getTargetConfidence(targetId: string): number {
            const confidence = this.reportConfidence as Record<string, number> | null;
            if (!confidence || !confidence[targetId]) return 0;
            return Math.round(confidence[targetId] * 100);
        },

        /**
         * 获取置信度颜色类
         */
        getConfidenceColorClass(percent: number): string {
            if (percent >= 70) return 'bg-green-100 text-green-700 border-green-300';
            if (percent >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            return 'bg-orange-100 text-orange-700 border-orange-300';
        },

        /**
         * 获取置信度等级文本
         */
        getConfidenceLevel(percent: number): string {
            if (percent >= 70) return '高';
            if (percent >= 50) return '中';
            return '低';
        },

        /**
         * 获取置信度 ARIA 标签
         */
        getConfidenceAriaLabel(percent: number): string {
            const level = this.getConfidenceLevel(percent);
            return `置信度: ${percent}%, 等级: ${level}`;
        },


        // ========== Lifecycle ==========

        init() {
            Logger.debug('[Promptlab] 🚀 Alpine 组件初始化');

            // 从 Zustand store 恢复状态
            this.restoreState();

            // 生成语言选项
            this.generateLanguageOptions();

            // 渲染报告分析
            this.renderReportAnalysis();

            // 初始化输入框自动高度调整
            this.initAutoHeightInputs();

            // 监听数据更新事件
            eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
                Logger.debug('[Promptlab] 检测到数据更新，重新渲染报告分析');
                this.renderReportAnalysis();
            });

            window.addEventListener(APP_EVENTS.HISTORY_UPDATED, () => {
                Logger.debug('[Promptlab] 检测到历史更新，重新渲染报告分析');
                this.renderReportAnalysis();
            });

            // 监听 appStore 分析报告变化
            if (appStore && typeof appStore.subscribe === 'function') {
                appStore.subscribe((state) => {
                    // 当分析报告变化时，强制更新组件
                    if (state.analysis?.analysisReport) {
                        // 使用 Alpine 的 nextTick 确保响应式更新
                        if (typeof (this as any).$nextTick === 'function') {
                            (this as any).$nextTick(() => {
                                this.renderReportAnalysis();
                            });
                        } else {
                            // 备用方案：使用 setTimeout
                            setTimeout(() => {
                                this.renderReportAnalysis();
                            }, 0);
                        }
                    }
                });
                Logger.debug('[Promptlab] ✅ 已订阅 appStore 变化');
            }

            Logger.debug('[Promptlab] ✅ Alpine 组件初始化完成');
        },

        // ========== Auto Height Input Management ==========

        /**
         * 初始化所有输入框的自动高度调整
         */
        initAutoHeightInputs() {
            // 等待 DOM 渲染完成
            setTimeout(() => {
                const textareas = document.querySelectorAll('#card-product-dna textarea, #card-strategy textarea');
                textareas.forEach((textarea) => {
                    const el = textarea as HTMLTextAreaElement;
                    // 存储原始高度
                    if (!this.originalHeights.has(el)) {
                        const computedStyle = window.getComputedStyle(el);
                        const originalHeight = parseInt(computedStyle.height);
                        this.originalHeights.set(el, originalHeight);
                    }
                });
                Logger.debug('[Promptlab] ✅ 已初始化输入框自动高度调整');
            }, 100);
        },

        /**
         * 输入框获得焦点时自动扩展高度
         */
        expandInput(event: FocusEvent) {
            const target = event.target as HTMLTextAreaElement;

            // 存储原始高度（如果还没存储）
            if (!this.originalHeights.has(target)) {
                const computedStyle = window.getComputedStyle(target);
                const originalHeight = parseInt(computedStyle.height);
                this.originalHeights.set(target, originalHeight);
            }

            // 计算内容所需高度
            target.style.height = 'auto';
            const scrollHeight = target.scrollHeight;
            const minHeight = this.originalHeights.get(target) || 40;
            const maxHeight = 300; // 最大高度限制

            // 设置新高度（在最小和最大高度之间）
            const newHeight = Math.min(Math.max(scrollHeight + 4, minHeight), maxHeight);
            target.style.height = `${newHeight}px`;
            target.style.transition = 'height 0.2s ease-out';

            Logger.debug('[Promptlab] 输入框扩展:', { originalHeight: minHeight, newHeight });
        },

        /**
         * 输入框失去焦点时恢复原始高度
         */
        restoreInput(event: FocusEvent) {
            const target = event.target as HTMLTextAreaElement;
            const originalHeight = this.originalHeights.get(target);

            if (originalHeight) {
                target.style.height = `${originalHeight}px`;
                target.style.transition = 'height 0.2s ease-in';
                Logger.debug('[Promptlab] 输入框恢复:', { height: originalHeight });
            }
        },

        // ========== State Management ==========

        /**
         * 从 Zustand store 恢复状态
         */
        restoreState() {
            const savedProfile = appStore.getState().promptlab.userProductProfile;
            if (savedProfile) {
                this.profile = { ...savedProfile };
                Logger.debug('[Promptlab] ✅ 状态已从 store 恢复');
            }
        },

        /**
         * 保存状态到 Zustand store
         */
        saveState() {
            appStore.getState().setUserProductProfile(this.profile);
            Logger.debug('[Promptlab] ✅ 状态已保存到 store');
        },

        // ========== UI Functions ==========

        /**
         * 生成语言选项
         */
        generateLanguageOptions() {
            const select = document.getElementById('lab-target-market') as HTMLSelectElement;
            if (!select) return;

            const renderer = SafeRenderer.getInstance();

            // 清空现有选项
            renderer.renderTemplate(select, '<option value="" selected></option>');

            // 添加所有站点选项
            Object.entries(SITE_CONFIGS).forEach(([_code, config]) => {
                const option = document.createElement('option');
                option.value = config.name;
                option.textContent = `${config.name} (${config.domain})`;
                option.dataset.locale = config.locale;
                select.appendChild(option);
            });
        },

        /**
         * 渲染报告分析
         */
        renderReportAnalysis() {
            Logger.debug('[Promptlab] renderReportAnalysis 调用, hasReport:', this.hasReport);

            const container = document.getElementById('report-sections-container');
            const statusDiv = document.getElementById('lab-analysis-status');
            const marketSelect = document.getElementById('lab-target-market') as HTMLSelectElement;

            if (!container) {
                Logger.debug('[Promptlab] 容器元素未找到');
                return;
            }

            const renderer = SafeRenderer.getInstance();

            // 如果没有报告，显示提示
            if (!this.hasReport) {
                Logger.debug('[Promptlab] 没有报告，显示提示');
                if (statusDiv) {
                    statusDiv.className = 'px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1';
                    renderer.renderTemplate(statusDiv, '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告');
                }
                renderer.renderTemplate(container, '<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>');
                container.className = 'mt-3';
                return;
            }

            // 更新状态显示
            if (statusDiv) {
                statusDiv.className = 'px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1';
                renderer.renderTemplate(statusDiv, '<i class="fas fa-check-circle"></i> 分析报告已就绪');
            }

            // 智能自动选择语言
            this.autoSelectMarket(marketSelect);

            // 渲染报告模块
            this.renderReportModules(container);
        },

        /**
         * 智能自动选择市场
         */
        autoSelectMarket(marketSelect: HTMLSelectElement | null) {
            const currentState = appStore.getState();
            if (!marketSelect) return;

            // 获取当前数据源的 marketplace
            let currentMarketplace = '';
            const analysisReport = currentState.analysis.analysisReport as any;

            if (analysisReport && analysisReport.marketplace) {
                currentMarketplace = analysisReport.marketplace;
            } else if (currentState.scraper?.scrapedData?.metadata?.marketplace) {
                currentMarketplace = currentState.scraper.scrapedData.metadata.marketplace;
            } else if (analysisReport) {
                currentMarketplace = analysisReport.targetMarket || analysisReport.language || '';
            }

            // 检测是否需要自动更新
            const isFirstLoad = !this.profile.targetMarket;
            const isMarketplaceChanged = currentMarketplace && currentMarketplace !== this.lastMarketplace;

            if (currentMarketplace && (isFirstLoad || isMarketplaceChanged)) {
                Logger.debug(`[Promptlab] 检测到市场变化: ${this.lastMarketplace} → ${currentMarketplace}`);

                const siteConfig = SITE_CONFIGS[currentMarketplace];
                if (siteConfig) {
                    const targetName = siteConfig.name;
                    const options = Array.from(marketSelect.options);
                    const match = options.find((opt) => opt.value === targetName);

                    if (match) {
                        marketSelect.value = match.value;
                        this.profile.targetMarket = match.value as TargetMarket;
                        this.saveState();
                        this.lastMarketplace = currentMarketplace;
                        Logger.debug('[Promptlab] 已自动选择市场:', match.value, `(${currentMarketplace})`);
                    }
                }
            } else if (currentMarketplace) {
                this.lastMarketplace = currentMarketplace;
            }
        },

        /**
         * 渲染报告模块
         */
        renderReportModules(container: HTMLElement) {
            const report = appStore.getState().analysis.analysisReport as any;

            Logger.debug('[Promptlab] renderReportModules 调用:', {
                report,
                reportKeys: report ? Object.keys(report) : null
            });

            const renderer = SafeRenderer.getInstance();

            // 清空容器
            renderer.renderTemplate(container, '');
            container.className = 'mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3';

            const isFirstLoad = !this.hasRenderedReportOnce && this.profile.selectedReportSections.length === 0;

            // 检测报告格式：
            // 新格式直接是分析目标对象: { 'title-keywords': {...}, 'selling-points': {...}, ... }
            // 旧格式是包装格式: { metadata: {...}, analysisReport: {...} }
            const hasMetadata = report?.metadata && report?.analysisReport;

            if (hasMetadata) {
                // 处理包装格式报告
                Logger.debug('[Promptlab] 检测到包装格式报告');
                this.renderNewFormatModules(container, report.analysisReport, isFirstLoad);
            } else if (report && typeof report === 'object') {
                // 处理直接格式报告（当前格式）
                Logger.debug('[Promptlab] 检测到直接格式报告');
                this.renderNewFormatModules(container, report, isFirstLoad);
            } else {
                // 处理旧格式报告（向后兼容）
                this.renderLegacyFormatModules(container, report, isFirstLoad);
            }
        },

        /**
         * 从分析数据中智能提取预览文本
         * @param targetId 分析目标ID
         * @param data 分析数据
         * @returns 预览文本
         */
        extractPreviewText(targetId: string, data: unknown): string {
            Logger.debug('[Promptlab] extractPreviewText 调用:', { targetId, dataType: typeof data, data });

            // 类型守卫：确保 data 是对象
            if (!data || typeof data !== 'object') {
                return '数据格式错误';
            }

            const dataObj = data as Record<string, unknown>;

            try {
                switch (targetId) {
                    case 'title-keywords':
                        Logger.debug('[Promptlab] 处理 title-keywords:', data);
                        // 提取主要关键词
                        if (dataObj.primary_keywords && Array.isArray(dataObj.primary_keywords)) {
                            const keywords = dataObj.primary_keywords
                                .slice(0, PROMPTLAB_DISPLAY_LIMITS.HIGH_FREQUENCY_PHRASES)
                                .map((k: unknown) => {
                                    if (k && typeof k === 'object' && 'keyword' in k) {
                                        return (k as { keyword: unknown }).keyword;
                                    }
                                    return null;
                                })
                                .filter(Boolean)
                                .join(', ');
                            Logger.debug('[Promptlab] title-keywords 提取结果:', keywords);
                            return keywords || '无主要关键词';
                        }
                        Logger.debug('[Promptlab] title-keywords 无 primary_keywords');
                        break;

                    case 'selling-points':
                        Logger.debug('[Promptlab] 处理 selling-points:', data);
                        // 提取主要差异化角度
                        const overallStrategy = dataObj.overall_strategy;
                        if (overallStrategy && typeof overallStrategy === 'object' && 'primary_differentiation' in overallStrategy) {
                            const primaryDiff = (overallStrategy as { primary_differentiation: unknown }).primary_differentiation;
                            Logger.debug('[Promptlab] selling-points 提取结果:', primaryDiff);
                            return String(primaryDiff);
                        }
                        if (dataObj.bullet_analysis && Array.isArray(dataObj.bullet_analysis) && dataObj.bullet_analysis.length > 0) {
                            const firstBullet = dataObj.bullet_analysis[0];
                            if (firstBullet && typeof firstBullet === 'object' && 'differentiation_angle' in firstBullet) {
                                const result = (firstBullet as { differentiation_angle: unknown }).differentiation_angle || '卖点分析';
                                Logger.debug('[Promptlab] selling-points 提取结果(备选):', result);
                                return String(result);
                            }
                        }
                        Logger.debug('[Promptlab] selling-points 无可用数据');
                        break;

                    case 'fatal-flaws':
                        // 提取关键问题
                        if (dataObj.critical_issues && Array.isArray(dataObj.critical_issues)) {
                            const issues = dataObj.critical_issues
                                .slice(0, PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS)
                                .map((i: unknown) => {
                                    if (i && typeof i === 'object' && 'issue' in i) {
                                        return (i as { issue: unknown }).issue;
                                    }
                                    return null;
                                })
                                .filter(Boolean)
                                .join('; ');
                            return issues || '无致命缺陷';
                        }
                        const riskAssessment = dataObj.risk_assessment;
                        if (riskAssessment && typeof riskAssessment === 'object' && 'primary_concern' in riskAssessment) {
                            return String((riskAssessment as { primary_concern: unknown }).primary_concern);
                        }
                        break;

                    case 'wow-moments':
                        // 提取Wow时刻描述
                        if (dataObj.moments && Array.isArray(dataObj.moments) && dataObj.moments.length > 0) {
                            const firstMoment = dataObj.moments[0];
                            if (firstMoment && typeof firstMoment === 'object' && 'moment_description' in firstMoment) {
                                return String((firstMoment as { moment_description: unknown }).moment_description) || 'Wow时刻分析';
                            }
                        }
                        if (dataObj.emotional_triggers && Array.isArray(dataObj.emotional_triggers)) {
                            return dataObj.emotional_triggers.slice(0, PROMPTLAB_DISPLAY_LIMITS.EMOTIONAL_TRIGGERS).map(String).join(', ');
                        }
                        break;

                    case 'hesitation-points':
                        // 提取主要犹豫点
                        if (dataObj.hesitations && Array.isArray(dataObj.hesitations) && dataObj.hesitations.length > 0) {
                            const firstHesitation = dataObj.hesitations[0];
                            if (firstHesitation && typeof firstHesitation === 'object' && 'pre_purchase_worry' in firstHesitation) {
                                return String((firstHesitation as { pre_purchase_worry: unknown }).pre_purchase_worry) || '犹豫点分析';
                            }
                        }
                        if (dataObj.common_doubts && Array.isArray(dataObj.common_doubts)) {
                            return dataObj.common_doubts.slice(0, PROMPTLAB_DISPLAY_LIMITS.COMMON_DOUBTS).map(String).join('; ');
                        }
                        break;

                    case 'buyer-profile':
                        // 提取买家类型
                        if (dataObj.buyer_types && Array.isArray(dataObj.buyer_types) && dataObj.buyer_types.length > 0) {
                            const types = dataObj.buyer_types
                                .slice(0, PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS)
                                .map((t: unknown) => {
                                    if (t && typeof t === 'object' && 'type' in t) {
                                        return (t as { type: unknown }).type;
                                    }
                                    return null;
                                })
                                .filter(Boolean)
                                .join(', ');
                            return types || '买家画像分析';
                        }
                        const demographics = dataObj.demographics;
                        if (demographics && typeof demographics === 'object' && 'lifestyle_indicators' in demographics) {
                            const lifestyleIndicators = (demographics as { lifestyle_indicators: unknown }).lifestyle_indicators;
                            if (Array.isArray(lifestyleIndicators)) {
                                return lifestyleIndicators.slice(0, PROMPTLAB_DISPLAY_LIMITS.LIFESTYLE_INDICATORS).map(String).join(', ');
                            }
                        }
                        break;

                    case 'vocab-gap':
                        // 提取词汇缺口
                        if (dataObj.missing_keywords && Array.isArray(dataObj.missing_keywords)) {
                            const keywords = dataObj.missing_keywords
                                .slice(0, 3)
                                .map((k: unknown) => {
                                    if (k && typeof k === 'object' && 'keyword' in k) {
                                        return (k as { keyword: unknown }).keyword;
                                    }
                                    return k;
                                })
                                .filter(Boolean)
                                .map(String)
                                .join(', ');
                            return keywords || '词汇缺口分析';
                        }
                        break;

                    case 'promise-reality':
                        // 提取承诺与现实差距
                        if (dataObj.gaps && Array.isArray(dataObj.gaps) && dataObj.gaps.length > 0) {
                            const firstGap = dataObj.gaps[0];
                            if (firstGap && typeof firstGap === 'object') {
                                const gapObj = firstGap as Record<string, unknown>;
                                return String(gapObj.promise || gapObj.gap_description || '承诺与现实分析');
                            }
                        }
                        break;
                }

                // 默认：尝试提取第一个有意义的字符串值
                Logger.debug('[Promptlab] 使用默认提取逻辑');
                const firstValue = this.findFirstStringValue(data);
                Logger.debug('[Promptlab] findFirstStringValue 结果:', firstValue);
                if (firstValue) {
                    return firstValue.length > 80 ? firstValue.substring(0, 80) + '...' : firstValue;
                }

                Logger.debug('[Promptlab] 无法提取预览文本，返回默认值');
                return '分析数据已加载';
            } catch (error) {
                Logger.error('[Promptlab] 提取预览文本失败:', error);
                return '分析数据已加载';
            }
        },

        /**
         * 递归查找对象中第一个有意义的字符串值
         * @param obj 对象
         * @param depth 递归深度限制
         * @returns 字符串值或null
         */
        findFirstStringValue(obj: unknown, depth: number = 0): string | null {
            Logger.debug('[Promptlab] findFirstStringValue 调用:', { depth, objType: typeof obj, isArray: Array.isArray(obj) });

            if (depth > 3) {
                Logger.debug('[Promptlab] 达到最大递归深度');
                return null; // 限制递归深度
            }

            if (typeof obj === 'string' && obj.trim().length > 0) {
                Logger.debug('[Promptlab] 找到字符串值:', obj.substring(0, 50));
                return obj.trim();
            }

            if (Array.isArray(obj) && obj.length > 0) {
                Logger.debug('[Promptlab] 处理数组，长度:', obj.length);
                return this.findFirstStringValue(obj[0], depth + 1);
            }

            if (obj && typeof obj === 'object') {
                Logger.debug('[Promptlab] 处理对象，键:', Object.keys(obj).slice(0, 5));
                const objRecord = obj as Record<string, unknown>;
                for (const key in objRecord) {
                    if (objRecord.hasOwnProperty(key)) {
                        const result = this.findFirstStringValue(objRecord[key], depth + 1);
                        if (result) return result;
                    }
                }
            }

            Logger.debug('[Promptlab] 未找到字符串值');
            return null;
        },

        /**
         * 渲染新格式报告模块
         * @param container 容器元素
         * @param analysisReport 分析报告对象 { 'title-keywords': {...}, 'selling-points': {...}, ... }
         * @param isFirstLoad 是否首次加载
         */
        renderNewFormatModules(container: HTMLElement, analysisReport: unknown, isFirstLoad: boolean) {
            Logger.debug('[Promptlab] renderNewFormatModules 调用:', {
                analysisReport,
                reportType: typeof analysisReport,
                keys: analysisReport && typeof analysisReport === 'object' ? Object.keys(analysisReport) : [],
                isFirstLoad
            });

            // 类型守卫：确保 analysisReport 是对象
            if (!analysisReport || typeof analysisReport !== 'object') {
                Logger.warn('[Promptlab] analysisReport 不是有效对象');
                return;
            }

            const reportObj = analysisReport as Record<string, unknown>;

            const renderer = SafeRenderer.getInstance();

            // 分析目标配置（用于显示标题和图标）
            const targetConfig: Record<string, { title: string; icon: string }> = {
                'title-keywords': { title: '标题核心词根', icon: '🔑' },
                'selling-points': { title: '卖点结构拆解', icon: '💎' },
                'fatal-flaws': { title: '致命缺陷', icon: '⚠️' },
                'wow-moments': { title: 'Wow时刻', icon: '✨' },
                'hesitation-points': { title: '犹豫点', icon: '🤔' },
                'buyer-profile': { title: '买家画像', icon: '👤' },
                'vocab-gap': { title: '词汇缺口', icon: '📝' },
                'promise-reality': { title: '承诺与现实', icon: '🎯' }
            };

            // 获取所有可用的分析目标
            const availableTargets = Object.keys(reportObj).filter(key =>
                targetConfig[key] && reportObj[key]
            );

            Logger.debug('[Promptlab] 可用的分析目标:', availableTargets);
            Logger.debug('[Promptlab] 每个目标的数据:', availableTargets.map(id => ({
                id,
                dataType: typeof reportObj[id],
                isArray: Array.isArray(reportObj[id]),
                keys: reportObj[id] && typeof reportObj[id] === 'object' ? Object.keys(reportObj[id] as object).slice(0, 5) : null
            })));

            // 如果是首次加载,自动选中所有模块
            if (isFirstLoad) {
                this.profile.selectedReportSections = availableTargets;
                this.saveState();
            }

            // 标记已经渲染过一次
            this.hasRenderedReportOnce = true;

            availableTargets.forEach((targetId) => {
                const config = targetConfig[targetId];
                if (!config) return; // 类型守卫

                const data = reportObj[targetId];
                Logger.debug(`[Promptlab] 渲染目标 ${targetId}:`, {
                    dataType: typeof data,
                    isArray: Array.isArray(data),
                    data
                });

                // 生成预览文本 - 智能提取关键信息
                let previewText = '';
                if (data) {
                    previewText = this.extractPreviewText(targetId, data);
                }
                Logger.debug(`[Promptlab] ${targetId} 最终预览文本:`, previewText);

                const isChecked = this.profile.selectedReportSections.includes(targetId);

                const div = document.createElement('div');
                div.className = 'relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all';

                // 使用 SafeRenderer 渲染模板
                const template = `
                    <div class="flex h-5 items-center">
                        <input type="checkbox"
                               name="report-section"
                               value="${escapeHtml(targetId)}"
                               id="sect-${escapeHtml(targetId)}"
                               class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                               ${isChecked ? 'checked' : ''}
                               @change="onReportSectionChange">
                    </div>
                    <div class="ml-3 text-sm flex-1 min-w-0">
                        <label for="sect-${escapeHtml(targetId)}" class="cursor-pointer select-none w-full block">
                            <div class="flex items-center justify-between gap-2 mb-0.5">
                                <span class="font-medium text-slate-700 leading-snug">${config.icon} ${escapeHtml(config.title)}</span>
                                <span x-show="hasConfidenceData && getTargetConfidence('${escapeHtml(targetId)}') > 0"
                                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0"
                                      :class="getConfidenceColorClass(getTargetConfidence('${escapeHtml(targetId)}'))"
                                      role="status"
                                      :aria-label="getConfidenceAriaLabel(getTargetConfidence('${escapeHtml(targetId)}'))">
                                    <i class="fa-solid fa-chart-line text-[10px]" aria-hidden="true"></i>
                                    <span x-text="getTargetConfidence('${escapeHtml(targetId)}') + '%'"></span>
                                    <span x-text="getConfidenceLevel(getTargetConfidence('${escapeHtml(targetId)}'))"></span>
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
                        </label>
                    </div>
                `;

                renderer.renderTemplate(div, template);
                container.appendChild(div);
            });
        },

        /**
         * 渲染旧格式报告模块
         */
        renderLegacyFormatModules(container: HTMLElement, report: unknown, isFirstLoad: boolean) {
            // 类型守卫：确保 report 是对象
            if (!report || typeof report !== 'object') {
                Logger.warn('[Promptlab] report 不是有效对象');
                return;
            }

            const reportObj = report as Record<string, unknown>;
            const renderer = SafeRenderer.getInstance();
            const ignoreKeys = ['meta', 'generatedByModel', 'generatedAt', 'templateUsed', 'templateId', 'raw_response'];
            const keys = Object.keys(reportObj).filter((k) => !ignoreKeys.includes(k));

            // 如果是首次加载,自动选中所有模块
            if (isFirstLoad) {
                this.profile.selectedReportSections = [...keys];
                this.saveState();
            }

            keys.forEach((key) => {
                // 自动填充 audience 字段
                if (key === 'target_audience' && !this.profile.audience) {
                    let val = reportObj[key];
                    if (Array.isArray(val)) val = val.join(', ');
                    this.profile.audience = String(val || '');
                    this.saveState();
                }

                const label = this.getFieldTitle(key);
                const previewText = this.getPreviewText(reportObj[key]);
                const isChecked = this.profile.selectedReportSections.includes(key);

                const div = document.createElement('div');
                div.className = 'relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all';

                // 使用 SafeRenderer 渲染模板
                const template = `
                    <div class="flex h-5 items-center">
                        <input type="checkbox" 
                               name="report-section" 
                               value="${escapeHtml(key)}" 
                               id="sect-${escapeHtml(key)}" 
                               class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                               ${isChecked ? 'checked' : ''}
                               @change="onReportSectionChange">
                    </div>
                    <div class="ml-3 text-sm flex-1 min-w-0">
                        <label for="sect-${escapeHtml(key)}" class="cursor-pointer select-none w-full block">
                            <span class="font-medium text-slate-700 block mb-0.5 leading-snug">${escapeHtml(label)}</span>
                            <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
                        </label>
                    </div>
                `;

                renderer.renderTemplate(div, template);
                container.appendChild(div);
            });
        },

        /**
         * 获取字段标题
         */
        getFieldTitle(key: string): string {
            const module = ANALYSIS_MODULES.find((m) => m.id === key);
            if (module) return module.label_cn;
            return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        },

        /**
         * 获取预览文本
         */
        getPreviewText(val: unknown): string {
            if (!val) return '';
            if (typeof val === 'string') return val.length > 50 ? val.substring(0, 50) + '...' : val;

            try {
                if (Array.isArray(val)) {
                    const texts = val.map((item) => {
                        if (typeof item === 'object' && item !== null) return Object.values(item).join(' ');
                        return String(item || '');
                    });
                    const str = texts.filter((t) => t.trim()).join(' | ');
                    return str.length > 60 ? str.substring(0, 60) + '...' : str;
                }
                if (typeof val === 'object') {
                    const str = Object.values(val).join(', ');
                    return str.length > 60 ? str.substring(0, 60) + '...' : str;
                }
                return JSON.stringify(val).substring(0, 60) + '...';
            } catch (e) {
                return 'Data...';
            }
        },

        // ========== Event Handlers ==========

        /**
         * 报告模块选择变化
         */
        onReportSectionChange() {
            const selectedSections: string[] = [];
            document.querySelectorAll<HTMLInputElement>('input[name="report-section"]:checked').forEach((cb) => {
                selectedSections.push(cb.value);
            });
            this.profile.selectedReportSections = selectedSections;
            this.saveState();
        },

        /**
         * 输入变化处理
         */
        onInputChange() {
            this.saveState();
        },

        // ========== Action Functions ==========

        /**
         * 生成 Listing Prompt
         */
        generateListingPrompt() {
            Logger.debug('[Promptlab] 🎯 生成 Listing Prompt');

            if (!this.isReady) {
                let msg = '未就绪';
                if (!this.hasReport) msg = '请先前往 [AI 分析] 模块生成竞品报告';
                else if (!this.profile.targetMarket) msg = '请先选择目标语言/站点 (Card 1)';
                else if (!this.profile.keywordsTier1.trim()) msg = 'Tier 1 核心大词不能为空';
                else if (!this.profile.keywordsTier2.trim()) msg = 'Tier 2 长尾词不能为空';
                showToast(msg, { type: 'warning' });
                return;
            }

            this.saveState();

            const inputs: Partial<PromptInputs> = {
                ...this.profile,
                useAnalysisData: true,
            };

            const analysisReport = appStore.getState().analysis.analysisReport;
            const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;

            const result = promptlabService.generateMasterPrompt(inputs as any, reportToUse);
            this.listingPromptCache = result;

            showToast('Listing Prompt 已生成', { type: 'success' });
        },

        /**
         * 生成 Visual Prompt
         */
        generateVisualPrompt() {
            Logger.debug('[Promptlab] 🎯 生成 Visual Prompt');

            if (!this.hasReport) {
                showToast('请先生成 Ai 分析报告以获取视觉灵感', { type: 'warning' });
                return;
            }

            if (!this.isReady) {
                let msg = '配置信息不完整';
                if (!this.profile.targetMarket) msg = '请先选择目标语言/站点';
                else if (!this.profile.keywordsTier1.trim()) msg = 'Tier 1 核心大词不能为空';
                else if (!this.profile.keywordsTier2.trim()) msg = 'Tier 2 长尾词不能为空';
                showToast(msg, { type: 'warning' });
                return;
            }

            this.saveState();

            const inputs: Partial<PromptInputs> = {
                ...this.profile,
                useAnalysisData: true,
            };

            const analysisReport = appStore.getState().analysis.analysisReport;
            const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;

            const result = promptlabService.generateVisualPrompt(inputs as any, reportToUse);
            this.visualPromptCache = result;

            showToast('Visual Prompt 已生成', { type: 'success' });
        },

        /**
         * 切换控制台模式
         */
        toggleConsoleMode(mode: ConsoleMode) {
            if (this.currentConsoleMode === mode) return;
            this.currentConsoleMode = mode;

            const cardInner = document.getElementById('console-card-inner');
            const toggleContainer = document.getElementById('embed-toggle-container');
            const glider = document.getElementById('mode-toggle-glider');
            const btnListing = document.getElementById('btn-mode-listing');
            const btnVisual = document.getElementById('btn-mode-visual');
            const outputTitle = document.querySelector('#output-preview-title');

            if (!cardInner || !glider) return;

            if (mode === 'visual') {
                cardInner.style.transform = 'rotateY(180deg)';
                glider.style.transform = 'translateX(100%)';
                glider.classList.add('bg-white');
                glider.classList.remove('bg-pink-500');
                toggleContainer?.classList.add('bg-pink-900/30', 'border-pink-500/30');
                toggleContainer?.classList.remove('bg-white/20', 'border-white/10');
                btnListing?.classList.replace('text-blue-600', 'text-slate-400');
                btnListing?.classList.add('opacity-60');
                btnVisual?.classList.replace('text-slate-400', 'text-pink-500');
                btnVisual?.classList.remove('hover:text-pink-500');
                if (outputTitle) outputTitle.textContent = 'Visual Prompt';
            } else {
                cardInner.style.transform = 'rotateY(0deg)';
                glider.style.transform = 'translateX(0)';
                glider.classList.add('bg-white');
                glider.classList.remove('bg-pink-500');
                toggleContainer?.classList.remove('bg-pink-900/30', 'border-pink-500/30');
                toggleContainer?.classList.add('bg-white/20', 'border-white/10');
                btnVisual?.classList.replace('text-pink-500', 'text-slate-400');
                btnVisual?.classList.add('hover:text-pink-500');
                btnListing?.classList.replace('text-slate-400', 'text-blue-600');
                btnListing?.classList.remove('opacity-60');
                if (outputTitle) outputTitle.textContent = 'Listing Prompt';
            }
        },

        /**
         * 复制 Prompt
         */
        copyPrompt() {
            const copyText = document.getElementById('final-prompt-output') as HTMLTextAreaElement;
            if (copyText && copyText.value.length > 10) {
                copyText.select();
                document.execCommand('copy');
                showToast('Prompt 已复制', { type: 'success' });
            }
        },

        /**
         * 清空输入
         */
        clearInputs() {
            if (confirm('确定要清空所有输入框吗？')) {
                this.profile = {
                    targetMarket: '',
                    keywordsTier1: '',
                    keywordsTier2: '',
                    audience: '',
                    usps: '',
                    specs: '',
                    socialHook: '',
                    negative: '',
                    tone: 'professional',
                    customStrategy: '',
                    useCosmo: true,
                    useRufus: true,
                    useEmoji: true,
                    selectedReportSections: [],
                    charLimit: 5000,
                };
                this.saveState();
                showToast('已清空', { type: 'success' });
            }
        },

        /**
         * 全选报告模块
         */
        selectAllReportSections() {
            // 获取所有可用的分析维度（不受置信度筛选影响）
            const report = appStore.getState().analysis.analysisReport;
            if (!report || typeof report === 'string') {
                showToast('暂无可选模块', { type: 'warning' });
                return;
            }

            const reportObj = report as Record<string, unknown>;
            // 直接从报告对象获取所有维度（排除 _metadata）
            const availableTargets = Object.keys(reportObj).filter((id) => id !== '_metadata');

            // 直接设置所有可用维度为选中状态
            this.profile.selectedReportSections = [...availableTargets];
            this.saveState();

            // 重新渲染以更新复选框状态
            this.renderReportAnalysis();

            showToast('已全选模块', { type: 'success' });
        },

        /**
         * 清空报告模块选择
         */
        clearReportSections() {
            // 直接清空选择数组，避免因置信度筛选导致的 DOM 查询不完整
            this.profile.selectedReportSections = [];
            this.saveState();

            // 重新渲染以更新复选框状态
            this.renderReportAnalysis();

            showToast('已清空选择', { type: 'success' });
        },

        /**
         * 检查是否可以提取 DNA
         */
        get canExtractDNA(): boolean {
            const report = appStore.getState().analysis.analysisReport;
            // 尝试新提取器，如果不支持则尝试旧提取器
            return canExtractDNAFromDownloadsReport(report as any) || canExtractDNA(report as any);
        },

        /**
         * 自动填充产品 DNA
         */
        autoPopulateDNA() {
            Logger.debug('[Promptlab] 🧬 开始自动填充产品 DNA');

            const report = appStore.getState().analysis.analysisReport;
            if (!report) {
                showToast('未检测到分析报告', { type: 'warning' });
                return;
            }

            // 解包报告：检查是否有 analysisReport 包装层
            const unwrappedReport = (report as any).analysisReport || report;

            Logger.debug('[Promptlab] 报告结构检查:', {
                hasAnalysisReportWrapper: !!(report as any).analysisReport,
                topLevelKeys: Object.keys(report as any).slice(0, 10),
                unwrappedKeys: Object.keys(unwrappedReport).slice(0, 10)
            });

            // 提取语言信息（优先级：报告元数据 > 用户选择的市场 > 默认中文）
            const language = unwrappedReport._metadata?.language ||
                           this.profile.targetMarket ||
                           'zh';

            Logger.debug('[Promptlab] 使用语言:', language);

            // 尝试使用新的 DNA 提取器（支持 Downloads 报告格式）
            let dna: any = extractDNAFromDownloadsReport(unwrappedReport, language);
            let isNewExtractor = !!dna;

            // 如果新提取器无法提取，回退到旧提取器
            if (!dna) {
                Logger.debug('[Promptlab] 新提取器无法提取，尝试旧提取器');
                dna = extractProductDNA(unwrappedReport);
                isNewExtractor = false;
            }

            if (!dna) {
                showToast('无法从报告中提取产品 DNA', { type: 'warning' });
                return;
            }

            Logger.debug('[Promptlab] 使用提取器:', isNewExtractor ? '新提取器 (universalDNAExtractor)' : '旧提取器 (dnaExtractor)');

            // 检查是否已有内容
            const hasExistingContent =
                this.profile.audience.trim() ||
                this.profile.usps.trim() ||
                this.profile.specs.trim();

            if (hasExistingContent) {
                // 显示确认对话框
                if (!confirm('检测到已有内容，是否覆盖现有的产品 DNA？')) {
                    return;
                }
            }

            // 填充字段
            this.profile.audience = dna.audience || '';
            this.profile.usps = dna.usps || '';
            this.profile.specs = dna.specs || '';

            // 如果是新提取器的结果，填充关键词字段
            if (isNewExtractor && dna.keywords) {
                // 将核心关键词映射到一级关键词
                if (dna.keywords.core && dna.keywords.core.length > 0) {
                    this.profile.keywordsTier1 = dna.keywords.core.join(', ');
                }
                // 将长尾关键词映射到二级关键词
                if (dna.keywords.longTail && dna.keywords.longTail.length > 0) {
                    this.profile.keywordsTier2 = dna.keywords.longTail.join(', ');
                }

                Logger.debug('[Promptlab] ✅ 已填充关键词:', {
                    tier1Count: dna.keywords.core?.length || 0,
                    tier2Count: dna.keywords.longTail?.length || 0,
                    tier1Preview: this.profile.keywordsTier1.substring(0, 50),
                    tier2Preview: this.profile.keywordsTier2.substring(0, 50)
                });
            }

            // 保存置信度信息
            this.dnaConfidence = {
                audience: Math.round(dna.confidence.audience * 100),
                usps: Math.round(dna.confidence.usps * 100),
                specs: Math.round(dna.confidence.specs * 100),
                keywords: Math.round(dna.confidence.keywords * 100),
                overall: Math.round(((dna.confidence.audience + dna.confidence.usps + dna.confidence.specs + dna.confidence.keywords) / 4) * 100)
            };

            // 保存状态
            this.saveState();

            // 显示增强的提示信息
            const confidenceAvg = (
                dna.confidence.audience +
                dna.confidence.usps +
                dna.confidence.specs +
                dna.confidence.keywords
            ) / 4;
            const confidencePercent = Math.round(confidenceAvg * 100);

            showToast(
                `✅ DNA 提取成功 (总体置信度: ${confidencePercent}%)\n` +
                `受众: ${this.dnaConfidence.audience}% | 卖点: ${this.dnaConfidence.usps}% | 参数: ${this.dnaConfidence.specs}% | 关键词: ${this.dnaConfidence.keywords}%`,
                { type: 'success' }
            );

            // 添加视觉反馈
            this.highlightAutoFilledFields();

            Logger.debug('[Promptlab] ✅ DNA 填充完成:', {
                audienceLength: dna.audience.length,
                uspsLength: dna.usps.length,
                specsLength: dna.specs.length,
                confidence: dna.confidence,
                confidencePercent: this.dnaConfidence
            });
        },

        /**
         * 高亮自动填充的字段
         */
        highlightAutoFilledFields() {
            const fields = ['lab-audience', 'lab-usps', 'lab-specs'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('bg-blue-50', 'border-blue-300');
                    setTimeout(() => {
                        el.classList.remove('bg-blue-50', 'border-blue-300');
                    }, 2000);
                }
            });
        },

        /**
         * 提取单个字段的 DNA
         */
        extractSingleField(fieldName: 'audience' | 'usps' | 'specs') {
            Logger.debug('[Promptlab] 🔄 提取单个字段:', fieldName);

            const report = appStore.getState().analysis.analysisReport;
            if (!report) {
                showToast('未检测到分析报告', { type: 'warning' });
                return;
            }

            // 解包报告：检查是否有 analysisReport 包装层
            const unwrappedReport = (report as any).analysisReport || report;

            // 提取语言信息
            const language = unwrappedReport._metadata?.language ||
                           this.profile.targetMarket ||
                           'zh';

            // 尝试使用新提取器
            let dna: any = extractDNAFromDownloadsReport(unwrappedReport, language);

            // 如果新提取器无法提取，回退到旧提取器
            if (!dna) {
                dna = extractProductDNA(unwrappedReport);
            }

            if (!dna) {
                showToast('无法从报告中提取产品 DNA', { type: 'warning' });
                return;
            }

            // 只更新指定字段
            this.profile[fieldName] = dna[fieldName];

            // 更新该字段的置信度
            const confidenceKey = fieldName as keyof typeof dna.confidence;
            this.dnaConfidence[fieldName] = Math.round(dna.confidence[confidenceKey] * 100);

            // 保存状态
            this.saveState();

            // 高亮该字段
            const fieldId = fieldName === 'audience' ? 'lab-audience' :
                            fieldName === 'usps' ? 'lab-usps' : 'lab-specs';
            const el = document.getElementById(fieldId);
            if (el) {
                el.classList.add('bg-green-50', 'border-green-300');
                setTimeout(() => {
                    el.classList.remove('bg-green-50', 'border-green-300');
                }, 2000);
            }

            const fieldLabel = fieldName === 'audience' ? '目标受众' :
                              fieldName === 'usps' ? '核心卖点' : '技术参数';
            showToast(`✅ 已重新提取${fieldLabel} (置信度: ${this.dnaConfidence[fieldName]}%)`, { type: 'success' });

            Logger.debug('[Promptlab] ✅ 单字段提取完成:', {
                field: fieldName,
                confidence: this.dnaConfidence[fieldName]
            });
        },
    };
}
