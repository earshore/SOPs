/**
 * Rufus AI 问答模拟器
 * 基于分析报告内容智能生成仿真回答
 * 支持两种模式：
 * 1. 规则模式：基于报告数据的规则匹配（快速、离线）
 * 2. AI 模式：调用大模型智能分析（更智能、更懂用户意图）
 */

import { callLLM, type ChatMessage } from '../../../../../services/llmService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';

export interface RufusMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Rufus 回答模式
 */
export type RufusMode = 'rule' | 'ai';

/**
 * Rufus AI 智能回答生成器
 */
export class RufusSimulator {
    private reportData: any = null;
    private mode: RufusMode = 'ai'; // 默认 AI 模式
    
    /**
     * 初始化模拟器
     */
    initialize(reportData: any, mode: RufusMode = 'ai'): void {
        this.reportData = reportData?.analysisReport || reportData;
        this.mode = mode;
        console.log('[Rufus Simulator] 初始化完成');
        console.log('[Rufus Simulator] - 模式:', mode);
        console.log('[Rufus Simulator] - 报告数据:', this.reportData ? '已加载' : '未加载');
        if (this.reportData) {
            console.log('[Rufus Simulator] - 产品标题:', this.reportData.product_title || 'N/A');
        }
        // 注：当前版本主要支持德语，未来可根据市场扩展到其他语言
    }
    
    /**
     * 设置回答模式
     */
    setMode(mode: RufusMode): void {
        const oldMode = this.mode;
        this.mode = mode;
        console.log('[Rufus Simulator] 模式已更新:', oldMode, '->', mode);
    }
    
    /**
     * 生成 Rufus 风格的回答
     */
    async generateAnswer(question: string): Promise<string> {
        console.log('[Rufus Simulator] ========================================');
        console.log('[Rufus Simulator] 开始生成回答');
        console.log('[Rufus Simulator] - 当前模式:', this.mode);
        console.log('[Rufus Simulator] - 问题:', question);
        console.log('[Rufus Simulator] - 报告数据存在:', !!this.reportData);
        
        if (!this.reportData) {
            console.warn('[Rufus Simulator] 无报告数据，返回默认回答');
            return this.getDefaultResponse();
        }
        
        // 根据模式选择生成方式
        if (this.mode === 'ai') {
            console.log('[Rufus Simulator] 🤖 使用 AI 模式生成回答');
            try {
                const answer = await this.generateAIAnswer(question);
                console.log('[Rufus Simulator] ✅ AI 回答生成成功，长度:', answer.length);
                console.log('[Rufus Simulator] ========================================');
                return answer;
            } catch (error) {
                console.error('[Rufus Simulator] ❌ AI 模式失败，降级到规则模式:', error);
                console.log('[Rufus Simulator] 🔄 开始使用规则模式生成回答');
                const answer = this.generateRuleBasedAnswer(question);
                console.log('[Rufus Simulator] ✅ 规则模式回答生成成功，长度:', answer.length);
                console.log('[Rufus Simulator] ========================================');
                return answer;
            }
        } else {
            console.log('[Rufus Simulator] 📋 使用规则模式生成回答');
            const answer = this.generateRuleBasedAnswer(question);
            console.log('[Rufus Simulator] ✅ 规则模式回答生成成功，长度:', answer.length);
            console.log('[Rufus Simulator] ========================================');
            return answer;
        }
    }
    
    /**
     * 基于规则的回答生成（原有逻辑）
     */
    private generateRuleBasedAnswer(question: string): string {
        const questionLower = question.toLowerCase();
        
        // 分析问题类型并生成对应答案
        if (this.isAboutLongevity(questionLower)) {
            return this.generateLongevityAnswer();
        } else if (this.isAboutScent(questionLower)) {
            return this.generateScentAnswer();
        } else if (this.isAboutValue(questionLower)) {
            return this.generateValueAnswer();
        } else if (this.isAboutGift(questionLower)) {
            return this.generateGiftAnswer();
        } else if (this.isAboutSafety(questionLower)) {
            return this.generateSafetyAnswer();
        } else if (this.isAboutOccasions(questionLower)) {
            return this.generateOccasionsAnswer();
        } else if (this.isAboutComparison(questionLower)) {
            return this.generateComparisonAnswer();
        } else {
            return this.generateGeneralAnswer(question);
        }
    }
    
    /**
     * 基于 AI 的智能回答生成
     */
    private async generateAIAnswer(question: string): Promise<string> {
        console.log('[Rufus AI] ========================================');
        console.log('[Rufus AI] 🤖 开始生成 AI 回答');
        console.log('[Rufus AI] 时间:', new Date().toLocaleTimeString());
        console.log('[Rufus AI] ========================================');
        
        // 获取 LLM 配置
        const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
        console.log('[Rufus AI] 🔍 检查 LLM 配置...');
        console.log('[Rufus AI] - 活跃提供商:', activeProvider || '未配置');
        
        if (!activeProvider) {
            console.error('[Rufus AI] ❌ 未配置 LLM 服务');
            throw new Error('未配置 LLM 服务');
        }
        
        const config = await StorageService.getLLMConfigWithKey(activeProvider);
        console.log('[Rufus AI] - 配置获取:', config ? '成功' : '失败');
        
        if (!config || !config.apiKey) {
            console.error('[Rufus AI] ❌ LLM 配置不完整');
            console.error('[Rufus AI] - config 存在:', !!config);
            console.error('[Rufus AI] - apiKey 存在:', !!config?.apiKey);
            throw new Error('LLM 配置不完整');
        }
        
        console.log('[Rufus AI] ✅ LLM 配置验证通过');
        console.log('[Rufus AI] - 提供商:', config.provider);
        console.log('[Rufus AI] - 端点:', config.endpoint);
        console.log('[Rufus AI] - 模型:', config.model);
        console.log('[Rufus AI] - API Key 长度:', config.apiKey.length, '字符');
        console.log('[Rufus AI] ----------------------------------------');
        
        // 构建系统提示词
        console.log('[Rufus AI] 📝 构建系统提示词...');
        const systemPrompt = this.buildSystemPrompt();
        console.log('[Rufus AI] ✅ 系统提示词长度:', systemPrompt.length, '字符');
        console.log('[Rufus AI] ----------------------------------------');
        
        // 构建用户问题（包含报告上下文）
        console.log('[Rufus AI] 📝 构建用户提示词...');
        const userPrompt = this.buildUserPrompt(question);
        console.log('[Rufus AI] ✅ 用户提示词长度:', userPrompt.length, '字符');
        console.log('[Rufus AI] ----------------------------------------');
        
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        
        console.log('[Rufus AI] 📦 消息数组:');
        console.log('[Rufus AI] - 消息数量:', messages.length);
        console.log('[Rufus AI] - 总字符数:', messages.reduce((sum, m) => sum + m.content.length, 0));
        console.log('[Rufus AI] ========================================');
        console.log('[Rufus AI] 🚀 开始调用 LLM...');
        
        const callStartTime = Date.now();
        
        // 调用 LLM
        const response = await callLLM(
            messages,
            config.provider,
            config.endpoint,
            config.apiKey,
            config.model,
            {
                temperature: 0.7, // 稍高的温度让回答更自然
                timeout: 30000, // 30秒超时
                retries: 1 // 只重试1次
            }
        );
        
        const callEndTime = Date.now();
        const callDuration = callEndTime - callStartTime;
        
        console.log('[Rufus AI] ========================================');
        console.log('[Rufus AI] ✅ LLM 调用成功');
        console.log('[Rufus AI] ⏱️ 调用耗时:', callDuration, 'ms');
        console.log('[Rufus AI] 📊 回答统计:');
        console.log('[Rufus AI] - 长度:', response.length, '字符');
        console.log('[Rufus AI] - 行数:', response.split('\n').length);
        console.log('[Rufus AI] ----------------------------------------');
        console.log('[Rufus AI] 📄 回答内容预览 (前 150 字符):');
        console.log('[Rufus AI]', response.substring(0, 150).trim() + (response.length > 150 ? '...' : ''));
        console.log('[Rufus AI] ========================================');
        
        return response.trim();
    }
    
