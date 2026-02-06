// src/modules/app_center/keyword_hunter/services/trackerService.js
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import { callLLM } from "../../../../../services/llmService.js";
import { ANALYSIS_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE as TRANSLATE_PROMPT_TEMPLATE2 } from "../constants/prompts.js";
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService.js";

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

async function bridgeCallLLM(systemPrompt, userPrompt, options = {}) {
    // 使用 StorageService 获取 LLM 配置
    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);

    if (!activeProvider) {
        throw new Error("请先在全局设置中选择 LLM 提供商");
    }

    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(activeProvider);


    // 检查 Key
    if (!config || !config.apiKey) {
        // 特殊处理：如果是 serverless 模式，允许前端 key 为空或随意值，但为了通过校验建议前端填个占位符
        // 这里抛出错误提示用户去设置里检查
        throw new Error("所选提供商未配置 API Key");
    }

    const targetModel = config.model || (config.models && config.models[0] ? config.models[0].id : undefined);
    if (!targetModel) throw new Error("未选择模型，请在设置中同步或选择模型");

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    const finalOptions = {
        temperature: 0.3,
        jsonMode: false,
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
// ==========================================
// 4. 辅助校验函数
// ==========================================

/**
 * 简单校验是否为有效的 Listing 文案
 * 规则：
 * 1. 长度 > 50 字符
 * 2. 包含空格（说明有分词，不是乱码长串）
 */
function isValidListing(text) {
    if (!text) return false;
    const cleanText = text.trim();
    if (cleanText.length < 50) return false;
    // 检查是否有空格，简单的判断是否为自然语言句子
    if (!cleanText.includes(' ')) return false;
    return true;
}

/**
 * 执行 AI 深度诊断
 */
export async function fetchListingAnalysis(copyText, keywords, matchedKeywords, unmatchedKeywords) {
    // 🔥🔥🔥 新增校验：检查文案是否为空 🔥🔥🔥
    if (!copyText || !copyText.trim()) {
        throw new Error("文案内容为空，无法进行AI分析。请先在左侧输入框填入Listing文案。");
    }

    // 🔥🔥🔥 新增校验：检查文案有效性 🔥🔥🔥
    if (!isValidListing(copyText)) {
        throw new Error("输入内容过短或不具备 Amazon Listing 特征，无法生成有效报告。请输入完整的五点描述或产品具体介绍。");
    }

    const systemPrompt = ANALYSIS_PROMPT_TEMPLATE;

    // 截取部分文案防止 token 超限
    const userPrompt = `
    # INPUT DATA
    **Amazon Listing:** ${copyText}
    **Matched Keywords:** ${matchedKeywords.map(k => k.keyword).join(', ')}
    **Unmatched Keywords:** ${unmatchedKeywords.join(', ')}
    `;

    // 🔥 调整：temperature 0.5 -> 0.1 提高稳定性
    return await bridgeCallLLM(systemPrompt, userPrompt, { temperature: 0.1 });
}

/**
 * 执行沉浸式翻译
 */
export async function fetchImmersionTranslation(copyText) {
    // 🔥🔥🔥 新增校验：检查文案是否为空 🔥🔥🔥
    if (!copyText || !copyText.trim()) {
        throw new Error("文案内容为空，无法进行翻译。请先在左侧输入框填入Listing文案。");
    }

    const systemPrompt = TRANSLATE_PROMPT_TEMPLATE2;
    const userPrompt = `## Input：\n\n${copyText}`;

    return await bridgeCallLLM(systemPrompt, userPrompt, { jsonMode: false });
}
