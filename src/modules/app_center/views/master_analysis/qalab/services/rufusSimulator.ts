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

import { callLLM, type ChatMessage } from '../../../../../../services/llmService';
import { StorageService, STORAGE_KEYS } from '../../../../../../services/storageService';
import { ValidationError } from '@common/errors/AppError';
import { Logger } from '../../../../../../services/loggerService';
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
    private reportData: unknown = null;
    private mode: RufusMode = 'ai'; // 默认 AI 模式

    /**
     * 初始化模拟器
     */
    initialize(reportData: unknown, mode: RufusMode = 'ai'): void {
        // 类型守卫：提取 analysisReport
        if (reportData && typeof reportData === 'object' && 'analysisReport' in reportData) {
            this.reportData = (reportData as { analysisReport: unknown }).analysisReport;
        } else {
            this.reportData = reportData;
        }

        this.mode = mode;
        Logger.debug('[Rufus Simulator] 初始化完成');
        Logger.debug('[Rufus Simulator] - 模式:', mode);
        Logger.debug('[Rufus Simulator] - 报告数据:', this.reportData ? '已加载' : '未加载');

        if (this.reportData && typeof this.reportData === 'object') {
            const dataObj = this.reportData as Record<string, unknown>;
            Logger.debug('[Rufus Simulator] - 产品标题:', dataObj.product_title || 'N/A');
        }
        // 注：当前版本主要支持德语，未来可根据市场扩展到其他语言
    }

    /**
     * 设置回答模式
     */
    setMode(mode: RufusMode): void {
        const oldMode = this.mode;
        this.mode = mode;
        Logger.debug(`[Rufus Simulator] 模式已更新: ${oldMode} -> ${mode}`);
    }

    /**
     * 生成 Rufus 风格的回答（使用 AI 模式）
     */
    async generateAnswer(question: string): Promise<string> {
        Logger.debug('[Rufus Simulator] ========================================');
        Logger.debug('[Rufus Simulator] 开始生成回答');
        Logger.debug('[Rufus Simulator] - 当前模式: AI');
        Logger.debug('[Rufus Simulator] - 问题:', question);
        Logger.debug('[Rufus Simulator] - 报告数据存在:', !!this.reportData);

        if (!this.reportData) {
            Logger.warn('[Rufus Simulator] 无报告数据，返回默认回答');
            return this.getDefaultResponse();
        }

        Logger.debug('[Rufus Simulator] 🤖 使用 AI 模式生成回答');
        const answer = await this.generateAIAnswer(question);
        Logger.debug('[Rufus Simulator] ✅ AI 回答生成成功，长度:', answer.length);
        Logger.debug('[Rufus Simulator] ========================================');
        return answer;
    }

    /**
     * 基于规则的回答生成（原有逻辑）
     */


    /**
     * 基于 AI 的智能回答生成
     */
    private async generateAIAnswer(question: string): Promise<string> {
        Logger.debug('[Rufus AI] ========================================');
        Logger.debug('[Rufus AI] 🤖 开始生成 AI 回答');
        Logger.debug('[Rufus AI] 时间:', new Date().toLocaleTimeString());
        Logger.debug('[Rufus AI] ========================================');

        // 获取 LLM 配置
        const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
        Logger.debug('[Rufus AI] 🔍 检查 LLM 配置...');
        Logger.debug('[Rufus AI] - 活跃提供商:', activeProvider || '未配置');

        if (!activeProvider) {
            Logger.error('[Rufus AI] ❌ 未配置 LLM 服务');
            
            throw new ValidationError(
                '未配置 LLM 服务',
                'ERR_LLM_NOT_CONFIGURED',
                undefined,
                undefined,
                { module: 'RufusSimulator', action: 'generateAIAnswer' }
            );
        }

        const config = await StorageService.getLLMConfigWithKey(activeProvider);
        Logger.debug('[Rufus AI] - 配置获取:', config ? '成功' : '失败');

        if (!config || !config.apiKey) {
            Logger.error('[Rufus AI] ❌ LLM 配置不完整');
            Logger.error('[Rufus AI] - config 存在:', !!config);
            Logger.error('[Rufus AI] - apiKey 存在:', !!config?.apiKey);
            
            throw new ValidationError(
                'LLM 配置不完整',
                'ERR_LLM_CONFIG_INCOMPLETE',
                undefined,
                undefined,
                { module: 'RufusSimulator', action: 'generateAIAnswer', provider: activeProvider, hasConfig: !!config, hasApiKey: !!config?.apiKey }
            );
        }

        Logger.debug('[Rufus AI] ✅ LLM 配置验证通过');
        Logger.debug('[Rufus AI] - 提供商:', config.provider);
        Logger.debug('[Rufus AI] - 端点:', config.endpoint);
        Logger.debug('[Rufus AI] - 模型:', config.model);
        Logger.debug('[Rufus AI] - API Key 长度:', config.apiKey.length, '字符');
        Logger.debug('[Rufus AI] ----------------------------------------');

        // 构建系统提示词
        Logger.debug('[Rufus AI] 📝 构建系统提示词...');
        const systemPrompt = this.buildSystemPrompt();
        Logger.debug('[Rufus AI] ✅ 系统提示词长度:', systemPrompt.length, '字符');
        Logger.debug('[Rufus AI] ----------------------------------------');

        // 构建用户问题（包含报告上下文）
        Logger.debug('[Rufus AI] 📝 构建用户提示词...');
        const userPrompt = this.buildUserPrompt(question);
        Logger.debug('[Rufus AI] ✅ 用户提示词长度:', userPrompt.length, '字符');
        Logger.debug('[Rufus AI] ----------------------------------------');

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        Logger.debug('[Rufus AI] 📦 消息数组:');
        Logger.debug('[Rufus AI] - 消息数量:', messages.length);
        Logger.debug('[Rufus AI] - 总字符数:', messages.reduce((sum, m) => sum + m.content.length, 0));
        Logger.debug('[Rufus AI] ========================================');
        Logger.debug('[Rufus AI] 🚀 开始调用 LLM...');

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

        Logger.debug('[Rufus AI] ========================================');
        Logger.debug('[Rufus AI] ✅ LLM 调用成功');
        Logger.debug('[Rufus AI] ⏱️ 调用耗时:', callDuration, 'ms');
        Logger.debug('[Rufus AI] 📊 回答统计:');
        Logger.debug('[Rufus AI] - 长度:', response.length, '字符');
        Logger.debug('[Rufus AI] - 行数:', response.split('\n').length);
        Logger.debug('[Rufus AI] ----------------------------------------');
        Logger.debug('[Rufus AI] 📄 回答内容预览 (前 150 字符):');
        Logger.debug('[Rufus AI]', response.substring(0, 150).trim() + (response.length > 150 ? '...' : ''));
        Logger.debug('[Rufus AI] ========================================');

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
        Logger.debug('[Rufus AI] 📝 开始构建用户提示词...');
        Logger.debug('[Rufus AI] - reportData 存在:', !!this.reportData);

        if (!this.reportData) {
            Logger.warn('[Rufus AI] ⚠️ reportData 为空，返回基础提示词');
            return `潜在买家问题: ${question}\n\n请以卖家客服的身份回答。由于没有产品分析报告，请诚实地告知买家暂无详细数据，但可以提供基本的产品信息。`;
        }

        if (typeof this.reportData !== 'object') {
            Logger.warn('[Rufus AI] ⚠️ reportData 不是对象');
            return `潜在买家问题: ${question}\n\n请以卖家客服的身份回答。`;
        }

        const dataObj = this.reportData as Record<string, unknown>;

        // 提取报告关键信息
        const productTitle = String(dataObj.product_title || dataObj.title || '未知产品');
        Logger.debug('[Rufus AI] - 产品标题:', productTitle);

        // 构建简洁的报告摘要
        let reportSummary = `# 产品分析报告\n\n`;
        reportSummary += `产品: ${productTitle}\n\n`;

        let hasData = false;

        // 从 analysisReport 中提取信息
        // 支持多种数据格式：直接字段、details、highlights、bullet_analysis等
        const ar = (dataObj.analysisReport && typeof dataObj.analysisReport === 'object')
            ? dataObj.analysisReport as Record<string, unknown>
            : dataObj;

        // 卖点 - 支持多种字段名
        const sellingPointsData = ar['selling-points'] || ar['sellingPoints'] || ar['selling_points'];
        let sellingPoints: unknown[] = [];
        if (sellingPointsData && typeof sellingPointsData === 'object') {
            const spObj = sellingPointsData as Record<string, unknown>;
            sellingPoints = Array.isArray(spObj.bullet_analysis) ? spObj.bullet_analysis :
                           (Array.isArray(spObj.details) ? spObj.details :
                           (Array.isArray(spObj.highlights) ? spObj.highlights : []));
        }

        if (sellingPoints.length > 0) {
            Logger.debug('[Rufus AI] ✅ 找到卖点数据:', sellingPoints.length, '条');
            reportSummary += `## 主要卖点\n`;
            sellingPoints.slice(0, 5).forEach((item: unknown, index: number) => {
                if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    const text = itemObj.text || itemObj.content || itemObj.description || itemObj.bullet || JSON.stringify(item);
                    reportSummary += `${index + 1}. ${text}\n`;
                }
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            Logger.debug('[Rufus AI] ⚠️ 未找到卖点数据');
        }

        // 致命缺陷
        const fatalFlawsData = ar['fatal-flaws'] || ar['fatalFlaws'] || ar['fatal_flaws'];
        let fatalFlaws: unknown[] = [];
        if (fatalFlawsData && typeof fatalFlawsData === 'object') {
            const ffObj = fatalFlawsData as Record<string, unknown>;
            fatalFlaws = Array.isArray(ffObj.critical_issues) ? ffObj.critical_issues :
                        (Array.isArray(ffObj.details) ? ffObj.details :
                        (Array.isArray(ffObj.highlights) ? ffObj.highlights : []));
        }

        if (fatalFlaws.length > 0) {
            Logger.debug('[Rufus AI] ✅ 找到致命缺陷数据:', fatalFlaws.length, '条');
            reportSummary += `## 关键问题\n`;
            fatalFlaws.forEach((item: unknown) => {
                if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    const text = itemObj.text || itemObj.content || itemObj.description || itemObj.issue || JSON.stringify(item);
                    reportSummary += `- ${text}\n`;
                }
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            Logger.debug('[Rufus AI] ⚠️ 未找到致命缺陷数据');
        }

        // Wow 时刻
        const wowMomentsData = ar['wow-moments'] || ar['wowMoments'] || ar['wow_moments'];
        let wowMoments: unknown[] = [];
        if (wowMomentsData && typeof wowMomentsData === 'object') {
            const wmObj = wowMomentsData as Record<string, unknown>;
            wowMoments = Array.isArray(wmObj.moments) ? wmObj.moments :
                        (Array.isArray(wmObj.details) ? wmObj.details :
                        (Array.isArray(wmObj.highlights) ? wmObj.highlights : []));
        }

        if (wowMoments.length > 0) {
            Logger.debug('[Rufus AI] ✅ 找到 Wow 时刻数据:', wowMoments.length, '条');
            reportSummary += `## 惊喜时刻\n`;
            wowMoments.forEach((item: unknown) => {
                if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    const text = itemObj.text || itemObj.content || itemObj.description || itemObj.moment || JSON.stringify(item);
                    reportSummary += `- ${text}\n`;
                }
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            Logger.debug('[Rufus AI] ⚠️ 未找到 Wow 时刻数据');
        }

        // 犹豫点
        const hesitationPointsData = ar['hesitation-points'] || ar['hesitationPoints'] || ar['hesitation_points'];
        let hesitations: unknown[] = [];
        if (hesitationPointsData && typeof hesitationPointsData === 'object') {
            const hpObj = hesitationPointsData as Record<string, unknown>;
            hesitations = Array.isArray(hpObj.hesitations) ? hpObj.hesitations :
                         (Array.isArray(hpObj.details) ? hpObj.details :
                         (Array.isArray(hpObj.highlights) ? hpObj.highlights : []));
        }

        if (hesitations.length > 0) {
            Logger.debug('[Rufus AI] ✅ 找到犹豫点数据:', hesitations.length, '条');
            reportSummary += `## 常见顾虑\n`;
            hesitations.forEach((item: unknown) => {
                if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    const text = itemObj.text || itemObj.content || itemObj.description || itemObj.hesitation || JSON.stringify(item);
                    reportSummary += `- ${text}\n`;
                }
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            Logger.debug('[Rufus AI] ⚠️ 未找到犹豫点数据');
        }

        // 买家画像
        const buyerProfileData = ar['buyer-profile'] || ar['buyerProfile'] || ar['buyer_profile'];
        let buyerProfile: unknown[] = [];
        if (buyerProfileData && typeof buyerProfileData === 'object') {
            const bpObj = buyerProfileData as Record<string, unknown>;
            buyerProfile = Array.isArray(bpObj.buyer_types) ? bpObj.buyer_types :
                          (Array.isArray(bpObj.details) ? bpObj.details :
                          (Array.isArray(bpObj.highlights) ? bpObj.highlights : []));
        }

        if (buyerProfile.length > 0) {
            Logger.debug('[Rufus AI] ✅ 找到买家画像数据:', buyerProfile.length, '条');
            reportSummary += `## 典型买家\n`;
            buyerProfile.forEach((item: unknown) => {
                if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    const text = itemObj.text || itemObj.content || itemObj.description || itemObj.type || JSON.stringify(item);
                    reportSummary += `- ${text}\n`;
                }
            });
            reportSummary += `\n`;
            hasData = true;
        } else {
            Logger.debug('[Rufus AI] ⚠️ 未找到买家画像数据');
        }

        // 如果还是没有数据，记录完整的 reportData 结构
        if (!hasData) {
            Logger.warn('[Rufus AI] ⚠️ 未找到任何可用的分析数据');
            Logger.warn('[Rufus AI] 📋 reportData 字段:', Object.keys(this.reportData));
            Logger.warn('[Rufus AI] 📄 reportData 完整结构:', JSON.stringify(this.reportData, null, 2).substring(0, 500));

            reportSummary += `\n⚠️ 注意: 当前报告数据不完整，可能无法提供详细的产品分析。\n\n`;
        } else {
            Logger.debug('[Rufus AI] ✅ 报告摘要构建完成，长度:', reportSummary.length, '字符');
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

        Logger.debug('[Rufus AI] ✅ 最终提示词长度:', finalPrompt.length, '字符');

        return finalPrompt;
    }























    /**
     * 默认回答（无报告数据时）
     */
    private getDefaultResponse(): string {
        return `感谢您的提问！\n\n为了更好地回答您的问题，我需要先加载产品分析报告。\n\n请稍后再试，或者查看产品详情页面获取更多信息。`;
    }
}

/**
 * 全局 Rufus 模拟器实例
 */
export const rufusSimulator = new RufusSimulator();
