/**
 * Rufus AI 智能回答生成器
 * 
 * 核心功能：从卖家视角回答买家问题，基于分析报告内容智能生成回答
 * 
 * 设计理念：
 * 1. 卖家立场：代表卖家回答问题，目标是促进转化
 * 2. 圆滑回答：优先展示产品优势，不主动暴露任何负面信息
 * 3. 被动应对：只有当买家明确问到具体问题时，才委婉回答
 * 4. 避免违规：不捏造信息，不夸大功效，但可以用积极的方式表达
 * 5. 多语言支持：回答语言自动匹配提问语言
 * 
 * 使用 AI 模式：调用大模型智能分析（更智能、更懂用户意图）
 */

import { callLLM, type ChatMessage } from '../../../../../services/llmService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';

export interface RufusMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Rufus 回答模式（固定为 AI）
 */
export type RufusMode = 'ai';

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
     * 生成 Rufus 风格的回答（使用 AI 模式）
     */
    async generateAnswer(question: string): Promise<string> {
        console.log('[Rufus Simulator] ========================================');
        console.log('[Rufus Simulator] 开始生成回答');
        console.log('[Rufus Simulator] - 当前模式: AI');
        console.log('[Rufus Simulator] - 问题:', question);
        console.log('[Rufus Simulator] - 报告数据存在:', !!this.reportData);
        
        if (!this.reportData) {
            console.warn('[Rufus Simulator] 无报告数据，返回默认回答');
            return this.getDefaultResponse();
        }
        
        console.log('[Rufus Simulator] 🤖 使用 AI 模式生成回答');
        const answer = await this.generateAIAnswer(question);
        console.log('[Rufus Simulator] ✅ AI 回答生成成功，长度:', answer.length);
        console.log('[Rufus Simulator] ========================================');
        return answer;
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
        return `你是一个专业的Amazon卖家客服助手，负责以卖家的视角回答潜在买家的问题。你的目标是帮助卖家圆滑、专业地回答问题，促进转化，同时避免违规。

## 角色定位
- 你代表卖家立场，目标是促进销售转化
- 你的回答应该专业、友好、有说服力
- 你必须基于产品分析报告中的真实数据回答
- 绝对不能捏造信息或撒谎

## 核心策略：圆滑回答，被动应对
1. **突出优势**：优先强调产品的卖点、Wow时刻和正面评价
2. **被动应对缺陷**：
   - ⚠️ 关键原则：不主动暴露任何负面信息
   - 只有当买家明确问到具体问题时，才委婉回答
   - 使用积极的表达方式，避免"问题"、"缺陷"、"投诉"等负面词汇
   - 快速转移到产品优势和解决方案上
   - 强调个体差异和使用方法的重要性
3. **圆滑表达技巧**：
   - 用"部分用户反馈"代替"很多用户投诉"
   - 用"使用体验因人而异"代替"产品有缺陷"
   - 用"建议您这样使用"代替"产品有问题需要注意"
   - 用"我们的产品特点是"代替"我们的产品不足是"
4. **不知道的不说**：报告中没有的信息，用积极的方式回应
5. **避免违规**：不做虚假宣传，不夸大功效，但可以用积极的方式表达

## 回答风格
- 默认使用与提问相同的语言回答（德语问题用德语答，英语问题用英语答）
- 语气友好、热情、有亲和力
- 使用积极的表情符号（✨ 💝 🎁 ✅ 💡 等）
- 避免使用警告类表情符号（⚠️ ❌），除非绝对必要
- 结构清晰，重点突出产品优势

## 回答模板结构
1. 开场：热情回应，感谢提问
2. 主体：优先展示产品优势和卖点
3. 如被问到缺陷：委婉说明 + 快速转移到解决方案和优势
4. 收尾：提供使用建议，强调产品价值

## 禁止行为
- ❌ 捏造不存在的功能或数据
- ❌ 夸大产品效果（避免违规）
- ❌ 主动暴露产品缺陷（即使报告中有）
- ❌ 使用负面词汇（问题、缺陷、投诉、失败等）
- ❌ 做出无法兑现的承诺
- ❌ 贬低竞品
- ❌ 使用绝对化词汇（"最好"、"完美"、"绝对"等）`;
    }
    
    /**
     * 构建用户提示词（包含报告上下文）
     */
    private buildUserPrompt(question: string): string {
        console.log('[Rufus AI] 📝 开始构建用户提示词...');
        console.log('[Rufus AI] - reportData 存在:', !!this.reportData);
        
        if (!this.reportData) {
            console.warn('[Rufus AI] ⚠️ reportData 为空，返回基础提示词');
            return `潜在买家问题: ${question}\n\n请以卖家客服的身份回答。由于没有产品分析报告，请诚实地告知买家暂无详细数据，但可以提供基本的产品信息。`;
        }
        
        // 提取报告关键信息
        const productTitle = this.reportData?.product_title || this.reportData?.title || '未知产品';
        console.log('[Rufus AI] - 产品标题:', productTitle);
        
        // 构建简洁的报告摘要
        let reportSummary = `# 产品分析报告\n\n`;
        reportSummary += `产品: ${productTitle}\n\n`;
        
        let hasData = false;
        
        // 从 analysisReport 中提取信息
        // 支持多种数据格式：直接字段、details、highlights、bullet_analysis等
        const ar = this.reportData.analysisReport || this.reportData;
        
        // 卖点 - 支持多种字段名
        const sellingPoints = ar['selling-points']?.bullet_analysis 
            || ar.sellingPoints?.bullet_analysis 
            || ar.selling_points?.bullet_analysis
            || ar['selling-points']?.details
            || ar['selling-points']?.highlights
            || [];
        
        if (sellingPoints.length > 0) {
            console.log('[Rufus AI] ✅ 找到卖点数据:', sellingPoints.length, '条');
            reportSummary += `## 主要卖点\n`;
            sellingPoints.slice(0, 5).forEach((item: any, index: number) => {
                const text = item.text || item.content || item.description || item.bullet || JSON.stringify(item);
                reportSummary += `${index + 1}. ${text}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到卖点数据');
        }
        
        // 致命缺陷
        const fatalFlaws = ar['fatal-flaws']?.critical_issues 
            || ar.fatalFlaws?.critical_issues 
            || ar.fatal_flaws?.critical_issues
            || ar['fatal-flaws']?.details
            || ar['fatal-flaws']?.highlights
            || [];
        
        if (fatalFlaws.length > 0) {
            console.log('[Rufus AI] ✅ 找到致命缺陷数据:', fatalFlaws.length, '条');
            reportSummary += `## 关键问题\n`;
            fatalFlaws.forEach((item: any) => {
                const text = item.text || item.content || item.description || item.issue || JSON.stringify(item);
                reportSummary += `- ${text}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到致命缺陷数据');
        }
        
        // Wow 时刻
        const wowMoments = ar['wow-moments']?.moments 
            || ar.wowMoments?.moments 
            || ar.wow_moments?.moments
            || ar['wow-moments']?.details
            || ar['wow-moments']?.highlights
            || [];
        
        if (wowMoments.length > 0) {
            console.log('[Rufus AI] ✅ 找到 Wow 时刻数据:', wowMoments.length, '条');
            reportSummary += `## 惊喜时刻\n`;
            wowMoments.forEach((item: any) => {
                const text = item.text || item.content || item.description || item.moment || JSON.stringify(item);
                reportSummary += `- ${text}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到 Wow 时刻数据');
        }
        
        // 犹豫点
        const hesitations = ar['hesitation-points']?.hesitations 
            || ar.hesitationPoints?.hesitations 
            || ar.hesitation_points?.hesitations
            || ar['hesitation-points']?.details
            || ar['hesitation-points']?.highlights
            || [];
        
        if (hesitations.length > 0) {
            console.log('[Rufus AI] ✅ 找到犹豫点数据:', hesitations.length, '条');
            reportSummary += `## 常见顾虑\n`;
            hesitations.forEach((item: any) => {
                const text = item.text || item.content || item.description || item.hesitation || JSON.stringify(item);
                reportSummary += `- ${text}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到犹豫点数据');
        }
        
        // 买家画像
        const buyerProfile = ar['buyer-profile']?.buyer_types 
            || ar.buyerProfile?.buyer_types 
            || ar.buyer_profile?.buyer_types
            || ar['buyer-profile']?.details
            || ar['buyer-profile']?.highlights
            || [];
        
        if (buyerProfile.length > 0) {
            console.log('[Rufus AI] ✅ 找到买家画像数据:', buyerProfile.length, '条');
            reportSummary += `## 典型买家\n`;
            buyerProfile.forEach((item: any) => {
                const text = item.text || item.content || item.description || item.type || JSON.stringify(item);
                reportSummary += `- ${text}\n`;
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            console.log('[Rufus AI] ⚠️ 未找到买家画像数据');
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
        const finalPrompt = `${reportSummary}\n---\n\n潜在买家问题: ${question}\n\n请以卖家客服的身份，基于以上产品分析报告回答买家的问题。

⚠️ 关键原则：
1. 使用与问题相同的语言回答
2. 优先展示产品优势和卖点
3. 不要主动暴露任何负面信息（即使报告中有）
4. 只有当买家明确问到具体问题时，才委婉回答
5. 使用积极的表达方式，避免"问题"、"缺陷"、"投诉"等负面词汇
6. 快速转移到产品优势和解决方案上
7. 不捏造数据，报告中没有的信息就说"我们的产品特点是..."
8. 语气友好热情，目标是促进转化`;
        
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
     * 生成持久度相关回答（卖家视角 - 圆滑版）
     */
    private generateLongevityAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找持久度相关的卖点
        const longevityBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('langanhaltend') ||
            b.original_text_summary?.toLowerCase().includes('stunden') ||
            b.original_text_summary?.toLowerCase().includes('haltbar') ||
            b.functions?.some((f: string) => f.toLowerCase().includes('haltbar'))
        );
        
        let response = `Vielen Dank für Ihre Frage zur Haltbarkeit! 😊\n\n`;
        
        // 优先展示产品优势
        if (longevityBullet) {
            response += `✨ Unser Produkt wurde speziell entwickelt:\n`;
            response += `${longevityBullet.original_text_summary}\n\n`;
            
            if (longevityBullet.credibility_score) {
                response += `📊 Qualitätsbewertung: ${longevityBullet.credibility_score}\n\n`;
            }
        }
        
        // 提供专业使用建议（不提及负面问题）
        response += `🎯 Für optimale Haltbarkeit empfehlen wir:\n`;
        response += `✓ Auf Pulspunkte auftragen (Handgelenke, Hals, hinter den Ohren)\n`;
        response += `✓ Nach dem Aufsprühen nicht verreiben - einfach trocknen lassen\n`;
        response += `✓ Auf leicht angefeuchtete Haut nach dem Duschen auftragen\n`;
        response += `✓ Unparfümierte Bodylotion als Basis verwenden\n\n`;
        
        // 检查是否有便携性卖点
        const portableBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('50') ||
            b.original_text_summary?.toLowerCase().includes('kompakt') ||
            b.functions?.includes('Portables Format')
        );
        
        if (portableBullet) {
            response += `🎒 Praktischer Vorteil: ${portableBullet.original_text_summary}\n\n`;
        }
        
        response += `💡 Hinweis: Die Duftwahrnehmung ist sehr individuell und hängt von Hauttyp, Körperchemie und Umgebungsfaktoren ab.\n\n`;
        response += `💝 Wir sind überzeugt von unserem Produkt und bieten Ihnen selbstverständlich unser Rückgaberecht für Ihre Zufriedenheit!`;
        
        return response;
    }
    
    /**
     * 生成香味相关回答（卖家视角）
     */
    /**
         * 生成香味相关回答（卖家视角 - 圆滑版）
         */
        private generateScentAnswer(): string {
            const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
            const wowMoments = this.reportData?.['wow-moments']?.moments || [];

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

            let response = `Vielen Dank für Ihr Interesse an unserem Duft! 😊\n\n`;

            // 如果有详细的香味描述
            if (scentBullet) {
                response += `🎭 Duftentwicklung:\n`;
                response += `${scentBullet.original_text_summary}\n\n`;

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

            // 如果有使用场景信息
            if (scentBullet?.scenes && scentBullet.scenes.length > 0) {
                response += `🎯 Perfekt geeignet für:\n`;
                scentBullet.scenes.forEach((scene: string) => {
                    response += `• ${scene}\n`;
                });
                response += `\n`;
            }

            // 如果没有任何具体信息
            if (!scentBullet && !scentWow) {
                response += `💡 Unser Duft bietet eine ausgewogene Komposition, die vielseitig einsetzbar ist.\n\n`;
                response += `Hinweis: Das Dufterlebnis ist sehr individuell und wird von der Körperchemie beeinflusst.\n\n`;
            }

            response += `💝 Wir sind überzeugt, dass Sie unseren Duft lieben werden!`;

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
     * 生成安全性相关回答（卖家视角 - 圆滑版）
     */
    private generateSafetyAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        
        // 查找安全性相关卖点
        const safetyBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('hautverträglich') ||
            b.original_text_summary?.toLowerCase().includes('hypoallergen') ||
            b.original_text_summary?.toLowerCase().includes('dermatologisch')
        );
        
        let response = `Vielen Dank für Ihre Frage zur Hautverträglichkeit! 😊\n\n`;
        
        // 优先展示安全性卖点
        if (safetyBullet) {
            response += `✨ Produktqualität:\n`;
            response += `${safetyBullet.original_text_summary}\n\n`;
        }
        
        response += `📊 Unsere Kunden berichten überwiegend von positiven Erfahrungen.\n\n`;
        
        // 提供专业建议（不提及负面案例）
        response += `💡 Allgemeine Empfehlungen für beste Ergebnisse:\n`;
        response += `✓ Wie bei allen Duftprodukten empfehlen wir einen Patch-Test bei sehr empfindlicher Haut\n`;
        response += `✓ Auf saubere, trockene Haut auftragen\n`;
        response += `✓ Kontakt mit Augen vermeiden\n`;
        response += `✓ Bei bekannten Allergien gegen bestimmte Inhaltsstoffe bitte die Produktbeschreibung prüfen\n\n`;
        
        response += `💝 Ihre Zufriedenheit ist uns wichtig! Bei Fragen stehen wir Ihnen gerne zur Verfügung.`;
        
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
     * 默认回答（无报告数据时）- 卖家视角
     */
    private getDefaultResponse(): string {
        return `Vielen Dank für Ihr Interesse an unserem Produkt! 😊\n\nUm Ihre Frage bestmöglich beantworten zu können, benötige ich zunächst detaillierte Produktinformationen.\n\n💡 In der Zwischenzeit können Sie:\n• Unsere Produktbeschreibung durchlesen\n• Kundenbewertungen ansehen\n• Bei spezifischen Fragen gerne erneut nachfragen\n\nWir sind hier, um Ihnen zu helfen!`;
    }
}

/**
 * 全局 Rufus 模拟器实例
 */
export const rufusSimulator = new RufusSimulator();