    /**
     * 构建系统提示词
     */
    private buildSystemPrompt(): string {
        return `你是 Amazon Rufus AI，一个专业的产品问答助手。你的任务是基于产品分析报告回答用户问题。

## 角色定位
- 你是 Amazon 的官方 AI 助手
- 你的回答应该专业、友好、有帮助
- 你应该基于数据和事实回答，不要编造信息
- 当报告中没有相关信息时，诚实地告知用户

## 回答风格
- 使用德语回答（除非用户使用其他语言）
- 回答要简洁明了，重点突出
- 使用表情符号增强可读性（✅ ⚠️ 💡 等）
- 引用具体的用户评价时使用引号
- 提供实用的建议和提示

## 数据来源
- 你的回答必须基于提供的产品分析报告
- 报告包含：卖点、致命缺陷、Wow 时刻、犹豫点、买家画像等
- 当引用数据时，说明来源（如"基于 X 个客户评价"）

## 注意事项
- 不要夸大产品优点
- 诚实地指出产品缺陷
- 提供平衡的观点
- 帮助用户做出明智的购买决策`;
    }
    
    /**
     * 构建用户提示词（包含报告上下文）
     */
    private buildUserPrompt(question: string): string {
        console.log('[Rufus AI] 📝 开始构建用户提示词...');
        console.log('[Rufus AI] - reportData 存在:', !!this.reportData);
        
        if (!this.reportData) {
            console.warn('[Rufus AI] ⚠️ reportData 为空，返回基础提示词');
            return `用户问题: ${question}\n\n请回答用户的问题。由于没有产品分析报告，请诚实地告知用户。`;
        }
        
        // 提取报告关键信息
        const productTitle = this.reportData?.product_title || this.reportData?.title || '未知产品';
        console.log('[Rufus AI] - 产品标题:', productTitle);
        
        // 构建简洁的报告摘要
        let reportSummary = `# 产品分析报告\n\n`;
        reportSummary += `产品: ${productTitle}\n\n`;
        
        let hasData = false;
        
        // 从 results 格式的数据中提取信息
        // AI Analysis 模块将数据存储为: { targetId, title, details: [...] }
        
        // 卖点
        const sellingPointsData = this.reportData?.['selling-points'];
        if (sellingPointsData?.details && Array.isArray(sellingPointsData.details)) {
            console.log('[Rufus AI] ✅ 找到卖点数据:', sellingPointsData.details.length, '条');
            reportSummary += `## 主要卖点\n`;
            sellingPointsData.details.slice(0, 5).forEach((item: any, index: number) => {
                reportSummary += `${index + 1}. ${item.text || item.content || item.description || JSON.stringify(item)}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到卖点数据');
        }
        
        // 致命缺陷
        const fatalFlawsData = this.reportData?.['fatal-flaws'];
        if (fatalFlawsData?.details && Array.isArray(fatalFlawsData.details)) {
            console.log('[Rufus AI] ✅ 找到致命缺陷数据:', fatalFlawsData.details.length, '条');
            reportSummary += `## 关键问题\n`;
            fatalFlawsData.details.forEach((item: any) => {
                reportSummary += `- ${item.text || item.content || item.description || JSON.stringify(item)}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到致命缺陷数据');
        }
        
        // Wow 时刻
        const wowMomentsData = this.reportData?.['wow-moments'];
        if (wowMomentsData?.details && Array.isArray(wowMomentsData.details)) {
            console.log('[Rufus AI] ✅ 找到 Wow 时刻数据:', wowMomentsData.details.length, '条');
            reportSummary += `## 惊喜时刻\n`;
            wowMomentsData.details.forEach((item: any) => {
                reportSummary += `- ${item.text || item.content || item.description || JSON.stringify(item)}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到 Wow 时刻数据');
        }
        
        // 犹豫点
        const hesitationsData = this.reportData?.['hesitation-points'];
        if (hesitationsData?.details && Array.isArray(hesitationsData.details)) {
            console.log('[Rufus AI] ✅ 找到犹豫点数据:', hesitationsData.details.length, '条');
            reportSummary += `## 常见顾虑\n`;
            hesitationsData.details.forEach((item: any) => {
                reportSummary += `- ${item.text || item.content || item.description || JSON.stringify(item)}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到犹豫点数据');
        }
        
        // 买家画像
        const buyerProfileData = this.reportData?.['buyer-profile'];
        if (buyerProfileData?.details && Array.isArray(buyerProfileData.details)) {
            console.log('[Rufus AI] ✅ 找到买家画像数据:', buyerProfileData.details.length, '条');
            reportSummary += `## 典型买家\n`;
            buyerProfileData.details.forEach((item: any) => {
                reportSummary += `- ${item.text || item.content || item.description || JSON.stringify(item)}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到买家画像数据');
        }
        
        // 如果没有找到任何数据，尝试使用 highlights
        if (!hasData) {
            console.log('[Rufus AI] ⚠️ 未找到 details 数据，尝试使用 highlights...');
            
            const allFields = ['selling-points', 'fatal-flaws', 'wow-moments', 'hesitation-points', 'buyer-profile'];
            allFields.forEach(field => {
                const fieldData = this.reportData?.[field];
                if (fieldData?.highlights && Array.isArray(fieldData.highlights)) {
                    console.log(`[Rufus AI] ✅ 找到 ${field} 的 highlights:`, fieldData.highlights.length, '条');
                    reportSummary += `## ${fieldData.title || field}\n`;
                    fieldData.highlights.forEach((item: any) => {
                        reportSummary += `- ${item.text || JSON.stringify(item)}\n`;
                    });
                    reportSummary += `\n`;
                    hasData = true;
                }
            });
        }
        
        // 如果还是没有数据，记录完整的 reportData 结构
        if (!hasData) {
            console.warn('[Rufus AI] ⚠️ 未找到任何可用的分析数据');
            console.warn('[Rufus AI] 📋 reportData 字段:', Object.keys(this.reportData));
            console.warn('[Rufus AI] 📄 reportData 完整结构:', JSON.stringify(this.reportData, null, 2).substring(0, 500));
            
            reportSummary += `\n⚠️ 注意: 当前报告数据不完整，可能无法提供详细的产品分析。\n\n`;
        } else {
            console.log('[Rufus AI] ✅ 报告摘要构建完成，长度:', reportSummary.length, '字符');
        }
        
        // 组合最终提示词
        const finalPrompt = `${reportSummary}\n---\n\n用户问题: ${question}\n\n请基于以上产品分析报告，用德语回答用户的问题。回答要专业、友好、基于事实。如果报告中没有相关信息，请诚实地告知用户。`;
        
        console.log('[Rufus AI] ✅ 最终提示词长度:', finalPrompt.length, '字符');
        
        return finalPrompt;
    }
    
    /**
     * 判断问题类型 - 支持多语言
     */
    private isAboutLongevity(q: string): boolean {
        return /halt|dauer|long|last|持久|时间|durée|duración|durata|how long|combien de temps|cuánto tiempo/.test(q);
    }
    
    private isAboutScent(q: string): boolean {
        return /duft|geruch|smell|scent|fragrance|香味|气味|parfum|odeur|olor|profumo|what.*smell|quel.*odeur/.test(q);
    }
    
    private isAboutValue(q: string): boolean {
        return /preis|wert|value|worth|price|性价比|值得|prix|valor|valore|cost|expensive|cheap|cher|caro/.test(q);
    }
    
    private isAboutGift(q: string): boolean {
        return /geschenk|gift|present|cadeau|礼物|送礼|regalo|regalo|for.*birthday|pour.*anniversaire/.test(q);
    }
    
    private isAboutSafety(q: string): boolean {
        return /allergi|haut|skin|irritation|safe|安全|过敏|peau|allergique|piel|alérgico|pelle|allergico|sensitive/.test(q);
    }
    
    private isAboutOccasions(q: string): boolean {
        return /anlass|occasion|wann|when|场合|适合|quand|cuando|quando|wear|porter|usar|indossare/.test(q);
    }
    
    private isAboutComparison(q: string): boolean {
        return /vergleich|compare|besser|better|对比|比较|comparer|comparar|confrontare|vs|versus|difference/.test(q);
    }
    
    /**
     * 生成持久度相关回答
     */
    private generateLongevityAnswer(): string {
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找持久度相关的负面问题
        const longevityIssues = fatalFlaws.filter((issue: any) => 
            issue.issue?.toLowerCase().includes('longevity') || 
            issue.issue?.toLowerCase().includes('disappear') ||
            issue.issue?.toLowerCase().includes('fade') ||
            issue.issue?.toLowerCase().includes('last')
        );
        
        // 查找持久度相关的卖点
        const longevityBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('langanhaltend') ||
            b.original_text_summary?.toLowerCase().includes('stunden') ||
            b.original_text_summary?.toLowerCase().includes('haltbar') ||
            b.functions?.some((f: string) => f.toLowerCase().includes('haltbar'))
        );
        
        // 如果有严重的持久度问题
        if (longevityIssues.length > 0) {
            const issue = longevityIssues[0];
            const quotes = issue.user_quotes?.slice(0, 2) || [];
            const frequency = issue.frequency || 0;
            
            let response = `Basierend auf ${frequency} Kundenbewertungen gibt es unterschiedliche Erfahrungen mit der Haltbarkeit:\n\n`;
            response += `⚠️ Kritische Rückmeldungen:\n`;
            quotes.forEach((q: string) => {
                response += `• "${q}"\n`;
            });
            
            // 如果同时有卖点声明
            if (longevityBullet) {
                response += `\n📋 Produktbeschreibung verspricht:\n`;
                response += `${longevityBullet.original_text_summary}\n`;
                response += `\n⚖️ Realistische Einschätzung:\n`;
                response += `Die tatsächliche Haltbarkeit scheint unter den Erwartungen zu liegen. `;
            } else {
                response += `\n💡 Wichtige Hinweise:\n`;
            }
            
            response += `Die Duftintensität und Haltbarkeit können stark variieren durch:\n`;
            response += `• Hauttyp und Körperchemie\n`;
            response += `• Auftragungsmethode\n`;
            response += `• Umgebungstemperatur\n\n`;
            response += `🔧 Tipps für bessere Haltbarkeit:\n`;
            response += `• Auf Pulspunkte auftragen (Handgelenke, Hals, hinter den Ohren)\n`;
            response += `• Nicht verreiben - nur aufsprühen und trocknen lassen\n`;
            response += `• Auf leicht angefeuchtete Haut nach dem Duschen auftragen\n`;
            response += `• Unparfümierte Bodylotion als Basis verwenden`;
            
            return response;
        }
        
        // 如果有卖点但没有负面反馈
        if (longevityBullet) {
            let response = `Die Haltbarkeit wird positiv bewertet:\n\n`;
            response += `✅ ${longevityBullet.original_text_summary}\n\n`;
            
            if (longevityBullet.credibility_score) {
                response += `📊 Glaubwürdigkeit: ${longevityBullet.credibility_score}\n\n`;
            }
            
            response += `💡 Für optimale Ergebnisse:\n`;
            response += `• Auf Pulspunkte auftragen (Handgelenke, Hals)\n`;
            response += `• Nicht verreiben nach dem Aufsprühen\n`;
            response += `• Auf leicht angefeuchtete Haut auftragen\n\n`;
            
            // 检查是否有便携性卖点
            const portableBullet = sellingPoints.find((b: any) => 
                b.original_text_summary?.toLowerCase().includes('50') ||
                b.original_text_summary?.toLowerCase().includes('kompakt') ||
                b.functions?.includes('Portables Format')
            );
            
            if (portableBullet) {
                response += `🎒 ${portableBullet.original_text_summary}`;
            }
            
            return response;
        }
        
        // 没有具体数据时的通用回答
        return `Zur Haltbarkeit liegen mir keine spezifischen Kundenbewertungen vor.\n\n💡 Allgemeine Tipps für längere Duftdauer:\n• Auf Pulspunkte auftragen (Handgelenke, Hals, hinter den Ohren)\n• Nicht verreiben - nur aufsprühen\n• Auf leicht angefeuchtete Haut nach dem Duschen auftragen\n• Unparfümierte Bodylotion als Basis verwenden\n\nDie tatsächliche Haltbarkeit hängt stark von individuellen Faktoren ab.`;
    }
    
    /**
     * 生成香味相关回答
     */
    private generateScentAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const wowMoments = this.reportData?.['wow-moments']?.moments || [];
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        
        // 查找香味描述卖点
        const scentBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('duft') ||
            b.original_text_summary?.toLowerCase().includes('note') ||
            b.original_text_summary?.toLowerCase().includes('komposition') ||
            b.original_text_summary?.toLowerCase().includes('bergamotte') ||
            b.original_text_summary?.toLowerCase().includes('sandelholz')
        );
        
        // 查找香味相关的 Wow 时刻
        const scentWow = wowMoments.find((m: any) => m.aspect === 'smell');
        
        // 查找香味相关的负面问题
        const scentIssues = fatalFlaws.filter((issue: any) => 
            issue.issue?.toLowerCase().includes('scent') ||
            issue.issue?.toLowerCase().includes('smell') ||
            issue.issue?.toLowerCase().includes('odor') ||
            issue.issue?.toLowerCase().includes('weak')
        );
        
        let response = '';
        
        // 如果有详细的香味描述
        if (scentBullet) {
            response += `Der Duft entwickelt sich in mehreren Phasen:\n\n`;
            response += `🎭 ${scentBullet.original_text_summary}\n\n`;
            
            if (scentBullet.credibility_score) {
                response += `📊 Beschreibungsqualität: ${scentBullet.credibility_score}\n\n`;
            }
        }
        
        // 如果有正面的香味体验
        if (scentWow) {
            response += `✨ Kundenerlebnis:\n`;
            response += `"${scentWow.user_quote}"\n\n`;
            response += `${scentWow.moment_description}\n\n`;
        }
        
        // 如果有负面反馈
        if (scentIssues.length > 0) {
            response += `⚠️ Kritische Anmerkungen:\n`;
            scentIssues.forEach((issue: any) => {
                response += `• ${issue.issue} (${issue.frequency} Berichte)\n`;
                if (issue.user_quotes && issue.user_quotes.length > 0) {
                    response += `  "${issue.user_quotes[0]}"\n`;
                }
            });
            response += `\n`;
        }
        
        // 如果有使用场景信息
        if (scentBullet?.scenes && scentBullet.scenes.length > 0) {
            response += `🎯 Geeignet für:\n`;
            scentBullet.scenes.forEach((scene: string) => {
                response += `• ${scene}\n`;
            });
        }
        
        // 如果没有任何具体信息
        if (!scentBullet && !scentWow && scentIssues.length === 0) {
            response = `Zur Duftkomposition liegen mir keine detaillierten Informationen vor.\n\n`;
            response += `💡 Allgemeine Hinweise:\n`;
            response += `• Dufterlebnis ist sehr subjektiv\n`;
            response += `• Empfehlung: Probe bestellen oder im Geschäft testen\n`;
            response += `• Körperchemie beeinflusst den Duft stark`;
        } else if (response) {
            response += `\n💡 Hinweis: Dufterlebnis ist individuell und kann variieren.`;
        }
        
        return response;
    }
    
    /**
     * 生成性价比相关回答
     */
    private generateValueAnswer(): string {
        const wowMoments = this.reportData?.['wow-moments']?.moments || [];
        const hesitations = this.reportData?.['hesitation-points']?.hesitations || [];
        const buyerProfile = this.reportData?.['buyer-profile']?.buyer_types || [];
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找性价比相关的 Wow 时刻
        const valueWow = wowMoments.find((m: any) => m.aspect === 'value');
        
        // 查找价格相关的犹豫点
        const valueHesitation = hesitations.find((h: any) => 
            h.pre_purchase_worry?.toLowerCase().includes('preis') ||
            h.pre_purchase_worry?.toLowerCase().includes('wert') ||
            h.pre_purchase_worry?.toLowerCase().includes('geld')
        );
        
        // 查找预算型买家
        const budgetBuyers = buyerProfile.find((b: any) => 
            b.type?.toLowerCase().includes('budget')
        );
        
        let response = '';
        
        // 如果有正面的性价比评价
        if (valueWow) {
            response += `Das Preis-Leistungs-Verhältnis wird sehr positiv bewertet:\n\n`;
            response += `💬 Kundenstimme:\n`;
            response += `"${valueWow.user_quote}"\n\n`;
            response += `✨ ${valueWow.moment_description}\n\n`;
        }
        
        // 如果有购买前的价格顾虑及解决方案
        if (valueHesitation) {
            response += `🤔 Häufige Bedenken:\n`;
            response += `"${valueHesitation.pre_purchase_worry}"\n\n`;
            response += `✅ Kundenerfahrung:\n`;
            response += `${valueHesitation.post_purchase_resolution}\n\n`;
        }
        
        // 添加产品价值点
        response += `💎 Sie erhalten:\n`;
        
        // 从卖点中提取价值信息
        const valueBullets = sellingPoints.filter((b: any) => 
            b.functions?.length > 0 || b.scenes?.length > 0
        );
        
        if (valueBullets.length > 0) {
            valueBullets.slice(0, 4).forEach((bullet: any) => {
                if (bullet.functions && bullet.functions.length > 0) {
                    response += `• ${bullet.functions[0]}\n`;
                }
            });
        } else {
            response += `• Hochwertige Duftkomposition\n`;
            response += `• Elegante Verpackung\n`;
            response += `• Reisefreundliches Format\n`;
            response += `• Geschenkgeeignete Präsentation\n`;
        }
        
        // 如果有预算型买家数据
        if (budgetBuyers) {
            response += `\n📊 Zielgruppe:\n`;
            response += `${budgetBuyers.percentage_estimate} der Käufer sind ${budgetBuyers.type}\n`;
            response += `Motivation: ${budgetBuyers.motivation}\n`;
        }
        
        // 如果没有任何具体信息
        if (!valueWow && !valueHesitation && !budgetBuyers) {
            response = `Zum Preis-Leistungs-Verhältnis liegen mir keine spezifischen Kundenbewertungen vor.\n\n`;
            response += `💡 Allgemeine Empfehlung:\n`;
            response += `• Vergleichen Sie mit ähnlichen Produkten\n`;
            response += `• Prüfen Sie aktuelle Angebote und Rabatte\n`;
            response += `• Lesen Sie weitere Kundenbewertungen\n`;
            response += `• Beachten Sie die Inhaltsmenge (ml) beim Preisvergleich`;
        } else {
            response += `\n💡 Fazit: Für den Preis eine ${valueWow ? 'ausgezeichnete' : 'solide'} Wahl!`;
        }
        
        return response;
    }
    
    /**
     * 生成送礼相关回答
     */
    private generateGiftAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const buyerProfile = this.reportData?.['buyer-profile']?.buyer_types || [];
        
        // 查找礼物相关卖点
        const giftBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('geschenk') ||
            b.original_text_summary?.toLowerCase().includes('cadeau') ||
            b.original_text_summary?.toLowerCase().includes('gift') ||
            b.functions?.some((f: string) => f.toLowerCase().includes('geschenk'))
        );
        
        // 查找礼物购买者数据
        const giftBuyers = buyerProfile.find((b: any) => 
            b.type?.toLowerCase().includes('gift')
        );
        
        let response = `Ja, dieses Parfum eignet sich hervorragend als Geschenk:\n\n`;
        
        // 如果有礼物相关的卖点
        if (giftBullet) {
            response += `🎁 Produktinformation:\n`;
            response += `${giftBullet.original_text_summary}\n\n`;
            
            // 如果有使用场景
            if (giftBullet.scenes && giftBullet.scenes.length > 0) {
                response += `🎯 Passende Anlässe:\n`;
                giftBullet.scenes.forEach((scene: string) => {
                    response += `• ${scene}\n`;
                });
                response += `\n`;
            }
        }
        
        // 如果有礼物购买者统计
        if (giftBuyers) {
            response += `📊 Beliebte Geschenkoption:\n`;
            response += `${giftBuyers.percentage_estimate} der Käufer wählen es als Geschenk\n`;
            response += `Motivation: ${giftBuyers.motivation}\n\n`;
        }
        
        // 添加礼物优势
        response += `✨ Vorteile als Geschenk:\n`;
        
        // 从卖点中提取礼物相关优势
        const portableBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('kompakt') ||
            b.original_text_summary?.toLowerCase().includes('50')
        );
        
        if (portableBullet) {
            response += `• Praktisches Format: ${portableBullet.original_text_summary}\n`;
        } else {
            response += `• Praktisches Format (50ml)\n`;
        }
        
        response += `• Elegante Verpackung\n`;
        response += `• Universell ansprechender Duft\n`;
        response += `• Angemessener Preis\n`;
        
        // 如果有具体的礼物场合信息
        if (giftBullet && giftBullet.original_text_summary?.includes('Geburtstag')) {
            response += `\n🎉 Empfohlene Anlässe:\n`;
            const occasions = giftBullet.original_text_summary.match(/(Geburtstag|Weihnachten|Valentinstag|Vatertag|Muttertag)/gi);
            if (occasions) {
                occasions.forEach((occ: string) => {
                    response += `• ${occ}\n`;
                });
            }
        } else {
            response += `\n🎉 Geeignet für:\n`;
            response += `• Geburtstage\n`;
            response += `• Weihnachten\n`;
            response += `• Valentinstag\n`;
            response += `• Vatertag\n`;
            response += `• Besondere Anlässe\n`;
        }
        
        response += `\n💝 Eine aufmerksame Geschenkidee, die gut ankommt!`;
        
        return response;
    }
    
    /**
     * 生成安全性相关回答
     */
    private generateSafetyAnswer(): string {
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找过敏/皮肤相关问题
        const allergyIssues = fatalFlaws.filter((issue: any) => 
            issue.issue?.toLowerCase().includes('allergic') || 
            issue.issue?.toLowerCase().includes('skin') ||
            issue.issue?.toLowerCase().includes('irritation') ||
            issue.issue?.toLowerCase().includes('redness')
        );
        
        // 查找安全性相关卖点
        const safetyBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('hautverträglich') ||
            b.original_text_summary?.toLowerCase().includes('hypoallergen') ||
            b.original_text_summary?.toLowerCase().includes('dermatologisch')
        );
        
        let response = '';
        
        // 如果有过敏问题报告
        if (allergyIssues.length > 0) {
            response += `⚠️ Wichtiger Hinweis zur Hautverträglichkeit:\n\n`;
            
            allergyIssues.forEach((issue: any) => {
                response += `📋 ${issue.issue}\n`;
                response += `Häufigkeit: ${issue.frequency} Bericht(e)\n`;
                response += `Schweregrad: ${issue.severity}\n\n`;
                
                if (issue.user_quotes && issue.user_quotes.length > 0) {
                    response += `Kundenbericht:\n`;
                    response += `"${issue.user_quotes[0]}"\n\n`;
                }
            });
            
            // 如果同时有安全性卖点声明
            if (safetyBullet) {
                response += `📢 Produktbeschreibung:\n`;
                response += `${safetyBullet.original_text_summary}\n\n`;
                response += `⚖️ Realistische Einschätzung:\n`;
                response += `Trotz Sicherheitsversprechen gab es Einzelfälle von Hautreaktionen. `;
            }
            
            response += `🔍 Empfohlene Vorsichtsmaßnahmen:\n`;
            response += `1. Patch-Test vor der ersten Anwendung durchführen\n`;
            response += `   (kleine Menge auf Unterarm auftragen, 24h beobachten)\n`;
            response += `2. Bei Rötungen, Juckreiz oder Irritationen sofort absetzen\n`;
            response += `3. Bei bekannten Duftstoff-Allergien vorher Dermatologen konsultieren\n`;
            response += `4. Nicht auf verletzte oder gereizte Haut auftragen\n`;
            response += `5. Kontakt mit Augen und Schleimhäuten vermeiden\n\n`;
            response += `💡 Wichtig: Jede Haut reagiert individuell auf Duftstoffe und Inhaltsstoffe.`;
            
            return response;
        }
        
        // 如果有安全性卖点但没有负面报告
        if (safetyBullet) {
            response += `✅ Hautverträglichkeit:\n\n`;
            response += `${safetyBullet.original_text_summary}\n\n`;
            response += `📊 Keine negativen Berichte zu Hautreaktionen in den Bewertungen.\n\n`;
        } else {
            response += `Zur Hautverträglichkeit liegen mir keine spezifischen Informationen vor.\n\n`;
        }
        
        response += `💡 Allgemeine Empfehlungen bei empfindlicher Haut:\n`;
        response += `✓ Patch-Test vor der ersten Anwendung\n`;
        response += `✓ Auf bekannte Allergien gegen Duftstoffe achten\n`;
        response += `✓ Bei Unsicherheit Dermatologen konsultieren\n`;
        response += `✓ Nicht auf verletzte Haut auftragen\n`;
        response += `✓ Bei Reaktionen sofort absetzen\n\n`;
        
        if (allergyIssues.length === 0) {
            response += `Die meisten Kunden berichten von problemloser Anwendung.`;
        }
        
        return response;
    }
    
