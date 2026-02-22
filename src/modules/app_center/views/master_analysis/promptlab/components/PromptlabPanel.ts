/**
 * Promptlab Panel Alpine.js 组件核心逻辑
 * 负责 Prompt 拼接生成功能的响应式状态管理
 */

import { escapeHtml } from '@/common/utils/security';
import state from '../../../../../../common/state';
import { appStore } from '../../../../../../stores/useAppStore';
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
        
        // ========== Computed Properties ==========
        
        /**
         * 是否有分析报告
         */
        get hasReport(): boolean {
            return !!state.analysis.analysisReport;
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
         * 字符计数
         */
        get charCount(): number {
            return this.currentPrompt.length;
        },
        
        /**
         * 是否超出字符限制
         */
        get isOverLimit(): boolean {
            return this.charCount > this.profile.charLimit;
        },
        
        // ========== Lifecycle ==========
        
        init() {
            console.log('[Promptlab] 🚀 Alpine 组件初始化');
            
            // 从 Zustand store 恢复状态
            this.restoreState();
            
            // 生成语言选项
            this.generateLanguageOptions();
            
            // 渲染报告分析
            this.renderReportAnalysis();
            
            // 监听数据更新事件
            eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
                console.log('[Promptlab] 检测到数据更新，重新渲染报告分析');
                this.renderReportAnalysis();
            });
            
            window.addEventListener(APP_EVENTS.HISTORY_UPDATED, () => {
                console.log('[Promptlab] 检测到历史更新，重新渲染报告分析');
                this.renderReportAnalysis();
            });
            
            console.log('[Promptlab] ✅ Alpine 组件初始化完成');
        },
        
        // ========== State Management ==========
        
        /**
         * 从 Zustand store 恢复状态
         */
        restoreState() {
            const savedProfile = appStore.getState().promptlab.userProductProfile;
            if (savedProfile) {
                this.profile = { ...savedProfile };
                console.log('[Promptlab] ✅ 状态已从 store 恢复');
            }
        },
        
        /**
         * 保存状态到 Zustand store
         */
        saveState() {
            appStore.getState().setUserProductProfile(this.profile);
            console.log('[Promptlab] ✅ 状态已保存到 store');
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
            const container = document.getElementById('report-sections-container');
            const statusDiv = document.getElementById('lab-analysis-status');
            const marketSelect = document.getElementById('lab-target-market') as HTMLSelectElement;
            
            if (!container) return;
            
            const renderer = SafeRenderer.getInstance();
            
            // 如果没有报告，显示提示
            if (!this.hasReport) {
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
            if (!marketSelect || !state.masterPrompt) return;
            
            // 获取当前数据源的 marketplace
            let currentMarketplace = '';
            const analysisReport = state.analysis.analysisReport as any;
            
            if (analysisReport && analysisReport.marketplace) {
                currentMarketplace = analysisReport.marketplace;
            } else if (state.scraper?.scrapedData?.metadata?.marketplace) {
                currentMarketplace = state.scraper.scrapedData.metadata.marketplace;
            } else if (analysisReport) {
                currentMarketplace = analysisReport.targetMarket || analysisReport.language || '';
            }
            
            // 检测是否需要自动更新
            const isFirstLoad = !this.profile.targetMarket;
            const isMarketplaceChanged = currentMarketplace && currentMarketplace !== this.lastMarketplace;
            
            if (currentMarketplace && (isFirstLoad || isMarketplaceChanged)) {
                console.log('[Promptlab] 检测到市场变化:', this.lastMarketplace, '→', currentMarketplace);
                
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
                        console.log('[Promptlab] 已自动选择市场:', match.value, `(${currentMarketplace})`);
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
            const report = state.analysis.analysisReport as any;
            const isNewFormat = report.results && Array.isArray(report.results);
            
            const renderer = SafeRenderer.getInstance();
            
            // 清空容器
            renderer.renderTemplate(container, '');
            container.className = 'mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3';
            
            const isFirstLoad = this.profile.selectedReportSections.length === 0;
            
            if (isNewFormat) {
                // 处理新格式报告（AI智能分析）
                this.renderNewFormatModules(container, report.results, isFirstLoad);
            } else {
                // 处理旧格式报告（向后兼容）
                this.renderLegacyFormatModules(container, report, isFirstLoad);
            }
        },
        
        /**
         * 渲染新格式报告模块
         */
        renderNewFormatModules(container: HTMLElement, results: any[], isFirstLoad: boolean) {
            const renderer = SafeRenderer.getInstance();
            
            // 如果是首次加载,自动选中所有模块
            if (isFirstLoad) {
                const allKeys = results.map(r => r.targetId);
                this.profile.selectedReportSections = allKeys;
                this.saveState();
            }
            
            results.forEach((result) => {
                const key = result.targetId;
                const label = result.title;
                
                // 生成预览文本
                const previewParts: string[] = [];
                if (result.highlights?.[0]?.text) {
                    previewParts.push(result.highlights[0].text);
                }
                if (result.details?.[0]?.items?.[0]) {
                    previewParts.push(result.details[0].items[0]);
                }
                const previewText = previewParts.join(' | ').substring(0, 80) + 
                    (previewParts.join(' | ').length > 80 ? '...' : '');
                
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
         * 渲染旧格式报告模块
         */
        renderLegacyFormatModules(container: HTMLElement, report: any, isFirstLoad: boolean) {
            const renderer = SafeRenderer.getInstance();
            const ignoreKeys = ['meta', 'generatedByModel', 'generatedAt', 'templateUsed', 'templateId', 'raw_response'];
            const keys = Object.keys(report).filter((k) => !ignoreKeys.includes(k));
            
            // 如果是首次加载,自动选中所有模块
            if (isFirstLoad) {
                this.profile.selectedReportSections = [...keys];
                this.saveState();
            }
            
            keys.forEach((key) => {
                // 自动填充 audience 字段
                if (key === 'target_audience' && !this.profile.audience) {
                    let val = report[key];
                    if (Array.isArray(val)) val = val.join(', ');
                    this.profile.audience = val;
                    this.saveState();
                }
                
                const label = this.getFieldTitle(key);
                const previewText = this.getPreviewText(report[key]);
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
        getPreviewText(val: any): string {
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
            console.log('[Promptlab] 🎯 生成 Listing Prompt');
            
            if (!this.isReady) {
                let msg = '未就绪';
                if (!this.hasReport) msg = '请先前往 [AI 分析] 模块生成竞品报告';
                else if (!this.profile.targetMarket) msg = '请先选择目标语言/站点 (Card 1)';
                else if (!this.profile.keywordsTier1.trim()) msg = 'Tier 1 核心大词不能为空';
                else if (!this.profile.keywordsTier2.trim()) msg = 'Tier 2 长尾词不能为空';
                showToast(msg, 'warning');
                return;
            }
            
            this.saveState();
            
            const inputs: Partial<PromptInputs> = {
                ...this.profile,
                useAnalysisData: true,
            };
            
            const analysisReport = state.analysis.analysisReport;
            const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;
            
            const result = promptlabService.generateMasterPrompt(inputs as any, reportToUse);
            this.listingPromptCache = result;
            
            showToast('Listing Prompt 已生成', 'success');
        },
        
        /**
         * 生成 Visual Prompt
         */
        generateVisualPrompt() {
            console.log('[Promptlab] 🎯 生成 Visual Prompt');
            
            if (!this.hasReport) {
                showToast('请先生成 Ai 分析报告以获取视觉灵感', 'warning');
                return;
            }
            
            if (!this.isReady) {
                let msg = '配置信息不完整';
                if (!this.profile.targetMarket) msg = '请先选择目标语言/站点';
                else if (!this.profile.keywordsTier1.trim()) msg = 'Tier 1 核心大词不能为空';
                else if (!this.profile.keywordsTier2.trim()) msg = 'Tier 2 长尾词不能为空';
                showToast(msg, 'warning');
                return;
            }
            
            this.saveState();
            
            const inputs: Partial<PromptInputs> = {
                ...this.profile,
                useAnalysisData: true,
            };
            
            const analysisReport = state.analysis.analysisReport;
            const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;
            
            const result = promptlabService.generateVisualPrompt(inputs as any, reportToUse);
            this.visualPromptCache = result;
            
            showToast('Visual Prompt 已生成', 'success');
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
                glider.classList.add('bg-pink-500', 'text-white');
                glider.classList.remove('bg-white');
                toggleContainer?.classList.add('bg-pink-900/30', 'border-pink-500/30');
                toggleContainer?.classList.remove('bg-white/20', 'border-white/10');
                btnListing?.classList.replace('text-blue-600', 'text-pink-200');
                btnListing?.classList.add('opacity-60');
                btnVisual?.classList.replace('text-slate-500', 'text-white');
                btnVisual?.classList.remove('hover:text-pink-600');
                if (outputTitle) outputTitle.textContent = 'Visual Prompt';
            } else {
                cardInner.style.transform = 'rotateY(0deg)';
                glider.style.transform = 'translateX(0)';
                glider.classList.remove('bg-pink-500', 'text-white');
                glider.classList.add('bg-white');
                toggleContainer?.classList.remove('bg-pink-900/30', 'border-pink-500/30');
                toggleContainer?.classList.add('bg-white/20', 'border-white/10');
                btnVisual?.classList.replace('text-white', 'text-slate-500');
                btnVisual?.classList.add('hover:text-pink-600');
                btnListing?.classList.replace('text-pink-200', 'text-blue-600');
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
                showToast('Prompt 已复制', 'success');
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
                showToast('已清空', 'success');
            }
        },
        
        /**
         * 全选报告模块
         */
        selectAllReportSections() {
            document.querySelectorAll<HTMLInputElement>('input[name="report-section"]').forEach((cb) => {
                cb.checked = true;
            });
            this.onReportSectionChange();
            showToast('已全选模块', 'success');
        },
        
        /**
         * 清空报告模块选择
         */
        clearReportSections() {
            document.querySelectorAll<HTMLInputElement>('input[name="report-section"]').forEach((cb) => {
                cb.checked = false;
            });
            this.onReportSectionChange();
            showToast('已清空选择', 'success');
        },
    };
}
