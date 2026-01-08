// src/modules/keyword_tracker/keywordtrackerService.js

import { callLLM } from "../../services/llmService.js";
import { ANALYSIS_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE2 } from "../../common/constants/prompts.js";

// ==========================================
// 1. 基础文本处理工具
// ==========================================

/**
 * 将文本解析为关键词数组
 */
export function parseKeywords(text) {
    if (!text) return [];
    return text.split(/[\n,;]/).map(k => k.trim()).filter(k => k.length > 0);
}

/**
 * 清洗关键词文本（去除特殊字符，标准化格式）
 */
export function cleanKeywordsText(text) {
    if (!text) return '';
    return text.replace(/[^\w\s\-\u00C0-\u024F\u1E00-\u1EFF]/g, ' ') // 允许欧洲字符
               .split('\n')
               .map(l => l.trim().replace(/\s+/g, ' '))
               .filter(l => l)
               .join('\n');
}

/**
 * 去重关键词
 */
export function deduplicateKeywordsText(text) {
    const keywords = parseKeywords(text);
    const unique = [...new Set(keywords.map(k => k.toLowerCase()))]; // 简单去重（统一小写）
    // 注意：这里返回的是去重后的字符串，丢失了原始的大小写，这是为了标准化的权衡
    return unique.join('\n');
}

/**
 * 检查输入中的重复项（返回 Set 供 UI 高亮使用）
 */
export function findDuplicateKeywords(text) {
    const keywords = parseKeywords(text);
    const seen = new Set();
    const dups = new Set();
    
    keywords.forEach(k => {
        const lower = k.toLowerCase();
        if (seen.has(lower)) dups.add(lower);
        seen.add(lower);
    });
    
    return dups;
}

// ==========================================
// 2. 核心分析逻辑 (Core Logic)
// ==========================================

/**
 * 分析关键词匹配情况
 * @param {string} copyText - 文案内容
 * @param {Array} keywordList - 关键词数组
 * @returns {Object} { matched: [], unmatched: [] }
 */
export function analyzeKeywordMatching(copyText, keywordList) {
    const textLower = copyText.toLowerCase();
    const matched = [];
    const unmatched = [];

    keywordList.forEach(kw => {
        const kwLower = kw.toLowerCase();
        let count = 0;
        let pos = textLower.indexOf(kwLower);
        
        while (pos !== -1) {
            count++;
            pos = textLower.indexOf(kwLower, pos + 1);
        }

        if (count > 0) {
            matched.push({ keyword: kw, count: count });
        } else {
            unmatched.push(kw);
        }
    });

    // 按频率降序排序
    matched.sort((a, b) => b.count - a.count);

    return { matched, unmatched };
}

/**
 * 分析词频
 * @param {string} text 
 * @returns {Array} [[word, count], ...]
 */
export function calculateWordFrequency(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const freq = {};
    words.forEach(w => {
        if (w.length > 2) freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50);
}

// ==========================================
// 3. LLM 服务封装
// ==========================================

/**
 * 内部通用 LLM 调用桥接
 */
async function bridgeCallLLM(systemPrompt, userPrompt, options = {}) {
    // 1. 获取全局配置 (保留 localStorage 读取，因为这是客户端存储)
    const activeProvider = localStorage.getItem('llm_active_provider');
    if (!activeProvider) throw new Error("请先在全局设置中选择 LLM 提供商");

    const config = JSON.parse(localStorage.getItem(`llm_${activeProvider}`) || '{}');
    if (!config.apiKey) throw new Error("所选提供商未配置 API Key");

    const targetModel = config.model || (config.models && config.models[0] ? config.models[0].id : undefined);
    if (!targetModel) throw new Error("未选择模型，请在设置中同步或选择模型");

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    const finalOptions = {
        temperature: 0.3,
        jsonMode: false, // 默认关闭 JSON Mode
        ...options
    };

    return await callLLM(
        messages,
        activeProvider,
        config.endpoint,
        config.apiKey,
        targetModel,
        finalOptions
    );
}

/**
 * 执行 AI 深度诊断
 */
export async function fetchListingAnalysis(copyText, keywords, matchedKeywords, unmatchedKeywords) {
    const systemPrompt = ANALYSIS_PROMPT_TEMPLATE;
        
    // 截取部分文案防止 token 超限
    const userPrompt = `
    # INPUT DATA
    **Amazon Listing:** ${copyText}
    **Matched Keywords:** ${matchedKeywords.map(k => k.keyword).join(', ')}
    **Unmatched Keywords:** ${unmatchedKeywords.join(', ')}
    `;
    // 文案内容：
    // ${copyText.substring(0, 3000)}... (截取部分)
    
    // 目标关键词 (${keywords.length}个):
    // ${keywords.join(', ')}
    
    // 已匹配: ${matchedKeywords.map(k => k.keyword).join(', ')}
    // 未匹配: ${unmatchedKeywords.join(', ')}
    
    // 请输出：
    // 1. 整体评分与简评
    // 2. 关键词埋词建议（特别是未匹配的词）
    // 3. 文案风险检查（违禁词、过度承诺）


    return await bridgeCallLLM(systemPrompt, userPrompt, { temperature: 0.5 });
}

/**
 * 执行沉浸式翻译
 */
export async function fetchImmersionTranslation(copyText) {
    // const systemPrompt = "你是一个专业的亚马逊 Listing 翻译助手。请将用户提供的文案翻译成地道的中文，用于运营人员内部分析。保持原意，分段输出。";
    // const userPrompt = `请翻译以下内容：\n\n${copyText}`;
    const systemPrompt = TRANSLATE_PROMPT_TEMPLATE2;
    const userPrompt = `## Input：\n\n${copyText}`;
    
    return await bridgeCallLLM(systemPrompt, userPrompt, { jsonMode: false });
}