    /**
     * 生成场合相关回答
     */
    private generateOccasionsAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找包含使用场景的卖点
        const sceneBullets = sellingPoints.filter((b: any) => b.scenes && b.scenes.length > 0);
        
        // 查找多功能性描述
        const versatileBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('vielseitig') ||
            b.original_text_summary?.toLowerCase().includes('universell') ||
            b.functions?.some((f: string) => f.toLowerCase().includes('universell'))
        );
        
        let response = '';
        
        // 如果有具体的使用场景
        if (sceneBullets.length > 0) {
            response += `Dieser Duft ist vielseitig einsetzbar:\n\n`;
            
            // 收集所有场景并去重
            const allScenes = sceneBullets.flatMap((b: any) => b.scenes);
            const uniqueScenes = [...new Set(allScenes)];
            
            // 按场景类型分组
            const businessScenes = uniqueScenes.filter((s: any) => 
                String(s).toLowerCase().includes('meeting') || 
                String(s).toLowerCase().includes('beruf') ||
                String(s).toLowerCase().includes('geschäft')
            );
            const romanticScenes = uniqueScenes.filter((s: any) => 
                String(s).toLowerCase().includes('date') || 
                String(s).toLowerCase().includes('romantisch')
            );
            const casualScenes = uniqueScenes.filter((s: any) => 
                String(s).toLowerCase().includes('alltag') || 
                String(s).toLowerCase().includes('täglich') ||
                String(s).toLowerCase().includes('pendeln')
            );
            const eventScenes = uniqueScenes.filter((s: any) => 
                String(s).toLowerCase().includes('event') || 
                String(s).toLowerCase().includes('ausgehen') ||
                String(s).toLowerCase().includes('anlass')
            );
            const travelScenes = uniqueScenes.filter((s: any) => 
                String(s).toLowerCase().includes('reise') || 
                String(s).toLowerCase().includes('travel')
            );
            
            if (businessScenes.length > 0) {
                response += `👔 Beruflich:\n`;
                businessScenes.forEach((s: any) => response += `• ${s}\n`);
                response += `\n`;
            }
            
            if (romanticScenes.length > 0) {
                response += `💑 Romantisch:\n`;
                romanticScenes.forEach((s: any) => response += `• ${s}\n`);
                response += `\n`;
            }
            
            if (casualScenes.length > 0) {
                response += `🚶 Alltag:\n`;
                casualScenes.forEach((s: any) => response += `• ${s}\n`);
                response += `\n`;
            }
            
            if (eventScenes.length > 0) {
                response += `🌃 Besondere Anlässe:\n`;
                eventScenes.forEach((s: any) => response += `• ${s}\n`);
                response += `\n`;
            }
            
            if (travelScenes.length > 0) {
                response += `✈️ Reisen:\n`;
                travelScenes.forEach((s: any) => response += `• ${s}\n`);
                response += `\n`;
            }
            
            // 如果有多功能性描述
            if (versatileBullet) {
                response += `🎯 Produktbeschreibung:\n`;
                response += `${versatileBullet.original_text_summary}\n\n`;
            }
            
            response += `💡 Die ausgewogene Duftkomposition macht ihn zum perfekten Allrounder. `;
            response += `Nicht zu aufdringlich für das Büro, aber präsent genug für besondere Anlässe.`;
            
            return response;
        }
        
        // 如果只有多功能性描述但没有具体场景
        if (versatileBullet) {
            response += `Dieser Duft ist vielseitig einsetzbar:\n\n`;
            response += `🎯 ${versatileBullet.original_text_summary}\n\n`;
            
            if (versatileBullet.credibility_score) {
                response += `📊 Glaubwürdigkeit: ${versatileBullet.credibility_score}\n\n`;
            }
        }
        
        // 通用回答
        if (!response) {
            response = `Zu spezifischen Anwendungsszenarien liegen mir keine detaillierten Informationen vor.\n\n`;
        }
        
        response += `💡 Allgemeine Empfehlung:\n`;
        response += `👔 Beruflich: Subtil und professionell\n`;
        response += `💑 Romantisch: Warme, anziehende Noten\n`;
        response += `🌃 Abends: Elegant und präsent\n`;
        response += `🚶 Alltag: Frisch und belebend\n\n`;
        response += `Ein echter Allrounder für verschiedene Situationen!`;
        
        return response;
    }
    
    /**
     * 生成对比相关回答
     */
    private generateComparisonAnswer(): string {
        const hesitations = this.reportData?.['hesitation-points']?.hesitations || [];
        const wowMoments = this.reportData?.['wow-moments']?.moments || [];
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const buyerProfile = this.reportData?.['buyer-profile']?.buyer_types || [];
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找价值相关的犹豫点
        const valueHesitation = hesitations.find((h: any) => 
            h.pre_purchase_worry?.toLowerCase().includes('wert') ||
            h.pre_purchase_worry?.toLowerCase().includes('geld') ||
            h.pre_purchase_worry?.toLowerCase().includes('preis')
        );
        
        // 查找价值相关的 Wow 时刻
        const valueWow = wowMoments.find((m: any) => m.aspect === 'value');
        
        // 查找预算型买家
        const budgetBuyers = buyerProfile.find((b: any) => 
            b.type?.toLowerCase().includes('budget')
        );
        
        let response = `Im Vergleich zu anderen Produkten:\n\n`;
        
        // 优势分析
        response += `✅ Stärken:\n`;
        
        if (valueWow) {
            response += `• Preis-Leistungs-Verhältnis: "${valueWow.user_quote}"\n`;
        }
        
        // 从卖点中提取优势
        const keyBullets = sellingPoints.slice(0, 3);
        keyBullets.forEach((bullet: any) => {
            if (bullet.functions && bullet.functions.length > 0) {
                response += `• ${bullet.functions[0]}\n`;
            }
        });
        
        // 劣势分析
        if (fatalFlaws.length > 0) {
            response += `\n⚠️ Schwächen:\n`;
            fatalFlaws.slice(0, 3).forEach((flaw: any) => {
                response += `• ${flaw.issue} (${flaw.frequency} Berichte)\n`;
            });
        }
        
        // 如果有购买前顾虑及解决方案
        if (valueHesitation) {
            response += `\n🤔 Häufige Bedenken:\n`;
            response += `"${valueHesitation.pre_purchase_worry}"\n\n`;
            response += `✅ Kundenerfahrung:\n`;
            response += `${valueHesitation.post_purchase_resolution}\n`;
        }
        
        // 目标群体分析
        if (budgetBuyers) {
            response += `\n📊 Zielgruppe:\n`;
            response += `${budgetBuyers.percentage_estimate} der Käufer: ${budgetBuyers.type}\n`;
            response += `Motivation: ${budgetBuyers.motivation}\n`;
        }
        
        // 总结性评价
        response += `\n💡 Realistische Einschätzung:\n`;
        
        if (fatalFlaws.length > 0) {
            response += `• Keine Luxus-Edition, aber solide Qualität im Budget-Segment\n`;
        } else {
            response += `• Überzeugende Qualität für den Preis\n`;
        }
        
        if (sellingPoints.length > 0) {
            response += `• Durchdachte Produktgestaltung\n`;
        }
        
        response += `• Ansprechende Präsentation\n`;
        
        if (valueWow || valueHesitation) {
            response += `• Hervorragendes Preis-Leistungs-Verhältnis\n`;
        }
        
        response += `\n`;
        
        if (fatalFlaws.length > 2) {
            response += `⚖️ Fazit: Gute Wahl für preisbewusste Käufer, aber mit Einschränkungen bei der Performance.`;
        } else if (fatalFlaws.length > 0) {
            response += `⚖️ Fazit: Solide Option für den Alltag und als Geschenk ohne Premium-Budget.`;
        } else {
            response += `⚖️ Fazit: Ausgezeichnete Wahl mit überzeugendem Gesamtpaket.`;
        }
        
        return response;
    }
    
    /**
     * 生成通用回答
     * 智能分析问题并从报告中查找相关信息
     */
    private generateGeneralAnswer(question: string): string {
        const productTitle = this.reportData?.product_title || 'dieses Produkt';
        const questionLower = question.toLowerCase();
        
        // 尝试从报告中提取相关信息
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const wowMoments = this.reportData?.['wow-moments']?.moments || [];
        const hesitations = this.reportData?.['hesitation-points']?.hesitations || [];
        const buyerProfile = this.reportData?.['buyer-profile']?.buyer_types || [];
        
        let response = `Vielen Dank für Ihre Frage zu ${productTitle}.\n\n`;
        
        // 分析问题关键词并查找相关信息
        const keywords = this.extractKeywords(questionLower);
        const relevantInfo = this.findRelevantInfo(keywords, {
            sellingPoints,
            fatalFlaws,
            wowMoments,
            hesitations,
            buyerProfile
        });
        
        if (relevantInfo.length > 0) {
            response += `Basierend auf den verfügbaren Informationen:\n\n`;
            
            relevantInfo.forEach((info, index) => {
                if (index < 3) { // 最多显示3条相关信息
                    response += `${info.icon} ${info.title}:\n`;
                    response += `${info.content}\n\n`;
                }
            });
            
            // 如果有负面信息,添加平衡性说明
            const hasNegative = relevantInfo.some(i => i.type === 'negative');
            if (hasNegative) {
                response += `⚖️ Bitte beachten Sie: Kundenerfahrungen können individuell variieren.\n\n`;
            }
        } else {
            // 如果没有找到特定信息,提供概览
            response += `📊 Produktübersicht:\n\n`;
            
            if (sellingPoints.length > 0) {
                response += `✅ Hauptmerkmale:\n`;
                sellingPoints.slice(0, 3).forEach((bullet: any) => {
                    if (bullet.functions && bullet.functions.length > 0) {
                        response += `• ${bullet.functions[0]}\n`;
                    }
                });
                response += `\n`;
            }
            
            if (fatalFlaws.length > 0) {
                response += `⚠️ Berichtete Probleme:\n`;
                fatalFlaws.slice(0, 2).forEach((flaw: any) => {
                    response += `• ${flaw.issue}\n`;
                });
                response += `\n`;
            }
            
            if (buyerProfile.length > 0) {
                response += `👥 Typische Käufer:\n`;
                buyerProfile.slice(0, 2).forEach((buyer: any) => {
                    response += `• ${buyer.type} (${buyer.percentage_estimate})\n`;
                });
                response += `\n`;
            }
        }
        
        response += `💬 Haben Sie eine spezifischere Frage? Ich kann Ihnen helfen bei:\n`;
        response += `• Haltbarkeit und Duftintensität\n`;
        response += `• Duftkomposition und Noten\n`;
        response += `• Preis-Leistungs-Verhältnis\n`;
        response += `• Geschenkeignung\n`;
        response += `• Hautverträglichkeit\n`;
        response += `• Anwendungsszenarien`;
        
        return response;
    }
    
    /**
     * 从问题中提取关键词
     */
    private extractKeywords(question: string): string[] {
        const keywords: string[] = [];
        
        // 德语关键词
        const keywordMap: { [key: string]: string[] } = {
            'quality': ['qualität', 'quality', 'gut', 'schlecht', 'hochwertig'],
            'scent': ['duft', 'geruch', 'smell', 'scent', 'note', 'komposition'],
            'longevity': ['halt', 'dauer', 'long', 'last', 'langanhaltend', 'verblassen'],
            'price': ['preis', 'price', 'wert', 'value', 'kosten', 'teuer', 'günstig'],
            'gift': ['geschenk', 'gift', 'cadeau', 'schenken'],
            'safety': ['allergi', 'haut', 'skin', 'irritation', 'sicher', 'verträglich'],
            'packaging': ['verpackung', 'packaging', 'flasche', 'bottle', 'design'],
            'usage': ['anwendung', 'benutzen', 'auftragen', 'verwenden', 'use'],
            'comparison': ['vergleich', 'compare', 'besser', 'better', 'unterschied'],
            'recommendation': ['empfehlen', 'recommend', 'lohnt', 'worth', 'kaufen']
        };
        
        for (const [category, words] of Object.entries(keywordMap)) {
            if (words.some(word => question.includes(word))) {
                keywords.push(category);
            }
        }
        
        return keywords;
    }
    
    /**
     * 查找相关信息
     */
    private findRelevantInfo(keywords: string[], data: any): Array<{
        type: 'positive' | 'negative' | 'neutral';
        icon: string;
        title: string;
        content: string;
    }> {
        const results: Array<any> = [];
        
        // 从卖点中查找
        if (data.sellingPoints && data.sellingPoints.length > 0) {
            data.sellingPoints.forEach((bullet: any) => {
                const summary = bullet.original_text_summary?.toLowerCase() || '';
                const functions = bullet.functions?.join(' ').toLowerCase() || '';
                const combined = summary + ' ' + functions;
                
                // 检查是否与关键词相关
                const isRelevant = keywords.length === 0 || keywords.some(kw => {
                    if (kw === 'scent') return combined.includes('duft') || combined.includes('note');
                    if (kw === 'longevity') return combined.includes('halt') || combined.includes('stunden');
                    if (kw === 'gift') return combined.includes('geschenk');
                    if (kw === 'quality') return combined.includes('qualität') || combined.includes('hochwertig');
                    return false;
                });
                
                if (isRelevant) {
                    results.push({
                        type: 'positive',
                        icon: '✅',
                        title: 'Produktmerkmal',
                        content: bullet.original_text_summary
                    });
                }
            });
        }
        
        // 从致命缺陷中查找
        if (data.fatalFlaws && data.fatalFlaws.length > 0) {
            data.fatalFlaws.forEach((flaw: any) => {
                const issue = flaw.issue?.toLowerCase() || '';
                
                const isRelevant = keywords.length === 0 || keywords.some(kw => {
                    if (kw === 'longevity') return issue.includes('longevity') || issue.includes('disappear');
                    if (kw === 'scent') return issue.includes('scent') || issue.includes('smell');
                    if (kw === 'safety') return issue.includes('allergic') || issue.includes('skin');
                    if (kw === 'quality') return issue.includes('cheap') || issue.includes('weak');
                    return false;
                });
                
                if (isRelevant) {
                    let content = `${flaw.issue} (${flaw.frequency} Berichte)`;
                    if (flaw.user_quotes && flaw.user_quotes.length > 0) {
                        content += `\n"${flaw.user_quotes[0]}"`;
                    }
                    
                    results.push({
                        type: 'negative',
                        icon: '⚠️',
                        title: 'Kritischer Punkt',
                        content
                    });
                }
            });
        }
        
        // 从 Wow 时刻中查找
        if (data.wowMoments && data.wowMoments.length > 0) {
            data.wowMoments.forEach((wow: any) => {
                const isRelevant = keywords.length === 0 || keywords.some(kw => {
                    if (kw === 'scent' && wow.aspect === 'smell') return true;
                    if (kw === 'price' && wow.aspect === 'value') return true;
                    if (kw === 'quality' && wow.aspect === 'quality') return true;
                    return false;
                });
                
                if (isRelevant) {
                    results.push({
                        type: 'positive',
                        icon: '✨',
                        title: 'Positives Kundenerlebnis',
                        content: `${wow.moment_description}\n"${wow.user_quote}"`
                    });
                }
            });
        }
        
        // 从犹豫点中查找
        if (data.hesitations && data.hesitations.length > 0) {
            data.hesitations.forEach((hesitation: any) => {
                const worry = hesitation.pre_purchase_worry?.toLowerCase() || '';
                
                const isRelevant = keywords.length === 0 || keywords.some(kw => {
                    if (kw === 'price') return worry.includes('preis') || worry.includes('wert');
                    if (kw === 'longevity') return worry.includes('halt') || worry.includes('dauer');
                    if (kw === 'recommendation') return true;
                    return false;
                });
                
                if (isRelevant) {
                    results.push({
                        type: 'neutral',
                        icon: '🤔',
                        title: 'Häufige Bedenken',
                        content: `Bedenken: "${hesitation.pre_purchase_worry}"\nErfahrung: ${hesitation.post_purchase_resolution}`
                    });
                }
            });
        }
        
        return results;
    }
    
    /**
     * 默认回答（无报告数据时）
     */
    private getDefaultResponse(): string {
        return `Entschuldigung, ich benötige zunächst einen Analysebericht, um Ihre Frage präzise beantworten zu können.\n\nBitte laden Sie einen Bericht, indem Sie:\n1. Daten im Scraper-Modul erfassen\n2. Eine AI-Analyse durchführen\n3. Oder einen vorhandenen Bericht laden\n\nDann kann ich Ihnen detaillierte, datenbasierte Antworten geben!`;
    }
}

/**
 * 全局 Rufus 模拟器实例
 */
export const rufusSimulator = new RufusSimulator();
